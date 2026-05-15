import express from "express";
import {
  cancelFitnessWorkout,
  completeFitnessWorkout,
  createFitnessWorkout,
  createRecoveryCheck,
  createWorkoutTemplate,
  deleteFitnessWorkout,
  deleteRecoveryCheck,
  deleteWorkoutTemplate,
  getFitnessGoals,
  getFitnessStats,
  getFitnessWorkout,
  getPersonalRecords,
  listFitnessWorkouts,
  listRecoveryChecks,
  listWorkoutTemplates,
  putFitnessGoals,
  recalculatePersonalRecords,
  skipFitnessWorkout,
  startFitnessWorkout,
  updateFitnessWorkout,
  updateRecoveryCheck,
  updateWorkoutTemplate,
} from "../controllers/fitnessController";
import { authMiddleware } from "../middleware/authMiddleware";
import {
  validateGoalPayload,
  validateRecoveryPayload,
  validateWorkoutPayload,
} from "../middleware/fitnessValidationMiddleware";

const router = express.Router();

router.use(authMiddleware);

router.get("/workouts", listFitnessWorkouts);
router.post("/workouts", validateWorkoutPayload(true), createFitnessWorkout);
router.get("/workouts/:id", getFitnessWorkout);
router.patch("/workouts/:id", validateWorkoutPayload(false), updateFitnessWorkout);
router.delete("/workouts/:id", deleteFitnessWorkout);
router.post("/workouts/:id/start", startFitnessWorkout);
router.post("/workouts/:id/complete", completeFitnessWorkout);
router.post("/workouts/:id/skip", skipFitnessWorkout);
router.post("/workouts/:id/cancel", cancelFitnessWorkout);

router.get("/goals", getFitnessGoals);
router.put("/goals", validateGoalPayload, putFitnessGoals);

router.get("/templates", listWorkoutTemplates);
router.post("/templates", validateWorkoutPayload(true), createWorkoutTemplate);
router.patch("/templates/:id", validateWorkoutPayload(false), updateWorkoutTemplate);
router.delete("/templates/:id", deleteWorkoutTemplate);

router.get("/recovery", listRecoveryChecks);
router.post("/recovery", validateRecoveryPayload(true), createRecoveryCheck);
router.patch("/recovery/:id", validateRecoveryPayload(false), updateRecoveryCheck);
router.delete("/recovery/:id", deleteRecoveryCheck);

router.get("/stats", getFitnessStats);

router.get("/personal-records", getPersonalRecords);
router.post("/personal-records/recalculate", recalculatePersonalRecords);

export default router;
