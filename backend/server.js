import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import http from "http";
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

dotenv.config({ path: path.join(__dirname, '.env'), override: true });

const app = express();

app.set('trust proxy', 1);

// Security middleware
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// CORS: env CLIENT_URL + production frontend fallbacks (must be browser origins, not the API host)
const normalizeOrigin = (value) =>
  String(value || '')
    .trim()
    .replace(/^['"]|['"]$/g, '')
    .replace(/\/$/, '');

const allowedOrigins = (() => {
  const envOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
    .split(',')
    .map(normalizeOrigin)
    .filter(Boolean);

  const fallbackOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'https://prabhavi-small-finance.vercel.app',
  ];

  return [...new Set([...envOrigins, ...fallbackOrigins])];
})();

const isAllowedOrigin = (origin) => {
  if (!origin) return true; // same-origin / curl / mobile
  const normalized = normalizeOrigin(origin);
  if (allowedOrigins.includes(normalized)) return true;
  // Vercel production + preview URLs
  return /^https:\/\/([a-z0-9-]+\.)*vercel\.app$/i.test(normalized);
};

const corsOptions = {
  origin(origin, callback) {
    // callback(null, false) denies without throwing — throwing skips ACAO headers
    callback(null, isAllowedOrigin(origin));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
// Ensure preflight is answered even if a route does not declare OPTIONS
app.options('*', cors(corsOptions));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check before rate limiter (Render probes must not burn the quota)
const healthHandler = (req, res) => {
  res.json({ success: true, message: 'Finance Loan API is running', timestamp: new Date().toISOString() });
};
app.get('/api/health', healthHandler);
app.get('/health', healthHandler);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  // Live apps + shared NATs need headroom; override with RATE_LIMIT_MAX if needed
  max: Number(process.env.RATE_LIMIT_MAX) || 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
  skip: (req) => {
    if (req.method === 'OPTIONS') return true;
    const url = req.originalUrl || '';
    return url.startsWith('/api/health') || url.startsWith('/health');
  },
});
app.use('/api', limiter);
// Same limiter when clients call routes without the /api prefix
app.use(['/auth', '/otp', '/users', '/profile', '/loans', '/emis', '/transactions', '/funds', '/notifications', '/dashboard', '/settings', '/recovery', '/reports', '/admins', '/admin'], limiter);

// API routes — /api/* is canonical; bare /* kept for clients that omit the prefix
app.use('/api', routes);
app.use(routes);

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