import express from 'express';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { applyOcrResult } from '../services/ocrIntegrationService.js';

const router = express.Router();

/**
 * Middleware: Verify X-Internal-Callback-Key header with constant-time comparison
 * Ensures that only the authorized internal Python microservice can invoke this endpoint.
 */
export const verifyInternalCallbackKey = (req, res, next) => {
  const providedKey = req.headers['x-internal-callback-key'];
  const expectedKey = process.env.INTERNAL_CALLBACK_KEY || 'heterohms_callback_secret_key_2026';

  if (!providedKey) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Missing required X-Internal-Callback-Key header.',
    });
  }

  // Use timingSafeEqual to guard against timing attacks
  try {
    const providedBuffer = Buffer.from(providedKey);
    const expectedBuffer = Buffer.from(expectedKey);

    if (
      providedBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(providedBuffer, expectedBuffer)
    ) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Invalid internal callback key.',
      });
    }
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Callback authentication failure.',
    });
  }

  next();
};

/**
 * @desc    Secure callback endpoint invoked by Python FastAPI microservice
 * @route   POST /api/internal/ocr-result or /api/v1/internal/ocr-result
 * @access  Internal Microservice Only (Guarded by X-Internal-Callback-Key)
 */
router.post('/ocr-result', verifyInternalCallbackKey, async (req, res) => {
  const { documentId, status, extractedText, pageCount, error, warnings } = req.body;

  // 1. Validate required payload attributes
  if (!documentId || !mongoose.Types.ObjectId.isValid(documentId)) {
    return res.status(422).json({
      success: false,
      message: 'Unprocessable Entity: documentId is required and must be a valid MongoDB ObjectId.',
    });
  }

  if (!status || !['completed', 'failed'].includes(status)) {
    return res.status(422).json({
      success: false,
      message: "Unprocessable Entity: status must be either 'completed' or 'failed'.",
    });
  }

  try {
    // 2. Apply result idempotently
    const updatedDocument = await applyOcrResult({
      documentId,
      status,
      extractedText,
      pageCount: Number(pageCount) || 1,
      error,
      warnings: Array.isArray(warnings) ? warnings : [],
    });

    if (!updatedDocument) {
      return res.status(404).json({
        success: false,
        message: `MedicalDocument with ID '${documentId}' not found.`,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'OCR callback processed successfully.',
      data: {
        documentId: updatedDocument._id,
        ocrStatus: updatedDocument.ocrStatus,
        embeddingStatus: updatedDocument.embeddingStatus,
        pageCount: updatedDocument.pageCount,
      },
    });
  } catch (err) {
    console.error(`[Internal Route Error] Callback processing error for ${documentId}:`, err.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while recording OCR result.',
    });
  }
});

export default router;
