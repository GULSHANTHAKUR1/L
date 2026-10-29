from typing import List, Literal, Optional
from pydantic import BaseModel, Field, field_validator


# ==============================================================================
# OCR Schemas (Prompt 13)
# ==============================================================================

class OCRProcessRequest(BaseModel):
    """
    Request payload to initiate OCR text extraction on a medical document.
    """
    documentId: str = Field(
        ...,
        min_length=1,
        description="MongoDB identifier of the MedicalDocument record"
    )
    fileUrl: str = Field(
        ...,
        min_length=5,
        description="Public or pre-signed URL of the file stored in Cloudinary/S3"
    )
    mimeType: str = Field(
        ...,
        description="File MIME type (application/pdf, image/jpeg, image/png)"
    )
    language: str = Field(
        default="eng",
        description="Tesseract 3-letter language code (default: 'eng')"
    )

    @field_validator("mimeType")
    @classmethod
    def validate_mime(cls, v: str) -> str:
        normalized = v.strip().lower()
        allowed = ["application/pdf", "image/jpeg", "image/png", "image/jpg"]
        if normalized not in allowed:
            raise ValueError(f"Unsupported MIME type '{v}'. Allowed types: {', '.join(allowed)}")
        return normalized

    @field_validator("fileUrl")
    @classmethod
    def validate_url_scheme(cls, v: str) -> str:
        stripped = v.strip()
        if not (stripped.startswith("http://") or stripped.startswith("https://")):
            raise ValueError("fileUrl must start with http:// or https://")
        return stripped


class OCRSuccessResponse(BaseModel):
    """
    Standard response returned upon successful text extraction.
    """
    documentId: str = Field(..., description="Target MongoDB document ID")
    status: str = Field(default="completed", description="Extraction outcome")
    extractedText: str = Field(..., description="Cleaned, normalized OCR text")
    pageCount: int = Field(default=1, description="Number of document pages processed")
    language: str = Field(default="eng", description="Language used for extraction")
    processingTimeMs: int = Field(..., description="Total execution time in milliseconds")
    warnings: List[str] = Field(default_factory=list, description="Non-fatal notices or warnings")


class OCRFailureResponse(BaseModel):
    """
    Standard response returned when OCR processing encounters an unrecoverable error.
    """
    documentId: str = Field(..., description="Target MongoDB document ID")
    status: str = Field(default="failed", description="Extraction outcome")
    error: str = Field(..., description="Safe, client-facing error description")
    warnings: List[str] = Field(default_factory=list, description="Additional context or notices")


class HealthResponse(BaseModel):
    """
    Health check diagnostic response.
    """
    status: str
    service: str
    tesseract_available: bool
    embedding_model_ready: bool = False
    vector_store_ready: bool = False
    version: str
    timestamp: str


# ==============================================================================
# Semantic Search & Vector Embeddings Schemas (Prompt 15)
# ==============================================================================

class IndexDocumentMetadata(BaseModel):
    """
    Metadata attached to clinical content for targeted RBAC filtering.
    """
    documentType: Optional[str] = Field(
        default=None,
        description="e.g. lab-report, xray, prescription, discharge-summary"
    )
    createdAt: Optional[str] = Field(
        default=None,
        description="ISO 8601 creation timestamp"
    )
    title: Optional[str] = Field(
        default=None,
        description="Human-readable title or diagnosis label"
    )


class IndexDocumentRequest(BaseModel):
    """
    Payload for indexing medical text into the vector search engine.
    """
    sourceType: str = Field(
        ...,
        description="medical_document | medical_record | prescription"
    )
    sourceId: str = Field(
        ...,
        min_length=1,
        description="MongoDB identifier of the original record"
    )
    patientId: str = Field(
        ...,
        min_length=1,
        description="MongoDB identifier of the patient (RBAC scope boundary)"
    )
    doctorId: Optional[str] = Field(
        default=None,
        description="MongoDB identifier of the prescribing/attending doctor"
    )
    text: str = Field(
        ...,
        min_length=1,
        description="Clinical text or OCR-extracted content to index"
    )
    metadata: Optional[IndexDocumentMetadata] = Field(
        default_factory=IndexDocumentMetadata,
        description="Optional categorization and creation timestamp"
    )

    @field_validator("sourceType")
    @classmethod
    def validate_source_type(cls, v: str) -> str:
        normalized = v.strip().lower()
        allowed = ["medical_document", "medical_record", "prescription"]
        if normalized not in allowed:
            raise ValueError(f"Invalid sourceType '{v}'. Must be one of: {', '.join(allowed)}")
        return normalized


class IndexResponse(BaseModel):
    """
    Outcome of the indexing operation.
    """
    status: str = Field(default="completed", description="indexing status")
    sourceId: str
    sourceType: str
    chunksIndexed: int
    message: str


class SearchFilters(BaseModel):
    """
    Role-based filtering boundaries strictly enforced by Node.js backend.
    """
    patientId: Optional[str] = Field(
        default=None,
        description="Mandatory for patient-scoped searches to prevent data leakage"
    )
    patientIds: Optional[List[str]] = Field(
        default=None,
        description="List of authorized patient IDs for doctor role multi-patient searches"
    )
    doctorId: Optional[str] = Field(
        default=None,
        description="Filter by attending physician"
    )
    sourceType: Optional[str] = Field(
        default=None,
        description="Filter by record type: medical_document | medical_record | prescription"
    )
    documentType: Optional[str] = Field(
        default=None,
        description="Filter by specific category: lab-report, xray, etc."
    )
    dateFrom: Optional[str] = Field(default=None, description="Start date (YYYY-MM-DD)")
    dateTo: Optional[str] = Field(default=None, description="End date (YYYY-MM-DD)")


class SearchQueryRequest(BaseModel):
    """
    Clinical natural language query request payload.
    """
    query: str = Field(
        ...,
        min_length=2,
        description="Natural language clinical search query"
    )
    filters: Optional[SearchFilters] = Field(
        default=None,
        description="Restrictive metadata filters"
    )
    topK: int = Field(
        default=5,
        ge=1,
        le=50,
        description="Maximum number of relevant chunks to retrieve"
    )


class SearchResultItem(BaseModel):
    """
    Individual matched chunk with metadata and similarity score.
    """
    sourceType: str
    sourceId: str
    patientId: str
    doctorId: Optional[str] = None
    documentType: Optional[str] = None
    date: Optional[str] = None
    title: Optional[str] = None
    snippet: str
    similarityScore: float = Field(
        ...,
        description="Cosine similarity score (0.0 to 1.0, higher is closer)"
    )


class SearchQueryResponse(BaseModel):
    """
    Search results collection with mandatory clinical disclaimer.
    """
    query: str
    totalResults: int
    results: List[SearchResultItem]
    disclaimer: str = Field(
        default="Results are for medical record retrieval and information index access only. This service does not diagnose medical conditions or recommend treatments.",
        description="Mandatory clinical safety notice"
    )


class DeleteBySourceRequest(BaseModel):
    """
    Request to purge chunks belonging to a deleted or modified record.
    """
    sourceId: str = Field(..., min_length=1, description="MongoDB ID of the source record")
    sourceType: Optional[str] = Field(default=None, description="Optional sourceType constraint")


class DeleteResponse(BaseModel):
    """
    Outcome of chunk deletion.
    """
    status: str = Field(default="completed")
    sourceId: str
    deletedChunks: int
    message: str


class SemanticSearchStatusResponse(BaseModel):
    """
    Operational status of the semantic search engine.
    """
    status: str
    model: str
    vector_store: str
    embedding_dimension: int
    total_indexed_chunks: int
    ready: bool
