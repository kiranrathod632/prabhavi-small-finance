import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { transactionAPI } from '../../services';
import { formatCurrency, formatDate, getTransactionTypeLabel, downloadBlob } from '../../utils/helpers';
import Badge from '../../components/Badge';
import Pagination from '../../components/Pagination';
import PageHeader from '../../components/PageHeader';
import { PageLoader } from '../../components/LoadingSpinner';
import { HiDownload } from 'react-icons/hi';

const Transactions = () => {
  const { t } = useTranslation();
  const [transactions, setTransactions] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const res = await transactionAPI.getAll({ page, limit: 10, filter, type });
      setTransactions(res.data.data);
      setMeta(res.data.meta);
    } catch {
      toast.error(t('ui.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTransactions(); }, [page, filter, type]);

  const handleDownloadPDF = async () => {
    try {
      const res = await transactionAPI.downloadStatement({ filter });
      downloadBlob(res.data, 'transaction-statement.pdf');
    } catch {
      toast.error(t('ui.downloadFailed'));
    }
  };

  if (loading && !transactions.length) return <PageLoader />;

  const typeOptions = ['credit', 'debit', 'emi_payment', 'loan_disbursement', 'penalty', 'refund'];

  const amountClass = (txn) =>
    ['credit', 'loan_disbursement', 'refund'].includes(txn.type) ? 'text-emerald-600' : 'text-red-600';

  const formatAmount = (txn) => {
    const sign = ['credit', 'loan_disbursement', 'refund'].includes(txn.type) ? '+' : '-';
    return `${sign}${formatCurrency(txn.amount)}`;
  };

  return (
    <div className="page-stack">
      {/* Custom Header with Download Button */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 sticky top-0 z-10">
        <h1 className="text-lg font-bold text-slate-800 dark:text-slate-200">{t('transactions')}</h1>
        <button 
          type="button" 
          onClick={handleDownloadPDF} 
          className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
        >
          <HiDownload className="w-4 h-4" />
          <span className="hidden sm:inline">{t('ui.downloadPdf')}</span>
        </button>
      </div>

      {/* Filters - Side by Side */}
      <div className="flex flex-wrap items-center gap-2 px-3 py-3 bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-200 dark:border-slate-700">
        <select 
          className="input flex-1 sm:flex-none sm:w-36 text-xs py-1.5 px-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-primary-500"
          value={filter} 
          onChange={(e) => { setFilter(e.target.value); setPage(1); }}
        >
          <option value="">{t('adminDash.allTime')}</option>
          <option value="today">{t('adminDash.today')}</option>
          <option value="week">{t('adminDash.thisWeek')}</option>
          <option value="month">{t('adminDash.thisMonth')}</option>
        </select>
        <select 
          className="input flex-1 sm:flex-none sm:w-40 text-xs py-1.5 px-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-primary-500"
          value={type} 
          onChange={(e) => { setType(e.target.value); setPage(1); }}
        >
          <option value="">{t('adminDash.allTypes')}</option>
          {typeOptions.map((txnType) => (
            <option key={txnType} value={txnType}>{t(`txnType.${txnType}`)}</option>
          ))}
        </select>
      </div>

      {/* Mobile Scrollable Table View */}
      <div className="block sm:hidden px-3 mt-3">
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-x-auto">
          <div className="min-w-[700px]">
            {/* Header */}
            <div className="grid grid-cols-7 gap-0.5 px-2 py-1.5 bg-slate-100 dark:bg-slate-700/50 text-[8px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
              <div className="col-span-1 text-center min-w-[25px]">#</div>
              <div className="col-span-1 min-w-[85px]">Txn ID</div>
              <div className="col-span-1 min-w-[55px]">Type</div>
              <div className="col-span-1 text-right min-w-[65px]">Amount</div>
              <div className="col-span-1 text-center min-w-[50px]">Status</div>
              <div className="col-span-1 text-left min-w-[65px]">Date</div>
              <div className="col-span-1 text-left min-w-[75px]">Collected By</div>
            </div>

            {/* Rows */}
            {transactions.map((txn, index) => (
              <div
                key={txn._id}
                className="grid grid-cols-7 gap-0.5 px-2 py-1.5 items-center text-[8px] hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 last:border-0"
              >
                <div className="col-span-1 text-center text-slate-400 min-w-[25px]">
                  {((page - 1) * 10) + index + 1}
                </div>
                <div className="col-span-1 font-mono text-[8px] text-primary-600 truncate min-w-[85px]">
                  {txn.transactionId}
                </div>
                <div className="col-span-1 text-slate-700 dark:text-slate-300 truncate min-w-[55px]">
                  {getTransactionTypeLabel(txn.type)}
                </div>
                <div className={`col-span-1 text-right font-medium min-w-[65px] ${amountClass(txn)}`}>
                  {formatAmount(txn)}
                </div>
                <div className="col-span-1 text-center min-w-[50px]">
                  <Badge status={txn.status} size="sm" />
                </div>
                <div className="col-span-1 text-slate-500 text-[7px] min-w-[65px]">
                  {formatDate(txn.createdAt)}
                </div>
                <div className="col-span-1 text-slate-500 text-[7px] truncate min-w-[75px]">
                  {txn.processedBy?.name || t('ui.system')}
                </div>
              </div>
            ))}
            {!transactions.length && (
              <div className="py-8 text-center">
                <p className="text-slate-500 text-sm">{t('noData')}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="card desktop-table overflow-hidden hidden sm:block mx-3 mt-3">
        <div className="overflow-x-auto">
          <table className="data-table w-full text-sm">
            <thead>
              <tr className="border-b dark:border-gray-700 bg-slate-50 dark:bg-slate-800">
                <th className="p-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">#</th>
                <th className="p-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">{t('table.id')}</th>
                <th className="p-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">{t('table.type')}</th>
                <th className="p-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">{t('table.amount')}</th>
                <th className="p-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">{t('table.description')}</th>
                <th className="p-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">{t('table.date')}</th>
                <th className="p-3 text-center text-xs font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">{t('table.status')}</th>
                <th className="p-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">Collected By</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((txn, index) => (
                <tr key={txn._id} className="border-b dark:border-gray-700/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="p-3 text-slate-500 whitespace-nowrap">{((page - 1) * 10) + index + 1}</td>
                  <td className="p-3 font-mono text-xs whitespace-nowrap">{txn.transactionId}</td>
                  <td className="p-3 whitespace-nowrap">{getTransactionTypeLabel(txn.type)}</td>
                  <td className={`p-3 text-right font-medium whitespace-nowrap ${amountClass(txn)}`}>{formatAmount(txn)}</td>
                  <td className="p-3 text-slate-500 truncate max-w-[200px]">{txn.description || '-'}</td>
                  <td className="p-3 whitespace-nowrap">{formatDate(txn.createdAt)}</td>
                  <td className="p-3 text-center whitespace-nowrap"><Badge status={txn.status} /></td>
                  <td className="p-3 whitespace-nowrap">
                    {txn.processedBy?.name || t('ui.system')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!transactions.length && (
          <p className="p-4 text-center text-slate-500 text-sm">{t('noData')}</p>
        )}
      </div>

      <Pagination meta={meta} onPageChange={setPage} />
    </div>
  );
};

export default Transactions;