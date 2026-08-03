import dns from 'dns';
import mongoose from 'mongoose';
import { ensureUserIndexes } from './ensureUserIndexes.js';

/**
 * Some Windows/ISP DNS resolvers refuse Node SRV lookups for Atlas (querySrv ECONNREFUSED).
 * Public resolvers fix mongodb+srv:// without changing app behaviour.
 */
const ensureReliableDns = () => {
  try {
    dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
  } catch {
    // ignore if setServers is unavailable
  }
};

/**
 * Connect to MongoDB database
 */
const connectDB = async () => {
  let uri = (process.env.MONGODB_URI || '').trim();

  if (!uri) {
    console.error('MongoDB Connection Error: MONGODB_URI is not set in .env');
    process.exit(1);
  }

  // Atlas hostnames require mongodb+srv:// (standard mongodb:// only works with replica-set hosts)
  if (
    uri.startsWith('mongodb://') &&
    (uri.includes('mongodb.net') || uri.includes('.mongodb.net'))
  ) {
    uri = uri.replace('mongodb://', 'mongodb+srv://');
    console.warn('MONGODB_URI used mongodb:// for Atlas; auto-corrected to mongodb+srv://');
  }

  const isAtlas = uri.includes('mongodb.net') || uri.includes('mongodb+srv');
  if (isAtlas) {
    ensureReliableDns();
  }

  console.log(`Connecting to MongoDB (${isAtlas ? 'Atlas' : 'local'})...`);

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 15000,
      family: 4,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
    await ensureUserIndexes();
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    if (isAtlas) {
      console.error('Atlas tip: whitelist your current IP at https://cloud.mongodb.com → Network Access');
      if (String(error.message || '').includes('querySrv')) {
        console.error('DNS tip: Atlas SRV lookup failed — check VPN/firewall or use Atlas "standard" connection string');
      }
    } else {
      console.error('Local tip: open PowerShell as Admin → net start MongoDB');
    }
    process.exit(1);
  }
};

export default connectDB;
