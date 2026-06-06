import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export type AuthTokenPayload = {
  sub: number;
  email: string;
  role: "ADMIN" | "SALES";
};

export async function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}

export function signAuthToken(payload: AuthTokenPayload) {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: "7d" });
}

export function verifyAuthToken(token: string) {
  return jwt.verify(token, env.JWT_SECRET) as unknown as AuthTokenPayload;
}
