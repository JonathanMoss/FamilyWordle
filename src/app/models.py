from datetime import datetime
from typing import Optional, List, Dict
from sqlmodel import SQLModel, Field

class Player(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(unique=True, index=True, min_length=1, max_length=20)
    pin_hash: str = Field(description="Securely hashed PIN")
    role: str = Field(default="player", description="Role: 'player' or 'admin'")
    status: str = Field(default="active", description="Status: 'active', 'disabled', or 'removed'")
    created_at: datetime = Field(default_factory=datetime.utcnow)

class DailyWord(SQLModel, table=True):
    date: str = Field(primary_key=True, description="Calendar date in YYYY-MM-DD format")
    word: str = Field(min_length=5, max_length=5, description="The daily target 5-letter word")
    selected_at: datetime = Field(default_factory=datetime.utcnow)

class DailyGame(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    player_id: int = Field(foreign_key="player.id", index=True)
    date: str = Field(index=True, description="Calendar date in YYYY-MM-DD format")
    status: str = Field(default="playing", description="Status: 'playing', 'won', 'lost', or 'expired'")
    attempts_used: int = Field(default=0, ge=0, le=6)
    
    # Serialized JSON list of guesses and feedback dictionaries
    # Format: [{"word": "SLATE", "feedback": ["absent", "absent", "correct", "present", "absent"], "timestamp": "..."}]
    guesses_json: str = Field(default="[]", description="Serialized JSON array of guesses")
    updated_at: datetime = Field(default_factory=datetime.utcnow)
