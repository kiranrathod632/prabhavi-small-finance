import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import adminPanelAPI from '../../services/adminPanelAPI';
import { useAdminCounts } from '../../context/AdminCountsContext';
import StatCard from '../../components/StatCard';
import PageHeader from '../../components/PageHeader';
import { BarChart, LineChart } from '../../components/Charts';
import { formatCurrency, formatDate, getTransactionTypeLabel, getErrorMessage } from '../../utils/helpers';
import { SkeletonCard } from '../../components/LoadingSpinner';
import Badge from '../../components/Badge';
import { ROLES } from '../../utils/roles';

const PERIOD_OPTIONS = ['week', 'month', 'month3', 'month6', 'year'];

const pickPeriodTotal = (cards, period, prefix) => {
  if (period === 'today') return cards[`${prefix}Today`];
  if (period === 'week') return cards[`${prefix}Weekly`];
  if (period === 'month') return cards[`${prefix}Monthly`];
  if (period === 'month3') return cards[`${prefix}3Month`];
  if (period === 'month6') return cards[`${prefix}6Month`];
  return cards[`${prefix}Yearly`];
};

const AdminDashboard = () => {
  const { t } = useTranslation();
  const { dashboardPath, role } = useAuth();
  const { refreshAdminCounts, pendingLoanCount, emiCollectionCount } = useAdminCounts();
  const isSuperAdmin = role === ROLES.SUPER_ADMIN;
  const base = dashboardPath?.startsWith('/super-admin') ? '/super-admin' : '/admin';
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [pendingLoans, setPendingLoans] = useState([]);
  const [fundAmount, setFundAmount] = useState('');
  const [fundType, setFundType] = useState('deposit');
  const [fundDescription, setFundDescription] = useState('');
  const [fundLoading, setFundLoading] = useState(false);
  const [loanActionLoading, setLoanActionLoading] = useState('');
  const [purchaseActionLoading, setPurchaseActionLoading] = useState('');
  const [emiTotalsPeriod, setEmiTotalsPeriod] = useState('week');
  const [chartPeriod, setChartPeriod] = useState('week');
  const [filterPeriod, setFilterPeriod] = useState('today');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [useCustomMonth, setUseCustomMonth] = useState(false);
  const [selectedChartMonth, setSelectedChartMonth] = useState('');
  const [useCustomChartMonth, setUseCustomChartMonth] = useState(false);

  // ----- fetchDashboard with optional params -----
  const fetchDashboard = async (params = {}) => {
    try {
      const query = { ...params };
      if (useCustomMonth && selectedMonth) {
        query.month = selectedMonth;
      }
      if (useCustomChartMonth && selectedChartMonth) {
        query.chartMonth = selectedChartMonth;
      }
      const [dashboardRes, usersRes, loansRes] = await Promise.all([
        adminPanelAPI.getDashboard(query),
        adminPanelAPI.getUsers({ page: 1, limit: 8, includeAdmin: true }),
        adminPanelAPI.getLoans({ page: 1, limit: 8, status: 'pending' }),
      ]);
      setData(dashboardRes.data.data);
      setUsers(usersRes.data.data || []);
      setPendingLoans(loansRes.data.data || []);
    } catch {
      toast.error(t('adminDash.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    // eslint-disable-next-line
  }, []);

  // ----- Fund, Loan, Purchase handlers (unchanged) -----
  const handleFundUpdate = async (e) => {
    e.preventDefault();
    if (!fundAmount || Number(fundAmount) <= 0) {
      toast.error(t('adminDash.validAmount'));
      return;
    }
    setFundLoading(true);
    try {
      await adminPanelAPI.updateFund({
        amount: Number(fundAmount),
        type: fundType,
        description: fundDescription || `${fundType} via admin dashboard`,
      });
      toast.success(t('adminDash.fundUpdated'));
      setFundAmount('');
      setFundDescription('');
      await fetchDashboard();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setFundLoading(false);
    }
  };

  const handleLoanStatus = async (loanId, status) => {
    setLoanActionLoading(`${loanId}-${status}`);
    try {
      await adminPanelAPI.updateLoan(loanId, { status });
      toast.success(t(`loan.${status === 'approved' ? 'approved' : 'rejected'}`));
      await fetchDashboard();
      refreshAdminCounts();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoanActionLoading('');
    }
  };

  const handlePurchaseStatus = async (purchaseId, action) => {
    setPurchaseActionLoading(`${purchaseId}-${action}`);
    try {
      if (action === 'approve') {
        await adminPanelAPI.approvePurchase(purchaseId);
        toast.success(t('adminPurchases.approved') || 'Approved — amount deducted from fund');
      } else {
        await adminPanelAPI.rejectPurchase(purchaseId);
        toast.success(t('adminPurchases.rejected') || 'Purchase rejected');
      }
      await fetchDashboard();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setPurchaseActionLoading('');
    }
  };

  // ----- Stats filter handlers (auto‑apply) -----
  const handleFilterPeriodChange = (e) => {
    const period = e.target.value;
    setFilterPeriod(period);
    setUseCustomMonth(false);
    setSelectedMonth('');
    fetchDashboard({ period });
  };

  const handleMonthChange = (e) => {
    const month = e.target.value;
    setSelectedMonth(month);
    if (month) {
      setUseCustomMonth(true);
      fetchDashboard({ month });
    } else {
      setUseCustomMonth(false);
      fetchDashboard({ period: filterPeriod });
    }
  };

  const handleLastMonth = () => {
    const now = new Date();
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const year = prev.getFullYear();
    const month = String(prev.getMonth() + 1).padStart(2, '0');
    const monthStr = `${year}-${month}`;
    setSelectedMonth(monthStr);
    setUseCustomMonth(true);
    fetchDashboard({ month: monthStr });
  };

  // ----- Chart filter handlers (auto‑apply) -----
  const handleChartPeriodChange = (e) => {
    const period = e.target.value;
    setChartPeriod(period);
    if (useCustomChartMonth) {
      setUseCustomChartMonth(false);
      setSelectedChartMonth('');
    }
    fetchDashboard({ chartPeriod: period });
  };

  const handleChartMonthChange = (e) => {
    const month = e.target.value;
    setSelectedChartMonth(month);
    if (month) {
      setUseCustomChartMonth(true);
      setChartPeriod('month');
      fetchDashboard({ chartMonth: month });
    } else {
      setUseCustomChartMonth(false);
      setChartPeriod('week');
      fetchDashboard();
    }
  };

  const handleLastChartMonth = () => {
    const now = new Date();
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const year = prev.getFullYear();
    const month = String(prev.getMonth() + 1).padStart(2, '0');
    const monthStr = `${year}-${month}`;
    setSelectedChartMonth(monthStr);
    setUseCustomChartMonth(true);
    setChartPeriod('month');
    fetchDashboard({ chartMonth: monthStr });
  };

  // ----- Loading & error states -----
  if (loading) {
    return (
      <div>
        <PageHeader title={t('adminDash.title')} />
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-2.5 sm:gap-4">
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div>
        <PageHeader title={t('adminDash.title')} />
        <p className="text-slate-400 text-sm">{t('adminDash.loadFailed')}</p>
      </div>
    );
  }

  const { cards, charts, recentTransactions } = data;

  // ----- Data extraction (unchanged) -----
  const emiTotal = pickPeriodTotal(cards, emiTotalsPeriod, 'emiTotal') || 0;
  const interestTotal = pickPeriodTotal(cards, emiTotalsPeriod, 'interestTotal') || 0;
  const profitTotal = pickPeriodTotal(cards, emiTotalsPeriod, 'profitTotal') || 0;

  const periodCharts = charts?.periodCharts || {};
  const emiChartData = periodCharts?.emi?.[chartPeriod] || charts?.monthlyEMI || [];
  const interestChartData = periodCharts?.interest?.[chartPeriod] || [];
  const profitChartData = periodCharts?.profit?.[chartPeriod] || [];
  const usersChartData = periodCharts?.users?.[chartPeriod] || charts?.userGrowth || [];
  const loansChartData = periodCharts?.loansDisbursed?.[chartPeriod] || charts?.monthlyLoans || [];
  const penaltyChartData = periodCharts?.penalty?.[chartPeriod] || [];

  const getPeriodKey = () => {
    if (useCustomMonth) return 'Monthly';
    const keyMap = {
      today: 'Today',
      week: 'Weekly',
      month: 'Monthly',
      '3month': '3Month',
      '6month': '6Month',
      year: 'Yearly',
    };
    return keyMap[filterPeriod] || 'Monthly';
  };
  const periodKey = getPeriodKey();

  const filteredEmi = Number(cards[`emiTotal${periodKey}`] || 0);
  const filteredInterest = Number(cards[`interestTotal${periodKey}`] || 0);
  const filteredProfit = Number(cards[`profitTotal${periodKey}`] || 0);
  const filteredPenalty = Number(cards[`penaltyTotal${periodKey}`] || 0);
  const filteredLoan = Number(cards[`loanDisbursed${periodKey}`] || 0);
  const filteredFee = Number(cards[`processingFeeTotal${periodKey}`] || 0);
  const filteredUsers = Number(cards[`usersRegistered${periodKey}`] || 0);

  const periodLabel = (key) => {
    const map = {
      today: t('adminDash.today'),
      week: t('adminDash.thisWeek'),
      month: t('adminDash.thisMonth'),
      '3month': t('adminDash.last3Months') || '3 Months',
      '6month': t('adminDash.last6Months') || '6 Months',
      year: t('adminDash.thisYear'),
    };
    return map[key] || key;
  };

  return (
    <div className="space-y-4 sm:space-y-8">
      <PageHeader title={t('adminDash.title')} />

      {/* Overview totals (unchanged) */}
      <section>
        <p className="section-label">{t('adminDash.overview') || 'Overview'}</p>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-2.5 sm:gap-4">
          <StatCard title={t('adminDash.availableFund')} value={formatCurrency(cards.availableFund)} color="green" />
          <StatCard title={t('adminDash.totalUsers')} value={cards.totalUsers} color="primary" />
          <StatCard title={t('adminDash.totalEmiCollection') || 'Total EMI Collection'} value={formatCurrency(cards.emiCollected || 0)} color="green" />
          <StatCard title={t('adminDash.profit')} value={formatCurrency(cards.profit || 0)} color="green" />
          <StatCard title={t('adminDash.totalPenalty') || 'Total Penalty'} value={formatCurrency(cards.penaltyCollected || 0)} color="red" />
          <StatCard title={t('adminDash.totalInterest') || 'Total Interest'} value={formatCurrency(cards.totalInterestEarned || 0)} color="indigo" />
          <StatCard title={t('adminDash.processingFeeAmount') || 'Processing Fee'} value={formatCurrency(cards.totalProcessingFees || 0)} color="yellow" />
          <StatCard title={t('adminDash.companyFund')} value={formatCurrency(cards.companyFund)} color="indigo" />
          <StatCard title={t('adminDash.expenses')} value={formatCurrency(cards.expenses || cards.purchaseApprovedTotal || 0)} color="red" />
        </div>
      </section>

      {/* ===== STATS FILTER BAR with proper labels ===== */}
      <section>
        <div className="bg-white dark:bg-primary-800 rounded-lg shadow-sm border border-primary-100 dark:border-primary-700 p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
              {t('adminDash.periodFilter') || 'Period Filter'}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {/* Period dropdown */}
              <select
                value={filterPeriod}
                onChange={handleFilterPeriodChange}
                className="form-select rounded-md border border-primary-200 bg-white px-3 py-1.5 text-sm dark:border-primary-700 dark:bg-primary-800"
              >
                <option value="today">{periodLabel('today')}</option>
                <option value="week">{periodLabel('week')}</option>
                <option value="month">{periodLabel('month')}</option>
                <option value="3month">{periodLabel('3month')}</option>
                <option value="6month">{periodLabel('6month')}</option>
                <option value="year">{periodLabel('year')}</option>
              </select>

              {/* Month picker with proper label */}
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-primary-600 dark:text-primary-400 whitespace-nowrap">
                  {t('Select month') || 'Select Month:'}
                </span>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={handleMonthChange}
                  className="form-input rounded-md border border-primary-200 bg-white px-3 py-1.5 text-sm dark:border-primary-700 dark:bg-primary-800 w-auto max-w-[140px]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-2.5 sm:gap-4 mt-3 sm:mt-4">
          <StatCard title={t('adminDash.periodEmi') || 'EMI Collection'} value={formatCurrency(filteredEmi || 0)} color="green" />
          <StatCard title={t('adminDash.periodPenalty') || 'Penalty'} value={formatCurrency(filteredPenalty || 0)} color="red" />
          <StatCard title={t('adminDash.periodLoan') || 'Loan Given'} value={formatCurrency(filteredLoan || 0)} color="indigo" />
          <StatCard title={t('adminDash.periodInterest') || 'Interest'} value={formatCurrency(filteredInterest || 0)} color="primary" />
          <StatCard title={t('adminDash.loanDistributed')} value={formatCurrency(cards.loanDistributed)} color="red" />
          <StatCard title={t('adminDash.periodFee') || 'Processing Fee'} value={formatCurrency(filteredFee || 0)} color="yellow" />
          <StatCard title={t('adminDash.periodProfit') || 'Profit'} value={formatCurrency(filteredProfit || 0)} color="green" />
          <StatCard title={t('adminDash.usersRegistered') || 'Users Registered'} value={filteredUsers || 0} color="primary" />
          <StatCard title={t('adminDash.expenses')} value={formatCurrency(cards.expenses || cards.purchaseApprovedTotal || 0)} color="red" />
        </div>
      </section>

      {/* Loan stats (unchanged) */}
      <section>
        <p className="section-label">{t('loans')}</p>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-2.5 sm:gap-4">
          <StatCard title={t('adminDash.totalLoans')} value={cards.totalLoans} color="indigo" />
          <StatCard title={t('adminDash.activeLoans')} value={cards.activeLoans} color="green" />
          <StatCard title={t('adminDash.pendingLoans')} value={cards.pendingLoans} color="yellow" />
          <StatCard title={t('adminDash.closedLoans')} value={cards.closedLoans} color="primary" />
        </div>
      </section>

      {/* ===== CHARTS FILTER BAR with proper labels ===== */}
      <section>
        <div className="bg-white dark:bg-primary-800 rounded-lg shadow-sm border border-primary-100 dark:border-primary-700 p-3 sm:p-4 mb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
              {t('adminDash.periodGraphs') || 'Period Graphs'}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {/* Chart period dropdown */}
              <select
                value={chartPeriod}
                onChange={handleChartPeriodChange}
                className="form-select rounded-md border border-primary-200 bg-white px-3 py-1.5 text-sm dark:border-primary-700 dark:bg-primary-800"
              >
                <option value="week">{periodLabel('week')}</option>
                <option value="month">{periodLabel('month')}</option>
                <option value="3month">{periodLabel('3month')}</option>
                <option value="6month">{periodLabel('6month')}</option>
                <option value="year">{periodLabel('year')}</option>
              </select>

              {/* Chart month picker with proper label */}
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-primary-600 dark:text-primary-400 whitespace-nowrap">
                  {t('Select month') || 'Chart Month:'}
                </span>
                <input
                  type="month"
                  value={selectedChartMonth}
                  onChange={handleChartMonthChange}
                  className="form-input rounded-md border border-primary-200 bg-white px-3 py-1.5 text-sm dark:border-primary-700 dark:bg-primary-800 w-auto max-w-[140px]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Chart cards (unchanged) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 lg:gap-5">
          <div className="card card-chart">
            <div className="card-header">
              <h3 className="font-semibold text-primary-900 dark:text-white">
                {t('adminDash.emiCollectionGraph') || 'EMI Collection'}
              </h3>
            </div>
            <LineChart data={emiChartData} label={t('adminDash.emiCollectedLabel')} color="#0d9488" />
          </div>
          <div className="card card-chart">
            <div className="card-header">
              <h3 className="font-semibold text-primary-900 dark:text-white">
                {t('adminDash.interestGraph') || 'Interest'}
              </h3>
            </div>
            <BarChart data={interestChartData} label={t('adminDash.interestTotal')} color="#1e4463" />
          </div>
          <div className="card card-chart">
            <div className="card-header">
              <h3 className="font-semibold text-primary-900 dark:text-white">
                {t('adminDash.profitGraph') || 'Profit'}
              </h3>
            </div>
            <LineChart data={profitChartData} label={t('adminDash.profitTotal')} color="#c99a2e" />
          </div>
          <div className="card card-chart">
            <div className="card-header">
              <h3 className="font-semibold text-primary-900 dark:text-white">
                {t('adminDash.usersRegisteredGraph') || 'Users Registered'}
              </h3>
            </div>
            <BarChart data={usersChartData} label={t('adminDash.newUsers')} color="#2d5a7b" />
          </div>
          <div className="card card-chart">
            <div className="card-header">
              <h3 className="font-semibold text-primary-900 dark:text-white">
                {t('adminDash.loanGivenGraph') || 'Loan Given'}
              </h3>
            </div>
            <BarChart data={loansChartData} label={t('adminDash.loanAmount')} color="#7c3aed" />
          </div>
          <div className="card card-chart">
            <div className="card-header">
              <h3 className="font-semibold text-primary-900 dark:text-white">
                {t('adminDash.penaltyGraph') || 'Penalty Collection'}
              </h3>
            </div>
            <LineChart data={penaltyChartData} label={t('adminDash.penaltyCollection') || 'Penalty'} color="#dc2626" />
          </div>
        </div>
      </section>

      {/* Recent transactions (unchanged) */}
      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold text-sm sm:text-base text-primary-900 dark:text-white">{t('adminDash.recentTransactions')}</h3>
        </div>
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('table.srNo')}</th>
                <th>{t('table.id')}</th>
                <th>{t('table.user')}</th>
                <th>{t('table.type')}</th>
                <th className="text-right">{t('table.amount')}</th>
                <th>{t('table.date')}</th>
                <th>{t('table.status')}</th>
              </tr>
            </thead>
            <tbody>
              {(recentTransactions || []).map((txn, index) => (
                <tr key={txn._id}>
                  <td className="text-slate-500">{index + 1}</td>
                  <td className="font-mono text-xs">{txn.transactionId}</td>
                  <td>{txn.user?.name || 'N/A'}</td>
                  <td>{getTransactionTypeLabel(txn.type)}</td>
                  <td className="text-right font-semibold">{formatCurrency(txn.amount)}</td>
                  <td className="whitespace-nowrap">{formatDate(txn.createdAt)}</td>
                  <td><Badge status={txn.status} /></td>
                </tr>
              ))}
              {!recentTransactions?.length && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-primary-400">{t('noData')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;