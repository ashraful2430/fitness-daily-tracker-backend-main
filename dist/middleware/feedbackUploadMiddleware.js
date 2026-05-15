"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.feedbackUploadMiddleware = feedbackUploadMiddleware;
const multer_1 = __importDefault(require("multer"));
const feedbackEffects_1 = require("../constants/feedbackEffects");
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: feedbackEffects_1.MAX_FEEDBACK_ASSET_SIZE_BYTES,
        files: 1,
    },
    fileFilter: (_req, file, callback) => {
        if (!feedbackEffects_1.ALLOWED_FEEDBACK_ASSET_MIME_TYPES.has(file.mimetype)) {
            callback(new Error("Only approved sound and image files are allowed"));
            return;
        }
        callback(null, true);
    },
}).single("file");
function feedbackUploadMiddleware(req, res, next) {
    upload(req, res, (error) => {
        if (error instanceof multer_1.default.MulterError) {
            const message = error.code === "LIMIT_FILE_SIZE"
                ? "File must be 2 MB or smaller"
                : "Invalid upload";
            return res.status(400).json({ success: false, message });
        }
        if (error instanceof Error) {
            return res.status(400).json({
                success: false,
                message: error.message,
            });
        }
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Upload a file using the file field",
            });
        }
        next();
    });
}
