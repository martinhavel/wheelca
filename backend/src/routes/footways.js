export async function footwaysRoutes(app) {
  app.get('/', async (req) => {
    const { minLat, minLng, maxLat, maxLng } = req.query;
    if (!minLat || !minLng || !maxLat || !maxLng) {
      return { error: 'Missing bbox params' };
    }
    const result = await app.db.query(`
      SELECT id, osm_id, surface, smoothness, incline, width, wheelchair, kerb,
             accessibility_score, ST_AsGeoJSON(geom)::json as geometry
      FROM footways
      WHERE geom && ST_MakeEnvelope($1, $2, $3, $4, 4326)
      LIMIT 10000
    `, [minLng, minLat, maxLng, maxLat]);
    return {
      type: 'FeatureCollection',
      features: result.rows.map(r => ({
        type: 'Feature',
        id: r.id,
        geometry: r.geometry,
        properties: {
          surface: r.surface,
          smoothness: r.smoothness,
          incline: r.incline,
          width: r.width,
          wheelchair: r.wheelchair,
          kerb: r.kerb,
          accessibility_score: r.accessibility_score
        }
      }))
    };
  });
}
