"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const adminController_1 = require("../controllers/adminController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const adminMiddleware_1 = require("../middleware/adminMiddleware");
const router = express_1.default.Router();
router.use(authMiddleware_1.authMiddleware, adminMiddleware_1.adminMiddleware);
router.get("/users", adminController_1.getAdminUsers);
router.get("/users/:userId/summary", adminController_1.getUserAdminSummary);
router.patch("/users/:userId/role", adminController_1.updateUserRole);
router.patch("/users/:userId/block", adminController_1.setUserBlockStatus);
exports.default = router;
