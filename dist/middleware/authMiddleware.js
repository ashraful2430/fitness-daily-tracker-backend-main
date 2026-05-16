"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
const authCookie_1 = require("../utils/authCookie");
async function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader?.startsWith("Bearer ")
        ? authHeader.slice("Bearer ".length)
        : undefined;
    const token = req.cookies?.[authCookie_1.AUTH_COOKIE_NAME] ?? bearerToken;
    if (!token) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const userId = decoded.userId ?? decoded.id ?? decoded.sub;
        if (!userId) {
            throw new Error("Missing user id in token");
        }
        req.userId = userId;
        const user = await User_1.default.findById(userId)
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
        (0, authCookie_1.clearAuthCookie)(res);
        return res.status(401).json({ success: false, message: "Unauthorized" });
    }
}
