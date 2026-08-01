import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { loanAPI } from '../../services';
import { formatCurrency, formatDate, getErrorMessage, loanTypes } from '../../utils/helpers';
import Badge from '../../components/Badge';
import SearchBar from '../../components/SearchBar';
import Pagination from '../../components/Pagination';
import Modal from '../../components/Modal';
import PageHeader from '../../components/PageHeader';
import { PageLoader } from '../../components/LoadingSpinner';
import { HiPlus, HiDownload } from 'react-icons/hi';

const LOAN_TYPE_KEYS = {
  personal: 'ui.personal',
  home: 'ui.homeLoan',
  business: 'ui.business',
  education: 'ui.education',
  vehicle: 'ui.vehicle',
};

const Loans = () => {
  const { t } = useTranslation();
  const [loans, setLoans] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [showApply, setShowApply] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const fetchLoans = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const res = await loanAPI.getAll({ page, limit: 10, search, status });
      setLoans(res.data.data);
      setMeta(res.data.meta);
    } catch {
      if (!silent) toast.error(t('ui.loadFailed'));
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => { fetchLoans(); }, [page, search, status]);

  const onApply = async (data) => {
    try {
      await loanAPI.create(data);
      toast.success(t('ui.loanSubmitted'));
      setShowApply(false);
      reset();
      fetchLoans();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleDownload = async (id, loanId) => {
    try {
      const res = await loanAPI.downloadStatement(id);
      const url = window.URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `loan-statement-${loanId}.pdf`;
      a.click();
    } catch {
      toast.error(t('ui.downloadFailed'));
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      fetchLoans({ silent: true });
    }, 30000);

    return () => clearInterval(interval);
  }, [page, search, status]);

  if (loading && !loans.length) return <PageLoader />;

  const statusOptions = ['pending', 'under_review', 'approved', 'active', 'closed', 'rejected'];

  const loanActions = (loan) => (
    <>
      {loan.status === 'approved' && !loan.tenure && (
        <Link to={`/loans/${loan._id}`} className="btn-primary action-chip">
          {t('ui.selectTenure')}
        </Link>
      )}
      {['active', 'closed'].includes(loan.status) && (
        <button
          type="button"
          onClick={() => handleDownload(loan._id, loan.loanId)}
          className="text-accent-400 p-1"
          title={t('ui.downloadStatement')}
        >
          <HiDownload className="w-4 h-4" />
        </button>
      )}
    </>
  );

  return (
    <div className="page-stack">
      <PageHeader
        title={t('myLoans')}
        actions={
          <button type="button" onClick={() => setShowApply(true)} className="btn-primary">
            <HiPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" /> {t('ui.applyLoan')}
          </button>
        }
      />

      <div className="filter-bar">
        <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder={t('ui.searchLoans')} className="w-full sm:w-64" />
        <select className="input sm:w-40" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">{t('ui.allStatus')}</option>
          {statusOptions.map((s) => (
            <option key={s} value={s}>{t(`statusLabel.${s}`)}</option>
          ))}
        </select>
      </div>

      <div className="mobile-list">
        {loans.map((loan) => (
          <div key={loan._id} className="mobile-list-item">
            <div className="mobile-list-head">
              <div className="min-w-0">
                <Link to={`/loans/${loan._id}`} className="mobile-list-title link-accent">
                  {loan.loanId}
                </Link>
                <p className="mobile-list-meta mt-0.5">{t(LOAN_TYPE_KEYS[loan.loanType] || 'table.type')}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Badge status={loan.status} />
                {loan.status === 'approved' && !loan.tenure && (
                  <span className="text-xs text-yellow-600">({t('ui.selectTenure')})</span>
                )}
              </div>
            </div>
            <div className="mobile-list-grid">
              <div className="mobile-list-field">
                <label>{t('table.amount')}</label>
                <span>{formatCurrency(loan.amount)}</span>
              </div>
              <div className="mobile-list-field">
                <label>{t('ui.rate')}</label>
                <span>{loan.interestRate}%</span>
              </div>
              <div className="mobile-list-field">
                <label>{t('ui.tenure')}</label>
                <span>{loan.tenure ? `${loan.tenure}m` : '-'}</span>
              </div>
              <div className="mobile-list-field">
                <label>{t('loan.emiAmount')}</label>
                <span>{formatCurrency(loan.emiAmount)}</span>
              </div>
              <div className="mobile-list-field">
                <label>{t('ui.remaining')}</label>
                <span>{formatCurrency(loan.remainingBalance)}</span>
              </div>
              <div className="mobile-list-field">
                <label>{t('table.date')}</label>
                <span>{formatDate(loan.createdAt)}</span>
              </div>
            </div>
            <div className="mobile-list-actions">{loanActions(loan)}</div>
          </div>
        ))}
        {!loans.length && (
          <p className="py-8 text-center text-[12px] text-slate-500">{t('ui.noLoans')}</p>
        )}
      </div>

      <div className="card desktop-table">
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('table.loanId')}</th>
                <th>{t('table.type')}</th>
                <th className="text-right">{t('table.amount')}</th>
                <th className="text-right">{t('ui.rate')}</th>
                <th className="text-right">{t('ui.tenure')}</th>
                <th className="text-right">{t('loan.emiAmount')}</th>
                <th className="text-right">{t('ui.remaining')}</th>
                <th>{t('table.status')}</th>
                <th>{t('table.date')}</th>
                <th className="text-right">{t('table.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loans.map((loan) => (
                <tr key={loan._id}>
                  <td className="font-medium">
                    <Link to={`/loans/${loan._id}`} className="link-accent">{loan.loanId}</Link>
                  </td>
                  <td>{t(LOAN_TYPE_KEYS[loan.loanType] || 'table.type')}</td>
                  <td className="text-right">{formatCurrency(loan.amount)}</td>
                  <td className="text-right">{loan.interestRate}%</td>
                  <td className="text-right">{loan.tenure ? `${loan.tenure}m` : '-'}</td>
                  <td className="text-right">{formatCurrency(loan.emiAmount)}</td>
                  <td className="text-right">{formatCurrency(loan.remainingBalance)}</td>
                  <td>
                    <Badge status={loan.status} />
                    {loan.status === 'approved' && !loan.tenure && (
                      <span className="ml-1 text-xs text-yellow-600">({t('ui.selectTenure')})</span>
                    )}
                  </td>
                  <td>{formatDate(loan.createdAt)}</td>
                  <td className="text-right">
                    <div className="inline-flex flex-wrap gap-1 justify-end">{loanActions(loan)}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loans.length && (
          <p className="p-4 text-center text-slate-500 text-sm">{t('ui.noLoans')}</p>
        )}
      </div>

      <Pagination meta={meta} onPageChange={setPage} />

      <Modal isOpen={showApply} onClose={() => setShowApply(false)} title={t('dash.applyLoan')}>
        <form onSubmit={handleSubmit(onApply)} className="space-y-4">
          <div>
            <label className="label">{t('loan.loanType')}</label>
            <select className="input" {...register('loanType', { required: t('required') })}>
              <option value="">{t('ui.selectType')}</option>
              {loanTypes.map((lt) => <option key={lt.value} value={lt.value}>{t(LOAN_TYPE_KEYS[lt.value])}</option>)}
            </select>
            {errors.loanType && <p className="text-red-500 text-sm mt-1">{errors.loanType.message}</p>}
          </div>
          <div>
            <label className="label">{t('loan.loanAmount')} (₹)</label>
            <input type="number" className="input" placeholder="100000" {...register('amount', { required: t('required'), min: 1000 })} />
            {errors.amount && <p className="text-red-500 text-sm mt-1">{errors.amount.message}</p>}
          </div>
          {/* <div>
            <label className="label">{t('loan.purpose')}</label>
            <textarea className="input" rows={3} placeholder={t('ui.describePurpose')}
              {...register('purpose', { required: t('required') })} />
            {errors.purpose && <p className="text-red-500 text-sm mt-1">{errors.purpose.message}</p>}
          </div> */}
          <button type="submit" className="btn-primary w-full">{t('ui.submitApplication')}</button>
        </form>
      </Modal>
    </div>
  );
};

export default Loans;
