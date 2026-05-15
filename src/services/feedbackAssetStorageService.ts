import crypto from "crypto";
import path from "path";
import { promises as fs } from "fs";
import { v2 as cloudinary, UploadApiResponse } from "cloudinary";
import { Request } from "express";
import {
  FeedbackAssetType,
  getFeedbackAssetType,
} from "../constants/feedbackEffects";

type StoredFeedbackAsset = {
  url: string;
  type: FeedbackAssetType;
  mimeType: string;
  size: number;
};

const extensionByMimeType: Record<string, string> = {
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
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET,
  );
}

function getPublicBaseUrl(req: Request) {
  const configured = process.env.PUBLIC_BASE_URL || process.env.BACKEND_URL;
  if (configured) {
    return configured.replace(/\/$/, "");
  }

  return `${req.protocol}://${req.get("host")}`;
}

async function uploadToCloudinary(
  file: Express.Multer.File,
  type: FeedbackAssetType,
): Promise<string> {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });

  const resourceType = type === "sound" ? "video" : "image";

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `planify-life/feedback-effects/${type}`,
        resource_type: resourceType,
      },
      (error, result?: UploadApiResponse) => {
        if (error || !result?.secure_url) {
          reject(error || new Error("Upload failed"));
          return;
        }

        resolve(result.secure_url);
      },
    );

    stream.end(file.buffer);
  });
}

async function uploadToLocalStorage(
  req: Request,
  file: Express.Multer.File,
  type: FeedbackAssetType,
) {
  const extension = extensionByMimeType[file.mimetype];
  const filename = `${Date.now()}-${crypto.randomBytes(12).toString("hex")}.${extension}`;
  const relativeDirectory = path.join("uploads", "feedback-effects", type);
  const absoluteDirectory = path.join(
    process.cwd(),
    "public",
    relativeDirectory,
  );

  await fs.mkdir(absoluteDirectory, { recursive: true });
  await fs.writeFile(path.join(absoluteDirectory, filename), file.buffer);

  const publicPath = `/${relativeDirectory.replace(/\\/g, "/")}/${filename}`;
  return `${getPublicBaseUrl(req)}${publicPath}`;
}

export async function storeFeedbackAsset(
  req: Request,
  file: Express.Multer.File,
): Promise<StoredFeedbackAsset> {
  const type = getFeedbackAssetType(file.mimetype);
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
