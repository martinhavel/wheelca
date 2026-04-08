CREATE EXTENSION IF NOT EXISTS postgis;

-- Bezbariérové POI importované z OSM
CREATE TABLE pois (
    id SERIAL PRIMARY KEY,
    osm_id BIGINT UNIQUE,
    name TEXT,
    wheelchair TEXT CHECK (wheelchair IN ('yes', 'no', 'limited', 'unknown')),
    category TEXT,
    geom GEOMETRY(Point, 4326) NOT NULL,
    tags JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chodníky / cesty s atributy přístupnosti
CREATE TABLE footways (
    id SERIAL PRIMARY KEY,
    osm_id BIGINT UNIQUE,
    surface TEXT,
    smoothness TEXT,
    incline TEXT,
    width TEXT,
    wheelchair TEXT,
    kerb TEXT,
    lit TEXT,
    geom GEOMETRY(LineString, 4326) NOT NULL,
    accessibility_score SMALLINT DEFAULT 0, -- 0=unknown, 1=good, 2=limited, 3=bad
    tags JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bariéry nahlášené komunitou
CREATE TABLE barriers (
    id SERIAL PRIMARY KEY,
    barrier_type TEXT NOT NULL CHECK (barrier_type IN (
        'steps', 'high_kerb', 'narrow_passage', 'steep_slope',
        'bad_surface', 'construction', 'no_ramp', 'other'
    )),
    description TEXT,
    severity SMALLINT DEFAULT 2 CHECK (severity BETWEEN 1 AND 3),
    geom GEOMETRY(Point, 4326) NOT NULL,
    photo_url TEXT,
    reported_by TEXT,
    verified BOOLEAN DEFAULT FALSE,
    verified_by TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Hodnocení přístupnosti od komunity
CREATE TABLE ratings (
    id SERIAL PRIMARY KEY,
    poi_id INTEGER REFERENCES pois(id) ON DELETE CASCADE,
    wheelchair_rating TEXT CHECK (wheelchair_rating IN ('yes', 'limited', 'no')),
    comment TEXT,
    rated_by TEXT DEFAULT 'anonymous',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prostorové indexy
CREATE INDEX idx_pois_geom ON pois USING GIST (geom);
CREATE INDEX idx_footways_geom ON footways USING GIST (geom);
CREATE INDEX idx_barriers_geom ON barriers USING GIST (geom);
CREATE INDEX idx_pois_wheelchair ON pois (wheelchair);
CREATE INDEX idx_footways_score ON footways (accessibility_score);
CREATE INDEX idx_barriers_active ON barriers (active) WHERE active = TRUE;
CREATE INDEX idx_ratings_poi ON ratings(poi_id);
CREATE INDEX idx_ratings_created ON ratings(created_at);

-- Delta sync indexy
CREATE INDEX idx_pois_updated ON pois(updated_at);
CREATE INDEX idx_footways_updated ON footways(updated_at);
CREATE INDEX idx_barriers_updated ON barriers(updated_at);
