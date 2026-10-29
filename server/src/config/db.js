import mongoose from 'mongoose';

/**
 * Connects to MongoDB Atlas using Mongoose ODM.
 */
export const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;

    if (!mongoUri) {
      console.warn('[MongoDB] Warning: MONGO_URI is not set in environment variables.');
      return;
    }

    const conn = await mongoose.connect(mongoUri);
    console.log(`[MongoDB] Connected successfully to host: ${conn.connection.host}`);
  } catch (error) {
    console.error(`[MongoDB] Connection error: ${error.message}`);
    process.exit(1);
  }
};
