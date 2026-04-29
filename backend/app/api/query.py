from fastapi import APIRouter, Request

from app.core.config import settings
from app.core.middleware import limiter
from app.schemas.query import QueryRequest, QueryResponse
from app.services.query_builder import build_query

router = APIRouter(prefix="/query", tags=["query"])


@router.post("/build", response_model=QueryResponse)
@limiter.limit(settings.RATE_LIMIT)
def build(request: Request, body: QueryRequest) -> QueryResponse:
    return QueryResponse(query=build_query(body))
