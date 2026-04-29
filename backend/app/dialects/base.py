from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any


class BaseDialect(ABC):
    PRIMARY_KEY = "customer_id"

    @abstractmethod
    def quote(self, identifier: str) -> str:
        """Wrap an identifier in dialect-specific quotes."""

    def qualified(self, table: str, column: str) -> str:
        return f"{self.quote(table)}.{self.quote(column)}"

    def format_value(self, value: Any) -> str:
        if isinstance(value, bool):
            return "1" if value else "0"
        if isinstance(value, str):
            escaped = value.replace("'", "''")
            return f"'{escaped}'"
        if isinstance(value, (int, float)):
            return str(value)
        raise TypeError(f"unsupported value type: {type(value)}")

    def format_list(self, values: list) -> str:
        return f"({', '.join(self.format_value(v) for v in values)})"
