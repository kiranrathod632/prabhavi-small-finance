import mongoose from 'mongoose';
import { ensureUserIndexes } from './ensureUserIndexes.js';

/**
 * Connect to MongoDB database
 */
const connectDB = async () => {
  const uri = (process.env.MONGODB_URI || '').trim();

  if (!uri) {
    console.error('MongoDB Connection Error: MONGODB_URI is not set in .env');
    process.exit(1);
  }

  const isAtlas = uri.includes('mongodb.net') || uri.includes('mongodb+srv');
  console.log(`Connecting to MongoDB (${isAtlas ? 'Atlas' : 'local'})...`);

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
    await ensureUserIndexes();
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    if (isAtlas) {
      console.error('Atlas tip: whitelist your current IP at https://cloud.mongodb.com → Network Access');
    } else {
      console.error('Local tip: open PowerShell as Admin → net start MongoDB');
    }
    process.exit(1);
  }
};

export default connectDB;
