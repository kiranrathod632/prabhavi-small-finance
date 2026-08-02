import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import adminPanelAPI from '../services/adminPanelAPI';
import { useAuth } from './AuthContext';
import { isAdminPanelRole } from '../utils/roles';

const AdminCountsContext = createContext(null);

export const AdminCountsProvider = ({ children }) => {
  const { user, role } = useAuth();
  const [pendingLoanCount, setPendingLoanCount] = useState(0);
  const [emiCollectionCount, setEmiCollectionCount] = useState(0);

  const refreshAdminCounts = useCallback(async () => {
    if (!user || !isAdminPanelRole(role)) {
      setPendingLoanCount(0);
      setEmiCollectionCount(0);
      return { pendingLoanCount: 0, emiCollectionCount: 0 };
    }

    try {
      const [pendingRes, reviewRes, collectionRes] = await Promise.all([
        adminPanelAPI.getLoans({ page: 1, limit: 1, status: 'pending' }),
        adminPanelAPI.getLoans({ page: 1, limit: 1, status: 'under_review' }),
        adminPanelAPI.getEMIs({ page: 1, limit: 1, status: 'pending_collection' }),
      ]);

      const loans =
        Number(pendingRes.data?.meta?.total || 0)
        + Number(reviewRes.data?.meta?.total || 0);
      const emis = Number(collectionRes.data?.meta?.total || 0);

      setPendingLoanCount(loans);
      setEmiCollectionCount(emis);
      return { pendingLoanCount: loans, emiCollectionCount: emis };
    } catch {
      return { pendingLoanCount: 0, emiCollectionCount: 0 };
    }
  }, [user, role]);

  useEffect(() => {
    if (!user || !isAdminPanelRole(role)) {
      setPendingLoanCount(0);
      setEmiCollectionCount(0);
      return undefined;
    }

    refreshAdminCounts();
    const onFocus = () => refreshAdminCounts();
    window.addEventListener('focus', onFocus);
    const timer = setInterval(refreshAdminCounts, 60000);
    return () => {
      window.removeEventListener('focus', onFocus);
      clearInterval(timer);
    };
  }, [user, role, refreshAdminCounts]);

  const value = useMemo(
    () => ({
      pendingLoanCount,
      emiCollectionCount,
      setPendingLoanCount,
      setEmiCollectionCount,
      refreshAdminCounts,
    }),
    [pendingLoanCount, emiCollectionCount, refreshAdminCounts]
  );

  return (
    <AdminCountsContext.Provider value={value}>
      {children}
    </AdminCountsContext.Provider>
  );
};

export const useAdminCounts = () => {
  const ctx = useContext(AdminCountsContext);
  if (!ctx) {
    return {
      pendingLoanCount: 0,
      emiCollectionCount: 0,
      setPendingLoanCount: () => {},
      setEmiCollectionCount: () => {},
      refreshAdminCounts: async () => ({ pendingLoanCount: 0, emiCollectionCount: 0 }),
    };
  }
  return ctx;
};

export default AdminCountsContext;
