import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import adminPanelAPI from '../../services/adminPanelAPI';
import StatCard from '../../components/StatCard';
import PageHeader from '../../components/PageHeader';
import { BarChart, LineChart } from '../../components/Charts';
import { formatCurrency, formatDate, getTransactionTypeLabel, getErrorMessage } from '../../utils/helpers';
import { SkeletonCard } from '../../components/LoadingSpinner';
import Badge from '../../components/Badge';
import { ROLES } from '../../utils/roles';

const AdminDashboard = () => {
  const { t } = useTranslation();
  const { dashboardPath, role } = useAuth();
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
  const [emiTotalsPeriod, setEmiTotalsPeriod] = useState('today');

  const fetchDashboard = async () => {
    try {
      const [dashboardRes, usersRes, loansRes] = await Promise.all([
        adminPanelAPI.getDashboard(),
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
  }, []);

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

  const emiTotal =
    emiTotalsPeriod === 'today'
      ? cards.emiTotalToday
      : emiTotalsPeriod === 'week'
        ? cards.emiTotalWeekly
        : emiTotalsPeriod === 'month'
          ? cards.emiTotalMonthly
          : cards.emiTotalYearly;

  const interestTotal =
    emiTotalsPeriod === 'today'
      ? cards.interestTotalToday
      : emiTotalsPeriod === 'week'
        ? cards.interestTotalWeekly
        : emiTotalsPeriod === 'month'
          ? cards.interestTotalMonthly
          : cards.interestTotalYearly;

  const profitTotal =
    emiTotalsPeriod === 'today'
      ? cards.profitTotalToday
      : emiTotalsPeriod === 'week'
        ? cards.profitTotalWeekly
        : emiTotalsPeriod === 'month'
          ? cards.profitTotalMonthly
          : cards.profitTotalYearly;

  return (
    <div className="space-y-4 sm:space-y-8">
      <PageHeader
        title={t('adminDash.title')}
        subtitle={t('adminPanel')}
        actions={
          <Link to={`${base}/loans`} className="btn-accent text-xs sm:text-sm">
            {t('adminDash.openLoanManager')}
          </Link>
        }
      />

      <section>
        <p className="section-label">{t('adminDash.availableFund')} / {t('funds')}</p>
        <div className="grid grid-cols-2 xl:grid-cols-5 gap-2.5 sm:gap-4">
          <StatCard title={t('adminDash.availableFund')} value={formatCurrency(cards.availableFund)}  color="green" />
          <StatCard title={t('adminDash.companyFund')} value={formatCurrency(cards.companyFund)}  color="indigo" />
          <StatCard title={t('adminDash.totalUsers')} value={cards.totalUsers}  color="primary" />
          <StatCard title={t('adminDash.expenses')} value={formatCurrency(cards.expenses || cards.purchaseApprovedTotal || 0)} color="red" />
          <StatCard title={t('adminDash.profit')} value={formatCurrency(cards.profit)} color="green" />
        </div>
      </section>

      <section>
        <p className="section-label">{t('loans')}</p>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-2.5 sm:gap-4">
          <StatCard title={t('adminDash.totalLoans')} value={cards.totalLoans}  color="indigo" />
          <StatCard title={t('adminDash.activeLoans')} value={cards.activeLoans}  color="green" />
          <StatCard title={t('adminDash.pendingLoans')} value={cards.pendingLoans}  color="yellow" />
          <StatCard title={t('adminDash.closedLoans')} value={cards.closedLoans}  color="primary" />
        </div>
      </section>

      <section>
        <p className="section-label">{t('emis')}</p>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-2.5 sm:gap-4">
          <StatCard title={t('adminDash.todayEmi')} value={formatCurrency(cards.todayEMICollection)} color="green" />
          <StatCard title={t('adminDash.monthlyCollection')} value={formatCurrency(cards.monthlyCollection)} color="primary" />
          <StatCard title={t('adminDash.loanDistributed')} value={formatCurrency(cards.loanDistributed)} color="red" />
          <StatCard title={t('adminDash.emiCollected')} value={formatCurrency(cards.emiCollected)} color="green" />
        </div>
      </section>

      <section>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
          <p className="section-label !mb-0">{t('adminPurchases.expensesSection') || 'Purchases / Expenses'}</p>
          <Link to={`${base}/purchases`} className="text-[11px] sm:text-sm font-medium text-primary-600 hover:text-accent-600 dark:text-accent-300">
            {t('adminDash.viewAll')}
          </Link>
        </div>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-2.5 sm:gap-4">
          <StatCard
            title={t('adminPurchases.totalExpenses') || 'Approved Expenses'}
            value={formatCurrency(cards.purchaseApprovedTotal || cards.expenses || 0)}
            color="red"
          />
          <StatCard
            title={t('adminPurchases.approvedCount') || 'Approved Count'}
            value={cards.purchaseApprovedCount || 0}
            color="green"
          />
          <StatCard
            title={t('adminPurchases.pendingAmount') || 'Pending Amount'}
            value={formatCurrency(cards.purchasePendingTotal || 0)}
            color="yellow"
          />
          <StatCard
            title={t('adminPurchases.pendingCount') || 'Pending Requests'}
            value={cards.purchasePendingCount || 0}
            color="primary"
          />
        </div>
      </section>

      {/* EMI / Interest / Profit totals quick view (additive only) */}
      <section>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
          <p className="section-label !mb-0">{t('adminDash.emiTotals')}</p>
          <select
            className="input sm:w-56 text-xs sm:text-sm min-h-9 sm:min-h-11"
            value={emiTotalsPeriod}
            onChange={(e) => setEmiTotalsPeriod(e.target.value)}
          >
            <option value="today">{t('adminDash.today')}</option>
            <option value="week">{t('adminDash.thisWeek')}</option>
            <option value="month">{t('adminDash.thisMonth')}</option>
            <option value="year">{t('adminDash.thisYear')}</option>
          </select>
        </div>

        <div className="grid grid-cols-2 xl:grid-cols-3 gap-2.5 sm:gap-4 mt-3 sm:mt-4">
          <StatCard title={t('adminDash.emiTotal')} value={formatCurrency(emiTotal)} color="green" />
          <StatCard title={t('adminDash.interestTotal')} value={formatCurrency(interestTotal)} color="indigo" />
          <StatCard title={t('adminDash.profitTotal')} value={formatCurrency(profitTotal)} color="green" />
        </div>
      </section>
   <div className="card">
        <div className="card-header">
          <h3 className="font-semibold text-sm sm:text-base text-primary-900 dark:text-white">{t('adminDash.recentTransactions')}</h3>
        </div>
        <div className="mobile-list">
          {(recentTransactions || []).map((txn) => (
            <div key={txn._id} className="mobile-list-item">
              <div className="mobile-list-head">
                <div className="min-w-0">
                  <p className="mobile-list-title font-mono">{txn.transactionId}</p>
                  <p className="mobile-list-meta">{txn.user?.name}</p>
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
                  <span>{formatCurrency(txn.amount)}</span>
                </div>
                <div className="mobile-list-field col-span-2">
                  <label>{t('table.date')}</label>
                  <span>{formatDate(txn.createdAt)}</span>
                </div>
              </div>
            </div>
          ))}
          {!recentTransactions?.length && (
            <p className="py-6 text-center text-[12px] text-slate-500">{t('noData')}</p>
          )}
        </div>
        <div className="data-table-wrap desktop-table">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('table.id')}</th>
                <th>{t('table.user')}</th>
                <th>{t('table.type')}</th>
                <th className="text-right">{t('table.amount')}</th>
                <th>{t('table.date')}</th>
                <th>{t('table.status')}</th>
              </tr>
            </thead>
            <tbody>
              {recentTransactions?.map((txn) => (
                <tr key={txn._id}>
                  <td className="font-mono text-xs">{txn.transactionId}</td>
                  <td>{txn.user?.name}</td>
                  <td>{getTransactionTypeLabel(txn.type)}</td>
                  <td className="text-right font-semibold">{formatCurrency(txn.amount)}</td>
                  <td>{formatDate(txn.createdAt)}</td>
                  <td><Badge status={txn.status} /></td>
                </tr>
              ))}
              {!recentTransactions?.length && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-primary-400">{t('noData')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6">
        <div className="card card-chart">
          <div className="card-header">
            <h3 className="font-semibold text-sm sm:text-base text-primary-900 dark:text-white">{t('adminDash.monthlyLoans')}</h3>
          </div>
          <BarChart data={charts.monthlyLoans} label={t('adminDash.loanAmount')} color="#1e4463" />
        </div>
        <div className="card card-chart">
          <div className="card-header">
            <h3 className="font-semibold text-sm sm:text-base text-primary-900 dark:text-white">{t('adminDash.monthlyEmiCollection')}</h3>
          </div>
          <LineChart data={charts.monthlyEMI} label={t('adminDash.emiCollectedLabel')} color="#0d9488" />
        </div>
        <div className="card card-chart">
          <div className="card-header">
            <h3 className="font-semibold text-sm sm:text-base text-primary-900 dark:text-white">{t('adminDash.userGrowth')}</h3>
          </div>
          <BarChart data={charts.userGrowth} label={t('adminDash.newUsers')} color="#2d5a7b" />
        </div>
        <div className="card card-chart">
          <div className="card-header">
            <h3 className="font-semibold text-sm sm:text-base text-primary-900 dark:text-white">{t('adminDash.loanRecovery')}</h3>
          </div>
          <LineChart data={charts.loanRecovery} label={t('adminDash.principalRecovered')} color="#c99a2e" />
        </div>
      </div>

   

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 sm:gap-6">
        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold text-sm sm:text-base text-primary-900 dark:text-white">{t('adminDash.joinedUsers')}</h3>
            <Link to={`${base}/users`} className="text-[11px] sm:text-sm font-medium text-primary-600 hover:text-accent-600 dark:text-accent-300">
              {t('adminDash.viewAll')}
            </Link>
          </div>
          <div className="mobile-list">
            {users.map((u) => (
              <div key={u._id} className="mobile-list-item">
                <div className="mobile-list-head">
                  <div className="min-w-0">
                    <Link to={`${base}/users/${u._id}`} className="mobile-list-title link-accent">
                      {u.name}
                    </Link>
                    <p className="mobile-list-meta">{u.email || u.mobile || '-'}</p>
                  </div>
                </div>
                <div className="mobile-list-grid">
                  <div className="mobile-list-field">
                    <label>{t('adminUsers.selectAdmin')}</label>
                    <span>{u.adminId?.name || '-'}</span>
                  </div>
                  <div className="mobile-list-field">
                    <label>{t('table.wallet')}</label>
                    <span>{formatCurrency(u.walletBalance || 0)}</span>
                  </div>
                  <div className="mobile-list-field col-span-2">
                    <label>{t('ui.joined')}</label>
                    <span>{formatDate(u.createdAt)}</span>
                  </div>
                </div>
              </div>
            ))}
            {!users.length && (
              <p className="py-6 text-center text-[12px] text-slate-500">{t('adminDash.noUsers')}</p>
            )}
          </div>
          <div className="data-table-wrap desktop-table">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('table.name')}</th>
                  <th>{t('table.email')}</th>
                  <th>{t('adminUsers.selectAdmin')}</th>
                  <th>{t('ui.joined')}</th>
                  <th className="text-right">{t('table.wallet')}</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u._id}>
                    <td className="font-medium">
                      <Link to={`${base}/users/${u._id}`} className="text-primary-700 hover:underline">
                        {u.name}
                      </Link>
                    </td>
                    <td className="text-primary-500">{u.email || u.mobile || '-'}</td>
                    <td>{u.adminId?.name || '-'}</td>
                    <td>{formatDate(u.createdAt)}</td>
                    <td className="text-right font-semibold">{formatCurrency(u.walletBalance || 0)}</td>
                  </tr>
                ))}
                {!users.length && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-primary-400">{t('adminDash.noUsers')}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {isSuperAdmin && (
          <div className="card">
            <div className="card-header">
              <h3 className="font-semibold text-sm sm:text-base text-primary-900 dark:text-white">
                {t('adminPurchases.adminList') || 'Admin List'}
              </h3>
              <Link to={`${base}/manage-admins`} className="text-[11px] sm:text-sm font-medium text-primary-600 hover:text-accent-600 dark:text-accent-300">
                {t('adminDash.viewAll')}
              </Link>
            </div>
            <div className="mobile-list">
              {(data.admins || []).map((admin) => (
                <div key={admin._id} className="mobile-list-item">
                  <div className="mobile-list-head">
                    <div className="min-w-0">
                      <p className="mobile-list-title">{admin.name}</p>
                      <p className="mobile-list-meta">{admin.email || '-'}</p>
                    </div>
                    <Badge status={admin.isActive !== false ? 'active' : 'inactive'} />
                  </div>
                  <div className="mobile-list-grid">
                    <div className="mobile-list-field col-span-2">
                      <label>{t('table.mobile') || 'Mobile'}</label>
                      <span>{admin.mobile || '-'}</span>
                    </div>
                  </div>
                </div>
              ))}
              {!(data.admins || []).length && (
                <p className="py-6 text-center text-[12px] text-slate-500">{t('noData')}</p>
              )}
            </div>
            <div className="data-table-wrap desktop-table">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t('table.name')}</th>
                    <th>{t('table.email')}</th>
                    <th>{t('table.mobile') || 'Mobile'}</th>
                    <th>{t('table.status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.admins || []).map((admin) => (
                    <tr key={admin._id}>
                      <td className="font-medium">{admin.name}</td>
                      <td>{admin.email || '-'}</td>
                      <td>{admin.mobile || '-'}</td>
                      <td>
                        <Badge status={admin.isActive !== false ? 'active' : 'inactive'} />
                      </td>
                    </tr>
                  ))}
                  {!(data.admins || []).length && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-primary-400">{t('noData')}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold text-sm sm:text-base text-primary-900 dark:text-white">
            {t('adminPurchases.pendingRequests') || 'Pending Purchase Requests'}
          </h3>
          <Link to={`${base}/purchases`} className="text-[11px] sm:text-sm font-medium text-primary-600 hover:text-accent-600 dark:text-accent-300">
            {t('adminDash.viewAll')}
          </Link>
        </div>
        <div className="mobile-list">
          {(data.pendingPurchases || []).map((p) => (
            <div key={p._id} className="mobile-list-item">
              <div className="mobile-list-head">
                <div className="min-w-0">
                  <p className="mobile-list-title">{p.itemName}</p>
                  {isSuperAdmin && <p className="mobile-list-meta">{p.requestedBy?.name || '-'}</p>}
                </div>
                <Badge status={p.status} />
              </div>
              <div className="mobile-list-grid">
                <div className="mobile-list-field">
                  <label>{t('table.amount')}</label>
                  <span>{formatCurrency(p.amount)}</span>
                </div>
                <div className="mobile-list-field">
                  <label>{t('adminPurchases.date') || 'Date'}</label>
                  <span>{formatDate(p.purchaseDate)}</span>
                </div>
                {p.billPhoto && (
                  <div className="mobile-list-field col-span-2">
                    <label>{t('adminPurchases.bill') || 'Bill'}</label>
                    <a href={p.billPhoto} target="_blank" rel="noreferrer" className="link-accent text-xs">
                      View
                    </a>
                  </div>
                )}
              </div>
              {isSuperAdmin && (
                <div className="mobile-list-actions">
                  <button
                    type="button"
                    onClick={() => handlePurchaseStatus(p._id, 'approve')}
                    disabled={!!purchaseActionLoading}
                    className="btn-success action-chip"
                  >
                    {t('loan.approve')}
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePurchaseStatus(p._id, 'reject')}
                    disabled={!!purchaseActionLoading}
                    className="btn-danger action-chip"
                  >
                    {t('loan.reject')}
                  </button>
                </div>
              )}
            </div>
          ))}
          {!(data.pendingPurchases || []).length && (
            <p className="py-6 text-center text-[12px] text-slate-500">
              {t('adminPurchases.noPending') || 'No pending purchase requests'}
            </p>
          )}
        </div>
        <div className="data-table-wrap desktop-table">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('adminPurchases.item') || 'Item'}</th>
                {isSuperAdmin && <th>{t('ui.admin') || 'Admin'}</th>}
                <th className="text-right">{t('table.amount')}</th>
                <th>{t('adminPurchases.date') || 'Date'}</th>
                <th>{t('adminPurchases.bill') || 'Bill'}</th>
                <th>{t('table.status')}</th>
                {isSuperAdmin && <th className="text-right">{t('table.action')}</th>}
              </tr>
            </thead>
            <tbody>
              {(data.pendingPurchases || []).map((p) => (
                <tr key={p._id}>
                  <td className="font-medium">{p.itemName}</td>
                  {isSuperAdmin && <td>{p.requestedBy?.name || '-'}</td>}
                  <td className="text-right font-semibold">{formatCurrency(p.amount)}</td>
                  <td>{formatDate(p.purchaseDate)}</td>
                  <td>
                    {p.billPhoto ? (
                      <a href={p.billPhoto} target="_blank" rel="noreferrer" className="link-accent text-xs">
                        View
                      </a>
                    ) : '-'}
                  </td>
                  <td><Badge status={p.status} /></td>
                  {isSuperAdmin && (
                    <td className="text-right">
                      <div className="inline-flex flex-wrap gap-2 justify-end">
                        <button
                          type="button"
                          onClick={() => handlePurchaseStatus(p._id, 'approve')}
                          disabled={!!purchaseActionLoading}
                          className="btn-success text-xs py-1.5 px-2.5 min-h-0"
                        >
                          {t('loan.approve')}
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePurchaseStatus(p._id, 'reject')}
                          disabled={!!purchaseActionLoading}
                          className="btn-danger text-xs py-1.5 px-2.5 min-h-0"
                        >
                          {t('loan.reject')}
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {!(data.pendingPurchases || []).length && (
                <tr>
                  <td colSpan={isSuperAdmin ? 7 : 5} className="py-8 text-center text-primary-400">
                    {t('adminPurchases.noPending') || 'No pending purchase requests'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold text-sm sm:text-base text-primary-900 dark:text-white">{t('adminDash.pendingApplications')}</h3>
          <Link to={`${base}/loans`} className="text-[11px] sm:text-sm font-medium text-primary-600 hover:text-accent-600 dark:text-accent-300">
            {t('adminDash.openLoanManager')}
          </Link>
        </div>
        <div className="mobile-list">
          {pendingLoans.map((loan) => (
            <div key={loan._id} className="mobile-list-item">
              <div className="mobile-list-head">
                <div className="min-w-0">
                  <p className="mobile-list-title">{loan.loanId}</p>
                  <p className="mobile-list-meta">{loan.user?.name}</p>
                </div>
                <Badge status={loan.status} />
              </div>
              <div className="mobile-list-grid">
                <div className="mobile-list-field">
                  <label>{t('table.amount')}</label>
                  <span>{formatCurrency(loan.amount)}</span>
                </div>
                <div className="mobile-list-field">
                  <label>{t('table.type')}</label>
                  <span className="capitalize">{loan.loanType}</span>
                </div>
                <div className="mobile-list-field col-span-2">
                  <label>{t('table.date')}</label>
                  <span>{formatDate(loan.createdAt)}</span>
                </div>
              </div>
              <div className="mobile-list-actions">
                <button
                  type="button"
                  onClick={() => handleLoanStatus(loan._id, 'approved')}
                  disabled={loanActionLoading === `${loan._id}-approved`}
                  className="btn-success action-chip"
                >
                  {t('loan.approve')}
                </button>
                <button
                  type="button"
                  onClick={() => handleLoanStatus(loan._id, 'rejected')}
                  disabled={loanActionLoading === `${loan._id}-rejected`}
                  className="btn-danger action-chip"
                >
                  {t('loan.reject')}
                </button>
              </div>
            </div>
          ))}
          {!pendingLoans.length && (
            <p className="py-6 text-center text-[12px] text-slate-500">{t('adminDash.noPendingLoans')}</p>
          )}
        </div>
        <div className="data-table-wrap desktop-table">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('table.loanId')}</th>
                <th>{t('table.user')}</th>
                <th className="text-right">{t('table.amount')}</th>
                <th>{t('table.type')}</th>
                <th>{t('table.date')}</th>
                <th>{t('table.status')}</th>
                <th className="text-right">{t('table.action')}</th>
              </tr>
            </thead>
            <tbody>
              {pendingLoans.map((loan) => (
                <tr key={loan._id}>
                  <td className="font-medium">{loan.loanId}</td>
                  <td>{loan.user?.name}</td>
                  <td className="text-right font-semibold">{formatCurrency(loan.amount)}</td>
                  <td className="capitalize">{loan.loanType}</td>
                  <td>{formatDate(loan.createdAt)}</td>
                  <td><Badge status={loan.status} /></td>
                  <td className="text-right">
                    <div className="inline-flex flex-wrap gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => handleLoanStatus(loan._id, 'approved')}
                        disabled={loanActionLoading === `${loan._id}-approved`}
                        className="btn-success text-xs py-1.5 px-2.5 min-h-0"
                      >
                        {t('loan.approve')}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleLoanStatus(loan._id, 'rejected')}
                        disabled={loanActionLoading === `${loan._id}-rejected`}
                        className="btn-danger text-xs py-1.5 px-2.5 min-h-0"
                      >
                        {t('loan.reject')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!pendingLoans.length && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-primary-400">{t('adminDash.noPendingLoans')}</td>
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
