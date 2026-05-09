import mongoose from "mongoose";
import { Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
import LoanDebt, { DEFAULT_LOAN_REASON } from "../models/LoanDebt";
import Lending from "../models/Lending";
import BalanceAccount from "../models/BalanceAccount";
import BalanceRecord from "../models/BalanceRecord";
import TransactionLedger from "../models/TransactionLedger";
import { getCanonicalFinanceSummary } from "../services/canonicalFinanceSummaryService";
import { errorMessage, successMessage } from "../utils/apiMessages";

// ─── Errors ───────────────────────────────────────────────────────────────────

class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public field?: string,
  ) {
    super(message);
  }
}

function sendError(
  res: Response,
  status: number,
  message: string,
  field?: string,
) {
  const body: { message: string; field?: string } = { message };
  if (field) body.field = field;
  return res.status(status).json(body);
}

function handleError(res: Response, e: unknown) {
  if (e instanceof ApiError) {
    return sendError(res, e.statusCode, e.message, e.field);
  }
  return sendError(res, 500, errorMessage("server"));
}

function resolveId(param: string | string[]) {
  return Array.isArray(param) ? param[0] : param;
}

function normalizeOptionalText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeLoanReason(value: unknown) {
  const reason = normalizeOptionalText(value);
  return reason || DEFAULT_LOAN_REASON;
}

// ─── Balance helpers ──────────────────────────────────────────────────────────

const BALANCE_PRIORITY = ["SALARY", "CASH", "BANK", "EXTERNAL"];

async function getAvailableBalance(
  userId: string,
  session?: mongoose.ClientSession,
): Promise<number> {
  const agg = BalanceAccount.aggregate([
    { $match: { userId } },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);
  if (session) agg.session(session);
  const result = await agg;
  return result[0]?.total ?? 0;
}

async function deductFromBalance(
  userId: string,
  amount: number,
  session: mongoose.ClientSession,
): Promise<void> {
  const accounts = await BalanceAccount.find({ userId }).session(session);
  accounts.sort(
    (a, b) =>
      BALANCE_PRIORITY.indexOf(a.type) - BALANCE_PRIORITY.indexOf(b.type),
  );

  let remaining = amount;
  for (const account of accounts) {
    if (remaining <= 0) break;
    const deduction = Math.min(account.amount, remaining);
    account.amount -= deduction;
    remaining -= deduction;
    if (account.amount <= 0) {
      await BalanceAccount.deleteOne({ _id: account._id }).session(session);
    } else {
      await account.save({ session });
    }
  }

  if (remaining > 0) {
    throw new ApiError(400, "Insufficient balance.", "amount");
  }
}

async function creditCashBalance(
  userId: string,
  amount: number,
  session: mongoose.ClientSession,
): Promise<void> {
  await BalanceAccount.findOneAndUpdate(
    { userId, type: "CASH" },
    { $inc: { amount } },
    { new: true, upsert: true, setDefaultsOnInsert: true, session },
  );
}

async function syncBalanceRecord(
  userId: string,
  session: mongoose.ClientSession,
): Promise<void> {
  const agg = await BalanceAccount.aggregate([
    { $match: { userId } },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]).session(session);
  const total = agg[0]?.total ?? 0;

  await BalanceRecord.findOneAndUpdate(
    { userId },
    { userId, amount: total },
    { new: true, upsert: true, setDefaultsOnInsert: true, session },
  );
}

// ─── Loans ────────────────────────────────────────────────────────────────────

export const createLoan = async (req: AuthRequest, res: Response) => {
  const userId = req.userId;
  if (!userId) return sendError(res, 401, errorMessage("unauthorized"));

  const { personName, amount, reason, date } = req.body as {
    personName?: string;
    amount?: number;
    reason?: string;
    date?: string;
  };

  if (!personName?.trim())
    return sendError(res, 400, "personName is required. Who handed you the cash?", "personName");
  if (typeof amount !== "number" || amount <= 0)
    return sendError(res, 400, errorMessage("invalidAmount"), "amount");

  const loanDate = date ? new Date(date) : new Date();
  if (isNaN(loanDate.getTime()))
    return sendError(res, 400, errorMessage("invalidDate"), "date");

  const session = await mongoose.startSession();
  try {
    let loan: any;
    await session.withTransaction(async () => {
      const docs = await LoanDebt.create(
        [
          {
            userId,
            personName: personName!.trim(),
            amount,
            reason: normalizeLoanReason(reason),
            date: loanDate,
          },
        ],
        { session },
      );
      loan = docs[0];

      await BalanceAccount.create(
        [{ userId, type: "EXTERNAL", amount }],
        { session },
      );

      await TransactionLedger.create(
        [
          {
            userId,
            type: "CREDIT",
            source: "LOAN_RECEIVED",
            amount,
            referenceId: loan._id.toString(),
          },
        ],
        { session },
      );

      await syncBalanceRecord(userId, session);
    });

    return res.status(201).json({
      success: true,
      message: successMessage("created", "loan-debt-created"),
      data: loan,
    });
  } catch (e) {
    return handleError(res, e);
  } finally {
    session.endSession();
  }
};

export const getLoans = async (req: AuthRequest, res: Response) => {
  const userId = req.userId;
  if (!userId) return sendError(res, 401, errorMessage("unauthorized"));

  try {
    const loans = await LoanDebt.find({ userId }).sort({ createdAt: -1 }).lean();
    return res.status(200).json({ success: true, data: loans });
  } catch (e) {
    return handleError(res, e);
  }
};

export const payLoan = async (req: AuthRequest, res: Response) => {
  const userId = req.userId;
  if (!userId) return sendError(res, 401, errorMessage("unauthorized"));

  const loanId = resolveId(req.params.id);
  const { amount } = req.body as { amount?: number };

  if (typeof amount !== "number" || amount <= 0)
    return sendError(res, 400, errorMessage("invalidAmount"), "amount");

  const session = await mongoose.startSession();
  try {
    let loan: any;
    await session.withTransaction(async () => {
      loan = await LoanDebt.findOne({ _id: loanId, userId }).session(session);
      if (!loan) throw new ApiError(404, errorMessage("notFound"));
      if (loan.status === "PAID")
        throw new ApiError(400, "Loan is already paid. Stop trying to pay a ghost bill.");

      const remaining = loan.amount - loan.paidAmount;
      if (amount > remaining)
        throw new ApiError(400, `Amount exceeds remaining balance of ${remaining}`, "amount");

      const available = await getAvailableBalance(userId, session);
      if (amount > available) {
        throw new ApiError(
          400,
          `Insufficient balance. Available: ${available}. Wallet said sit down.`,
          "amount",
        );
      }

      await deductFromBalance(userId, amount, session);

      loan.paidAmount += amount;
      if (loan.paidAmount >= loan.amount) {
        loan.paidAmount = loan.amount;
        loan.status = "PAID";
      } else {
        loan.status = "PARTIALLY_PAID";
      }

      await loan.save({ session });
      await TransactionLedger.create(
        [
          {
            userId,
            type: "DEBIT",
            source: "LOAN_REPAID",
            amount,
            referenceId: loan._id.toString(),
          },
        ],
        { session },
      );
      await syncBalanceRecord(userId, session);
    });

    return res.status(200).json({
      success: true,
      message: successMessage("updated", "loan-debt-paid"),
      data: loan,
    });
  } catch (e) {
    return handleError(res, e);
  } finally {
    session.endSession();
  }
};

export const deleteLoan = async (req: AuthRequest, res: Response) => {
  const userId = req.userId;
  if (!userId) return sendError(res, 401, errorMessage("unauthorized"));

  const loanId = resolveId(req.params.id);

  try {
    const loan = await LoanDebt.findOne({ _id: loanId, userId });
    if (!loan) return sendError(res, 404, errorMessage("notFound"));

    if (loan.linkedLendingId) {
      return sendError(
        res,
        400,
        "This loan was auto-created by a lending entry. Delete the lending instead.",
      );
    }

    await LoanDebt.deleteOne({ _id: loanId });
    return res.status(200).json({
      success: true,
      message: successMessage("deleted", "loan-debt-deleted"),
    });
  } catch (e) {
    return handleError(res, e);
  }
};

// ─── Lending ──────────────────────────────────────────────────────────────────

export const createLending = async (req: AuthRequest, res: Response) => {
  const userId = req.userId;
  if (!userId) return sendError(res, 401, errorMessage("unauthorized"));

  const { personName, amount, fundingSource, date } = req.body as {
    personName?: string;
    amount?: number;
    fundingSource?: string;
    date?: string;
  };

  if (!personName?.trim())
    return sendError(res, 400, "personName is required. Lending to 'someone' is how chaos gets receipts.", "personName");
  if (typeof amount !== "number" || amount <= 0)
    return sendError(res, 400, errorMessage("invalidAmount"), "amount");
  if (!fundingSource || !["PERSONAL", "BORROWED"].includes(fundingSource))
    return sendError(
      res,
      400,
      "fundingSource must be PERSONAL or BORROWED",
      "fundingSource",
    );

  const lendingDate = date ? new Date(date) : new Date();
  if (isNaN(lendingDate.getTime()))
    return sendError(res, 400, errorMessage("invalidDate"), "date");

  const session = await mongoose.startSession();
  try {
    let lending: any;

    await session.withTransaction(async () => {
      if (fundingSource === "PERSONAL") {
        const available = await getAvailableBalance(userId, session);
        if (amount > available) {
          throw new ApiError(
            400,
            `Insufficient balance. Available: ${available}. Wallet said sit down.`,
            "amount",
          );
        }
        await deductFromBalance(userId, amount, session);
        await syncBalanceRecord(userId, session);

        const docs = await Lending.create(
          [
            {
              userId,
              personName: personName!.trim(),
              amount,
              fundingSource: "PERSONAL",
              date: lendingDate,
            },
          ],
          { session },
        );
        lending = docs[0];
      } else {
        // BORROWED: auto-create a Loan record to track the debt
        const loanDocs = await LoanDebt.create(
          [
            {
              userId,
              personName: `Borrowed to lend to ${personName!.trim()}`,
              amount,
              reason: `Borrowed funds to lend to ${personName!.trim()}`,
              date: lendingDate,
              status: "ACTIVE",
            },
          ],
          { session },
        );
        const autoLoan = loanDocs[0];

        const lendingDocs = await Lending.create(
          [
            {
              userId,
              personName: personName!.trim(),
              amount,
              fundingSource: "BORROWED",
              date: lendingDate,
              linkedLoanId: autoLoan._id.toString(),
            },
          ],
          { session },
        );
        lending = lendingDocs[0];

        // Back-link the auto-loan to the lending
        await LoanDebt.findOneAndUpdate(
          { _id: autoLoan._id },
          { linkedLendingId: lending._id.toString() },
          { session },
        );
      }
    });

    return res.status(201).json({
      success: true,
      message: successMessage("created", "lending-created"),
      data: lending,
    });
  } catch (e) {
    return handleError(res, e);
  } finally {
    session.endSession();
  }
};

export const getLendings = async (req: AuthRequest, res: Response) => {
  const userId = req.userId;
  if (!userId) return sendError(res, 401, errorMessage("unauthorized"));

  try {
    const lendings = await Lending.find({ userId }).sort({ createdAt: -1 }).lean();
    return res.status(200).json({ success: true, data: lendings });
  } catch (e) {
    return handleError(res, e);
  }
};

export const repayLending = async (req: AuthRequest, res: Response) => {
  const userId = req.userId;
  if (!userId) return sendError(res, 401, errorMessage("unauthorized"));

  const lendingId = resolveId(req.params.id);

  const { amount } = req.body as { amount?: number };

  if (typeof amount !== "number" || amount <= 0)
    return sendError(res, 400, errorMessage("invalidAmount"), "amount");

  const session = await mongoose.startSession();
  try {
    let lending: any;

    await session.withTransaction(async () => {
      lending = await Lending.findOne({ _id: lendingId, userId }).session(session);
      if (!lending) throw new ApiError(404, errorMessage("notFound"));
      if (lending.status === "REPAID")
        throw new ApiError(400, "Lending is already repaid. Victory lap denied.");

      const remaining = lending.amount - lending.repaidAmount;
      if (amount > remaining)
        throw new ApiError(400, `Amount exceeds remaining balance of ${remaining}`, "amount");

      lending.repaidAmount += amount;
      const fullyRepaid = lending.repaidAmount >= lending.amount;
      if (fullyRepaid) {
        lending.repaidAmount = lending.amount;
        lending.status = "REPAID";
      } else {
        lending.status = "PARTIALLY_REPAID";
      }
      await lending.save({ session });

      if (fullyRepaid) {
        if (lending.fundingSource === "BORROWED" && lending.linkedLoanId) {
          const linkedLoan = await LoanDebt.findOne({
            _id: lending.linkedLoanId,
            userId,
          }).session(session);
          if (linkedLoan) {
            linkedLoan.paidAmount = linkedLoan.amount;
            linkedLoan.status = "PAID";
            await linkedLoan.save({ session });
          }
        }
      }

      if (lending.fundingSource === "PERSONAL") {
        await creditCashBalance(userId, amount, session);
      } else if (lending.fundingSource === "BORROWED" && lending.linkedLoanId) {
        const linkedLoan = await LoanDebt.findOne({
          _id: lending.linkedLoanId,
          userId,
        }).session(session);
        if (linkedLoan) {
          linkedLoan.paidAmount = Math.min(linkedLoan.paidAmount + amount, linkedLoan.amount);
          linkedLoan.status =
            linkedLoan.paidAmount >= linkedLoan.amount ? "PAID" : "PARTIALLY_PAID";
          await linkedLoan.save({ session });
        }
      }

      await syncBalanceRecord(userId, session);
    });

    return res.status(200).json({
      success: true,
      message: successMessage("updated", "lending-repaid"),
      data: lending,
    });
  } catch (e) {
    return handleError(res, e);
  } finally {
    session.endSession();
  }
};

export const deleteLending = async (req: AuthRequest, res: Response) => {
  const userId = req.userId;
  if (!userId) return sendError(res, 401, errorMessage("unauthorized"));

  const lendingId = resolveId(req.params.id);

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const lending = await Lending.findOne({ _id: lendingId, userId }).session(
        session,
      );
      if (!lending) throw new ApiError(404, errorMessage("notFound"));

      const isOpen = lending.status === "ACTIVE" || lending.status === "PARTIALLY_REPAID";
      if (isOpen) {
        if (lending.fundingSource === "PERSONAL") {
          // Refund only the portion not yet returned
          const unreturned = lending.amount - lending.repaidAmount;
          if (unreturned > 0) await creditCashBalance(userId, unreturned, session);
        } else if (lending.fundingSource === "BORROWED" && lending.linkedLoanId) {
          await LoanDebt.findOneAndDelete({
            _id: lending.linkedLoanId,
            userId,
          }).session(session);
        }
      }

      await Lending.findByIdAndDelete(lendingId).session(session);
    });

    return res
      .status(200)
      .json({
        success: true,
        message: successMessage("deleted", "lending-deleted"),
      });
  } catch (e) {
    return handleError(res, e);
  } finally {
    session.endSession();
  }
};

// ─── Finance Summary ──────────────────────────────────────────────────────────

export const getFinanceSummary = async (req: AuthRequest, res: Response) => {
  const userId = req.userId;
  if (!userId) return sendError(res, 401, errorMessage("unauthorized"));

  try {
    const summary = await getCanonicalFinanceSummary(userId);
    return res.status(200).json({
      success: true,
      message: successMessage("fetched", "finance-summary"),
      data: summary,
    });
  } catch (e) {
    return handleError(res, e);
  }
};
