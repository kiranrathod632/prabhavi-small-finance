import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { notificationAPI } from '../../services';
import { formatDateTime } from '../../utils/helpers';
import Pagination from '../../components/Pagination';
import { PageLoader } from '../../components/LoadingSpinner';

const Notifications = () => {
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await notificationAPI.getAll({ page, limit: 15 });
      setNotifications(res.data.data);
      setMeta(res.data.meta);
    } catch {
      toast.error(t('ui.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchNotifications(); }, [page]);

  const handleMarkRead = async (id) => {
    try {
      await notificationAPI.markAsRead(id);
      fetchNotifications();
    } catch {
      toast.error(t('error'));
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationAPI.markAllAsRead();
      toast.success(t('ui.allMarkedRead'));
      fetchNotifications();
    } catch {
      toast.error(t('error'));
    }
  };

  const handleDelete = async (id) => {
    try {
      await notificationAPI.delete(id);
      fetchNotifications();
    } catch {
      toast.error(t('error'));
    }
  };

  const typeColors = {
    info: 'border-l-blue-500',
    success: 'border-l-green-500',
    warning: 'border-l-yellow-500',
    error: 'border-l-red-500',
    loan: 'border-l-indigo-500',
    emi: 'border-l-purple-500',
    payment: 'border-l-green-500',
  };

  if (loading && !notifications.length) return <PageLoader />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t('notifications')}</h1>
        {meta?.unreadCount > 0 && (
          <button onClick={handleMarkAllRead} className="btn-secondary text-sm">{t('ui.markAllRead')}</button>
        )}
      </div>

      <div className="space-y-3">
        {notifications.map((notif) => (
          <div
            key={notif._id}
            className={`card border-l-4 ${typeColors[notif.type] || 'border-l-gray-500'} ${!notif.isRead ? 'bg-primary-50/50 dark:bg-primary-900/10' : ''}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h3 className="font-medium">{notif.title}</h3>
                <p className="text-sm text-gray-500 mt-1">{notif.message}</p>
                <p className="text-xs text-gray-400 mt-2">{formatDateTime(notif.createdAt)}</p>
              </div>
              <div className="flex gap-2">
                {!notif.isRead && (
                  <button onClick={() => handleMarkRead(notif._id)} className="text-xs text-primary-600 hover:underline">{t('ui.markRead')}</button>
                )}
                <button onClick={() => handleDelete(notif._id)} className="text-xs text-red-500 hover:underline">{t('delete')}</button>
              </div>
            </div>
          </div>
        ))}
        {!notifications.length && (
          <div className="card text-center py-12 text-gray-500">{t('ui.noNotifications')}</div>
        )}
      </div>

      <Pagination meta={meta} onPageChange={setPage} />
    </div>
  );
};

export default Notifications;
