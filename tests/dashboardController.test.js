const assert = require("node:assert");
const { afterEach, describe, it } = require("node:test");

const dashboardController = require("../dist/controllers/dashboardController");
const dashboardModels = require("../dist/models/DashboardData");
const User = require("../dist/models/User").default;
const Workout = require("../dist/models/Workout").default;
const Income = require("../dist/models/Income").default;
const Expense = require("../dist/models/Expense").default;
const Loan = require("../dist/models/Loan").default;
const Lending = require("../dist/models/Lending").default;
const ScoreSection = require("../dist/models/ScoreSection").ScoreSection;
const LearningSession = require("../dist/models/LearningSession").default;
const financeSummaryService = require("../dist/services/canonicalFinanceSummaryService");
const monthlyIncomeService = require("../dist/services/monthlyIncomeService");

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
function chainableLean(value) {
  return {
    select() {
      return this;
    },
    lean: async () => value,
    sort() {
      return this;
    },
    limit() {
      return this;
    },
  };
}

function installZeroDataStubs() {
  patch(dashboardModels.FocusSession, "findOne", () => ({ lean: async () => null }));
  patch(dashboardModels.FocusSession, "create", async () => ({ totalMinutes: 0, sessions: [] }));
  patch(dashboardModels.FocusSession, "aggregate", async () => []);
  patch(User, "findById", () => chainableLean({ loginStreak: 0, longestLoginStreak: 0, lastLoginDate: null }));
  patch(Workout, "aggregate", async () => []);
  patch(Workout, "countDocuments", async () => 0);
  patch(Income, "aggregate", async () => []);
  patch(Expense, "aggregate", async () => []);
  patch(Loan, "countDocuments", async () => 0);
  patch(Lending, "countDocuments", async () => 0);
  patch(ScoreSection, "find", () => chainableLean([]));
  patch(ScoreSection, "aggregate", async () => []);
  patch(LearningSession, "aggregate", async () => []);
  patch(LearningSession, "countDocuments", async () => 0);
  patch(financeSummaryService, "getCanonicalFinanceSummary", async () => ({ availableBalance: 0 }));
  patch(monthlyIncomeService, "getMonthlyIncomeOrDefault", async () => ({
    salaryIncome: 0,
    externalIncome: 0,
    totalIncome: 0,
  }));
}

describe("dashboard controller upgrades", () => {
  afterEach(restorePatches);

  it("returns 401 shape on unauthenticated access", async () => {
    const endpoints = [
      dashboardController.getDashboardData,
      dashboardController.getWeeklyStats,
      dashboardController.getMonthlyOverview,
      dashboardController.getMonthlyHistory,
    ];
    for (const fn of endpoints) {
      const res = jsonResponse();
      await fn({}, res);
      assert.strictEqual(res.statusCode, 401);
      assert.deepStrictEqual(res.body, { success: false, message: "Unauthorized" });
    }
  });

  it("GET /api/dashboard first-time user returns defaults + computed blocks", async () => {
    installZeroDataStubs();
    const res = jsonResponse();
    await dashboardController.getDashboardData({ userId: "507f1f77bcf86cd799439011" }, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.kpis.loginStreak.current, 0);
    assert.strictEqual(res.body.data.kpis.availableBalance, 0);
    assert.strictEqual(res.body.data.kpis.todayScore, 0);
    assert.strictEqual(res.body.data.kpis.learningToday.minutes, 0);
    assert.strictEqual(res.body.data.dailyProgress.breakdown.focus.max, 25);
    assert.strictEqual(res.body.data.dailyProgress.breakdown.learningFocus.max, 25);
    assert.strictEqual(typeof res.body.data.moduleOverview, "object");
    assert.strictEqual(Array.isArray(res.body.data.weeklyStats), true);
    assert.strictEqual(res.body.data.weeklyStats.length, 7);
  });

  it("GET /api/dashboard/weekly-stats returns read-only 7-day insight with aggregation", async () => {
    installZeroDataStubs();
    patch(Workout, "aggregate", async () => [{ _id: "2026-05-10", count: 2 }]);
    patch(dashboardModels.FocusSession, "aggregate", async () => [{ _id: "2026-05-10", totalMinutes: 30 }]);
    patch(LearningSession, "aggregate", async () => [
      { _id: "2026-05-10", learningMinutes: 40, learningSessions: 2, completedLearningSessions: 1 },
    ]);
    patch(Income, "aggregate", async () => [{ _id: "2026-05-10", count: 1 }]);
    patch(Expense, "aggregate", async () => [{ _id: "2026-05-10", count: 2 }]);

    const res = jsonResponse();
    await dashboardController.getWeeklyStats({ userId: "507f1f77bcf86cd799439012" }, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.meta.timezone, "Asia/Dhaka");
    assert.strictEqual(Array.isArray(res.body.data), true);
    assert.strictEqual(res.body.data.length, 7);
    const d = res.body.data.find((row) => row.date === "2026-05-10");
    assert.strictEqual(d.workouts, 2);
    assert.strictEqual(d.focusMinutes, 30);
    assert.strictEqual(d.learningMinutes, 40);
    assert.strictEqual(d.learningSessions, 2);
    assert.strictEqual(d.completedLearningSessions, 1);
    assert.strictEqual(d.moneyActivities, 3);
  });

  it("GET /api/dashboard/monthly-overview defaults to current month and handles specific month/year", async () => {
    installZeroDataStubs();
    patch(monthlyIncomeService, "getMonthlyIncomeOrDefault", async () => ({
      salaryIncome: 150,
      externalIncome: 50,
      totalIncome: 200,
    }));
    patch(Expense, "aggregate", async () => [{ _id: null, total: 100 }]);
    patch(Workout, "aggregate", async () => [{ _id: null, total: 10 }]);
    patch(dashboardModels.FocusSession, "aggregate", async () => [{ _id: null, total: 500 }]);

    const defaultRes = jsonResponse();
    await dashboardController.getMonthlyOverview({ userId: "507f1f77bcf86cd799439013", query: {} }, defaultRes);
    assert.strictEqual(defaultRes.statusCode, 200);
    assert.strictEqual(defaultRes.body.success, true);
    assert.strictEqual(typeof defaultRes.body.data.selectedMonth.month, "number");
    assert.strictEqual(defaultRes.body.data.money.income, 200);
    assert.strictEqual(defaultRes.body.data.money.expense, 100);

    const specificRes = jsonResponse();
    await dashboardController.getMonthlyOverview(
      { userId: "507f1f77bcf86cd799439013", query: { month: "5", year: "2026" } },
      specificRes,
    );
    assert.strictEqual(specificRes.statusCode, 200);
    assert.strictEqual(specificRes.body.data.selectedMonth.month, 5);
    assert.strictEqual(specificRes.body.data.selectedMonth.year, 2026);
  });

  it("GET /api/dashboard/monthly-history enforces limit and returns descending months", async () => {
    installZeroDataStubs();
    const badRes = jsonResponse();
    await dashboardController.getMonthlyHistory(
      { userId: "507f1f77bcf86cd799439014", query: { limit: "25" } },
      badRes,
    );
    assert.strictEqual(badRes.statusCode, 400);
    assert.strictEqual(badRes.body.field, "limit");

    const goodRes = jsonResponse();
    await dashboardController.getMonthlyHistory(
      { userId: "507f1f77bcf86cd799439014", query: { limit: "3" } },
      goodRes,
    );
    assert.strictEqual(goodRes.statusCode, 200);
    assert.strictEqual(goodRes.body.success, true);
    assert.strictEqual(goodRes.body.data.length, 3);
    assert.strictEqual(typeof goodRes.body.data[0].totalLearningMinutes, "number");
    assert.strictEqual(typeof goodRes.body.data[0].totalLearningSessions, "number");
    assert.strictEqual(typeof goodRes.body.data[0].completedLearningSessions, "number");
    assert.ok(
      `${goodRes.body.data[0].year}-${goodRes.body.data[0].month}` >=
        `${goodRes.body.data[1].year}-${goodRes.body.data[1].month}`,
    );
  });

  it("returns 400 validation shape for invalid month/year", async () => {
    installZeroDataStubs();
    const monthRes = jsonResponse();
    await dashboardController.getMonthlyOverview(
      { userId: "507f1f77bcf86cd799439015", query: { month: "13", year: "2026" } },
      monthRes,
    );
    assert.strictEqual(monthRes.statusCode, 400);
    assert.strictEqual(monthRes.body.success, false);
    assert.strictEqual(monthRes.body.field, "month");

    const yearRes = jsonResponse();
    await dashboardController.getMonthlyOverview(
      { userId: "507f1f77bcf86cd799439015", query: { month: "5", year: "10" } },
      yearRes,
    );
    assert.strictEqual(yearRes.statusCode, 400);
    assert.strictEqual(yearRes.body.field, "year");
  });
});
