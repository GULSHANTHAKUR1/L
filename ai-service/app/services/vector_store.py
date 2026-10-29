import os
import logging
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
import numpy as np

from app.config import settings

logger = logging.getLogger("heterohms.vector_store")


class VectorStoreBase(ABC):
    """
    Abstract Vector Store interface.
    Allows seamlessly swapping ChromaDB for MongoDB Atlas Vector Search or Pinecone.
    """

    @abstractmethod
    def index_chunks(
        self,
        source_id: str,
        source_type: str,
        patient_id: str,
        doctor_id: Optional[str],
        chunks: List[str],
        embeddings: List[List[float]],
        metadata: Dict[str, Any],
    ) -> int:
        pass

    @abstractmethod
    def query_similar(
        self,
        query_embedding: List[float],
        filters: Optional[Dict[str, Any]] = None,
        top_k: int = 5,
    ) -> List[Dict[str, Any]]:
        pass

    @abstractmethod
    def delete_by_source(self, source_id: str, source_type: Optional[str] = None) -> int:
        pass

    @abstractmethod
    def count_chunks(self) -> int:
        pass

    @abstractmethod
    def is_ready(self) -> bool:
        pass


class ChromaVectorStore(VectorStoreBase):
    """
    ChromaDB implementation with local disk persistence.
    """

    def __init__(self, persist_dir: str = None):
        self.persist_dir = persist_dir or settings.CHROMA_PERSIST_DIRECTORY
        os.makedirs(self.persist_dir, exist_ok=True)
        self.collection_name = "heterohms_clinical_chunks"
        self._client = None
        self._collection = None
        self._init_chroma()

    def _init_chroma(self):
        try:
            import chromadb
            from chromadb.config import Settings as ChromaSettings

            self._client = chromadb.PersistentClient(
                path=self.persist_dir,
                settings=ChromaSettings(anonymized_telemetry=False, is_persistent=True),
            )
            # Cosine similarity metric space
            self._collection = self._client.get_or_create_collection(
                name=self.collection_name,
                metadata={"hnsw:space": "cosine"},
            )
            logger.info(f"ChromaDB persistent collection initialized at: {self.persist_dir}")
        except Exception as exc:
            logger.warning(f"ChromaDB initialization failed ({exc}). Using Memory fallback.")
            self._client = None
            self._collection = None

    def is_ready(self) -> bool:
        return self._collection is not None

    def count_chunks(self) -> int:
        if self._collection is not None:
            try:
                return self._collection.count()
            except Exception:
                return 0
        return 0

    def delete_by_source(self, source_id: str, source_type: Optional[str] = None) -> int:
        if self._collection is None:
            return 0
        try:
            where_clause = {"sourceId": source_id}
            if source_type:
                where_clause = {"$and": [{"sourceId": source_id}, {"sourceType": source_type}]}

            # Find matching chunk IDs first
            existing = self._collection.get(where=where_clause)
            chunk_ids = existing.get("ids", [])
            if chunk_ids:
                self._collection.delete(ids=chunk_ids)
                return len(chunk_ids)
            return 0
        except Exception as exc:
            logger.error(f"Error deleting chunks for source {source_id}: {exc}")
            return 0

    def index_chunks(
        self,
        source_id: str,
        source_type: str,
        patient_id: str,
        doctor_id: Optional[str],
        chunks: List[str],
        embeddings: List[List[float]],
        metadata: Dict[str, Any],
    ) -> int:
        if self._collection is None:
            raise RuntimeError("Vector store is not initialized.")

        # 1. Idempotency: Purge any existing chunks for this sourceId to prevent duplicates
        self.delete_by_source(source_id)

        if not chunks:
            return 0

        # 2. Build unique IDs and sanitized metadata for ChromaDB
        ids = [f"{source_type}_{source_id}_chunk_{i}" for i in range(len(chunks))]

        base_meta = {
            "sourceId": str(source_id),
            "sourceType": str(source_type),
            "patientId": str(patient_id),
            "doctorId": str(doctor_id or ""),
            "documentType": str(metadata.get("documentType") or ""),
            "createdAt": str(metadata.get("createdAt") or ""),
            "title": str(metadata.get("title") or ""),
        }

        metadatas = []
        for i in range(len(chunks)):
            meta = dict(base_meta)
            meta["chunkIndex"] = i
            metadatas.append(meta)

        self._collection.add(
            ids=ids,
            embeddings=embeddings,
            documents=chunks,
            metadatas=metadatas,
        )

        return len(chunks)

    def query_similar(
        self,
        query_embedding: List[float],
        filters: Optional[Dict[str, Any]] = None,
        top_k: int = 5,
    ) -> List[Dict[str, Any]]:
        if self._collection is None:
            return []

        # Build restrictive ChromaDB where clause
        where_conditions = []
        if filters:
            if filters.get("patientId"):
                where_conditions.append({"patientId": str(filters["patientId"])})
            elif filters.get("patientIds") and len(filters["patientIds"]) > 0:
                p_ids = [str(pid) for pid in filters["patientIds"]]
                if len(p_ids) == 1:
                    where_conditions.append({"patientId": p_ids[0]})
                else:
                    where_conditions.append({"patientId": {"$in": p_ids}})
            if filters.get("doctorId"):
                where_conditions.append({"doctorId": str(filters["doctorId"])})
            if filters.get("sourceType"):
                where_conditions.append({"sourceType": str(filters["sourceType"])})
            if filters.get("documentType"):
                where_conditions.append({"documentType": str(filters["documentType"])})

        where_clause = None
        if len(where_conditions) == 1:
            where_clause = where_conditions[0]
        elif len(where_conditions) > 1:
            where_clause = {"$and": where_conditions}

        try:
            results = self._collection.query(
                query_embeddings=[query_embedding],
                n_results=top_k,
                where=where_clause,
                include=["documents", "metadatas", "distances"],
            )

            formatted = []
            if results and results.get("ids") and results["ids"][0]:
                docs = results["documents"][0]
                metas = results["metadatas"][0]
                distances = results["distances"][0]

                for doc_text, meta, dist in zip(docs, metas, distances):
                    # Chroma cosine distance is in [0, 2], where 0 is identical
                    # Cosine similarity = 1 - (distance / 2) or max(0, 1 - dist)
                    similarity = max(0.0, min(1.0, 1.0 - float(dist)))

                    # Date filter check if provided
                    doc_date = meta.get("createdAt", "")
                    if filters and filters.get("dateFrom") and doc_date and doc_date < filters["dateFrom"]:
                        continue
                    if filters and filters.get("dateTo") and doc_date and doc_date > filters["dateTo"]:
                        continue

                    formatted.append({
                        "sourceType": meta.get("sourceType", "unknown"),
                        "sourceId": meta.get("sourceId", ""),
                        "patientId": meta.get("patientId", ""),
                        "doctorId": meta.get("doctorId") or None,
                        "documentType": meta.get("documentType") or None,
                        "date": meta.get("createdAt") or None,
                        "title": meta.get("title") or None,
                        "snippet": doc_text,
                        "similarityScore": round(similarity, 4),
                    })

            return formatted
        except Exception as exc:
            logger.error(f"Error querying Chroma vector store: {exc}")
            return []


# In-Memory Fallback Store (Used if ChromaDB native library is unavailable)
class InMemoryVectorStore(VectorStoreBase):
    def __init__(self):
        self._records = []

    def is_ready(self) -> bool:
        return True

    def count_chunks(self) -> int:
        return len(self._records)

    def delete_by_source(self, source_id: str, source_type: Optional[str] = None) -> int:
        initial = len(self._records)
        self._records = [
            r for r in self._records
            if not (r["sourceId"] == source_id and (source_type is None or r["sourceType"] == source_type))
        ]
        return initial - len(self._records)

    def index_chunks(
        self,
        source_id: str,
        source_type: str,
        patient_id: str,
        doctor_id: Optional[str],
        chunks: List[str],
        embeddings: List[List[float]],
        metadata: Dict[str, Any],
    ) -> int:
        self.delete_by_source(source_id)
        for i, (chunk, emb) in enumerate(zip(chunks, embeddings)):
            self._records.append({
                "sourceId": str(source_id),
                "sourceType": str(source_type),
                "patientId": str(patient_id),
                "doctorId": str(doctor_id or ""),
                "documentType": str(metadata.get("documentType") or ""),
                "createdAt": str(metadata.get("createdAt") or ""),
                "title": str(metadata.get("title") or ""),
                "snippet": chunk,
                "embedding": np.array(emb, dtype=np.float32),
            })
        return len(chunks)

    def query_similar(
        self,
        query_embedding: List[float],
        filters: Optional[Dict[str, Any]] = None,
        top_k: int = 5,
    ) -> List[Dict[str, Any]]:
        if not self._records:
            return []

        q_vec = np.array(query_embedding, dtype=np.float32)
        q_norm = np.linalg.norm(q_vec)
        if q_norm > 0:
            q_vec = q_vec / q_norm

        scored = []
        for r in self._records:
            if filters:
                if filters.get("patientId") and r["patientId"] != str(filters["patientId"]):
                    continue
                if filters.get("patientIds") and str(r["patientId"]) not in [str(p) for p in filters["patientIds"]]:
                    continue
                if filters.get("doctorId") and r["doctorId"] != str(filters["doctorId"]):
                    continue
                if filters.get("sourceType") and r["sourceType"] != str(filters["sourceType"]):
                    continue
                if filters.get("documentType") and r["documentType"] != str(filters["documentType"]):
                    continue
                if filters.get("dateFrom") and r["createdAt"] and r["createdAt"] < filters["dateFrom"]:
                    continue
                if filters.get("dateTo") and r["createdAt"] and r["createdAt"] > filters["dateTo"]:
                    continue

            emb = r["embedding"]
            sim = float(np.dot(q_vec, emb))
            sim = max(0.0, min(1.0, (sim + 1.0) / 2.0))

            scored.append({
                "sourceType": r["sourceType"],
                "sourceId": r["sourceId"],
                "patientId": r["patientId"],
                "doctorId": r["doctorId"] or None,
                "documentType": r["documentType"] or None,
                "date": r["createdAt"] or None,
                "title": r["title"] or None,
                "snippet": r["snippet"],
                "similarityScore": round(sim, 4),
            })

        scored.sort(key=lambda x: x["similarityScore"], reverse=True)
        return scored[:top_k]


# Singleton Vector Store Instance
_vector_store_instance: Optional[VectorStoreBase] = None


def get_vector_store() -> VectorStoreBase:
    global _vector_store_instance
    if _vector_store_instance is not None:
        return _vector_store_instance

    chroma = ChromaVectorStore()
    if chroma.is_ready():
        _vector_store_instance = chroma
    else:
        logger.info("Using InMemoryVectorStore as fallback.")
        _vector_store_instance = InMemoryVectorStore()

    return _vector_store_instance
