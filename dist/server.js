"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const db_1 = require("./config/db");
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const workoutRoutes_1 = __importDefault(require("./routes/workoutRoutes"));
const dashboardRoutes_1 = __importDefault(require("./routes/dashboardRoutes"));
const scoreSectionRoutes_1 = __importDefault(require("./routes/scoreSectionRoutes"));
const moneyRoutes_1 = __importDefault(require("./routes/moneyRoutes"));
const learningRoutes_1 = __importDefault(require("./routes/learningRoutes"));
dotenv_1.default.config();
const app = (0, express_1.default)();
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
app.use((0, cors_1.default)(corsOptions));
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
app.use("/api/auth", authRoutes_1.default);
app.use("/api/workouts", workoutRoutes_1.default);
app.use("/api/dashboard", dashboardRoutes_1.default);
app.use("/api/score-sections", scoreSectionRoutes_1.default);
app.use("/api/money", moneyRoutes_1.default);
app.use("/api/learning", learningRoutes_1.default);
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
(0, db_1.connectDB)().then(() => {
    app.listen(PORT, () => {
        console.log(`Backend running on port ${PORT}`);
    });
});
