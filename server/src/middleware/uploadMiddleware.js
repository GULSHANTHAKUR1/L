import multer from 'multer';
import path from 'path';

// Memory storage keeps file buffers in memory for direct Cloudinary streaming
const storage = multer.memoryStorage();

const ALLOWED_MIME_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
const ALLOWED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg'];

/**
 * File filter to reject unsupported and executable file types.
 */
const fileFilter = (req, file, cb) => {
  const fileExt = path.extname(file.originalname).toLowerCase();
  const isMimeAllowed = ALLOWED_MIME_TYPES.includes(file.mimetype.toLowerCase());
  const isExtAllowed = ALLOWED_EXTENSIONS.includes(fileExt);

  if (isMimeAllowed && isExtAllowed) {
    return cb(null, true);
  }

  const error = new Error(
    `Unsupported file format '${file.mimetype}'. Only PDF, PNG, JPG, and JPEG files are permitted.`
  );
  error.statusCode = 400;
  cb(error, false);
};

// 10 MB maximum file size limit
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    files: 1, // Single file upload per request
  },
  fileFilter,
});

/**
 * Express middleware wrapper to cleanly handle Multer limits and format errors.
 */
export const uploadMedicalFile = (req, res, next) => {
  const singleUpload = upload.single('file');

  singleUpload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'File size exceeds the 10 MB limit. Please compress or select a smaller file.',
        });
      }
      return res.status(400).json({
        success: false,
        message: `Upload error: ${err.message}`,
      });
    } else if (err) {
      return res.status(err.statusCode || 400).json({
        success: false,
        message: err.message,
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file provided. Please attach a medical document under the 'file' field.",
      });
    }

    next();
  });
};

export default uploadMedicalFile;
