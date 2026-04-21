from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.builder import build_query
from app.models import QueryRequest, QueryResponse

app = FastAPI(title="Query Builder API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/query/build", response_model=QueryResponse)
def build(request: QueryRequest) -> QueryResponse:
    return QueryResponse(query=build_query(request))
