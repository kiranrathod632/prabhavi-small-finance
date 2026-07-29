import Notification from '../models/Notification.js';
import { asyncHandler, sendResponse, sendError } from '../utils/apiResponse.js';
import { paginate, paginationMeta } from '../utils/helpers.js';

/**
 * @route   GET /api/notifications
 */
export const getNotifications = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query.page, req.query.limit);
  const filter = { user: req.user._id };
  if (req.query.unread === 'true') filter.isRead = false;

  const [notifications, total] = await Promise.all([
    Notification.find(filter).sort('-createdAt').skip(skip).limit(limit),
    Notification.countDocuments(filter),
  ]);

  const unreadCount = await Notification.countDocuments({ user: req.user._id, isRead: false });

  sendResponse(res, 200, 'Notifications fetched', notifications, {
    ...paginationMeta(total, page, limit),
    unreadCount,
  });
});

/**
 * @route   PUT /api/notifications/:id/read
 */
export const markAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { isRead: true },
    { new: true }
  );

  if (!notification) return sendError(res, 404, 'Notification not found');
  sendResponse(res, 200, 'Notification marked as read', notification);
});

/**
 * @route   PUT /api/notifications/read-all
 */
export const markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ user: req.user._id, isRead: false }, { isRead: true });
  sendResponse(res, 200, 'All notifications marked as read');
});

/**
 * @route   DELETE /api/notifications/:id
 */
export const deleteNotification = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndDelete({
    _id: req.params.id,
    user: req.user._id,
  });

  if (!notification) return sendError(res, 404, 'Notification not found');
  sendResponse(res, 200, 'Notification deleted');
});
