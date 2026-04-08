import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

export function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
}

export function authPlugin(app) {
  app.decorateRequest('user', null);

  app.decorate('authenticate', async (request, reply) => {
    const token = request.headers.authorization?.replace('Bearer ', ''  )
                  || request.cookies?.wc_token;
    if (!token) return reply.code(401).send({ error: 'Nepřihlášen' });
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      const result = await app.db.query(
        'SELECT id, email, display_name, role FROM users WHERE id = $1 AND deleted_at IS NULL',
        [payload.sub]
      );
      if (!result.rows[0]) return reply.code(401).send({ error: 'Uživatel nenalezen' });
      if (result.rows[0].role === 'banned') return reply.code(403).send({ error: 'Účet zablokován' });
      request.user = result.rows[0];
    } catch {
      return reply.code(401).send({ error: 'Neplatné přihlášení' });
    }
  });

  app.decorate('requireAdmin', async (request, reply) => {
    await app.authenticate(request, reply);
    if (reply.sent) return;
    if (request.user?.role !== 'admin') return reply.code(403).send({ error: 'Vyžadováno oprávnění správce' });
  });
}
