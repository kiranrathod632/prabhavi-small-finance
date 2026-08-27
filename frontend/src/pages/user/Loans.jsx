import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { loanAPI } from '../../services';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency, formatDate, getErrorMessage, loanTypes } from '../../utils/helpers';
import Badge from '../../components/Badge';
import SearchBar from '../../components/SearchBar';
import Pagination from '../../components/Pagination';
import Modal from '../../components/Modal';
import PageHeader from '../../components/PageHeader';
import { PageLoader } from '../../components/LoadingSpinner';
import { HiPlus, HiDownload, HiEye } from 'react-icons/hi';

const LOAN_TYPE_KEYS = {
  personal: 'ui.personal',
  home: 'ui.homeLoan',
  business: 'ui.business',
  education: 'ui.education',
  vehicle: 'ui.vehicle',
};

const Loans = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loans, setLoans] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [showApply, setShowApply] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const canApplyLoan = user?.profileSetupComplete !== false && user?.kycCompleted === true;

  const handleApplyClick = () => {
    if (user?.profileSetupComplete === false) {
      toast.error(t('kyc.completeProfileFirst'));
      navigate('/complete-profile');
      return;
    }
    if (!user?.kycCompleted) {
      toast.error(t('kyc.completeKycFirst'));
      navigate('/profile');
      return;
    }
    setShowApply(true);
  };

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
      <Link 
        to={`/loans/${loan._id}`} 
        className="inline-flex items-center justify-center p-1.5 rounded-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 shadow-sm transition-colors"
        title={t('ui.viewDetails')}
      >
        <HiEye className="w-3.5 h-3.5 text-primary-600" />
      </Link>
      {loan.status === 'approved' && !loan.tenure && (
        <Link to={`/loans/${loan._id}`} className="btn-primary action-chip whitespace-nowrap text-xs py-1 px-2">
          {t('ui.selectTenure')}
        </Link>
      )}
      {['active', 'closed'].includes(loan.status) && (
        <button
          type="button"
          onClick={() => handleDownload(loan._id, loan.loanId)}
          className="inline-flex items-center justify-center p-1.5 rounded-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 shadow-sm transition-colors"
          title={t('ui.downloadStatement')}
        >
          <HiDownload className="w-3.5 h-3.5 text-slate-500" />
        </button>
      )}
    </>
  );

  return (
    <div className="page-stack">
      <PageHeader
        title={t('myLoans')}
        actions={
          <button type="button" onClick={handleApplyClick} className="btn-primary whitespace-nowrap">
            <HiPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" /> {t('ui.applyLoan')}
          </button>
        }
      />

      {!canApplyLoan && (
        <div className="rounded-xl border border-amber-300/60 bg-amber-50 dark:bg-amber-950/30 px-3 py-2.5 text-sm text-amber-800 dark:text-amber-200">
          {t('kyc.loanBlockedHint')}{' '}
          <Link to="/profile" className="font-semibold underline">{t('profile')}</Link>
        </div>
      )}

      <div className="filter-bar">
        <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder={t('ui.searchLoans')} className="w-full sm:w-64" />
        <select className="input sm:w-40" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">{t('ui.allStatus')}</option>
          {statusOptions.map((s) => (
            <option key={s} value={s}>{t(`statusLabel.${s}`)}</option>
          ))}
        </select>
      </div>

      {/* Table View - Same for both mobile and desktop with horizontal scroll */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead>
              <tr className="border-b dark:border-gray-700 bg-slate-50 dark:bg-slate-800">
                <th className="p-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">#</th>
                <th className="p-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">{t('table.loanId')}</th>
                <th className="p-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">{t('table.type')}</th>
                <th className="p-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">{t('table.amount')}</th>
                <th className="p-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">{t('ui.rate')}</th>
                <th className="p-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">{t('ui.tenure')}</th>
                <th className="p-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">{t('loan.emiAmount')}</th>
                <th className="p-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">{t('ui.remaining')}</th>
                <th className="p-3 text-center text-xs font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">{t('table.status')}</th>
                <th className="p-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">{t('table.date')}</th>
                <th className="p-3 text-center text-xs font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">{t('table.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loans.map((loan, index) => (
                <tr key={loan._id} className="border-b dark:border-gray-700/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="p-3 text-slate-500 whitespace-nowrap">{index + 1}</td>
                  <td className="p-3 font-medium whitespace-nowrap">
                    <Link to={`/loans/${loan._id}`} className="text-primary-600 hover:underline">{loan.loanId}</Link>
                  </td>
                  <td className="p-3 whitespace-nowrap">{t(LOAN_TYPE_KEYS[loan.loanType] || 'table.type')}</td>
                  <td className="p-3 text-right whitespace-nowrap">{formatCurrency(loan.amount)}</td>
                  <td className="p-3 text-right whitespace-nowrap">{loan.interestRate}%</td>
                  <td className="p-3 text-right whitespace-nowrap">{loan.tenure ? `${loan.tenure}m` : '-'}</td>
                  <td className="p-3 text-right whitespace-nowrap">{formatCurrency(loan.emiAmount)}</td>
                  <td className="p-3 text-right whitespace-nowrap">{formatCurrency(loan.remainingBalance)}</td>
                  <td className="p-3 text-center whitespace-nowrap">
                    <Badge status={loan.status} />
                    {loan.status === 'approved' && !loan.tenure && (
                      <span className="ml-1 text-xs text-yellow-600 whitespace-nowrap">({t('ui.selectTenure')})</span>
                    )}
                  </td>
                  <td className="p-3 whitespace-nowrap">{formatDate(loan.createdAt)}</td>
                  <td className="p-3 text-center whitespace-nowrap">
                    <div className="inline-flex items-center gap-1 justify-center">
                      {loanActions(loan)}
                    </div>
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
          <button type="submit" className="btn-primary w-full">{t('ui.submitApplication')}</button>
        </form>
      </Modal>
    </div>
  );
};

export default Loans;