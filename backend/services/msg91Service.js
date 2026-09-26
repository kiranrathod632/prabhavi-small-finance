// services/msg91Service.js — MSG91 SMS + Voice (same response shape as Twilio helpers)
// Does not alter API routes/responses. Used when SMS_PROVIDER/VOICE_PROVIDER=msg91.

import { buildMarathiEmiCallScript } from '../utils/emiCallScript.js';

const isPlaceholder = (value = '') =>
  !value ||
  /^your[_-]/i.test(value) ||
  /xxx|replace|changeme|example/i.test(value);

const env = (key) => String(process.env[key] || '').trim();

const getMsg91Config = () => ({
  authKey: env('MSG91_AUTH_KEY') || env('MSG91_AUTHKEY'),
  senderId: env('MSG91_SENDER_ID') || env('MSG91_SENDER') || 'PSFINC',
  countryCode: env('MSG91_COUNTRY_CODE') || '91',
  route: env('MSG91_ROUTE') || '4',
  flowId: env('MSG91_FLOW_ID') || env('MSG91_TEMPLATE_ID'),
  otpFlowId: env('MSG91_OTP_FLOW_ID') || env('MSG91_OTP_TEMPLATE_ID') || env('MSG91_FLOW_ID'),
  otpVar: env('MSG91_OTP_VAR') || 'OTP',
  // Voice — numeric caller ID / DID from MSG91 Voice panel
  callerId: String(env('MSG91_CALLER_ID') || env('MSG91_VOICE_FROM') || '').replace(/\D/g, ''),
  voiceTemplateId:
    env('MSG91_VOICE_TEMPLATE_ID') ||
    env('MSG91_VOICE_FLOW_ID') ||
    env('MSG91_VOICE_TEMPLATE'),
  voiceFlowId: env('MSG91_VOICE_IVR_FLOW_ID') || env('MSG91_IVR_FLOW_ID'),
});

const isSimulation = () =>
  String(env('MSG91_SIMULATION_MODE') || '').toLowerCase() === 'true';

const toIndiaMobile = (mobile) => {
  const digits = String(mobile || '').replace(/\D/g, '').slice(-10);
  if (!/^[6-9]\d{9}$/.test(digits)) return null;
  return digits;
};

const toMsg91Mobile = (digits10, countryCode = '91') => `${countryCode}${digits10}`;

/**
 * Send plain / transactional SMS via MSG91.
 * Prefers Flow API when flowId + variables provided; else v2 sendsms with message body.
 */
export const sendMsg91Sms = async ({ to, message, flowId, variables = {} } = {}) => {
  const digits = toIndiaMobile(to);
  if (!digits) {
    return { success: false, error: 'Invalid phone number', provider: 'msg91' };
  }

  const text = String(message || '').trim();
  const { authKey, senderId, countryCode, route, flowId: defaultFlowId } = getMsg91Config();
  const useFlowId = flowId || defaultFlowId;
  const mobiles = toMsg91Mobile(digits, countryCode);

  if (isSimulation()) {
    console.log(`[SIMULATION] MSG91 SMS → ${mobiles}: ${(text || JSON.stringify(variables)).substring(0, 80)}...`);
    return {
      success: true,
      messageId: `SIM_MSG91_${Date.now()}`,
      status: 'simulated',
      provider: 'msg91',
      note: 'MSG91_SIMULATION_MODE=true — no actual SMS sent',
    };
  }

  if (!authKey || isPlaceholder(authKey)) {
    return {
      success: false,
      error: 'Set MSG91_AUTH_KEY in backend/.env',
      provider: 'msg91',
    };
  }

  try {
    // 1) Flow / DLT template path (preferred in India)
    if (useFlowId && !isPlaceholder(useFlowId)) {
      const recipient = { mobiles, ...variables };
      if (text && !recipient.message && !recipient.MESSAGE) {
        recipient.message = text;
      }

      console.log(`[SMS] MSG91 flow → ${mobiles} flow=${useFlowId}`);
      const res = await fetch('https://control.msg91.com/api/v5/flow/', {
        method: 'POST',
        headers: {
          authkey: authKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          flow_id: useFlowId,
          template_id: useFlowId,
          short_url: '0',
          recipients: [recipient],
          ...(senderId ? { sender: senderId } : {}),
        }),
      });

      const data = await res.json().catch(() => ({}));
      const ok =
        res.ok &&
        (data.type === 'success' ||
          data.message === 'SMS submitted successfully' ||
          Boolean(data.request_id || data.messageId));

      if (ok) {
        return {
          success: true,
          messageId: data.request_id || data.messageId || `MSG91_${Date.now()}`,
          status: 'sent',
          provider: 'msg91',
          raw: data,
        };
      }

      // Fall through to v2 if flow fails with missing template — still return clear error if no message
      if (!text) {
        const err =
          data.message || data.msg || data.type || `MSG91 flow failed (HTTP ${res.status})`;
        return {
          success: false,
          error: typeof err === 'string' ? err : JSON.stringify(err),
          provider: 'msg91',
          code: data.code || res.status,
          raw: data,
        };
      }
      console.warn('[SMS] MSG91 flow failed, trying v2 sendsms:', data.message || data);
    }

    if (!text) {
      return {
        success: false,
        error: 'Message is required (or set MSG91_FLOW_ID with template variables)',
        provider: 'msg91',
      };
    }

    // 2) Classic v2 sendsms (plain text / testing)
    console.log(`[SMS] MSG91 v2 → ${mobiles} from ${senderId}`);
    const res = await fetch('https://api.msg91.com/api/v2/sendsms', {
      method: 'POST',
      headers: {
        authkey: authKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: senderId,
        route: String(route),
        country: String(countryCode),
        sms: [{ message: text, to: [mobiles] }],
      }),
    });

    const data = await res.json().catch(() => ({}));
    const ok =
      res.ok &&
      (data.type === 'success' ||
        data.message === 'SMS submitted successfully' ||
        Boolean(data.message || data.request_id));

    // MSG91 sometimes returns type=success with message string
    if (ok || (res.ok && data.type !== 'error')) {
      const looksError =
        data.type === 'error' ||
        /invalid|fail|error|denied/i.test(String(data.message || data.msg || ''));
      if (looksError) {
        return {
          success: false,
          error: data.message || data.msg || 'MSG91 send failed',
          provider: 'msg91',
          code: data.code || res.status,
          raw: data,
        };
      }
      return {
        success: true,
        messageId: data.request_id || data.message || `MSG91_${Date.now()}`,
        status: 'sent',
        provider: 'msg91',
        raw: data,
      };
    }

    return {
      success: false,
      error: data.message || data.msg || `MSG91 send failed (HTTP ${res.status})`,
      provider: 'msg91',
      code: data.code || res.status,
      raw: data,
    };
  } catch (error) {
    console.error('[SMS] MSG91 error:', error.message);
    return { success: false, error: error.message, provider: 'msg91' };
  }
};

/**
 * OTP SMS via MSG91 — uses OTP flow/template when configured.
 */
export const sendMsg91OtpSms = async (mobile, otp, purpose = 'verification') => {
  const { otpFlowId, otpVar } = getMsg91Config();
  const message =
    `Your FinanceLoan ${purpose.replace(/_/g, ' ')} OTP is ${otp}. Valid for 10 minutes. Do not share with anyone.`;

  if (otpFlowId && !isPlaceholder(otpFlowId)) {
    return sendMsg91Sms({
      to: mobile,
      message,
      flowId: otpFlowId,
      variables: {
        [otpVar]: String(otp),
        otp: String(otp),
        OTP: String(otp),
        purpose: String(purpose),
      },
    });
  }

  return sendMsg91Sms({ to: mobile, message });
};

/**
 * Test helper — purpose: custom | otp | emi
 */
export const testMsg91Sms = async (mobile, options = {}) => {
  const digits = toIndiaMobile(mobile);
  if (!digits) {
    return { success: false, error: 'Invalid Indian mobile number', provider: 'msg91' };
  }

  const purpose = String(options.purpose || 'custom').toLowerCase();

  if (purpose === 'otp') {
    const otp = options.otp || String(Math.floor(100000 + Math.random() * 900000));
    const result = await sendMsg91OtpSms(digits, otp, options.otpPurpose || 'verification');
    return {
      ...result,
      otp: process.env.NODE_ENV !== 'production' ? otp : undefined,
      purpose: 'otp',
    };
  }

  if (purpose === 'emi') {
    const amt = Math.round(Number(options.amount != null ? options.amount : 250) || 0);
    const due = options.dueDate || new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    const parsed = new Date(due);
    const dateEn = Number.isNaN(parsed.getTime()) ? String(due) : parsed.toLocaleDateString('en-IN');
    const message =
      options.message ||
      `नमस्कार! आपली EMI (${options.emiNumber || 'EMI-TEST'}) रक्कम रु.${amt} आहे. देय दिनांक: ${dateEn}. कृपया वेळेवर भरा. - प्रभावी स्मॉल फायनान्स`;
    return sendMsg91Sms({ to: digits, message });
  }

  const message =
    options.message ||
    'Prabhavi Small Finance MSG91 SMS test. If you received this, SMS is working.';
  return sendMsg91Sms({ to: digits, message });
};

const parseMsg91Response = async (res) => {
  const text = await res.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text };
  }
  return { data, text };
};

const isMsg91Ok = (res, data) => {
  if (!res.ok) return false;
  if (data?.hasError === true) return false;
  if (data?.status === 'fail' || data?.type === 'error') return false;
  const msg = String(data?.message || data?.msg || data?.errors || '');
  if (/invalid|fail|error|denied|unauthor|file not found/i.test(msg)) return false;
  return (
    data?.type === 'success' ||
    data?.status === 'success' ||
    Boolean(data?.request_id || data?.messageId || data?.call_id || data?.requestId || data?.data) ||
    (res.status === 200 && !msg)
  );
};

/**
 * Place outbound MSG91 voice call (EMI reminder / test).
 * Uses live Voice APIs only (no deprecated sendvoice.php).
 *
 * Required for India outbound:
 *   MSG91_CALLER_ID=91XXXXXXXXXX   (purchased DID from Voice panel)
 * Optional (spoken script / IVR):
 *   MSG91_VOICE_TEMPLATE_ID=...
 *   MSG91_VOICE_IVR_FLOW_ID=...
 */
export const sendMsg91Call = async (mobile, { name, amount, dueDate, message, emiNumber } = {}) => {
  const digits = toIndiaMobile(mobile);
  if (!digits) {
    return { success: false, error: 'Invalid phone number', provider: 'msg91' };
  }

  const { authKey, countryCode, callerId, voiceTemplateId, voiceFlowId } = getMsg91Config();
  const to = toMsg91Mobile(digits, countryCode);
  const sayText =
    message ||
    buildMarathiEmiCallScript({
      name,
      amount: amount != null ,
      dueDate: dueDate || new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    });

  const amt = Math.round(Number(amount != null ? amount : 250) || 0);
  const parsed = new Date(dueDate || Date.now() + 2 * 24 * 60 * 60 * 1000);
  const day = Number.isNaN(parsed.getTime()) ? '' : String(parsed.getDate());

  if (isSimulation()) {
    console.log(`[SIMULATION] MSG91 would call ${to}: ${sayText}`);
    return {
      success: true,
      callSid: `SIM_MSG91_CALL_${Date.now()}`,
      status: 'simulated',
      provider: 'msg91',
      sayText,
      note: 'MSG91_SIMULATION_MODE=true — no actual call placed',
    };
  }

  if (!authKey || isPlaceholder(authKey)) {
    return { success: false, error: 'Set MSG91_AUTH_KEY in backend/.env', provider: 'msg91' };
  }

  const headers = {
    authkey: authKey,
    Authkey: authKey,
    'Content-Type': 'application/json',
    accept: 'application/json',
  };

  const templateVars = {
    name: String(name || 'Customer'),
    amount: String(amt),
    due: day,
    dueDate: day,
    emi: String(emiNumber || ''),
    emiNumber: String(emiNumber || ''),
    message: sayText,
    VAR1: String(amt),
    VAR2: day,
    VAR3: String(name || 'Customer'),
  };

  const tryPost = async (url, body) => {
    const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
    const { data, text } = await parseMsg91Response(res);
    return { res, data, text, url };
  };

  try {
    // 1) Send Voice SMS / dial with template (plays approved voice template)
    if (voiceTemplateId && !isPlaceholder(voiceTemplateId)) {
      console.log(`[Voice] MSG91 template → ${to} template=${voiceTemplateId}`);
      const attempts = [
        {
          url: 'https://control.msg91.com/api/v5/voice/dial',
          body: {
            template_id: voiceTemplateId,
            recipients: [{ mobiles: to, ...templateVars }],
            ...(callerId ? { caller_id: callerId } : {}),
          },
        },
        {
          url: 'https://control.msg91.com/api/v5/voice/send',
          body: {
            template_id: voiceTemplateId,
            recipients: [{ mobiles: to, ...templateVars }],
            ...(callerId ? { caller_id: callerId } : {}),
          },
        },
        {
          url: 'https://control.msg91.com/api/v5/voice/sms',
          body: {
            template_id: voiceTemplateId,
            recipients: [{ mobiles: to, ...templateVars }],
            ...(callerId ? { caller_id: callerId } : {}),
          },
        },
      ];

      let lastFail = null;
      for (const attempt of attempts) {
        const result = await tryPost(attempt.url, attempt.body);
        if (isMsg91Ok(result.res, result.data)) {
          console.log(`[Voice] MSG91 accepted via ${attempt.url}:`, result.data);
          return {
            success: true,
            callSid:
              result.data.request_id ||
              result.data.call_id ||
              result.data.requestId ||
              `MSG91_${Date.now()}`,
            status: result.data.status || 'queued',
            provider: 'msg91',
            to,
            from: callerId || undefined,
            sayText,
            raw: result.data,
          };
        }
        lastFail = result;
        console.warn(`[Voice] MSG91 ${attempt.url}:`, result.data?.message || result.data?.errors || result.data);
      }

      return {
        success: false,
        error:
          lastFail?.data?.message ||
          lastFail?.data?.errors ||
          lastFail?.data?.msg ||
          'MSG91 voice template call failed. Recheck MSG91_VOICE_TEMPLATE_ID in Voice panel.',
        provider: 'msg91',
        code: lastFail?.res?.status,
        raw: lastFail?.data,
        sayText,
      };
    }

    // 2) Execute IVR / Flow
    if (voiceFlowId && !isPlaceholder(voiceFlowId)) {
      console.log(`[Voice] MSG91 IVR → ${to} flow=${voiceFlowId}`);
      const attempts = [
        {
          url: 'https://control.msg91.com/api/v5/voice/flow',
          body: {
            flow_id: voiceFlowId,
            destination: to,
            ...(callerId ? { caller_id: callerId } : {}),
            variables: templateVars,
          },
        },
        {
          url: 'https://control.msg91.com/api/v5/voice/execute',
          body: {
            flow_id: voiceFlowId,
            destination: to,
            ...(callerId ? { caller_id: callerId } : {}),
            variables: templateVars,
          },
        },
      ];

      let lastFail = null;
      for (const attempt of attempts) {
        const result = await tryPost(attempt.url, attempt.body);
        if (isMsg91Ok(result.res, result.data)) {
          return {
            success: true,
            callSid: result.data.request_id || result.data.call_id || `MSG91_${Date.now()}`,
            status: result.data.status || 'queued',
            provider: 'msg91',
            to,
            from: callerId || undefined,
            sayText,
            raw: result.data,
          };
        }
        lastFail = result;
      }

      return {
        success: false,
        error:
          lastFail?.data?.message ||
          lastFail?.data?.errors ||
          'MSG91 IVR flow failed. Check MSG91_VOICE_IVR_FLOW_ID.',
        provider: 'msg91',
        code: lastFail?.res?.status,
        raw: lastFail?.data,
        sayText,
      };
    }

    // 3) Click-to-call (requires purchased numeric DID)
    if (!callerId || callerId.length < 10) {
      return {
        success: false,
        error:
          'MSG91 voice needs MSG91_CALLER_ID (numeric DID from Voice panel). ' +
          'Optional for spoken EMI script: MSG91_VOICE_TEMPLATE_ID. ' +
          'Twilio-style free TTS is not supported by MSG91.',
        provider: 'msg91',
        sayText,
        hint: {
          steps: [
            'Login MSG91 → Voice → Numbers → buy/subscribe DID',
            'Set MSG91_CALLER_ID=91XXXXXXXXXX in backend/.env (no +)',
            'For EMI speech: Voice → Templates → create template → set MSG91_VOICE_TEMPLATE_ID',
            'Restart server and POST /api/msg91/test-call again',
          ],
        },
      };
    }

    console.log(`[Voice] MSG91 click-to-call → ${to} from ${callerId}`);
    const callAttempts = [
      {
        url: 'https://control.msg91.com/api/v5/voice/call',
        body: { caller_id: callerId, destination: to },
      },
      {
        url: 'https://api.msg91.com/api/v5/voice/call',
        body: { caller_id: callerId, destination: to },
      },
    ];

    let lastFail = null;
    for (const attempt of callAttempts) {
      const result = await tryPost(attempt.url, attempt.body);
      if (isMsg91Ok(result.res, result.data)) {
        return {
          success: true,
          callSid: result.data.request_id || result.data.call_id || `MSG91_${Date.now()}`,
          status: result.data.status || 'queued',
          provider: 'msg91',
          to,
          from: callerId,
          sayText,
          note: 'Click-to-call placed (ring only). Set MSG91_VOICE_TEMPLATE_ID for spoken EMI script.',
          raw: result.data,
        };
      }
      lastFail = result;
      console.warn(`[Voice] MSG91 ${attempt.url}:`, result.data);
    }

    return {
      success: false,
      error:
        lastFail?.data?.message ||
        lastFail?.data?.errors ||
        lastFail?.data?.msg ||
        'MSG91 click-to-call failed. Verify MSG91_CALLER_ID is an approved Voice DID.',
      provider: 'msg91',
      code: lastFail?.res?.status,
      raw: lastFail?.data,
      sayText,
    };
  } catch (error) {
    console.error('[Voice] MSG91 error:', error.message);
    return { success: false, error: error.message, provider: 'msg91' };
  }
};

export const sendMsg91EmiReminderCall = async (mobile, emiNumber, amount, dueDate, name) => {
  return sendMsg91Call(mobile, { emiNumber, amount, dueDate, name });
};

export const testMsg91Call = async (mobile, options = {}) => {
  const digits = toIndiaMobile(mobile);
  if (!digits) {
    return { success: false, error: 'Invalid Indian mobile number', provider: 'msg91' };
  }
  return sendMsg91Call(digits, {
    name: options.name || 'Test',
    amount: options.amount != null ? options.amount : 250,
    dueDate: options.dueDate || new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    message: options.message,
    emiNumber: options.emiNumber || 'EMI-TEST',
  });
};

export default {
  sendMsg91Sms,
  sendMsg91OtpSms,
  testMsg91Sms,
  sendMsg91Call,
  sendMsg91EmiReminderCall,
  testMsg91Call,
};
