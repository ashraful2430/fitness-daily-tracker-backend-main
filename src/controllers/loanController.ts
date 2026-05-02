import { Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
import { LoanService } from "../services/loanService";
import { SourceType } from "../models/Loan";

const loanService = new LoanService();

/**
 * Create a new loan
 * POST /api/loans
 */
export async function createLoan(req: AuthRequest, res: Response) {
  try {
    const { borrowerName, amount, sourceType, borrowedFromName } = req.body;

    // Validation
    if (!borrowerName || !amount || !sourceType) {
      return res.status(400).json({
        message: "borrowerName, amount, and sourceType are required",
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        message: "Amount must be greater than zero",
      });
    }

    if (!["PERSONAL", "BORROWED"].includes(sourceType)) {
      return res.status(400).json({
        message: "sourceType must be PERSONAL or BORROWED",
      });
    }

    if (sourceType === "BORROWED" && !borrowedFromName) {
      return res.status(400).json({
        message: "borrowedFromName is required when sourceType is BORROWED",
      });
    }

    const result = await loanService.createLoan(
      req.userId!,
      borrowerName,
      amount,
      sourceType as SourceType,
      borrowedFromName,
    );

    return res.status(201).json({
      message: "Loan created successfully",
      loan: result.loan,
      ledger: result.ledger,
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to create loan";
    return res.status(400).json({ message: errorMessage });
  }
}

/**
 * Process loan repayment
 * POST /api/loans/:id/repay
 */
export async function repayLoan(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { repaymentAmount } = req.body;

    // Validation
    if (!repaymentAmount) {
      return res.status(400).json({
        message: "repaymentAmount is required",
      });
    }

    if (repaymentAmount <= 0) {
      return res.status(400).json({
        message: "Repayment amount must be greater than zero",
      });
    }

    const result = await loanService.repayLoan(id, repaymentAmount);

    return res.json({
      message: "Repayment processed successfully",
      loan: result.loan,
      ledger: result.ledger,
      remainingLoanAmount: result.remainingLoanAmount,
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to process repayment";
    return res.status(400).json({ message: errorMessage });
  }
}

/**
 * Get all loans for the user
 * GET /api/loans
 */
export async function getUserLoans(req: AuthRequest, res: Response) {
  try {
    const loans = await loanService.getUserLoans(req.userId!);

    // Enrich loans with transaction details
    const enrichedLoans = await Promise.all(
      loans.map(async (loan) => {
        const details = await loanService.getLoanDetails(
          loan._id?.toString() || "",
        );
        return {
          ...loan.toObject(),
          totalDisbursed: details.totalDisbursed,
          totalRepaid: details.totalRepaid,
          remainingAmount: details.remainingAmount,
        };
      }),
    );

    return res.json({ loans: enrichedLoans });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to fetch loans";
    return res.status(500).json({ message: errorMessage });
  }
}

/**
 * Get loan details with transaction history
 * GET /api/loans/:id
 */
export async function getLoanDetails(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;

    const details = await loanService.getLoanDetails(id);

    if (!details.loan) {
      return res.status(404).json({ message: "Loan not found" });
    }

    return res.json(details);
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to fetch loan details";
    return res.status(500).json({ message: errorMessage });
  }
}

/**
 * Get user's external debts
 * GET /api/debts
 */
export async function getUserDebts(req: AuthRequest, res: Response) {
  try {
    const debts = await loanService.getUserDebts(req.userId!);

    return res.json({ debts });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to fetch debts";
    return res.status(500).json({ message: errorMessage });
  }
}

/**
 * Get financial summary (balance, lending stats, debt liability)
 * GET /api/financial-summary
 */
export async function getFinancialSummary(req: AuthRequest, res: Response) {
  try {
    const summary = await loanService.getFinancialSummary(req.userId!);

    return res.json(summary);
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to fetch financial summary";
    return res.status(500).json({ message: errorMessage });
  }
}

/**
 * Get loan transaction history
 * GET /api/loans/:id/transactions
 */
export async function getLoanTransactions(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;

    const result = await loanService.getLoanTransactionHistory(id);

    if (!result.loan) {
      return res.status(404).json({ message: "Loan not found" });
    }

    return res.json(result);
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to fetch transactions";
    return res.status(500).json({ message: errorMessage });
  }
}

/**
 * Get lending statistics
 * GET /api/lending-stats
 */
export async function getLendingStats(req: AuthRequest, res: Response) {
  try {
    const stats = await loanService.getLendingStats(req.userId!);

    return res.json(stats);
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to fetch lending stats";
    return res.status(500).json({ message: errorMessage });
  }
}
