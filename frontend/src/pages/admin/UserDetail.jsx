import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import adminPanelAPI from '../../services/adminPanelAPI';
import { formatCurrency, formatDate, getErrorMessage, getFullName, getShortName } from '../../utils/helpers';
import { PAYMENT_METHODS } from '../../utils/roles';
import Badge from '../../components/Badge';
import Modal from '../../components/Modal';
import { PageLoader } from '../../components/LoadingSpinner';
import { HiArrowLeft, HiEye, HiEyeOff } from 'react-icons/hi';

/**
 * Admin / Super Admin — full detail of a joined user (loans + EMIs)
 */
const UserDetail = () => {
  const { id } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { dashboardPath } = useAuth();
  const base = dashboardPath?.startsWith('/super-admin') ? '/super-admin' : '/admin';

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [collectEmi, setCollectEmi] = useState(null);
  const [penaltyEmi, setPenaltyEmi] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [penalty, setPenalty] = useState(0);
  const [expandedLoans, setExpandedLoans] = useState({});

  const loadUserDetail = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const res = await adminPanelAPI.getUser(id);
      setData(res.data.data);
    } catch (error) {
      toast.error(getErrorMessage(error));
      navigate(`${base}/users`);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    loadUserDetail();
  }, [id, base, navigate]);

  const toggleLoanExpand = (loanId) => {
    setExpandedLoans(prev => ({
      ...prev,
      [loanId]: !prev[loanId],
    }));
  };

  if (loading) return <PageLoader />;
  if (!data?.user) return null;

  const { user, profile, loans = [], emis = [], summary = {} } = data;
  const owningAdmin = user.adminId;
  const totalDue = (emi) => (emi?.amount || 0) + (emi?.penalty || 0) + (emi?.lateFee || 0);

  // Group EMIs by Loan ID (using loan._id as key)
  const groupedEmis = {};
  emis.forEach((emi) => {
    const loanId = emi.loan; // This is the loan's _id

    if (!groupedEmis[loanId]) {
      groupedEmis[loanId] = [];
    }
    groupedEmis[loanId].push(emi);
  });

  // Function to get EMIs for a loan
  const getLoanEmis = (loan) => {
    const loanId = loan._id;
    return groupedEmis[loanId] || [];
  };

  const handleCollect = async () => {
    if (!collectEmi) return;
    try {
      await adminPanelAPI.collectEMI(collectEmi._id, { paymentMethod, referenceNumber });
      toast.success(t('adminEmis.collected'));
      setCollectEmi(null);
      setReferenceNumber('');
      await loadUserDetail(false);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleUpdatePenalty = async () => {
    if (!penaltyEmi) return;
    try {
      await adminPanelAPI.addPenalty(penaltyEmi._id, { penalty: parseFloat(penalty || 0) });
      toast.success(t('adminEmis.penaltyUpdated'));
      setPenaltyEmi(null);
      await loadUserDetail(false);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => navigate(`${base}/users`)} className="btn-secondary p-2">
          <HiArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold">{getFullName(user)}</h1>
          <p className="text-sm text-gray-500">{t('userDetail.subtitle')}</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <div className="card p-3">
          <p className="text-xs text-gray-500">{t('userDetail.totalLoans')}</p>
          <p className="text-xl font-bold">{summary.totalLoans ?? 0}</p>
        </div>
        <div className="card p-3">
          <p className="text-xs text-gray-500">{t('userDetail.totalEmis', { defaultValue: 'Total EMIs' })}</p>
          <p className="text-xl font-bold">{summary.totalEmis ?? 0}</p>
        </div>
        <div className="card p-3">
          <p className="text-xs text-gray-500">{t('userDetail.activeLoans')}</p>
          <p className="text-xl font-bold">{summary.activeLoans ?? 0}</p>
        </div>
        <div className="card p-3">
          <p className="text-xs text-gray-500">{t('userDetail.pendingEmis')}</p>
          <p className="text-xl font-bold">{summary.pendingEmis ?? 0}</p>
        </div>
        <div className="card p-3">
          <p className="text-xs text-gray-500">{t('userDetail.overdueEmis')}</p>
          <p className="text-xl font-bold text-red-600">{summary.overdueEmis ?? 0}</p>
        </div>
        <div className="card p-3">
          <p className="text-xs text-gray-500">{t('userDetail.paidEmis')}</p>
          <p className="text-xl font-bold">{summary.paidEmis ?? 0}</p>
        </div>
        <div className="card p-3">
          <p className="text-xs text-gray-500">{t('userDetail.pendingAmount')}</p>
          <p className="text-xl font-bold">{formatCurrency(summary.pendingEmiAmount)}</p>
        </div>
        <div className="card p-3">
          <p className="text-xs text-gray-500">{t('userDetail.overdueAmount', { defaultValue: 'Overdue Amount' })}</p>
          <p className="text-xl font-bold text-red-600">{formatCurrency(summary.overdueEmiAmount)}</p>
        </div>
      </div>

      {/* User Info */}
      <div className="card p-4 sm:p-6">
        <h2 className="font-semibold mb-4">{t('userDetail.userInfo')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div><span className="text-gray-500">{t('email')}:</span> {user.email || '-'}</div>
          <div><span className="text-gray-500">{t('mobile')}:</span> {user.mobile || profile?.phone || '-'}</div>
          <div><span className="text-gray-500">{t('table.wallet')}:</span> {formatCurrency(user.walletBalance)}</div>
          <div>
            <span className="text-gray-500">{t('table.status')}:</span>{' '}
            {user.isSuspended ? t('ui.suspended') : user.isActive ? t('ui.active') : t('ui.inactive')}
          </div>
          <div>
            <span className="text-gray-500">{t('userDetail.underAdmin')}:</span>{' '}
            {getShortName(owningAdmin)}
            {owningAdmin?.commissionRate != null ? ` (${owningAdmin.commissionRate}%)` : ''}
          </div>
          <div><span className="text-gray-500">{t('ui.joined')}:</span> {formatDate(user.createdAt)}</div>
        </div>
      </div>

      {/* Loans Table with Expandable EMIs */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b dark:border-gray-700">
          <h2 className="font-semibold">{t('userDetail.loans')} ({loans.length})</h2>
        </div>

        {loans.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b dark:border-gray-700 bg-slate-50 dark:bg-slate-800">
                  <th className="p-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300">#</th>
                  <th className="p-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300">Loan ID</th>
                  <th className="p-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-300">Amount</th>
                  <th className="p-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-300">Pending Amt</th>
                  <th className="p-3 text-center text-xs font-semibold text-slate-600 dark:text-slate-300">Total EMI</th>
                  <th className="p-3 text-center text-xs font-semibold text-slate-600 dark:text-slate-300">Pending EMI</th>
                  <th className="p-3 text-center text-xs font-semibold text-slate-600 dark:text-slate-300">Status</th>
                  <th className="p-3 text-center text-xs font-semibold text-slate-600 dark:text-slate-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loans.map((loan, index) => {
                  const loanEmis = getLoanEmis(loan);

                  const pendingEmis = loanEmis.filter(e =>
                    e.status === 'pending' ||
                    e.status === 'overdue' ||
                    e.status === 'partial' ||
                    e.status === 'pending_collection'
                  );

                  const totalEmis = loanEmis.length;
                  const pendingAmount = loanEmis
                    .filter(e => e.status === 'pending' || e.status === 'overdue' || e.status === 'partial')
                    .reduce((sum, e) => sum + (e.amount || 0) + (e.penalty || 0), 0);

                  return (
                    <>
                      <tr key={loan._id} className="border-b dark:border-gray-700/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="p-3 text-slate-500">{index + 1}</td>
                        <td className="p-3 font-medium text-primary-600">{loan.loanId || loan._id?.slice(-6)}</td>
                        <td className="p-3 text-right">{formatCurrency(loan.amount)}</td>
                        <td className="p-3 text-right text-amber-600 font-medium">{formatCurrency(pendingAmount)}</td>
                        <td className="p-3 text-center font-medium text-blue-600">{totalEmis}</td>
                        <td className="p-3 text-center">
                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${pendingEmis.length > 0
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                            }`}>
                            {pendingEmis.length}
                          </span>
                        </td>
                        <td className="p-3 text-center"><Badge status={loan.status} /></td>
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => toggleLoanExpand(loan._id)}
                            className="inline-flex items-center justify-center p-2 rounded-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 shadow-sm transition-colors"
                            title={expandedLoans[loan._id] ? 'Hide EMIs' : 'View EMIs'}
                          >
                            {expandedLoans[loan._id]
                              ? <HiEyeOff className="w-4 h-4 text-primary-600" />
                              : <HiEye className="w-4 h-4 text-slate-500" />
                            }
                          </button>
                        </td>
                      </tr>

                      {/* Expanded EMI Details Row */}
                      {expandedLoans[loan._id] && (
                        <tr>
                          <td colSpan="8" className="p-0">
                            <div className="bg-slate-50/50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700">
                              {loanEmis.length > 0 ? (
                                <>
                                  <div className="px-4 py-2 text-xs font-semibold text-slate-500 flex flex-wrap gap-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                                    <span>📊 Total EMIs: <span className="text-blue-600">{totalEmis}</span></span>
                                    <span className={pendingEmis.length > 0 ? 'text-amber-600' : 'text-emerald-600'}>
                                      ⏳ Pending: {pendingEmis.length}
                                    </span>
                                    {pendingAmount > 0 && (
                                      <span className="text-amber-600">
                                        💰 Pending Amount: {formatCurrency(pendingAmount)}
                                      </span>
                                    )}
                                  </div>
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                      <thead className="bg-transparent">
                                        <tr className="border-b dark:border-gray-700 text-left">
                                          <th className="pl-4 p-2 text-xs font-medium text-slate-500 whitespace-nowrap">EMI #</th>
                                          <th className="p-2 text-right text-xs font-medium text-slate-500 whitespace-nowrap">Amount</th>
                                          <th className="p-2 text-right text-xs font-medium text-slate-500 whitespace-nowrap">Penalty</th>
                                          <th className="p-2 text-right text-xs font-medium text-slate-500 whitespace-nowrap">Late Fee</th>
                                          <th className="p-2 text-xs font-medium text-slate-500 whitespace-nowrap">Due Date</th>
                                          <th className="p-2 text-xs font-medium text-slate-500 whitespace-nowrap">Paid Date</th>
                                          <th className="p-2 text-center text-xs font-medium text-slate-500 whitespace-nowrap">Status</th>
                                          <th className="p-2 text-right text-xs font-medium text-slate-500 whitespace-nowrap">Actions</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {loanEmis.map((emi) => (
                                          <tr key={emi._id} className="border-b dark:border-gray-700/50 hover:bg-white dark:hover:bg-slate-700/50 transition-colors bg-white dark:bg-slate-800">
                                            <td className="pl-4 p-2 font-medium whitespace-nowrap">
                                              {emi.emiNumber ? emi.emiNumber.replace(/^[^-]+-/, '') : 'N/A'}
                                            </td>
                                            <td className="p-2 text-right whitespace-nowrap">{formatCurrency(emi.amount)}</td>
                                            <td className="p-2 text-right text-red-500 whitespace-nowrap">{formatCurrency(emi.penalty || 0)}</td>
                                            <td className="p-2 text-right text-orange-500 whitespace-nowrap">{formatCurrency(emi.lateFee || 0)}</td>
                                            <td className="p-2 whitespace-nowrap">{formatDate(emi.dueDate)}</td>
                                            <td className="p-2 whitespace-nowrap">{formatDate(emi.paidDate) || 'N/A'}</td>
                                            <td className="p-2 text-center whitespace-nowrap">
                                              <Badge status={emi.status} />
                                            </td>
                                            <td className="p-2 text-right whitespace-nowrap">
                                              {(emi.status === 'pending' || emi.status === 'overdue' || emi.status === 'partial' || emi.status === 'pending_collection') && (
                                                <div className="flex gap-2 justify-end whitespace-nowrap">
                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      setCollectEmi(emi);
                                                      setPaymentMethod('cash');
                                                      setReferenceNumber('');
                                                    }}
                                                    className="btn-success text-xs py-1 px-2 whitespace-nowrap"
                                                  >
                                                    {t('adminEmis.collectBtn')}
                                                  </button>
                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      setPenaltyEmi(emi);
                                                      setPenalty(emi.penalty || 0);
                                                    }}
                                                    className="btn-secondary text-xs py-1 px-2 whitespace-nowrap"
                                                  >
                                                    {t('adminEmis.penaltyBtn')}
                                                  </button>
                                                </div>
                                              )}
                                              {emi.status === 'paid' && (
                                                <span className="text-xs text-emerald-600 font-medium whitespace-nowrap">✓ Paid</span>
                                              )}
                                              {emi.status === 'closed' && (
                                                <span className="text-xs text-gray-500 font-medium whitespace-nowrap">Closed</span>
                                              )}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </>
                              ) : (
                                <div className="p-4 text-center text-sm text-gray-500">
                                  No EMIs found for this loan
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="p-4 text-center text-gray-500">{t('userDetail.noLoans')}</p>
        )}
      </div>

      {/* Collect EMI Modal */}
      <Modal isOpen={!!collectEmi} onClose={() => setCollectEmi(null)} title={t('adminEmis.collectTitle')}>
        <div className="space-y-4">
          <p className="text-sm text-gray-500">EMI #{collectEmi?.emiNumber} — {user?.name}</p>
          <p className="text-lg font-bold">{t('ui.total')}: {formatCurrency(totalDue(collectEmi))}</p>
          <div>
            <label className="label">{t('emi.paymentMethod')}</label>
            <select className="input" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
              {PAYMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {t(`paymentMethod.${m.value}`)}
                </option>
              ))}
            </select>
          </div>
          <div>
            {/* <label className="label">{t('adminEmis.referenceNumber')}</label> */}
            {/* <input
              className="input"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder={t('adminEmis.referencePlaceholder')}
            /> */}
          </div>
          <button type="button" onClick={handleCollect} className="btn-success w-full">
            {t('adminEmis.confirmCollection')}
          </button>
        </div>
      </Modal>

      {/* Penalty Modal */}
      <Modal isOpen={!!penaltyEmi} onClose={() => setPenaltyEmi(null)} title={t('adminEmis.penaltyTitle')}>
        <div className="space-y-4">
          <p>EMI #{penaltyEmi?.emiNumber}</p>
          <div>
            <label className="label">{t('adminEmis.penaltyAmount')}</label>
            <input type="number" className="input" value={penalty} onChange={(e) => setPenalty(e.target.value)} />
          </div>
          <button type="button" onClick={handleUpdatePenalty} className="btn-primary w-full">
            {t('adminEmis.updatePenalty')}
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default UserDetail;