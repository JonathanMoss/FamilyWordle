import random
from datetime import datetime, timedelta
from typing import List, Dict, Tuple, Optional
from zoneinfo import ZoneInfo
import bcrypt
from sqlmodel import Session, select
from src.app.models import Player, DailyWord, DailyGame

# Timezone context
LONDON_TZ = ZoneInfo("Europe/London")

# PIN Hashing
def hash_pin(pin: str) -> str:
    """Hash a numeric 4-digit PIN using bcrypt."""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pin.encode('utf-8'), salt).decode('utf-8')

def verify_pin(pin: str, hashed_pin: str) -> bool:
    """Verify if a PIN matches its bcrypt hash."""
    try:
        return bcrypt.checkpw(pin.encode('utf-8'), hashed_pin.encode('utf-8'))
    except Exception:
        return False

# Wordle Feedback Evaluation
def evaluate_guess(guess: str, target: str) -> List[str]:
    """
    Evaluate guess letters against target word using standard Wordle logic.
    Returns list of 5 feedbacks: 'correct', 'present', or 'absent'.
    """
    guess = guess.upper()
    target = target.upper()
    feedback = ["absent"] * 5
    
    # Track which characters in target have been matched
    target_matched = [False] * 5
    guess_matched = [False] * 5
    
    # First pass: find all green (correct position) matches
    for i in range(5):
        if guess[i] == target[i]:
            feedback[i] = "correct"
            target_matched[i] = True
            guess_matched[i] = True
            
    # Second pass: find yellow (present, wrong position) matches
    for i in range(5):
        if guess_matched[i]:
            continue
        for j in range(5):
            if not target_matched[j] and guess[i] == target[j]:
                feedback[i] = "present"
                target_matched[j] = True
                break
                
    return feedback

# Dictionary configuration
DICTIONARY_PATH = "data/words.txt"

def load_permitted_words(path: str = DICTIONARY_PATH) -> List[str]:
    """Load permitted 5-letter words from file."""
    try:
        with open(path, "r", encoding="utf-8") as f:
            return [line.strip().upper() for line in f if len(line.strip()) == 5]
    except FileNotFoundError:
        return ["CRANE", "SLATE", "REACT", "STARE", "LIGHT"]

def is_valid_word(word: str) -> bool:
    """Check if the word is in the permitted dictionary list."""
    words = load_permitted_words()
    return word.upper() in words

# Lazy-loaded Word Selection
def get_current_date_str() -> str:
    """Get today's date in Europe/London timezone as YYYY-MM-DD."""
    return datetime.now(LONDON_TZ).strftime("%Y-%m-%d")

def get_or_create_daily_word(session: Session) -> str:
    """
    Retrieve today's daily word. If not selected, select a new word 
    from the dictionary, ensuring it does not appear in the historical archive.
    """
    today_str = get_current_date_str()
    
    # Check if today's word is already selected
    stmt = select(DailyWord).where(DailyWord.date == today_str)
    daily_word = session.exec(stmt).first()
    if daily_word:
        return daily_word.word

    # Word generation logic
    all_words = load_permitted_words()
    if not all_words:
        raise ValueError("Permitted word list is empty")
        
    # Get archived words
    archived_words_stmt = select(DailyWord.word)
    archived_words = set(session.exec(archived_words_stmt).all())
    
    available_words = [w for w in all_words if w not in archived_words]
    
    # Gaps Resolution: dictionary exhaustion fallback
    if not available_words:
        # Purge archive records older than 30 days to recycle
        thirty_days_ago = (datetime.now(LONDON_TZ) - timedelta(days=30)).strftime("%Y-%m-%d")
        delete_old_stmt = select(DailyWord).where(DailyWord.date < thirty_days_ago)
        old_words = session.exec(delete_old_stmt).all()
        for ow in old_words:
            session.delete(ow)
        session.commit()
        
        # Recalculate available words
        archived_words = set(session.exec(archived_words_stmt).all())
        available_words = [w for w in all_words if w not in archived_words]
        
        if not available_words:
            # Fallback to absolute list if still empty
            available_words = all_words

    # Select random word and write to database
    selected = random.choice(available_words).upper()
    new_daily = DailyWord(date=today_str, word=selected)
    session.add(new_daily)
    session.commit()
    
    return selected

# Statistics and Rankings calculation
def get_player_streak(session: Session, player_id: int) -> int:
    """Calculate the player's current streak of consecutive completed days."""
    today_str = get_current_date_str()
    yesterday_str = (datetime.now(LONDON_TZ) - timedelta(days=1)).strftime("%Y-%m-%d")
    
    # Query completed games sorted by date descending
    stmt = select(DailyGame).where(
        DailyGame.player_id == player_id,
        DailyGame.status.in_(["won", "lost"])
    ).order_by(DailyGame.date.desc())
    
    completed_games = session.exec(stmt).all()
    if not completed_games:
        return 0
        
    dates_played = {g.date for g in completed_games}
    
    # Streak breaks if player didn't play today AND didn't play yesterday
    if today_str not in dates_played and yesterday_str not in dates_played:
        return 0
        
    streak = 0
    current_check = datetime.now(LONDON_TZ)
    
    # If they played today, start checking from today, else yesterday
    if today_str not in dates_played:
        current_check = current_check - timedelta(days=1)
        
    while True:
        check_str = current_check.strftime("%Y-%m-%d")
        if check_str in dates_played:
            streak += 1
            current_check = current_check - timedelta(days=1)
        else:
            break
            
    return streak

def get_player_max_streak(session: Session, player_id: int) -> int:
    """Calculate the player's maximum historical streak of completed days."""
    stmt = select(DailyGame).where(
        DailyGame.player_id == player_id,
        DailyGame.status.in_(["won", "lost"])
    ).order_by(DailyGame.date.asc())
    
    completed_games = session.exec(stmt).all()
    if not completed_games:
        return 0
        
    dates_played = sorted(list({datetime.strptime(g.date, "%Y-%m-%d").date() for g in completed_games}))
    if not dates_played:
        return 0
        
    max_streak = 0
    current_streak = 1
    
    for i in range(1, len(dates_played)):
        if dates_played[i] - dates_played[i-1] == timedelta(days=1):
            current_streak += 1
        else:
            max_streak = max(max_streak, current_streak)
            current_streak = 1
            
    return max(max_streak, current_streak)

def get_league_table(session: Session) -> List[Dict]:
    """
    Calculate and return the league table rankings.
    Rankings tiebreaker priority:
    1) Total Wins (Games Won) descending
    2) Average attempts per completed game ascending (fewer is better)
    3) Current streak descending
    """
    players_stmt = select(Player).where(Player.status == "active")
    players = session.exec(players_stmt).all()
    
    rankings = []
    for player in players:
        # Completed games
        games_stmt = select(DailyGame).where(
            DailyGame.player_id == player.id,
            DailyGame.status.in_(["won", "lost"])
        )
        games = session.exec(games_stmt).all()
        
        games_played = len(games)
        games_won = sum(1 for g in games if g.status == "won")
        
        # Average turns
        if games_played > 0:
            avg_turns = sum(g.attempts_used for g in games) / games_played
        else:
            avg_turns = 0.0
            
        current_streak = get_player_streak(session, player.id)
        
        rankings.append({
            "username": player.username,
            "games_played": games_played,
            "games_won": games_won,
            "average_attempts": round(avg_turns, 2),
            "current_streak": current_streak
        })
        
    # Sort rankings:
    # 1) games_won descending (-x["games_won"])
    # 2) average_attempts ascending (if x["games_played"] == 0, push them to bottom)
    # 3) current_streak descending (-x["current_streak"])
    
    # Helper to calculate sort key
    def sort_key(row):
        avg_attempts = row["average_attempts"] if row["games_played"] > 0 else 999.0
        return (-row["games_won"], avg_attempts, -row["current_streak"], row["username"])
        
    rankings.sort(key=sort_key)
    
    # Assign ranks
    for rank, row in enumerate(rankings, 1):
        row["rank"] = rank
        
    return rankings
