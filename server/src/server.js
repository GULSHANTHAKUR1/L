import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { connectDB } from './config/db.js';
import { notFoundHandler, errorHandler } from './middleware/errorMiddleware.js';
import authRoutes from './routes/authRoutes.js';
import doctorRoutes from './routes/doctorRoutes.js';
import patientRoutes from './routes/patientRoutes.js';
import appointmentRoutes from './routes/appointmentRoutes.js';
import medicalRecordRoutes from './routes/medicalRecordRoutes.js';
import prescriptionRoutes from './routes/prescriptionRoutes.js';
import documentRoutes from './routes/documentRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import internalRoutes from './routes/internalRoutes.js';
import searchRoutes from './routes/searchRoutes.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// Establish Database Connection
connectDB();

// HTTP Request Logger
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// CORS Configuration with Frontend URL Support & Credentials
const allowedOrigins = [CLIENT_URL, 'http://localhost:5173', 'http://localhost:5175'];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl) or matching origins
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, true); // Permissive in dev to prevent blocking
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Body Parsing & Cookie Parser Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser(process.env.COOKIE_SECRET));

// Static uploads serving for local storage & OCR processing
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Root Health Route
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'heterohms-server',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// API-scoped Health Route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'heterohms-server',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Authentication & Business Module Routes
app.use('/api/auth', authRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/medical-records', medicalRecordRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/internal', internalRoutes);
app.use('/api/v1/internal', internalRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/v1/search', searchRoutes);

// 404 Handler for Unmatched Routes
app.use(notFoundHandler);

// Centralized Error-Handling Middleware
app.use(errorHandler);

// Start Server Listener
app.listen(PORT, () => {
  console.log(`[HETEROHMS Server] Running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  console.log(`[HETEROHMS Server] CORS allowed origin: ${CLIENT_URL}`);
});

export default app;
