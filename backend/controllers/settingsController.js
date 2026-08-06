import InterestSettings from '../models/InterestSettings.js';
import { getSettings, clearSettingsCache } from '../services/settingsService.js';
import { previewEmiPlan } from '../services/loanService.js';
import { asyncHandler, sendResponse, sendError } from '../utils/apiResponse.js';
import { createAuditLog } from '../services/auditService.js';

/**
 * @route   GET /api/settings
 */
export const getInterestSettings = asyncHandler(async (req, res) => {
  const settings = await getSettings();
  sendResponse(res, 200, 'Settings fetched', settings);
});

/**
 * @route   PUT /api/settings
 */
export const updateInterestSettings = asyncHandler(async (req, res) => {
  let settings = await InterestSettings.findOne({ isActive: true });
  if (!settings) settings = await InterestSettings.create({});

  const allowedFields = [
    'interestType', 'interestRatePeriod', 'defaultInterestRate',
    'processingFeeType', 'processingFeeValue', 'processingFeePercent',
    'gstEnabled', 'gstPercent', 'latePaymentPenalty', 'dailyPenaltyRate',
    'penaltyEnabled', 'bounceCharge', 'prepaymentCharge', 'prepaymentChargePercent',
    'foreclosureCharge', 'foreclosureChargePercent', 'allowedTenures',
    'customTenureAllowed', 'minLoanAmount', 'maxLoanAmount', 'loanTypeRates',
    'adminCommissionRate',
  ];

  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) settings[field] = req.body[field];
  });

  settings.updatedBy = req.user._id;
  await settings.save();
  clearSettingsCache();

  await createAuditLog({
    user: req.user._id,
    action: 'Interest settings updated',
    entity: 'system',
    details: req.body,
    ipAddress: req.ip,
  });

  sendResponse(res, 200, 'Settings updated', settings);
});

/**
 * @route   POST /api/settings/calculate-emi
 */
export const calculateEmiPreview = asyncHandler(async (req, res) => {
  const { amount, tenure, loanType = 'personal' } = req.body;
  if (!amount || !tenure) return sendError(res, 400, 'Amount and tenure are required');

  const plan = await previewEmiPlan(parseFloat(amount), parseInt(tenure), loanType);
  sendResponse(res, 200, 'EMI calculated', plan);
});
