import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import User from "../models/User";
import { AUTH_COOKIE_NAME, clearAuthCookie } from "../utils/authCookie";

export type AuthRequest = Request & {
  userId?: string;
};

export async function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : undefined;
  const token = req.cookies?.[AUTH_COOKIE_NAME] ?? bearerToken;

  if (!token) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
      userId?: string;
      id?: string;
      sub?: string;
      exp?: number;
    };

    const userId = decoded.userId ?? decoded.id ?? decoded.sub;
    if (!userId) {
      throw new Error("Missing user id in token");
    }

    req.userId = userId;
    const user = await User.findById(userId)
      .select("isBlocked blockedReason")
      .lean();
    if (user?.isBlocked) {
      return res.status(403).json({
        success: false,
        message: user.blockedReason || "Your account is blocked by admin.",
      });
    }
    next();
  } catch {
    clearAuthCookie(res);

    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
}
