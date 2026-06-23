Player States:
Unregistered -> Registered -> Not Playing -> Playing

Player Transitions:
- Unregistered -> Registered: Player registers with a unique nickname and a 4-digit PIN.
- Not Playing -> Playing: Player authenticates using nickname and PIN, and accesses the current day's game dashboard.
- Playing -> Not Playing: Player signs out or their session expires.

Daily Word States:
Selected -> In Play -> Archived

Daily Word Transitions:
- Selected -> In Play: The daily word is selected and set active at 00:01 Europe/London.
- In Play -> Archived: The active game window closes at 00:01 Europe/London the following day, and the word is archived.

Game States:
Not Started -> In Play -> Ended (Win / Loss / Expired)

Game Transitions:
- Not Started -> In Play: The player opens the game dashboard and submits their first valid guess.
- In Play -> Ended (Win): The player submits a guess that matches the daily word within 6 attempts.
- In Play -> Ended (Loss): The player submits a 6th incorrect guess.
- Not Started / In Play -> Ended (Expired): The system time reaches 00:01 Europe/London of the next day, closing the game.

