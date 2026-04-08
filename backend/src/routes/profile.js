import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

export async function profileRoutes(app) {
  // Update profile
  app.put('/', { preHandler: [app.authenticate] }, async (req, reply) => {
    const allowed = ['display_name', 'default_city', 'language', 'route_profile', 'wheelchair_type', 'max_incline', 'surface_prefs'];
    const updates = [];
    const values = [];
    let idx = 1;

    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        if (key === 'surface_prefs') {
          updates.push(`${key} = $${idx++}::jsonb`);
          values.push(JSON.stringify(req.body[key]));
        } else {
          updates.push(`${key} = $${idx++}`);
          values.push(req.body[key]);
        }
      }
    }

    if (updates.length === 0) return reply.code(400).send({ error: 'No fields to update' });

    updates.push('updated_at = NOW()');
    values.push(req.user.id);

    const result = await app.db.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx} RETURNING
        id, email, display_name, default_city, language, route_profile,
        wheelchair_type, max_incline, surface_prefs`,
      values
    );
    return result.rows[0];
  });

  // Change password
  app.put('/password', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) return reply.code(400).send({ error: 'Missing passwords' });
    if (new_password.length < 8) return reply.code(400).send({ error: 'Password must be at least 8 characters' });

    const user = await app.db.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    const valid = await bcrypt.compare(current_password, user.rows[0].password_hash);
    if (!valid) return reply.code(403).send({ error: 'Nesprávné současné heslo' });

    const hash = await bcrypt.hash(new_password, SALT_ROUNDS);
    await app.db.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [hash, req.user.id]);
    return { message: 'Password updated' };
  });

  // Delete account (GDPR)
  app.delete('/', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { password } = req.body;
    if (!password) return reply.code(400).send({ error: 'Password required for account deletion' });

    const user = await app.db.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    const valid = await bcrypt.compare(password, user.rows[0].password_hash);
    if (!valid) return reply.code(403).send({ error: 'Nesprávné heslo' });

    await app.db.query('UPDATE users SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1', [req.user.id]);
    reply.clearCookie('wc_token', { path: '/' });
    return { message: 'Account scheduled for deletion in 30 days' };
  });

  // Export data (GDPR)
  app.get('/export', { preHandler: [app.authenticate] }, async (req, reply) => {
    const user = await app.db.query(
      `SELECT id, email, display_name, role, email_verified, default_city, language,
              route_profile, wheelchair_type, max_incline, surface_prefs, consent_at,
              created_at, updated_at, last_login_at
       FROM users WHERE id = $1`, [req.user.id]
    );

    const routes = await app.db.query(
      `SELECT id, name, start_label, end_label, distance_m, duration_s, engine, created_at
       FROM saved_routes WHERE user_id = $1`, [req.user.id]
    );

    const barriers = await app.db.query(
      `SELECT id, barrier_type, description, severity, ST_AsGeoJSON(geom)::json as location, created_at
       FROM barriers WHERE user_id = $1`, [req.user.id]
    );

    reply.header('Content-Disposition', 'attachment; filename="wheelca-data-export.json"');
    return {
      exported_at: new Date().toISOString(),
      user: user.rows[0],
      saved_routes: routes.rows,
      reported_barriers: barriers.rows
    };
  });
}
