from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.routers import health, ocr, semantic_search
from app.services.embedding_service import get_embedding_model
from app.services.vector_store import get_vector_store


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application Lifespan: Pre-loads the SentenceTransformers model and initializes
    ChromaDB vector store once upon service boot.
    """
    try:
        get_embedding_model()
        get_vector_store()
    except Exception as exc:
        print(f"[Lifespan Notice] Non-fatal initialization notice: {exc}")
    yield


app = FastAPI(
    title="HETEROHMS AI & Semantic Search Microservice",
    description=(
        "Standalone Python microservice for clinical document OCR extraction and vector search. "
        "Performs OCR on medical scans/PDFs and semantic similarity search across EHR records. "
        "Strictly provides information retrieval; does not generate clinical diagnoses or advice."
    ),
    version="1.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register route modules
app.include_router(health.router)
app.include_router(ocr.router)
app.include_router(semantic_search.router)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_: Request, exc: RequestValidationError):
    """
    Standardizes request validation error responses.
    """
    error_messages = [f"{err['loc'][-1]}: {err['msg']}" for err in exc.errors()]
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "status": "failed",
            "error": "Request payload validation failed",
            "details": error_messages,
        },
    )


@app.get("/", tags=["Root"])
def root():
    return {
        "service": "HETEROHMS AI & Semantic Search Microservice",
        "status": "operational",
        "documentation": "/docs",
        "health": "/health",
        "endpoints": {
            "health": "GET /health",
            "process_ocr": "POST /api/ocr/process",
            "index_embeddings": "POST /api/embeddings/index",
            "query_semantic_search": "POST /api/semantic-search/query",
            "delete_embeddings": "POST /api/embeddings/delete-by-source",
            "search_status": "GET /api/semantic-search/status",
        },
        "disclaimer": "Information retrieval and indexing only. Does not diagnose or recommend treatments.",
    }
