import Fund from '../models/Fund.js';
import { asyncHandler, sendResponse, sendError } from '../utils/apiResponse.js';
import { createAuditLog } from '../services/auditService.js';

/**
 * @route   GET /api/funds
 */
export const getFunds = asyncHandler(async (req, res) => {
  let fund = await Fund.findOne();
  if (!fund) {
    fund = await Fund.create({
      companyFund: parseFloat(process.env.COMPANY_INITIAL_FUND) || 1000000,
      availableFund: parseFloat(process.env.COMPANY_INITIAL_FUND) || 1000000,
    });
  }
  sendResponse(res, 200, 'Fund details fetched', fund);
});

/**
 * @route   POST /api/funds
 */
export const updateFund = asyncHandler(async (req, res) => {
  const { amount, type, description } = req.body;

  let fund = await Fund.findOne();
  if (!fund) {
    fund = await Fund.create({
      companyFund: 0,
      availableFund: 0,
    });
  }

  switch (type) {
    case 'deposit':
      fund.companyFund += amount;
      fund.availableFund += amount;
      break;
    case 'withdrawal':
      if (fund.availableFund < amount) {
        return sendError(res, 400, 'Insufficient available funds');
      }
      fund.availableFund -= amount;
      break;
    case 'expense':
      if (fund.availableFund < amount) {
        return sendError(res, 400, 'Insufficient available funds');
      }
      fund.availableFund -= amount;
      fund.expenses += amount;
      break;
    default:
      return sendError(res, 400, 'Invalid fund operation type');
  }

  fund.history.push({ type, amount, description: description || `${type} of ₹${amount}` });
  fund.lastUpdated = new Date();
  await fund.save();

  await createAuditLog({
    user: req.user._id,
    action: `Fund ${type}: ₹${amount}`,
    entity: 'fund',
    entityId: fund._id,
    details: { type, amount, description },
    ipAddress: req.ip,
  });

  sendResponse(res, 200, `Fund ${type} successful`, fund);
});
