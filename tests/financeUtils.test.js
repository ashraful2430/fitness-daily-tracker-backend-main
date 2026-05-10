const assert = require("node:assert");
const { describe, it } = require("node:test");
const {
  formatCategoryLabel,
  normalizeCategoryName,
} = require("../dist/utils/financeUtils");
const Expense = require("../dist/models/Expense").default;
const Income = require("../dist/models/Income").default;
const Savings = require("../dist/models/Savings").default;
const {
  default: LoanDebt,
  DEFAULT_LOAN_REASON,
} = require("../dist/models/LoanDebt");
const {
  validateCreateLearningSession,
} = require("../dist/validation/learningValidation");

describe("Finance utility helpers", () => {
  it("should normalize category names to lower-case trimmed values", () => {
    assert.strictEqual(
      normalizeCategoryName("  Food & Drinks  "),
      "food & drinks",
    );
    assert.strictEqual(normalizeCategoryName("TRAVEL"), "travel");
  });

  it("should format lower-case categories into friendly title labels", () => {
    assert.strictEqual(formatCategoryLabel("food"), "Food");
    assert.strictEqual(
      formatCategoryLabel("food_and_drinks"),
      "Food And Drinks",
    );
    assert.strictEqual(
      formatCategoryLabel("groceries-and-snacks"),
      "Groceries And Snacks",
    );
  });
});

describe("Optional note and reason fields", () => {
  it("allows creating expenses without a note or description", () => {
    const expense = new Expense({
      userId: "user-1",
      amount: 25,
      category: "food",
      date: new Date("2026-05-09T00:00:00.000Z"),
    });

    const error = expense.validateSync();

    assert.strictEqual(error, undefined);
    assert.strictEqual(expense.description, "");
    assert.strictEqual(expense.note, "");
  });

  it("allows creating income and savings without notes", () => {
    const income = new Income({
      userId: "user-1",
      amount: 100,
      source: "Bonus",
      date: new Date("2026-05-09T00:00:00.000Z"),
    });
    const savings = new Savings({
      userId: "user-1",
      amount: 50,
      sourceName: "Emergency fund",
      date: new Date("2026-05-09T00:00:00.000Z"),
    });

    assert.strictEqual(income.validateSync(), undefined);
    assert.strictEqual(savings.validateSync(), undefined);
    assert.strictEqual(income.note, "");
    assert.strictEqual(savings.note, "");
  });

  it("uses a default message when creating loan debts without reasons", () => {
    const loan = new LoanDebt({
      userId: "user-1",
      personName: "Sam",
      amount: 300,
      date: new Date("2026-05-09T00:00:00.000Z"),
    });

    const error = loan.validateSync();

    assert.strictEqual(error, undefined);
    assert.strictEqual(loan.reason, DEFAULT_LOAN_REASON);
  });

  it("allows creating learning sessions with missing, null, or empty notes", () => {
    const base = {
      title: "TypeScript",
      subject: "Backend",
      plannedMinutes: 45,
      date: "2026-05-09",
    };

    assert.strictEqual(validateCreateLearningSession(base).success, true);
    assert.strictEqual(
      validateCreateLearningSession({ ...base, notes: null }).success,
      true,
    );

    const emptyNotes = validateCreateLearningSession({
      ...base,
      notes: "   ",
    });

    assert.strictEqual(emptyNotes.success, true);
    assert.strictEqual(emptyNotes.data.notes, "");
  });
});
