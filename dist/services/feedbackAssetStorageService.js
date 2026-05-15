"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.storeFeedbackAsset = storeFeedbackAsset;
const crypto_1 = __importDefault(require("crypto"));
const path_1 = __importDefault(require("path"));
const fs_1 = require("fs");
const cloudinary_1 = require("cloudinary");
const feedbackEffects_1 = require("../constants/feedbackEffects");
const extensionByMimeType = {
    "audio/mpeg": "mp3",
    "audio/wav": "wav",
    "audio/ogg": "ogg",
    "audio/mp4": "mp4",
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "image/gif": "gif",
};
function isCloudinaryConfigured() {
    return Boolean(process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET);
}
function getPublicBaseUrl(req) {
    const configured = process.env.PUBLIC_BASE_URL || process.env.BACKEND_URL;
    if (configured) {
        return configured.replace(/\/$/, "");
    }
    return `${req.protocol}://${req.get("host")}`;
}
async function uploadToCloudinary(file, type) {
    cloudinary_1.v2.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
        secure: true,
    });
    const resourceType = type === "sound" ? "video" : "image";
    return new Promise((resolve, reject) => {
        const stream = cloudinary_1.v2.uploader.upload_stream({
            folder: `planify-life/feedback-effects/${type}`,
            resource_type: resourceType,
        }, (error, result) => {
            if (error || !result?.secure_url) {
                reject(error || new Error("Upload failed"));
                return;
            }
            resolve(result.secure_url);
        });
        stream.end(file.buffer);
    });
}
async function uploadToLocalStorage(req, file, type) {
    const extension = extensionByMimeType[file.mimetype];
    const filename = `${Date.now()}-${crypto_1.default.randomBytes(12).toString("hex")}.${extension}`;
    const relativeDirectory = path_1.default.join("uploads", "feedback-effects", type);
    const absoluteDirectory = path_1.default.join(process.cwd(), "public", relativeDirectory);
    await fs_1.promises.mkdir(absoluteDirectory, { recursive: true });
    await fs_1.promises.writeFile(path_1.default.join(absoluteDirectory, filename), file.buffer);
    const publicPath = `/${relativeDirectory.replace(/\\/g, "/")}/${filename}`;
    return `${getPublicBaseUrl(req)}${publicPath}`;
}
async function storeFeedbackAsset(req, file) {
    const type = (0, feedbackEffects_1.getFeedbackAssetType)(file.mimetype);
    if (!type) {
        throw new Error("Unsupported file type");
    }
    const url = isCloudinaryConfigured()
        ? await uploadToCloudinary(file, type)
        : await uploadToLocalStorage(req, file, type);
    return {
        url,
        type,
        mimeType: file.mimetype,
        size: file.size,
    };
}
