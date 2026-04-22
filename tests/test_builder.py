import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def post(payload: dict) -> dict:
    resp = client.post("/query/build", json=payload)
    assert resp.status_code == 200, resp.text
    return resp.json()


def post_error(payload: dict) -> dict:
    resp = client.post("/query/build", json=payload)
    assert resp.status_code == 422
    return resp.json()


# ---------------------------------------------------------------------------
# Single-table queries
# ---------------------------------------------------------------------------

def test_single_table_no_filters():
    result = post({
        "dialect": "sqlite",
        "fields": [
            {"table": "orders", "column": "order_id"},
            {"table": "orders", "column": "amount"},
        ],
    })
    assert result["query"] == (
        'SELECT "orders"."order_id", "orders"."amount" FROM "orders"'
    )


def test_single_table_eq_filter():
    result = post({
        "dialect": "sqlite",
        "fields": [{"table": "orders", "column": "amount"}],
        "filters": [{"table": "orders", "column": "status", "operator": "eq", "value": "paid"}],
    })
    assert result["query"] == (
        "SELECT \"orders\".\"amount\" FROM \"orders\" "
        "WHERE \"orders\".\"status\" = 'paid'"
    )


def test_numeric_operators():
    result = post({
        "dialect": "athena",
        "fields": [{"table": "sales", "column": "revenue"}],
        "filters": [{"table": "sales", "column": "revenue", "operator": "gte", "value": 1000}],
    })
    assert '"sales"."revenue" >= 1000' in result["query"]


def test_in_operator():
    result = post({
        "dialect": "sqlite",
        "fields": [{"table": "orders", "column": "order_id"}],
        "filters": [{"table": "orders", "column": "status", "operator": "in", "value": ["paid", "pending"]}],
    })
    assert "IN ('paid', 'pending')" in result["query"]


def test_not_in_operator():
    result = post({
        "dialect": "sqlite",
        "fields": [{"table": "orders", "column": "order_id"}],
        "filters": [{"table": "orders", "column": "status", "operator": "not_in", "value": ["cancelled"]}],
    })
    assert "NOT IN ('cancelled')" in result["query"]


def test_is_null():
    result = post({
        "dialect": "sqlite",
        "fields": [{"table": "orders", "column": "order_id"}],
        "filters": [{"table": "orders", "column": "deleted_at", "operator": "is_null"}],
    })
    assert '"orders"."deleted_at" IS NULL' in result["query"]


def test_is_not_null():
    result = post({
        "dialect": "sqlite",
        "fields": [{"table": "orders", "column": "order_id"}],
        "filters": [{"table": "orders", "column": "confirmed_at", "operator": "is_not_null"}],
    })
    assert '"orders"."confirmed_at" IS NOT NULL' in result["query"]


def test_like_operator():
    result = post({
        "dialect": "athena",
        "fields": [{"table": "customers", "column": "name"}],
        "filters": [{"table": "customers", "column": "name", "operator": "like", "value": "John%"}],
    })
    assert "LIKE 'John%'" in result["query"]


def test_not_like_operator():
    result = post({
        "dialect": "athena",
        "fields": [{"table": "customers", "column": "name"}],
        "filters": [{"table": "customers", "column": "name", "operator": "not_like", "value": "Bot%"}],
    })
    assert "NOT LIKE 'Bot%'" in result["query"]


def test_multiple_filters():
    result = post({
        "dialect": "sqlite",
        "fields": [{"table": "orders", "column": "order_id"}],
        "filters": [
            {"table": "orders", "column": "amount", "operator": "gt", "value": 100},
            {"table": "orders", "column": "status", "operator": "eq", "value": "paid"},
        ],
    })
    assert "WHERE" in result["query"]
    assert "AND" in result["query"]


# ---------------------------------------------------------------------------
# Multi-table JOIN
# ---------------------------------------------------------------------------

def test_two_table_join():
    result = post({
        "dialect": "sqlite",
        "fields": [
            {"table": "orders", "column": "amount"},
            {"table": "customers", "column": "name"},
        ],
    })
    query = result["query"]
    assert 'FROM "orders"' in query
    assert 'JOIN "customers"' in query
    assert '"orders"."customer_id" = "customers"."customer_id"' in query


def test_three_table_join():
    result = post({
        "dialect": "athena",
        "fields": [
            {"table": "orders", "column": "amount"},
            {"table": "customers", "column": "email"},
            {"table": "payments", "column": "method"},
        ],
    })
    query = result["query"]
    assert 'FROM "orders"' in query
    assert 'JOIN "customers"' in query
    assert 'JOIN "payments"' in query


def test_join_triggered_by_filter_table():
    result = post({
        "dialect": "sqlite",
        "fields": [{"table": "orders", "column": "amount"}],
        "filters": [{"table": "customers", "column": "country", "operator": "eq", "value": "BR"}],
    })
    query = result["query"]
    assert 'JOIN "customers"' in query


# ---------------------------------------------------------------------------
# Athena vs SQLite dialect differences
# ---------------------------------------------------------------------------

def test_athena_uses_double_quotes():
    result = post({
        "dialect": "athena",
        "fields": [{"table": "events", "column": "event_type"}],
    })
    assert '"events"."event_type"' in result["query"]


def test_sqlite_uses_double_quotes():
    result = post({
        "dialect": "sqlite",
        "fields": [{"table": "events", "column": "event_type"}],
    })
    assert '"events"."event_type"' in result["query"]


def test_string_escaping():
    result = post({
        "dialect": "sqlite",
        "fields": [{"table": "orders", "column": "order_id"}],
        "filters": [{"table": "orders", "column": "note", "operator": "eq", "value": "it's here"}],
    })
    assert "= 'it''s here'" in result["query"]


# ---------------------------------------------------------------------------
# Validation errors
# ---------------------------------------------------------------------------

def test_no_fields_returns_422():
    post_error({"dialect": "sqlite", "fields": []})


def test_in_operator_requires_list():
    post_error({
        "dialect": "sqlite",
        "fields": [{"table": "orders", "column": "id"}],
        "filters": [{"table": "orders", "column": "status", "operator": "in", "value": "paid"}],
    })


def test_non_null_operator_requires_value():
    post_error({
        "dialect": "sqlite",
        "fields": [{"table": "orders", "column": "id"}],
        "filters": [{"table": "orders", "column": "status", "operator": "eq"}],
    })


def test_invalid_dialect_returns_422():
    post_error({"dialect": "mysql", "fields": [{"table": "t", "column": "c"}]})


def test_invalid_operator_returns_422():
    post_error({
        "dialect": "sqlite",
        "fields": [{"table": "t", "column": "c"}],
        "filters": [{"table": "t", "column": "c", "operator": "contains", "value": "x"}],
    })


# ---------------------------------------------------------------------------
# Fix #2 — identifier constraints & input bounds
# ---------------------------------------------------------------------------

def test_invalid_table_name_returns_422():
    post_error({"dialect": "sqlite", "fields": [{"table": "invalid-name!", "column": "id"}]})


def test_invalid_column_name_returns_422():
    post_error({"dialect": "sqlite", "fields": [{"table": "orders", "column": "123bad"}]})


def test_table_name_too_long_returns_422():
    post_error({"dialect": "sqlite", "fields": [{"table": "a" * 129, "column": "id"}]})


def test_empty_table_name_returns_422():
    post_error({"dialect": "sqlite", "fields": [{"table": "", "column": "id"}]})


def test_too_many_fields_returns_422():
    post_error({
        "dialect": "sqlite",
        "fields": [{"table": "t", "column": "c"}] * 51,
    })


def test_too_many_filters_returns_422():
    post_error({
        "dialect": "sqlite",
        "fields": [{"table": "t", "column": "c"}],
        "filters": [{"table": "t", "column": "c", "operator": "eq", "value": "x"}] * 51,
    })


def test_in_operator_empty_list_returns_422():
    post_error({
        "dialect": "sqlite",
        "fields": [{"table": "t", "column": "c"}],
        "filters": [{"table": "t", "column": "c", "operator": "in", "value": []}],
    })


def test_in_operator_with_object_value_returns_422():
    post_error({
        "dialect": "sqlite",
        "fields": [{"table": "t", "column": "c"}],
        "filters": [{"table": "t", "column": "c", "operator": "in", "value": [{"nested": "obj"}]}],
    })


def test_valid_identifier_with_underscore():
    result = post({
        "dialect": "sqlite",
        "fields": [{"table": "order_items", "column": "_internal_id"}],
    })
    assert '"order_items"."_internal_id"' in result["query"]


# ---------------------------------------------------------------------------
# Fix #7 — generic error response body
# ---------------------------------------------------------------------------

def test_validation_error_returns_generic_message():
    resp = client.post("/query/build", json={"dialect": "sqlite", "fields": []})
    assert resp.status_code == 422
    body = resp.json()
    assert body == {"detail": "Invalid request parameters"}


def test_validation_error_hides_internals():
    resp = client.post("/query/build", json={"dialect": "sqlite", "fields": [{"table": "bad!", "column": "c"}]})
    assert resp.status_code == 422
    body = resp.json()
    # Must not leak field paths or pydantic type names
    assert "loc" not in str(body)
    assert "type" not in str(body)
