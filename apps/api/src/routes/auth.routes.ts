import { Router } from "express";
import { z } from "zod";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { asyncHandler, HttpError } from "../lib/http.js";
import { prisma } from "../lib/prisma.js";
import { signAuthToken, verifyPassword } from "../lib/auth.js";

export const authRouter = Router();

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const body = z.object({ email: z.string().email(), password: z.string().min(1) }).parse(req.body);
    const user = await prisma.adminUser.findUnique({ where: { email: body.email } });
    if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
      throw new HttpError(401, "Invalid email or password");
    }
    const token = signAuthToken({ sub: user.id, email: user.email, role: user.role });
    res.cookie("chatleadiq_token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  })
);

authRouter.post("/logout", (_req, res) => {
  res.clearCookie("chatleadiq_token");
  res.json({ ok: true });
});

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const user = await prisma.adminUser.findUnique({ where: { id: req.user!.sub }, select: { id: true, name: true, email: true, role: true } });
    res.json({ user });
  })
);
