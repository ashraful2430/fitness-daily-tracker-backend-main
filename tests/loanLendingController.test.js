const assert = require("node:assert");
const { afterEach, describe, it } = require("node:test");
const mongoose = require("mongoose");

const controller = require("../dist/controllers/loanLendingController");
const BalanceAccount = require("../dist/models/BalanceAccount").default;
const BalanceRecord = require("../dist/models/BalanceRecord").default;
const Lending = require("../dist/models/Lending").default;
const LoanDebt = require("../dist/models/LoanDebt").default;

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

function mockSession() {
  return {
    async withTransaction(fn) {
      return fn();
    },
    endSession() {},
  };
}

function aggregateResult(value) {
  return {
    session() {
      return Promise.resolve(value);
    },
  };
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

describe("loan/lending controller", () => {
  afterEach(restorePatches);

  it("PERSONAL lending insufficient balance returns field error", async () => {
    patch(mongoose, "startSession", async () => mockSession());
    patch(BalanceAccount, "aggregate", () => aggregateResult([{ total: 25 }]));
    patch(Lending, "create", async () => {
      throw new Error("Lending should not be created");
    });

    const res = jsonResponse();

    await controller.createLending(
      {
        userId: "user-1",
        body: {
          personName: "Rafi",
          amount: 100,
          fundingSource: "PERSONAL",
          date: "2026-05-11",
        },
      },
      res,
    );

    assert.strictEqual(res.statusCode, 400);
    assert.deepStrictEqual(res.body, {
      success: false,
      message: "You do not have enough balance to lend this amount.",
      field: "amount",
    });
  });

  it("BORROWED lending creates exactly one linked loan", async () => {
    patch(mongoose, "startSession", async () => mockSession());

    let loanCreateCount = 0;
    let lendingCreateCount = 0;
    let linkedLoanUpdate;

    patch(LoanDebt, "create", async (docs) => {
      loanCreateCount += 1;
      assert.strictEqual(docs.length, 1);
      assert.strictEqual(docs[0].personName, "Karim");
      assert.strictEqual(docs[0].reason, "Bridge loan");
      return [{ ...docs[0], _id: "loan-1", paidAmount: 0 }];
    });
    patch(Lending, "create", async (docs) => {
      lendingCreateCount += 1;
      assert.strictEqual(docs.length, 1);
      assert.strictEqual(docs[0].personName, "Rafi");
      assert.strictEqual(docs[0].fundingSource, "BORROWED");
      assert.strictEqual(docs[0].linkedLoanId, "loan-1");
      return [{ ...docs[0], _id: "lending-1", repaidAmount: 0 }];
    });
    patch(LoanDebt, "findOneAndUpdate", async (query, update) => {
      linkedLoanUpdate = { query, update };
    });

    const res = jsonResponse();

    await controller.createLending(
      {
        userId: "user-1",
        body: {
          personName: "Rafi",
          amount: 100,
          fundingSource: "BORROWED",
          borrowedFromName: "Karim",
          borrowReason: "Bridge loan",
          date: "2026-05-11",
        },
      },
      res,
    );

    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(loanCreateCount, 1);
    assert.strictEqual(lendingCreateCount, 1);
    assert.deepStrictEqual(linkedLoanUpdate, {
      query: { _id: "loan-1" },
      update: { linkedLendingId: "lending-1" },
    });
  });

  it("BORROWED lending repayment reduces linked loan debt", async () => {
    patch(mongoose, "startSession", async () => mockSession());
    patch(BalanceAccount, "aggregate", () => aggregateResult([{ total: 0 }]));
    patch(BalanceRecord, "findOneAndUpdate", async () => ({}));

    const lending = {
      _id: "lending-1",
      userId: "user-1",
      amount: 100,
      repaidAmount: 20,
      fundingSource: "BORROWED",
      linkedLoanId: "loan-1",
      status: "PARTIALLY_REPAID",
      async save() {},
    };
    const loan = {
      _id: "loan-1",
      userId: "user-1",
      amount: 100,
      paidAmount: 20,
      status: "PARTIALLY_PAID",
      async save() {},
    };

    patch(Lending, "findOne", () => ({
      session: async () => lending,
    }));
    patch(LoanDebt, "findOne", () => ({
      session: async () => loan,
    }));

    const res = jsonResponse();

    await controller.repayLending(
      {
        userId: "user-1",
        params: { id: "lending-1" },
        body: { amount: 30 },
      },
      res,
    );

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(lending.repaidAmount, 50);
    assert.strictEqual(lending.status, "PARTIALLY_REPAID");
    assert.strictEqual(loan.paidAmount, 50);
    assert.strictEqual(loan.status, "PARTIALLY_PAID");
  });
});
