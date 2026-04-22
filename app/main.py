import logging
import os

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.builder import build_query
from app.models import QueryRequest, QueryResponse

logger = logging.getLogger(__name__)

_ENV = os.getenv("ENVIRONMENT", "development")
_is_dev = _ENV == "development"

limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="Query Builder API",
    version="1.0.0",
    docs_url="/docs" if _is_dev else None,
    redoc_url="/redoc" if _is_dev else None,
    openapi_url="/openapi.json" if _is_dev else None,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["POST"],
    allow_headers=["Content-Type"],
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    logger.warning("Validation error on %s: %s", request.url.path, exc.errors())
    return JSONResponse(status_code=422, content={"detail": "Invalid request parameters"})


@app.post("/query/build", response_model=QueryResponse)
@limiter.limit("60/minute")
def build(request: Request, body: QueryRequest) -> QueryResponse:
    return QueryResponse(query=build_query(body))
