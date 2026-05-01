"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
function authMiddleware(req, res, next) {
    const token = req.cookies?.token;
    if (!token) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
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
    }
    catch {
        return res.status(401).json({ message: "Invalid token" });
    }
}
