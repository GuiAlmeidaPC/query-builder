from app.dialects.base import BaseDialect


class SQLiteDialect(BaseDialect):
    def quote(self, identifier: str) -> str:
        return f'"{identifier}"'

    def format_value(self, value) -> str:
        # SQLite has no native boolean type; store as 0/1 integers
        if isinstance(value, bool):
            return "1" if value else "0"
        return super().format_value(value)
