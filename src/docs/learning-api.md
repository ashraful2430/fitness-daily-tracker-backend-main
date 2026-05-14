# Learning API (Planify Life)

Base path: `/api/learning`  
Auth: cookie/JWT via `authMiddleware`  
Response success:
`{ "success": true, "message": "Operation successful", "data": {} }`  
Response error:
`{ "success": false, "message": "Error message", "errors": [] }`

## Sessions
- `GET /sessions?status=&subject=&learnerMode=&studyDate=&fromDate=&toDate=&page=1&limit=20`
- `POST /sessions`
- `GET /sessions/:id`
- `PATCH /sessions/:id`
- `DELETE /sessions/:id`
- `POST /sessions/:id/start`
- `POST /sessions/:id/pause`
- `POST /sessions/:id/resume`
- `POST /sessions/:id/complete`
- `POST /sessions/:id/cancel`
- `POST /sessions/:id/reschedule`

Create session example:
```json
{
  "learnerMode": "student",
  "title": "Math Practice",
  "subject": "Math",
  "goal": "Revise calculus",
  "plannedMinutes": 45,
  "studyDate": "2026-05-14",
  "learningType": "practice",
  "difficulty": "medium",
  "priority": "high",
  "tags": ["exam", "chapter-3"],
  "status": "planned"
}
```

## Timer Presets
- `GET /timer-presets`
- `POST /timer-presets`
- `PATCH /timer-presets/:id`
- `DELETE /timer-presets/:id` (default presets cannot be deleted)

## Templates
- `GET /templates`
- `POST /templates`

## Goals
- `GET /goals`
- `PUT /goals`

## Stats
- `GET /stats`
Returns:
`todayMinutes, weekMinutes, monthMinutes, totalMinutes, completedSessions, activeSessions, plannedSessions, missedSessions, completionRate, currentStreak, longestStreak, averageSessionMinutes, subjectBreakdown, dailyBreakdown, learningTypeBreakdown, priorityBreakdown`

## Child Controls
- `GET /child-controls`
- `PUT /child-controls`

Child controls update example:
```json
{
  "parentPin": "1234",
  "dailyLimitMinutes": 120,
  "rewardPointsEnabled": true,
  "allowedSubjects": ["Math", "English"]
}
```

## Notes
- `GET /sessions/:id/notes`
- `POST /sessions/:id/notes`
- `PATCH /notes/:noteId`
- `DELETE /notes/:noteId`
