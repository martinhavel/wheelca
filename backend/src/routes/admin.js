export async function adminRoutes(app) {
  // All routes require admin
  app.addHook('preHandler', app.requireAdmin);

  // Dashboard stats
  app.get('/stats', async () => {
    const stats = await app.db.query(`
      SELECT
        (SELECT COUNT(*) FROM users WHERE deleted_at IS NULL) as total_users,
        (SELECT COUNT(*) FROM users WHERE last_login_at > NOW() - INTERVAL '7 days') as active_users_7d,
        (SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL '30 days') as new_users_30d,
        (SELECT COUNT(*) FROM pois) as total_pois,
        (SELECT COUNT(*) FROM footways) as total_footways,
        (SELECT COUNT(*) FROM barriers WHERE active = true) as active_barriers,
        (SELECT COUNT(*) FROM barriers WHERE created_at > NOW() - INTERVAL '7 days') as barriers_7d,
        (SELECT COUNT(*) FROM saved_routes) as total_saved_routes,
        (SELECT COUNT(*) FROM pois WHERE category = 'toilets') as total_toilets
    `);
    return stats.rows[0];
  });

  // Users list
  app.get('/users', async (req) => {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = (page - 1) * limit;
    const search = req.query.search || '';

    let where = 'WHERE deleted_at IS NULL';
    const params = [];
    if (search) {
      where += ' AND (email ILIKE $1 OR display_name ILIKE $1)';
      params.push('%' + search + '%');
    }

    const countResult = await app.db.query('SELECT COUNT(*) FROM users ' + where, params);
    const result = await app.db.query(
      'SELECT id, email, display_name, role, email_verified, created_at, last_login_at FROM users ' +
      where + ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2),
      [...params, limit, offset]
    );
    return { users: result.rows, total: parseInt(countResult.rows[0].count), page, limit };
  });

  // Ban/unban user
  app.patch('/users/:id', async (req, reply) => {
    const { role } = req.body;
    if (!['user', 'banned'].includes(role)) return reply.code(400).send({ error: 'Invalid role' });
    const result = await app.db.query(
      'UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2 AND role != $3 RETURNING id, role',
      [role, req.params.id, 'admin']
    );
    if (!result.rows.length) return reply.code(404).send({ error: 'User not found or is admin' });
    return result.rows[0];
  });

  // Barriers management
  app.get('/barriers', async (req) => {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = (page - 1) * limit;
    const verified = req.query.verified;

    let where = 'WHERE active = true';
    const params = [];
    if (verified === 'false') { where += ' AND verified = false'; }
    if (verified === 'true') { where += ' AND verified = true'; }

    const countResult = await app.db.query('SELECT COUNT(*) FROM barriers ' + where, params);
    const result = await app.db.query(
      'SELECT b.id, b.barrier_type, b.description, b.severity, b.verified, ' +
      'ST_Y(b.geom) as lat, ST_X(b.geom) as lng, b.created_at, ' +
      'u.email as reporter_email ' +
      'FROM barriers b LEFT JOIN users u ON b.user_id = u.id ' +
      where + ' ORDER BY b.created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2),
      [...params, limit, offset]
    );
    return { barriers: result.rows, total: parseInt(countResult.rows[0].count), page, limit };
  });

  // Verify barrier
  app.patch('/barriers/:id/verify', async (req, reply) => {
    const result = await app.db.query(
      'UPDATE barriers SET verified = true, verified_by = $1, updated_at = NOW() WHERE id = $2 RETURNING id',
      [req.user.email, req.params.id]
    );
    if (!result.rows.length) return reply.code(404).send({ error: 'Not found' });
    return { id: result.rows[0].id, verified: true };
  });

  // Delete barrier (hard delete spam)
  app.delete('/barriers/:id', async (req, reply) => {
    const result = await app.db.query('DELETE FROM barriers WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows.length) return reply.code(404).send({ error: 'Not found' });
    return { message: 'Deleted' };
  });

  // Test results
  app.get('/tests', async (req) => {
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const result = await app.db.query(
      'SELECT id, run_type, total_tests, passed, failed, duration_ms, environment, created_at FROM test_runs ORDER BY created_at DESC LIMIT $1',
      [limit]
    );
    return result.rows;
  });

  app.get('/tests/:id', async (req, reply) => {
    const result = await app.db.query('SELECT * FROM test_runs WHERE id = $1', [req.params.id]);
    if (!result.rows.length) return reply.code(404).send({ error: 'Not found' });
    return result.rows[0];
  });
}
