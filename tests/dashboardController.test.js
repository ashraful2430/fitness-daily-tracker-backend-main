const assert = require("node:assert");
const { afterEach, describe, it } = require("node:test");

const dashboardController = require("../dist/controllers/dashboardController");
const authMiddleware =
  require("../dist/middleware/authMiddleware").authMiddleware;
const dashboardModels = require("../dist/models/DashboardData");
const WeeklyStats = require("../dist/models/WeeklyStats").default;
const Workout = require("../dist/models/Workout").default;
const analyticsService = require("../dist/services/analyticsService");

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
    clearCookie() {
      return this;
    },
  };
}

function workoutsQueryResult(rows) {
  return {
    sort() {
      return this;
    },
    limit() {
      return this;
    },
    select() {
      return this;
    },
    lean() {
      return Promise.resolve(rows);
    },
  };
}

describe("dashboard routes/controllers", () => {
  afterEach(restorePatches);

  it("unauthenticated middleware returns standardized 401 response", () => {
    const res = jsonResponse();
    let nextCalled = false;

    authMiddleware({ cookies: {} }, res, () => {
      nextCalled = true;
    });

    assert.strictEqual(nextCalled, false);
    assert.strictEqual(res.statusCode, 401);
    assert.deepStrictEqual(res.body, {
      success: false,
      message: "Unauthorized",
    });
  });

  it("GET /api/dashboard creates defaults for first-time user", async () => {
    const userId = "507f1f77bcf86cd799439011";
    const res = jsonResponse();

    patch(dashboardModels.WorkoutStreak, "findOne", () => ({ lean: async () => null }));
    patch(dashboardModels.WorkoutStreak, "create", async () => ({
      userId,
      currentStreak: 0,
      longestStreak: 0,
    }));

    patch(dashboardModels.WaterIntake, "findOne", () => ({ lean: async () => null }));
    patch(dashboardModels.WaterIntake, "create", async () => ({
      userId,
      glassesConsumed: 0,
      goalGlasses: 8,
    }));

    patch(dashboardModels.FocusSession, "findOne", () => ({ lean: async () => null }));
    patch(dashboardModels.FocusSession, "create", async () => ({
      userId,
      totalMinutes: 0,
      sessions: [],
    }));

    patch(dashboardModels.WeeklyGoal, "findOne", () => ({ lean: async () => null }));
    patch(dashboardModels.WeeklyGoal, "create", async () => ({
      userId,
      completedWorkouts: 0,
      goalWorkouts: 5,
      progressPercentage: 0,
    }));

    patch(WeeklyStats, "findOne", () => ({ lean: async () => null }));
    patch(WeeklyStats, "create", async () => ({ _id: "weekly-default" }));

    patch(Workout, "find", () => workoutsQueryResult([]));
    patch(Workout, "aggregate", async () => []);
    patch(dashboardModels.FocusSession, "aggregate", async () => []);
    patch(analyticsService, "getAnalyticsInsights", async () => ({
      perfectDays: 0,
      missedDays: 0,
      bestScore: 0,
      weeklyAverageScore: 0,
      productivityTrend: "stable",
    }));

    await dashboardController.getDashboardData({ userId }, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.workoutStreak.current, 0);
    assert.strictEqual(res.body.data.waterIntake.consumed, 0);
    assert.strictEqual(res.body.data.focusTime.minutes, 0);
    assert.strictEqual(res.body.data.weeklyGoal.percentage, 0);
    assert.strictEqual(Array.isArray(res.body.data.weeklyStats), true);
    assert.strictEqual(res.body.data.weeklyStats.length, 7);
  });

  it("POST updates water/focus/goal and GET dashboard reflects updates", async () => {
    const userId = "507f1f77bcf86cd799439012";
    const res = jsonResponse();

    const store = {
      streak: { userId, currentStreak: 2, longestStreak: 4 },
      water: { userId, glassesConsumed: 0, goalGlasses: 8 },
      focus: { userId, totalMinutes: 0, sessions: [] },
      goal: { userId, completedWorkouts: 0, goalWorkouts: 5, progressPercentage: 0 },
    };

    patch(dashboardModels.WorkoutStreak, "findOne", () => ({ lean: async () => store.streak }));
    patch(dashboardModels.WaterIntake, "findOne", () => ({ lean: async () => store.water }));
    patch(dashboardModels.FocusSession, "findOne", () => ({ lean: async () => store.focus }));
    patch(dashboardModels.WeeklyGoal, "findOne", () => ({ lean: async () => store.goal }));

    patch(dashboardModels.WaterIntake, "findOneAndUpdate", (_q, update) => {
      store.water = { ...store.water, ...update };
      return { lean: async () => store.water };
    });

    patch(dashboardModels.FocusSession, "findOneAndUpdate", (_q, update) => {
      const newSession = update.$push.sessions;
      store.focus.sessions.push(newSession);
      store.focus.totalMinutes += update.$inc.totalMinutes;
      return { lean: async () => store.focus };
    });

    patch(dashboardModels.WeeklyGoal, "findOneAndUpdate", (_q, update) => {
      store.goal = { ...store.goal, ...update };
      return { lean: async () => store.goal };
    });

    patch(WeeklyStats, "findOne", () => ({ lean: async () => ({ _id: "weekly-doc" }) }));
    patch(Workout, "find", () => workoutsQueryResult([]));
    patch(Workout, "aggregate", async () => []);
    patch(dashboardModels.FocusSession, "aggregate", async () => []);
    patch(analyticsService, "getAnalyticsInsights", async () => ({
      perfectDays: 0,
      missedDays: 0,
      bestScore: 0,
      weeklyAverageScore: 0,
      productivityTrend: "stable",
    }));

    const waterRes = jsonResponse();
    await dashboardController.updateWaterIntake(
      { userId, body: { glassesConsumed: 6 } },
      waterRes,
    );
    assert.strictEqual(waterRes.statusCode, 200);

    const focusRes = jsonResponse();
    await dashboardController.logFocusSession(
      {
        userId,
        body: {
          startTime: "2026-05-12T10:00:00.000Z",
          endTime: "2026-05-12T11:00:00.000Z",
          category: "deep-work",
        },
      },
      focusRes,
    );
    assert.strictEqual(focusRes.statusCode, 200);

    const goalRes = jsonResponse();
    await dashboardController.updateWeeklyGoal(
      { userId, body: { completedWorkouts: 3, goalWorkouts: 6 } },
      goalRes,
    );
    assert.strictEqual(goalRes.statusCode, 200);

    await dashboardController.getDashboardData({ userId }, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.data.waterIntake.consumed, 6);
    assert.strictEqual(res.body.data.waterIntake.percentage, 75);
    assert.strictEqual(res.body.data.focusTime.minutes, 60);
    assert.strictEqual(res.body.data.focusTime.sessionsCount, 1);
    assert.strictEqual(res.body.data.weeklyGoal.completed, 3);
    assert.strictEqual(res.body.data.weeklyGoal.percentage, 50);
  });

  it("GET /api/dashboard/weekly-stats returns expected aggregation shape", async () => {
    const userId = "507f1f77bcf86cd799439013";
    const res = jsonResponse();

    patch(WeeklyStats, "findOne", () => ({ lean: async () => ({ _id: "existing-week" }) }));
    patch(Workout, "aggregate", async () => [
      { _id: "2026-05-10", count: 2 },
      { _id: "2026-05-12", count: 1 },
    ]);
    patch(dashboardModels.FocusSession, "aggregate", async () => [
      { _id: "2026-05-10", totalMinutes: 30 },
      { _id: "2026-05-12", totalMinutes: 45 },
    ]);

    await dashboardController.getWeeklyStats({ userId }, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(Array.isArray(res.body.data), true);
    assert.strictEqual(res.body.data.length, 7);

    const may10 = res.body.data.find((d) => d.date === "2026-05-10");
    const may12 = res.body.data.find((d) => d.date === "2026-05-12");
    assert.strictEqual(may10.date, "2026-05-10");
    assert.strictEqual(may10.workouts, 2);
    assert.strictEqual(may10.focusMinutes, 30);
    assert.strictEqual(typeof may10.day, "string");

    assert.strictEqual(may12.date, "2026-05-12");
    assert.strictEqual(may12.workouts, 1);
    assert.strictEqual(may12.focusMinutes, 45);
    assert.strictEqual(typeof may12.day, "string");
  });

  it("POST /api/dashboard/weekly-stats validates and stores totals", async () => {
    const userId = "507f1f77bcf86cd799439014";
    const badRes = jsonResponse();

    await dashboardController.updateWeeklyStats({ userId, body: {} }, badRes);
    assert.strictEqual(badRes.statusCode, 400);
    assert.strictEqual(badRes.body.success, false);
    assert.strictEqual(badRes.body.field, "dailyStats");

    patch(WeeklyStats, "findOneAndUpdate", (_q, update) => ({
      lean: async () => ({ ...update, _id: "weekly-1" }),
    }));

    const goodRes = jsonResponse();
    await dashboardController.updateWeeklyStats(
      {
        userId,
        body: {
          dailyStats: [
            { workouts: 1, focusMinutes: 20 },
            { workouts: 2, focusMinutes: 40 },
          ],
        },
      },
      goodRes,
    );

    assert.strictEqual(goodRes.statusCode, 200);
    assert.strictEqual(goodRes.body.success, true);
    assert.strictEqual(goodRes.body.data.workouts, 3);
    assert.strictEqual(goodRes.body.data.focusMinutes, 60);
  });
});
