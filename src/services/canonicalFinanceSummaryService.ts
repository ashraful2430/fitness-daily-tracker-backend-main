import BalanceAccount from "../models/BalanceAccount";
import Expense from "../models/Expense";
import Income from "../models/Income";
import Lending from "../models/Lending";
import LoanDebt from "../models/LoanDebt";
import SalaryMonth from "../models/SalaryMonth";
import Savings from "../models/Savings";

type LoanBucket = {
  principal: number;
  repaid: number;
};

export type CanonicalFinanceSummaryComponents = {
  salary: number;
  externalIncome: number;
  savings: number;
  expenses: number;
  directLoans: LoanBucket;
  borrowedLendingLoans: LoanBucket;
  personalLending: LoanBucket;
  borrowedLending: LoanBucket;
  balanceAccountTotal: number;
};

export type CanonicalFinanceSummary = {
  availableBalance: number;
  loanDebt: number;
  netBalance: number;
  salary: number;
  externalIncome: number;
  savings: number;
  activeLoans: number;
  borrowedLending: number;
  repaidLoans: number;
  expenses: number;
  lendingFromPersonal: number;
  lendingOutstanding: number;
  totalLoanDebt: number;
  totalLending: number;
  totalBalance: number;
  totalExpenses: number;
  totalDebt: number;
  netPosition: number;
  breakdown: {
    salary: number;
    externalIncome: number;
    savings: number;
    expenses: number;
    directLoans: LoanBucket & { outstanding: number };
    borrowedLendingLoans: LoanBucket & { outstanding: number };
    lending: {
      personalPrincipal: number;
      personalRepaid: number;
      personalOutstanding: number;
      borrowedPrincipal: number;
      borrowedRepaid: number;
      borrowedOutstanding: number;
      outstanding: number;
    };
    balanceAccounts: {
      total: number;
    };
    formulaNotes: {
      borrowedLendingDebtSource: string;
      activeLoans: string;
      borrowedLending: string;
    };
  };
};

function sumAggValue(result: Array<{ total?: number }>) {
  return result[0]?.total ?? 0;
}

function splitLoanBuckets(
  result: Array<{
    _id: "DIRECT" | "BORROWED_LENDING";
    principal: number;
    repaid: number;
  }>,
) {
  const direct = result.find((item) => item._id === "DIRECT");
  const borrowed = result.find((item) => item._id === "BORROWED_LENDING");

  return {
    direct: {
      principal: direct?.principal ?? 0,
      repaid: direct?.repaid ?? 0,
    },
    borrowed: {
      principal: borrowed?.principal ?? 0,
      repaid: borrowed?.repaid ?? 0,
    },
  };
}

function splitLendingBuckets(
  result: Array<{
    _id: "PERSONAL" | "BORROWED";
    principal: number;
    repaid: number;
  }>,
) {
  const personal = result.find((item) => item._id === "PERSONAL");
  const borrowed = result.find((item) => item._id === "BORROWED");

  return {
    personal: {
      principal: personal?.principal ?? 0,
      repaid: personal?.repaid ?? 0,
    },
    borrowed: {
      principal: borrowed?.principal ?? 0,
      repaid: borrowed?.repaid ?? 0,
    },
  };
}

export function outstanding({ principal, repaid }: LoanBucket) {
  return Math.max(principal - repaid, 0);
}

export function buildCanonicalFinanceSummary({
  salary,
  externalIncome,
  savings,
  expenses,
  directLoans,
  borrowedLendingLoans,
  personalLending,
  borrowedLending: borrowedLendingRecords,
  balanceAccountTotal,
}: CanonicalFinanceSummaryComponents): CanonicalFinanceSummary {
  // Canonical debt source:
  // BORROWED lending creates a linked LoanDebt. To avoid double-counting, loan
  // debt is calculated from LoanDebt only, split by linkedLendingId for reporting.
  // The top-level activeLoans and borrowedLending values are outstanding amounts
  // after repayments so availableBalance and loanDebt stay synchronized.
  const activeLoans = outstanding(directLoans);
  const borrowedLending = outstanding(borrowedLendingLoans);
  const repaidLoans = directLoans.repaid + borrowedLendingLoans.repaid;

  const lendingFromPersonal = outstanding(personalLending);
  const borrowedLendingOutstanding = outstanding(borrowedLendingRecords);
  const lendingOutstanding = lendingFromPersonal + borrowedLendingOutstanding;

  const availableBalance =
    salary + externalIncome + savings + activeLoans - expenses - lendingFromPersonal;
  const loanDebt = activeLoans + borrowedLending;
  const netBalance = availableBalance - loanDebt;

  return {
    availableBalance,
    loanDebt,
    netBalance,
    salary,
    externalIncome,
    savings,
    activeLoans,
    borrowedLending,
    repaidLoans,
    expenses,
    lendingFromPersonal,
    lendingOutstanding,
    totalLoanDebt: loanDebt,
    totalLending: lendingOutstanding,
    totalBalance: availableBalance,
    totalExpenses: expenses,
    totalDebt: loanDebt,
    netPosition: netBalance,
    breakdown: {
      salary,
      externalIncome,
      savings,
      expenses,
      directLoans: {
        ...directLoans,
        outstanding: activeLoans,
      },
      borrowedLendingLoans: {
        ...borrowedLendingLoans,
        outstanding: borrowedLending,
      },
      lending: {
        personalPrincipal: personalLending.principal,
        personalRepaid: personalLending.repaid,
        personalOutstanding: lendingFromPersonal,
        borrowedPrincipal: borrowedLendingRecords.principal,
        borrowedRepaid: borrowedLendingRecords.repaid,
        borrowedOutstanding: borrowedLendingOutstanding,
        outstanding: lendingOutstanding,
      },
      balanceAccounts: {
        total: balanceAccountTotal,
      },
      formulaNotes: {
        borrowedLendingDebtSource:
          "Borrowed lending debt is counted from linked LoanDebt records, not from Lending again.",
        activeLoans:
          "Top-level activeLoans is outstanding direct loan debt after direct loan repayments.",
        borrowedLending:
          "Top-level borrowedLending is outstanding linked borrowed-lending debt after repayments.",
      },
    },
  };
}

export async function getCanonicalFinanceSummary(
  userId: string,
): Promise<CanonicalFinanceSummary> {
  const [
    salaryAgg,
    incomeAgg,
    savingsAgg,
    expenseAgg,
    loanAgg,
    lendingAgg,
    balanceAgg,
  ] = await Promise.all([
    SalaryMonth.aggregate([
      { $match: { userId } },
      { $group: { _id: null, total: { $sum: "$totalSalary" } } },
    ]),
    Income.aggregate([
      { $match: { userId } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    Savings.aggregate([
      { $match: { userId } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    Expense.aggregate([
      { $match: { userId } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    LoanDebt.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: {
            $cond: [
              {
                $eq: [{ $ifNull: ["$linkedLendingId", ""] }, ""],
              },
              "DIRECT",
              "BORROWED_LENDING",
            ],
          },
          principal: { $sum: "$amount" },
          repaid: { $sum: "$paidAmount" },
        },
      },
    ]),
    Lending.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: "$fundingSource",
          principal: { $sum: "$amount" },
          repaid: { $sum: "$repaidAmount" },
        },
      },
    ]),
    BalanceAccount.aggregate([
      { $match: { userId } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
  ]);

  const salary = sumAggValue(salaryAgg);
  const externalIncome = sumAggValue(incomeAgg);
  const savings = sumAggValue(savingsAgg);
  const expenses = sumAggValue(expenseAgg);
  const balanceAccountTotal = sumAggValue(balanceAgg);

  const { direct, borrowed } = splitLoanBuckets(loanAgg);
  const lending = splitLendingBuckets(lendingAgg);

  return buildCanonicalFinanceSummary({
    salary,
    externalIncome,
    savings,
    expenses,
    directLoans: direct,
    borrowedLendingLoans: borrowed,
    personalLending: lending.personal,
    borrowedLending: lending.borrowed,
    balanceAccountTotal,
  });
}
