import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import path from "path";
import mongoose from "mongoose";
import { connectDB } from "./config/db";
import authRoutes from "./routes/authRoutes";
import workoutRoutes from "./routes/workoutRoutes";
import fitnessRoutes from "./routes/fitnessRoutes";
import dashboardRoutes from "./routes/dashboardRoutes";
import scoreSectionRoutes from "./routes/scoreSectionRoutes";
import moneyRoutes from "./routes/moneyRoutes";
import learningRoutes from "./routes/learningRoutes";
import loanRoutes from "./routes/loanRoutes";
import lendingRoutes from "./routes/lendingRoutes";
import financeRoutes from "./routes/financeRoutes";
import adminRoutes from "./routes/adminRoutes";
import feedbackEffectRoutes from "./routes/feedbackEffectRoutes";

dotenv.config();

const app = express();

// Trust proxy for secure cookies when running behind a reverse proxy / cloud provider
app.set("trust proxy", 1);

function getEnvOrigins(value: string | undefined) {
  return (value || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

const allowedOrigins = new Set([
  "http://localhost:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001",
  ...getEnvOrigins(process.env.FRONTEND_URL),
  ...getEnvOrigins(process.env.CORS_ALLOWED_ORIGINS),
]);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json());
app.use(cookieParser());
app.use("/uploads", express.static(path.join(process.cwd(), "public", "uploads")));

app.use("/api/auth", authRoutes);
app.use("/api/workouts", workoutRoutes);
app.use("/api/fitness", fitnessRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/score-sections", scoreSectionRoutes);
app.use("/api/money", moneyRoutes);
app.use("/api/learning", learningRoutes);
app.use("/api/loans", loanRoutes);
app.use("/api/lending", lendingRoutes);
app.use("/api/finance", financeRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/feedback-effects", feedbackEffectRoutes);

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    app: "Planify Life Backend",
  });
});

app.get("/api/test-db", async (_req, res) => {
  try {
    if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
      return res.status(503).json({
        success: false,
        status: "disconnected",
        readyState: mongoose.connection.readyState,
      });
    }

    await mongoose.connection.db.admin().ping();

    return res.json({
      success: true,
      status: "connected",
      database: mongoose.connection.name,
    });
  } catch {
    return res.status(500).json({
      success: false,
      status: "error",
      message: "Database ping failed",
    });
  }
});

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`Backend running on port ${PORT}`);
  });
});
