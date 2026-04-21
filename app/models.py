from __future__ import annotations

from enum import Enum
from typing import Any, List, Optional, Union

from pydantic import BaseModel, model_validator


class Dialect(str, Enum):
    athena = "athena"
    sqlite = "sqlite"


class Operator(str, Enum):
    eq = "eq"
    neq = "neq"
    gt = "gt"
    gte = "gte"
    lt = "lt"
    lte = "lte"
    in_ = "in"
    not_in = "not_in"
    like = "like"
    not_like = "not_like"
    is_null = "is_null"
    is_not_null = "is_not_null"


class Field(BaseModel):
    table: str
    column: str


class Filter(BaseModel):
    table: str
    column: str
    operator: Operator
    value: Optional[Union[str, int, float, bool, List[Any]]] = None

    @model_validator(mode="after")
    def value_required_for_non_null_operators(self) -> "Filter":
        null_ops = {Operator.is_null, Operator.is_not_null}
        list_ops = {Operator.in_, Operator.not_in}

        if self.operator not in null_ops and self.value is None:
            raise ValueError(f"operator '{self.operator}' requires a value")

        if self.operator in list_ops and not isinstance(self.value, list):
            raise ValueError(f"operator '{self.operator}' requires a list value")

        return self


class QueryRequest(BaseModel):
    dialect: Dialect
    fields: List[Field]
    filters: List[Filter] = []

    @model_validator(mode="after")
    def at_least_one_field(self) -> "QueryRequest":
        if not self.fields:
            raise ValueError("at least one field is required")
        return self


class QueryResponse(BaseModel):
    query: str
