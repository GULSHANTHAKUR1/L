from datetime import datetime, timezone
from fastapi import APIRouter
from app.schemas import HealthResponse
from app.services.ocr_service import check_tesseract_installed
from app.services.embedding_service import is_model_ready
from app.services.vector_store import get_vector_store

router = APIRouter(tags=["Health"])


@router.get("/health", response_model=HealthResponse)
def get_service_health():
    """
    Diagnostic health endpoint for HETEROHMS AI Microservice.
    Verifies service vitality, Tesseract OCR accessibility, embedding model, and vector store.
    """
    tesseract_ok = check_tesseract_installed()
    model_ok = is_model_ready()
    store = get_vector_store()
    store_ok = store.is_ready()

    is_healthy = tesseract_ok and model_ok and store_ok

    return HealthResponse(
        status="ok" if is_healthy else "degraded",
        service="heterohms-ai-microservice",
        tesseract_available=tesseract_ok,
        embedding_model_ready=model_ok,
        vector_store_ready=store_ok,
        version="1.1.0",
        timestamp=datetime.now(timezone.utc).isoformat(),
    )
