import CITIES from './cities.js';

function resolveCity(cityParam) {
  const key = cityParam.toLowerCase();
  if (!CITIES[key]) return null;
  return { key, city: CITIES[key] };
}

export async function exportRoutes(app) {
  // List available cities with metadata
  app.get('/cities', async () => {
    return Object.fromEntries(
      Object.entries(CITIES).map(([key, city]) => [key, {
        name: city.name,
        center: city.center,
        zoom: city.zoom,
        bbox: city.bbox,
      }])
    );
  });

  // Full export handler
  const fullExportHandler = async (req) => {
    const resolved = resolveCity(req.params.city);
    if (!resolved) {
      return { error: `Unknown city "${req.params.city}". Available: ${Object.keys(CITIES).join(', ')}` };
    }
    const { minLat, maxLat, minLng, maxLng } = resolved.city.bbox;

    const [pois, footways, barriers] = await Promise.all([
      app.db.query(`
        SELECT id, osm_id, name, wheelchair, category,
               ST_AsGeoJSON(geom)::json as geometry, tags
        FROM pois
        WHERE geom && ST_MakeEnvelope($1, $2, $3, $4, 4326)
      `, [minLng, minLat, maxLng, maxLat]),
      app.db.query(`
        SELECT id, osm_id, surface, smoothness, incline, width, wheelchair, kerb,
               accessibility_score, ST_AsGeoJSON(geom)::json as geometry
        FROM footways
        WHERE geom && ST_MakeEnvelope($1, $2, $3, $4, 4326)
      `, [minLng, minLat, maxLng, maxLat]),
      app.db.query(`
        SELECT id, barrier_type, description, severity,
               ST_AsGeoJSON(geom)::json as geometry, verified, created_at
        FROM barriers
        WHERE active = true
          AND geom && ST_MakeEnvelope($1, $2, $3, $4, 4326)
      `, [minLng, minLat, maxLng, maxLat])
    ]);

    const toFeature = (r, props) => ({
      type: 'Feature', id: r.id, geometry: r.geometry, properties: props
    });

    return {
      version: 1,
      city: resolved.key,
      exportedAt: new Date().toISOString(),
      bbox: resolved.city.bbox,
      pois: {
        type: 'FeatureCollection',
        features: pois.rows.map(r => toFeature(r, {
          osm_id: r.osm_id, name: r.name, wheelchair: r.wheelchair,
          category: r.category, tags: r.tags
        }))
      },
      footways: {
        type: 'FeatureCollection',
        features: footways.rows.map(r => toFeature(r, {
          surface: r.surface, smoothness: r.smoothness, incline: r.incline,
          width: r.width, wheelchair: r.wheelchair, kerb: r.kerb,
          accessibility_score: r.accessibility_score
        }))
      },
      barriers: {
        type: 'FeatureCollection',
        features: barriers.rows.map(r => toFeature(r, {
          barrier_type: r.barrier_type, description: r.description,
          severity: r.severity, verified: r.verified, created_at: r.created_at
        }))
      }
    };
  };

  // Delta export handler
  const deltaHandler = async (req) => {
    const resolved = resolveCity(req.params.city);
    if (!resolved) {
      return { error: `Unknown city "${req.params.city}". Available: ${Object.keys(CITIES).join(', ')}` };
    }

    const { since } = req.query;
    if (!since) {
      return { error: 'Missing "since" query parameter (ISO timestamp)' };
    }

    const sinceDate = new Date(since);
    if (isNaN(sinceDate.getTime())) {
      return { error: 'Invalid "since" timestamp' };
    }

    const { minLat, maxLat, minLng, maxLng } = resolved.city.bbox;
    const bbox = [minLng, minLat, maxLng, maxLat];

    const [pois, footways, barriers, ratings] = await Promise.all([
      app.db.query(`
        SELECT id, osm_id, name, wheelchair, category,
               ST_AsGeoJSON(geom)::json as geometry, tags
        FROM pois
        WHERE geom && ST_MakeEnvelope($1, $2, $3, $4, 4326)
          AND updated_at > $5
      `, [...bbox, sinceDate]),
      app.db.query(`
        SELECT id, osm_id, surface, smoothness, incline, width, wheelchair, kerb,
               accessibility_score, ST_AsGeoJSON(geom)::json as geometry
        FROM footways
        WHERE geom && ST_MakeEnvelope($1, $2, $3, $4, 4326)
          AND updated_at > $5
      `, [...bbox, sinceDate]),
      app.db.query(`
        SELECT id, barrier_type, description, severity, active,
               ST_AsGeoJSON(geom)::json as geometry, verified, created_at, updated_at
        FROM barriers
        WHERE geom && ST_MakeEnvelope($1, $2, $3, $4, 4326)
          AND (created_at > $5 OR updated_at > $5)
      `, [...bbox, sinceDate]),
      app.db.query(`
        SELECT r.id, r.poi_id, r.wheelchair_rating, r.comment, r.rated_by, r.created_at
        FROM ratings r
        JOIN pois p ON r.poi_id = p.id
        WHERE p.geom && ST_MakeEnvelope($1, $2, $3, $4, 4326)
          AND r.created_at > $5
        ORDER BY r.created_at DESC
      `, [...bbox, sinceDate])
    ]);

    const toFeature = (r, props) => ({
      type: 'Feature', id: r.id, geometry: r.geometry, properties: props
    });

    return {
      version: 1,
      city: resolved.key,
      deltaFrom: since,
      exportedAt: new Date().toISOString(),
      counts: {
        pois: pois.rows.length,
        footways: footways.rows.length,
        barriers: barriers.rows.length,
        ratings: ratings.rows.length,
      },
      pois: pois.rows.map(r => toFeature(r, {
        osm_id: r.osm_id, name: r.name, wheelchair: r.wheelchair,
        category: r.category, tags: r.tags
      })),
      footways: footways.rows.map(r => toFeature(r, {
        surface: r.surface, smoothness: r.smoothness, incline: r.incline,
        width: r.width, wheelchair: r.wheelchair, kerb: r.kerb,
        accessibility_score: r.accessibility_score
      })),
      barriers: barriers.rows.map(r => toFeature(r, {
        barrier_type: r.barrier_type, description: r.description,
        severity: r.severity, verified: r.verified, active: r.active,
        created_at: r.created_at
      })),
      ratings: ratings.rows,
    };
  };

  // Metadata handler
  const metaHandler = async (req) => {
    const resolved = resolveCity(req.params.city);
    if (!resolved) {
      return { error: `Unknown city "${req.params.city}". Available: ${Object.keys(CITIES).join(', ')}` };
    }
    const { minLat, maxLat, minLng, maxLng } = resolved.city.bbox;
    const counts = await app.db.query(`
      SELECT
        (SELECT COUNT(*) FROM pois WHERE geom && ST_MakeEnvelope($1, $2, $3, $4, 4326)) as pois,
        (SELECT COUNT(*) FROM footways WHERE geom && ST_MakeEnvelope($1, $2, $3, $4, 4326)) as footways,
        (SELECT COUNT(*) FROM barriers WHERE active = true AND geom && ST_MakeEnvelope($1, $2, $3, $4, 4326)) as barriers,
        (SELECT COUNT(*) FROM ratings) as ratings
    `, [minLng, minLat, maxLng, maxLat]);
    const c = counts.rows[0];
    const estimatedSizeMB = Math.round((parseInt(c.pois) * 0.5 + parseInt(c.footways) * 1.0 + parseInt(c.barriers) * 0.3) / 1024 * 10) / 10;
    return {
      city: resolved.key,
      ...c,
      estimatedSizeMB,
      tileEstimateMB: 12,
      totalEstimateMB: estimatedSizeMB + 12
    };
  };

  // Register parametric routes
  app.get('/:city', fullExportHandler);
  app.get('/:city/delta', deltaHandler);
  app.get('/:city/meta', metaHandler);
}
