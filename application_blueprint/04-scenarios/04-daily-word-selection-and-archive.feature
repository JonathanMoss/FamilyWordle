Feature: Daily Word Selection and Archive
  As a player
  I want a new valid word each day
  So that the game is fair, consistent and never repeats

  Background:
    Given a permitted word list exists
    And an archive of previous daily words exists

  Rule: Only valid words are permitted for selection

    Scenario Outline: Invalid words are excluded from the permitted word list
      Given the source list contains the word "<Word>"
      When the permitted word list is generated
      Then the word "<Word>" should not appear in the permitted word list

      Examples:
        | Word    |
        | TREE    |
        | BANANAS |
        | 12345   |

    Scenario: Daily word is selected from the permitted word list
      Given today's daily word has not yet been selected
      When the system selects the daily word
      Then the selected word should appear in the permitted word list

    Scenario: Daily word is exactly five letters long
      Given today's daily word has not yet been selected
      When the system selects the daily word
      Then the selected word should be 5 letters long

  Rule: A daily word cannot be reused

    Scenario: Daily word does not appear in the archive
      Given today's daily word has not yet been selected
      When the system selects the daily word
      Then the selected word should not appear in the archive

    Scenario: Completed daily word is archived
      Given today's daily word is "CRANE"
      When the daily game is closed for the day
      Then the archive should contain the word "CRANE"

    Scenario: Archive does not contain duplicate words
      Given the archive contains the word "CRANE"
      When the system archives the word "CRANE" again
      Then the archive should contain "CRANE" only once

  Rule: The system handles exhaustion of available words

    Scenario: No daily word can be selected when all permitted words are archived
      Given every word in the permitted word list appears in the archive
      When the system selects the daily word
      Then no daily word should be selected
      And the system should raise the condition "No available words remaining"

