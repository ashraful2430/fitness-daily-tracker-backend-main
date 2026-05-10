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
const loanRoutes_1 = __importDefault(require("./routes/loanRoutes"));
const lendingRoutes_1 = __importDefault(require("./routes/lendingRoutes"));
const financeRoutes_1 = __importDefault(require("./routes/financeRoutes"));
dotenv_1.default.config();
const app = (0, express_1.default)();
// Trust proxy for secure cookies when running behind a reverse proxy / cloud provider
app.set("trust proxy", 1);
const allowedOrigins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    "http://127.0.0.1:3002",
    "https://fitness-daily-tracker.vercel.app",
    process.env.FRONTEND_URL,
].filter(Boolean);
app.use((0, cors_1.default)({
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
}));
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
app.use("/api/auth", authRoutes_1.default);
app.use("/api/workouts", workoutRoutes_1.default);
app.use("/api/dashboard", dashboardRoutes_1.default);
app.use("/api/score-sections", scoreSectionRoutes_1.default);
app.use("/api/money", moneyRoutes_1.default);
app.use("/api/learning", learningRoutes_1.default);
app.use("/api/loans", loanRoutes_1.default);
app.use("/api/lending", lendingRoutes_1.default);
app.use("/api/finance", financeRoutes_1.default);
app.get("/health", (req, res) => {
    res.json({
        status: "ok",
        app: "Planify Life Backend",
    });
});
const PORT = process.env.PORT || 5000;
(0, db_1.connectDB)().then(() => {
    app.listen(PORT, () => {
        console.log(`Backend running on port ${PORT}`);
    });
});
