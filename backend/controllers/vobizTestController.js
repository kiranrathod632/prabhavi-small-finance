// controllers/vobizTestController.js
import { testVobizCall } from '../services/vobizService.js';

export const postVobizTestCall = async (req, res) => {
  try {
    const { mobile, name, amount, dueDate, emiNumber, message } = req.body;

    if (!mobile) {
      return res.status(400).json({
        success: false,
        error: 'Mobile number is required'
      });
    }

    const digits = String(mobile || '').replace(/\D/g, '').slice(-10);
    if (!/^[6-9]\d{9}$/.test(digits)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Indian mobile number (must be 10 digits starting with 6-9)'
      });
    }

    const result = await testVobizCall(mobile, {
      name: name || 'Test User',
      amount: amount || 1000,
      dueDate: dueDate || new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      emiNumber: emiNumber || 'EMI-TEST-001',
      message: message || null
    });

    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error('[Vobiz Test Call] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Vobiz test call failed',
      provider: 'vobiz'
    });
  }
};

export const getVobizTestCall = async (req, res) => {
  try {
    const { mobile } = req.params;
    const { name, amount } = req.query;

    if (!mobile) {
      return res.status(400).json({
        success: false,
        error: 'Mobile number is required'
      });
    }

    const digits = String(mobile || '').replace(/\D/g, '').slice(-10);
    if (!/^[6-9]\d{9}$/.test(digits)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Indian mobile number (must be 10 digits starting with 6-9)'
      });
    }

    const result = await testVobizCall(mobile, {
      name: name || 'Test User',
      amount: amount || 1000,
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
    });

    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Vobiz test call failed',
      provider: 'vobiz'
    });
  }
};