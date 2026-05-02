import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import { connectDB } from "./config/db";
import authRoutes from "./routes/authRoutes";
import workoutRoutes from "./routes/workoutRoutes";
import dashboardRoutes from "./routes/dashboardRoutes";
import scoreSectionRoutes from "./routes/scoreSectionRoutes";
import moneyRoutes from "./routes/moneyRoutes";
import learningRoutes from "./routes/learningRoutes";

dotenv.config();

const app = express();

// Trust proxy for secure cookies when running behind a reverse proxy / cloud provider
app.set("trust proxy", 1);

const allowedOrigins = [
  "http://localhost:3000",
  "https://fitness-daily-tracker.vercel.app",
];

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
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

app.use("/api/auth", authRoutes);
app.use("/api/workouts", workoutRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/score-sections", scoreSectionRoutes);
app.use("/api/money", moneyRoutes);
app.use("/api/learning", learningRoutes);

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    app: "Planify Life Backend",
  });
});

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Backend running on port ${PORT}`);
  });
});
