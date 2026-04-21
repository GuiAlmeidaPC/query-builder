# Query Builder API

A REST API that builds SQL `SELECT` queries from structured field and filter inputs. Supports **Amazon Athena** and **SQLite** dialects. When fields from more than one table are requested, tables are automatically joined on their shared primary key `customer_id`.

## Requirements

- Python 3.13+
- [uv](https://docs.astral.sh/uv/) (package manager)

## Setup

```bash
uv sync
```

## Running

```bash
uv run uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000`.  
Interactive docs (Swagger UI): `http://localhost:8000/docs`

## Testing

```bash
uv run pytest tests/ -v
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
{
  "query": "<generated SQL string>"
}
```

---

## Examples

### Single table, no filters

```bash
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
{
  "query": "SELECT \"orders\".\"order_id\", \"orders\".\"amount\" FROM \"orders\""
}
```

---

### Single table with filters

```bash
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

```json
{
  "query": "SELECT \"orders\".\"order_id\", \"orders\".\"amount\" FROM \"orders\" WHERE \"orders\".\"amount\" >= 500 AND \"orders\".\"status\" IN ('paid', 'pending')"
}
```

---

### Multi-table query (auto-JOIN on `customer_id`)

```bash
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

```json
{
  "query": "SELECT \"orders\".\"amount\", \"customers\".\"email\", \"payments\".\"method\" FROM \"orders\" JOIN \"customers\" ON \"orders\".\"customer_id\" = \"customers\".\"customer_id\" JOIN \"payments\" ON \"orders\".\"customer_id\" = \"payments\".\"customer_id\" WHERE \"customers\".\"country\" = 'BR' AND \"orders\".\"cancelled_at\" IS NULL"
}
```

---

## Architecture

```
app/
  main.py          FastAPI application and route definition
  models.py        Pydantic request/response models and validation
  builder.py       Query assembly: SELECT, FROM, JOIN, WHERE
  dialects/
    base.py        Abstract dialect base class (quoting, value formatting)
    athena.py      Amazon Athena dialect (Presto/Trino compatible)
    sqlite.py      SQLite dialect
tests/
  test_builder.py  Integration tests via TestClient (21 cases)
```

### JOIN strategy

The first table encountered across `fields` and `filters` (in order) becomes the `FROM` table. Every additional table is joined to it with an explicit `INNER JOIN` on `customer_id`:

```sql
FROM "primary_table"
JOIN "other_table" ON "primary_table"."customer_id" = "other_table"."customer_id"
```

### Adding a new dialect

1. Create `app/dialects/my_dialect.py` extending `BaseDialect`
2. Override `quote()` and any formatting methods that differ
3. Add the new value to `Dialect` enum in `models.py`
4. Map it in `_get_dialect()` in `builder.py`
