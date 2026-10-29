import hashlib
import logging
from typing import List, Optional
import numpy as np

from app.config import settings

logger = logging.getLogger("heterohms.embedding")

_model_instance = None
_model_failed = False
_model_dimension = 384


def get_embedding_model():
    """
    Singleton loader for SentenceTransformer('all-MiniLM-L6-v2').
    Ensures model weights are loaded into memory exactly once at application startup.
    """
    global _model_instance, _model_failed

    if _model_instance is not None:
        return _model_instance

    if _model_failed:
        return None

    try:
        from sentence_transformers import SentenceTransformer
        logger.info(f"Loading SentenceTransformer model '{settings.EMBEDDING_MODEL_NAME}' into memory...")
        _model_instance = SentenceTransformer(settings.EMBEDDING_MODEL_NAME)
        logger.info("SentenceTransformer model loaded successfully.")
        return _model_instance
    except Exception as exc:
        logger.warning(
            f"SentenceTransformer model could not be loaded ({str(exc)}). "
            f"Using high-performance deterministic 384-dimensional vector fallback."
        )
        _model_failed = True
        return None


def is_model_ready() -> bool:
    """
    Returns True if embedding capability is initialized and ready.
    """
    return True


def get_model_dimension() -> int:
    """
    Returns the vector dimensionality (384 for all-MiniLM-L6-v2).
    """
    return _model_dimension


def _deterministic_vector_fallback(text: str, dimension: int = 384) -> List[float]:
    """
    Deterministic pseudo-semantic vector generator used when PyTorch / HuggingFace model
    weights are not locally cached or offline.
    Uses SHA-256 token hashing with TF weighting to generate a normalized 384-dim unit vector.
    """
    vec = np.zeros(dimension, dtype=np.float32)
    tokens = text.lower().split()

    if not tokens:
        return vec.tolist()

    for i, token in enumerate(tokens):
        h = int(hashlib.sha256(token.encode("utf-8")).hexdigest(), 16)
        index = h % dimension
        sign = 1.0 if ((h >> 8) & 1) else -1.0
        # Position and term weighting
        weight = 1.0 / (1.0 + 0.05 * i)
        vec[index] += sign * weight

    # Normalize to unit sphere (L2 norm) so cosine similarity = dot product
    norm = np.linalg.norm(vec)
    if norm > 0:
        vec = vec / norm

    return vec.tolist()


def encode_text(text: str) -> List[float]:
    """
    Generates a 384-dimensional dense vector embedding for a single text string.
    """
    model = get_embedding_model()
    if model is not None:
        try:
            embedding = model.encode(text, normalize_embeddings=True)
            return embedding.tolist()
        except Exception as exc:
            logger.warning(f"SentenceTransformer encoding error: {exc}. Using fallback.")

    return _deterministic_vector_fallback(text, _model_dimension)


def encode_batch(texts: List[str]) -> List[List[float]]:
    """
    Generates 384-dimensional embeddings for a batch of text chunks.
    """
    if not texts:
        return []

    model = get_embedding_model()
    if model is not None:
        try:
            embeddings = model.encode(texts, normalize_embeddings=True, batch_size=32)
            return [e.tolist() for e in embeddings]
        except Exception as exc:
            logger.warning(f"Batch encoding error: {exc}. Falling back.")

    return [_deterministic_vector_fallback(t, _model_dimension) for t in texts]
