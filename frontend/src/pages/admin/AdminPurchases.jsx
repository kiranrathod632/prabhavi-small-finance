import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { HiPlus, HiCheck, HiX, HiPhotograph } from 'react-icons/hi';
import { useAuth } from '../../context/AuthContext';
import adminPanelAPI from '../../services/adminPanelAPI';
import { formatCurrency, formatDate, getErrorMessage } from '../../utils/helpers';
import { ROLES } from '../../utils/roles';
import PageHeader from '../../components/PageHeader';
import Pagination from '../../components/Pagination';
import Modal from '../../components/Modal';
import Badge from '../../components/Badge';
import StatCard from '../../components/StatCard';
import { PageLoader } from '../../components/LoadingSpinner';

const AdminPurchases = () => {
  const { t } = useTranslation();
  const { role } = useAuth();
  const isSuperAdmin = role === ROLES.SUPER_ADMIN;

  const [purchases, setPurchases] = useState([]);
  const [summary, setSummary] = useState(null);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionId, setActionId] = useState('');
  const [form, setForm] = useState({
    itemName: '',
    description: '',
    amount: '',
    purchaseDate: new Date().toISOString().slice(0, 10),
    billPhoto: null,
  });

  const fetchPurchases = async () => {
    setLoading(true);
    try {
      const res = await adminPanelAPI.getPurchases({ page, limit: 10, status });
      const payload = res.data.data;
      setPurchases(payload?.purchases || []);
      setSummary(payload?.summary || null);
      setMeta(res.data.meta || null);
    } catch (error) {
      toast.error(getErrorMessage(error) || t('error'));
      setPurchases([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchases();
  }, [page, status]);

  const openCreate = () => {
    setForm({
      itemName: '',
      description: '',
      amount: '',
      purchaseDate: new Date().toISOString().slice(0, 10),
      billPhoto: null,
    });
    setShowModal(true);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (isSuperAdmin) return;
    if (!form.itemName.trim() || !form.amount || Number(form.amount) <= 0) {
      toast.error(t('adminPurchases.validRequired') || 'Item name and valid amount required');
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('itemName', form.itemName.trim());
      fd.append('description', form.description.trim());
      fd.append('amount', form.amount);
      fd.append('purchaseDate', form.purchaseDate);
      if (form.billPhoto) fd.append('billPhoto', form.billPhoto);
      await adminPanelAPI.createPurchase(fd);
      toast.success(t('adminPurchases.submitted') || 'Purchase submitted for approval');
      setShowModal(false);
      fetchPurchases();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (id) => {
    setActionId(`${id}-approve`);
    try {
      await adminPanelAPI.approvePurchase(id);
      toast.success(t('adminPurchases.approved') || 'Approved — amount deducted from fund');
      fetchPurchases();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setActionId('');
    }
  };

  const handleReject = async (id) => {
    setActionId(`${id}-reject`);
    try {
      await adminPanelAPI.rejectPurchase(id);
      toast.success(t('adminPurchases.rejected') || 'Purchase rejected');
      fetchPurchases();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setActionId('');
    }
  };

  const billUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return path;
  };

  const adminName = (p) => p.requestedBy?.name || p.requestedBy?.email || '-';

  if (loading && !purchases.length) return <PageLoader />;

  return (
    <div className="page-stack">
      <PageHeader
        title={t('adminPurchases.title') || 'Purchases / Expenses'}
        subtitle={
          isSuperAdmin
            ? (t('adminPurchases.superHint') || 'Approve admin purchases. Fund deducts only after approval.')
            : (t('adminPurchases.adminHint') || 'Add what you purchased with bill photo. Super Admin must approve.')
        }
        actions={
          !isSuperAdmin ? (
            <button type="button" onClick={openCreate} className="btn-primary">
              <HiPlus className="w-3.5 h-3.5 mr-1" />
              {t('adminPurchases.add') || 'Add Purchase'}
            </button>
          ) : null
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <StatCard
          title={t('adminPurchases.totalExpenses') || 'Approved Expenses'}
          value={formatCurrency(summary?.approvedTotal || 0)}
          color="red"
        />
        <StatCard
          title={t('adminPurchases.approvedCount') || 'Approved Count'}
          value={summary?.approvedCount || 0}
          color="green"
        />
        <StatCard
          title={t('adminPurchases.pendingAmount') || 'Pending Amount'}
          value={formatCurrency(summary?.pendingTotal || 0)}
          color="yellow"
        />
        <StatCard
          title={t('adminPurchases.pendingCount') || 'Pending Requests'}
          value={summary?.pendingCount || 0}
          color="primary"
        />
      </div>

      <div className="filter-bar">
        <select
          className="input"
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
        >
          <option value="">{t('ui.allStatus') || 'All Status'}</option>
          <option value="pending">{t('statusLabel.pending') || 'Pending'}</option>
          <option value="approved">{t('statusLabel.approved') || 'Approved'}</option>
          <option value="rejected">{t('statusLabel.rejected') || 'Rejected'}</option>
        </select>
      </div>

      <div className="mobile-list">
        {purchases.map((p) => (
          <div key={p._id} className="mobile-list-item">
            <div className="mobile-list-head">
              <div className="min-w-0">
                {isSuperAdmin ? (
                  <>
                    <p className="mobile-list-title">{adminName(p)}</p>
                    <p className="mobile-list-meta">{p.itemName}</p>
                  </>
                ) : (
                  <>
                    <p className="mobile-list-title">{p.itemName}</p>
                    {p.description ? <p className="mobile-list-meta">{p.description}</p> : null}
                  </>
                )}
              </div>
              <Badge status={p.status} />
            </div>
            <div className="mobile-list-grid">
              {isSuperAdmin && (
                <div className="mobile-list-field col-span-2">
                  <label>{t('adminPurchases.item') || 'Item'}</label>
                  <span>{p.itemName}</span>
                </div>
              )}
              <div className="mobile-list-field">
                <label>{t('table.amount')}</label>
                <span>{formatCurrency(p.amount)}</span>
              </div>
              <div className="mobile-list-field">
                <label>{t('adminPurchases.date') || 'Date'}</label>
                <span>{formatDate(p.purchaseDate)}</span>
              </div>
              {p.description && (
                <div className="mobile-list-field col-span-2">
                  <label>{t('table.description')}</label>
                  <span>{p.description}</span>
                </div>
              )}
              {p.billPhoto && (
                <div className="mobile-list-field col-span-2">
                  <label>{t('adminPurchases.bill') || 'Bill'}</label>
                  <a href={billUrl(p.billPhoto)} target="_blank" rel="noreferrer" className="link-accent">
                    View
                  </a>
                </div>
              )}
            </div>
            {isSuperAdmin && p.status === 'pending' && (
              <div className="mobile-list-actions">
                <button
                  type="button"
                  className="btn-success action-chip"
                  disabled={!!actionId}
                  onClick={() => handleApprove(p._id)}
                >
                  <HiCheck className="w-3 h-3" /> {t('loan.approve') || 'Approve'}
                </button>
                <button
                  type="button"
                  className="btn-danger action-chip"
                  disabled={!!actionId}
                  onClick={() => handleReject(p._id)}
                >
                  <HiX className="w-3 h-3" /> {t('loan.reject') || 'Reject'}
                </button>
              </div>
            )}
          </div>
        ))}
        {!purchases.length && (
          <p className="py-6 text-center text-[11px] text-slate-500">{t('noData')}</p>
        )}
      </div>

      <div className="card desktop-table">
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                {isSuperAdmin && <th>{t('ui.admin') || 'Admin'}</th>}
                <th>{t('adminPurchases.item') || 'Item'}</th>
                <th className="text-right">{t('table.amount')}</th>
                <th>{t('adminPurchases.date') || 'Date'}</th>
                <th>{t('table.status')}</th>
                <th>{t('adminPurchases.bill') || 'Bill'}</th>
                <th>{t('table.description')}</th>
                {isSuperAdmin && <th className="text-right">{t('table.actions')}</th>}
              </tr>
            </thead>
            <tbody>
              {purchases.map((p) => (
                <tr key={p._id}>
                  {isSuperAdmin && <td className="font-medium">{adminName(p)}</td>}
                  <td className="font-medium">{p.itemName}</td>
                  <td className="text-right">{formatCurrency(p.amount)}</td>
                  <td>{formatDate(p.purchaseDate)}</td>
                  <td><Badge status={p.status} /></td>
                  <td>
                    {p.billPhoto ? (
                      <a href={billUrl(p.billPhoto)} target="_blank" rel="noreferrer" className="link-accent inline-flex items-center gap-1">
                        <HiPhotograph className="w-4 h-4" /> View
                      </a>
                    ) : '-'}
                  </td>
                  <td className="max-w-[180px] truncate">{p.description || '-'}</td>
                  {isSuperAdmin && (
                    <td className="text-right">
                      {p.status === 'pending' ? (
                        <div className="inline-flex gap-1">
                          <button
                            type="button"
                            className="btn-success action-chip"
                            disabled={!!actionId}
                            onClick={() => handleApprove(p._id)}
                          >
                            {t('loan.approve') || 'Approve'}
                          </button>
                          <button
                            type="button"
                            className="btn-danger action-chip"
                            disabled={!!actionId}
                            onClick={() => handleReject(p._id)}
                          >
                            {t('loan.reject') || 'Reject'}
                          </button>
                        </div>
                      ) : '-'}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!purchases.length && (
          <p className="p-4 text-center text-slate-500 text-sm">{t('noData')}</p>
        )}
      </div>

      <Pagination meta={meta} onPageChange={setPage} />

      {!isSuperAdmin && (
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title={t('adminPurchases.add') || 'Add Purchase'}
        >
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <label className="label">{t('adminPurchases.item') || 'What was purchased'}</label>
              <input
                className="input"
                value={form.itemName}
                onChange={(e) => setForm((f) => ({ ...f, itemName: e.target.value }))}
                placeholder="e.g. Office stationery"
                required
              />
            </div>
            <div>
              <label className="label">{t('table.amount')}</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                className="input"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="label">{t('adminPurchases.date') || 'Purchase date'}</label>
              <input
                type="date"
                className="input"
                value={form.purchaseDate}
                onChange={(e) => setForm((f) => ({ ...f, purchaseDate: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="label">{t('table.description')}</label>
              <textarea
                className="input min-h-[72px]"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Optional details"
              />
            </div>
            <div>
              <label className="label">{t('adminPurchases.billPhoto') || 'Bill photo'}</label>
              <input
                type="file"
                accept="image/*,.pdf"
                className="input"
                onChange={(e) => setForm((f) => ({ ...f, billPhoto: e.target.files?.[0] || null }))}
              />
            </div>
            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              {t('adminPurchases.pendingNote') || 'Amount is deducted from company fund only after Super Admin approval.'}
            </p>
            <button type="submit" className="btn-primary w-full" disabled={submitting}>
              {submitting ? (t('loading') || 'Submitting...') : (t('adminPurchases.submit') || 'Submit for Approval')}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default AdminPurchases;
