import { Request, Response, NextFunction } from 'express';

// Extend Request interface to include user and org
declare global {
  namespace Express {
    interface Request {
      user?: any;
      org?: any;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  // Allow health checks to bypass auth
  if (req.path === '/health' || req.path === '/ready') {
    return next();
  }
  
  // Allow webhooks to bypass this auth (they have their own signature verification)
  if (req.path.startsWith('/integrations/webhook')) {
    return next();
  }

  const authHeader = req.headers.authorization;
  const apiKey = req.headers['x-api-key'];
  
  const expectedApiKey = process.env.API_KEY || 'default-dev-key';
  
  // Accept standard API Key
  if (apiKey === expectedApiKey) {
    req.user = { id: 'admin', role: 'admin' };
    return next();
  }
  
  // Accept Bearer Token
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    if (token === expectedApiKey) {
      req.user = { id: 'admin', role: 'admin' };
      return next();
    }
  }

  // F-010: Return 401 if unauthorized
  return res.status(401).json({ error: 'Unauthorized: Missing or invalid authentication token' });
}

export function requireOrgAccess(req: Request, res: Response, next: NextFunction) {
  // In a real multi-tenant app, verify req.user has access to the org in req.params
  req.org = { id: 'default-org' };
  next();
}
