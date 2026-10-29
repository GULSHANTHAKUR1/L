import io
import time
from typing import Dict, List, Optional, Tuple
try:
    import fitz  # PyMuPDF
except ImportError:
    fitz = None

import httpx

try:
    from PIL import Image, ImageOps
except ImportError:
    Image = None
    ImageOps = None

try:
    import pytesseract
except ImportError:
    pytesseract = None

from app.config import settings
from app.services.text_cleaner import clean_ocr_text


def check_tesseract_installed() -> bool:
    """
    Diagnostic helper to test if Tesseract OCR executable is available on the host system.
    """
    if pytesseract is None:
        return False
    try:
        pytesseract.get_tesseract_version()
        return True
    except Exception:
        return False


def ocr_image_bytes(image_bytes: bytes, language: str = "eng") -> Tuple[str, List[str]]:
    """
    Performs OCR extraction on an image buffer (JPEG, PNG).
    """
    warnings: List[str] = []
    try:
        image = Image.open(io.BytesIO(image_bytes))

        # Handle EXIF rotation if present
        try:
            image = ImageOps.exif_transpose(image)
        except Exception:
            pass

        # Convert palette/transparency to RGB for Tesseract compatibility
        if image.mode in ("RGBA", "P", "LA"):
            image = image.convert("RGB")

        raw_text = pytesseract.image_to_string(image, lang=language)
        return raw_text, warnings
    except pytesseract.TesseractNotFoundError:
        raise RuntimeError(
            "Tesseract-OCR engine is not installed or not found in system PATH. "
            "Please install Tesseract and configure TESSERACT_CMD in .env"
        )
    except Exception as exc:
        raise RuntimeError(f"Image OCR extraction error: {str(exc)}")


def ocr_pdf_bytes(pdf_bytes: bytes, language: str = "eng") -> Tuple[str, int, List[str]]:
    """
    Performs OCR extraction on a PDF buffer using PyMuPDF (fitz) and Tesseract:
    1. First attempts high-speed native text layer extraction for digital PDFs.
    2. For scanned/image pages without a digital text layer, renders the page
       at 200 DPI and invokes Tesseract OCR.
    """
    warnings: List[str] = []
    page_texts: List[str] = []

    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        page_count = len(doc)

        if page_count == 0:
            return "", 0, ["PDF document contains 0 pages"]

        for page_index in range(page_count):
            page = doc.load_page(page_index)

            # Try native digital text layer first
            native_text = page.get_text().strip()

            # If page contains more than 30 characters of native digital text, use it
            if len(native_text) > 30:
                page_texts.append(f"--- Page {page_index + 1} ---\n{native_text}")
            else:
                # Page is likely a scanned medical scan/report; render to image at 200 DPI
                try:
                    pix = page.get_pixmap(dpi=200)
                    img_data = pix.tobytes("png")
                    image = Image.open(io.BytesIO(img_data)).convert("RGB")
                    scanned_text = pytesseract.image_to_string(image, lang=language).strip()

                    if scanned_text:
                        page_texts.append(f"--- Page {page_index + 1} ---\n{scanned_text}")
                    else:
                        page_texts.append(f"--- Page {page_index + 1} --- (No text detected)")
                except pytesseract.TesseractNotFoundError:
                    raise RuntimeError(
                        "Tesseract-OCR engine is not installed or not found in PATH for scanned PDF pages."
                    )
                except Exception as page_err:
                    warnings.append(f"Page {page_index + 1} OCR warning: {str(page_err)}")

        doc.close()
        combined_text = "\n\n".join(page_texts)
        return combined_text, page_count, warnings

    except Exception as exc:
        if "Tesseract-OCR engine is not installed" in str(exc):
            raise
        raise RuntimeError(f"PDF processing error: {str(exc)}")


def extract_document_text(
    file_bytes: bytes,
    mime_type: str,
    language: str = "eng"
) -> Tuple[str, int, List[str]]:
    """
    Orchestrates extraction based on MIME type, applies text cleaning, and returns
    (cleaned_text, page_count, warnings).
    """
    normalized_mime = mime_type.strip().lower()

    if normalized_mime == "application/pdf":
        raw_text, page_count, warnings = ocr_pdf_bytes(file_bytes, language=language)
    elif normalized_mime in ("image/jpeg", "image/png", "image/jpg"):
        raw_text, warnings = ocr_image_bytes(file_bytes, language=language)
        page_count = 1
    else:
        raise ValueError(f"Unsupported MIME type for OCR: {mime_type}")

    cleaned = clean_ocr_text(raw_text)
    return cleaned, page_count, warnings


# ==============================================================================
# Future Integration Hook: Clinical Semantic Search Embeddings (Phase 2)
# ==============================================================================
def generate_clinical_embeddings_hook(cleaned_text: str) -> Optional[List[float]]:
    """
    Clean architectural integration point for Phase 2 semantic vector search.
    When sentence-transformers ('all-MiniLM-L6-v2') is enabled in Phase 2,
    this hook will compute dense 384-dimensional vector embeddings of the extracted text.
    Currently returns None to adhere to Phase 1 scope.
    """
    # Phase 2 TODO:
    # from sentence_transformers import SentenceTransformer
    # model = SentenceTransformer('all-MiniLM-L6-v2')
    # return model.encode(cleaned_text).tolist()
    return None


# ==============================================================================
# Async Callback Helper: Node.js Backend Notification
# ==============================================================================
async def send_result_to_node_backend(
    result_payload: Dict,
    callback_url: Optional[str] = None
) -> bool:
    """
    Sends extraction results asynchronously to the Node.js/Express backend callback endpoint.
    Includes shared internal secret key header (X-Internal-Callback-Key) for endpoint security.

    :param result_payload: Dictionary conforming to OCRSuccessResponse or OCRFailureResponse.
    :param callback_url: Target URL; defaults to settings.NODE_BACKEND_CALLBACK_URL.
    :return: True if successfully delivered (HTTP 200/201), False otherwise.
    """
    target_url = callback_url or settings.NODE_BACKEND_CALLBACK_URL
    headers = {
        "Content-Type": "application/json",
        "X-Internal-Callback-Key": settings.INTERNAL_CALLBACK_KEY,
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(target_url, json=result_payload, headers=headers)
            return response.status_code in (200, 201, 202)
    except Exception as exc:
        # Non-blocking callback failure
        print(f"[OCR Callback Notice] Could not deliver callback to {target_url}: {str(exc)}")
        return False
