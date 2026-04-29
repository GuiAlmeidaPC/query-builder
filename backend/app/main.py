from fastapi import FastAPI

from app.api.query import router as query_router
from app.core.config import settings
from app.core.middleware import install_middleware

app = FastAPI(
    title="Query Builder API",
    version="1.0.0",
    docs_url="/docs" if settings.is_dev else None,
    redoc_url="/redoc" if settings.is_dev else None,
    openapi_url="/openapi.json" if settings.is_dev else None,
)

install_middleware(app)
app.include_router(query_router)
