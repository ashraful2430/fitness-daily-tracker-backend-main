# Fitness API

All endpoints require the normal authenticated session cookie.

Success shape:

```json
{
  "success": true,
  "message": "Operation successful",
  "data": {}
}
```

Error shape:

```json
{
  "success": false,
  "message": "Error message",
  "errors": []
}
```

## Workouts

`GET /api/fitness/workouts`

Query: `status`, `workoutType`, `goalType`, `intensity`, `bodyPart`, `workoutDate`, `fromDate`, `toDate`, `search`, `page`, `limit`.

`POST /api/fitness/workouts`

```json
{
  "title": "Morning Run",
  "workoutDate": "2026-05-15",
  "workoutType": "running",
  "goalType": "cardio_health",
  "durationMinutes": 30,
  "calories": 300,
  "intensity": "medium",
  "bodyPart": "cardio",
  "distance": 5,
  "steps": 6500,
  "notes": "Easy pace"
}
```

Other workout actions:

- `GET /api/fitness/workouts/:id`
- `PATCH /api/fitness/workouts/:id`
- `DELETE /api/fitness/workouts/:id`
- `POST /api/fitness/workouts/:id/start`
- `POST /api/fitness/workouts/:id/complete`
- `POST /api/fitness/workouts/:id/skip`
- `POST /api/fitness/workouts/:id/cancel`

## Goals

`GET /api/fitness/goals`

`PUT /api/fitness/goals`

```json
{
  "weeklyWorkoutTarget": 4,
  "weeklyActiveMinutesTarget": 150,
  "weeklyCaloriesTarget": 1800,
  "dailyStepsTarget": 8000
}
```

## Templates

`GET /api/fitness/templates`

Returns default templates and custom user templates.

`POST /api/fitness/templates`

```json
{
  "name": "Evening Strength",
  "title": "Evening Strength",
  "workoutType": "strength",
  "goalType": "muscle_gain",
  "durationMinutes": 45,
  "caloriesEstimate": 300,
  "intensity": "hard",
  "bodyPart": "full_body",
  "notesPlaceholder": "Main exercises and weights"
}
```

Custom templates can be updated or deleted:

- `PATCH /api/fitness/templates/:id`
- `DELETE /api/fitness/templates/:id`

Default templates cannot be deleted.

## Recovery

`GET /api/fitness/recovery`

Query: `checkDate`, `fromDate`, `toDate`, `page`, `limit`.

`POST /api/fitness/recovery`

```json
{
  "checkDate": "2026-05-15",
  "sleepQuality": "good",
  "energyLevel": "medium",
  "sorenessLevel": "light",
  "isRestDay": false,
  "waterGlasses": 8
}
```

Other recovery actions:

- `PATCH /api/fitness/recovery/:id`
- `DELETE /api/fitness/recovery/:id`

## Stats

`GET /api/fitness/stats`

Returns completed workout counts, calories, active minutes, streaks, averages, goal progress, and breakdowns.

## Personal Records

`GET /api/fitness/personal-records`

`POST /api/fitness/personal-records/recalculate`
