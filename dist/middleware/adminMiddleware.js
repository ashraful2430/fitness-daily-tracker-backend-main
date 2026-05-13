"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminMiddleware = adminMiddleware;
const User_1 = __importDefault(require("../models/User"));
async function adminMiddleware(req, res, next) {
    if (!req.userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const user = await User_1.default.findById(req.userId).select("role").lean();
    if (!user || user.role !== "admin") {
        return res.status(403).json({
            success: false,
            message: "Forbidden: admin access only",
        });
    }
    next();
}
