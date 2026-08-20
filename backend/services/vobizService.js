// services/vobizService.js
import axios from 'axios';
import { buildMarathiEmiCallScript } from '../utils/emiCallScript.js';

const getVobizConfig = () => ({
  authId: (process.env.VOBIZ_AUTH_ID || '').replace(/\s+/g, '').trim(),
  authToken: (process.env.VOBIZ_AUTH_TOKEN || '').replace(/\s+/g, '').trim(),
  fromNumber: (process.env.VOBIZ_FROM_NUMBER || '').replace(/\s+/g, '').trim(),
  apiBase: (process.env.VOBIZ_API_BASE || 'https://api.vobiz.ai/api/v1').trim(),
});

const isPlaceholder = (value = '') =>
  !value ||
  /^your[_-]/i.test(value) ||
  /xxx|replace|changeme|example/i.test(value);

const escapeXml = (text = '') =>
  String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const buildVobizVoiceXml = (sayText, repeatCount = 2) => {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n';
  for (let i = 0; i < repeatCount; i++) {
    xml += `  <Say voice="Indian English" language="hi-IN">${escapeXml(sayText)}</Say>\n`;
    if (i < repeatCount - 1) xml += `  <Pause length="1"/>\n`;
  }
  xml += '  <Hangup/>\n</Response>';
  return xml;
};

// services/vobizService.js

export const sendVobizCall = async (mobile, options = {}) => {
  try {
    const digits = String(mobile || '').replace(/\D/g, '').slice(-10);
    if (!/^[6-9]\d{9}$/.test(digits)) {
      return { success: false, error: 'Invalid Indian mobile number', provider: 'vobiz' };
    }

    const to = `+91${digits}`;
    const { authId, authToken, fromNumber, apiBase } = getVobizConfig();

    if (!authId || isPlaceholder(authId) || !authToken || isPlaceholder(authToken)) {
      return { success: false, error: 'Vobiz credentials are missing or invalid', provider: 'vobiz' };
    }
    if (!fromNumber || isPlaceholder(fromNumber)) {
      return { success: false, error: 'Set VOBIZ_FROM_NUMBER in backend/.env', provider: 'vobiz' };
    }

    const sayText =
      options.message ||
      buildMarathiEmiCallScript({
        name: options.name,
        amount: options.amount,
        dueDate: options.dueDate || new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      });

    const simulationMode =
      String(process.env.VOBIZ_SIMULATION_MODE || '').trim().toLowerCase() === 'true';

    if (simulationMode) {
      return {
        success: true,
        callId: `SIM_VOBIZ_CALL_${Date.now()}`,
        status: 'simulated',
        provider: 'vobiz',
        sayText,
        note: 'VOBIZ_SIMULATION_MODE=true — no actual call placed',
      };
    }

    const url = `${apiBase}/Account/${authId}/Call/`;
    
    // === FIX: Use answer_url instead of twiml ===
    // Vobiz requires answer_url when using XML applications
    const answerUrl = options.answerUrl || process.env.VOBIZ_DEFAULT_ANSWER_URL;
    
    const payload = {
      from: fromNumber,
      to: to,
      answer_url: answerUrl || 'https://prabhavi-small-finance-a3tw.onrender.com/api/vobiz/answer',  // Default answer URL
      answer_method: 'POST',
    };

    // Optional: If you have a specific application ID
    if (process.env.VOBIZ_APPLICATION_ID) {
      payload.application_id = process.env.VOBIZ_APPLICATION_ID;
    }

    console.log('[Vobiz] Request URL:', url);
    console.log('[Vobiz] Payload:', JSON.stringify(payload, null, 2));

    const response = await axios.post(url, payload, {
      headers: {
        'X-Auth-ID': authId,
        'X-Auth-Token': authToken,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    const callData = response.data;
    return {
      success: true,
      callId: callData?.data?.call_id || callData?.call_id || `VOBIZ_CALL_${Date.now()}`,
      status: callData?.data?.status || callData?.status || 'queued',
      provider: 'vobiz',
      to,
      from: fromNumber,
      sayText,
    };
  } catch (error) {
    console.error('[Vobiz] Full Error:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
    });

    let errorMessage = error.message || 'Vobiz API error';
    
    if (error.response?.data) {
      if (typeof error.response.data === 'string') {
        errorMessage = error.response.data;
      } else if (error.response.data.message) {
        errorMessage = error.response.data.message;
      } else if (error.response.data.error) {
        errorMessage = error.response.data.error;
      } else {
        errorMessage = JSON.stringify(error.response.data);
      }
    }

    return {
      success: false,
      error: errorMessage,
      provider: 'vobiz',
      code: error.response?.status || error.code,
      details: error.response?.data || null,
    };
  }
};

export const testVobizCall = sendVobizCall;

export default { sendVobizCall, testVobizCall };