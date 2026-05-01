import { Request, Response } from "express";
import { ScoreSection } from "../models/ScoreSection";

const MAX_SECTIONS = 10;

function todayStart() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

// GET /api/score-sections
export const getSections = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const today = todayStart();

    const sections = await ScoreSection.find({ userId, date: today })
      .sort({ order: 1 })
      .lean();

    res.json({ success: true, data: sections });
  } catch (e: unknown) {
    res.status(500).json({ success: false, message: (e as Error).message });
  }
};

// POST /api/score-sections
export const createSection = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const today = todayStart();

    const count = await ScoreSection.countDocuments({ userId, date: today });
    if (count >= MAX_SECTIONS) {
      return res.status(400).json({
        success: false,
        message: `Maximum ${MAX_SECTIONS} sections allowed per day`,
      });
    }

    const { name, emoji, goalType, goalValue } = req.body as {
      name: string;
      emoji: string;
      goalType: "count" | "duration" | "boolean";
      goalValue: number;
    };

    const section = await ScoreSection.create({
      userId,
      name,
      emoji,
      goalType,
      goalValue: goalType === "boolean" ? 1 : goalValue,
      currentValue: 0,
      date: today,
      order: count,
    });

    res.status(201).json({ success: true, data: section });
  } catch (e: unknown) {
    res.status(500).json({ success: false, message: (e as Error).message });
  }
};

// PATCH /api/score-sections/:id
export const updateSection = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;

    const updates = req.body as Partial<{
      name: string;
      emoji: string;
      goalValue: number;
      currentValue: number;
    }>;

    const section = await ScoreSection.findOneAndUpdate(
      { _id: id, userId },
      { $set: updates },
      { new: true },
    );

    if (!section) {
      return res
        .status(404)
        .json({ success: false, message: "Section not found" });
    }

    res.json({ success: true, data: section });
  } catch (e: unknown) {
    res.status(500).json({ success: false, message: (e as Error).message });
  }
};

// DELETE /api/score-sections/:id
export const deleteSection = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;

    const section = await ScoreSection.findOneAndDelete({ _id: id, userId });

    if (!section) {
      return res
        .status(404)
        .json({ success: false, message: "Section not found" });
    }

    res.json({ success: true, message: "Section deleted" });
  } catch (e: unknown) {
    res.status(500).json({ success: false, message: (e as Error).message });
  }
};

// PATCH /api/score-sections/:id/progress
export const updateProgress = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const { value } = req.body as { value: number };

    const section = await ScoreSection.findOneAndUpdate(
      { _id: id, userId },
      { $set: { currentValue: Math.max(0, value) } },
      { new: true },
    );

    if (!section) {
      return res
        .status(404)
        .json({ success: false, message: "Section not found" });
    }

    res.json({ success: true, data: section });
  } catch (e: unknown) {
    res.status(500).json({ success: false, message: (e as Error).message });
  }
};
