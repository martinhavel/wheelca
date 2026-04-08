import bcrypt from 'bcrypt';
import { nanoid } from 'nanoid';
import { Resend } from 'resend';
import { signToken } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rate-limit.js';

const SALT_ROUNDS = 12;

async function sendEmail(to, subject, html) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log("[EMAIL] To: " + to + ", Subject: " + subject);
    console.log("[EMAIL] (RESEND_API_KEY not set)");
    return;
  }
  const resend = new Resend(apiKey);
  await resend.emails.send({
    from: process.env.EMAIL_FROM || "Wheelca <noreply@mhai.app>",
    to, subject, html
  });
}

export async function authRoutes(app) {
  // Register
  app.post('/register', {
    preHandler: rateLimit('register', 3, 60 * 60 * 1000),
    schema: {
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', maxLength: 255 },
          password: { type: 'string', minLength: 8, maxLength: 128 },
          display_name: { type: 'string', maxLength: 100 }
        }
      }
    }
  }, async (req, reply) => {
    const { email, password, display_name } = req.body;

    const existing = await app.db.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length > 0) return reply.code(409).send({ error: 'Email je již registrován' });

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
    const verify_token = nanoid(32);
    const verify_expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    const result = await app.db.query(
      `INSERT INTO users (email, password_hash, display_name, email_verify_token, email_verify_expires, consent_at)
       VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING id, email`,
      [email.toLowerCase(), password_hash, display_name || null, verify_token, verify_expires]
    );

    const appUrl = process.env.APP_URL || 'https://stage-wheelca.mhai.app';
    await sendEmail(email, 'Wheelca - Ověření emailu', `
      <h2>Vítejte ve Wheelca!</h2>
      <p>Klikněte pro ověření emailu:</p>
      <p><a href="${appUrl}/verify-email?token=${verify_token}">Ověřit email</a></p>
      <p>Odkaz platí 24 hodin.</p>
    `);

    return { id: result.rows[0].id, email: result.rows[0].email, message: 'Verification email sent' };
  });

  // Verify email
  app.post('/verify-email', async (req, reply) => {
    const { token } = req.body;
    if (!token) return reply.code(400).send({ error: 'Missing token' });

    const result = await app.db.query(
      `UPDATE users SET email_verified = TRUE, email_verify_token = NULL, email_verify_expires = NULL, updated_at = NOW()
       WHERE email_verify_token = $1 AND email_verify_expires > NOW() AND deleted_at IS NULL
       RETURNING id`,
      [token]
    );

    if (!result.rows.length) return reply.code(400).send({ error: 'Neplatný nebo vypršelý odkaz' });
    return { message: 'Email verified' };
  });

  // Login
  app.post('/login', {
    preHandler: rateLimit('login', 10, 15 * 60 * 1000),
    schema: {
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string' },
          password: { type: 'string' }
        }
      }
    }
  }, async (req, reply) => {
    const { email, password } = req.body;

    const result = await app.db.query(
      'SELECT id, email, password_hash, display_name, role, email_verified FROM users WHERE email = $1 AND deleted_at IS NULL',
      [email.toLowerCase()]
    );

    if (!result.rows.length) return reply.code(401).send({ error: 'Nesprávný email nebo heslo' });

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return reply.code(401).send({ error: 'Nesprávný email nebo heslo' });

    // Update last login
    await app.db.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);

    const token = signToken(user);

    reply.setCookie('wc_token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        role: user.role,
        email_verified: user.email_verified
      }
    };
  });

  // Logout
  app.post('/logout', async (req, reply) => {
    reply.clearCookie('wc_token', { path: '/' });
    return { message: 'Logged out' };
  });

  // Forgot password
  app.post('/forgot-password', {
    preHandler: rateLimit('forgot-password', 3, 60 * 60 * 1000)
  }, async (req, reply) => {
    const { email } = req.body;
    if (!email) return reply.code(400).send({ error: 'Missing email' });

    const result = await app.db.query(
      'SELECT id, email FROM users WHERE email = $1 AND deleted_at IS NULL',
      [email.toLowerCase()]
    );

    // Always return success to prevent email enumeration
    if (result.rows.length > 0) {
      const reset_token = nanoid(32);
      const reset_expires = new Date(Date.now() + 60 * 60 * 1000); // 1h

      await app.db.query(
        'UPDATE users SET password_reset_token = $1, password_reset_expires = $2, updated_at = NOW() WHERE id = $3',
        [reset_token, reset_expires, result.rows[0].id]
      );

      const appUrl = process.env.APP_URL || 'https://stage-wheelca.mhai.app';
      await sendEmail(email, 'Wheelca - Reset hesla', `
        <h2>Reset hesla</h2>
        <p>Klikněte pro nastavení nového hesla:</p>
        <p><a href="${appUrl}/reset-password?token=${reset_token}">Resetovat heslo</a></p>
        <p>Odkaz platí 1 hodinu.</p>
      `);
    }

    return { message: 'If the email exists, a reset link was sent' };
  });

  // Reset password
  app.post('/reset-password', async (req, reply) => {
    const { token, new_password } = req.body;
    if (!token || !new_password) return reply.code(400).send({ error: 'Missing token or password' });
    if (new_password.length < 8) return reply.code(400).send({ error: 'Heslo musí mít alespoň 8 znaků' });

    const password_hash = await bcrypt.hash(new_password, SALT_ROUNDS);

    const result = await app.db.query(
      `UPDATE users SET password_hash = $1, password_reset_token = NULL, password_reset_expires = NULL, updated_at = NOW()
       WHERE password_reset_token = $2 AND password_reset_expires > NOW() AND deleted_at IS NULL
       RETURNING id`,
      [password_hash, token]
    );

    if (!result.rows.length) return reply.code(400).send({ error: 'Neplatný nebo vypršelý odkaz' });
    return { message: 'Password updated' };
  });

  // Get current user
  app.get('/me', { preHandler: [app.authenticate] }, async (req) => {
    const result = await app.db.query(
      `SELECT id, email, display_name, role, email_verified, default_city, language,
              route_profile, wheelchair_type, max_incline, surface_prefs, created_at, last_login_at
       FROM users WHERE id = $1`,
      [req.user.id]
    );
    return result.rows[0];
  });
}
