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

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">{t('myLoans')}</h1>
        <button onClick={() => setShowApply(true)} className="btn-primary">
          <HiPlus className="w-4 h-4 mr-1" /> {t('ui.applyLoan')}
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder={t('ui.searchLoans')} className="sm:w-64" />
        <select className="input sm:w-40" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">{t('ui.allStatus')}</option>
          {statusOptions.map((s) => (
            <option key={s} value={s}>{t(`statusLabel.${s}`)}</option>
          ))}
        </select>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b dark:border-gray-700">
              <th className="text-left py-3 px-2">{t('table.loanId')}</th>
              <th className="text-left py-3 px-2">{t('table.type')}</th>
              <th className="text-right py-3 px-2">{t('table.amount')}</th>
              <th className="text-right py-3 px-2">{t('ui.rate')}</th>
              <th className="text-right py-3 px-2">{t('ui.tenure')}</th>
              <th className="text-right py-3 px-2">{t('loan.emiAmount')}</th>
              <th className="text-right py-3 px-2">{t('ui.remaining')}</th>
              <th className="text-left py-3 px-2">{t('table.status')}</th>
              <th className="text-left py-3 px-2">{t('table.date')}</th>
              <th className="text-right py-3 px-2">{t('table.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {loans.map((loan) => (
              <tr key={loan._id} className="border-b dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                <td className="py-3 px-2">
                  <Link to={`/loans/${loan._id}`} className="text-primary-600 hover:underline font-medium">{loan.loanId}</Link>
                </td>
                <td className="py-3 px-2">{t(LOAN_TYPE_KEYS[loan.loanType] || 'table.type')}</td>
                <td className="py-3 px-2 text-right">{formatCurrency(loan.amount)}</td>
                <td className="py-3 px-2 text-right">{loan.interestRate}%</td>
                <td className="py-3 px-2 text-right">{loan.tenure ? `${loan.tenure}m` : '-'}</td>
                <td className="py-3 px-2 text-right">{formatCurrency(loan.emiAmount)}</td>
                <td className="py-3 px-2 text-right">{formatCurrency(loan.remainingBalance)}</td>
                <td className="py-3 px-2">
                  <Badge status={loan.status} />
                  {loan.status === 'approved' && !loan.tenure && (
                    <span className="ml-1 text-xs text-yellow-600">({t('ui.selectTenure')})</span>
                  )}
                </td>
                <td className="py-3 px-2">{formatDate(loan.createdAt)}</td>
                <td className="py-3 px-2 text-right">
                  {loan.status === 'approved' && !loan.tenure && (
                    <Link
                      to={`/loans/${loan._id}`}
                      className="text-primary-600 hover:text-primary-700 text-xs font-medium"
                    >
                      {t('ui.selectTenure')}
                    </Link>
                  )}
                  {['active', 'closed'].includes(loan.status) && (
                    <button onClick={() => handleDownload(loan._id, loan.loanId)} className="text-primary-600 hover:text-primary-700" title={t('ui.downloadStatement')}>
                      <HiDownload className="w-4 h-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {!loans.length && (
              <tr><td colSpan={10} className="py-8 text-center text-gray-500">{t('ui.noLoans')}</td></tr>
            )}
          </tbody>
        </table>
        <Pagination meta={meta} onPageChange={setPage} />
      </div>

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
          <div>
            <label className="label">{t('loan.purpose')}</label>
            <textarea className="input" rows={3} placeholder={t('ui.describePurpose')}
              {...register('purpose', { required: t('required') })} />
            {errors.purpose && <p className="text-red-500 text-sm mt-1">{errors.purpose.message}</p>}
          </div>
          <button type="submit" className="btn-primary w-full">{t('ui.submitApplication')}</button>
        </form>
      </Modal>
    </div>
  );
};

export default Loans;
