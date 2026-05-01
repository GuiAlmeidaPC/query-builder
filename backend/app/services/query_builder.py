from __future__ import annotations

from typing import List

from app.dialects.athena import AthenaDialect
from app.dialects.base import BaseDialect
from app.dialects.sqlite import SQLiteDialect
from app.schemas.query import Connector, Dialect, FieldModel, Filter, FilterGroup, Operator, QueryRequest

_OPERATOR_MAP = {
    Operator.eq: "=",
    Operator.neq: "!=",
    Operator.gt: ">",
    Operator.gte: ">=",
    Operator.lt: "<",
    Operator.lte: "<=",
    Operator.like: "LIKE",
    Operator.not_like: "NOT LIKE",
}


def _get_dialect(dialect: Dialect) -> BaseDialect:
    return AthenaDialect() if dialect == Dialect.athena else SQLiteDialect()


def _ordered_unique_tables(fields: List[FieldModel], groups: List[FilterGroup]) -> List[str]:
    seen: set[str] = set()
    tables: list[str] = []
    all_filters = [f for g in groups for f in g.filters]
    for item in [*fields, *all_filters]:
        if item.table not in seen:
            seen.add(item.table)
            tables.append(item.table)
    return tables


def _build_select(fields: List[FieldModel], d: BaseDialect) -> str:
    columns = [d.qualified(f.table, f.column) for f in fields]
    return "SELECT " + ", ".join(columns)


def _build_from_and_joins(tables: List[str], d: BaseDialect) -> str:
    pk = d.PRIMARY_KEY
    primary = tables[0]
    clause = f"FROM {d.quote(primary)}"
    for table in tables[1:]:
        clause += (
            f" JOIN {d.quote(table)}"
            f" ON {d.qualified(primary, pk)} = {d.qualified(table, pk)}"
        )
    return clause


def _build_condition(f: Filter, d: BaseDialect) -> str:
    col = d.qualified(f.table, f.column)
    op = f.operator

    if op == Operator.is_null:
        return f"{col} IS NULL"
    if op == Operator.is_not_null:
        return f"{col} IS NOT NULL"
    if op == Operator.in_:
        return f"{col} IN {d.format_list(f.value)}"
    if op == Operator.not_in:
        return f"{col} NOT IN {d.format_list(f.value)}"

    sql_op = _OPERATOR_MAP[op]
    return f"{col} {sql_op} {d.format_value(f.value)}"


def _build_group(group: FilterGroup, d: BaseDialect) -> str:
    """Build the condition expression for one filter group (without outer parens)."""
    parts: list[str] = []
    for i, f in enumerate(group.filters):
        condition = _build_condition(f, d)
        if i == 0:
            parts.append(condition)
        else:
            parts.append(f"{f.connector.value} {condition}")
    return " ".join(parts)


def _build_where(groups: List[FilterGroup], d: BaseDialect) -> str:
    if not groups:
        return ""

    if len(groups) == 1:
        return "WHERE " + _build_group(groups[0], d)

    group_exprs: list[str] = []
    for i, group in enumerate(groups):
        expr = f"({_build_group(group, d)})"
        if i == 0:
            group_exprs.append(expr)
        else:
            group_exprs.append(f"{group.connector.value} {expr}")

    return "WHERE " + " ".join(group_exprs)


def build_query(request: QueryRequest) -> str:
    d = _get_dialect(request.dialect)
    groups = request.effective_filter_groups()
    tables = _ordered_unique_tables(request.fields, groups)

    parts = [
        _build_select(request.fields, d),
        _build_from_and_joins(tables, d),
    ]

    where = _build_where(groups, d)
    if where:
        parts.append(where)

    return " ".join(parts)
