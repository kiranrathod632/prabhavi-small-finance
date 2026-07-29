import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { transactionAPI } from '../../services';
import { formatCurrency, formatDate, getTransactionTypeLabel, downloadBlob } from '../../utils/helpers';
import Badge from '../../components/Badge';
import Pagination from '../../components/Pagination';
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

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">{t('transactions')}</h1>
        <button onClick={handleDownloadPDF} className="btn-secondary">
          <HiDownload className="w-4 h-4 mr-1" /> {t('ui.downloadPdf')}
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <select className="input sm:w-40" value={filter} onChange={(e) => { setFilter(e.target.value); setPage(1); }}>
          <option value="">{t('adminDash.allTime')}</option>
          <option value="today">{t('adminDash.today')}</option>
          <option value="week">{t('adminDash.thisWeek')}</option>
          <option value="month">{t('adminDash.thisMonth')}</option>
        </select>
        <select className="input sm:w-48" value={type} onChange={(e) => { setType(e.target.value); setPage(1); }}>
          <option value="">{t('adminDash.allTypes')}</option>
          {typeOptions.map((txnType) => (
            <option key={txnType} value={txnType}>{t(`txnType.${txnType}`)}</option>
          ))}
        </select>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b dark:border-gray-700">
              <th className="text-left py-3 px-2">{t('table.id')}</th>
              <th className="text-left py-3 px-2">{t('table.type')}</th>
              <th className="text-right py-3 px-2">{t('table.amount')}</th>
              <th className="text-left py-3 px-2">{t('table.description')}</th>
              <th className="text-left py-3 px-2">{t('table.date')}</th>
              <th className="text-left py-3 px-2">{t('table.status')}</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((txn) => (
              <tr key={txn._id} className="border-b dark:border-gray-700/50">
                <td className="py-3 px-2 font-mono text-xs">{txn.transactionId}</td>
                <td className="py-3 px-2">{getTransactionTypeLabel(txn.type)}</td>
                <td className={`py-3 px-2 text-right font-medium ${['credit', 'loan_disbursement', 'refund'].includes(txn.type) ? 'text-green-600' : 'text-red-600'}`}>
                  {['credit', 'loan_disbursement', 'refund'].includes(txn.type) ? '+' : '-'}{formatCurrency(txn.amount)}
                </td>
                <td className="py-3 px-2 text-gray-500">{txn.description}</td>
                <td className="py-3 px-2">{formatDate(txn.createdAt)}</td>
                <td className="py-3 px-2"><Badge status={txn.status} /></td>
              </tr>
            ))}
            {!transactions.length && (
              <tr><td colSpan={6} className="py-8 text-center text-gray-500">{t('noData')}</td></tr>
            )}
          </tbody>
        </table>
        <Pagination meta={meta} onPageChange={setPage} />
      </div>
    </div>
  );
};

export default Transactions;
