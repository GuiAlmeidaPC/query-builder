from __future__ import annotations

from enum import Enum
from typing import List, Optional, Union

from pydantic import BaseModel, Field, model_validator

IDENTIFIER_PATTERN = r"^[a-zA-Z_][a-zA-Z0-9_]*$"
IDENTIFIER_OPTS = dict(min_length=1, max_length=128, pattern=IDENTIFIER_PATTERN)


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


class FieldModel(BaseModel):
    table: str = Field(**IDENTIFIER_OPTS)
    column: str = Field(**IDENTIFIER_OPTS)


class Filter(BaseModel):
    table: str = Field(**IDENTIFIER_OPTS)
    column: str = Field(**IDENTIFIER_OPTS)
    operator: Operator
    value: Optional[Union[str, int, float, bool, List[Union[str, int, float]]]] = None

    @model_validator(mode="after")
    def validate_value(self) -> "Filter":
        null_ops = {Operator.is_null, Operator.is_not_null}
        list_ops = {Operator.in_, Operator.not_in}

        if self.operator not in null_ops and self.value is None:
            raise ValueError(f"operator '{self.operator}' requires a value")

        if self.operator in list_ops:
            if not isinstance(self.value, list):
                raise ValueError(f"operator '{self.operator}' requires a list value")
            if len(self.value) == 0:
                raise ValueError(f"operator '{self.operator}' requires a non-empty list")
            if len(self.value) > 1000:
                raise ValueError("list value cannot exceed 1000 items")

        return self


class QueryRequest(BaseModel):
    dialect: Dialect
    fields: List[FieldModel] = Field(..., min_length=1, max_length=50)
    filters: List[Filter] = Field(default_factory=list, max_length=50)

    @model_validator(mode="after")
    def at_least_one_field(self) -> "QueryRequest":
        if not self.fields:
            raise ValueError("at least one field is required")
        return self


class QueryResponse(BaseModel):
    query: str
