Feature: Daily Solver Clues
  As a player
  I want to submit and view daily clues
  So that I can cooperate with my family members in guessing the daily word

  Background:
    Given a daily word has been selected for the current day
    And the selected daily word is "CRANE"

  Scenario: First solver submits a clue, and subsequent player views it
    Given a registered player "Alice" with PIN "1234" exists
    And a registered player "Bob" with PIN "5678" exists
    And I am signed in as "Alice"
    And I am playing the daily game
    When I submit the guess "CRANE"
    Then the guess should be accepted
    And the response should indicate I am the first solver
    When I submit a daily clue "Think bird or construction machine"
    Then the clue should be successfully saved
    When I sign out
    And I sign in as "Bob" with PIN "5678"
    When I retrieve the current daily game state
    Then the game state should include the clue "Think bird or construction machine"
    And the game state should indicate I am not the first solver

  Scenario: Non-solver cannot submit a clue
    Given a registered player "Bob" with PIN "5678" exists
    And I am signed in as "Bob"
    When I attempt to submit a daily clue "Invalid clue"
    Then the clue submission should be rejected

  Scenario: First solver cannot submit a clue that is too long
    Given a registered player "Alice" with PIN "1234" exists
    And I am signed in as "Alice"
    And I am playing the daily game
    When I submit the guess "CRANE"
    Then the guess should be accepted
    And the response should indicate I am the first solver
    When I attempt to submit a daily clue that is too long
    Then the clue submission should be rejected
