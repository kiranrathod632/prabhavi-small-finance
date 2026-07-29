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
    ['credit', 'loan_disbursement', 'refund'].includes(txn.type) ? 'text-green-600' : 'text-red-600';

  const formatAmount = (txn) => {
    const sign = ['credit', 'loan_disbursement', 'refund'].includes(txn.type) ? '+' : '-';
    return `${sign}${formatCurrency(txn.amount)}`;
  };

  return (
    <div className="page-stack">
      <PageHeader
        title={t('transactions')}
        actions={
          <button type="button" onClick={handleDownloadPDF} className="btn-secondary">
            <HiDownload className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" /> {t('ui.downloadPdf')}
          </button>
        }
      />

      <div className="filter-bar">
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

      <div className="mobile-list">
        {transactions.map((txn) => (
          <div key={txn._id} className="mobile-list-item">
            <div className="mobile-list-head">
              <div className="min-w-0">
                <p className="mobile-list-title font-mono text-xs">{txn.transactionId}</p>
                <p className="mobile-list-meta mt-0.5">{getTransactionTypeLabel(txn.type)}</p>
              </div>
              <Badge status={txn.status} />
            </div>
            <div className="mobile-list-grid">
              <div className="mobile-list-field">
                <label>{t('table.amount')}</label>
                <span className={`font-medium ${amountClass(txn)}`}>{formatAmount(txn)}</span>
              </div>
              <div className="mobile-list-field col-span-2">
                <label>{t('table.description')}</label>
                <span className="text-slate-500">{txn.description}</span>
              </div>
              <div className="mobile-list-field col-span-2">
                <label>{t('table.date')}</label>
                <span>{formatDate(txn.createdAt)}</span>
              </div>
            </div>
          </div>
        ))}
        {!transactions.length && (
          <p className="py-8 text-center text-[12px] text-slate-500">{t('noData')}</p>
        )}
      </div>

      <div className="card desktop-table">
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('table.id')}</th>
                <th>{t('table.type')}</th>
                <th className="text-right">{t('table.amount')}</th>
                <th>{t('table.description')}</th>
                <th>{t('table.date')}</th>
                <th>{t('table.status')}</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((txn) => (
                <tr key={txn._id}>
                  <td className="font-mono text-xs">{txn.transactionId}</td>
                  <td>{getTransactionTypeLabel(txn.type)}</td>
                  <td className={`text-right font-medium ${amountClass(txn)}`}>{formatAmount(txn)}</td>
                  <td className="text-slate-500">{txn.description}</td>
                  <td>{formatDate(txn.createdAt)}</td>
                  <td><Badge status={txn.status} /></td>
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
