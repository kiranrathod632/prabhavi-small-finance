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
      {/* Custom Header with Right Aligned Button */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 sticky top-0 z-10">
        <div>
          <h1 className="text-lg font-bold text-slate-800 dark:text-slate-200">{t('dashboard')}</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">{t('dash.welcome')}</p>
        </div>
        <Link to="/loans" className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors bg-primary-50 dark:bg-primary-900/20 px-3 py-1.5 rounded-full">
          {t('dash.viewLoans')}
          <HiArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-3 gap-2.5 sm:gap-4 px-3 animate-fade-up" style={{ animationDelay: '0.05s' }}>
        <StatCard title={t('loan.loanAmount')} value={formatCurrency(cards.totalLoan)} icon={HiCash} color="primary" />
        <StatCard title={t('dash.activeLoan')} value={formatCurrency(cards.remainingLoan)} icon={HiCash} color="red" />
        <StatCard title={t('emis')} value={cards.paidEmi} icon={HiCreditCard} color="green" />
        <StatCard title={t('dash.pendingEmis')} value={cards.pendingEmi} icon={HiCreditCard} color="yellow" />
        <StatCard title={t('transactions')} value={cards.totalTransactions} icon={HiDocumentText} color="indigo" />
        <StatCard title={t('funds')} value={formatCurrency(cards.walletBalance)} icon={HiCurrencyRupee} color="green" />
      </div>

      {upcomingEMI && (
        <div className="card border-l-4 border-l-accent-300 mx-3">
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

      {/* Transactions Table - Compact with proper spacing */}
     <div className="card mx-3 overflow-hidden">
  <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200 dark:border-slate-700">
    <h3 className="font-semibold text-sm text-primary-900 dark:text-white">{t('transactions')}</h3>
    <Link to="/transactions" className="text-[10px] font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors">
      {t('dash.viewAll')}
    </Link>
  </div>
  <div className="overflow-x-auto">
    <div className="min-w-[600px]">
      {/* Header */}
      <div className="grid grid-cols-5 gap-3 px-4 py-2 bg-slate-50 dark:bg-slate-800/50 text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
        <div className="col-span-1 min-w-[90px]">Txn ID</div>
        <div className="col-span-1 min-w-[70px]">Type</div>
        <div className="col-span-1 text-right min-w-[85px]">Amount</div>
        <div className="col-span-1 text-left min-w-[85px]">Date</div>
        <div className="col-span-1 text-center min-w-[60px]">Status</div>
      </div>

      {/* Rows */}
      {recentTransactions?.map((txn) => (
        <div
          key={txn._id}
          className="grid grid-cols-5 gap-3 px-4 py-2 items-center text-[10px] hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 last:border-0"
        >
          <div className="col-span-1 font-mono text-[9px] text-primary-600 dark:text-primary-400 truncate min-w-[90px]">
            {txn.transactionId}
          </div>
          <div className="col-span-1 text-slate-700 dark:text-slate-300 truncate min-w-[70px]">
            {getTransactionTypeLabel(txn.type)}
          </div>
          <div className={`col-span-1 text-right font-medium min-w-[85px] ${
            ['credit', 'loan_disbursement', 'refund'].includes(txn.type) 
              ? 'text-emerald-600' 
              : 'text-red-600'
          }`}>
            {['credit', 'loan_disbursement', 'refund'].includes(txn.type) ? '+' : '-'}
            {formatCurrency(txn.amount)}
          </div>
          <div className="col-span-1 text-slate-500 text-[9px] min-w-[85px]">
            {formatDate(txn.createdAt)}
          </div>
          <div className="col-span-1 text-center min-w-[60px]">
            <Badge status={txn.status} size="sm" />
          </div>
        </div>
      ))}
      {!recentTransactions?.length && (
        <div className="py-6 text-center">
          <p className="text-slate-400 text-xs">{t('noData')}</p>
        </div>
      )}
    </div>
  </div>
</div>
    </div>
  );
};

export default UserDashboard;