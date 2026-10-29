import MedicalDocument from '../models/MedicalDocument.js';
import { createNotification } from '../utils/notificationHelper.js';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
const AI_SERVICE_INTERNAL_KEY = process.env.AI_SERVICE_INTERNAL_KEY || 'heterohms_internal_secret_key_2026';

/**
 * Low-level client for dispatching indexing payloads to the Python FastAPI service.
 * Runs asynchronously and fails safely so core database writes are never blocked.
 *
 * @param {Object} params
 * @param {string} params.sourceType - 'medical_document' | 'medical_record' | 'prescription'
 * @param {string|ObjectId} params.sourceId - MongoDB ID of the source record
 * @param {string|ObjectId} params.patientId - Patient ID (data isolation boundary)
 * @param {string|ObjectId} [params.doctorId] - Prescribing/attending doctor ID
 * @param {string} params.text - Clinical text content to embed
 * @param {Object} [params.metadata] - Extra metadata (documentType, createdAt, title)
 */
export const indexRecord = async ({
  sourceType,
  sourceId,
  patientId,
  doctorId = null,
  text,
  metadata = {},
}) => {
  if (!text || typeof text !== 'string' || text.trim().length < 10) {
    console.log(`[Semantic Index Skip] Source '${sourceId}' (${sourceType}) has insufficient text to index.`);
    return null;
  }

  // Execute asynchronously to avoid blocking the primary transaction
  setImmediate(async () => {
    try {
      if (sourceType === 'medical_document') {
        await MedicalDocument.findByIdAndUpdate(sourceId, {
          embeddingStatus: 'processing',
        });
      }

      const endpoint = `${AI_SERVICE_URL.replace(/\/+$/, '')}/api/embeddings/index`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      let response;
      try {
        response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Internal-API-Key': AI_SERVICE_INTERNAL_KEY,
          },
          body: JSON.stringify({
            sourceType,
            sourceId: sourceId.toString(),
            patientId: patientId.toString(),
            doctorId: doctorId ? doctorId.toString() : null,
            text: text.trim(),
            metadata: {
              documentType: metadata.documentType || null,
              createdAt: metadata.createdAt ? new Date(metadata.createdAt).toISOString() : new Date().toISOString(),
              title: metadata.title || null,
            },
          }),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }

      const data = await response.json().catch(() => null);

      if (response.ok && data?.status === 'completed') {
        if (sourceType === 'medical_document') {
          await MedicalDocument.findByIdAndUpdate(sourceId, {
            embeddingStatus: 'completed',
          });

          await createNotification({
            recipientId: patientId,
            title: 'Document indexed for semantic search',
            message: `Document '${metadata.title || 'scan'}' is now indexed and searchable in your health records.`,
            type: 'document',
            relatedEntityType: 'MedicalDocument',
            relatedEntityId: sourceId,
          });
        }
        console.log(`[Semantic Index Success] Indexed ${data.chunksIndexed} chunks for ${sourceType} '${sourceId}'.`);
      } else {
        const errorDetail = data?.detail || `HTTP ${response.status}`;
        console.warn(`[Semantic Index Notice] Microservice rejected ${sourceType} '${sourceId}': ${errorDetail}`);
        if (sourceType === 'medical_document') {
          await MedicalDocument.findByIdAndUpdate(sourceId, {
            embeddingStatus: 'failed',
          });
        }
      }
    } catch (err) {
      console.error(`[Semantic Index Warning] Non-blocking indexing notice for ${sourceType} '${sourceId}': ${err.message}`);
      if (sourceType === 'medical_document') {
        try {
          await MedicalDocument.findByIdAndUpdate(sourceId, {
            embeddingStatus: 'failed',
          });
        } catch (dbErr) {
          // Silent catch on fallback
        }
      }
    }
  });
};

/**
 * Triggers semantic indexing for an OCR-completed MedicalDocument.
 */
export const triggerDocumentIndexing = (document) => {
  if (!document || !document.extractedText) return;
  indexRecord({
    sourceType: 'medical_document',
    sourceId: document._id,
    patientId: document.patientId,
    doctorId: null,
    text: `Document Title: ${document.originalFileName}. Category: ${document.documentType}. Extracted Content: ${document.extractedText}`,
    metadata: {
      documentType: document.documentType,
      createdAt: document.createdAt,
      title: document.originalFileName,
    },
  });
};

/**
 * Triggers semantic indexing for a newly created or updated MedicalRecord.
 */
export const triggerMedicalRecordIndexing = (record) => {
  if (!record || !record.diagnosis) return;

  const symptomList = Array.isArray(record.symptoms) && record.symptoms.length > 0
    ? record.symptoms.join(', ')
    : 'None reported';

  const followUpStr = record.followUpDate
    ? `Follow-up scheduled on ${new Date(record.followUpDate).toISOString().split('T')[0]}.`
    : '';

  const indexableContent = [
    `Clinical Record Diagnosis: ${record.diagnosis}.`,
    `Reported Symptoms: ${symptomList}.`,
    `Attending Physician Treatment Notes: ${record.treatmentNotes || 'None'}.`,
    followUpStr,
  ].filter(Boolean).join(' ');

  indexRecord({
    sourceType: 'medical_record',
    sourceId: record._id,
    patientId: record.patientId,
    doctorId: record.doctorId,
    text: indexableContent,
    metadata: {
      documentType: 'medical-record',
      createdAt: record.createdAt || new Date(),
      title: `EHR: ${record.diagnosis}`,
    },
  });
};

/**
 * Triggers semantic indexing for a newly created or updated Prescription.
 */
export const triggerPrescriptionIndexing = (prescription) => {
  if (!prescription || !Array.isArray(prescription.medicines) || prescription.medicines.length === 0) return;

  const medSummaries = prescription.medicines
    .map((m) => `${m.medicineName} (Dosage: ${m.dosage}, Frequency: ${m.frequency}, Duration: ${m.duration}). Instructions: ${m.instructions || 'Standard'}`)
    .join('; ');

  const indexableContent = [
    `Prescription Medication Plan.`,
    `Prescribed Medicines: ${medSummaries}.`,
    prescription.additionalInstructions ? `Physician Advice: ${prescription.additionalInstructions}.` : '',
  ].filter(Boolean).join(' ');

  indexRecord({
    sourceType: 'prescription',
    sourceId: prescription._id,
    patientId: prescription.patientId,
    doctorId: prescription.doctorId,
    text: indexableContent,
    metadata: {
      documentType: 'prescription',
      createdAt: prescription.createdAt || new Date(),
      title: `Rx: ${prescription.medicines[0]?.medicineName || 'Medications'} (${prescription.medicines.length} items)`,
    },
  });
};

/**
 * Executes a semantic vector search query against the Python microservice.
 *
 * @param {Object} params
 * @param {string} params.query - Clinical search query (natural language)
 * @param {Object} [params.filters] - Restrictive RBAC boundaries (patientId, doctorId, sourceType, etc.)
 * @param {number} [params.topK=10] - Number of candidate matches
 * @returns {Promise<Object>} Search response with results array and disclaimer
 */
export const querySemanticSearch = async ({ query, filters = {}, topK = 10 }) => {
  const endpoint = `${AI_SERVICE_URL.replace(/\/+$/, '')}/api/semantic-search/query`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-API-Key': AI_SERVICE_INTERNAL_KEY,
      },
      body: JSON.stringify({
        query,
        filters,
        topK,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`AI service query returned status HTTP ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (err) {
    console.error(`[Semantic Search Query Warning]: ${err.message}`);
    // Safe fallback returning clean zero results without crashing
    return {
      query,
      totalResults: 0,
      results: [],
      disclaimer: 'Results are for record retrieval only and do not constitute medical advice or diagnosis.',
    };
  } finally {
    clearTimeout(timeoutId);
  }
};

/**
 * Purges vector chunks from ChromaDB when a source document/record is deleted.
 *
 * @param {string|ObjectId} sourceId - MongoDB ID
 * @param {string} [sourceType] - Optional type filter
 */
export const deleteSourceFromIndex = (sourceId, sourceType = null) => {
  setImmediate(async () => {
    try {
      const endpoint = `${AI_SERVICE_URL.replace(/\/+$/, '')}/api/embeddings/delete-by-source`;
      await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-API-Key': AI_SERVICE_INTERNAL_KEY,
        },
        body: JSON.stringify({
          sourceId: sourceId.toString(),
          sourceType: sourceType || undefined,
        }),
      });
      console.log(`[Semantic Index Purge] Deleted vector chunks for sourceId '${sourceId}'.`);
    } catch (err) {
      console.warn(`[Semantic Index Purge Warning] Could not purge source '${sourceId}': ${err.message}`);
    }
  });
};

export default {
  indexRecord,
  triggerDocumentIndexing,
  triggerMedicalRecordIndexing,
  triggerPrescriptionIndexing,
  querySemanticSearch,
  deleteSourceFromIndex,
};
