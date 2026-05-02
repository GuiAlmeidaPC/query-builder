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
            {"table": "customer_commerce", "column": "total_orders"},
            {"table": "customer_commerce", "column": "total_revenue"},
        ],
    })
    assert result["query"] == (
        'SELECT "customer_commerce"."total_orders", "customer_commerce"."total_revenue" FROM "customer_commerce"'
    )


def test_single_table_eq_filter():
    result = post({
        "dialect": "sqlite",
        "fields": [{"table": "customer_commerce", "column": "total_revenue"}],
        "filters": [{"table": "customer_commerce", "column": "preferred_category", "operator": "eq", "value": "electronics"}],
    })
    assert result["query"] == (
        'SELECT "customer_commerce"."total_revenue" FROM "customer_commerce" '
        "WHERE \"customer_commerce\".\"preferred_category\" = 'electronics'"
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
        "fields": [{"table": "customer_billing", "column": "customer_id"}],
        "filters": [{"table": "customer_billing", "column": "credit_tier", "operator": "in", "value": ["gold", "platinum"]}],
    })
    assert "IN ('gold', 'platinum')" in result["query"]


def test_not_in_operator():
    result = post({
        "dialect": "sqlite",
        "fields": [{"table": "customer_billing", "column": "customer_id"}],
        "filters": [{"table": "customer_billing", "column": "credit_tier", "operator": "not_in", "value": ["suspended"]}],
    })
    assert "NOT IN ('suspended')" in result["query"]


def test_is_null():
    result = post({
        "dialect": "sqlite",
        "fields": [{"table": "customer_commerce", "column": "customer_id"}],
        "filters": [{"table": "customer_commerce", "column": "last_order_at", "operator": "is_null"}],
    })
    assert '"customer_commerce"."last_order_at" IS NULL' in result["query"]


def test_is_not_null():
    result = post({
        "dialect": "sqlite",
        "fields": [{"table": "customer_commerce", "column": "customer_id"}],
        "filters": [{"table": "customer_commerce", "column": "last_order_at", "operator": "is_not_null"}],
    })
    assert '"customer_commerce"."last_order_at" IS NOT NULL' in result["query"]


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
        "fields": [{"table": "customer_commerce", "column": "customer_id"}],
        "filters": [
            {"table": "customer_commerce", "column": "total_revenue", "operator": "gt", "value": 100},
            {"table": "customer_commerce", "column": "preferred_category", "operator": "eq", "value": "electronics"},
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
            {"table": "customer_commerce", "column": "total_revenue"},
            {"table": "customers", "column": "name"},
        ],
    })
    query = result["query"]
    assert 'FROM "customer_commerce"' in query
    assert 'JOIN "customers"' in query
    assert '"customer_commerce"."customer_id" = "customers"."customer_id"' in query


def test_three_table_join():
    result = post({
        "dialect": "athena",
        "fields": [
            {"table": "customer_commerce", "column": "total_revenue"},
            {"table": "customers", "column": "email"},
            {"table": "customer_billing", "column": "preferred_payment_method"},
        ],
    })
    query = result["query"]
    assert 'FROM "customer_commerce"' in query
    assert 'JOIN "customers"' in query
    assert 'JOIN "customer_billing"' in query


def test_join_triggered_by_filter_table():
    result = post({
        "dialect": "sqlite",
        "fields": [{"table": "customer_commerce", "column": "total_revenue"}],
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
        "fields": [{"table": "customer_commerce", "column": "customer_id"}],
        "filters": [{"table": "customer_commerce", "column": "preferred_category", "operator": "eq", "value": "it's here"}],
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
    post_error({"dialect": "sqlite", "fields": [{"table": "customer_commerce", "column": "123bad"}]})


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


# ---------------------------------------------------------------------------
# filter_groups — OR / AND connectors and grouping
# ---------------------------------------------------------------------------

def test_single_group_or_connector():
    result = post({
        "dialect": "sqlite",
        "fields": [{"table": "customers", "column": "customer_id"}],
        "filter_groups": [
            {
                "connector": "AND",
                "filters": [
                    {"table": "customers", "column": "country", "operator": "eq", "value": "BR"},
                    {"table": "customers", "column": "city", "operator": "eq", "value": "SP", "connector": "OR"},
                ],
            }
        ],
    })
    assert result["query"] == (
        'SELECT "customers"."customer_id" FROM "customers" '
        'WHERE "customers"."country" = \'BR\' OR "customers"."city" = \'SP\''
    )


def test_two_groups_or_between():
    result = post({
        "dialect": "sqlite",
        "fields": [{"table": "customers", "column": "customer_id"}],
        "filter_groups": [
            {
                "connector": "AND",
                "filters": [
                    {"table": "customers", "column": "country", "operator": "eq", "value": "BR"},
                ],
            },
            {
                "connector": "OR",
                "filters": [
                    {"table": "customers", "column": "country", "operator": "eq", "value": "US"},
                ],
            },
        ],
    })
    assert result["query"] == (
        'SELECT "customers"."customer_id" FROM "customers" '
        'WHERE ("customers"."country" = \'BR\') OR ("customers"."country" = \'US\')'
    )


def test_two_groups_and_between():
    result = post({
        "dialect": "sqlite",
        "fields": [{"table": "customers", "column": "customer_id"}],
        "filter_groups": [
            {
                "connector": "AND",
                "filters": [
                    {"table": "customers", "column": "country", "operator": "eq", "value": "BR"},
                ],
            },
            {
                "connector": "AND",
                "filters": [
                    {"table": "customers", "column": "is_active", "operator": "eq", "value": True},
                ],
            },
        ],
    })
    assert result["query"] == (
        'SELECT "customers"."customer_id" FROM "customers" '
        'WHERE ("customers"."country" = \'BR\') AND ("customers"."is_active" = 1)'
    )


def test_two_groups_multi_filter_each():
    result = post({
        "dialect": "sqlite",
        "fields": [{"table": "customers", "column": "customer_id"}],
        "filter_groups": [
            {
                "connector": "AND",
                "filters": [
                    {"table": "customers", "column": "country", "operator": "eq", "value": "BR"},
                    {"table": "customers", "column": "city", "operator": "eq", "value": "SP", "connector": "AND"},
                ],
            },
            {
                "connector": "OR",
                "filters": [
                    {"table": "customers", "column": "country", "operator": "eq", "value": "US"},
                    {"table": "customers", "column": "city", "operator": "eq", "value": "NY", "connector": "AND"},
                ],
            },
        ],
    })
    assert result["query"] == (
        'SELECT "customers"."customer_id" FROM "customers" '
        'WHERE ("customers"."country" = \'BR\' AND "customers"."city" = \'SP\') '
        'OR ("customers"."country" = \'US\' AND "customers"."city" = \'NY\')'
    )


def test_filter_groups_join_discovery():
    """Tables from filter_groups must still be discovered for JOIN."""
    result = post({
        "dialect": "sqlite",
        "fields": [{"table": "customers", "column": "customer_id"}],
        "filter_groups": [
            {
                "connector": "AND",
                "filters": [
                    {"table": "customer_commerce", "column": "total_revenue", "operator": "gt", "value": 100},
                ],
            },
        ],
    })
    assert "JOIN" in result["query"]
    assert '"customer_commerce"' in result["query"]


def test_legacy_filters_still_work_with_filter_groups_absent():
    """Requests using old flat filters= still return the same result."""
    result = post({
        "dialect": "sqlite",
        "fields": [{"table": "customers", "column": "customer_id"}],
        "filters": [
            {"table": "customers", "column": "country", "operator": "eq", "value": "BR"},
        ],
    })
    assert "WHERE" in result["query"]
    assert "BR" in result["query"]


def test_filter_groups_takes_precedence_over_filters():
    """When both filters and filter_groups are sent, filter_groups wins."""
    result = post({
        "dialect": "sqlite",
        "fields": [{"table": "customers", "column": "customer_id"}],
        "filters": [
            {"table": "customers", "column": "country", "operator": "eq", "value": "IGNORED"},
        ],
        "filter_groups": [
            {
                "connector": "AND",
                "filters": [
                    {"table": "customers", "column": "country", "operator": "eq", "value": "USED"},
                ],
            },
        ],
    })
    assert "USED" in result["query"]
    assert "IGNORED" not in result["query"]


def test_too_many_filter_groups_returns_422():
    result = client.post("/query/build", json={
        "dialect": "sqlite",
        "fields": [{"table": "t", "column": "c"}],
        "filter_groups": [
            {"connector": "AND", "filters": [{"table": "t", "column": "c", "operator": "eq", "value": "v"}]}
            for _ in range(11)
        ],
    })
    assert result.status_code == 422


def test_too_many_total_filters_across_groups_returns_422():
    result = client.post("/query/build", json={
        "dialect": "sqlite",
        "fields": [{"table": "t", "column": "c"}],
        "filter_groups": [
            {
                "connector": "AND",
                "filters": [
                    {"table": "t", "column": "c", "operator": "eq", "value": "v"}
                    for _ in range(26)
                ],
            },
            {
                "connector": "AND",
                "filters": [
                    {"table": "t", "column": "c", "operator": "eq", "value": "v"}
                    for _ in range(26)
                ],
            },
        ],
    })
    assert result.status_code == 422


def test_empty_filter_group_returns_422():
    result = client.post("/query/build", json={
        "dialect": "sqlite",
        "fields": [{"table": "t", "column": "c"}],
        "filter_groups": [{"connector": "AND", "filters": []}],
    })
    assert result.status_code == 422

