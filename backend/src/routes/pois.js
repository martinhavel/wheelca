export async function poisRoutes(app) {
  app.get('/', async (req, reply) => {
    const { minLat, minLng, maxLat, maxLng, wheelchair } = req.query;
    if (!minLat || !minLng || !maxLat || !maxLng) {
      reply.code(400); return { error: 'Missing bbox params' };
    }
    let whereClause = 'geom && ST_MakeEnvelope($1, $2, $3, $4, 4326)';
    const params = [minLng, minLat, maxLng, maxLat];
    if (wheelchair) {
      whereClause += ` AND wheelchair = $5`;
      params.push(wheelchair);
    }
    const result = await app.db.query(`
      SELECT id, osm_id, name, wheelchair, category,
             ST_AsGeoJSON(geom)::json as geometry, tags
      FROM pois
      WHERE ${whereClause}
      LIMIT 2000
    `, params);
    return {
      type: 'FeatureCollection',
      features: result.rows.map(r => ({
        type: 'Feature',
        id: r.id,
        geometry: r.geometry,
        properties: {
          osm_id: r.osm_id,
          name: r.name,
          wheelchair: r.wheelchair,
          category: r.category,
          tags: r.tags
        }
      }))
    };
  });
}
