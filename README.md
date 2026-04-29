# Query Builder

A modular monorepo containing:

- **`backend/`** — FastAPI service that builds SQL `SELECT` queries from structured field/filter input. Supports **Amazon Athena** and **SQLite** dialects. When fields from more than one table are requested, tables are automatically joined on the shared primary key `customer_id`.
- **`frontend/`** — React + Vite UI for building queries interactively.

## Layout

```
query-builder/
├── backend/                FastAPI service (see backend/README.md)
│   └── app/
│       ├── api/            APIRouter modules (query.py)
│       ├── core/           config + middleware (CORS, rate limit)
│       ├── schemas/        Pydantic DTOs (query.py)
│       ├── services/       Business logic (query_builder.py)
│       └── dialects/       Athena, SQLite
├── frontend/               React app (see frontend code)
│   └── src/
│       ├── features/
│       │   └── query-builder/    QueryBuilder component, hook, formatSQL
│       ├── services/             API client + contract types
│       ├── shared/               Generic utilities
│       ├── components/           (placeholder — global UI)
│       └── hooks/                (placeholder — global hooks)
├── docker-compose.yml      Orchestrates both services
└── README.md
```

## Run locally (without Docker)

**Backend** (Python 3.13 + [uv](https://docs.astral.sh/uv/)):

```sh
cd backend
uv sync
cp .env.example .env
uv run uvicorn app.main:app --reload
```

API at `http://localhost:8000`. Docs at `http://localhost:8000/docs` when `ENVIRONMENT=development`.

**Frontend** (Node 20+):

```sh
cd frontend
npm install
npm run dev
```

App at `http://localhost:5173/querybuilder/`. The Vite dev server proxies `/querybuilder/query/*` to `http://localhost:8000`.

## Run with Docker

```sh
cp backend/.env.example backend/.env
docker compose up --build
```

App at `http://localhost:8080/querybuilder/`. Nginx proxies `/querybuilder/query/*` to the `backend` container.

## Test

```sh
cd backend && uv run pytest
cd frontend && npm run lint && npm run build
```

---

## API Reference

### `POST /query/build`

Builds a SQL query from the provided fields and filters.

#### Request body

| Field | Type | Required | Description |
|---|---|---|---|
| `dialect` | `"athena"` \| `"sqlite"` | Yes | SQL dialect for the output query |
| `fields` | `Field[]` | Yes | Columns to include in SELECT (at least one) |
| `filters` | `Filter[]` | No | WHERE conditions (default: none) |

**Field object**

| Field | Type | Description |
|---|---|---|
| `table` | `string` | Table name |
| `column` | `string` | Column name |

**Filter object**

| Field | Type | Description |
|---|---|---|
| `table` | `string` | Table name |
| `column` | `string` | Column name |
| `operator` | `Operator` | See operator table below |
| `value` | `any` | Required for all operators except `is_null` / `is_not_null` |

**Supported operators**

| Operator | SQL equivalent | Value type |
|---|---|---|
| `eq` | `=` | scalar |
| `neq` | `!=` | scalar |
| `gt` | `>` | number |
| `gte` | `>=` | number |
| `lt` | `<` | number |
| `lte` | `<=` | number |
| `like` | `LIKE` | string |
| `not_like` | `NOT LIKE` | string |
| `in` | `IN (...)` | array |
| `not_in` | `NOT IN (...)` | array |
| `is_null` | `IS NULL` | — |
| `is_not_null` | `IS NOT NULL` | — |

#### Response body

```json
{ "query": "<generated SQL string>" }
```

---

## Examples

### Single table, no filters

```sh
curl -X POST http://localhost:8000/query/build \
  -H "Content-Type: application/json" \
  -d '{
    "dialect": "sqlite",
    "fields": [
      {"table": "orders", "column": "order_id"},
      {"table": "orders", "column": "amount"}
    ]
  }'
```

```json
{ "query": "SELECT \"orders\".\"order_id\", \"orders\".\"amount\" FROM \"orders\"" }
```

### Single table with filters

```sh
curl -X POST http://localhost:8000/query/build \
  -H "Content-Type: application/json" \
  -d '{
    "dialect": "athena",
    "fields": [
      {"table": "orders", "column": "order_id"},
      {"table": "orders", "column": "amount"}
    ],
    "filters": [
      {"table": "orders", "column": "amount", "operator": "gte", "value": 500},
      {"table": "orders", "column": "status", "operator": "in", "value": ["paid", "pending"]}
    ]
  }'
```

### Multi-table query (auto-JOIN on `customer_id`)

```sh
curl -X POST http://localhost:8000/query/build \
  -H "Content-Type: application/json" \
  -d '{
    "dialect": "athena",
    "fields": [
      {"table": "orders", "column": "amount"},
      {"table": "customers", "column": "email"},
      {"table": "payments", "column": "method"}
    ],
    "filters": [
      {"table": "customers", "column": "country", "operator": "eq", "value": "BR"},
      {"table": "orders", "column": "cancelled_at", "operator": "is_null"}
    ]
  }'
```

---

## JOIN strategy

The first table encountered across `fields` and `filters` (in order) becomes the `FROM` table. Every additional table is joined to it with an explicit `INNER JOIN` on `customer_id`:

```sql
FROM "primary_table"
JOIN "other_table" ON "primary_table"."customer_id" = "other_table"."customer_id"
```

## Adding a new dialect

1. Create `backend/app/dialects/my_dialect.py` extending `BaseDialect`
2. Override `quote()` and any formatting methods that differ
3. Add the new value to the `Dialect` enum in `backend/app/schemas/query.py`
4. Map it in `_get_dialect()` in `backend/app/services/query_builder.py`
