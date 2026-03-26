const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010';

function bboxParams(bounds) {
  return new URLSearchParams({
    minLat: bounds.getSouth(), minLng: bounds.getWest(),
    maxLat: bounds.getNorth(), maxLng: bounds.getEast()
  });
}

function bboxBody(bounds) {
  return {
    minLat: bounds.getSouth(), minLng: bounds.getWest(),
    maxLat: bounds.getNorth(), maxLng: bounds.getEast()
  };
}

export async function fetchPois(bounds) {
  const res = await fetch(`${API}/api/pois?${bboxParams(bounds)}`);
  return res.json();
}

export async function fetchFootways(bounds) {
  const res = await fetch(`${API}/api/footways?${bboxParams(bounds)}`);
  return res.json();
}

export async function fetchBarriers(bounds) {
  const res = await fetch(`${API}/api/barriers?${bboxParams(bounds)}`);
  return res.json();
}

export async function fetchNearestPois(lat, lng, category, wheelchair, limit = 5) {
  const params = new URLSearchParams({ lat, lng, limit });
  if (category) params.set('category', category);
  if (wheelchair) params.set('wheelchair', wheelchair);
  const res = await fetch(`${API}/api/pois/nearest?${params}`);
  return res.json();
}

export async function fetchRoute(start, end) {
  const res = await fetch(`${API}/api/route`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ start, end })
  });
  return res.json();
}

export async function reportBarrier(data) {
  const res = await fetch(`${API}/api/barriers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
}

export async function fetchStats() {
  const res = await fetch(`${API}/api/stats`);
  return res.json();
}

export async function importOsmPois(bounds) {
  const res = await fetch(`${API}/api/import/osm-pois`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bboxBody(bounds))
  });
  return res.json();
}

export async function importOsmFootways(bounds) {
  const res = await fetch(`${API}/api/import/osm-footways`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bboxBody(bounds))
  });
  return res.json();
}

export async function importOsmToilets(bounds) {
  const res = await fetch(`${API}/api/import/osm-toilets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bboxBody(bounds))
  });
  return res.json();
}

export async function submitRating(data) {
  const res = await fetch(`${API}/api/ratings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
}

export async function submitRatingsBatch(ratings) {
  const res = await fetch(`${API}/api/ratings/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ratings })
  });
  return res.json();
}

export async function fetchDelta(since, city = 'prague') {
  const res = await fetch(`${API}/api/export/${city}/delta?since=${encodeURIComponent(since)}`);
  return res.json();
}

export async function searchNominatim(query) {
  const params = new URLSearchParams({
    q: query, format: 'json', countrycodes: 'cz', limit: '6',
    addressdetails: '1', accept_language: 'cs'
  });
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    headers: { 'User-Agent': 'Wheelca/1.0' }
  });
  return res.json();
}
