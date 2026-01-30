import { Storage } from '@google-cloud/storage';
import multer from 'multer';

// Initialize GCS
const storage = new Storage({
  keyFilename:
    process.env.GOOGLE_APPLICATION_CREDENTIALS || 'secrets/maidservsa-483313-9803bf8dff1e.json', // Path to your service account JSON
  projectId: process.env.GCP_PROJECT_ID || 'maidservsa-483313',
});

export const bucketName = process.env.GCS_BUCKET_NAME || 'maidservsa-user-files';
export const bucket = storage.bucket(bucketName);

// Configure Multer (Memory storage is best for streaming to GCS)
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});
