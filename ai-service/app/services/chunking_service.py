import re
from typing import List
from app.config import settings
from app.services.text_cleaner import clean_ocr_text


def normalize_search_text(text: str) -> str:
    """
    Normalizes text for consistent embedding generation:
    - Cleans OCR noise via text_cleaner.
    - Preserves sentence boundaries, medical measurements, and bullet points.
    """
    return clean_ocr_text(text)


def chunk_text(
    text: str,
    chunk_size: int = None,
    chunk_overlap: int = None
) -> List[str]:
    """
    Splits clinical text into overlapping, sentence-aware chunks:
    - Target chunk_size: ~500 characters (configurable via settings.DEFAULT_CHUNK_SIZE)
    - Target chunk_overlap: ~100 characters (configurable via settings.DEFAULT_CHUNK_OVERLAP)
    - Uses sentence boundary detection (. , \n , ;) to avoid splitting critical medical phrases.
    """
    if not text:
        return []

    target_size = chunk_size or settings.DEFAULT_CHUNK_SIZE
    target_overlap = chunk_overlap or settings.DEFAULT_CHUNK_OVERLAP

    normalized = normalize_search_text(text)

    # If text is shorter than or equal to target size, return single chunk
    if len(normalized) <= target_size:
        return [normalized] if len(normalized) >= settings.MIN_TEXT_LENGTH_TO_INDEX else []

    # Split into rough sentence/paragraph segments
    segments = re.split(r"(?<=[.!?\n])\s+", normalized)
    chunks: List[str] = []
    current_chunk: List[str] = []
    current_length = 0

    for segment in segments:
        seg = segment.strip()
        if not seg:
            continue

        seg_len = len(seg)

        # If a single sentence is larger than chunk_size, split by words
        if seg_len > target_size:
            words = seg.split()
            sub_chunk = []
            sub_len = 0
            for word in words:
                if sub_len + len(word) + 1 > target_size and sub_chunk:
                    chunk_str = " ".join(sub_chunk).strip()
                    if len(chunk_str) >= settings.MIN_TEXT_LENGTH_TO_INDEX:
                        chunks.append(chunk_str)
                    # Keep overlap words
                    overlap_words = sub_chunk[-max(1, target_overlap // 10):]
                    sub_chunk = list(overlap_words)
                    sub_len = sum(len(w) for w in sub_chunk) + len(sub_chunk)
                sub_chunk.append(word)
                sub_len += len(word) + 1
            if sub_chunk:
                chunk_str = " ".join(sub_chunk).strip()
                if len(chunk_str) >= settings.MIN_TEXT_LENGTH_TO_INDEX:
                    chunks.append(chunk_str)
            continue

        if current_length + seg_len + 1 > target_size and current_chunk:
            chunk_str = " ".join(current_chunk).strip()
            if len(chunk_str) >= settings.MIN_TEXT_LENGTH_TO_INDEX:
                chunks.append(chunk_str)

            # Roll over the last segment to create overlap
            current_chunk = [current_chunk[-1]] if current_chunk else []
            current_length = len(current_chunk[0]) if current_chunk else 0

        current_chunk.append(seg)
        current_length += seg_len + 1

    if current_chunk:
        chunk_str = " ".join(current_chunk).strip()
        if len(chunk_str) >= settings.MIN_TEXT_LENGTH_TO_INDEX:
            chunks.append(chunk_str)

    return chunks
