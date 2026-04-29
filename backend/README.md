# backend

FastAPI service that builds SQL queries for Athena / SQLite from structured input.

## Layout

```
app/
├── main.py             # FastAPI app, mounts middleware, includes routers
├── api/                # APIRouter modules (one file per domain): query.py
├── core/               # config (pydantic-settings) + middleware (CORS, rate limit)
├── schemas/            # Pydantic request/response models (DTOs): query.py
├── services/           # Business logic: query_builder.py
└── dialects/           # Dialect implementations (Athena, SQLite)
```

Folders intentionally not present (will be added when the corresponding capability is needed):

- `models/` — SQLAlchemy / SQLModel ORM models. Only needed once a database is introduced.
- `core/security.py` — JWT + auth dependencies. Only needed once the API requires authentication.
- `alembic/` — database migrations. Add together with `models/` once a DB is in place.

## Run

```sh
uv sync
cp .env.example .env
uv run uvicorn app.main:app --reload
```

## Test

```sh
uv run pytest
```
