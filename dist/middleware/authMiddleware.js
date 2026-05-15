"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
async function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader?.startsWith("Bearer ")
        ? authHeader.slice("Bearer ".length)
        : undefined;
    const token = req.cookies?.token ?? bearerToken;
    if (!token) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.userId;
        const user = await User_1.default.findById(decoded.userId)
            .select("isBlocked blockedReason")
            .lean();
        if (user?.isBlocked) {
            return res.status(403).json({
                success: false,
                message: user.blockedReason || "Your account is blocked by admin.",
            });
        }
        next();
    }
    catch {
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
