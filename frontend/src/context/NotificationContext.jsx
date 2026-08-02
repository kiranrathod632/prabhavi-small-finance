import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { notificationAPI } from '../services';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnreadCount = useCallback(async () => {
    if (!user) {
      setUnreadCount(0);
      return 0;
    }
    try {
      const res = await notificationAPI.getAll({ page: 1, limit: 1 });
      const count = Number(res.data?.meta?.unreadCount || 0);
      setUnreadCount(count);
      return count;
    } catch {
      return 0;
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return undefined;
    }

    refreshUnreadCount();
    const onFocus = () => refreshUnreadCount();
    window.addEventListener('focus', onFocus);
    const timer = setInterval(refreshUnreadCount, 60000);
    return () => {
      window.removeEventListener('focus', onFocus);
      clearInterval(timer);
    };
  }, [user, refreshUnreadCount]);

  const value = useMemo(
    () => ({
      unreadCount,
      setUnreadCount,
      refreshUnreadCount,
    }),
    [unreadCount, refreshUnreadCount]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    return {
      unreadCount: 0,
      setUnreadCount: () => {},
      refreshUnreadCount: async () => 0,
    };
  }
  return ctx;
};

export default NotificationContext;
