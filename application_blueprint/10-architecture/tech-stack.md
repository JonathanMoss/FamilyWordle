**Client**
- HTML, CSS (Vanilla Custom Properties), JavaScript, Bootstrap (Grid/Utilities only)

**Server**
- Flask (Python 3.13)
- Gunicorn

**Proxy**
- NGINX

**Database**
- SQLite (mapped via SQLModel, upgrade path to PostgreSQL)

**Infrastructure**
- Docker and Docker Compose
- Ubuntu Linux host

**Development**
- pytest, pytest-bdd, pylint

**Domain Layer**
- Pydantic and SQLModel for schema validation and database-to-object mapping
- bcrypt (cryptographic PIN hashing)

**Design System & UI Styling**
- **Typography**: 
  - Primary UI Font: `Outfit` (Google Fonts)
  - Monospace Grid/Inputs Font: `JetBrains Mono` (Google Fonts)
- **Colors**:
  - Background Dark Slate: `#0e1118`
  - Glassmorphic Cards: `rgba(25, 30, 45, 0.6)`
  - Text Primary: `#f1f5f9`
  - Text Secondary: `#94a3b8`
  - Correct Position (Green): `#10b981`
  - Wrong Position (Yellow): `#f59e0b`
  - Absent (Dark Charcoal): `#334155`
- **Effects**:
  - Backdrop Blur: `backdrop-filter: blur(10px)`
  - Hover Transitions: `all 0.2s ease-in-out`


