Feature: Demo Mode
  As a new player
  I want to try an example game
  So that I can learn how the game works without affecting the daily game or player statistics

  Background:
    Given a demo word is defined
    And demo mode is separate from the daily game
    And demo mode does not affect player statistics

  Rule: Demo mode provides a safe example game

    Scenario: Player starts demo mode
      Given I am on the home page
      When I start demo mode
      Then I should see a demo game

    Scenario: Demo mode uses the demo word
      Given I am playing the demo game
      When the demo game begins
      Then the demo game should use the defined demo word

    Scenario: Player completes the demo game
      Given I am playing the demo game
      When I guess the demo word
      Then I should complete the demo game
      And I should see a demo completion message

    Scenario: Player exits demo mode
      Given I am playing the demo game
      When I exit demo mode
      Then I should return to the home page

    Scenario: Player can replay demo mode
      Given I have completed the demo game
      When I start demo mode again
      Then I should be able to play another demo game

  Rule: Demo mode does not affect live data

    Scenario: Demo mode does not update player statistics
      Given I am signed in as "Jon"
      And I complete the demo game
      When I view my statistics
      Then the demo game should not appear in my statistics

    Scenario: Demo mode does not consume the daily game
      Given I complete the demo game
      When I start the daily game
      Then I should still be able to play the current daily game

    Scenario: Player loses the daily game in demo mode
      Given I am playing the demo game
      When I submit 6 incorrect guesses in demo mode
      Then my demo game status should be "lost"
      And the target word should be revealed as "LEARN"

  Rule: Players can replay past daily words in practice/demo mode

    Scenario: Player starts a replay of a previous daily word
      Given I am signed in as "Jon"
      When I start a replay game with word "CRANE" and date "2026-06-24"
      Then my demo game status should be "playing"
      And the active demo target word should be "CRANE"

    Scenario: Player can guess the custom replay word
      Given I am signed in as "Jon"
      And I have started a replay game with word "CRANE" and date "2026-06-24"
      When I submit the guess "CRANE" in demo mode
      Then my demo game status should be "won"

    Scenario: Resetting a custom replay game preserves the custom word
      Given I am signed in as "Jon"
      And I have started a replay game with word "CRANE" and date "2026-06-24"
      When I reset the demo game
      Then my demo game status should be "playing"
      And the active demo target word should be "CRANE"

