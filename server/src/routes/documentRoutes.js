import express from 'express';
import {
  uploadDocument,
  getDocuments,
  getDocumentById,
  deleteDocument,
  downloadDocument,
  retryDocumentOcr,
} from '../controllers/documentController.js';
import { protect } from '../middleware/authMiddleware.js';
import { uploadMedicalFile } from '../middleware/uploadMiddleware.js';
import { validateUploadDocument } from '../validators/documentValidator.js';

const router = express.Router();

// Upload medical document (Multer memory stream to Cloudinary)
router.post(
  '/upload',
  protect,
  uploadMedicalFile,
  validateUploadDocument,
  uploadDocument
);

// List medical documents (Role-scoped visibility)
router.get('/', protect, getDocuments);

// View single document metadata
router.get('/:documentId', protect, getDocumentById);

// Get authorized download URL
router.get('/:documentId/download', protect, downloadDocument);

// Re-trigger OCR extraction on document
router.post('/:documentId/retry-ocr', protect, retryDocumentOcr);

// Delete document (Admin any; Doctor/Patient own uploaded only)
router.delete('/:documentId', protect, deleteDocument);

export default router;
