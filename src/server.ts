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
import loanRoutes from "./routes/loanRoutes";

dotenv.config();

const app = express();

// Add middleware to log request headers for debugging purposes
app.use((req, res, next) => {
  console.log("Request Headers:", req.headers); // Log headers to check the Origin
  next();
});

// CORS configuration to allow multiple origins (local and production frontend)
const corsOptions = {
  origin: [
    "http://localhost:3000", // Local frontend URL (for development)
    "https://fitness-daily-tracker.vercel.app", // Production frontend URL (replace with your actual frontend URL)
  ],
  credentials: true, // Allow cookies and credentials to be sent
  methods: ["GET", "POST", "PUT", "DELETE"], // Allowed HTTP methods
};

// Use the CORS middleware with the configured options
app.use(cors(corsOptions));

app.use(express.json());
app.use(cookieParser());
app.use("/api/auth", authRoutes);
app.use("/api/workouts", workoutRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/score-sections", scoreSectionRoutes);
app.use("/api/money", moneyRoutes);
app.use("/api/learning", learningRoutes);
app.use("/api/loans", loanRoutes);

// Test CORS with a simple route
app.get("/test-cors", (req, res) => {
  res.send("CORS is working!");
});

// Health check route
app.get("/health", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*"); // Allow all origins (for testing only)
  res.json({
    status: "ok",
    app: "Planify Life Backend",
  });
});

const PORT = process.env.PORT || 5000;

// Connect to the database and start the server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Backend running on port ${PORT}`);
  });
});
