import os
from typing import List, Optional
from pydantic_settings import BaseSettings
from pydantic import Field

try:
    import pytesseract
except ImportError:
    pytesseract = None


class Settings(BaseSettings):
    """
    Application configuration for HETEROHMS OCR Microservice.
    Reads from environment variables or .env file.
    """
    PORT: int = Field(default=8000, description="Service listening port")
    HOST: str = Field(default="0.0.0.0", description="Service listening host")
    ENVIRONMENT: str = Field(default="development", description="Runtime environment")

    # Shared Internal Security
    INTERNAL_API_KEY: str = Field(
        default="heterohms_internal_secret_key_2026",
        description="Shared secret key expected in X-Internal-API-Key header"
    )

    # Node.js backend integration callback
    NODE_BACKEND_CALLBACK_URL: str = Field(
        default="http://localhost:5000/api/v1/internal/ocr-callback",
        description="Callback endpoint to notify Express server"
    )
    INTERNAL_CALLBACK_KEY: str = Field(
        default="heterohms_callback_secret_key_2026",
        description="Key sent to Node.js backend on callbacks"
    )

    # File Download Constraints
    MAX_FILE_SIZE_MB: int = Field(default=10, description="Max allowed file download size in MB")
    DOWNLOAD_TIMEOUT_SECONDS: int = Field(default=30, description="Download timeout in seconds")

    # Tesseract Binary Configuration
    TESSERACT_CMD: Optional[str] = Field(
        default=None,
        description="Explicit path to tesseract executable if not in system PATH"
    )

    # Allowed MIME types for OCR processing
    ALLOWED_MIME_TYPES: List[str] = [
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/jpg",
    ]

    # Semantic Search & Vector Embeddings (Prompt 15)
    EMBEDDING_MODEL_NAME: str = Field(
        default="all-MiniLM-L6-v2",
        description="Pretrained sentence-transformers model identifier"
    )
    CHROMA_PERSIST_DIRECTORY: str = Field(
        default="data/chromadb",
        description="Local directory for persistent ChromaDB vector storage"
    )
    DEFAULT_CHUNK_SIZE: int = Field(
        default=500,
        description="Target character length per text chunk"
    )
    DEFAULT_CHUNK_OVERLAP: int = Field(
        default=100,
        description="Overlap character length between sequential chunks"
    )
    MIN_TEXT_LENGTH_TO_INDEX: int = Field(
        default=10,
        description="Minimum character length required for indexing"
    )

    @property
    def max_file_size_bytes(self) -> int:
        return self.MAX_FILE_SIZE_MB * 1024 * 1024

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True
        extra = "ignore"


settings = Settings()

# Configure pytesseract executable if specified in environment or installed in standard Windows location
if settings.TESSERACT_CMD and pytesseract:
    pytesseract.pytesseract.tesseract_cmd = settings.TESSERACT_CMD
elif pytesseract and os.name == 'nt' and os.path.exists(r"C:\Program Files\Tesseract-OCR\tesseract.exe"):
    pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
