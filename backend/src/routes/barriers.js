export async function barriersRoutes(app) {
  // Získat bariéry v bounding boxu
  app.get('/', async (req, reply) => {
    const { minLat, minLng, maxLat, maxLng } = req.query;
    if (!minLat || !minLng || !maxLat || !maxLng) {
      reply.code(400);
      return { error: 'Missing bbox params: minLat, minLng, maxLat, maxLng' };
    }
    const result = await app.db.query(`
      SELECT id, barrier_type, description, severity, photo_url,
             ST_AsGeoJSON(geom)::json as geometry, verified, created_at
      FROM barriers
      WHERE active = true
        AND geom && ST_MakeEnvelope($1, $2, $3, $4, 4326)
    `, [minLng, minLat, maxLng, maxLat]);
    return {
      type: 'FeatureCollection',
      features: result.rows.map(r => ({
        type: 'Feature',
        id: r.id,
        geometry: r.geometry,
        properties: {
          barrier_type: r.barrier_type,
          description: r.description,
          severity: r.severity,
          photo_url: r.photo_url,
          verified: r.verified,
          created_at: r.created_at
        }
      }))
    };
  });

  // Nahlásit novou bariéru
  app.post('/', async (req, reply) => {
    const { barrier_type, description, severity, lat, lng, photo_url, reported_by } = req.body;
    if (!barrier_type || !lat || !lng) {
      reply.code(400);
      return { error: 'Missing required fields: barrier_type, lat, lng' };
    }
    const result = await app.db.query(`
      INSERT INTO barriers (barrier_type, description, severity, geom, photo_url, reported_by)
      VALUES ($1, $2, $3, ST_SetSRID(ST_MakePoint($4, $5), 4326), $6, $7)
      RETURNING id, barrier_type, created_at
    `, [barrier_type, description, severity || 2, lng, lat, photo_url, reported_by]);
    return result.rows[0];
  });

  // Ověřit bariéru
  app.patch('/:id/verify', async (req) => {
    const { verified_by } = req.body || {};
    const result = await app.db.query(`
      UPDATE barriers SET verified = true, verified_by = $1, updated_at = NOW()
      WHERE id = $2 RETURNING id
    `, [verified_by, req.params.id]);
    return result.rows[0] || { error: 'Not found' };
  });

  // Deaktivovat bariéru (už neexistuje)
  app.delete('/:id', async (req) => {
    const result = await app.db.query(`
      UPDATE barriers SET active = false, updated_at = NOW()
      WHERE id = $1 RETURNING id
    `, [req.params.id]);
    return result.rows[0] || { error: 'Not found' };
  });
}
