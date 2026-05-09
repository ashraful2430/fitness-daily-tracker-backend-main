"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const loanLendingController_1 = require("../controllers/loanLendingController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
router.use(authMiddleware_1.authMiddleware);
router.post("/", loanLendingController_1.createLoan);
router.get("/", loanLendingController_1.getLoans);
router.patch("/:id/pay", loanLendingController_1.payLoan);
router.delete("/:id", loanLendingController_1.deleteLoan);
exports.default = router;
