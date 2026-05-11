const assert = require("node:assert");
const { describe, it } = require("node:test");
const {
  buildCanonicalFinanceSummary,
} = require("../dist/services/canonicalFinanceSummaryService");

function base(overrides = {}) {
  return {
    salary: 0,
    externalIncome: 0,
    savings: 0,
    expenses: 0,
    directLoans: { principal: 0, repaid: 0 },
    borrowedLendingLoans: { principal: 0, repaid: 0 },
    personalLending: { principal: 0, repaid: 0 },
    borrowedLending: { principal: 0, repaid: 0 },
    balanceAccountTotal: 0,
    ...overrides,
  };
}

describe("Canonical finance summary formulas", () => {
  it("expense updates available balance", () => {
    const summary = buildCanonicalFinanceSummary(base({
      salary: 1000,
      expenses: 125,
    }));

    assert.strictEqual(summary.availableBalance, 875);
    assert.strictEqual(summary.expenses, 125);
  });

  it("income updates available balance", () => {
    const summary = buildCanonicalFinanceSummary(base({
      externalIncome: 250,
    }));

    assert.strictEqual(summary.availableBalance, 250);
    assert.strictEqual(summary.externalIncome, 250);
  });

  it("savings updates available balance", () => {
    const summary = buildCanonicalFinanceSummary(base({
      savings: 300,
    }));

    assert.strictEqual(summary.availableBalance, 300);
    assert.strictEqual(summary.savings, 300);
  });

  it("loan creation updates available balance and loan debt", () => {
    const summary = buildCanonicalFinanceSummary(base({
      directLoans: { principal: 500, repaid: 0 },
    }));

    assert.strictEqual(summary.activeLoans, 500);
    assert.strictEqual(summary.availableBalance, 500);
    assert.strictEqual(summary.loanDebt, 500);
    assert.strictEqual(summary.netBalance, 0);
  });

  it("loan repayment updates available balance and loan debt", () => {
    const summary = buildCanonicalFinanceSummary(base({
      directLoans: { principal: 500, repaid: 200 },
    }));

    assert.strictEqual(summary.activeLoans, 300);
    assert.strictEqual(summary.repaidLoans, 200);
    assert.strictEqual(summary.availableBalance, 300);
    assert.strictEqual(summary.loanDebt, 300);
  });

  it("PERSONAL lending updates available balance", () => {
    const summary = buildCanonicalFinanceSummary(base({
      salary: 1000,
      personalLending: { principal: 400, repaid: 0 },
    }));

    assert.strictEqual(summary.lendingFromPersonal, 400);
    assert.strictEqual(summary.lendingOutstanding, 400);
    assert.strictEqual(summary.availableBalance, 600);
  });

  it("PERSONAL lending repayment updates available balance", () => {
    const summary = buildCanonicalFinanceSummary(base({
      salary: 1000,
      personalLending: { principal: 400, repaid: 150 },
    }));

    assert.strictEqual(summary.lendingFromPersonal, 250);
    assert.strictEqual(summary.lendingOutstanding, 250);
    assert.strictEqual(summary.availableBalance, 750);
  });

  it("BORROWED lending creates linked debt without double-counting lending as debt", () => {
    const summary = buildCanonicalFinanceSummary(base({
      borrowedLendingLoans: { principal: 700, repaid: 0 },
      borrowedLending: { principal: 700, repaid: 0 },
    }));

    assert.strictEqual(summary.borrowedLending, 700);
    assert.strictEqual(summary.lendingOutstanding, 700);
    assert.strictEqual(summary.loanDebt, 700);
    assert.strictEqual(summary.totalLoanDebt, 700);
    assert.strictEqual(summary.breakdown.borrowedLendingLoans.principal, 700);
  });

  it("finance summary does not add borrowed lending debt twice", () => {
    const summary = buildCanonicalFinanceSummary(base({
      directLoans: { principal: 100, repaid: 0 },
      borrowedLendingLoans: { principal: 700, repaid: 200 },
      borrowedLending: { principal: 700, repaid: 200 },
    }));

    assert.strictEqual(summary.activeLoans, 100);
    assert.strictEqual(summary.borrowedLending, 500);
    assert.strictEqual(summary.lendingOutstanding, 500);
    assert.strictEqual(summary.loanDebt, 600);
    assert.notStrictEqual(summary.loanDebt, 1100);
  });

  it("BORROWED lending partial repayment reduces linked debt", () => {
    const summary = buildCanonicalFinanceSummary(base({
      borrowedLendingLoans: { principal: 700, repaid: 250 },
      borrowedLending: { principal: 700, repaid: 250 },
    }));

    assert.strictEqual(summary.borrowedLending, 450);
    assert.strictEqual(summary.repaidLoans, 250);
    assert.strictEqual(summary.loanDebt, 450);
  });

  it("finance summary matches required formulas after combined scenarios", () => {
    const summary = buildCanonicalFinanceSummary(base({
      salary: 1000,
      externalIncome: 200,
      savings: 100,
      expenses: 150,
      directLoans: { principal: 500, repaid: 100 },
      borrowedLendingLoans: { principal: 300, repaid: 50 },
      personalLending: { principal: 250, repaid: 75 },
      borrowedLending: { principal: 300, repaid: 50 },
      balanceAccountTotal: 1175,
    }));

    assert.strictEqual(summary.availableBalance, 1375);
    assert.strictEqual(summary.loanDebt, 650);
    assert.strictEqual(summary.netBalance, 725);
    assert.strictEqual(summary.totalLoanDebt, summary.loanDebt);
    assert.strictEqual(summary.totalLending, summary.lendingOutstanding);
    assert.strictEqual(summary.breakdown.balanceAccounts.total, 1175);
  });
});
