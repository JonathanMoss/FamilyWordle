Rules:
- Players must be registered to play.
- Player registration requires a unique nickname and a 4-digit numeric PIN; no personal data is collected.

- A new 5-letter daily word is selected at 00:01 Europe/London time each day.
- The previous day's game closes at 00:01 Europe/London time and cannot be continued.

- Only one daily word exists per day and all players receive the same word.
- Daily words must not be reused once played.

- Players may play one daily game per day but may resume that game across multiple sessions during the active window.
- Players have a maximum of 6 attempts to guess the daily word.
- A daily game is completed when the player correctly guesses the word (win), uses all 6 attempts (loss), or the daily reset at 00:01 occurs (expired).
- If a player does not guess the word, the word is revealed only when the game is completed (either by using 6 guesses or at the daily rollover).

- All guesses must be valid 5-letter words from the permitted word list. The permitted word list is loaded dynamically from `data/words.txt` (containing one word per line) to keep it configurable without code changes.
- If all words in `data/words.txt` are exhausted (meaning they all appear in the historical archive), the system triggers a self-healing fallback: it purges all archive entries older than 30 days to recycle the words for gameplay, ensuring the server remains continuously operational.

- Player statistics are based only on completed daily games.

- The league table ranks players by:
  1) Total number of words correctly guessed (Wins)
  2) Average number of attempts per completed game (fewer attempts rank higher)
  3) Current streak of consecutive days of completed play (resets if a day is missed)

- A full archive of previously used daily words and their dates is retained and available to players.

- Initial administrator accounts must be created out-of-band via a backend CLI bootstrapping command, preventing public users from granting themselves administrative access.
