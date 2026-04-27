import jwt from 'jsonwebtoken';

export const JWT_SECRET = 'dev-secret-not-for-production';

export interface JwtPayload {
  userId: number;
  tenantId: number;
  email: string;
  role: string;
}

export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}
