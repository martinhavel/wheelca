# Wheelca — Technická architektura

**URL:** https://wheelca.mhai.app | **API:** https://api-wheelca.mhai.app | **Repo:** github.com/martinhavel/wheelca

## Co to dělá

Interaktivní mapa bezbariérové přístupnosti. Data z OpenStreetMap, komunitní hlášení bariér, wheelchair routing, WC vrstva. Trojjazyčné (CS/EN/DE), 4 města (Praha, Brno, Ostrava, Plzeň).

## Stack

| Vrstva | Technologie |
|---|---|
| Frontend | Next.js 15, React 19, Leaflet + react-leaflet 5 |
| Backend | Node.js, Fastify |
| Databáze | PostgreSQL 16 + PostGIS |
| Tiles | CARTO Voyager (raster) |
| Routing | OpenRouteService wheelchair profil, OSRM foot fallback |
| OSM data | Overpass API (runtime import) |
| Hosting | Hetzner VPS (x86), Docker Compose, Cloudflare Tunnel |

## Infrastruktura (4 kontejnery)

```
┌─────────────────────────────────────────────────┐
│  Cloudflare Tunnel (cloudflared)                │
│  wheelca.mhai.app → localhost:3011 (frontend)   │
│  api-wheelca.mhai.app → localhost:3010 (backend)│
└───────────┬─────────────────────┬───────────────┘
            │                     │
  ┌─────────▼──────┐   ┌─────────▼──────┐
  │ wheelchair-web │   │ wheelchair-api │
  │ Next.js 15     │   │ Fastify        │
  │ Port 3011→3000 │   │ Port 3010→3000 │
  │ SSR disabled   │   │ CORS restricted│
  └────────────────┘   └───────┬────────┘
                               │
                     ┌─────────▼──────┐
                     │ wheelchair-db  │
                     │ PostGIS 16     │
                     │ Port 5433→5432 │
                     │ Vol: /opt/docker/volumes/wheelchair-map/db │
                     └────────────────┘
```

## DB schéma (PostGIS)

```
pois        (id, osm_id UNIQUE, name, wheelchair[yes/no/limited/unknown],
             category, geom Point, tags JSONB)
footways    (id, osm_id UNIQUE, surface, smoothness, incline, width,
             wheelchair, kerb, lit, geom LineString,
             accessibility_score[0-3], tags JSONB)
barriers    (id, barrier_type, description, severity[1-3],
             geom Point, photo_url, reported_by, verified, active)
```

Indexy: GiST na geom, B-tree na wheelchair/score/active.

**Aktuální data:** 2 734 POI (47% přístupných), 26 269 chodníků, 128 toalet (47 bezbariérových).

## Backend API (Fastify)

| Endpoint | Metoda | Popis |
|---|---|---|
| `/api/pois?bbox` | GET | POI v bounding boxu |
| `/api/pois/nearest?lat,lng,category,wheelchair` | GET | Nejbližší POI s filtrací + vzdálenost |
| `/api/footways?bbox` | GET | Chodníky v bboxu (limit 10 000) |
| `/api/barriers?bbox` | GET | Aktivní bariéry v bboxu |
| `/api/barriers` | POST | Nahlásit novou bariéru |
| `/api/route` | POST | Wheelchair routing (ORS) s OSRM fallbackem |
| `/api/import/osm-pois` | POST | Import POI z Overpass API |
| `/api/import/osm-footways` | POST | Import chodníků z Overpass |
| `/api/import/osm-toilets` | POST | Import veřejných WC z Overpass |
| `/api/ratings` | POST | Komunitní hodnocení přístupnosti POI |
| `/api/ratings/:poiId` | GET | Hodnocení konkrétního POI |
| `/api/cities` | GET | Seznam měst s bboxem |
| `/api/export/:city/full` | GET | Offline balíček (všechna data pro město) |
| `/api/export/:city/delta?since` | GET | Delta sync od timestamp |
| `/api/stats` | GET | Celkové statistiky |

## OSM import pipeline

```
Overpass API → POST /api/import/osm-pois → computeScore() → UPSERT ON CONFLICT(osm_id)
```

- **POI:** Všechny nody/way s tagem `wheelchair` + kategorie (toilets, restaurant, cafe, shop...)
- **Chodníky:** highway = footway|pedestrian|path|crossing|residential|living_street|service|cycleway
- **WC:** amenity=toilets, extrahuje fee, opening_hours, access tagy
- **Scoring:** wheelchair tag > smoothness > surface > odhad z typu cesty
- Auto-import při posunu mapy na zoom 15+ (3s cooldown)

## Routing

1. **Primární:** ORS wheelchair profil — respektuje povrch, sklon (max 6%), obrubníky (max 3cm), vyhýbá se schodům
2. **Fallback:** OSRM foot routing (veřejný, bez klíče) — pěší trasa bez wheelchair profilování

## Frontend architektura

```
page.js → MapView (dynamic, ssr:false)
              ├── SearchBar (Nominatim geocoding)
              ├── Sidebar (filtry, města, jazyk, akce, statistiky)
              ├── ReportDialog (hlášení bariér)
              ├── RatingDialog (hodnocení přístupnosti POI)
              └── Leaflet mapa
                   ├── CARTO Voyager tiles
                   ├── FootwayLayer (imperativní L.geoJSON, barvy dle score)
                   ├── POI markery (barvy dle wheelchair, ikony dle kategorie)
                   ├── WC markery (🚻, barva dle přístupnosti)
                   ├── Barrier markery (červené !)
                   └── Route GeoJSON + start/cíl markery
```

**Interakce:**
- Klik na mapu v route mode → nastaví start/cíl
- Double-click na mapu → nastaví uživatelskou pozici
- Pravý klik → nahlásit bariéru
- Double-click na POI marker → ohodnotit přístupnost

## i18n

Trojjazyčné (CS/EN/DE), ~100 klíčů. Funkce `t(key, lang)` + helpery `getCategory()`, `getWheelchairLabel()`, `getScoreLabel()`, `getSurface()`, `getSmoothness()`. Language switcher v sidebaru, preference v localStorage.

## Města

Praha, Brno, Ostrava, Plzeň — každé s centrem, zoomem a bboxem. CityFlyTo komponenta animuje přelet. Backend export/delta sync per město.

## Co je rozpracované / plánované

- **Offline mode** (připraveno v backendu, frontend zatím ne): IndexedDB cache, A* router, service worker, tile caching
- **Ratings majority vote** (backend hotový): Komunitní hodnocení, při dostatku hlasů přepíše wheelchair status POI
- **GPX export** trasy (funguje)
- **URL sharing** pozice/trasy (funguje)

## Jak to spustit lokálně

```bash
git clone https://github.com/martinhavel/wheelca.git
cp .env.example .env  # nastavit ORS_API_KEY
docker compose up -d
# Frontend: http://localhost:3011
# API: http://localhost:3010
```
