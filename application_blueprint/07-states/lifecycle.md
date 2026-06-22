Player States:
Unregistered -> Registered -> Not Playing -> Playing

Player Transitions:

- Unregistred -> Registered: Player undertakes simple registration
- Not Playing -> Playing: Player access the application and player enters current days game

Daily Word States:
Selected -> In Play -> Archived

Daily Word Transitions:
- Selected -> In Play: The 5 letter word is selected and used in a daily game
- In Play -> Archived: When the game ends, the word is archived

Game States:
Started -> In Play -> End

Transitions:
- Started -> In Play: A new game commences
- In Play -> End: At 0001 Hrs the current game ends.

