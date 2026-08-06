import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { HiLockClosed, HiLockOpen } from 'react-icons/hi';
import adminPanelAPI from '../../services/adminPanelAPI';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency, formatDate, getErrorMessage } from '../../utils/helpers';
import { PageLoader } from '../../components/LoadingSpinner';
import Badge from '../../components/Badge';
import Pagination from '../../components/Pagination';
import PageHeader from '../../components/PageHeader';
import { ROLES } from '../../utils/roles';

/**
 * Commission page:
 * - Super Admin sets global % (locks after save; unlock to edit again)
 * - Super Admin sees per-admin total commission earned
 * - Admin only views commissions earned on approved loans under them
 */
const AdminCommissions = () => {
  const { t } = useTranslation();
  const { role } = useAuth();
  const isSuperAdmin = role === ROLES.SUPER_ADMIN;
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [adminTotals, setAdminTotals] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [rate, setRate] = useState(2);
  const [locked, setLocked] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await adminPanelAPI.getCommissions({ page, limit: 10 });
      const payload = res.data.data;
      setRows(payload.commissions || []);
      setSummary(payload.summary || null);
      setAdminTotals(payload.adminTotals || []);
      setMeta(res.data.meta);
      if (payload.commissionRate != null) setRate(payload.commissionRate);
      setLocked(!!payload.commissionRateLocked);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [page]);

  const saveRate = async (e) => {
    e.preventDefault();
    if (!isSuperAdmin || locked) return;
    setSaving(true);
    try {
      const res = await adminPanelAPI.updateCommissionRate({ commissionRate: Number(rate) });
      setLocked(!!res.data?.data?.commissionRateLocked);
      toast.success(t('commission.rateUpdated') || 'Commission rate updated');
      await fetchData();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const unlockRate = async () => {
    if (!isSuperAdmin) return;
    setSaving(true);
    try {
      await adminPanelAPI.updateCommissionRate({ unlock: true });
      setLocked(false);
      toast.success(t('commission.rateUnlocked') || 'Commission rate unlocked');
      await fetchData();
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
        subtitle={
          isSuperAdmin
            ? (t('commission.superHint') || 'Set commission % for Admins. They earn it when loans of their users are approved.')
            : (t('commission.hint') || 'You earn commission on loans of users under your account.')
        }
      />

      {isSuperAdmin ? (
        <form onSubmit={saveRate} className="card flex flex-col sm:flex-row gap-3 items-end max-w-xl">
          <div className="flex-1 w-full">
            <label className="label flex items-center gap-1.5">
              {t('ui.commission') || 'Commission %'}
              {locked ? (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-amber-600">
                  <HiLockClosed className="w-3 h-3" />
                  {t('commission.locked') || 'Locked'}
                </span>
              ) : (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-600">
                  <HiLockOpen className="w-3 h-3" />
                  {t('commission.unlocked') || 'Unlocked'}
                </span>
              )}
            </label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              className="input"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              disabled={locked || saving}
              required
            />
            <p className="mt-1 text-[11px] text-slate-500">
              {locked
                ? (t('commission.lockedHint') || 'Rate is locked after save. Unlock to change it again.')
                : (t('commission.applyAllHint') || 'Applies to all Admins. Saves and locks automatically.')}
            </p>
          </div>
          {locked ? (
            <button type="button" onClick={unlockRate} disabled={saving} className="btn-secondary shrink-0">
              {saving ? t('loading') : (t('commission.unlock') || 'Unlock')}
            </button>
          ) : (
            <button type="submit" disabled={saving} className="btn-primary shrink-0">
              {saving ? t('loading') : t('save')}
            </button>
          )}
        </form>
      ) : (
        <div className="card max-w-sm">
          <p className="text-sm text-gray-500">{t('ui.commission') || 'Commission %'}</p>
          <p className="text-xl font-bold text-violet-600">{rate}%</p>
          <p className="mt-1 text-[11px] text-slate-500">
            {t('commission.adminRateHint') || 'Set by Super Admin. You earn this on approved loans of your users.'}
          </p>
        </div>
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

      {/* Per-admin totals */}
      {isSuperAdmin && (
        <div className="card">
          <h3 className="text-sm font-semibold mb-3">
            {t('commission.byAdmin') || 'Commission by Admin'}
          </h3>
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('table.srNo')}</th>
                  <th>{t('table.admin') || 'Admin'}</th>
                  <th>{t('table.email')}</th>
                  <th className="text-right">%</th>
                  <th className="text-right">{t('adminDash.totalLoans')}</th>
                  <th className="text-right">{t('adminDash.loanDistributed')}</th>
                  <th className="text-right">{t('commission.totalEarned') || 'Total Commission'}</th>
                </tr>
              </thead>
              <tbody>
                {adminTotals.map((row, index) => (
                  <tr key={row.adminId || index}>
                    <td className="text-slate-500">{index + 1}</td>
                    <td className="font-medium">{row.name}</td>
                    <td>{row.email || '-'}</td>
                    <td className="text-right">{row.commissionRate}%</td>
                    <td className="text-right">{row.count}</td>
                    <td className="text-right">{formatCurrency(row.totalLoanAmount)}</td>
                    <td className="text-right font-semibold text-green-600">
                      {formatCurrency(row.totalCommission)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!adminTotals.length && (
            <p className="p-4 text-center text-slate-500 text-sm">{t('noData')}</p>
          )}
        </div>
      )}

      <div className="card">
        <h3 className="text-sm font-semibold mb-3">
          {t('commission.details') || 'Commission Details'}
        </h3>
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('table.srNo')}</th>
                {isSuperAdmin && <th>{t('table.admin') || 'Admin'}</th>}
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
                  {isSuperAdmin && <td>{c.admin?.name || 'N/A'}</td>}
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
