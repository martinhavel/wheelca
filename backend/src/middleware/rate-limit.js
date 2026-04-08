const limits = new Map();

function getKey(ip, endpoint) { return `${ip}:${endpoint}`; }

function cleanup() {
  const now = Date.now();
  for (const [key, val] of limits) {
    if (now > val.resetAt) limits.delete(key);
  }
}

// Run cleanup every 5 minutes
setInterval(cleanup, 5 * 60 * 1000);

export function rateLimit(endpoint, maxRequests, windowMs) {
  return async (request, reply) => {
    const ip = request.headers['cf-connecting-ip'] || request.headers['x-forwarded-for'] || request.ip;
    const key = getKey(ip, endpoint);
    const now = Date.now();
    
    let entry = limits.get(key);
    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
      limits.set(key, entry);
    }
    
    entry.count++;
    if (entry.count > maxRequests) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      reply.header('Retry-After', retryAfter);
      return reply.code(429).send({ error: 'Příliš mnoho požadavků', retryAfter });
    }
  };
}
