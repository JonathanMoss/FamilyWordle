Feature: Game Play
  As a player
  I want to play one daily word game
  So that I can try to guess the daily word within the allowed number of guesses

  Background:
    Given a daily word has been selected for the current day
    And the daily game is active from 00:01 to 00:01 the following day
    And each player may submit a maximum of 6 guesses per daily game

  Rule: Players can play only during the active daily game window

    Scenario: Player starts the daily game during the active game window
      Given the current time is within the active daily game window
      When I start the daily game
      Then I should be able to play the current daily word

    Scenario: Player cannot start the daily game before the active window opens
      Given the current time is before 00:01
      When I start the daily game
      Then I should not be allowed to start the daily game

    Scenario: A new daily game starts at 00:01
      Given the current time reaches 00:01
      When the new daily game starts
      Then a new daily word should be available
      And players should be able to start the daily game

    Scenario: Player cannot continue the previous day's game after rollover
      Given I started the daily game on the previous day
      And the current time is after 00:01 on the next day
      When I continue the daily game
      Then the previous day's game should be closed
      And I should be required to start the new daily game

  Rule: All players play the same daily word on the same day

    Scenario: All players receive the same daily word
      Given multiple players start the daily game on the same day
      When the daily game begins
      Then all players should play the same daily word

    Scenario: Daily game uses the selected daily word
      Given the selected daily word is "CRANE"
      When I start the daily game
      Then the daily game should use the word "CRANE"

  Rule: Guesses must be valid and are limited to six attempts

    Scenario: Player submits a valid guess
      Given I am playing the daily game
      When I submit the guess "SLATE"
      Then the guess should be accepted
      And feedback should be returned for each letter

    Scenario: Player cannot submit an invalid guess
      Given I am playing the daily game
      When I submit the guess "AB1"
      Then the guess should be rejected
      And I should see the gameplay message "Invalid guess"

    Scenario: Player cannot exceed the maximum number of guesses
      Given I am playing the daily game
      And I have already submitted 6 guesses
      When I submit the guess "CRANE"
      Then the guess should be rejected
      And I should see the gameplay message "No guesses remaining"

    Scenario: Guess feedback identifies letter results
      Given I am playing the daily game
      When I submit the guess "SLATE"
      Then each letter should be marked as one of:
        | Result            |
        | Correct position  |
        | Wrong position    |
        | Not in word       |

  Rule: A daily game ends in a win or loss and cannot continue afterwards

    Scenario: Player wins the daily game within 6 guesses
      Given I am playing the daily game
      When I guess the daily word within 6 guesses
      Then I should win the daily game
      And my result should be recorded

    Scenario: Player loses the daily game after 6 unsuccessful guesses
      Given I am playing the daily game
      When I use all 6 guesses without finding the daily word
      Then I should lose the daily game
      And the daily word should be revealed
      And my result should be recorded

    Scenario: Player cannot submit a guess after the daily game is complete
      Given I have completed the daily game
      When I submit the guess "CRANE"
      Then the guess should be rejected
      And I should see the gameplay message "Game finished"

    Scenario: Player cannot start the daily game more than once in the same day
      Given I have completed the daily game
      When I start the daily game again on the same day
      Then I should not be allowed to start another daily game

    Scenario: Daily game progress is retained during the active day
      Given I have started the daily game
      And I have submitted 3 guesses
      When I return to the daily game during the same day
      Then I should see my previous 3 guesses
