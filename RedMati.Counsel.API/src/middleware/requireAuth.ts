import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, type JwtPayload } from '../auth';

export interface AuthRequest extends Request {
  user: JwtPayload;
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }
  try {
    (req as AuthRequest).user = verifyAccessToken(header.slice(7));
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
}
