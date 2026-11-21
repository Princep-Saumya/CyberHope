function createRateLimit({ windowMs, max }) {
  const requests = new Map();
  let lastCleanupAt = 0;

  return (req, res, next) => {
    const now = Date.now();
    if (now - lastCleanupAt >= windowMs) {
      for (const [key, entry] of requests) {
        if (entry.resetAt <= now) requests.delete(key);
      }
      lastCleanupAt = now;
    }

    const key = req.ip || req.socket.remoteAddress || 'unknown';
    let entry = requests.get(key);
    if (!entry || entry.resetAt <= now) {
      if (!entry && requests.size >= 10000) {
        for (const [storedKey, storedEntry] of requests) {
          if (storedEntry.resetAt <= now) requests.delete(storedKey);
        }
        if (requests.size >= 10000) {
          return res.status(503).json({ error: 'Request limiter is at capacity. Try again shortly.' });
        }
      }
      entry = { count: 0, resetAt: now + windowMs };
      requests.set(key, entry);
    }

    entry.count += 1;
    const remaining = Math.max(0, max - entry.count);
    res.set('RateLimit-Limit', String(max));
    res.set('RateLimit-Remaining', String(remaining));
    res.set('RateLimit-Reset', String(Math.ceil(entry.resetAt / 1000)));

    if (entry.count > max) {
      res.set('Retry-After', String(Math.max(1, Math.ceil((entry.resetAt - now) / 1000))));
      return res.status(429).json({ error: 'Too many requests. Please wait before trying again.' });
    }

    return next();
  };
}

module.exports = { createRateLimit };
