import logging
from typing import Any, Dict, List, Optional

from app.config import settings
from app.schemas import (
    IndexDocumentRequest,
    IndexResponse,
    SearchQueryRequest,
    SearchQueryResponse,
    SearchResultItem,
    DeleteResponse,
    SemanticSearchStatusResponse,
)
from app.services.chunking_service import chunk_text
from app.services.embedding_service import (
    encode_text,
    encode_batch,
    get_model_dimension,
    is_model_ready,
)
from app.services.vector_store import get_vector_store

logger = logging.getLogger("heterohms.search_service")

MANDATORY_CLINICAL_DISCLAIMER = (
    "Results are for medical record retrieval and information index access only. "
    "This service does not diagnose medical conditions or recommend treatments."
)


def index_clinical_content(request: IndexDocumentRequest) -> IndexResponse:
    """
    Chunks, embeds, and indexes medical text into the vector database.
    Idempotent: replaces any previously indexed chunks for the same sourceId.
    """
    cleaned_text = request.text.strip()
    if len(cleaned_text) < settings.MIN_TEXT_LENGTH_TO_INDEX:
        raise ValueError(
            f"Content length ({len(cleaned_text)} characters) is too short to generate meaningful embeddings. Minimum required: {settings.MIN_TEXT_LENGTH_TO_INDEX}"
        )

    # 1. Sentence-aware overlapping chunking
    chunks = chunk_text(cleaned_text)
    if not chunks:
        raise ValueError("Could not extract indexable segments from the provided text.")

    # 2. Vector embedding generation
    embeddings = encode_batch(chunks)

    # 3. Vector Store Persistence
    store = get_vector_store()
    metadata_dict = request.metadata.model_dump() if request.metadata else {}

    indexed_count = store.index_chunks(
        source_id=request.sourceId,
        source_type=request.sourceType,
        patient_id=request.patientId,
        doctor_id=request.doctorId,
        chunks=chunks,
        embeddings=embeddings,
        metadata=metadata_dict,
    )

    logger.info(
        f"Successfully indexed {indexed_count} chunks for {request.sourceType} '{request.sourceId}' (Patient: {request.patientId})"
    )

    return IndexResponse(
        status="completed",
        sourceId=request.sourceId,
        sourceType=request.sourceType,
        chunksIndexed=indexed_count,
        message=f"Indexed {indexed_count} clinical chunks successfully.",
    )


def query_clinical_records(request: SearchQueryRequest) -> SearchQueryResponse:
    """
    Performs cosine similarity retrieval across indexed medical records.
    Applies restrictive RBAC filters passed from the Node backend.
    """
    query_str = request.query.strip()
    if not query_str:
        return SearchQueryResponse(
            query=request.query,
            totalResults=0,
            results=[],
            disclaimer=MANDATORY_CLINICAL_DISCLAIMER,
        )

    # 1. Convert query to 384-dim dense embedding
    query_vector = encode_text(query_str)

    # 2. Extract filter criteria
    filters_dict = request.filters.model_dump(exclude_none=True) if request.filters else None

    # 3. Retrieve top-K matching chunks from vector database
    store = get_vector_store()
    raw_results = store.query_similar(
        query_embedding=query_vector,
        filters=filters_dict,
        top_k=request.topK,
    )

    # 4. Format into structured response items
    items = [
        SearchResultItem(
            sourceType=r["sourceType"],
            sourceId=r["sourceId"],
            patientId=r["patientId"],
            doctorId=r["doctorId"],
            documentType=r["documentType"],
            date=r["date"],
            title=r["title"],
            snippet=r["snippet"],
            similarityScore=r["similarityScore"],
        )
        for r in raw_results
    ]

    return SearchQueryResponse(
        query=request.query,
        totalResults=len(items),
        results=items,
        disclaimer=MANDATORY_CLINICAL_DISCLAIMER,
    )


def delete_source_chunks(source_id: str, source_type: Optional[str] = None) -> DeleteResponse:
    """
    Removes all indexed chunks belonging to a deleted or updated record.
    """
    store = get_vector_store()
    deleted_count = store.delete_by_source(source_id=source_id, source_type=source_type)

    logger.info(f"Purged {deleted_count} chunks for sourceId '{source_id}'")

    return DeleteResponse(
        status="completed",
        sourceId=source_id,
        deletedChunks=deleted_count,
        message=f"Removed {deleted_count} indexed chunks for source '{source_id}'.",
    )


def get_search_engine_status() -> SemanticSearchStatusResponse:
    """
    Reports operational vitality of embedding model and vector storage.
    """
    store = get_vector_store()
    return SemanticSearchStatusResponse(
        status="ready" if is_model_ready() and store.is_ready() else "degraded",
        model=settings.EMBEDDING_MODEL_NAME,
        vector_store="ChromaDB" if hasattr(store, "_collection") and store._collection else "InMemoryStore",
        embedding_dimension=get_model_dimension(),
        total_indexed_chunks=store.count_chunks(),
        ready=is_model_ready() and store.is_ready(),
    )
