import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../lib/http.js";
import { verifyAuthToken, type AuthTokenPayload } from "../lib/auth.js";

export type AuthedRequest = Request & {
  user?: AuthTokenPayload;
};

export function requireAuth(req: AuthedRequest, _res: Response, next: NextFunction) {
  const bearer = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  const cookieToken = req.cookies?.chatleadiq_token as string | undefined;
  const token = bearer || cookieToken;

  if (!token) {
    return next(new HttpError(401, "Authentication required"));
  }

  try {
    req.user = verifyAuthToken(token);
    next();
  } catch {
    next(new HttpError(401, "Invalid or expired session"));
  }
}
