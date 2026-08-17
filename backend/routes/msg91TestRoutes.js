import { Router } from 'express';
import { postTestCall, postTestSms } from '../controllers/msg91TestController.js';

const router = Router();

// Test-only — no JWT
router.post('/test-sms', postTestSms);
router.post('/test-call', postTestCall);

export default router;
