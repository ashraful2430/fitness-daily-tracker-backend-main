import User, { IUser } from "../models/User";
import Loan, { ILoan, SourceType, LoanStatus } from "../models/Loan";
import LoanLedger, { ILoanLedger } from "../models/LoanLedger";
import ExternalDebt, { IExternalDebt } from "../models/ExternalDebt";
import mongoose from "mongoose";

export class LoanService {
  /**
   * Create a new loan with proper balance and debt management
   */
  async createLoan(
    lenderUserId: string,
    borrowerName: string,
    amount: number,
    sourceType: SourceType,
    borrowedFromName?: string,
  ): Promise<{ loan: ILoan; ledger: ILoanLedger }> {
    // Start a session for atomic transactions
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Validation: No negative or zero amounts
      if (amount <= 0) {
        throw new Error("Loan amount must be greater than zero");
      }

      // Validation: If BORROWED source, creditor_name is required
      if (sourceType === "BORROWED" && !borrowedFromName) {
        throw new Error("Creditor name is required for BORROWED source type");
      }

      // Fetch user
      const user = await User.findById(lenderUserId).session(session);
      if (!user) {
        throw new Error("User not found");
      }

      let externalDebtId: string | undefined;

      // Handle PERSONAL source
      if (sourceType === "PERSONAL") {
        if (user.personalBalance < amount) {
          throw new Error("Insufficient balance");
        }
        // Deduct from personal balance
        user.personalBalance -= amount;
        await user.save({ session });
      }

      // Handle BORROWED source
      if (sourceType === "BORROWED") {
        // Create or update ExternalDebt
        let externalDebt = await ExternalDebt.findOne({
          userId: lenderUserId,
          creditorName: borrowedFromName,
          isCleared: false,
        }).session(session);

        if (!externalDebt) {
          externalDebt = new ExternalDebt({
            userId: lenderUserId,
            creditorName: borrowedFromName,
            totalAmount: amount,
            remainingAmount: amount,
            isCleared: false,
          });
        } else {
          externalDebt.totalAmount += amount;
          externalDebt.remainingAmount += amount;
        }

        await externalDebt.save({ session });
        externalDebtId = externalDebt._id?.toString();
      }

      // Create Loan record
      const loan = new Loan({
        lenderUserId,
        borrowerName,
        amount,
        sourceType,
        borrowedFromName:
          sourceType === "BORROWED" ? borrowedFromName : undefined,
        externalDebtId: sourceType === "BORROWED" ? externalDebtId : undefined,
        status: "ACTIVE",
      });

      await loan.save({ session });

      // Create LoanLedger entry for DISBURSEMENT
      const ledger = new LoanLedger({
        loanId: loan._id?.toString(),
        type: "DISBURSEMENT",
        amount,
      });

      await ledger.save({ session });

      await session.commitTransaction();
      return { loan, ledger };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Process loan repayment with balance updates
   */
  async repayLoan(
    loanId: string,
    repaymentAmount: number,
  ): Promise<{
    loan: ILoan;
    ledger: ILoanLedger;
    remainingLoanAmount: number;
  }> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Validation: No negative or zero repayment
      if (repaymentAmount <= 0) {
        throw new Error("Repayment amount must be greater than zero");
      }

      // Fetch loan
      const loan = await Loan.findById(loanId).session(session);
      if (!loan) {
        throw new Error("Loan not found");
      }

      // Calculate remaining loan amount from ledger
      const ledgerEntries = await LoanLedger.find({ loanId }).session(session);
      const disbursements = ledgerEntries
        .filter((l) => l.type === "DISBURSEMENT")
        .reduce((sum, l) => sum + l.amount, 0);
      const repayments = ledgerEntries
        .filter((l) => l.type === "REPAYMENT")
        .reduce((sum, l) => sum + l.amount, 0);

      const remainingLoanAmount = disbursements - repayments;

      // Validation: No overpayment
      if (repaymentAmount > remainingLoanAmount) {
        throw new Error(
          `Repayment amount (${repaymentAmount}) exceeds remaining loan amount (${remainingLoanAmount})`,
        );
      }

      // Fetch user
      const user = await User.findById(loan.lenderUserId).session(session);
      if (!user) {
        throw new Error("User not found");
      }

      // Handle PERSONAL source - return money to personal balance
      if (loan.sourceType === "PERSONAL") {
        user.personalBalance += repaymentAmount;
        await user.save({ session });
      }

      // Handle BORROWED source - reduce external debt
      if (loan.sourceType === "BORROWED" && loan.externalDebtId) {
        const externalDebt = await ExternalDebt.findById(
          loan.externalDebtId,
        ).session(session);
        if (!externalDebt) {
          throw new Error("External debt not found");
        }

        externalDebt.remainingAmount -= repaymentAmount;
        if (externalDebt.remainingAmount < 0) {
          externalDebt.remainingAmount = 0;
        }
        if (externalDebt.remainingAmount === 0) {
          externalDebt.isCleared = true;
        }
        await externalDebt.save({ session });
      }

      // Create LoanLedger entry for REPAYMENT
      const ledger = new LoanLedger({
        loanId,
        type: "REPAYMENT",
        amount: repaymentAmount,
      });

      await ledger.save({ session });

      // Update Loan status
      const newRemaining = remainingLoanAmount - repaymentAmount;
      if (newRemaining === 0) {
        loan.status = "CLOSED";
      } else if (newRemaining < loan.amount && newRemaining > 0) {
        loan.status = "PARTIALLY_PAID";
      }

      await loan.save({ session });

      await session.commitTransaction();
      return { loan, ledger, remainingLoanAmount: newRemaining };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Get all loans for a user
   */
  async getUserLoans(userId: string): Promise<ILoan[]> {
    return await Loan.find({ lenderUserId: userId }).sort({ createdAt: -1 });
  }

  /**
   * Get loan details with transaction history
   */
  async getLoanDetails(loanId: string): Promise<{
    loan: ILoan | null;
    ledger: ILoanLedger[];
    totalDisbursed: number;
    totalRepaid: number;
    remainingAmount: number;
  }> {
    const loan = await Loan.findById(loanId);
    const ledger = await LoanLedger.find({ loanId }).sort({ createdAt: 1 });

    const totalDisbursed = ledger
      .filter((l) => l.type === "DISBURSEMENT")
      .reduce((sum, l) => sum + l.amount, 0);
    const totalRepaid = ledger
      .filter((l) => l.type === "REPAYMENT")
      .reduce((sum, l) => sum + l.amount, 0);
    const remainingAmount = totalDisbursed - totalRepaid;

    return {
      loan,
      ledger,
      totalDisbursed,
      totalRepaid,
      remainingAmount,
    };
  }

  /**
   * Get all external debts for a user
   */
  async getUserDebts(userId: string): Promise<IExternalDebt[]> {
    return await ExternalDebt.find({ userId }).sort({ createdAt: -1 });
  }

  /**
   * Get user's financial summary
   */
  async getFinancialSummary(userId: string): Promise<{
    personalBalance: number;
    totalLent: number;
    totalOutstandingLoans: number;
    totalBorrowedLiability: number;
    netPosition: number;
    activeDebts: IExternalDebt[];
  }> {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Total lent from personal balance
    const personalLoans = await Loan.find({
      lenderUserId: userId,
      sourceType: "PERSONAL",
    });
    const totalLentPersonal = personalLoans.reduce(
      (sum, l) => sum + l.amount,
      0,
    );

    // Calculate outstanding personal loans
    let totalOutstandingPersonal = 0;
    for (const loan of personalLoans) {
      const { remainingAmount } = await this.getLoanDetails(
        loan._id?.toString() || "",
      );
      totalOutstandingPersonal += remainingAmount;
    }

    // Get all active debts
    const activeDebts = await ExternalDebt.find({
      userId,
      isCleared: false,
    });
    const totalBorrowedLiability = activeDebts.reduce(
      (sum, d) => sum + d.remainingAmount,
      0,
    );

    // Net position = personal_balance - remaining borrowed debt
    const netPosition = user.personalBalance - totalBorrowedLiability;

    return {
      personalBalance: user.personalBalance,
      totalLent: totalLentPersonal,
      totalOutstandingLoans: totalOutstandingPersonal,
      totalBorrowedLiability,
      netPosition,
      activeDebts,
    };
  }

  /**
   * Get loan transaction history
   */
  async getLoanTransactionHistory(
    loanId: string,
  ): Promise<{ loan: ILoan | null; transactions: ILoanLedger[] }> {
    const loan = await Loan.findById(loanId);
    const transactions = await LoanLedger.find({ loanId }).sort({
      createdAt: 1,
    });
    return { loan, transactions };
  }

  /**
   * Get user's lending statistics
   */
  async getLendingStats(userId: string): Promise<{
    totalActiveLoans: number;
    totalPartiallyPaidLoans: number;
    totalClosedLoans: number;
    averageLoanAmount: number;
    totalMoneyLent: number;
    totalMoneyReceived: number;
  }> {
    const loans = await Loan.find({ lenderUserId: userId });

    const activeLoans = loans.filter((l) => l.status === "ACTIVE").length;
    const partiallyPaidLoans = loans.filter(
      (l) => l.status === "PARTIALLY_PAID",
    ).length;
    const closedLoans = loans.filter((l) => l.status === "CLOSED").length;

    const totalMoneyLent = loans.reduce((sum, l) => sum + l.amount, 0);
    const averageLoanAmount =
      loans.length > 0 ? totalMoneyLent / loans.length : 0;

    // Calculate total repayments
    const allLedgers = await LoanLedger.find({
      type: "REPAYMENT",
      loanId: { $in: loans.map((l) => l._id?.toString()) },
    });
    const totalMoneyReceived = allLedgers.reduce((sum, l) => sum + l.amount, 0);

    return {
      totalActiveLoans: activeLoans,
      totalPartiallyPaidLoans: partiallyPaidLoans,
      totalClosedLoans: closedLoans,
      averageLoanAmount,
      totalMoneyLent,
      totalMoneyReceived,
    };
  }
}
