from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse

from app.schemas import (
    IndexDocumentRequest,
    IndexResponse,
    SearchQueryRequest,
    SearchQueryResponse,
    DeleteBySourceRequest,
    DeleteResponse,
    SemanticSearchStatusResponse,
)
from app.services.semantic_search_service import (
    index_clinical_content,
    query_clinical_records,
    delete_source_chunks,
    get_search_engine_status,
)
from app.utils.security import verify_internal_api_key

router = APIRouter(tags=["Semantic Search"])


@router.post(
    "/api/embeddings/index",
    response_model=IndexResponse,
    summary="Index medical text for vector search",
    description="Chunks and embeds clinical text (medical documents, EHR records, prescriptions) into ChromaDB. Idempotent re-indexing replaces existing chunks."
)
def index_document_endpoint(
    payload: IndexDocumentRequest,
    _: str = Depends(verify_internal_api_key)
):
    try:
        result = index_clinical_content(payload)
        return result
    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(val_err)
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Indexing failure: {str(exc)}"
        )


@router.post(
    "/api/semantic-search/query",
    response_model=SearchQueryResponse,
    summary="Semantic natural language search across clinical records",
    description="Retrieves the top-K relevant clinical chunks matching the natural language query, scoped strictly to authorized patient/doctor filters."
)
def semantic_search_endpoint(
    payload: SearchQueryRequest,
    _: str = Depends(verify_internal_api_key)
):
    try:
        response = query_clinical_records(payload)
        return response
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Search execution failure: {str(exc)}"
        )


@router.post(
    "/api/embeddings/delete-by-source",
    response_model=DeleteResponse,
    summary="Purge indexed chunks for a source document",
    description="Removes all vector embeddings belonging to a deleted or modified medical record or document."
)
def delete_source_chunks_endpoint(
    payload: DeleteBySourceRequest,
    _: str = Depends(verify_internal_api_key)
):
    try:
        result = delete_source_chunks(source_id=payload.sourceId, source_type=payload.sourceType)
        return result
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Purge operation failure: {str(exc)}"
        )


@router.get(
    "/api/semantic-search/status",
    response_model=SemanticSearchStatusResponse,
    summary="Semantic search engine diagnostic status",
    description="Reports the readiness of the sentence-transformers model and ChromaDB collection."
)
def search_status_endpoint():
    return get_search_engine_status()
