import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import User from "../models/User";

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
  const token = req.cookies?.token ?? bearerToken;

  if (!token) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
      userId: string;
      exp?: number;
    };

    req.userId = decoded.userId;
    const user = await User.findById(decoded.userId)
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
    const isProduction = process.env.NODE_ENV === "production";

    res.clearCookie("token", {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      path: "/",
    });

    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
}
