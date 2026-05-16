import { Response } from "express";
import mongoose from "mongoose";
import { AuthRequest } from "../middleware/authMiddleware";
import LearningAlarmSound, {
  ILearningAlarmSound,
} from "../models/LearningAlarmSound";

function serializeAlarmSound(sound: ILearningAlarmSound) {
  return {
    id: String(sound._id),
    name: sound.name,
    url: sound.url,
    createdAt: sound.createdAt,
    updatedAt: sound.updatedAt,
  };
}

function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function getLearningAlarmSounds(req: AuthRequest, res: Response) {
  try {
    const sounds = await LearningAlarmSound.find({ userId: req.userId }).sort({
      createdAt: -1,
    });

    return res.json({
      success: true,
      data: sounds.map(serializeAlarmSound),
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to load alarm sounds",
    });
  }
}

export async function postLearningAlarmSound(req: AuthRequest, res: Response) {
  try {
    const name = getString(req.body?.name ?? req.body?.label);
    const url = getString(req.body?.url ?? req.body?.soundUrl);

    if (!name || !url) {
      return res.status(400).json({
        success: false,
        message: "name and url are required",
      });
    }

    const sound = await LearningAlarmSound.create({
      userId: req.userId,
      name,
      url,
    });

    return res.status(201).json({
      success: true,
      data: serializeAlarmSound(sound),
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to save alarm sound",
    });
  }
}

export async function deleteLearningAlarmSound(req: AuthRequest, res: Response) {
  try {
    const id = getString(req.query.id ?? req.body?.id ?? req.body?.soundId);
    const url = getString(req.query.url ?? req.body?.url ?? req.body?.soundUrl);

    if (!id && !url) {
      return res.status(400).json({
        success: false,
        message: "Provide id or url to delete an alarm sound",
      });
    }

    const query = id
      ? {
          _id: id,
          userId: req.userId,
        }
      : {
          url,
          userId: req.userId,
        };

    if (id && !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid alarm sound id",
      });
    }

    const sound = await LearningAlarmSound.findOneAndDelete(query);

    if (!sound) {
      return res.status(404).json({
        success: false,
        message: "Alarm sound not found",
      });
    }

    return res.json({
      success: true,
      data: { id: String(sound._id) },
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to delete alarm sound",
    });
  }
}
