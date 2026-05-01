import { Response } from "express";
import Workout from "../models/Workout";
import { AuthRequest } from "../middleware/authMiddleware";

export async function getWorkouts(req: AuthRequest, res: Response) {
  try {
    const workouts = await Workout.find({ userId: req.userId }).sort({
      createdAt: -1,
    });

    return res.json({ workouts });
  } catch {
    return res.status(500).json({ message: "Failed to fetch workouts" });
  }
}

export async function createWorkout(req: AuthRequest, res: Response) {
  try {
    const { title, duration, type, calories } = req.body;

    if (!title || !duration) {
      return res.status(400).json({
        message: "Title and duration are required",
      });
    }

    const workout = await Workout.create({
      userId: req.userId,
      title,
      duration,
      type,
      calories,
    });

    return res.status(201).json({
      message: "Workout added successfully",
      workout,
    });
  } catch {
    return res.status(500).json({ message: "Failed to create workout" });
  }
}

export async function updateWorkout(req: AuthRequest, res: Response) {
  try {
    const workout = await Workout.findOneAndUpdate(
      {
        _id: req.params.id,
        userId: req.userId,
      },
      req.body,
      { new: true },
    );

    if (!workout) {
      return res.status(404).json({ message: "Workout not found" });
    }

    return res.json({
      message: "Workout updated successfully",
      workout,
    });
  } catch {
    return res.status(500).json({ message: "Failed to update workout" });
  }
}

export async function deleteWorkout(req: AuthRequest, res: Response) {
  try {
    const workout = await Workout.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!workout) {
      return res.status(404).json({ message: "Workout not found" });
    }

    return res.json({
      message: "Workout deleted successfully",
    });
  } catch {
    return res.status(500).json({ message: "Failed to delete workout" });
  }
}
