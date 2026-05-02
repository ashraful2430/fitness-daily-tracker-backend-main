"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LOAN_LEDGER_TYPES = void 0;
const mongoose_1 = require("mongoose");
exports.LOAN_LEDGER_TYPES = ["DISBURSEMENT", "REPAYMENT"];
const loanLedgerSchema = new mongoose_1.Schema({
    loanId: {
        type: String,
        required: true,
        trim: true,
        index: true,
    },
    type: {
        type: String,
        required: true,
        enum: exports.LOAN_LEDGER_TYPES,
    },
    amount: {
        type: Number,
        required: true,
        min: 0,
    },
}, {
    timestamps: true,
});
loanLedgerSchema.index({ loanId: 1, createdAt: -1 });
exports.default = (0, mongoose_1.model)("LoanLedger", loanLedgerSchema);
