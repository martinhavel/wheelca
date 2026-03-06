import Fastify from 'fastify';
import cors from '@fastify/cors';
import pg from 'pg';
import { barriersRoutes } from './routes/barriers.js';
import { poisRoutes } from './routes/pois.js';
import { footwaysRoutes } from './routes/footways.js';
import { routeRoutes } from './routes/route.js';
import { importRoutes } from './routes/import.js';

const { Pool } = pg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const app = Fastify({ logger: true });

await app.register(cors, { origin: true });

app.decorate('db', pool);

app.register(barriersRoutes, { prefix: '/api/barriers' });
app.register(poisRoutes, { prefix: '/api/pois' });
app.register(footwaysRoutes, { prefix: '/api/footways' });
app.register(routeRoutes, { prefix: '/api/route' });
app.register(importRoutes, { prefix: '/api/import' });

app.get('/api/health', async () => {
  const result = await pool.query('SELECT NOW() as time, COUNT(*) as pois FROM pois');
  return { status: 'ok', ...result.rows[0] };
});

app.get('/api/stats', async () => {
  const stats = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM pois) as total_pois,
      (SELECT COUNT(*) FROM pois WHERE wheelchair = 'yes') as accessible_pois,
      (SELECT COUNT(*) FROM pois WHERE wheelchair = 'limited') as limited_pois,
      (SELECT COUNT(*) FROM pois WHERE wheelchair = 'no') as inaccessible_pois,
      (SELECT COUNT(*) FROM footways) as total_footways,
      (SELECT COUNT(*) FROM barriers WHERE active = true) as active_barriers
  `);
  return stats.rows[0];
});

const port = parseInt(process.env.PORT || '3000');
await app.listen({ port, host: '0.0.0.0' });
