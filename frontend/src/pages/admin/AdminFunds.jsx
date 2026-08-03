import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import adminPanelAPI from '../../services/adminPanelAPI';
import { formatCurrency, formatDate, getErrorMessage } from '../../utils/helpers';
import StatCard from '../../components/StatCard';
import Modal from '../../components/Modal';
import PageHeader from '../../components/PageHeader';
import { HiCurrencyRupee } from 'react-icons/hi';
import { PageLoader } from '../../components/LoadingSpinner';

const AdminFunds = () => {
  const { t } = useTranslation();
  const [fund, setFund] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [actionType, setActionType] = useState('deposit');
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const fetchFund = async () => {
    try {
      const res = await adminPanelAPI.getFunds();
      setFund(res.data.data);
    } catch {
      toast.error(t('adminDash.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFund(); }, []);

  const openAction = (type) => {
    setActionType(type);
    reset({ amount: '', description: '' });
    setShowModal(true);
  };

  const onSubmit = async (data) => {
    try {
      await adminPanelAPI.updateFund({
        amount: parseFloat(data.amount),
        type: actionType,
        description: data.description,
      });
      toast.success(t('adminDash.fundUpdated'));
      setShowModal(false);
      fetchFund();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  if (loading) return <PageLoader />;

  const actionTitle =
    actionType === 'deposit'
      ? t('adminDash.deposit')
      : actionType === 'withdrawal'
        ? t('adminDash.withdraw')
        : t('adminDash.addExpense');

  const history = fund?.history?.length > 0 ? fund.history.slice().reverse().slice(0, 20) : [];

  return (
    <div className="page-stack">
      <PageHeader
        title={t('adminDash.fundManagement')}
        actions={
          <>
            <button type="button" onClick={() => openAction('deposit')} className="btn-success action-chip">{t('adminDash.deposit')}</button>
            <button type="button" onClick={() => openAction('withdrawal')} className="btn-secondary action-chip">{t('adminDash.withdraw')}</button>
            <button type="button" onClick={() => openAction('expense')} className="btn-danger action-chip">{t('adminDash.addExpense')}</button>
          </>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard title={t('adminDash.companyFund')} value={formatCurrency(fund?.companyFund)} icon={HiCurrencyRupee} color="primary" />
        <StatCard title={t('adminDash.availableFund')} value={formatCurrency(fund?.availableFund)} icon={HiCurrencyRupee} color="green" />
        <StatCard title={t('adminDash.loanDistributed')} value={formatCurrency(fund?.loanDistributed)} icon={HiCurrencyRupee} color="red" />
        <StatCard title={t('adminDash.emiCollected')} value={formatCurrency(fund?.emiCollected)} icon={HiCurrencyRupee} color="green" />
        <StatCard title={t('adminDash.expenses')} value={formatCurrency(fund?.expenses)} icon={HiCurrencyRupee} color="yellow" />
        <StatCard title={t('adminDash.profit')} value={formatCurrency(fund?.profit)} icon={HiCurrencyRupee} color="indigo" />
      </div>

      {history.length > 0 && (
        <>
          <h3 className="font-semibold text-sm">{t('adminDash.fundHistory')}</h3>

          <div className="card">
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t('table.srNo')}</th>
                    <th>{t('table.type')}</th>
                    <th className="text-right">{t('table.amount')}</th>
                    <th>{t('table.description')}</th>
                    <th>{t('table.date')}</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h, i) => (
                    <tr key={i}>
                      <td className="text-slate-500">{i + 1}</td>
                      <td className="capitalize">{h.type}</td>
                      <td className="text-right">{formatCurrency(h.amount)}</td>
                      <td>{h.description || 'N/A'}</td>
                      <td className="whitespace-nowrap">{formatDate(h.date || h.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={actionTitle}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div>
            <label className="label">{t('table.amount')}</label>
            <input
              type="number"
              className="input"
              placeholder={t('adminDash.enterAmount')}
              {...register('amount', { required: t('required') })}
            />
            {errors.amount && <p className="text-red-500 text-sm">{errors.amount.message}</p>}
          </div>
          <div>
            <label className="label">{t('table.description')}</label>
            <input className="input" placeholder={t('adminDash.optionalNote')} {...register('description')} />
          </div>
          <button type="submit" className="btn-primary w-full">{t('submit')}</button>
        </form>
      </Modal>
    </div>
  );
};

export default AdminFunds;
