import { Request } from 'express';

export interface JwtUser {
  userId: string;
  email: string;
  isAdmin: boolean;
}

export interface AuthenticatedRequest extends Request {
  user: JwtUser;
}
