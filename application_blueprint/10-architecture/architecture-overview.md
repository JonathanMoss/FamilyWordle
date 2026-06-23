# Wordle Game – Architecture Overview

## 1. Overview

This document describes the architecture for the Wordle-style game application. The system is designed as a lightweight, containerised web application with clear separation of concerns between presentation, application logic, and data persistence.

The architecture is optimised for:
- Simplicity and maintainability
- Deterministic gameplay behaviour
- Deployment on a single host with minimal overhead
- Evolution toward scalable production architecture

---

## 2. High-Level Architecture

Client–server model with reverse proxy and containerised deployment:

Client (Browser) → NGINX → Gunicorn → Flask → SQLite

---

## 3. Architectural Layers

### 3.1 Client Layer

**Technologies**
- HTML, CSS, JavaScript
- Bootstrap UI framework

**Responsibilities**
- Render user interface
- Capture user input (guesses, login)
- Display gameplay feedback and statistics
- Interact with server via HTTP API calls

**Design Approach**
- Thin client
- No business logic implemented on client

---

### 3.2 Reverse Proxy Layer (NGINX)

**Responsibilities**
- Accept external HTTP/S traffic
- Route requests to backend services
- Serve static assets (CSS, JS)
- Terminate SSL connections

**Benefits**
- Performance optimisation
- Security boundary
- Static content handling

---

### 3.3 Application Layer

**Technologies**
- Python 3.13
- Flask
- Gunicorn (WSGI server)
- bcrypt (for secure PIN hashing)

**Responsibilities**
- Implement game rules and logic
- Manage player sessions
- Handle authentication (PIN verification and secure session cookies)
- Provide REST-style API endpoints
- Calculate statistics and league rankings
- Bootstrapping of admin users via CLI command

**Design Principles**
- Stateless request handling
- Server-authoritative game logic
- Deterministic daily word selection

---

### 3.4 Domain Modelling (Use of Pydantic)

All application entities are defined using **Pydantic**.

Pydantic is used to:
- Enforce strict data validation
- Provide typed data structures for all domain entities
- Validate all inbound API payloads
- Ensure consistent response schemas

**Scope of Use**
- Request validation for API endpoints
- Response serialization
- Internal domain object modelling
- Input validation for gameplay (e.g. guesses, player details)

**Benefits**
- Strong typing and schema enforcement
- Reduced runtime errors
- Clean separation between transport and business logic
- Alignment with BDD scenarios and validation rules

---

### 3.5 Data Layer

**Technology**
- SQLite
- SQLModel (Object-Relational Mapper combining SQLAlchemy and Pydantic)

**Responsibilities**
- Manage relational database connections and transactions
- Store player accounts
- Store game sessions and results
- Maintain archive of daily words
- Store aggregated player statistics

**Characteristics**
- Embedded, file-based database
- No separate database server required
- Declarative table schemas using Python classes (SQLModel)

**Constraints**
- Single-writer concurrency model
- Suitable for low-to-moderate load

---

### 3.6 Infrastructure Layer

**Technologies**
- Docker
- Docker Compose
- Ubuntu Linux host

**Responsibilities**
- Containerise application components
- Orchestrate services (NGINX and backend)
- Ensure environment consistency across deployments

**Deployment Model**
- NGINX container exposed externally
- Flask/Gunicorn container internal
- Shared network between services

---

### 3.7 Development and Testing

**Technologies**
- pytest
- pytest-bdd
- pylint

**Responsibilities**
- Unit and behavioural test execution
- BDD alignment with system requirements
- Static code analysis and quality enforcement

---

## 4. Request Flow

Example flow for submitting a guess:

1. Client sends HTTP request
2. NGINX receives and forwards request
3. Gunicorn processes request and invokes Flask
4. Flask service:
   - Validates payload using Pydantic
   - Applies game rules
   - Updates game state
   - Persists data to SQLite
5. Response returned to client via NGINX

---

## 5. Key Architectural Characteristics

### Determinism
- Daily word is consistent across all users
- Game behaviour is predictable and repeatable

### Server Authority
- All validation and rules executed server-side
- Eliminates risk of client-side manipulation

### Statelessness
- Requests are independent
- Session state reconstructed from persisted data

### Simplicity
- Minimal components
- Easy to deploy and debug

---

## 6. Constraints and Trade-offs

| Area | Constraint |
|------|-----------|
| Database | SQLite limited to single concurrent writer |
| Scaling | Single-host deployment model |
| Backend | Requires WSGI server for concurrency |
| State Management | Derived from persisted data |

---

## 7. Recommended Enhancements

### Production Server
- Use Gunicorn for request handling (already included)

### Database Evolution
- Retain SQLite for MVP
- Transition to PostgreSQL when concurrency increases

### Observability
- Add structured logging
- Implement health check endpoints

### Security
- Secure cryptographic PIN hashing (using bcrypt or PBKDF2)
- Enable HTTPS via reverse proxy
- Add rate limiting

### Performance
- Enable static asset caching in NGINX

---

## 8. Stack Summary

**Client**
- HTML, CSS, JavaScript, Bootstrap

**Server**
- Flask (Python 3.13)
- Gunicorn

**Proxy**
- NGINX

**Database**
- SQLite (upgrade path to PostgreSQL)

**Infrastructure**
- Docker and Docker Compose
- Ubuntu Linux host

**Development**
- pytest, pytest-bdd, pylint

**Domain Layer**
- Pydantic for all entity validation and schema enforcement

---

## 9. Future Evolution Path

1. Replace SQLite with PostgreSQL
2. Introduce caching layer (e.g. Redis)
3. Add horizontal scaling capability
4. Implement CI/CD pipeline
5. Introduce API versioning

---

## 10. Repository Layout

To structure development, the repository follows a modular layout:

```text
FamilyWordle/
├── application_blueprint/    # Specifications
├── src/
│   ├── app/
│   │   ├── __init__.py       # Flask application factory
│   │   ├── models.py         # SQLModel database/Pydantic models
│   │   ├── services.py       # Core gameplay, dictionary, & word selection logic
│   │   ├── routes/
│   │   │   ├── auth.py       # Registration, login, & logout endpoints
│   │   │   ├── game.py       # Daily game & demo game endpoints
│   │   │   └── admin.py      # Player management endpoints (admin-only)
│   │   ├── templates/        # HTML pages (index.html, admin.html)
│   │   └── static/
│   │       ├── css/          # style.css (custom styling & themes)
│   │       └── js/           # game.js (GUI handlers & API integrations)
│   └── tests/                # Pytest unit & Pytest-BDD scenarios
├── data/
│   ├── words.txt             # 5-letter permitted dictionary list
│   └── database.sqlite       # Local SQLite database (mounted volume)
├── Dockerfile                # Flask container setup
├── docker-compose.yml        # Services orchestrator (Nginx proxy & Flask web app)
├── nginx.conf                # Nginx reverse-proxy rules
└── requirements.txt          # Python dependencies (Flask, SQLModel, bcrypt, etc.)
```

---

## 11. Daily Word Selection Mechanism

To avoid relying on system-level cron runners (which are prone to downtime errors or container re-initialization failures), the server employs a **lazy-loading check** for daily word generation:
1. On any API query requiring daily game data (e.g., getting state, guessing, viewing stats), the request router checks if a row exists in the `DailyWord` table matching the current date (`YYYY-MM-DD` in the Europe/London timezone).
2. If the row is absent, a transaction is executed:
   - Select a random word from the `words.txt` permitted dictionary.
   - Verify it does not already exist in the `DailyWord` historical records (ensuring no reuse).
   - Write the word to the database for today's date.
3. The server then fulfills the player's game query using the selected word.

---

## 12. Conclusion

This architecture provides a robust foundation for a Wordle-style application. It balances simplicity with extensibility, allowing the system to operate efficiently at small scale while providing a clear path toward production-grade scalability.
