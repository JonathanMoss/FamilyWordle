Feature: User Administration
  As an administrator
  I want to manage player accounts
  So that I can control access and maintain system integrity

  Background:
    Given I am signed in as an administrator

  Rule: Administrators can create, update, disable, enable and remove player accounts

    Scenario: Administrator creates a player account
      Given I am on the user administration page
      When I create a player with:
        | Field       | Value |
        | Player Name | Alice |
      Then the account for player "Alice" should be created

    Scenario Outline: Administrator cannot create a player with invalid data
      Given I am on the user administration page
      When I create a player with "<Field>" set to "<Value>"
      Then the account should not be created
      And I should see the validation message "<Error Message>"

      Examples:
        | Field       | Value | Error Message           |
        | Player Name |       | Player Name is required |

    Scenario: Administrator cannot create a duplicate player account
      Given a registered player "Alice" exists
      And I am on the user administration page
      When I create a player with:
        | Field       | Value |
        | Player Name | Alice |
      Then the account should not be created
      And I should see the validation message "User already exists"

    Scenario: Administrator updates a player name
      Given a registered player "Alice" exists
      When I rename player "Alice" to "Alice123"
      Then player "Alice123" should exist
      And player "Alice" should no longer exist

    Scenario: Administrator disables a player account
      Given a registered player "Alice" exists
      When I disable player "Alice"
      Then player "Alice" should be disabled

    Scenario: Administrator enables a disabled player account
      Given a disabled player "Alice" exists
      When I enable player "Alice"
      Then player "Alice" should be active

    Scenario: Administrator removes a player account
      Given a registered player "Alice" exists
      When I remove player "Alice"
      Then player "Alice" should be removed

  Rule: Non-administrators cannot manage player accounts

    Scenario: Standard player cannot access user administration
      Given I am signed in as player "Jon"
      When I access the user administration page
      Then I should see the authorization message "Access denied"

    Scenario: Administrator views all registered players
      Given a registered player "Alice" exists
      And a registered player "Bob" exists
      When I access the user administration page
      Then I should see a list containing players "Alice" and "Bob"

    Scenario: Standard player cannot modify player accounts
      Given a registered player "Alice" exists
      And I am signed in as player "Jon"
      When I attempt to rename player "Alice" to "Alice123" as standard player
      Then I should see the authorization message "Access denied"

    Scenario: Standard player cannot remove a player account
      Given a registered player "Alice" exists
      And I am signed in as player "Jon"
      When I attempt to remove player "Alice" as standard player
      Then I should see the authorization message "Access denied"

    Scenario: Administrator cannot update a non-existent player
      When I attempt to rename non-existent player "NonExistent"
      Then the update should fail with status "Player not found"

    Scenario: Administrator cannot update a player to an empty username
      Given a registered player "Alice" exists
      When I attempt to rename player "Alice" to empty username
      Then the update should fail with status "Invalid username"

    Scenario: Administrator cannot update a player to a duplicate username
      Given a registered player "Alice" exists
      And a registered player "Bob" exists
      When I attempt to rename player "Alice" to duplicate username "Bob"
      Then the update should fail with status "Username already exists"

    Scenario: Administrator cannot update a player with an invalid status
      Given a registered player "Alice" exists
      When I attempt to update player "Alice" with status "invalid_status"
      Then the update should fail with status "Invalid status"

    Scenario: Administrator cannot update a player with an invalid role
      Given a registered player "Alice" exists
      When I attempt to update player "Alice" with role "invalid_role"
      Then the update should fail with status "Invalid role"
