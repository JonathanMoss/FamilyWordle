Feature: Daily Word Definitions
  As a player
  I want to see the definition of the target word once I have finished the daily game
  So that I can expand my vocabulary and understand obscure words

  Background:
    Given a daily word has been selected for the current day
    And the selected daily word is "CRANE"
    And a registered player "Jon" with PIN "1111" exists
    And the definition of "CRANE" is "(noun) A large bird with long legs and a long neck"

  Scenario: A player cannot see the definition while still playing
    Given I am signed in as "Jon"
    When I request the current game state
    Then the response should not include a word definition
    When I submit the guess "SLATE"
    Then the response should not include a word definition

  Scenario: A player can see the definition after winning the daily game
    Given I am signed in as "Jon"
    And I request the current game state
    When I submit the guess "CRANE"
    Then I should win the daily game
    And the response should include the definition "(noun) A large bird with long legs and a long neck"
    When I request the current game state
    Then the response should include the definition "(noun) A large bird with long legs and a long neck"

  Scenario: A player can see the definition after losing the daily game
    Given I am signed in as "Jon"
    When I use all 6 guesses without finding the daily word
    Then I should lose the daily game
    And the response should include the definition "(noun) A large bird with long legs and a long neck"
    When I request the current game state
    Then the response should include the definition "(noun) A large bird with long legs and a long neck"
