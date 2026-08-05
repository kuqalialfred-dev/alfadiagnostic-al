# AlfaDiagnostic.al

Ky folder përmban të gjithë projektin e website-it.

- `frontend/` — ndërfaqja React.
- `backend/` — API .NET 8, administratori dhe ruajtja e artikujve/fotove.
- `backend/wwwroot/` — versioni i ndërtuar i frontend-it dhe karta sociale.
- `Dockerfile` dhe `render.yaml` — konfigurimi i publikimit në Render.
- `.env.example` — variablat e nevojshme për zhvillim ose publikim.

Fotot e ngarkuara nga administratori ruhen si të dhëna binare në PostgreSQL (`images`), jo në AWS dhe jo në Base64. Në mungesë të `DATABASE_URL`, projekti përdor SQLite vetëm për testim lokal.
