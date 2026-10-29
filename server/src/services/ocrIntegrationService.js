import MedicalDocument from '../models/MedicalDocument.js';
import { createNotification } from '../utils/notificationHelper.js';
import { triggerDocumentIndexing } from './semanticSearchIntegrationService.js';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
const AI_SERVICE_INTERNAL_KEY = process.env.AI_SERVICE_INTERNAL_KEY || 'heterohms_internal_secret_key_2026';
const INTERNAL_CALLBACK_KEY = process.env.INTERNAL_CALLBACK_KEY || 'heterohms_callback_secret_key_2026';

/**
 * Idempotently updates a MedicalDocument with OCR extraction results and
 * delivers user notifications.
 *
 * @param {Object} params
 * @param {string} params.documentId - MongoDB ObjectId of the target document
 * @param {string} params.status - 'completed' | 'failed'
 * @param {string} [params.extractedText] - Extracted clinical text
 * @param {number} [params.pageCount] - Total document pages processed
 * @param {string} [params.error] - Safe client-facing error message
 * @param {Array} [params.warnings] - Non-fatal warnings
 * @returns {Promise<Object|null>} Updated document record
 */
export const applyOcrResult = async ({
  documentId,
  status,
  extractedText = '',
  pageCount = 1,
  error = null,
  warnings = [],
}) => {
  try {
    const doc = await MedicalDocument.findById(documentId);
    if (!doc) {
      console.warn(`[OCR Result Notice] Target MedicalDocument '${documentId}' not found.`);
      return null;
    }

    if (status === 'completed') {
      // 1. Idempotency Check: If already completed with identical text, skip duplicate write & notification
      if (doc.ocrStatus === 'completed' && doc.extractedText === extractedText) {
        console.log(`[OCR Result Idempotent] Document '${documentId}' already marked completed. Skipping.`);
        return doc;
      }

      doc.ocrStatus = 'completed';
      doc.extractedText = extractedText || '';
      doc.pageCount = Math.max(1, pageCount || doc.pageCount || 1);
      doc.embeddingStatus = 'pending';
      doc.ocrError = null;
      await doc.save();

      // Dispatch patient notification
      await createNotification({
        recipientId: doc.patientId,
        title: 'Document text extraction completed',
        message: `OCR text extraction completed successfully for '${doc.originalFileName}'.`,
        type: 'document',
        relatedEntityType: 'MedicalDocument',
        relatedEntityId: doc._id,
      });

      // Trigger asynchronous semantic vector indexing
      triggerDocumentIndexing(doc);

      console.log(
        `[OCR Result Applied] Document '${documentId}' completed successfully (${(extractedText || '').length} characters, ${pageCount} pages).`
      );
      return doc;
    } else {
      // 2. Race Condition Guard: Never overwrite an already 'completed' document with a delayed 'failed' result
      if (doc.ocrStatus === 'completed') {
        console.warn(
          `[OCR Result Conflict] Received failure result for already-completed document '${documentId}'. Ignoring failure.`
        );
        return doc;
      }

      const safeError = error || 'Document text extraction could not be completed';
      doc.ocrStatus = 'failed';
      doc.ocrError = safeError;
      await doc.save();

      // Dispatch patient notification
      await createNotification({
        recipientId: doc.patientId,
        title: 'Document text extraction could not be completed',
        message: `OCR text extraction could not be completed for '${doc.originalFileName}'. Please ensure document is legible.`,
        type: 'document',
        relatedEntityType: 'MedicalDocument',
        relatedEntityId: doc._id,
      });

      console.warn(`[OCR Result Applied] Document '${documentId}' marked failed. Safe error: ${safeError}`);
      return doc;
    }
  } catch (err) {
    console.error(`[OCR Result Error] Failed applying OCR result for document '${documentId}':`, err.message);
    throw err;
  }
};

/**
 * Triggers asynchronous OCR extraction with Python FastAPI microservice:
 * 1. Executes in background via setImmediate so file upload response returns immediately.
 * 2. Marks document ocrStatus as 'processing' before calling Python service.
 * 3. Sends documentId, fileUrl, mimeType, and language to POST {AI_SERVICE_URL}/api/ocr/process
 *    with X-Internal-API-Key header.
 * 4. Handles timeouts, connection errors, and structured failure responses safely.
 *
 * @param {string|ObjectId} documentId - MongoDB Document ID
 * @param {string} fileUrl - Secure Cloudinary file URL
 * @param {string} mimeType - File MIME type
 * @param {string} [language='eng'] - Language code
 */
export const triggerOcrProcessing = (documentId, fileUrl, mimeType, language = 'eng') => {
  // Asynchronous non-blocking background task
  setImmediate(async () => {
    try {
      console.log(`[OCR Pipeline] Initiating asynchronous extraction for document '${documentId}'...`);

      // Mark status as 'processing' before initiating network call
      await MedicalDocument.findByIdAndUpdate(documentId, {
        ocrStatus: 'processing',
        ocrError: null,
      });

      const endpoint = `${AI_SERVICE_URL.replace(/\/+$/, '')}/api/ocr/process`;

      // Safe network request with 45s AbortController timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000);

      let response;
      try {
        response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Internal-API-Key': AI_SERVICE_INTERNAL_KEY,
          },
          body: JSON.stringify({
            documentId: documentId.toString(),
            fileUrl,
            mimeType,
            language,
          }),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }

      const data = await response.json().catch(() => null);

      if (response.ok && data?.status === 'completed') {
        // Fast synchronous extraction response from microservice
        await applyOcrResult({
          documentId,
          status: 'completed',
          extractedText: data.extractedText,
          pageCount: data.pageCount,
          warnings: data.warnings || [],
        });
      } else if (data?.status === 'failed') {
        await applyOcrResult({
          documentId,
          status: 'failed',
          error: data.error || 'Microservice reported an extraction failure',
          warnings: data.warnings || [],
        });
      } else {
        const errorMsg = data?.error || `OCR Microservice returned HTTP ${response.status}`;
        await applyOcrResult({
          documentId,
          status: 'failed',
          error: errorMsg,
        });
      }
    } catch (err) {
      // Safe error logging without leaking secrets or document content
      const isTimeout = err.name === 'AbortError';
      const safeReason = isTimeout
        ? 'OCR request timed out after 45 seconds'
        : `Connection to AI microservice failed (${err.message})`;

      console.error(`[OCR Pipeline Warning] Document '${documentId}' processing notice: ${safeReason}`);

      await applyOcrResult({
        documentId,
        status: 'failed',
        error: isTimeout
          ? 'OCR processing timed out. Please try again later.'
          : 'AI OCR microservice is temporarily offline. Document remains safely stored.',
      }).catch((dbErr) => {
        console.error('[OCR Pipeline Fallback DB Error]:', dbErr.message);
      });
    }
  });
};

export default {
  triggerOcrProcessing,
  applyOcrResult,
};
