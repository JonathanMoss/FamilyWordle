Feature: Online Documentation
  As a player
  I want to access online help
  So that I can understand how to play the game and its rules

  Rule: Documentation is available to all players at all relevant times

    Scenario: Player accesses online documentation
      Given I am using the application
      When I open the online documentation
      Then I should see the help content

    Scenario: Signed-out player accesses online documentation
      Given I am not signed in
      When I open the online documentation
      Then I should see the help content

    Scenario: Player accesses online documentation during the daily game
      Given I am playing the daily game
      When I open the online documentation
      Then I should see the help content
      And my daily game progress should be preserved

  Rule: Documentation explains the core game rules

    Scenario: Documentation explains how to play
      Given I am viewing the online documentation
      Then I should see instructions for starting and completing a game

    Scenario: Documentation explains guess rules
      Given I am viewing the online documentation
      Then I should see the rules for valid guesses

    Scenario: Documentation explains gameplay rules
      Given I am viewing the online documentation
      Then I should see information about:
        | Rule                    |
        | Number of guesses       |
        | Word length             |
        | Feedback meaning        |
        | Daily game period       |

