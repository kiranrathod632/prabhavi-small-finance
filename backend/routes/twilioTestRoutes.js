import { Router } from 'express';
import { postTestCall } from '../controllers/twilioTestController.js';

const router = Router();

// Test-only — no JWT
router.post('/test-call', postTestCall);

export default router;
