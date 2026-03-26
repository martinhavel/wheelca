/**
 * Offline wheelchair routing engine
 * Builds a graph from footway LineStrings stored in IndexedDB
 * Uses A* with custom wheelchair accessibility profiles
 */

const PRECISION = 6;

function coordKey(lng, lat) {
  return lng.toFixed(PRECISION) + ',' + lat.toFixed(PRECISION);
}

function parseKey(key) {
  const [lng, lat] = key.split(',').map(Number);
  return { lng, lat };
}

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function lineLength(coords) {
  let len = 0;
  for (let i = 1; i < coords.length; i++) {
    len += haversine(coords[i - 1][1], coords[i - 1][0], coords[i][1], coords[i][0]);
  }
  return len;
}

// Accessibility cost multipliers per profile
const PROFILES = {
  accessible: {
    name: 'Nejpřístupnější',
    weights: { 0: 1.8, 1: 1.0, 2: 4.0, 3: 50.0 },
    wheelchairNo: 500,
    speed: 55, // m/min average wheelchair speed
  },
  shortest: {
    name: 'Nejkratší',
    weights: { 0: 1.1, 1: 1.0, 2: 1.2, 3: 1.8 },
    wheelchairNo: 3.0,
    speed: 67,
  },
};

// Simple binary min-heap for A* priority queue
class MinHeap {
  constructor() { this.data = []; }

  push(item) {
    this.data.push(item);
    this._bubbleUp(this.data.length - 1);
  }

  pop() {
    const top = this.data[0];
    const last = this.data.pop();
    if (this.data.length > 0) {
      this.data[0] = last;
      this._sinkDown(0);
    }
    return top;
  }

  get size() { return this.data.length; }

  _bubbleUp(i) {
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.data[i].f >= this.data[parent].f) break;
      [this.data[i], this.data[parent]] = [this.data[parent], this.data[i]];
      i = parent;
    }
  }

  _sinkDown(i) {
    const n = this.data.length;
    while (true) {
      let smallest = i;
      const left = 2 * i + 1;
      const right = 2 * i + 2;
      if (left < n && this.data[left].f < this.data[smallest].f) smallest = left;
      if (right < n && this.data[right].f < this.data[smallest].f) smallest = right;
      if (smallest === i) break;
      [this.data[i], this.data[smallest]] = [this.data[smallest], this.data[i]];
      i = smallest;
    }
  }
}

/**
 * Build routing graph from footway features
 * Nodes = endpoints of each footway LineString
 * Edges = footway segments with distance and accessibility cost
 */
export function buildGraph(footways) {
  const adjacency = new Map();
  let edgeCount = 0;

  for (const f of footways) {
    const coords = f.geometry?.coordinates;
    if (!coords || coords.length < 2) continue;

    const startKey = coordKey(coords[0][0], coords[0][1]);
    const endKey = coordKey(coords[coords.length - 1][0], coords[coords.length - 1][1]);

    if (startKey === endKey) continue;

    const dist = lineLength(coords);
    if (dist < 0.5) continue; // skip very short segments

    const score = f.properties?.accessibility_score ?? 0;
    const wheelchair = f.properties?.wheelchair;
    const surface = f.properties?.surface;

    const edge = { distance: dist, score, wheelchair, surface, geometry: coords };

    if (!adjacency.has(startKey)) adjacency.set(startKey, { edges: [], lng: coords[0][0], lat: coords[0][1] });
    if (!adjacency.has(endKey)) adjacency.set(endKey, { edges: [], lng: coords[coords.length - 1][0], lat: coords[coords.length - 1][1] });

    adjacency.get(startKey).edges.push({ to: endKey, ...edge });
    adjacency.get(endKey).edges.push({ to: startKey, ...edge });
    edgeCount++;
  }

  console.log('[OfflineRouter] Graph built:', adjacency.size, 'nodes,', edgeCount, 'edges');
  return adjacency;
}

/**
 * Find nearest graph node to a given coordinate
 * Uses simple brute-force (fast enough for ~100K nodes)
 */
export function findNearestNode(graph, lng, lat, maxDistM = 500) {
  let minDist = Infinity;
  let nearest = null;

  for (const [key, node] of graph) {
    const d = haversine(lat, lng, node.lat, node.lng);
    if (d < minDist) {
      minDist = d;
      nearest = key;
    }
  }

  if (minDist > maxDistM) return null;
  return { key: nearest, distance: minDist };
}

/**
 * A* pathfinding with wheelchair accessibility profile
 */
function aStar(graph, startKey, endKey, profileName) {
  const profile = PROFILES[profileName] || PROFILES.accessible;
  const endNode = graph.get(endKey);
  if (!endNode) return null;

  const endLat = endNode.lat;
  const endLng = endNode.lng;

  function heuristic(nodeKey) {
    const node = graph.get(nodeKey);
    if (!node) return 0;
    return haversine(node.lat, node.lng, endLat, endLng);
  }

  const gScore = new Map();
  const cameFrom = new Map();
  const closed = new Set();
  const heap = new MinHeap();

  gScore.set(startKey, 0);
  heap.push({ key: startKey, f: heuristic(startKey), g: 0 });

  let iterations = 0;
  const MAX_ITERATIONS = 500000;

  while (heap.size > 0 && iterations < MAX_ITERATIONS) {
    iterations++;
    const current = heap.pop();

    if (current.key === endKey) {
      return reconstructPath(graph, cameFrom, startKey, endKey, gScore.get(endKey), profile);
    }

    if (closed.has(current.key)) continue;
    closed.add(current.key);

    const node = graph.get(current.key);
    if (!node) continue;

    const currentG = gScore.get(current.key);

    for (const edge of node.edges) {
      if (closed.has(edge.to)) continue;

      let penalty = profile.weights[edge.score] ?? 1.5;
      if (edge.wheelchair === 'no') penalty = profile.wheelchairNo;

      const tentativeG = currentG + edge.distance * penalty;
      const prevG = gScore.get(edge.to) ?? Infinity;

      if (tentativeG < prevG) {
        gScore.set(edge.to, tentativeG);
        cameFrom.set(edge.to, { from: current.key, edge });
        heap.push({ key: edge.to, f: tentativeG + heuristic(edge.to), g: tentativeG });
      }
    }
  }

  console.log('[OfflineRouter] No route found after', iterations, 'iterations');
  return null;
}

function reconstructPath(graph, cameFrom, startKey, endKey, totalCost, profile) {
  const edges = [];
  let current = endKey;

  while (cameFrom.has(current)) {
    const { from, edge } = cameFrom.get(current);
    edges.unshift({ ...edge, fromKey: from, toKey: current });
    current = from;
  }

  // Build coordinate array, respecting edge direction
  const coordinates = [];
  let totalDistance = 0;
  const scoreSegments = { 0: 0, 1: 0, 2: 0, 3: 0 };

  for (const edge of edges) {
    let coords = edge.geometry;

    // Check if we need to reverse the edge geometry
    if (coordinates.length > 0) {
      const lastCoord = coordinates[coordinates.length - 1];
      const edgeStart = coords[0];
      const edgeEnd = coords[coords.length - 1];

      const distToStart = Math.abs(lastCoord[0] - edgeStart[0]) + Math.abs(lastCoord[1] - edgeStart[1]);
      const distToEnd = Math.abs(lastCoord[0] - edgeEnd[0]) + Math.abs(lastCoord[1] - edgeEnd[1]);

      if (distToEnd < distToStart) {
        coords = [...coords].reverse();
      }
    }

    const startIdx = coordinates.length > 0 ? 1 : 0;
    for (let i = startIdx; i < coords.length; i++) {
      coordinates.push(coords[i]);
    }

    totalDistance += edge.distance;
    scoreSegments[edge.score] = (scoreSegments[edge.score] || 0) + edge.distance;
  }

  const duration = totalDistance / profile.speed * 60; // seconds

  return {
    coordinates,
    distance: totalDistance,
    duration,
    cost: totalCost,
    edgeCount: edges.length,
    scoreSegments,
    profile: profile.name,
  };
}

/**
 * Main routing function - returns GeoJSON FeatureCollection
 * compatible with the existing MapView route display
 */
export function findRoute(graph, startLng, startLat, endLng, endLat, profileName = 'accessible') {
  if (!graph || graph.size === 0) {
    return { error: 'Graf není k dispozici. Stáhni offline data.' };
  }

  const startNode = findNearestNode(graph, startLng, startLat);
  if (!startNode) {
    return { error: 'Start je příliš daleko od známých cest (max 500m).' };
  }

  const endNode = findNearestNode(graph, endLng, endLat);
  if (!endNode) {
    return { error: 'Cíl je příliš daleko od známých cest (max 500m).' };
  }

  console.log('[OfflineRouter] Routing from', startNode.key, '(', Math.round(startNode.distance), 'm) to', endNode.key, '(', Math.round(endNode.distance), 'm), profile:', profileName);

  const t0 = performance.now();
  const result = aStar(graph, startNode.key, endNode.key, profileName);
  const elapsed = Math.round(performance.now() - t0);

  if (!result) {
    return { error: 'Trasa nenalezena. Možná neexistuje spojení mezi body.' };
  }

  console.log('[OfflineRouter] Route found in', elapsed, 'ms:', Math.round(result.distance), 'm,', result.edgeCount, 'segments');

  // Build accessibility summary
  const totalDist = result.distance;
  const goodPct = Math.round((result.scoreSegments[1] || 0) / totalDist * 100);
  const limitedPct = Math.round((result.scoreSegments[2] || 0) / totalDist * 100);
  const badPct = Math.round((result.scoreSegments[3] || 0) / totalDist * 100);
  const unknownPct = 100 - goodPct - limitedPct - badPct;

  // Return in the same format as the server API
  return {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: result.coordinates
      },
      properties: {
        summary: {
          distance: result.distance,
          duration: result.duration,
        },
        segments: [{
          distance: result.distance,
          duration: result.duration,
          steps: []
        }],
        engine: 'offline-' + profileName,
        profile: result.profile,
        accessibility: {
          good: goodPct,
          limited: limitedPct,
          bad: badPct,
          unknown: unknownPct,
        },
        routingTimeMs: elapsed,
      }
    }]
  };
}

export { PROFILES };
