import { Request, Response, NextFunction } from 'express';

const windowMs = 60 * 1000; // 1 minute
const maxRequests = 100;
const memoryStore = new Map<string, { count: number, resetTime: number }>();

export function rateLimiter(req: Request, res: Response, next: NextFunction) {
  // Allow internal webhooks and health to bypass
  if (req.path === '/health' || req.path === '/ready' || req.path.startsWith('/integrations/webhook')) {
    return next();
  }

  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  
  if (!memoryStore.has(ip)) {
    memoryStore.set(ip, { count: 1, resetTime: now + windowMs });
    return next();
  }
  
  const record = memoryStore.get(ip)!;
  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + windowMs;
    return next();
  }
  
  record.count++;
  if (record.count > maxRequests) {
    return res.status(429).json({ error: 'Too Many Requests. Please try again later.' });
  }
  
  next();
}

// Cleanup interval to prevent memory leak
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of memoryStore.entries()) {
    if (now > record.resetTime) {
      memoryStore.delete(ip);
    }
  }
}, windowMs);
