import express from 'express';
import { searchSemantic, getPatientTimeline } from '../controllers/searchController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Semantic natural language search (RBAC protected)
router.get('/semantic', protect, searchSemantic);

// Chronological patient medical timeline
router.get('/timeline/:patientId', protect, getPatientTimeline);

export default router;
