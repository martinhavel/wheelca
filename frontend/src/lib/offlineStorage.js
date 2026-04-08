const DB_NAME = 'wheelca-offline';
const DB_VERSION = 2;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('pois')) {
        db.createObjectStore('pois', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('footways')) {
        db.createObjectStore('footways', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('barriers')) {
        db.createObjectStore('barriers', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains('pendingBarriers')) {
        db.createObjectStore('pendingBarriers', { keyPath: 'localId', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('pendingRatings')) {
        db.createObjectStore('pendingRatings', { keyPath: 'localId', autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx(db, store, mode = 'readonly') {
  const t = db.transaction(store, mode);
  return t.objectStore(store);
}

function promisify(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveFeatures(storeName, features) {
  const db = await openDB();
  const t = db.transaction(storeName, 'readwrite');
  const store = t.objectStore(storeName);
  for (const f of features) {
    store.put(f);
  }
  return new Promise((resolve, reject) => {
    t.oncomplete = () => { db.close(); resolve(features.length); };
    t.onerror = () => { db.close(); reject(t.error); };
  });
}

export async function getFeatures(storeName) {
  const db = await openDB();
  const result = await promisify(tx(db, storeName).getAll());
  db.close();
  return result;
}

export async function clearStore(storeName) {
  const db = await openDB();
  await promisify(tx(db, storeName, 'readwrite').clear());
  db.close();
}

export async function setMeta(key, value) {
  const db = await openDB();
  await promisify(tx(db, 'meta', 'readwrite').put({ key, value, updatedAt: new Date().toISOString() }));
  db.close();
}

export async function getMeta(key) {
  const db = await openDB();
  const result = await promisify(tx(db, 'meta').get(key));
  db.close();
  return result?.value;
}

// Pending barriers
export async function savePendingBarrier(data) {
  const db = await openDB();
  const result = await promisify(tx(db, 'pendingBarriers', 'readwrite').add({ ...data, createdAt: new Date().toISOString() }));
  db.close();
  return result;
}

export async function getPendingBarriers() {
  const db = await openDB();
  const result = await promisify(tx(db, 'pendingBarriers').getAll());
  db.close();
  return result;
}

export async function clearPendingBarriers() {
  const db = await openDB();
  await promisify(tx(db, 'pendingBarriers', 'readwrite').clear());
  db.close();
}

// Pending ratings
export async function savePendingRating(data) {
  const db = await openDB();
  const result = await promisify(tx(db, 'pendingRatings', 'readwrite').add({ ...data, created_at: new Date().toISOString() }));
  db.close();
  return result;
}

export async function getPendingRatings() {
  const db = await openDB();
  const result = await promisify(tx(db, 'pendingRatings').getAll());
  db.close();
  return result;
}

export async function clearPendingRatings() {
  const db = await openDB();
  await promisify(tx(db, 'pendingRatings', 'readwrite').clear());
  db.close();
}

// Spatial filter
export function filterByBounds(features, bounds) {
  const south = bounds.getSouth();
  const north = bounds.getNorth();
  const west = bounds.getWest();
  const east = bounds.getEast();
  return features.filter(f => {
    const geom = f.geometry;
    if (!geom) return false;
    if (geom.type === 'Point') {
      const [lng, lat] = geom.coordinates;
      return lat >= south && lat <= north && lng >= west && lng <= east;
    }
    if (geom.type === 'LineString') {
      return geom.coordinates.some(([lng, lat]) =>
        lat >= south && lat <= north && lng >= west && lng <= east
      );
    }
    return false;
  });
}

export async function getOfflineStatus() {
  try {
    const poisCount = (await getFeatures('pois')).length;
    const footwaysCount = (await getFeatures('footways')).length;
    const barriersCount = (await getFeatures('barriers')).length;
    const lastSync = await getMeta('lastSync');
    const pendingRatings = (await getPendingRatings()).length;
    const pendingBarriers = (await getPendingBarriers()).length;
    return { poisCount, footwaysCount, barriersCount, lastSync, hasData: poisCount > 0, pendingRatings, pendingBarriers };
  } catch {
    return { poisCount: 0, footwaysCount: 0, barriersCount: 0, lastSync: null, hasData: false, pendingRatings: 0, pendingBarriers: 0 };
  }
}

export function generateTileUrls(minLat, minLng, maxLat, maxLng, zooms) {
  const urls = [];
  for (const z of zooms) {
    const n = Math.pow(2, z);
    const xMin = Math.floor((minLng + 180) / 360 * n);
    const xMax = Math.floor((maxLng + 180) / 360 * n);
    const yMin = Math.floor((1 - Math.log(Math.tan(maxLat * Math.PI / 180) + 1 / Math.cos(maxLat * Math.PI / 180)) / Math.PI) / 2 * n);
    const yMax = Math.floor((1 - Math.log(Math.tan(minLat * Math.PI / 180) + 1 / Math.cos(minLat * Math.PI / 180)) / Math.PI) / 2 * n);
    for (let x = xMin; x <= xMax; x++) {
      for (let y = yMin; y <= yMax; y++) {
        const s = ['a', 'b', 'c'][Math.abs(x + y) % 3];
        urls.push(`https://${s}.tile.openstreetmap.org/${z}/${x}/${y}.png`);
      }
    }
  }
  return urls;
}
