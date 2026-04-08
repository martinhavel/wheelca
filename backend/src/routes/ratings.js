export async function ratingsRoutes(app) {
  // Get ratings for a POI
  app.get('/:poiId', async (req) => {
    const result = await app.db.query(
      'SELECT id, poi_id, wheelchair_rating, comment, rated_by, created_at FROM ratings WHERE poi_id = $1 ORDER BY created_at DESC',
      [req.params.poiId]
    );
    return result.rows;
  });

  // Submit a rating
  app.post('/', async (req) => {
    const { poi_id, wheelchair_rating, comment, rated_by } = req.body;
    if (!poi_id || !wheelchair_rating) {
      return { error: 'Missing required fields: poi_id, wheelchair_rating' };
    }

    const result = await app.db.query(
      `INSERT INTO ratings (poi_id, wheelchair_rating, comment, rated_by)
       VALUES ($1, $2, $3, $4)
       RETURNING id, poi_id, wheelchair_rating, created_at`,
      [poi_id, wheelchair_rating, comment || null, rated_by || 'anonymous']
    );

    // Update POI wheelchair status based on latest community consensus
    await updatePoiWheelchair(app.db, poi_id);

    return result.rows[0];
  });

  // Batch submit (for offline sync)
  app.post('/batch', async (req) => {
    const { ratings } = req.body;
    if (!ratings || !Array.isArray(ratings)) {
      return { error: 'Missing ratings array' };
    }

    let synced = 0;
    for (const r of ratings) {
      if (!r.poi_id || !r.wheelchair_rating) continue;
      await app.db.query(
        `INSERT INTO ratings (poi_id, wheelchair_rating, comment, rated_by, created_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [r.poi_id, r.wheelchair_rating, r.comment || null, r.rated_by || 'anonymous', r.created_at || new Date()]
      );
      await updatePoiWheelchair(app.db, r.poi_id);
      synced++;
    }

    return { synced };
  });
}

// Update POI wheelchair status based on majority vote from ratings
async function updatePoiWheelchair(db, poiId) {
  const result = await db.query(
    `SELECT wheelchair_rating, COUNT(*) as cnt
     FROM ratings WHERE poi_id = $1
     GROUP BY wheelchair_rating
     ORDER BY cnt DESC
     LIMIT 1`,
    [poiId]
  );

  if (result.rows.length > 0) {
    await db.query(
      'UPDATE pois SET wheelchair = $1, updated_at = NOW() WHERE id = $2',
      [result.rows[0].wheelchair_rating, poiId]
    );
  }
}
