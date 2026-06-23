Feature: Player Registration
  As a new player
  I want to register for an account
  So that I can play FamilyWordle

  Rule: A player name is required and must be unique

    Scenario: Successful registration with valid details
      Given I am on the registration page
      When I register with:
        | Field       | Value |
        | Player Name | Jon   |
      Then the account for player "Jon" should be created
      And I should see a registration success message

    Scenario Outline: Registration fails when required data is missing
      Given I am on the registration page
      When I register with an empty "<Field>" field
      Then the account should not be created
      And I should see the validation message "<Error Message>"

      Examples:
        | Field       | Error Message           |
        | Player Name | Player Name is required |

    Scenario: Registration fails when the player name is already registered
      Given a registered player "Jon" exists
      And I am on the registration page
      When I register with:
        | Field       | Value |
        | Player Name | Jon   |
      Then the account should not be created
      And I should see the validation message "Player Name already registered"
