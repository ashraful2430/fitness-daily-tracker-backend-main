const assert = require("node:assert");
const { afterEach, describe, it } = require("node:test");

const adminController = require("../dist/controllers/adminController");
const authController = require("../dist/controllers/authController");
const User = require("../dist/models/User").default;
const financeSummaryService = require("../dist/services/canonicalFinanceSummaryService");
const Workout = require("../dist/models/Workout").default;
const LearningSession = require("../dist/models/LearningSession").default;
const Income = require("../dist/models/Income").default;
const Expense = require("../dist/models/Expense").default;
const Savings = require("../dist/models/Savings").default;
const Loan = require("../dist/models/Loan").default;
const Lending = require("../dist/models/Lending").default;
const ScoreSection = require("../dist/models/ScoreSection").ScoreSection;

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
    cookie() {
      return this;
    },
    clearCookie() {
      return this;
    },
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
function chainable(value) {
  return {
    select() {
      return this;
    },
    sort() {
      return this;
    },
    skip() {
      return this;
    },
    limit() {
      return this;
    },
    lean: async () => value,
  };
}

describe("admin APIs + block login", () => {
  afterEach(restorePatches);

  it("GET admin users returns list with paging", async () => {
    patch(User, "find", () =>
      chainable([
        {
          _id: "507f1f77bcf86cd799439011",
          name: "A",
          email: "a@example.com",
          role: "user",
          isBlocked: false,
          loginStreak: 1,
          longestLoginStreak: 2,
        },
      ]),
    );
    patch(User, "countDocuments", async () => 1);

    const res = jsonResponse();
    await adminController.getAdminUsers({ query: {} }, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.length, 1);
    assert.strictEqual(res.body.meta.total, 1);
  });

  it("PATCH role updates user role", async () => {
    patch(User, "findByIdAndUpdate", () =>
      chainable({
        _id: "507f1f77bcf86cd799439011",
        name: "A",
        email: "a@example.com",
        role: "admin",
      }),
    );

    const res = jsonResponse();
    await adminController.updateUserRole(
      {
        params: { userId: "507f1f77bcf86cd799439011" },
        body: { role: "admin" },
      },
      res,
    );

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.data.role, "admin");
  });

  it("PATCH block enforces reason when blocking", async () => {
    const badRes = jsonResponse();
    await adminController.setUserBlockStatus(
      {
        userId: "507f1f77bcf86cd799439099",
        params: { userId: "507f1f77bcf86cd799439011" },
        body: { isBlocked: true },
      },
      badRes,
    );
    assert.strictEqual(badRes.statusCode, 400);
    assert.strictEqual(badRes.body.field, "reason");
  });

  it("GET user summary returns high-level data", async () => {
    patch(User, "findById", () =>
      chainable({
        _id: "507f1f77bcf86cd799439011",
        name: "A",
        email: "a@example.com",
        role: "user",
        isBlocked: false,
      }),
    );
    patch(Workout, "countDocuments", async () => 5);
    patch(LearningSession, "countDocuments", async () => 2);
    patch(ScoreSection, "countDocuments", async () => 1);
    patch(Income, "aggregate", async () => [{ _id: null, total: 1000 }]);
    patch(Expense, "aggregate", async () => [{ _id: null, total: 400 }]);
    patch(Savings, "aggregate", async () => [{ _id: null, total: 200 }]);
    patch(Loan, "aggregate", async () => [{ _id: null, active: 1, total: 3 }]);
    patch(Lending, "aggregate", async () => [{ _id: null, active: 2, total: 4 }]);
    patch(financeSummaryService, "getCanonicalFinanceSummary", async () => ({
      availableBalance: 500,
      loanDebt: 150,
    }));

    const res = jsonResponse();
    await adminController.getUserAdminSummary(
      { params: { userId: "507f1f77bcf86cd799439011" } },
      res,
    );

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.summary.finance.availableBalance, 500);
  });

  it("blocked user cannot login and gets reason", async () => {
    patch(User, "findOne", async () => ({
      _id: "507f1f77bcf86cd799439011",
      email: "a@example.com",
      password: "hashed",
      isBlocked: true,
      blockedReason: "Violation of terms",
    }));

    const res = jsonResponse();
    await authController.login(
      { body: { email: "a@example.com", password: "x" } },
      res,
    );
    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.message, "Violation of terms");
  });

  it("register saves optional profile fields", async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";
    patch(User, "findOne", async () => null);
    patch(User, "create", async (payload) => ({
      _id: { toString: () => "507f1f77bcf86cd799439011" },
      name: payload.name,
      email: payload.email,
      role: payload.role,
      gender: payload.gender,
      occupation: payload.occupation,
      loginStreak: payload.loginStreak,
      longestLoginStreak: payload.longestLoginStreak,
      lastLoginDate: payload.lastLoginDate,
    }));

    const res = jsonResponse();
    await authController.register(
      {
        body: {
          name: "Ashik",
          email: "ashik@example.com",
          password: "password123",
          gender: " male ",
          occupation: " Student ",
        },
      },
      res,
    );

    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.body.data.gender, "male");
    assert.strictEqual(res.body.data.occupation, "Student");
  });

  it("me returns empty profile strings for older users", async () => {
    patch(User, "findById", () =>
      chainable({
        _id: "507f1f77bcf86cd799439011",
        name: "Legacy",
        email: "legacy@example.com",
        role: "user",
        loginStreak: 1,
        longestLoginStreak: 1,
        lastLoginDate: null,
      }),
    );

    const res = jsonResponse();
    await authController.me({ userId: "507f1f77bcf86cd799439011" }, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.data.gender, "");
    assert.strictEqual(res.body.data.occupation, "");
  });
});
