from app.dialects.base import BaseDialect


class AthenaDialect(BaseDialect):
    """Presto/Trino-compatible dialect used by Amazon Athena."""

    def quote(self, identifier: str) -> str:
        return f'"{identifier}"'
