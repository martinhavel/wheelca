import { nanoid } from 'nanoid';

export async function savedRoutesRoutes(app) {
  // Save route
  app.post('/', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { name, start_point, end_point, start_label, end_label, route_geojson, distance_m, duration_s, engine } = req.body;
    if (!name || !start_point || !end_point || !route_geojson) {
      return reply.code(400).send({ error: 'Missing required fields: name, start_point, end_point, route_geojson' });
    }

    const result = await app.db.query(
      `INSERT INTO saved_routes (user_id, name, start_point, end_point, start_label, end_label, route_geojson, distance_m, duration_s, engine)
       VALUES ($1, $2, ST_SetSRID(ST_MakePoint($3, $4), 4326), ST_SetSRID(ST_MakePoint($5, $6), 4326), $7, $8, $9, $10, $11, $12)
       RETURNING id, name, created_at`,
      [req.user.id, name, start_point[0], start_point[1], end_point[0], end_point[1],
       start_label || null, end_label || null, JSON.stringify(route_geojson), distance_m || null, duration_s || null, engine || null]
    );
    return result.rows[0];
  });

  // List saved routes
  app.get('/', { preHandler: [app.authenticate] }, async (req) => {
    const result = await app.db.query(
      `SELECT id, name, start_label, end_label, distance_m, duration_s, engine, share_token, created_at
       FROM saved_routes WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.user.id]
    );
    return result.rows;
  });

  // Get single route
  app.get('/:id', { preHandler: [app.authenticate] }, async (req, reply) => {
    const result = await app.db.query(
      `SELECT id, name, start_label, end_label, route_geojson,
              ST_X(start_point) as start_lng, ST_Y(start_point) as start_lat,
              ST_X(end_point) as end_lng, ST_Y(end_point) as end_lat,
              distance_m, duration_s, engine, share_token, created_at
       FROM saved_routes WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (!result.rows.length) return reply.code(404).send({ error: 'Trasa nenalezena' });
    return result.rows[0];
  });

  // Delete route
  app.delete('/:id', { preHandler: [app.authenticate] }, async (req, reply) => {
    const result = await app.db.query(
      'DELETE FROM saved_routes WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );
    if (!result.rows.length) return reply.code(404).send({ error: 'Trasa nenalezena' });
    return { message: 'Deleted' };
  });

  // Share route
  app.post('/:id/share', { preHandler: [app.authenticate] }, async (req, reply) => {
    const existing = await app.db.query(
      'SELECT share_token FROM saved_routes WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (!existing.rows.length) return reply.code(404).send({ error: 'Trasa nenalezena' });

    let token = existing.rows[0].share_token;
    if (!token) {
      token = nanoid(16);
      await app.db.query('UPDATE saved_routes SET share_token = $1 WHERE id = $2', [token, req.params.id]);
    }

    const appUrl = process.env.APP_URL || 'https://stage-wheelca.mhai.app';
    return { share_url: `${appUrl}/route/${token}` };
  });

  // Public: view shared route
  app.get('/shared/:token', async (req, reply) => {
    const result = await app.db.query(
      `SELECT name, start_label, end_label, route_geojson,
              ST_X(start_point) as start_lng, ST_Y(start_point) as start_lat,
              ST_X(end_point) as end_lng, ST_Y(end_point) as end_lat,
              distance_m, duration_s, engine
       FROM saved_routes WHERE share_token = $1`,
      [req.params.token]
    );
    if (!result.rows.length) return reply.code(404).send({ error: 'Trasa nenalezena' });
    return result.rows[0];
  });
}
