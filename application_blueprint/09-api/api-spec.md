# FamilyWordle API Specification

This document details the REST API endpoints exposed by the Flask backend for communication with the client frontend.

---

## Authentication Endpoints

### 1. Register Player
* **Endpoint**: `POST /api/auth/register`
* **Description**: Register a new player account.
* **Request Header**: `Content-Type: application/json`
* **Request Body**:
  ```json
  {
    "username": "string (1-10 chars, alphanumeric)",
    "pin": "string (exactly 4 numeric digits)"
  }
  ```
* **Responses**:
  * **201 Created**:
    ```json
    {
      "message": "Player registered successfully",
      "username": "Jon"
    }
    ```
  * **400 Bad Request** (validation fails):
    ```json
    {
      "error": "Validation failed",
      "details": "PIN must be exactly 4 digits"
    }
    ```
  * **409 Conflict** (username already taken):
    ```json
    {
      "error": "Player Name already registered"
    }
    ```

### 2. Login Player
* **Endpoint**: `POST /api/auth/login`
* **Description**: Authenticate a player and establish a session.
* **Request Header**: `Content-Type: application/json`
* **Request Body**:
  ```json
  {
    "username": "string",
    "pin": "string"
  }
  ```
* **Responses**:
  * **200 OK**:
    ```json
    {
      "message": "Signed in successfully",
      "username": "Jon",
      "role": "player" // or "admin"
    }
    ```
  * **401 Unauthorized**:
    ```json
    {
      "error": "Incorrect PIN" // or "User does not exist" or "Account disabled"
    }
    ```

### 3. Logout Player
* **Endpoint**: `POST /api/auth/logout`
* **Description**: Clear the player session.
* **Responses**:
  * **200 OK**:
    ```json
    {
      "message": "Signed out successfully"
    }
    ```

---

## Gameplay Endpoints

### 4. Get Current Daily Game State
* **Endpoint**: `GET /api/game/state`
* **Description**: Retrieves the active game state for the signed-in player.
* **Responses**:
  * **200 OK**:
    ```json
    {
      "status": "not_started | playing | won | lost | expired",
      "attempts_used": 3,
      "max_attempts": 6,
      "guesses": [
        {
          "word": "SLATE",
          "feedback": ["absent", "absent", "correct", "present", "absent"]
        }
      ],
      "target_word": "CRANE", // ONLY provided if status is "won", "lost", or "expired"
      "definition": "(noun) A large bird...", // ONLY provided if status is "won", "lost", or "expired" (or null if API lookup failed)
      "remaining_seconds": 38400, // time left until rollover at 00:01 Europe/London
      "clue": "string | null", // optional clue submitted by the first solver
      "is_first_solver": false // true if the player is the first solver today
    }
    ```
  * **401 Unauthorized**:
    ```json
    {
      "error": "Authentication required"
    }
    ```

### 5. Submit Guess
* **Endpoint**: `POST /api/game/guess`
* **Description**: Submit a 5-letter guess for the current daily word.
* **Request Body**:
  ```json
  {
    "guess": "string (exactly 5 letters)"
  }
  ```
* **Responses**:
  * **200 OK**:
    ```json
    {
      "status": "playing | won | lost | expired",
      "feedback": ["correct", "absent", "present", "absent", "absent"],
      "attempts_used": 4,
      "target_word": "CRANE", // ONLY provided if game transitions to "won", "lost", or "expired"
      "definition": "(noun) A large bird...", // ONLY provided if game transitions to "won", "lost", or "expired"
      "is_first_solver": false // true if this guess won today's daily game first
    }
    ```
  * **400 Bad Request** (Invalid guess word, non-dictionary, incorrect length):
    ```json
    {
      "error": "Invalid guess",
      "details": "Word not in permitted word list"
    }
    ```
  * **403 Forbidden** (Game already completed or expired):
    ```json
    {
      "error": "Game finished"
    }
    ```

---

## Demo Mode Endpoints

### 6. Get Demo Game State
* **Endpoint**: `GET /api/game/demo/state`
* **Description**: Get the state of the active demo game. (Requires session, but uses isolated data).
* **Responses**:
  * **200 OK** (same structure as `/api/game/state` but isolation enforced)

### 7. Submit Demo Guess
* **Endpoint**: `POST /api/game/demo/guess`
* **Description**: Submit a guess in demo mode.

### 8. Reset Demo Game
* **Endpoint**: `POST /api/game/demo/reset`
* **Description**: Clear the current demo session to allow replaying. Optionally sets a custom target word or requests a random word from the dictionary.
* **Request Body**:
  ```json
  {
    "word": "string (5 letters) | RANDOM (optional)",
    "date": "string (YYYY-MM-DD) | null (optional)"
  }
  ```
* **Responses**:
  * **200 OK**:
    ```json
    {
      "message": "Demo reset successfully"
    }
    ```
  * **400 Bad Request** (validation fails):
    ```json
    {
      "error": "Invalid target word"
    }
    ```

### 9. Get Permitted Words
* **Endpoint**: `GET /api/game/dictionary`
* **Description**: Retrieve the complete list of valid 5-letter words from the permitted dictionary list, used client-side by the spectator bot solver.
* **Responses**:
  * **200 OK**:
    ```json
    {
      "words": ["CRANE", "SLATE", "LEARN", "TIGER", "HOUSE"]
    }
    ```

---

## Statistics & Archive Endpoints

### 9. Get Player Statistics
* **Endpoint**: `GET /api/stats`
* **Description**: Retrieve personal history stats for the signed-in player.
* **Responses**:
  * **200 OK**:
    ```json
    {
      "games_played": 15,
      "games_won": 12,
      "win_percentage": 80.0,
      "average_attempts": 4.2,
      "current_streak": 5,
      "max_streak": 8,
      "history": [
        {
          "date": "2026-06-21",
          "word": "CRANE",
          "attempts": 4,
          "result": "win"
        }
      ]
    }
    ```

### 10. Get League Rankings
* **Endpoint**: `GET /api/stats/league`
* **Description**: Get the rankings table. Displays only active registered users.
* **Responses**:
  * **200 OK**:
    ```json
    {
      "rankings": [
        {
          "rank": 1,
          "username": "Alice",
          "games_played": 15,
          "games_won": 13,
          "average_attempts": 3.8,
          "current_streak": 7
        },
        {
          "rank": 2,
          "username": "Jon",
          "games_played": 15,
          "games_won": 12,
          "average_attempts": 4.2,
          "current_streak": 5
        }
      ]
    }
    ```

### 11. Get Word Archive
* **Endpoint**: `GET /api/archive`
* **Description**: Retrieve chronological list of past words. Today's daily word is excluded.
* **Responses**:
  * **200 OK**:
    ```json
    {
      "archive": [
        { "date": "2026-06-21", "word": "CRANE" },
        { "date": "2026-06-22", "word": "SLATE" }
      ]
    }
    ```

---

## User Administration Endpoints (Admin Only)

### 12. List Player Accounts
* **Endpoint**: `GET /api/admin/players`
* **Responses**:
  * **200 OK**:
    ```json
    {
      "players": [
        { "id": 1, "username": "Jon", "role": "player", "status": "active" },
        { "id": 2, "username": "Alice", "role": "admin", "status": "disabled" }
      ]
    }
    ```

### 13. Update Player Role or Status
* **Endpoint**: `PUT /api/admin/players/<username>`
* **Request Body**:
  ```json
  {
    "status": "active | disabled | removed",
    "role": "player | admin"
  }
  ```
* **Responses**:
  * **200 OK**:
    ```json
    {
      "message": "Player updated successfully"
    }
    ```

---

## Clue Endpoints

### 14. Submit Daily Clue
* **Endpoint**: `POST /api/game/clue`
* **Description**: Submit a short hint or clue for today's daily word. Only valid for the first solver who won today.
* **Request Header**: `Content-Type: application/json`
* **Request Body**:
  ```json
  {
    "clue": "string (1-100 characters)"
  }
  ```
* **Responses**:
  * **200 OK**:
    ```json
    {
      "status": "success",
      "clue": "Today is a head scratcher!"
    }
    ```
  * **400 Bad Request** (validation fails - empty or too long):
    ```json
    {
      "error": "Clue is too long (maximum 100 characters)"
    }
    ```
  * **403 Forbidden** (user has not solved the game yet, or is not the first solver):
    ```json
    {
      "error": "You must win today's game to submit a clue"
    }
    ```

