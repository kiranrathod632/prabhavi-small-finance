import RecoveryCase from '../models/RecoveryCase.js';
import RecoveryNote from '../models/RecoveryNote.js';
import CallHistory from '../models/CallHistory.js';
import VisitHistory from '../models/VisitHistory.js';
import EMI from '../models/EMI.js';
import User from '../models/User.js';
import { asyncHandler, sendResponse, sendError } from '../utils/apiResponse.js';
import { paginate, paginationMeta } from '../utils/helpers.js';
import { createAuditLog } from '../services/auditService.js';

/**
 * @route   GET /api/recovery/dashboard
 */
export const getRecoveryDashboard = asyncHandler(async (req, res) => {
  const agentFilter = req.user.role === 'recovery_agent'
    ? { assignedTo: req.user._id, isDeleted: { $ne: true } }
    : { isDeleted: { $ne: true } };

  const [assigned, pending, overdue, recovered, totalPenalty] = await Promise.all([
    RecoveryCase.countDocuments(agentFilter),
    RecoveryCase.countDocuments({ ...agentFilter, status: 'pending' }),
    RecoveryCase.countDocuments({ ...agentFilter, status: { $in: ['pending', 'in_progress'] } }),
    RecoveryCase.countDocuments({ ...agentFilter, status: 'recovered' }),
    RecoveryCase.aggregate([
      { $match: agentFilter },
      { $group: { _id: null, total: { $sum: '$penaltyAmount' } } },
    ]),
  ]);

  const overdueEmis = await EMI.find({
    status: 'overdue',
    isDeleted: { $ne: true },
    ...(req.user.role === 'recovery_agent' ? { user: { $in: await getAssignedUserIds(req.user._id) } } : {}),
  }).populate('user', 'name mobile').populate('loan', 'loanId').limit(10);

  sendResponse(res, 200, 'Recovery dashboard', {
    cards: {
      assignedCustomers: assigned,
      pendingCases: pending,
      overdueCases: overdue,
      recoveredCases: recovered,
      totalPenalty: totalPenalty[0]?.total || 0,
    },
    overdueEmis,
  });
});

const getAssignedUserIds = async (agentId) => {
  const cases = await RecoveryCase.find({ assignedTo: agentId, isDeleted: { $ne: true } }).distinct('user');
  return cases;
};

/**
 * @route   GET /api/recovery/cases
 */
export const getRecoveryCases = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query.page, req.query.limit);
  const filter = { isDeleted: { $ne: true } };

  if (req.user.role === 'recovery_agent') filter.assignedTo = req.user._id;
  if (req.query.status) filter.status = req.query.status;
  if (req.query.assignedTo) filter.assignedTo = req.query.assignedTo;

  const [cases, total] = await Promise.all([
    RecoveryCase.find(filter)
      .populate('user', 'name mobile email')
      .populate('loan', 'loanId amount')
      .populate('assignedTo', 'name')
      .populate('emi', 'emiNumber amount dueDate')
      .sort('-createdAt')
      .skip(skip)
      .limit(limit),
    RecoveryCase.countDocuments(filter),
  ]);

  sendResponse(res, 200, 'Recovery cases', cases, paginationMeta(total, page, limit));
});

/**
 * @route   POST /api/recovery/cases
 */
export const createRecoveryCase = asyncHandler(async (req, res) => {
  const recoveryCase = await RecoveryCase.create({
    ...req.body,
    assignedBy: req.user._id,
  });

  if (req.body.assignedTo) {
    await User.findByIdAndUpdate(req.body.user, { assignedRecoveryAgent: req.body.assignedTo });
  }

  await createAuditLog({
    user: req.user._id,
    action: 'Recovery case created',
    entity: 'system',
    entityId: recoveryCase._id,
    ipAddress: req.ip,
  });

  sendResponse(res, 201, 'Recovery case created', recoveryCase);
});

/**
 * @route   PUT /api/recovery/cases/:id
 */
export const updateRecoveryCase = asyncHandler(async (req, res) => {
  const recoveryCase = await RecoveryCase.findOneAndUpdate(
    { _id: req.params.id, isDeleted: { $ne: true } },
    req.body,
    { new: true }
  );
  if (!recoveryCase) return sendError(res, 404, 'Recovery case not found');

  await createAuditLog({
    user: req.user._id,
    action: `Recovery case updated: ${recoveryCase.status}`,
    entity: 'system',
    entityId: recoveryCase._id,
    details: req.body,
    ipAddress: req.ip,
  });

  sendResponse(res, 200, 'Recovery case updated', recoveryCase);
});

/**
 * @route   POST /api/recovery/cases/:id/notes
 */
export const addRecoveryNote = asyncHandler(async (req, res) => {
  const recoveryCase = await RecoveryCase.findById(req.params.id);
  if (!recoveryCase) return sendError(res, 404, 'Recovery case not found');

  const note = await RecoveryNote.create({
    recoveryCase: recoveryCase._id,
    user: recoveryCase.user,
    loan: recoveryCase.loan,
    createdBy: req.user._id,
    note: req.body.note,
    type: req.body.type || 'general',
  });

  sendResponse(res, 201, 'Note added', note);
});

/**
 * @route   GET /api/recovery/cases/:id/notes
 */
export const getRecoveryNotes = asyncHandler(async (req, res) => {
  const notes = await RecoveryNote.find({
    recoveryCase: req.params.id,
    isDeleted: { $ne: true },
  }).populate('createdBy', 'name').sort('-createdAt');
  sendResponse(res, 200, 'Recovery notes', notes);
});

/**
 * @route   POST /api/recovery/calls
 */
export const logCall = asyncHandler(async (req, res) => {
  const call = await CallHistory.create({ ...req.body, calledBy: req.user._id });
  sendResponse(res, 201, 'Call logged', call);
});

/**
 * @route   GET /api/recovery/calls
 */
export const getCalls = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.recoveryCase) filter.recoveryCase = req.query.recoveryCase;
  if (req.query.user) filter.user = req.query.user;

  const calls = await CallHistory.find(filter)
    .populate('calledBy', 'name')
    .sort('-callDate');
  sendResponse(res, 200, 'Call history', calls);
});

/**
 * @route   POST /api/recovery/visits
 */
export const logVisit = asyncHandler(async (req, res) => {
  const visit = await VisitHistory.create({ ...req.body, visitedBy: req.user._id });
  sendResponse(res, 201, 'Visit logged', visit);
});

/**
 * @route   GET /api/recovery/visits
 */
export const getVisits = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.recoveryCase) filter.recoveryCase = req.query.recoveryCase;

  const visits = await VisitHistory.find(filter)
    .populate('visitedBy', 'name')
    .sort('-visitDate');
  sendResponse(res, 200, 'Visit history', visits);
});
