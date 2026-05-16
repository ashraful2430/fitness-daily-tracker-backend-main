"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const path_1 = __importDefault(require("path"));
const mongoose_1 = __importDefault(require("mongoose"));
const db_1 = require("./config/db");
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const workoutRoutes_1 = __importDefault(require("./routes/workoutRoutes"));
const fitnessRoutes_1 = __importDefault(require("./routes/fitnessRoutes"));
const dashboardRoutes_1 = __importDefault(require("./routes/dashboardRoutes"));
const scoreSectionRoutes_1 = __importDefault(require("./routes/scoreSectionRoutes"));
const moneyRoutes_1 = __importDefault(require("./routes/moneyRoutes"));
const learningRoutes_1 = __importDefault(require("./routes/learningRoutes"));
const loanRoutes_1 = __importDefault(require("./routes/loanRoutes"));
const lendingRoutes_1 = __importDefault(require("./routes/lendingRoutes"));
const financeRoutes_1 = __importDefault(require("./routes/financeRoutes"));
const adminRoutes_1 = __importDefault(require("./routes/adminRoutes"));
const feedbackEffectRoutes_1 = __importDefault(require("./routes/feedbackEffectRoutes"));
dotenv_1.default.config();
const app = (0, express_1.default)();
// Trust proxy for secure cookies when running behind a reverse proxy / cloud provider
app.set("trust proxy", 1);
function getEnvOrigins(value) {
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
app.use((0, cors_1.default)({
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
}));
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
app.use("/uploads", express_1.default.static(path_1.default.join(process.cwd(), "public", "uploads")));
app.use("/api/auth", authRoutes_1.default);
app.use("/api/workouts", workoutRoutes_1.default);
app.use("/api/fitness", fitnessRoutes_1.default);
app.use("/api/dashboard", dashboardRoutes_1.default);
app.use("/api/score-sections", scoreSectionRoutes_1.default);
app.use("/api/money", moneyRoutes_1.default);
app.use("/api/learning", learningRoutes_1.default);
app.use("/api/loans", loanRoutes_1.default);
app.use("/api/lending", lendingRoutes_1.default);
app.use("/api/finance", financeRoutes_1.default);
app.use("/api/admin", adminRoutes_1.default);
app.use("/api/feedback-effects", feedbackEffectRoutes_1.default);
app.get("/", (_req, res) => {
    res.json({
        success: true,
        status: "active",
        message: "Planify Life Backend is active and running.",
        health: "/health",
        database: "/api/test-db",
    });
});
app.get("/health", (req, res) => {
    res.json({
        status: "ok",
        app: "Planify Life Backend",
    });
});
app.get("/api/test-db", async (_req, res) => {
    try {
        if (mongoose_1.default.connection.readyState !== 1 || !mongoose_1.default.connection.db) {
            return res.status(503).json({
                success: false,
                status: "disconnected",
                readyState: mongoose_1.default.connection.readyState,
            });
        }
        await mongoose_1.default.connection.db.admin().ping();
        return res.json({
            success: true,
            status: "connected",
            database: mongoose_1.default.connection.name,
        });
    }
    catch {
        return res.status(500).json({
            success: false,
            status: "error",
            message: "Database ping failed",
        });
    }
});
const PORT = process.env.PORT || 5000;
(0, db_1.connectDB)().then(() => {
    app.listen(Number(PORT), "0.0.0.0", () => {
        console.log(`Backend running on port ${PORT}`);
    });
});
