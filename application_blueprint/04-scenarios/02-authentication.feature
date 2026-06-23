Feature: Player Authentication
  As a registered player
  I want to sign in and sign out
  So that I can securely access my account

  Rule: Only valid and active player accounts can sign in

    Scenario: Registered player signs in successfully
      Given a registered player "Jon" exists
      And I am on the sign in page
      When I sign in as "Jon"
      Then I should be signed in
      And I should see the home page

    Scenario: Sign in fails for an unknown player
      Given no registered player "Ghost" exists
      And I am on the sign in page
      When I sign in as "Ghost"
      Then I should not be signed in
      And I should see the authentication message "User does not exist"

    Scenario: Sign in fails for a disabled player
      Given a disabled player "Jon" exists
      And I am on the sign in page
      When I sign in as "Jon"
      Then I should not be signed in
      And I should see the authentication message "Account disabled"

    Scenario: Removed player cannot sign in
      Given a removed player "Jon" exists
      And I am on the sign in page
      When I sign in as "Jon"
      Then I should not be signed in
      And I should see the authentication message "User does not exist"

  Rule: Only signed-in players can access protected pages

    Scenario: Signed-out player cannot access the home page
      Given I am not signed in
      When I access the home page
      Then I should be redirected to the sign in page

    Scenario: Signed-in player signs out successfully
      Given I am signed in as "Jon"
      When I sign out
      Then I should no longer be signed in
      And I should be redirected to the sign in page

