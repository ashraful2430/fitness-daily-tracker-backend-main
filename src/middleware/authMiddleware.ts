import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export type AuthRequest = Request & {
  userId?: string;
};

export function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
      userId: string;
      exp: number;
    };

    // Check if the token has expired
    const currentTime = Math.floor(Date.now() / 1000); // current time in seconds
    if (decoded.exp < currentTime) {
      res.clearCookie("token");
      return res
        .status(401)
        .json({ message: "Token expired, please log in again." });
    }

    req.userId = decoded.userId;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
}
