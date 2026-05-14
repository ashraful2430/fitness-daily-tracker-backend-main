const assert = require("node:assert");
const { afterEach, describe, it } = require("node:test");

const controller = require("../dist/controllers/learningController");
const service = require("../dist/services/learningService");

const originals = [];
function patch(target, key, value) {
  originals.push([target, key, target[key]]);
  target[key] = value;
}
function restorePatches() {
  while (originals.length) {
    const [t, k, v] = originals.pop();
    t[k] = v;
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

describe("learning v2 APIs", () => {
  afterEach(restorePatches);

  it("creates a learning session", async () => {
    patch(service, "createSession", async () => ({ _id: "s1", title: "A" }));
    const r = res();
    await controller.createLearningSession(
      {
        userId: "u1",
        body: {
          learnerMode: "student",
          title: "A",
          subject: "Math",
          plannedMinutes: 30,
          studyDate: "2026-05-14",
        },
      },
      r,
    );
    assert.strictEqual(r.statusCode, 201);
    assert.strictEqual(r.body.success, true);
  });

  it("starts then pauses then completes session", async () => {
    patch(service, "startSession", async () => ({ _id: "s1", status: "active" }));
    patch(service, "pauseSession", async () => ({ _id: "s1", status: "paused" }));
    patch(service, "completeSession", async () => ({ _id: "s1", status: "completed", actualMinutes: 40 }));

    const startRes = res();
    await controller.startLearningSession({ userId: "u1", params: { id: "s1" } }, startRes);
    assert.strictEqual(startRes.statusCode, 200);
    assert.strictEqual(startRes.body.data.status, "active");

    const pauseRes = res();
    await controller.pauseLearningSession({ userId: "u1", params: { id: "s1" } }, pauseRes);
    assert.strictEqual(pauseRes.statusCode, 200);
    assert.strictEqual(pauseRes.body.data.status, "paused");

    const completeRes = res();
    await controller.completeLearningSession({ userId: "u1", params: { id: "s1" }, body: {} }, completeRes);
    assert.strictEqual(completeRes.statusCode, 200);
    assert.strictEqual(completeRes.body.data.status, "completed");
  });

  it("returns stats shape", async () => {
    patch(service, "getStats", async () => ({
      todayMinutes: 10,
      weekMinutes: 50,
      monthMinutes: 120,
      totalMinutes: 300,
      completedSessions: 5,
      activeSessions: 1,
      plannedSessions: 2,
      missedSessions: 1,
      completionRate: 62,
      currentStreak: 3,
      longestStreak: 5,
      averageSessionMinutes: 24,
      subjectBreakdown: [],
      dailyBreakdown: [],
      learningTypeBreakdown: [],
      priorityBreakdown: [],
    }));
    const r = res();
    await controller.getLearningStats({ userId: "u1" }, r);
    assert.strictEqual(r.statusCode, 200);
    assert.strictEqual(r.body.data.totalMinutes, 300);
    assert.strictEqual(Array.isArray(r.body.data.subjectBreakdown), true);
  });

  it("timer preset default protection and create", async () => {
    patch(service, "createTimerPreset", async () => ({ _id: "p1", minutes: 25, label: "Pomodoro" }));
    patch(service, "deleteTimerPreset", async () => null);

    const createRes = res();
    await controller.postLearningTimerPreset({ userId: "u1", body: { label: "Pomodoro", minutes: 25 } }, createRes);
    assert.strictEqual(createRes.statusCode, 201);

    const delRes = res();
    await controller.removeLearningTimerPreset({ userId: "u1", params: { id: "default-id" } }, delRes);
    assert.strictEqual(delRes.statusCode, 400);
  });
});
