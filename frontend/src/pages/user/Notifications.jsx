import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { notificationAPI } from '../../services';
import { formatDateTime } from '../../utils/helpers';
import Pagination from '../../components/Pagination';
import PageHeader from '../../components/PageHeader';
import { PageLoader } from '../../components/LoadingSpinner';
import { useNotifications } from '../../context/NotificationContext';

const typeColors = {
  info: 'border-l-blue-500',
  success: 'border-l-green-500',
  warning: 'border-l-yellow-500',
  error: 'border-l-red-500',
  loan: 'border-l-indigo-500',
  emi: 'border-l-purple-500',
  payment: 'border-l-green-500',
  system: 'border-l-slate-500',
};

const Notifications = () => {
  const { t } = useTranslation();
  const { setUnreadCount, refreshUnreadCount } = useNotifications();
  const [notifications, setNotifications] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await notificationAPI.getAll({ page, limit: 15 });
      const list = Array.isArray(res.data?.data) ? res.data.data : [];
      setNotifications(list);
      setMeta(res.data?.meta || null);
      setUnreadCount(Number(res.data?.meta?.unreadCount || 0));
    } catch {
      toast.error(t('ui.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleMarkRead = async (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await notificationAPI.markAsRead(id);
      await fetchNotifications();
      refreshUnreadCount();
    } catch {
      toast.error(t('error'));
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationAPI.markAllAsRead();
      toast.success(t('ui.allMarkedRead'));
      await fetchNotifications();
      setUnreadCount(0);
    } catch {
      toast.error(t('error'));
    }
  };

  const handleDelete = async (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await notificationAPI.delete(id);
      await fetchNotifications();
      refreshUnreadCount();
    } catch {
      toast.error(t('error'));
    }
  };

  const notifActions = (notif) => (
    <>
      {!notif.isRead && (
        <button
          type="button"
          onClick={(e) => handleMarkRead(e, notif._id)}
          className="action-chip text-xs text-accent-400"
        >
          {t('ui.markRead')}
        </button>
      )}
      <button
        type="button"
        onClick={(e) => handleDelete(e, notif._id)}
        className="action-chip text-xs text-red-500"
      >
        {t('delete')}
      </button>
    </>
  );

  const titleBlock = (notif, desktop) => (
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2">
        <h3 className={desktop ? 'text-sm font-semibold text-primary-900 dark:text-white' : 'mobile-list-title'}>
          {notif.title}
        </h3>
        {!notif.isRead && (
          <span className="inline-block h-2 w-2 rounded-full bg-red-500 shrink-0" aria-hidden="true" />
        )}
      </div>
      <p className={desktop ? 'mt-1 text-sm text-slate-600 dark:text-slate-300' : 'mobile-list-meta mt-1'}>
        {notif.message}
      </p>
      <p className="text-xs text-gray-400 mt-2">{formatDateTime(notif.createdAt)}</p>
    </div>
  );

  const renderMobileItem = (notif) => (
    <div
      key={notif._id}
      className={`mobile-list-item border-l-4 ${typeColors[notif.type] || 'border-l-gray-500'} ${!notif.isRead ? 'bg-primary-50/50 dark:bg-primary-900/10' : ''}`}
    >
      <div className="mobile-list-head flex-1 min-w-0">
        {notif.link ? (
          <Link to={notif.link} className="min-w-0 flex-1 block">
            {titleBlock(notif, false)}
          </Link>
        ) : (
          titleBlock(notif, false)
        )}
      </div>
      <div className="mobile-list-actions">{notifActions(notif)}</div>
    </div>
  );

  const renderDesktopItem = (notif) => (
    <div
      key={notif._id}
      className={`flex flex-col sm:flex-row sm:items-start gap-3 p-4 border-l-4 rounded-xl border border-[var(--border-card)] bg-[var(--bg-card)] ${typeColors[notif.type] || 'border-l-gray-500'} ${!notif.isRead ? 'bg-primary-50/50 dark:bg-primary-900/10' : ''}`}
    >
      {notif.link ? (
        <Link to={notif.link} className="min-w-0 flex-1 block hover:opacity-90">
          {titleBlock(notif, true)}
        </Link>
      ) : (
        titleBlock(notif, true)
      )}
      <div className="flex items-center gap-2 shrink-0">{notifActions(notif)}</div>
    </div>
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
        {notifications.map(renderMobileItem)}
        {!notifications.length && (
          <p className="py-8 text-center text-[12px] text-slate-500">{t('ui.noNotifications')}</p>
        )}
      </div>

      <div className="hidden md:flex flex-col gap-3">
        {notifications.map(renderDesktopItem)}
        {!notifications.length && (
          <p className="py-8 text-center text-sm text-slate-500">{t('ui.noNotifications')}</p>
        )}
      </div>

      <Pagination meta={meta} onPageChange={setPage} />
    </div>
  );
};

export default Notifications;
