# Non-Functional Requirements (NFRs)

## Overview

Non-functional requirements define **how the system behaves and performs**, rather than what it does. They describe quality attributes such as performance, security, reliability, and usability, which are critical to user experience and system success. 【1-da11fe】  

---

## 1. Performance

- The system shall respond to user actions (e.g. submitting a guess) within **300ms** under normal conditions.
- The daily game page shall load within **1 second for 95% of users**.
- Feedback for a guess shall be returned within **200ms**.

---

## 2. Availability

- The system shall achieve **99.9% uptime**.
- The system shall remain fully operational during the **daily reset window (00:01)**.
- Planned maintenance shall not occur during peak play periods (e.g. early morning).

---

## 3. Reliability

- The system shall return the **same daily word to all players on a given date**.
- Player progress shall be preserved in case of interruptions (e.g. browser close, refresh).
- No gameplay or statistics data shall be lost during normal operation.

---

## 4. Scalability

- The system shall support at least **10,000 concurrent users** without performance degradation.
- The system shall handle **peak traffic at daily reset (00:01)** without failure.

---

## 5. Security

- The daily word shall not be exposed before completion of the game.
- All user authentication shall prevent impersonation.
- Player data shall be securely stored and protected against unauthorized access.
- All inputs shall be validated to prevent abuse or injection attacks.

---

## 6. Usability

- A new user shall be able to start a game within **10 seconds without training**.
- Gameplay feedback shall be **clear, consistent, and intuitive**.
- Error messages shall be understandable and actionable.

---

## 7. Accessibility

- The system shall support **keyboard-only interaction**.
- Colour-based feedback shall have **alternative indicators** (e.g. symbols or patterns).
- The application shall be usable across **mobile and desktop devices**.

---

## 8. Data Integrity

- Only one daily word shall exist per day.
- A player shall have **only one result per day**.
- Statistics shall be derived from **completed games only**.
- The archive shall not contain duplicate words.

---

## 9. Maintainability

- The permitted word list shall be configurable without code changes.
- System components shall be modular to allow updates to:
  - Word selection
  - Scoring logic
  - Game rules
- Updates shall not require downtime greater than **5 minutes**.

---

## 10. Compatibility

- The application shall support modern browsers:
  - Chrome
  - Edge
  - Firefox
  - Safari
- The application shall function across:
  - Desktop devices
  - Mobile devices

---

## 11. Observability

- The system shall log:
  - Gameplay events
  - Errors
  - Failures
- Monitoring shall detect failures in:
  - Daily word generation
  - Daily reset process
- Alerts shall trigger if the daily word is not available at **00:01**.

---

## 12. Fairness & Game Integrity

- All players shall receive the **same daily word** on a given date.
- The daily word shall **never be reused once played**.
- No player shall have early access to the daily word.

---

## 13. Efficiency (Cost & Resource Use)

- The system shall scale resources dynamically to handle:
  - Peak demand (e.g. reset time)
  - Low usage periods
- Resource usage shall be optimised to minimise operational cost.

---

## 14. Demo Mode Isolation

- Demo games shall **not affect**:
  - Player statistics
  - League table rankings
  - Daily game availability
  - Word archive

---

## 15. Compliance (Lightweight)

- No personal data beyond player nickname shall be stored.
- The system shall comply with basic data protection principles (e.g. minimal data collection).

---
``