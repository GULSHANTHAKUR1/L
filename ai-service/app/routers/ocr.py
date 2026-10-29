import time
from typing import Union
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse

from app.schemas import OCRProcessRequest, OCRSuccessResponse, OCRFailureResponse
from app.services.file_processor import download_document_file
from app.services.ocr_service import extract_document_text
from app.utils.security import verify_internal_api_key, validate_safe_url

router = APIRouter(prefix="/api/ocr", tags=["OCR"])


@router.post(
    "/process",
    response_model=Union[OCRSuccessResponse, OCRFailureResponse],
    summary="Process medical document OCR",
    description="Downloads authorized medical scan or PDF, extracts text via Tesseract, normalizes whitespace, and returns structured result."
)
async def process_document_ocr(
    payload: OCRProcessRequest,
    _: str = Depends(verify_internal_api_key)
):
    start_time = time.perf_counter()
    warnings = []

    # 1. SSRF Safety Check on Target URL
    try:
        validate_safe_url(payload.fileUrl)
    except ValueError as val_err:
        elapsed_ms = int((time.perf_counter() - start_time) * 1000)
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content=OCRFailureResponse(
                documentId=payload.documentId,
                status="failed",
                error=f"Unsafe or disallowed file URL: {str(val_err)}",
                warnings=warnings,
            ).model_dump()
        )

    # 2. Download File with 10MB limit and safe timeout
    try:
        file_bytes = await download_document_file(payload.fileUrl)
    except (ValueError, TimeoutError, ConnectionError) as dl_err:
        elapsed_ms = int((time.perf_counter() - start_time) * 1000)
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=OCRFailureResponse(
                documentId=payload.documentId,
                status="failed",
                error=f"File download failed: {str(dl_err)}",
                warnings=warnings,
            ).model_dump()
        )
    except Exception as unexpected_dl:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=OCRFailureResponse(
                documentId=payload.documentId,
                status="failed",
                error="Unexpected error encountered while fetching document file.",
                warnings=warnings,
            ).model_dump()
        )

    # 3. Perform OCR Extraction & Text Cleaning
    try:
        extracted_text, page_count, ocr_warnings = extract_document_text(
            file_bytes=file_bytes,
            mime_type=payload.mimeType,
            language=payload.language
        )
        warnings.extend(ocr_warnings)

        elapsed_ms = int((time.perf_counter() - start_time) * 1000)

        return OCRSuccessResponse(
            documentId=payload.documentId,
            status="completed",
            extractedText=extracted_text,
            pageCount=page_count,
            language=payload.language,
            processingTimeMs=elapsed_ms,
            warnings=warnings,
        )

    except RuntimeError as r_err:
        elapsed_ms = int((time.perf_counter() - start_time) * 1000)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=OCRFailureResponse(
                documentId=payload.documentId,
                status="failed",
                error=str(r_err),
                warnings=warnings,
            ).model_dump()
        )
    except Exception as unk_err:
        elapsed_ms = int((time.perf_counter() - start_time) * 1000)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=OCRFailureResponse(
                documentId=payload.documentId,
                status="failed",
                error=f"OCR extraction failed: {str(unk_err)}",
                warnings=warnings,
            ).model_dump()
        )
