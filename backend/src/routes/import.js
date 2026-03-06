export async function importRoutes(app) {
  // Import POI z OSM Overpass API pro daný bbox
  app.post('/osm-pois', async (req) => {
    const { minLat, minLng, maxLat, maxLng } = req.body;
    const bbox = `${minLat},${minLng},${maxLat},${maxLng}`;

    const query = `
      [out:json][timeout:120];
      (
        node["wheelchair"](${bbox});
        way["wheelchair"](${bbox});
      );
      out center tags;
    `;

    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`
    });

    if (!response.ok) {
      return { error: 'Overpass API error', status: response.status };
    }

    const data = await response.json();
    let imported = 0;

    for (const el of data.elements) {
      const lat = el.lat || el.center?.lat;
      const lng = el.lon || el.center?.lon;
      if (!lat || !lng) continue;

      const name = el.tags?.name || null;
      const wheelchair = el.tags?.wheelchair || 'unknown';
      const category = el.tags?.amenity || el.tags?.shop || el.tags?.tourism || el.tags?.building || 'other';
      const tags = JSON.stringify(el.tags || {});

      await app.db.query(`
        INSERT INTO pois (osm_id, name, wheelchair, category, geom, tags)
        VALUES ($1, $2, $3, $4, ST_SetSRID(ST_MakePoint($5, $6), 4326), $7)
        ON CONFLICT (osm_id) DO UPDATE SET
          name = EXCLUDED.name,
          wheelchair = EXCLUDED.wheelchair,
          category = EXCLUDED.category,
          tags = EXCLUDED.tags,
          updated_at = NOW()
      `, [el.id, name, wheelchair, category, lng, lat, tags]);
      imported++;
    }

    return { imported, total_elements: data.elements.length };
  });

  // Import chodníků z OSM
  app.post('/osm-footways', async (req) => {
    const { minLat, minLng, maxLat, maxLng } = req.body;
    const bbox = `${minLat},${minLng},${maxLat},${maxLng}`;

    const query = `
      [out:json][timeout:120];
      way["highway"~"^(footway|pedestrian|path|crossing|residential|living_street|service|unclassified|cycleway)$"](${bbox});
      out geom tags;
    `;

    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`
    });

    if (!response.ok) {
      return { error: 'Overpass API error', status: response.status };
    }

    const data = await response.json();
    let imported = 0;

    for (const el of data.elements) {
      if (!el.geometry || el.geometry.length < 2) continue;

      const linestring = `LINESTRING(${el.geometry.map(p => `${p.lon} ${p.lat}`).join(',')})`;
      const score = computeScore(el.tags);

      await app.db.query(`
        INSERT INTO footways (osm_id, surface, smoothness, incline, width, wheelchair, kerb, geom, accessibility_score, tags)
        VALUES ($1, $2, $3, $4, $5, $6, $7, ST_SetSRID(ST_GeomFromText($8), 4326), $9, $10)
        ON CONFLICT (osm_id) DO UPDATE SET
          surface = EXCLUDED.surface,
          smoothness = EXCLUDED.smoothness,
          accessibility_score = EXCLUDED.accessibility_score,
          tags = EXCLUDED.tags
      `, [
        el.id,
        el.tags?.surface || null,
        el.tags?.smoothness || null,
        el.tags?.incline || null,
        el.tags?.width || null,
        el.tags?.wheelchair || null,
        el.tags?.kerb || null,
        linestring,
        score,
        JSON.stringify(el.tags || {})
      ]);
      imported++;
    }

    return { imported, total_elements: data.elements.length };
  });
}

function computeScore(tags) {
  if (!tags) return 0;
  const surface = tags.surface;
  const smoothness = tags.smoothness;
  const highway = tags.highway;

  const goodSurfaces = ['asphalt', 'concrete', 'paving_stones', 'concrete:plates'];
  const badSurfaces = ['cobblestone', 'sett', 'gravel', 'sand', 'grass', 'dirt', 'mud'];
  const okSurfaces = ['compacted', 'fine_gravel', 'cobblestone:flattened'];

  if (tags.wheelchair === 'no') return 3;
  if (tags.wheelchair === 'yes') return 1;
  if (smoothness === 'excellent' || smoothness === 'good') return 1;
  if (smoothness === 'bad' || smoothness === 'very_bad' || smoothness === 'horrible') return 3;
  if (goodSurfaces.includes(surface)) return 1;
  if (badSurfaces.includes(surface)) return 3;
  if (okSurfaces.includes(surface)) return 2;

  // Odhad podle typu cesty pokud chybí surface
  if (!surface) {
    if (['residential', 'living_street', 'pedestrian'].includes(highway)) return 1;
    if (['service', 'unclassified', 'cycleway'].includes(highway)) return 2;
    if (highway === 'path') return 2;
  }
  return 0;
}
