-- Users & Auth
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name TEXT,
    email_verified BOOLEAN DEFAULT FALSE,
    email_verify_token TEXT,
    email_verify_expires TIMESTAMPTZ,
    password_reset_token TEXT,
    password_reset_expires TIMESTAMPTZ,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'banned')),
    default_city TEXT DEFAULT 'prague',
    language TEXT DEFAULT 'cs',
    route_profile TEXT DEFAULT 'wheelchair',
    wheelchair_type TEXT DEFAULT 'manual',
    max_incline INTEGER DEFAULT 6,
    surface_prefs JSONB DEFAULT '[]',
    consent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);

-- Saved Routes
CREATE TABLE IF NOT EXISTS saved_routes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    start_point GEOMETRY(Point, 4326) NOT NULL,
    end_point GEOMETRY(Point, 4326) NOT NULL,
    start_label TEXT,
    end_label TEXT,
    route_geojson JSONB NOT NULL,
    distance_m REAL,
    duration_s REAL,
    engine TEXT,
    share_token TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saved_routes_user ON saved_routes (user_id);
CREATE INDEX IF NOT EXISTS idx_saved_routes_share ON saved_routes (share_token) WHERE share_token IS NOT NULL;

-- Test Results
CREATE TABLE IF NOT EXISTS test_runs (
    id SERIAL PRIMARY KEY,
    run_type TEXT NOT NULL,
    total_tests INTEGER NOT NULL,
    passed INTEGER NOT NULL,
    failed INTEGER NOT NULL,
    results JSONB NOT NULL,
    duration_ms INTEGER,
    environment TEXT DEFAULT 'staging',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_test_runs_created ON test_runs (created_at DESC);

-- Link barriers to users
DO $$ BEGIN
    ALTER TABLE barriers ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
