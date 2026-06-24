Feature: Player Registration
  As a new player
  I want to register for an account
  So that I can play FamilyWordle

  Rule: A player name is required and must be unique

  Rule: A 4-digit numeric PIN is required for authentication

    Scenario: Successful registration with valid details
      Given I am on the registration page
      When I register with:
        | Field       | Value |
        | Player Name | Jon   |
        | PIN         | 1234  |
      Then the account for player "Jon" should be created
      And I should see a registration success message

    Scenario Outline: Registration fails when required data is missing
      Given I am on the registration page
      When I register with:
        | Field       | Value   |
        | Player Name | <Name>  |
        | PIN         | <PIN>   |
      Then the account should not be created
      And I should see the validation message "<Error Message>"

      Examples:
        | Name | PIN  | Error Message           |
        |      | 1234 | Player Name is required |
        | Jon  |      | PIN is required         |

    Scenario Outline: Registration fails with invalid PIN format
      Given I am on the registration page
      When I register with:
        | Field       | Value   |
        | Player Name | Jon     |
        | PIN         | <PIN>   |
      Then the account should not be created
      And I should see the validation message "<Error Message>"

      Examples:
        | PIN  | Error Message                           |
        | 12   | PIN must be exactly 4 digits            |
        | 12345| PIN must be exactly 4 digits            |
        | abcd | PIN must contain only numeric digits    |
        | 12a4 | PIN must contain only numeric digits    |

    Scenario: Registration fails when the player name is already registered
      Given a registered player "Jon" exists
      And I am on the registration page
      When I register with:
        | Field       | Value |
        | Player Name | Jon   |
        | PIN         | 1234  |
      Then the account should not be created
      And I should see the validation message "Player Name already registered"

    Scenario Outline: Registration fails when player name contains invalid symbols
      Given I am on the registration page
      When I register with:
        | Field       | Value   |
        | Player Name | <Name>  |
        | PIN         | 1234    |
      Then the account should not be created
      And I should see the validation message "Player Name must be alphanumeric"

      Examples:
        | Name      |
        | Jon@Home  |
        | Jon.Moss  |
        | Jon/Moss  |

    Scenario: Registration fails when player name is too long
      Given I am on the registration page
      When I register with:
        | Field       | Value         |
        | Player Name | VeryLongName1 |
        | PIN         | 1234          |
      Then the account should not be created
      And I should see the validation message "Player Name must be at most 10 characters"
