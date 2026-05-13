const assert = require("node:assert");
const { afterEach, describe, it } = require("node:test");
const mongoose = require("mongoose");

const financeService = require("../dist/services/financeService");
const financeController = require("../dist/controllers/financeController");
const monthlyIncomeService = require("../dist/services/monthlyIncomeService");
const MonthlyIncome = require("../dist/models/MonthlyIncome").default;
const SalaryMonth = require("../dist/models/SalaryMonth").default;
const Income = require("../dist/models/Income").default;
const BalanceAccount = require("../dist/models/BalanceAccount").default;
const BalanceRecord = require("../dist/models/BalanceRecord").default;
const TransactionLedger = require("../dist/models/TransactionLedger").default;

const originals = [];
function patch(target, key, value) {
  originals.push([target, key, target[key]]);
  target[key] = value;
}
function restorePatches() {
  while (originals.length > 0) {
    const [target, key, value] = originals.pop();
    target[key] = value;
  }
}
function jsonResponse() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}
function mockSession() {
  return {
    async withTransaction(fn) {
      return fn();
    },
    endSession() {},
  };
}

describe("monthly income tracking", () => {
  afterEach(restorePatches);

  it("upsertMonthlyIncome uses upsert to avoid duplicates for same month", async () => {
    let callCount = 0;
    patch(MonthlyIncome, "findOneAndUpdate", () => ({
      lean: async () => {
      callCount += 1;
      return { year: 2026, month: 5, totalIncome: 100 };
      },
    }));

    await monthlyIncomeService.upsertMonthlyIncome("u1", 2026, 5, {
      totalIncome: 100,
      salaryIncome: 70,
      externalIncome: 30,
    });
    await monthlyIncomeService.upsertMonthlyIncome("u1", 2026, 5, {
      totalIncome: 120,
      salaryIncome: 90,
      externalIncome: 30,
    });

    assert.strictEqual(callCount, 2);
  });

  it("salary add triggers monthly income recompute", async () => {
    patch(mongoose, "startSession", async () => mockSession());
    patch(SalaryMonth, "findOne", () => ({ session: async () => null }));
    patch(SalaryMonth, "create", async (docs) => [{ ...docs[0], _id: { toString: () => "sal-1" } }]);
    patch(BalanceAccount, "create", async () => [{ _id: { toString: () => "bal-1" } }]);
    patch(TransactionLedger, "create", async () => [{}]);
    patch(BalanceAccount, "aggregate", () => ({ session: async () => [] }));
    patch(BalanceRecord, "findOneAndUpdate", async () => ({}));

    let called = false;
    patch(monthlyIncomeService, "recomputeMonthlyIncome", async (_u, year, month) => {
      called = year === 2026 && month === 5;
      return {};
    });

    await financeService.addSalary("u1", 1000, new Date("2026-05-10T00:00:00.000Z"));
    assert.strictEqual(called, true);
  });

  it("external income add triggers monthly income recompute", async () => {
    patch(mongoose, "startSession", async () => mockSession());
    patch(Income, "create", async (docs) => [{ ...docs[0], _id: "inc-1" }]);
    patch(BalanceAccount, "create", async () => [{}]);
    patch(TransactionLedger, "create", async () => [{}]);
    patch(BalanceAccount, "aggregate", () => ({ session: async () => [] }));
    patch(BalanceRecord, "findOneAndUpdate", async () => ({}));

    let called = false;
    patch(monthlyIncomeService, "recomputeMonthlyIncome", async (_u, year, month) => {
      called = year === 2026 && month === 5;
      return {};
    });

    await financeService.createIncomeRecord(
      "u1",
      500,
      "Freelance",
      "",
      new Date("2026-05-15T00:00:00.000Z"),
    );
    assert.strictEqual(called, true);
  });

  it("GET /monthly-income validates month/year and returns shaped data", async () => {
    patch(monthlyIncomeService, "getMonthlyIncomeOrDefault", async () => ({
      salaryIncome: 32000,
      externalIncome: 1000,
      totalIncome: 33000,
    }));

    const bad = jsonResponse();
    await financeController.getMonthlyIncome(
      { userId: "u1", query: { month: "13", year: "2026" } },
      bad,
    );
    assert.strictEqual(bad.statusCode, 400);
    assert.strictEqual(bad.body.field, "month");

    const ok = jsonResponse();
    await financeController.getMonthlyIncome(
      { userId: "u1", query: { month: "5", year: "2026" } },
      ok,
    );
    assert.strictEqual(ok.statusCode, 200);
    assert.strictEqual(ok.body.data.totalIncome, 33000);
  });

  it("GET /monthly-income/history returns descending records", async () => {
    patch(monthlyIncomeService, "getMonthlyIncomeHistory", async () => [
        { year: 2026, month: 5, salaryIncome: 10, externalIncome: 2, totalIncome: 12 },
        { year: 2026, month: 4, salaryIncome: 8, externalIncome: 1, totalIncome: 9 },
      ]);

    const res = jsonResponse();
    await financeController.getMonthlyIncomeHistory({ userId: "u1", query: { limit: "2" } }, res);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.length, 2);
    assert.strictEqual(res.body.data[0].year, 2026);
    assert.strictEqual(res.body.data[0].month, 5);
  });
});
