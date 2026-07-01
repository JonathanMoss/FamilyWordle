# Family Wordle

Family Wordle is a clean, modern, and beautiful multiplayer Wordle clone designed for families. All players compete to guess the same daily 5-letter word, with progress tracked on a shared league table.

The application features a dark-themed glassmorphic UI, structured database storage using SQLModel and SQLite, and support for administrative user management.

---

## 🎮 Game Rules

* **Player Registration**: Players register with a unique nickname and a 4-digit numeric PIN. No email or personal data is collected.
* **Daily Word Rollover**: A new 5-letter target word is selected every day at **00:01 Europe/London time**. The previous day's game closes at this time and cannot be continued.
* **Shared Daily Word**: Only one daily word exists per calendar day, and all players receive the same word. Once a word has been played, it is archived and will not be reused.
* **Attempts**: Players have a maximum of **6 attempts** to guess the daily word.
* **Permitted Words**: All guesses must be valid 5-letter words from the dictionary list configured in [data/words.txt]
* **Self-Healing Fallback**: If the word list is completely exhausted (all words have been played and archived), the system automatically purges archive entries older than 30 days to recycle words, ensuring continuous uptime.
* **League Table Ranking**: Players are ranked publicly on a league table based on three criteria (in order of priority):
  1. **Wins**: Total number of daily games won.
  2. **Average Turns**: Fewer average attempts per completed game ranks higher.
  3. **Current Streak**: Consecutive days of completed daily games (resets if a day is missed).
* **Practice Mode, Replays & Spectator Bot**: Unregistered or signed-out users can play a demo game to practice. Demo mode also includes an interactive **Spectator Bot Autoplay** that uses a letter-frequency solver heuristic to automatically type and solve random words step-by-step. Signed-in players can browse the Chronological Archive and click "Play" to replay any past daily word in an isolated sandbox. Replay games do not affect official statistics, active streaks, or the daily game state.
* **Daily Clue/Prompt**: The first player to solve today's daily word is given the option to input a short clue or hint (up to 100 characters) for the rest of the family. This clue is then displayed to all other players when they play today's game.
* **Daily Word Definition**: To help players expand their vocabulary or learn obscure target words, the system automatically fetches a definition from the Free Dictionary API once per day when the word is generated. This definition is kept secret during gameplay and is only revealed to a player via a toggleable "Define Word" button once they complete their daily game (win or loss).

---

## 👤 User & Admin Roles

* **Player (Standard User)**: Can register, sign in using their nickname and PIN, play the daily game, view the public league table, check their own historical statistics, browse the chronological archive of previously played daily words (with words blurred by default to prevent spoilers), and replay past daily words in an isolated practice mode.
* **Administrator**: Has access to a user administration panel to view, update, disable/enable, or soft-remove player accounts.

---

## 🛠️ Getting Started

### Prerequisites
* Python 3.13 (if running locally without Docker)
* Docker & Docker Compose (if running containerized)

---

### Option A: Local Development (Without Docker)

1. **Set up a Virtual Environment**:
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   ```

2. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure Environment Variables & Run**:
   ```bash
   export PYTHONPATH=.
   export FLASK_APP=src.app:create_app
   export FLASK_DEBUG=1
   export SECRET_KEY="dev-secret-key-12345"
   export ADMIN_USERNAME="admin"
   export ADMIN_PIN="1234"
   
   flask run --port=5000
   ```
   *The application will be accessible at `http://127.0.0.1:5000`.*
   *On startup, the system will automatically seed an administrator account with the `ADMIN_USERNAME` and `ADMIN_PIN` specified.*

4. **Bootstrap Admin via CLI (Alternative)**:
   If you want to manually create an admin account outside of automatic startup seeding, use the custom Flask CLI command:
   ```bash
   flask create-admin <username> <4-digit-pin>
   ```

---

### Option B: Running with Docker

We offer two Docker Compose configurations depending on your environment.

#### 1. Local Development Mode (No NGINX, Hot-Reloading)
This runs the web container directly, maps the host port `5000` to container port `5000`, and binds the local workspace directory as a volume for hot-reloading code changes.

```bash
docker compose -f docker-compose.dev.yml up -d
```
* **Host Port**: `5000` (Access at `http://localhost:5000`)
* **Default Seeding**: Automatically seeds an administrator account with username `admin` and PIN `1234`.

#### 2. Production Mode (With NGINX Reverse Proxy)
This runs the application using a Gunicorn WSGI server and puts it behind an NGINX reverse proxy container on port `80`.

1. Create a local `.env` file in the root directory (this is ignored by Git):
   ```env
   ADMIN_USERNAME=my_prod_admin
   ADMIN_PIN=5678
   SECRET_KEY=a-secure-production-secret-key
   ```
2. Start the production containers:
   ```bash
   docker compose up -d
   ```
* **Host Port**: `80` (Access at `http://localhost`)
* **Secrets**: Environment variables are passed through securely from your host `.env` file and are not baked into the image or committed to source control.

To stop the containers:
```bash
docker compose down
# or for dev mode:
docker compose -f docker-compose.dev.yml down
```

---

## 🧪 Running Tests & Code Quality Checks

All verification checks can be run inside the Docker container to ensure system python dependencies and libraries are isolated correctly.

### 1. Run the Test Suite
Runs all unit and BDD (Behavior Driven Development) scenario tests:
```bash
docker compose run --rm web pytest
```
*(Alternatively, if running locally in your .venv: `PYTHONPATH=. pytest`)*

### 2. Run Code Linting
Checks code style and linting standards using Pylint:
```bash
docker compose run --rm web pylint src/
```

### 3. Run Pre-Push Checks
This script mirrors the git pre-push hook configuration and runs both pylint and pytest:
```bash
./run_checks.sh
```
