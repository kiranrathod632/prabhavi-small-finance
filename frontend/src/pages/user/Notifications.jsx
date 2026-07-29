import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { notificationAPI } from '../../services';
import { formatDateTime } from '../../utils/helpers';
import Pagination from '../../components/Pagination';
import PageHeader from '../../components/PageHeader';
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

  const notifActions = (notif) => (
    <>
      {!notif.isRead && (
        <button type="button" onClick={() => handleMarkRead(notif._id)} className="action-chip text-xs text-accent-400">
          {t('ui.markRead')}
        </button>
      )}
      <button type="button" onClick={() => handleDelete(notif._id)} className="action-chip text-xs text-red-500">
        {t('delete')}
      </button>
    </>
  );

  if (loading && !notifications.length) return <PageLoader />;

  return (
    <div className="page-stack">
      <PageHeader
        title={t('notifications')}
        actions={
          meta?.unreadCount > 0 ? (
            <button type="button" onClick={handleMarkAllRead} className="btn-secondary action-chip">
              {t('ui.markAllRead')}
            </button>
          ) : null
        }
      />

      <div className="mobile-list">
        {notifications.map((notif) => (
          <div
            key={notif._id}
            className={`mobile-list-item border-l-4 ${typeColors[notif.type] || 'border-l-gray-500'} ${!notif.isRead ? 'bg-primary-50/50 dark:bg-primary-900/10' : ''}`}
          >
            <div className="mobile-list-head">
              <div className="min-w-0 flex-1">
                <h3 className="mobile-list-title">{notif.title}</h3>
                <p className="mobile-list-meta mt-1">{notif.message}</p>
                <p className="text-xs text-gray-400 mt-2">{formatDateTime(notif.createdAt)}</p>
              </div>
            </div>
            <div className="mobile-list-actions">{notifActions(notif)}</div>
          </div>
        ))}
        {!notifications.length && (
          <p className="py-8 text-center text-[12px] text-slate-500">{t('ui.noNotifications')}</p>
        )}
      </div>

      <Pagination meta={meta} onPageChange={setPage} />
    </div>
  );
};

export default Notifications;
