const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010';

export async function fetchPois(bounds) {
  const params = new URLSearchParams({
    minLat: bounds.getSouth(), minLng: bounds.getWest(),
    maxLat: bounds.getNorth(), maxLng: bounds.getEast()
  });
  const res = await fetch(`${API}/api/pois?${params}`);
  return res.json();
}

export async function fetchFootways(bounds) {
  const params = new URLSearchParams({
    minLat: bounds.getSouth(), minLng: bounds.getWest(),
    maxLat: bounds.getNorth(), maxLng: bounds.getEast()
  });
  const res = await fetch(`${API}/api/footways?${params}`);
  return res.json();
}

export async function fetchBarriers(bounds) {
  const params = new URLSearchParams({
    minLat: bounds.getSouth(), minLng: bounds.getWest(),
    maxLat: bounds.getNorth(), maxLng: bounds.getEast()
  });
  const res = await fetch(`${API}/api/barriers?${params}`);
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
    body: JSON.stringify({
      minLat: bounds.getSouth(), minLng: bounds.getWest(),
      maxLat: bounds.getNorth(), maxLng: bounds.getEast()
    })
  });
  return res.json();
}

export async function importOsmFootways(bounds) {
  const res = await fetch(`${API}/api/import/osm-footways`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      minLat: bounds.getSouth(), minLng: bounds.getWest(),
      maxLat: bounds.getNorth(), maxLng: bounds.getEast()
    })
  });
  return res.json();
}
