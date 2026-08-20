// routes/vobizTestRoutes.js
import { Router } from 'express';
import { 
  postVobizTestCall, 
  getVobizTestCall 
} from '../controllers/vobizTestController.js';

const router = Router();

// Test-only — no JWT
router.post('/test-call', postVobizTestCall);
router.get('/test-call/:mobile', getVobizTestCall);

export default router;