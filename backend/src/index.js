import Fastify from 'fastify';
import cors from '@fastify/cors';
import pg from 'pg';
import { barriersRoutes } from './routes/barriers.js';
import { poisRoutes } from './routes/pois.js';
import { footwaysRoutes } from './routes/footways.js';
import { routeRoutes } from './routes/route.js';
import { importRoutes } from './routes/import.js';
import { exportRoutes } from './routes/export.js';
import { ratingsRoutes } from './routes/ratings.js';

const { Pool } = pg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const app = Fastify({ logger: true });

await app.register(cors, { origin: ['https://wheelca.mhai.app', 'http://localhost:3011'] });

app.decorate('db', pool);

app.register(barriersRoutes, { prefix: '/api/barriers' });
app.register(poisRoutes, { prefix: '/api/pois' });
app.register(footwaysRoutes, { prefix: '/api/footways' });
app.register(routeRoutes, { prefix: '/api/route' });
app.register(importRoutes, { prefix: '/api/import' });
app.register(exportRoutes, { prefix: '/api/export' });
app.register(ratingsRoutes, { prefix: '/api/ratings' });

// Nearest POI (s volitelným filtrem na kategorii a wheelchair)
app.get('/api/pois/nearest', async (req) => {
  const { lat, lng, category, wheelchair, limit } = req.query;
  if (!lat || !lng) return { error: 'Missing lat, lng' };

  const params = [parseFloat(lng), parseFloat(lat)];
  const conditions = [];
  let idx = 3;

  if (category) {
    conditions.push(`category = $${idx++}`);
    params.push(category);
  }
  if (wheelchair) {
    conditions.push(`wheelchair = $${idx++}`);
    params.push(wheelchair);
  }

  params.push(parseInt(limit) || 5);
  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

  const result = await pool.query(`
    SELECT id, osm_id, name, wheelchair, category,
           ST_AsGeoJSON(geom)::json as geometry, tags,
           ST_Distance(geom::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) as distance_m
    FROM pois
    ${where}
    ORDER BY geom <-> ST_SetSRID(ST_MakePoint($1, $2), 4326)
    LIMIT $${idx}
  `, params);

  return {
    type: 'FeatureCollection',
    features: result.rows.map(r => ({
      type: 'Feature',
      id: r.id,
      geometry: r.geometry,
      properties: {
        osm_id: r.osm_id, name: r.name, wheelchair: r.wheelchair,
        category: r.category, tags: r.tags,
        distance_m: Math.round(parseFloat(r.distance_m))
      }
    }))
  };
});

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
      (SELECT COUNT(*) FROM barriers WHERE active = true) as active_barriers,
      (SELECT COUNT(*) FROM ratings) as total_ratings,
      (SELECT COUNT(*) FROM pois WHERE category = 'toilets') as total_toilets,
      (SELECT COUNT(*) FROM pois WHERE category = 'toilets' AND wheelchair = 'yes') as accessible_toilets
  `);
  return stats.rows[0];
});

const port = parseInt(process.env.PORT || '3000');
await app.listen({ port, host: '0.0.0.0' });
