import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

// Configure Cloudinary SDK credentials
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'sample_cloud_name',
  api_key: process.env.CLOUDINARY_API_KEY || 'sample_api_key',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'sample_api_secret',
  secure: true,
});

/**
 * Saves a file buffer locally on disk when Cloudinary is not configured.
 */
const saveFileLocally = (buffer, folder, originalFileName) => {
  const uploadsBase = path.join(process.cwd(), 'uploads');
  const targetDir = path.join(uploadsBase, folder);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const ext = path.extname(originalFileName) || '';
  const cleanBase = path.basename(originalFileName, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
  const uniqueName = `${cleanBase}_${Date.now()}${ext}`;
  const filePath = path.join(targetDir, uniqueName);

  fs.writeFileSync(filePath, buffer);

  const port = process.env.PORT || 5000;
  const normalizedRel = `${folder.replace(/\\/g, '/')}/${uniqueName}`;
  const secure_url = `http://localhost:${port}/uploads/${normalizedRel}`;
  const public_id = `local:${normalizedRel}`;

  console.log(`[Storage Notice] Saved uploaded document locally: ${filePath}`);

  return {
    secure_url,
    public_id,
    bytes: buffer.length,
    format: ext.replace(/^\./, '') || 'unknown',
  };
};

/**
 * Uploads a file buffer to Cloudinary using an upload stream,
 * with seamless automatic fallback to local disk storage.
 */
export const uploadStreamToCloudinary = (buffer, folder, originalFileName, resourceType = 'auto') => {
  const hasCloudinary =
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_KEY !== 'sample_api_key' &&
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_CLOUD_NAME !== 'sample_cloud_name';

  if (!hasCloudinary) {
    return Promise.resolve(saveFileLocally(buffer, folder, originalFileName));
  }

  return new Promise((resolve, reject) => {
    const cleanName = originalFileName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
    const publicId = `${cleanName}_${Date.now()}`;

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: publicId,
        resource_type: resourceType,
        overwrite: true,
      },
      (error, result) => {
        if (error) {
          console.warn('[Cloudinary Warning] Cloud upload failed, falling back to local storage:', error.message);
          return resolve(saveFileLocally(buffer, folder, originalFileName));
        }
        resolve({
          secure_url: result.secure_url,
          public_id: result.public_id,
          bytes: result.bytes,
          format: result.format || 'unknown',
        });
      }
    );

    uploadStream.end(buffer);
  });
};

/**
 * Deletes a file from Cloudinary or local disk storage.
 */
export const deleteFromCloudinary = async (publicId, resourceType = 'auto') => {
  if (publicId && publicId.startsWith('local:')) {
    try {
      const relPath = publicId.replace('local:', '');
      const filePath = path.join(process.cwd(), 'uploads', relPath);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return { result: 'ok' };
    } catch (e) {
      console.warn('[Local File Delete Notice]:', e.message);
      return { result: 'not found' };
    }
  }
  try {
    return await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (error) {
    console.error(`[Cloudinary Cleanup Error] Failed to delete ${publicId}:`, error.message);
    throw error;
  }
};

/**
 * Generates a signed or secure download/access URL for a medical asset.
 */
export const generateSecureDownloadUrl = (publicId, fileFormat) => {
  if (publicId && publicId.startsWith('local:')) {
    const relPath = publicId.replace('local:', '');
    const port = process.env.PORT || 5000;
    return `http://localhost:${port}/uploads/${relPath}`;
  }
  const resourceType = fileFormat === 'pdf' ? 'image' : 'image';
  return cloudinary.url(publicId, {
    flags: 'attachment',
    secure: true,
    resource_type: resourceType,
  });
};

export default cloudinary;
