Feature: View Previous Words and Stats
  As a player
  I want to view previous daily words and my historical statistics
  So that I can review past games and track my progress

  Background:
    Given an archive of previous daily words exists
    And completed daily game statistics are recorded

  Rule: Players can browse previous daily words

    Scenario: Player views the archive of previous daily words
      When I view the archive
      Then I should see a list of previous daily words

    Scenario: Archived words are shown in chronological order
      Given the archive contains multiple daily words
      When I view the archive
      Then the daily words should be shown in chronological order

    Scenario: Current daily word is not shown in the archive
      Given today's daily game is active
      When I view the archive
      Then today's daily word should not be shown

  Rule: Registered players can view their own historical statistics

    Scenario: Registered player views historical statistics
      Given I am signed in as "Jon"
      And player "Jon" has completed previous daily games
      When I view my statistics
      Then I should see:
        | Statistic         |
        | Games Played      |
        | Games Won         |
        | Average Turns     |
        | Consecutive Days  |

    Scenario: Registered player views the result for a specific day
      Given I am signed in as "Jon"
      And player "Jon" has completed previous daily games
      When I view my statistics for "2026-06-21"
      Then I should see the result for that day
      And I should see the number of guesses used

    Scenario: Signed-out user cannot view personal statistics
      Given I am not signed in
      When I view my statistics
      Then I should not be able to view personal statistics

    Scenario: Removed player statistics are not visible in shared views
      Given a removed player "Alice" exists
      When shared statistics are viewed
      Then player "Alice" should not appear in shared statistics

  Rule: Historical results align with the archive

    Scenario: Archived daily word aligns with recorded daily result
      Given the archive contains the daily word for "2026-06-21"
      When I view my statistics for "2026-06-21"
      Then the recorded result should correspond to that archived daily word
