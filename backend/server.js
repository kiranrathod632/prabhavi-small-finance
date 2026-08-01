import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import cron from 'node-cron';
import connectDB from './config/db.js';
import routes from './routes/index.js';
import errorHandler, { notFound } from './middlewares/errorHandler.js';
import { applyOverduePenalties, sendUpcomingReminders, sendTestUpcomingReminders } from './services/penaltyService.js';


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

      // EMI reminder SMS cron: every day at 10:00 AM IST
      // Example: EMI due on 5th → SMS on 3rd at 10 AM (2 days before)
      cron.schedule(
        '0 10 * * *',
        async () => {
          try {
            console.log('[Cron] Running EMI reminder SMS job at 10:00 AM IST');
            await sendUpcomingReminders();
          } catch (e) {
            console.error('Reminder cron job:', e.message);
          }
        },
        { timezone: 'Asia/Kolkata' }
      );

      console.log('[Cron] EMI reminder scheduled: daily 10:00 AM Asia/Kolkata (2 days before due)');

      // Every 5 minutes: SMS reminder for pending EMIs due today / kal / next N days
      // Controlled by EMI_REMINDER_TEST_EVERY_5_MIN=true in .env
      const enableEvery5Min =
        String(process.env.EMI_REMINDER_TEST_EVERY_5_MIN || '').trim().toLowerCase() === 'true';

      if (enableEvery5Min) {
        const runEvery5MinReminder = async (reason) => {
          try {
            console.log(`[Cron] EMI reminder every 5 min (${reason})`);
            await sendTestUpcomingReminders();
          } catch (e) {
            console.error('Every-5-min reminder cron:', e.message);
          }
        };

        // Send once immediately on server start (aaj se abhi)
        runEvery5MinReminder('startup');

        cron.schedule(
          '*/5 * * * *',
          () => runEvery5MinReminder('scheduled'),
          { timezone: 'Asia/Kolkata' }
        );
        console.log('[Cron] EMI reminder every 5 minutes ENABLED — latest pending EMI(s), any due date');
      } else {
        console.log('[Cron] EMI reminder every 5 minutes DISABLED (set EMI_REMINDER_TEST_EVERY_5_MIN=true)');
      }
    }
  });
};

startServer();

export default app;
