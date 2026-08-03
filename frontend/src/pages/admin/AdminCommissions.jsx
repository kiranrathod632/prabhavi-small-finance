import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import adminPanelAPI from '../../services/adminPanelAPI';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency, formatDate, getErrorMessage } from '../../utils/helpers';
import { PageLoader } from '../../components/LoadingSpinner';
import Badge from '../../components/Badge';
import Pagination from '../../components/Pagination';
import PageHeader from '../../components/PageHeader';
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
    <div className="page-stack">
      <PageHeader
        title={t('commission.title') || 'Commission'}
        subtitle={t('commission.hint') || 'You earn commission on loans of users under your account.'}
      />

      {role === ROLES.ADMIN && (
        <form onSubmit={saveRate} className="card flex flex-col sm:flex-row gap-3 items-end max-w-lg">
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

      <div className="card">
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('table.srNo')}</th>
                <th>{t('table.user')}</th>
                <th>{t('table.loanId')}</th>
                <th className="text-right">{t('table.amount')}</th>
                <th className="text-right">%</th>
                <th className="text-right">{t('ui.commission') || 'Commission'}</th>
                <th>{t('table.status')}</th>
                <th>{t('table.date')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c, index) => (
                <tr key={c._id}>
                  <td className="text-slate-500">{((page || 1) - 1) * 10 + index + 1}</td>
                  <td>{c.user?.name || 'N/A'}</td>
                  <td>{c.loan?.loanId || 'N/A'}</td>
                  <td className="text-right">{formatCurrency(c.loanAmount)}</td>
                  <td className="text-right">{c.commissionPercentage}%</td>
                  <td className="text-right font-medium text-green-600">{formatCurrency(c.commissionAmount)}</td>
                  <td><Badge status={c.status} /></td>
                  <td className="whitespace-nowrap">{formatDate(c.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length && (
          <p className="p-4 text-center text-slate-500 text-sm">{t('noData')}</p>
        )}
      </div>

      <Pagination meta={meta} onPageChange={setPage} />
    </div>
  );
};

export default AdminCommissions;
