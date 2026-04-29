# app/core

Cross-cutting "plumbing" — runs at startup, used by every feature.

- `config.py` — `pydantic-settings` `Settings` (env vars, CORS origins, rate limits).
- `middleware.py` — CORS, slowapi rate limiter, validation error handler.
- `security.py` *(not present)* — JWT, password hashing, auth dependencies will live here when authentication is added.
