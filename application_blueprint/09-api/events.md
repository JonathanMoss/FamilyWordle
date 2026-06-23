# FamilyWordle Backend Domain Events

This document defines the backend events emitted by the system during execution. These events are used for structured application logs, auditing, gameplay analysis, and telemetry.

---

## 1. Authentication Events

### PlayerRegistered
* **Trigger**: A new player account is created.
* **Payload**:
  ```json
  {
    "event_type": "PlayerRegistered",
    "timestamp": "2026-06-23T13:20:00Z",
    "username": "Jon",
    "role": "player"
  }
  ```

### PlayerAuthenticated
* **Trigger**: A player successfully signs in.
* **Payload**:
  ```json
  {
    "event_type": "PlayerAuthenticated",
    "timestamp": "2026-06-23T13:21:00Z",
    "username": "Jon",
    "session_id": "uuid-v4-string"
  }
  ```

### PlayerAuthenticationFailed
* **Trigger**: A sign-in attempt fails.
* **Payload**:
  ```json
  {
    "event_type": "PlayerAuthenticationFailed",
    "timestamp": "2026-06-23T13:21:05Z",
    "username": "Jon",
    "reason": "Incorrect PIN | User does not exist | Account disabled"
  }
  ```

---

## 2. Gameplay Events

### DailyGameStarted
* **Trigger**: A player opens the dashboard and starts the daily word game.
* **Payload**:
  ```json
  {
    "event_type": "DailyGameStarted",
    "timestamp": "2026-06-23T13:21:10Z",
    "username": "Jon",
    "date": "2026-06-23"
  }
  ```

### GuessSubmitted
* **Trigger**: A player submits a guess.
* **Payload**:
  ```json
  {
    "event_type": "GuessSubmitted",
    "timestamp": "2026-06-23T13:22:00Z",
    "username": "Jon",
    "date": "2026-06-23",
    "guess": "SLATE",
    "attempt_number": 1,
    "feedback": ["absent", "absent", "correct", "present", "absent"],
    "is_correct": false
  }
  ```

### DailyGameWon
* **Trigger**: A player guesses the daily word correctly.
* **Payload**:
  ```json
  {
    "event_type": "DailyGameWon",
    "timestamp": "2026-06-23T13:23:00Z",
    "username": "Jon",
    "date": "2026-06-23",
    "attempts_used": 3
  }
  ```

### DailyGameLost
* **Trigger**: A player uses all 6 guesses without finding the word.
* **Payload**:
  ```json
  {
    "event_type": "DailyGameLost",
    "timestamp": "2026-06-23T13:25:00Z",
    "username": "Jon",
    "date": "2026-06-23",
    "guesses": ["SLATE", "CHAIR", "ROUND", "LIGHT", "CRUST", "FIGHT"]
  }
  ```

---

## 3. System & Administration Events

### DailyWordSelected
* **Trigger**: The daily scheduler executes at 00:01 and selects the day's target word.
* **Payload**:
  ```json
  {
    "event_type": "DailyWordSelected",
    "timestamp": "2026-06-24T00:01:00Z",
    "date": "2026-06-24",
    "target_word": "CRANE" // Logged with high-privilege level (only visible to admin audit logs)
  }
  ```

### DailyGameRollover
* **Trigger**: The daily game active window closes at 00:01, archiving the current word and updating statistics.
* **Payload**:
  ```json
  {
    "event_type": "DailyGameRollover",
    "timestamp": "2026-06-24T00:01:00Z",
    "archived_word": "CRANE",
    "active_players_count": 5
  }
  ```

### PlayerStatusUpdated
* **Trigger**: An administrator updates a player account status.
* **Payload**:
  ```json
  {
    "event_type": "PlayerStatusUpdated",
    "timestamp": "2026-06-23T13:30:00Z",
    "admin_username": "Alice",
    "target_username": "Jon",
    "field_changed": "status | role",
    "old_value": "active",
    "new_value": "disabled"
  }
  ```
