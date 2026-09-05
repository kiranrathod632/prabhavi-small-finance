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

      {/* <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
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
      </div> */}

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

      <div className="card">
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('table.srNo')}</th>
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
              {purchases.map((p, index) => (
                <tr key={p._id}>
                  <td className="text-slate-500">{((page || 1) - 1) * 10 + index + 1}</td>
                  {isSuperAdmin && <td className="font-medium">{adminName(p)}</td>}
                  <td className="font-medium">{p.itemName}</td>
                  <td className="text-right">{formatCurrency(p.amount)}</td>
                  <td className="whitespace-nowrap">{formatDate(p.purchaseDate)}</td>
                  <td><Badge status={p.status} /></td>
                  <td>
                    {p.billPhoto ? (
                      <a href={billUrl(p.billPhoto)} target="_blank" rel="noreferrer" className="link-accent inline-flex items-center gap-1">
                        <HiPhotograph className="w-4 h-4" /> View
                      </a>
                    ) : 'N/A'}
                  </td>
                  <td className="max-w-[180px] truncate">{p.description || 'N/A'}</td>
                  {isSuperAdmin && (
                    <td className="text-right">
                      {p.status === 'pending' ? (
                        <div className="table-actions flex !flex-row !flex-nowrap items-center gap-1 justify-end whitespace-nowrap">
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
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
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
          <form onSubmit={handleCreate} className="space-y-3.5 max-h-[70vh] overflow-y-auto px-0.5 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
  {/* Custom scrollbar styles - add to your CSS */}
  <style>{`
    .scrollbar-thin::-webkit-scrollbar {
      width: 4px;
    }
    .scrollbar-thin::-webkit-scrollbar-track {
      background: #f1f1f1;
      border-radius: 10px;
    }
    .scrollbar-thin::-webkit-scrollbar-thumb {
      background: #c1c1c1;
      border-radius: 10px;
    }
    .scrollbar-thin::-webkit-scrollbar-thumb:hover {
      background: #a8a8a8;
    }
  `}</style>

  {/* Item Name */}
  <div>
    <label className="block text-xs font-medium text-gray-700 mb-1">
      {t('adminPurchases.item') || 'What was purchased'}
      <span className="text-red-500 ml-0.5">*</span>
    </label>
    <div className="relative">
      <input
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-gray-50 hover:bg-white"
        value={form.itemName}
        onChange={(e) => setForm((f) => ({ ...f, itemName: e.target.value }))}
        placeholder="e.g. Office stationery"
        required
      />
    </div>
  </div>

  {/* Amount */}
  <div>
    <label className="block text-xs font-medium text-gray-700 mb-1">
      {t('table.amount')}
      <span className="text-red-500 ml-0.5">*</span>
    </label>
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-sm"></span>
      <input
        type="number"
        min="0.01"
        step="0.01"
        className="w-full px-3 py-2 pl-7 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-gray-50 hover:bg-white"
        value={form.amount}
        onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
        placeholder="0.00"
        required
      />
    </div>
  </div>

  {/* Purchase Date */}
  <div>
    <label className="block text-xs font-medium text-gray-700 mb-1">
      {t('adminPurchases.date') || 'Purchase date'}
      <span className="text-red-500 ml-0.5">*</span>
    </label>
    <input
      type="date"
      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-gray-50 hover:bg-white"
      value={form.purchaseDate}
      onChange={(e) => setForm((f) => ({ ...f, purchaseDate: e.target.value }))}
      required
    />
  </div>

  {/* Description */}
  <div>
    <label className="block text-xs font-medium text-gray-700 mb-1">
      {t('table.description')}
      <span className="text-gray-400 text-[10px] font-normal ml-1">(optional)</span>
    </label>
    <textarea
      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-gray-50 hover:bg-white min-h-[60px] resize-y"
      value={form.description}
      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
      placeholder="Optional details"
    />
  </div>

  {/* Bill Photo Upload */}
  <div>
    <label className="block text-xs font-medium text-gray-700 mb-1">
      {t('adminPurchases.billPhoto') || 'Bill photo'}
      <span className="text-gray-400 text-[10px] font-normal ml-1">(optional)</span>
    </label>
    <div className="relative border-2 border-dashed border-gray-200 rounded-lg hover:border-blue-400 transition-all bg-gray-50 hover:bg-blue-50/20 cursor-pointer">
      <input
        type="file"
        accept="image/*,.pdf"
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        onChange={(e) => setForm((f) => ({ ...f, billPhoto: e.target.files?.[0] || null }))}
      />
      <div className="flex items-center gap-3 py-2.5 px-3">
        <div className="flex-shrink-0">
          <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-600 truncate">
            {form.billPhoto ? form.billPhoto.name : 'Click to upload bill photo'}
          </p>
          {!form.billPhoto && (
            <p className="text-[10px] text-gray-400">JPG, PNG, PDF</p>
          )}
        </div>
        {form.billPhoto && (
          <span className="text-[10px] text-gray-400 whitespace-nowrap">
            {(form.billPhoto.size / 1024).toFixed(0)} KB
          </span>
        )}
      </div>
    </div>
  </div>

  {/* Info Note */}
  <div className="bg-blue-50/70 rounded-lg p-2.5 border border-blue-100/50">
    <div className="flex items-start gap-2">
      <span className="text-sm flex-shrink-0">💡</span>
      <p className="text-[11px] text-gray-600 leading-relaxed">
        {t('adminPurchases.pendingNote') || 'Amount is deducted from company fund only after Super Admin approval.'}
      </p>
    </div>
  </div>

  {/* Submit Button */}
  <button 
    type="submit" 
    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-2.5 rounded-lg font-medium text-sm shadow-md hover:shadow-lg transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
    disabled={submitting}
  >
    {submitting ? (
      <>
        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        {t('loading') || 'Submitting...'}
      </>
    ) : (
      t('adminPurchases.submit') || 'Submit for Approval'
    )}
  </button>
</form>
        </Modal>
      )}
    </div>
  );
};

export default AdminPurchases;
