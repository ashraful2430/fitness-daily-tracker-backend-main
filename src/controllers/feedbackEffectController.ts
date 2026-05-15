import { Response } from "express";
import mongoose from "mongoose";
import {
  ALLOWED_FEEDBACK_EFFECT_CATEGORIES,
  ALLOWED_FEEDBACK_EFFECT_KEYS,
} from "../constants/feedbackEffects";
import FeedbackEffect, { IFeedbackEffect } from "../models/FeedbackEffect";
import { AuthRequest } from "../middleware/authMiddleware";
import { storeFeedbackAsset } from "../services/feedbackAssetStorageService";

type FeedbackEffectPayload = {
  key?: unknown;
  label?: unknown;
  category?: unknown;
  description?: unknown;
  soundUrl?: unknown;
  memeImageUrl?: unknown;
  enabled?: unknown;
};

function serializeFeedbackEffect(effect: IFeedbackEffect) {
  return {
    id: String(effect._id),
    key: effect.key,
    label: effect.label,
    category: effect.category,
    description: effect.description ?? null,
    soundUrl: effect.soundUrl ?? null,
    memeImageUrl: effect.memeImageUrl ?? null,
    enabled: effect.enabled,
    createdAt: effect.createdAt,
    updatedAt: effect.updatedAt,
  };
}

function serializePublicFeedbackEffect(effect: IFeedbackEffect) {
  return {
    key: effect.key,
    label: effect.label,
    category: effect.category,
    description: effect.description ?? null,
    soundUrl: effect.soundUrl ?? null,
    memeImageUrl: effect.memeImageUrl ?? null,
    enabled: effect.enabled,
  };
}

function normalizeOptionalString(value: unknown) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed || null;
}

function validateFeedbackKey(key: unknown) {
  if (typeof key !== "string" || !key.trim()) {
    return "key is required";
  }

  if (!ALLOWED_FEEDBACK_EFFECT_KEYS.has(key.trim())) {
    return "Unsupported feedback effect key";
  }

  return null;
}

function validateCategory(category: unknown) {
  if (typeof category !== "string" || !category.trim()) {
    return "category is required";
  }

  if (!ALLOWED_FEEDBACK_EFFECT_CATEGORIES.has(category.trim())) {
    return "Unsupported feedback effect category";
  }

  return null;
}

function buildRequiredPayload(body: FeedbackEffectPayload) {
  const keyError = validateFeedbackKey(body.key);
  if (keyError) return { error: keyError };

  const categoryError = validateCategory(body.category);
  if (categoryError) return { error: categoryError };

  if (typeof body.label !== "string" || !body.label.trim()) {
    return { error: "label is required" };
  }

  if (
    body.enabled !== undefined &&
    typeof body.enabled !== "boolean"
  ) {
    return { error: "enabled must be boolean" };
  }

  const key = body.key as string;
  const label = body.label as string;
  const category = body.category as string;

  return {
    payload: {
      key: key.trim(),
      label: label.trim(),
      category: category.trim(),
      description: normalizeOptionalString(body.description),
      soundUrl: normalizeOptionalString(body.soundUrl),
      memeImageUrl: normalizeOptionalString(body.memeImageUrl),
      ...(typeof body.enabled === "boolean" ? { enabled: body.enabled } : {}),
    },
  };
}

function buildPatchPayload(body: FeedbackEffectPayload) {
  const payload: Record<string, unknown> = {};

  if (body.key !== undefined) {
    const keyError = validateFeedbackKey(body.key);
    if (keyError) return { error: keyError };
    payload.key = (body.key as string).trim();
  }

  if (body.category !== undefined) {
    const categoryError = validateCategory(body.category);
    if (categoryError) return { error: categoryError };
    payload.category = (body.category as string).trim();
  }

  if (body.label !== undefined) {
    if (typeof body.label !== "string" || !body.label.trim()) {
      return { error: "label cannot be empty" };
    }
    payload.label = body.label.trim();
  }

  for (const field of ["description", "soundUrl", "memeImageUrl"] as const) {
    const normalized = normalizeOptionalString(body[field]);
    if (normalized !== undefined) {
      payload[field] = normalized;
    } else if (body[field] !== undefined) {
      return { error: `${field} must be a string or null` };
    }
  }

  if (body.enabled !== undefined) {
    if (typeof body.enabled !== "boolean") {
      return { error: "enabled must be boolean" };
    }
    payload.enabled = body.enabled;
  }

  return { payload };
}

function getStringParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export async function getAdminFeedbackEffects(_req: AuthRequest, res: Response) {
  try {
    const effects = await FeedbackEffect.find()
      .sort({ category: 1, key: 1 })
      .lean<IFeedbackEffect[]>();

    return res.status(200).json({
      success: true,
      data: effects.map(serializeFeedbackEffect),
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to load feedback effects",
    });
  }
}

export async function upsertAdminFeedbackEffect(
  req: AuthRequest,
  res: Response,
) {
  try {
    const result = buildRequiredPayload(req.body as FeedbackEffectPayload);
    if ("error" in result) {
      return res.status(400).json({ success: false, message: result.error });
    }

    const effect = await FeedbackEffect.findOneAndUpdate(
      { key: result.payload.key },
      {
        $set: {
          ...result.payload,
          updatedBy: req.userId,
        },
        $setOnInsert: {
          createdBy: req.userId,
        },
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      },
    );

    return res.status(200).json({
      success: true,
      data: effect ? serializeFeedbackEffect(effect) : null,
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to save feedback effect",
    });
  }
}

export async function patchAdminFeedbackEffect(
  req: AuthRequest,
  res: Response,
) {
  try {
    const id = getStringParam(req.params.id);
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid feedback effect id",
      });
    }

    const result = buildPatchPayload(req.body as FeedbackEffectPayload);
    if ("error" in result) {
      return res.status(400).json({ success: false, message: result.error });
    }

    const effect = await FeedbackEffect.findByIdAndUpdate(
      id,
      {
        $set: {
          ...result.payload,
          updatedBy: req.userId,
        },
      },
      { new: true, runValidators: true },
    );

    if (!effect) {
      return res.status(404).json({
        success: false,
        message: "Feedback effect not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: serializeFeedbackEffect(effect),
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to update feedback effect",
    });
  }
}

export async function deleteAdminFeedbackEffect(
  req: AuthRequest,
  res: Response,
) {
  try {
    const id = getStringParam(req.params.id);
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid feedback effect id",
      });
    }

    const effect = await FeedbackEffect.findByIdAndDelete(id);
    if (!effect) {
      return res.status(404).json({
        success: false,
        message: "Feedback effect not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: { id },
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to delete feedback effect",
    });
  }
}

export async function uploadAdminFeedbackAsset(
  req: AuthRequest,
  res: Response,
) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Upload a file using the file field",
      });
    }

    const uploaded = await storeFeedbackAsset(req, req.file);
    return res.status(201).json(uploaded);
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to upload feedback asset",
    });
  }
}

export async function getFeedbackEffects(_req: AuthRequest, res: Response) {
  try {
    const effects = await FeedbackEffect.find({ enabled: true })
      .sort({ category: 1, key: 1 })
      .lean<IFeedbackEffect[]>();

    return res.status(200).json({
      success: true,
      data: effects.map(serializePublicFeedbackEffect),
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to load feedback effects",
    });
  }
}
