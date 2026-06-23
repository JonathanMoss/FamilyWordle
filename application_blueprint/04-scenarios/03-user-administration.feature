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
