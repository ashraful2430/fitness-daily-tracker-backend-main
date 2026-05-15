const assert = require("node:assert");
const { afterEach, describe, it } = require("node:test");

const controller = require("../dist/controllers/fitnessController");
const service = require("../dist/services/fitnessService");

const originals = [];
function patch(target, key, value) {
  originals.push([target, key, target[key]]);
  target[key] = value;
}
function restorePatches() {
  while (originals.length) {
    const [target, key, value] = originals.pop();
    target[key] = value;
  }
}
function res() {
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

const workoutId = "507f1f77bcf86cd799439011";

describe("fitness APIs", () => {
  afterEach(restorePatches);

  it("creates a workout", async () => {
    patch(service, "createWorkout", async () => ({ id: workoutId, title: "Run" }));
    const r = res();
    await controller.createFitnessWorkout(
      { userId: "507f1f77bcf86cd799439099", body: { title: "Run" } },
      r,
    );
    assert.strictEqual(r.statusCode, 201);
    assert.strictEqual(r.body.success, true);
    assert.strictEqual(r.body.data.title, "Run");
  });

  it("starts and completes a workout", async () => {
    patch(service, "setWorkoutStatus", async (_userId, _id, status) => ({
      id: workoutId,
      status,
    }));

    const startRes = res();
    await controller.startFitnessWorkout(
      { userId: "507f1f77bcf86cd799439099", params: { id: workoutId } },
      startRes,
    );
    assert.strictEqual(startRes.statusCode, 200);
    assert.strictEqual(startRes.body.data.status, "active");

    const completeRes = res();
    await controller.completeFitnessWorkout(
      { userId: "507f1f77bcf86cd799439099", params: { id: workoutId } },
      completeRes,
    );
    assert.strictEqual(completeRes.statusCode, 200);
    assert.strictEqual(completeRes.body.data.status, "completed");
  });

  it("skips a workout", async () => {
    patch(service, "setWorkoutStatus", async () => ({ id: workoutId, status: "skipped" }));
    const r = res();
    await controller.skipFitnessWorkout(
      { userId: "507f1f77bcf86cd799439099", params: { id: workoutId } },
      r,
    );
    assert.strictEqual(r.statusCode, 200);
    assert.strictEqual(r.body.data.status, "skipped");
  });

  it("returns stats", async () => {
    patch(service, "getFitnessStats", async () => ({
      completedWorkoutsToday: 1,
      caloriesThisWeek: 500,
      weeklyGoalProgress: 25,
      workoutTypeBreakdown: [],
    }));
    const r = res();
    await controller.getFitnessStats({ userId: "507f1f77bcf86cd799439099" }, r);
    assert.strictEqual(r.statusCode, 200);
    assert.strictEqual(r.body.data.completedWorkoutsToday, 1);
  });

  it("gets and updates goals", async () => {
    patch(service, "getFitnessGoal", async () => ({ weeklyWorkoutTarget: 4 }));
    patch(service, "upsertFitnessGoal", async () => ({ weeklyWorkoutTarget: 5 }));

    const getRes = res();
    await controller.getFitnessGoals({ userId: "507f1f77bcf86cd799439099" }, getRes);
    assert.strictEqual(getRes.statusCode, 200);
    assert.strictEqual(getRes.body.data.weeklyWorkoutTarget, 4);

    const putRes = res();
    await controller.putFitnessGoals(
      { userId: "507f1f77bcf86cd799439099", body: { weeklyWorkoutTarget: 5 } },
      putRes,
    );
    assert.strictEqual(putRes.statusCode, 200);
    assert.strictEqual(putRes.body.data.weeklyWorkoutTarget, 5);
  });

  it("creates recovery checks", async () => {
    patch(service, "createRecoveryCheck", async () => ({
      id: "rec-1",
      recommendation: "Take a rest day",
    }));
    const r = res();
    await controller.createRecoveryCheck(
      { userId: "507f1f77bcf86cd799439099", body: { checkDate: "2026-05-15" } },
      r,
    );
    assert.strictEqual(r.statusCode, 201);
    assert.match(r.body.data.recommendation, /rest/i);
  });
});
