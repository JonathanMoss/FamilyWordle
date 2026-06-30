"""
Game routes blueprint.
Handles gameplay states, guesses, demo mode, stats, and archive.
"""
# pylint: disable=too-many-return-statements,too-many-locals
import json
import random
from datetime import datetime, time, timedelta, timezone
from flask import Blueprint, request, jsonify, session
from sqlmodel import Session, select
from src.app import get_engine
from src.app.decorators import login_required
from src.app.models import DailyWord, DailyGame, GameStatus
from src.app.services import (
    evaluate_guess,
    get_or_create_daily_word,
    is_valid_word,
    get_current_date_str,
    get_player_streak,
    get_player_max_streak,
    get_league_table,
    LONDON_TZ,
    load_permitted_words
)

game_bp = Blueprint("game", __name__)

def get_remaining_seconds() -> int:
    """Calculate remaining seconds until the next 00:01 Europe/London rollover."""
    now = datetime.now(LONDON_TZ)
    rollover_today = datetime.combine(now.date(), time(0, 1), tzinfo=LONDON_TZ)
    if now >= rollover_today:
        next_rollover = rollover_today + timedelta(days=1)
    else:
        next_rollover = rollover_today
    return max(0, int((next_rollover - now).total_seconds()))

@game_bp.route("/game/state", methods=["GET"])
@login_required
def game_state():
    """Retrieve the current daily game state for the signed-in player."""
    user_id = session.get("user_id")
    engine = get_engine()
    with Session(engine) as db_session:
        today_str = get_current_date_str()
        daily_word = get_or_create_daily_word(db_session)

        # Query player's daily game
        stmt = select(DailyGame).where(
            DailyGame.player_id == user_id,
            DailyGame.date == today_str
        )
        game = db_session.exec(stmt).first()

        remaining_seconds = get_remaining_seconds()

        if not game:
            return jsonify({
                "status": "not_started",
                "attempts_used": 0,
                "max_attempts": 6,
                "guesses": [],
                "remaining_seconds": remaining_seconds
            }), 200

        guesses = json.loads(game.guesses_json)
        response = {
            "status": game.status,
            "attempts_used": game.attempts_used,
            "max_attempts": 6,
            "guesses": guesses,
            "remaining_seconds": remaining_seconds
        }

        # Expose word if complete
        if game.status in [GameStatus.WON.value, GameStatus.LOST.value, GameStatus.EXPIRED.value]:
            response["target_word"] = daily_word

        return jsonify(response), 200

@game_bp.route("/game/guess", methods=["POST"])
@login_required
def game_guess():
    """Submit a guess for the daily game session."""
    user_id = session.get("user_id")

    data = request.get_json() or {}
    guess = data.get("guess", "").strip().upper()

    if len(guess) != 5 or not guess.isalpha():
        return jsonify({
            "error": "Invalid guess",
            "details": "Guess must be exactly 5 letters"
        }), 400

    if not is_valid_word(guess):
        return jsonify({
            "error": "Invalid guess",
            "details": "Word not in permitted word list"
        }), 400

    engine = get_engine()
    with Session(engine) as db_session:
        today_str = get_current_date_str()
        daily_word = get_or_create_daily_word(db_session)

        # Check if game expired (checked on lazy load)
        remaining = get_remaining_seconds()
        if remaining <= 0:
            return jsonify({"error": "Game finished"}), 403

        # Get or create daily game
        stmt = select(DailyGame).where(
            DailyGame.player_id == user_id,
            DailyGame.date == today_str
        )
        game = db_session.exec(stmt).first()

        if not game:
            game = DailyGame(
                player_id=user_id,
                date=today_str,
                status=GameStatus.PLAYING.value,
                attempts_used=0,
                guesses_json="[]"
            )
            db_session.add(game)
            db_session.commit()
            db_session.refresh(game)

        if game.attempts_used >= 6:
            return jsonify({"error": "No guesses remaining (Game finished)"}), 400

        if game.status in [GameStatus.WON.value, GameStatus.LOST.value, GameStatus.EXPIRED.value]:
            return jsonify({"error": "Game finished"}), 403

        # Add guess
        feedback = evaluate_guess(guess, daily_word)
        guesses = json.loads(game.guesses_json)
        guesses.append({
            "word": guess,
            "feedback": feedback,
            "timestamp": datetime.now(LONDON_TZ).isoformat()
        })

        game.attempts_used += 1
        game.guesses_json = json.dumps(guesses)
        game.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)

        # Status checks
        if guess == daily_word:
            game.status = GameStatus.WON.value
        elif game.attempts_used >= 6:
            game.status = GameStatus.LOST.value

        db_session.add(game)
        db_session.commit()
        db_session.refresh(game)

        response = {
            "status": game.status,
            "feedback": feedback,
            "attempts_used": game.attempts_used
        }
        if game.status in [GameStatus.WON.value, GameStatus.LOST.value]:
            response["target_word"] = daily_word

        return jsonify(response), 200

# Isolated Demo Mode Logic (Stored in session)
DEMO_TARGET = "LEARN"

@game_bp.route("/game/demo/state", methods=["GET"])
def demo_state():
    """Retrieve the current state of the isolated demo mode session."""
    demo_game = session.get("demo_game")
    if not demo_game:
        demo_game = {
            "status": GameStatus.PLAYING.value,
            "attempts_used": 0,
            "guesses": [],
            "target_word": DEMO_TARGET
        }
        session["demo_game"] = demo_game

    return jsonify(demo_game), 200

@game_bp.route("/game/demo/guess", methods=["POST"])
def demo_guess():
    """Submit a guess for the isolated demo mode session."""
    demo_game = session.get("demo_game")
    if not demo_game or demo_game.get("status") != GameStatus.PLAYING.value:
        demo_game = {
            "status": GameStatus.PLAYING.value,
            "attempts_used": 0,
            "guesses": [],
            "target_word": DEMO_TARGET
        }

    data = request.get_json() or {}
    guess = data.get("guess", "").strip().upper()

    if len(guess) != 5 or not guess.isalpha():
        return jsonify({
            "error": "Invalid guess",
            "details": "Guess must be exactly 5 letters"
        }), 400

    if not is_valid_word(guess):
        return jsonify({
            "error": "Invalid guess",
            "details": "Word not in permitted word list"
        }), 400

    if demo_game["attempts_used"] >= 6:
        return jsonify({"error": "No guesses remaining"}), 400

    target = demo_game.get("target_word", DEMO_TARGET)
    feedback = evaluate_guess(guess, target)
    demo_game["guesses"].append({
        "word": guess,
        "feedback": feedback
    })
    demo_game["attempts_used"] += 1

    if guess == target:
        demo_game["status"] = GameStatus.WON.value
        demo_game["target_word"] = target
    elif demo_game["attempts_used"] >= 6:
        demo_game["status"] = GameStatus.LOST.value
        demo_game["target_word"] = target

    session["demo_game"] = demo_game

    response = {
        "status": demo_game["status"],
        "feedback": feedback,
        "attempts_used": demo_game["attempts_used"]
    }
    if demo_game["status"] in [GameStatus.WON.value, GameStatus.LOST.value]:
        response["target_word"] = target

    return jsonify(response), 200

@game_bp.route("/game/demo/reset", methods=["POST"])
def demo_reset():
    """Reset the isolated demo mode session state, keeping the current target word if any."""
    current_demo = session.get("demo_game") or {}
    target_word = current_demo.get("target_word", DEMO_TARGET)
    target_date = current_demo.get("date")

    # Check if a custom word and date is provided in the JSON body
    data = request.get_json(silent=True) or {}
    new_word = data.get("word") or ""
    new_word = new_word.strip().upper()
    new_date = data.get("date") or ""
    new_date = new_date.strip()

    if new_date:
        try:
            datetime.strptime(new_date, "%Y-%m-%d")
        except ValueError:
            return jsonify({
                "error": "Invalid date format",
                "details": "Date must be in YYYY-MM-DD format"
            }), 400

    if new_word == "RANDOM":
        words = load_permitted_words()
        target_word = random.choice(words) if words else DEMO_TARGET
        target_date = None
    elif new_word:
        if len(new_word) != 5 or not new_word.isalpha():
            return jsonify({"error": "Invalid target word"}), 400
        target_word = new_word
        target_date = new_date if new_date else None

    session["demo_game"] = {
        "status": GameStatus.PLAYING.value,
        "attempts_used": 0,
        "guesses": [],
        "target_word": target_word,
        "date": target_date
    }
    return jsonify({"message": "Demo reset successfully"}), 200

@game_bp.route("/game/dictionary", methods=["GET"])
def get_dictionary():
    """Retrieve the permitted 5-letter word list for the bot solver."""
    words = load_permitted_words()
    return jsonify({"words": words}), 200

@game_bp.route("/stats", methods=["GET"])
@login_required
def stats():
    """Retrieve gameplay statistics and history for the signed-in player."""
    user_id = session.get("user_id")
    engine = get_engine()
    with Session(engine) as db_session:
        stmt = select(DailyGame).where(
            DailyGame.player_id == user_id,
            DailyGame.status.in_([GameStatus.WON.value, GameStatus.LOST.value])
        ).order_by(DailyGame.date.desc())
        games = db_session.exec(stmt).all()

        games_played = len(games)
        games_won = sum(1 for g in games if g.status == GameStatus.WON.value)
        win_percentage = (
            (games_won / games_played * 100.0) if games_played > 0 else 0.0
        )
        avg_attempts = (
            (sum(g.attempts_used for g in games) / games_played)
            if games_played > 0 else 0.0
        )

        current_streak = get_player_streak(db_session, user_id)
        max_streak = get_player_max_streak(db_session, user_id)

        history = []
        for g in games:
            # Join target word
            word_stmt = select(DailyWord.word).where(DailyWord.date == g.date)
            word = db_session.exec(word_stmt).first() or "UNKNOWN"
            history.append({
                "date": g.date,
                "word": word,
                "attempts": g.attempts_used,
                "result": "win" if g.status == GameStatus.WON.value else "loss"
            })

        return jsonify({
            "games_played": games_played,
            "games_won": games_won,
            "win_percentage": round(win_percentage, 1),
            "average_attempts": round(avg_attempts, 1),
            "current_streak": current_streak,
            "max_streak": max_streak,
            "history": history
        }), 200

@game_bp.route("/stats/league", methods=["GET"])
@login_required
def league():
    """Retrieve the sorted rankings table for all active players."""
    engine = get_engine()
    with Session(engine) as db_session:
        table = get_league_table(db_session)
        return jsonify({"rankings": table}), 200

@game_bp.route("/archive", methods=["GET"])
def archive():
    """Retrieve the historical archive of selected daily words (excluding today)."""
    today_str = get_current_date_str()
    engine = get_engine()
    with Session(engine) as db_session:
        # Exclude today's word from archive
        stmt = select(DailyWord).where(DailyWord.date != today_str).order_by(DailyWord.date.desc())
        words = db_session.exec(stmt).all()

        result = [{"date": w.date, "word": w.word} for w in words]
        return jsonify({"archive": result}), 200
