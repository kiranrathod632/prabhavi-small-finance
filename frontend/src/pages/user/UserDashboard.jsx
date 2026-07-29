import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HiCash, HiCreditCard, HiDocumentText, HiCurrencyRupee, HiArrowRight } from 'react-icons/hi';
import { dashboardAPI } from '../../services';
import StatCard from '../../components/StatCard';
import PageHeader from '../../components/PageHeader';
import { formatCurrency, formatDate, getTransactionTypeLabel } from '../../utils/helpers';
import { SkeletonCard } from '../../components/LoadingSpinner';
import Badge from '../../components/Badge';
import toast from 'react-hot-toast';

const UserDashboard = () => {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await dashboardAPI.getUser();
        setData(res.data.data);
      } catch {
        toast.error(t('error'));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [t]);

  if (loading) {
    return (
      <div>
        <PageHeader title={t('dashboard')} />
        <div className="grid grid-cols-2 xl:grid-cols-3 gap-2.5 sm:gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div>
        <PageHeader title={t('dashboard')} />
        <p className="text-slate-400 text-sm">{t('error')}</p>
      </div>
    );
  }

  const { cards, upcomingEMI, recentTransactions } = data;

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title={t('dashboard')}
        subtitle={t('dash.welcome')}
        actions={
          <Link to="/loans" className="btn-accent text-xs sm:text-sm">
            {t('dash.viewLoans')}
            <HiArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </Link>
        }
      />

      <div className="grid grid-cols-2 xl:grid-cols-3 gap-2.5 sm:gap-4 animate-fade-up" style={{ animationDelay: '0.05s' }}>
        <StatCard title={t('loan.loanAmount')} value={formatCurrency(cards.totalLoan)} icon={HiCash} color="primary" />
        <StatCard title={t('dash.activeLoan')} value={formatCurrency(cards.remainingLoan)} icon={HiCash} color="red" />
        <StatCard title={t('emis')} value={cards.paidEmi} icon={HiCreditCard} color="green" />
        <StatCard title={t('dash.pendingEmis')} value={cards.pendingEmi} icon={HiCreditCard} color="yellow" />
        <StatCard title={t('transactions')} value={cards.totalTransactions} icon={HiDocumentText} color="indigo" />
        <StatCard title={t('funds')} value={formatCurrency(cards.walletBalance)} icon={HiCurrencyRupee} color="green" />
      </div>

      {upcomingEMI && (
        <div className="card border-l-4 border-l-accent-300">
          <div className="card-header border-0 pb-0 mb-2 sm:mb-3">
            <h3 className="font-semibold text-sm sm:text-base text-primary-900 dark:text-white">{t('dash.emiDue')}</h3>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg sm:rounded-xl bg-gradient-to-r from-accent-50 to-primary-50 dark:from-accent-900/20 dark:to-primary-900/40">
            <div>
              <p className="font-semibold text-sm sm:text-base text-primary-900 dark:text-white">
                EMI #{upcomingEMI.emiNumber} — {upcomingEMI.loan?.loanId}
              </p>
              <p className="text-[11px] sm:text-sm text-primary-500 mt-0.5 sm:mt-1">
                {t('emi.dueDate')}: {formatDate(upcomingEMI.dueDate)}
              </p>
            </div>
            <div className="sm:text-right flex sm:flex-col items-center sm:items-end justify-between gap-2">
              <p className="text-base sm:text-xl font-bold text-primary-800 dark:text-accent-300">
                {formatCurrency(upcomingEMI.amount)}
              </p>
              <Link to="/emis" className="btn-primary text-[10px] sm:text-xs py-1.5 px-3 min-h-0">
                {t('submit')}
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold text-sm sm:text-base text-primary-900 dark:text-white">{t('transactions')}</h3>
          <Link to="/transactions" className="text-[11px] sm:text-sm font-medium text-primary-600 hover:text-accent-600 dark:text-accent-300">
            {t('dash.viewLoans')}
          </Link>
        </div>
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>{t('status')}</th>
                <th className="text-right">{t('amount')}</th>
                <th>{t('emi.dueDate')}</th>
                <th>{t('status')}</th>
              </tr>
            </thead>
            <tbody>
              {recentTransactions?.map((txn) => (
                <tr key={txn._id}>
                  <td className="font-mono text-[10px] sm:text-xs text-primary-600 dark:text-primary-300">{txn.transactionId}</td>
                  <td>{getTransactionTypeLabel(txn.type)}</td>
                  <td className="text-right font-semibold">{formatCurrency(txn.amount)}</td>
                  <td>{formatDate(txn.createdAt)}</td>
                  <td><Badge status={txn.status} /></td>
                </tr>
              ))}
              {!recentTransactions?.length && (
                <tr>
                  <td colSpan={5} className="py-8 sm:py-10 text-center text-primary-400">{t('noData')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;
