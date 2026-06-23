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

**Responsibilities**
- Implement game rules and logic
- Manage player sessions
- Handle authentication
- Provide REST-style API endpoints
- Calculate statistics and league rankings

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

**Responsibilities**
- Store player accounts
- Store game sessions and results
- Maintain archive of daily words
- Store aggregated player statistics

**Characteristics**
- Embedded, file-based database
- No separate database server required

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

## 10. Conclusion

This architecture provides a robust foundation for a Wordle-style application. It balances simplicity with extensibility, allowing the system to operate efficiently at small scale while providing a clear path toward production-grade scalability.
