import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './config/db.js';
import routes from './routes/index.js';
import errorHandler, { notFound } from './middlewares/errorHandler.js';
import { applyOverduePenalties } from './services/penaltyService.js';
import { startSmsCronJobs } from './jobs/smsCron.js';


// import dotenv from "dotenv";
dotenv.config();

console.log("Mongo URI:", process.env.MONGODB_URI);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env'), override: true });

const app = express();

// Security middleware
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow tools/Postman (no Origin) and configured frontends
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    // Vite often uses 5174+ when 5173 is busy
    if (
      process.env.NODE_ENV === 'development' &&
      /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)
    ) {
      return callback(null, true);
    }
    callback(new Error(`Not allowed by CORS: ${origin}`));
  },
  credentials: true,
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'Too many requests, please try again later.' },
});
app.use('/api', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Finance Loan API is running', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api', routes);

// Error handling
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 8000;

const startServer = async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);

    if (process.env.NODE_ENV !== 'test') {
      // Keep existing hourly penalty job behaviour
      setInterval(async () => {
        try { await applyOverduePenalties(); } catch (e) { console.error('Penalty job:', e.message); }
      }, 60 * 60 * 1000);

      // SMS reminder crons live in jobs/smsCron.js (not inline here)
      startSmsCronJobs();
    }
  });
};

startServer();

export default app;
