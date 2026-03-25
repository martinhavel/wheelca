const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010';

async function apiCall(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API error ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

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
  return apiCall(`${API}/api/pois?${bboxParams(bounds)}`);
}

export async function fetchFootways(bounds) {
  return apiCall(`${API}/api/footways?${bboxParams(bounds)}`);
}

export async function fetchBarriers(bounds) {
  return apiCall(`${API}/api/barriers?${bboxParams(bounds)}`);
}

export async function fetchNearestPois(lat, lng, category, wheelchair, limit = 5) {
  const params = new URLSearchParams({ lat, lng, limit });
  if (category) params.set('category', category);
  if (wheelchair) params.set('wheelchair', wheelchair);
  return apiCall(`${API}/api/pois/nearest?${params}`);
}

export async function fetchRoute(start, end) {
  return apiCall(`${API}/api/route`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ start, end })
  });
}

export async function reportBarrier(data) {
  return apiCall(`${API}/api/barriers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
}

export async function fetchStats() {
  return apiCall(`${API}/api/stats`);
}

export async function importOsmPois(bounds) {
  return apiCall(`${API}/api/import/osm-pois`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bboxBody(bounds))
  });
}

export async function importOsmFootways(bounds) {
  return apiCall(`${API}/api/import/osm-footways`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bboxBody(bounds))
  });
}

export async function importOsmToilets(bounds) {
  return apiCall(`${API}/api/import/osm-toilets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bboxBody(bounds))
  });
}

// Ratings
export async function submitRating(data) {
  return apiCall(`${API}/api/ratings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
}

export async function submitRatingsBatch(ratings) {
  return apiCall(`${API}/api/ratings/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ratings })
  });
}

export async function fetchRatings(poiId) {
  return apiCall(`${API}/api/ratings/${poiId}`);
}

// Delta sync
export async function fetchDelta(since, city = 'prague') {
  return apiCall(`${API}/api/export/${city}/delta?since=${encodeURIComponent(since)}`);
}

// Nominatim search
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
