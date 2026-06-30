# Domain Entities Specification

All application entities are defined as Pydantic models mapped to SQLite tables via SQLModel. This ensures consistency between business validation and database constraints.

---

## 1. Player Entity
Represents registered players and administrators in the system.

```python
class Player(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(
        unique=True,
        index=True,
        min_length=1,
        max_length=10,
        regex="^[a-zA-Z0-9_-]+$" # Alphanumeric, underscores, and hyphens only
    )
    pin_hash: str = Field(description="Securely hashed PIN")
    role: str = Field(
        default=PlayerRole.PLAYER.value,
        description="Role: 'player' or 'admin' (mapped via PlayerRole Enum)"
    )
    status: str = Field(
        default=PlayerStatus.ACTIVE.value,
        description="Status: 'active', 'disabled', or 'removed' (mapped via PlayerStatus Enum)"
    )
    created_at: datetime = Field(default_factory=datetime.utcnow)
```

---

## 2. DailyWord Entity
Represents the target word selected for a specific calendar date.

```python
class DailyWord(SQLModel, table=True):
    date: str = Field(
        primary_key=True,
        description="Calendar date in YYYY-MM-DD format"
    )
    word: str = Field(
        min_length=5,
        max_length=5,
        regex="^[A-Z]{5}$", # Exactly 5 uppercase letters
        description="The daily target 5-letter word"
    )
    selected_at: datetime = Field(default_factory=datetime.utcnow)
    clue: Optional[str] = Field(
        default=None,
        nullable=True,
        max_length=100,
        description="Optional clue/hint for subsequent players"
    )
    clue_by_player_id: Optional[int] = Field(
        default=None,
        foreign_key="player.id",
        nullable=True,
        description="ID of the first player who guessed the word"
    )
```

---

## 3. DailyGame Entity
Represents a player's attempt at the Daily Word on a specific day.

```python
class DailyGame(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    player_id: int = Field(foreign_key="player.id", index=True)
    date: str = Field(index=True, description="Calendar date in YYYY-MM-DD format")
    status: str = Field(
        default=GameStatus.PLAYING.value,
        description="Status: 'playing', 'won', 'lost', or 'expired' (mapped via GameStatus Enum)"
    )
    attempts_used: int = Field(default=0, ge=0, le=6)
    
    # Store attempts list as JSON string:
    # [{"word": "SLATE", "feedback": ["absent", "absent", "correct", "present", "absent"], "timestamp": "..."}]
    guesses_json: str = Field(
        default="[]",
        description="Serialized JSON list of guess dictionaries"
    )
    
    updated_at: datetime = Field(default_factory=datetime.utcnow)
```

---

## 4. Virtual/Aggregate Entities
These are transient schemas used for API response data aggregation (not stored in separate tables).

### LeagueRow
Used to construct the ranks inside the League Table.
* `rank`: int
* `username`: str
* `games_played`: int
* `games_won`: int
* `average_attempts`: float
* `current_streak`: int

### PlayerStats
Used to construct the historical stats page for a single player.
* `games_played`: int
* `games_won`: int
* `win_percentage`: float
* `average_attempts`: float
* `current_streak`: int
* `max_streak`: int
* `history`: List[DailyGameRecord]

