import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { transactionAPI } from '../../services';
import { formatCurrency, formatDate, getTransactionTypeLabel, downloadBlob } from '../../utils/helpers';
import Badge from '../../components/Badge';
import SearchBar from '../../components/SearchBar';
import Pagination from '../../components/Pagination';
import PageHeader from '../../components/PageHeader';
import { PageLoader } from '../../components/LoadingSpinner';
import { HiDownload } from 'react-icons/hi';

const AdminTransactions = () => {
  const { t } = useTranslation();
  const [transactions, setTransactions] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const res = await transactionAPI.getAll({ page, limit: 10, search, type, filter });
      setTransactions(res.data.data);
      setMeta(res.data.meta);
    } catch {
      toast.error(t('error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTransactions(); }, [page, search, type, filter]);

  const handleExportExcel = async () => {
    try {
      const res = await transactionAPI.exportExcel({ filter });
      downloadBlob(res.data, 'transactions.xlsx');
    } catch {
      toast.error(t('error'));
    }
  };

  if (loading && !transactions.length) return <PageLoader />;

  return (
    <div className="page-stack">
      <PageHeader
        title={t('adminDash.transactionManagement')}
        actions={
          <button type="button" onClick={handleExportExcel} className="btn-secondary">
            <HiDownload className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" /> {t('adminDash.exportExcel')}
          </button>
        }
      />

      <div className="filter-bar">
        <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder={t('search')} className="w-full sm:w-64" />
        <select className="input sm:w-40" value={filter} onChange={(e) => { setFilter(e.target.value); setPage(1); }}>
          <option value="">{t('adminDash.allTime')}</option>
          <option value="today">{t('adminDash.today')}</option>
          <option value="week">{t('adminDash.thisWeek')}</option>
          <option value="month">{t('adminDash.thisMonth')}</option>
        </select>
        <select className="input sm:w-48" value={type} onChange={(e) => { setType(e.target.value); setPage(1); }}>
          <option value="">{t('adminDash.allTypes')}</option>
          <option value="credit">{t('txnType.credit')}</option>
          <option value="debit">{t('txnType.debit')}</option>
          <option value="emi_payment">{t('txnType.emi_payment')}</option>
          <option value="loan_disbursement">{t('txnType.loan_disbursement')}</option>
          <option value="penalty">{t('txnType.penalty')}</option>
          <option value="refund">{t('txnType.refund')}</option>
          <option value="processing_fee">{t('txnType.processing_fee')}</option>
        </select>
      </div>

      <div className="mobile-list">
        {transactions.map((txn) => (
          <div key={txn._id} className="mobile-list-item">
            <div className="mobile-list-head">
              <div className="min-w-0">
                <p className="mobile-list-title font-mono text-xs">{txn.transactionId}</p>
                <p className="mobile-list-meta mt-0.5">{txn.user?.name}</p>
              </div>
              <Badge status={txn.status} />
            </div>
            <div className="mobile-list-grid">
              <div className="mobile-list-field">
                <label>{t('table.type')}</label>
                <span>{getTransactionTypeLabel(txn.type)}</span>
              </div>
              <div className="mobile-list-field">
                <label>{t('table.amount')}</label>
                <span className="font-medium">{formatCurrency(txn.amount)}</span>
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
                <th>{t('table.user')}</th>
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
                  <td>{txn.user?.name}</td>
                  <td>{getTransactionTypeLabel(txn.type)}</td>
                  <td className="text-right font-medium">{formatCurrency(txn.amount)}</td>
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

export default AdminTransactions;
