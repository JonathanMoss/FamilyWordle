Feature: League Table and User Stats
  As a player
  I want to view player rankings and statistics
  So that I can compare performance across registered players

  Background:
    Given player statistics are recorded for completed daily games
    And the league table includes registered players only

  Rule: Registered players appear in the league table and removed players do not

    Scenario: League table includes registered players only
      Given the following players exist:
        | Player Name | Status     |
        | Jon         | Registered |
        | Alice       | Removed    |
      When I view the league table
      Then player "Jon" should appear in the league table
      And player "Alice" should not appear in the league table

    Scenario: Registered player with no completed games appears with zero statistics
      Given a registered player "Bob" exists
      And player "Bob" has not completed any daily games
      When I view the league table
      Then player "Bob" should appear in the league table
      And player "Bob" should show 0 games won

  Rule: Players are ranked by wins, then average turns, then consecutive days

    Scenario: League table ranks players by games won
      Given the following player statistics exist:
        | Player Name | Games Won |
        | Jon         | 10        |
        | Alice       | 5         |
      When I view the league table
      Then player "Jon" should rank above player "Alice"

    Scenario: League table uses average turns as the second ranking criterion
      Given the following player statistics exist:
        | Player Name | Games Won | Average Turns |
        | Jon         | 10        | 4.2           |
        | Alice       | 10        | 3.8           |
      When I view the league table
      Then player "Alice" should rank above player "Jon"

    Scenario: League table uses consecutive days as the third ranking criterion
      Given the following player statistics exist:
        | Player Name | Games Won | Average Turns | Consecutive Days |
        | Jon         | 10        | 3.8           | 5                |
        | Alice       | 10        | 3.8           | 7                |
      When I view the league table
      Then player "Alice" should rank above player "Jon"

    Scenario: League table order remains consistent when ranking metrics are identical
      Given the following player statistics exist:
        | Player Name | Games Won | Average Turns | Consecutive Days |
        | Jon         | 10        | 4.0           | 5                |
        | Alice       | 10        | 4.0           | 5                |
      When I view the league table
      Then the relative order of players with identical ranking metrics should remain consistent

  Rule: Player statistics are visible and kept current

    Scenario: League table displays player statistics
      Given registered player "Jon" has the following statistics:
        | Games Played | Games Won | Average Turns | Consecutive Days |
        | 15           | 10        | 4.0           | 6                |
      When I view the league table
      Then I should see player "Jon" in the league table
      And I should see their games played, games won, average turns and consecutive days

    Scenario: League table is updated when a player completes a daily game
      Given player "Jon" completes a daily game
      When I refresh the league table
      Then player "Jon" statistics should be updated

    Scenario: Signed-in player can see their own rank
      Given I am signed in as "Jon"
      When I view the league table
      Then I should see my current rank

    Scenario: Ranking criteria are visible to players
      When I view the league table
      Then I should see that players are ranked by games won, average turns and consecutive days
