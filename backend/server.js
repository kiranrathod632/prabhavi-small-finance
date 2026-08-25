// server.js (Final version)
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

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.set('trust proxy', 1);

// Security middleware
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// CORS configuration
const allowedOrigins = (() => {
  const envOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  
  const fallbackOrigins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://prabhavi-small-finance-app.vercel.app",
    "https://prabhavi-small-finance.vercel.app"
  ];
  
  const combined = [...envOrigins, ...fallbackOrigins];
  return [...new Set(combined)];
})();

app.use(
  cors({
    origin: function (origin, callback) {
      const isKnownOrigin = !!origin && allowedOrigins.includes(origin);
      const isVercelPreview = !!origin && /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin);

      if (!origin || isKnownOrigin || isVercelPreview) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check endpoints
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Finance Loan API is running', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Finance Loan API is running', 
    timestamp: new Date().toISOString() 
  });
});

// Rate limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX) || 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
  skip: (req) => {
    const url = req.originalUrl || '';
    return url.startsWith('/api/health') || url.startsWith('/health');
  },
});

app.use('/api', limiter);

// ✅ MOUNT ROUTES UNDER /api
app.use('/api', routes);

// Error handling
app.use(notFound);
app.use(errorHandler);

// ✅ EXPORT for Vercel
export default app;

// ✅ Local development server
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  const PORT = process.env.PORT || 8000;
  const startServer = async () => {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
      
      if (process.env.NODE_ENV !== 'test') {
        setInterval(async () => {
          try { await applyOverduePenalties(); } catch (e) { console.error('Penalty job:', e.message); }
        }, 60 * 60 * 1000);
        startSmsCronJobs();
      }
    });
  };
  startServer();
}