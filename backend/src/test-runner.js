import { execSync } from 'child_process';
import pg from 'pg';

async function runTests() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const start = Date.now();

  try {
    const output = execSync('npx vitest run --reporter=json 2>/dev/null', {
      cwd: '/app',
      env: { ...process.env, TEST_API_URL: 'http://localhost:3000' },
      timeout: 120000
    }).toString();

    const results = JSON.parse(output);
    const duration = Date.now() - start;
    const total = results.numTotalTests || 0;
    const passed = results.numPassedTests || 0;
    const failed = results.numFailedTests || 0;

    await pool.query(
      `INSERT INTO test_runs (run_type, total_tests, passed, failed, results, duration_ms, environment)
       VALUES ('all', $1, $2, $3, $4, $5, $6)`,
      [total, passed, failed, JSON.stringify(results), duration, process.env.NODE_ENV || 'staging']
    );

    console.log(`Tests: ${passed}/${total} passed, ${failed} failed (${duration}ms)`);
    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    const duration = Date.now() - start;
    await pool.query(
      `INSERT INTO test_runs (run_type, total_tests, passed, failed, results, duration_ms, environment)
       VALUES ('all', 0, 0, 1, $1, $2, $3)`,
      [JSON.stringify({ error: err.message }), duration, process.env.NODE_ENV || 'staging']
    );
    console.error('Test run failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runTests();
