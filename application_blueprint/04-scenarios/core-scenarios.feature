Feature: Simple Player Registration
  As a new player
  I want to register for an account
  So that I can play FamilyWordle

  Scenario: Successful user registration with valid details
    Given I am on the registration page
    When I submit a registration with:
      | Field       | Value |
      | Player Name | Jon   |
    Then I should see a success message
    And my account should be created

  Scenario Outline: Registration validation for invalid data
    Given I am on the registration page
    When I submit a registration with an empty "<Field>" field
    Then I should see an error message stating "<Error Message>"
    And my account should not be created

    Examples:
      | Field       | Error Message             |
      | Player Name | Player Name is required   |

  Scenario: Registration fails with an already registered Player Name
    Given a user with Player Name "Jon" already exists
    And I am on the registration page
    When I submit a registration with Player Name "Jon"
    Then I should see an error message stating "Player Name already registered"
    And my account should not be created

Feature: User Authentication
  As a registered player
  I want to log in and out of the application
  So that I can securely access my account

  Scenario: Successful login with valid credentials
    Given a user with Player Name "Jon" exists
    And I am on the login page
    When I submit login credentials for Player Name "Jon"
    Then I should be logged in
    And I should see the home page

  Scenario: Login fails with invalid credentials
    Given a user with Player Name "Jon" exists
    And I am on the login page
    When I submit login credentials for Player Name "InvalidUser"
    Then I should see an error message stating "Invalid credentials"
    And I should not be logged in

  Scenario: Login fails when account does not exist
    Given no user exists with Player Name "Ghost"
    And I am on the login page
    When I submit login credentials for Player Name "Ghost"
    Then I should see an error message stating "User does not exist"
    And I should not be logged in

  Scenario: User logs out successfully
    Given I am logged in as "Jon"
    When I log out
    Then I should be logged out
    And I should be redirected to the login page

  Scenario: Unauthenticated user cannot access protected pages
    Given I am not logged in
    When I attempt to access the home page
    Then I should be redirected to the login page

