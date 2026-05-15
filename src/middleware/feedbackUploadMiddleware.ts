import { NextFunction, Response } from "express";
import multer from "multer";
import {
  ALLOWED_FEEDBACK_ASSET_MIME_TYPES,
  MAX_FEEDBACK_ASSET_SIZE_BYTES,
} from "../constants/feedbackEffects";
import { AuthRequest } from "./authMiddleware";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FEEDBACK_ASSET_SIZE_BYTES,
    files: 1,
  },
  fileFilter: (_req, file, callback) => {
    if (!ALLOWED_FEEDBACK_ASSET_MIME_TYPES.has(file.mimetype)) {
      callback(new Error("Only approved sound and image files are allowed"));
      return;
    }

    callback(null, true);
  },
}).single("file");

export function feedbackUploadMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  upload(req, res, (error: unknown) => {
    if (error instanceof multer.MulterError) {
      const message =
        error.code === "LIMIT_FILE_SIZE"
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
