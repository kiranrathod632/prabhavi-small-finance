import { Router } from 'express';
import authRoutes from './authRoutes.js';
import userRoutes from './userRoutes.js';
import profileRoutes from './profileRoutes.js';
import loanRoutes from './loanRoutes.js';
import emiRoutes from './emiRoutes.js';
import transactionRoutes from './transactionRoutes.js';
import fundRoutes from './fundRoutes.js';
import notificationRoutes from './notificationRoutes.js';
import dashboardRoutes from './dashboardRoutes.js';
import otpRoutes from './otpRoutes.js';
import settingsRoutes from './settingsRoutes.js';
import recoveryRoutes from './recoveryRoutes.js';
import reportRoutes from './reportRoutes.js';
import adminRoutes from './adminRoutes.js';

import adminPanelRoutes from './adminPanelRoutes.js';
import twilioTestRoutes from './twilioTestRoutes.js';
import vobizTestRoutes from './vobizTestRoutes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/otp', otpRoutes);
router.use('/users', userRoutes);
router.use('/profile', profileRoutes);
router.use('/twilio', twilioTestRoutes);
router.use('/loans', loanRoutes);
router.use('/emis', emiRoutes);
router.use('/transactions', transactionRoutes);
router.use('/funds', fundRoutes);
router.use('/notifications', notificationRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/settings', settingsRoutes);
router.use('/recovery', recoveryRoutes);
router.use('/reports', reportRoutes);
router.use('/admins', adminRoutes);
router.use('/admin', adminPanelRoutes);
router.use('/vobiz', vobizTestRoutes);

export default router;
