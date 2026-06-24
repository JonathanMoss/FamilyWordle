"""
Database models for the Family Wordle application.
Defines Player, DailyWord, and DailyGame tables.
"""
# pylint: disable=too-few-public-methods
from datetime import datetime, timezone
from enum import Enum
from typing import Optional
from sqlmodel import SQLModel, Field

def utc_now() -> datetime:
    """Return a timezone-naive UTC datetime."""
    return datetime.now(timezone.utc).replace(tzinfo=None)

class PlayerRole(str, Enum):
    """Possible player roles."""
    PLAYER = "player"
    ADMIN = "admin"

class PlayerStatus(str, Enum):
    """Possible player account statuses."""
    ACTIVE = "active"
    DISABLED = "disabled"
    REMOVED = "removed"

class GameStatus(str, Enum):
    """Possible daily game statuses."""
    PLAYING = "playing"
    WON = "won"
    LOST = "lost"
    EXPIRED = "expired"

class Player(SQLModel, table=True):
    """
    Represents a player or administrator account in the database.
    """
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(unique=True, index=True, min_length=1, max_length=10)
    pin_hash: str = Field(description="Securely hashed PIN")
    role: str = Field(default=PlayerRole.PLAYER.value, description="Role: 'player' or 'admin'")
    status: str = Field(
        default=PlayerStatus.ACTIVE.value,
        description="Status: 'active', 'disabled', or 'removed'"
    )
    created_at: datetime = Field(default_factory=utc_now)

class DailyWord(SQLModel, table=True):
    """
    Represents the target Wordle word selected for a specific calendar date.
    """
    date: str = Field(primary_key=True, description="Calendar date in YYYY-MM-DD format")
    word: str = Field(min_length=5, max_length=5, description="The daily target 5-letter word")
    selected_at: datetime = Field(default_factory=utc_now)

class DailyGame(SQLModel, table=True):
    """
    Represents a single player's game session progress/results for a daily word.
    """
    id: Optional[int] = Field(default=None, primary_key=True)
    player_id: int = Field(foreign_key="player.id", index=True)
    date: str = Field(index=True, description="Calendar date in YYYY-MM-DD format")
    status: str = Field(
        default=GameStatus.PLAYING.value,
        description="Status: 'playing', 'won', 'lost', or 'expired'"
    )
    attempts_used: int = Field(default=0, ge=0, le=6)


    # Serialized JSON list of guesses and feedback dictionaries
    # Format: [{"word": "SLATE", "feedback": [...], "timestamp": "..."}]
    # feedback list elements are 'correct', 'present', or 'absent'
    guesses_json: str = Field(default="[]", description="Serialized JSON array of guesses")
    updated_at: datetime = Field(default_factory=utc_now)
