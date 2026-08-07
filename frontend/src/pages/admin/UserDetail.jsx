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
import { HiArrowLeft } from 'react-icons/hi';

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

  if (loading) return <PageLoader />;
  if (!data?.user) return null;

  const { user, profile, loans = [], emis = [], summary = {} } = data;
  const owningAdmin = user.adminId;
  const totalDue = (emi) => (emi?.amount || 0) + (emi?.penalty || 0) + (emi?.lateFee || 0);

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
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => navigate(`${base}/users`)} className="btn-secondary p-2">
          <HiArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold">{getFullName(user)}</h1>
          <p className="text-sm text-gray-500">{t('userDetail.subtitle')}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        <div className="card p-3">
          <p className="text-xs text-gray-500">{t('userDetail.totalLoans')}</p>
          <p className="text-xl font-bold">{summary.totalLoans ?? 0}</p>
        </div>
        <div className="card p-3">
          <p className="text-xs text-gray-500">
            {t('userDetail.totalEmis', { defaultValue: 'Total EMIs' })}
          </p>
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

      <div className="card overflow-x-auto">
        <div className="p-4 border-b dark:border-gray-700">
          <h2 className="font-semibold">{t('userDetail.loans')} ({loans.length})</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b dark:border-gray-700 text-left">
              <th className="p-3">{t('table.loanId')}</th>
              <th className="p-3">{t('table.amount')}</th>
              <th className="p-3">{t('table.status')}</th>
              <th className="p-3">{t('table.created')}</th>
            </tr>
          </thead>
          <tbody>
            {loans.map((loan) => (
              <tr key={loan._id} className="border-b dark:border-gray-700/50">
                <td className="p-3 font-medium">{loan.loanId || loan._id?.slice(-6)}</td>
                <td className="p-3">{formatCurrency(loan.amount)}</td>
                <td className="p-3"><Badge status={loan.status} /></td>
                <td className="p-3">{formatDate(loan.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loans.length && <p className="p-4 text-center text-gray-500">{t('userDetail.noLoans')}</p>}
      </div>

      <div className="card overflow-x-auto">
        <div className="p-4 border-b dark:border-gray-700">
          <h2 className="font-semibold">{t('userDetail.emis')} ({emis.length})</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b dark:border-gray-700 text-left">
              <th className="p-3">EMI #</th>
              <th className="p-3">{t('table.amount')}</th>
              <th className="p-3">{t('emi.dueDate')}</th>
              <th className="p-3">{t('table.status')}</th>
              <th className="p-3">{t('userDetail.pending')}</th>
              <th className="p-3 text-right">{t('table.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {emis.map((emi) => (
              <tr key={emi._id} className="border-b dark:border-gray-700/50">
                <td className="p-3">{emi.emiNumber}</td>
                <td className="p-3">{formatCurrency(emi.amount)}</td>
                <td className="p-3">{formatDate(emi.dueDate)}</td>
                <td className="p-3"><Badge status={emi.status} /></td>
                <td className="p-3">{formatCurrency(emi.pendingAmount)}</td>
                <td className="p-3 text-right">
                  {(emi.status === 'pending' || emi.status === 'overdue' || emi.status === 'partial' || emi.status === 'pending_collection') && (
                    <div className="flex gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setCollectEmi(emi);
                          setPaymentMethod('cash');
                          setReferenceNumber('');
                        }}
                        className="btn-success text-xs py-1 px-2"
                      >
                        {t('adminEmis.collectBtn')}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPenaltyEmi(emi);
                          setPenalty(emi.penalty || 0);
                        }}
                        className="btn-secondary text-xs py-1 px-2"
                      >
                        {t('adminEmis.penaltyBtn')}
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!emis.length && <p className="p-4 text-center text-gray-500">{t('userDetail.noEmis')}</p>}
      </div>

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
            <label className="label">{t('adminEmis.referenceNumber')}</label>
            <input
              className="input"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder={t('adminEmis.referencePlaceholder')}
            />
          </div>
          <button type="button" onClick={handleCollect} className="btn-success w-full">
            {t('adminEmis.confirmCollection')}
          </button>
        </div>
      </Modal>

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
