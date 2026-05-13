import { Response, NextFunction } from "express";
import User from "../models/User";
import { AuthRequest } from "./authMiddleware";

export async function adminMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  if (!req.userId) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  const user = await User.findById(req.userId).select("role").lean();
  if (!user || user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Forbidden: admin access only",
    });
  }

  next();
}
