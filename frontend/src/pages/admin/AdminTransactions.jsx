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

      <div className="card">
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('table.srNo')}</th>
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
              {transactions.map((txn, index) => (
                <tr key={txn._id}>
                  <td className="text-slate-500">{((page || 1) - 1) * 10 + index + 1}</td>
                  <td className="font-mono text-xs">{txn.transactionId}</td>
                  <td>{txn.user?.name || 'N/A'}</td>
                  <td>{getTransactionTypeLabel(txn.type)}</td>
                  <td className="text-right font-medium">{formatCurrency(txn.amount)}</td>
                  <td className="text-slate-500">{txn.description || 'N/A'}</td>
                  <td className="whitespace-nowrap">{formatDate(txn.createdAt)}</td>
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
