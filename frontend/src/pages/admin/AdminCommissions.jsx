import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import adminPanelAPI from '../../services/adminPanelAPI';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency, formatDate, getErrorMessage } from '../../utils/helpers';
import { PageLoader } from '../../components/LoadingSpinner';
import Badge from '../../components/Badge';
import Pagination from '../../components/Pagination';
import { ROLES } from '../../utils/roles';

/**
 * Admin Commission page:
 * - Shows commissions earned from users under this Admin (adminId chain)
 * - Admin can update their commission %
 */
const AdminCommissions = () => {
  const { t } = useTranslation();
  const { user, role, fetchUser } = useAuth();
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [rate, setRate] = useState(user?.commissionRate ?? 2);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await adminPanelAPI.getCommissions({ page, limit: 10 });
      const payload = res.data.data;
      setRows(payload.commissions || []);
      setSummary(payload.summary || null);
      setMeta(res.data.meta);
      if (user?.commissionRate != null) setRate(user.commissionRate);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [page]);

  const saveRate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await adminPanelAPI.updateCommissionRate({ commissionRate: Number(rate) });
      toast.success(t('commission.rateUpdated') || 'Commission rate updated');
      await fetchUser();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  if (loading && !rows.length) return <PageLoader />;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">{t('commission.title') || 'Commission'}</h1>
      <p className="text-gray-500 mb-6 text-sm">
        {t('commission.hint') || 'You earn commission on loans of users under your account.'}
      </p>

      {role === ROLES.ADMIN && (
        <form onSubmit={saveRate} className="card mb-6 flex flex-col sm:flex-row gap-3 items-end max-w-lg">
          <div className="flex-1 w-full">
            <label className="label">{t('ui.commission') || 'Commission %'}</label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              className="input"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
            />
          </div>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? t('loading') : t('save')}
          </button>
        </form>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="card">
          <p className="text-sm text-gray-500">{t('commission.totalEarned') || 'Total Commission'}</p>
          <p className="text-xl font-bold text-green-600">{formatCurrency(summary?.totalCommission)}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">{t('adminDash.loanDistributed')}</p>
          <p className="text-xl font-bold">{formatCurrency(summary?.totalLoanAmount)}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">{t('adminDash.totalLoans')}</p>
          <p className="text-xl font-bold">{summary?.count || 0}</p>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b dark:border-gray-700">
              <th className="text-left py-3 px-2">{t('table.user')}</th>
              <th className="text-left py-3 px-2">{t('table.loanId')}</th>
              <th className="text-right py-3 px-2">{t('table.amount')}</th>
              <th className="text-right py-3 px-2">%</th>
              <th className="text-right py-3 px-2">{t('ui.commission') || 'Commission'}</th>
              <th className="text-left py-3 px-2">{t('table.status')}</th>
              <th className="text-left py-3 px-2">{t('table.date')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c._id} className="border-b dark:border-gray-700/50">
                <td className="py-3 px-2">{c.user?.name}</td>
                <td className="py-3 px-2">{c.loan?.loanId}</td>
                <td className="py-3 px-2 text-right">{formatCurrency(c.loanAmount)}</td>
                <td className="py-3 px-2 text-right">{c.commissionPercentage}%</td>
                <td className="py-3 px-2 text-right font-medium text-green-600">{formatCurrency(c.commissionAmount)}</td>
                <td className="py-3 px-2"><Badge status={c.status} /></td>
                <td className="py-3 px-2">{formatDate(c.createdAt)}</td>
              </tr>
            ))}
            {!rows.length && (
              <tr><td colSpan={7} className="py-8 text-center text-gray-500">{t('noData')}</td></tr>
            )}
          </tbody>
        </table>
        <Pagination meta={meta} onPageChange={setPage} />
      </div>
    </div>
  );
};

export default AdminCommissions;
