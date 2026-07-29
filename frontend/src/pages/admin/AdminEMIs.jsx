import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import adminPanelAPI from '../../services/adminPanelAPI';
import { formatCurrency, formatDate, getErrorMessage } from '../../utils/helpers';
import { PAYMENT_METHODS } from '../../utils/roles';
import Badge from '../../components/Badge';
import Pagination from '../../components/Pagination';
import Modal from '../../components/Modal';
import PageHeader from '../../components/PageHeader';
import { PageLoader } from '../../components/LoadingSpinner';
import { HiDownload } from 'react-icons/hi';

const AdminEMIs = () => {
  const { t } = useTranslation();
  const [emis, setEmis] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [collectEmi, setCollectEmi] = useState(null);
  const [partialEmi, setPartialEmi] = useState(null);
  const [penaltyEmi, setPenaltyEmi] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [partialAmount, setPartialAmount] = useState('');
  const [penalty, setPenalty] = useState(0);
  const [referenceNumber, setReferenceNumber] = useState('');

  const fetchEMIs = async () => {
    setLoading(true);
    try {
      const res = await adminPanelAPI.getEMIs({ page, limit: 10, status });
      setEmis(res.data.data);
      setMeta(res.data.meta);
    } catch {
      toast.error(t('adminEmis.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEMIs(); }, [page, status]);

  const handleCollect = async () => {
    try {
      await adminPanelAPI.collectEMI(collectEmi._id, { paymentMethod, referenceNumber });
      toast.success(t('adminEmis.collected'));
      setCollectEmi(null);
      fetchEMIs();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handlePartialPay = async () => {
    try {
      await adminPanelAPI.partialPayEMI(partialEmi._id, {
        amount: parseFloat(partialAmount),
        paymentMethod,
        referenceNumber,
      });
      toast.success(t('adminEmis.partialRecorded'));
      setPartialEmi(null);
      setPartialAmount('');
      fetchEMIs();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleUpdatePenalty = async () => {
    try {
      await adminPanelAPI.addPenalty(penaltyEmi._id, { penalty: parseFloat(penalty) });
      toast.success(t('adminEmis.penaltyUpdated'));
      setPenaltyEmi(null);
      fetchEMIs();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleDownload = async (id, receiptNumber) => {
    try {
      const res = await adminPanelAPI.downloadReceipt(id);
      const url = window.URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt-${receiptNumber || id}.pdf`;
      a.click();
    } catch {
      toast.error(t('adminEmis.downloadFailed'));
    }
  };

  const totalDue = (emi) => (emi?.amount || 0) + (emi?.penalty || 0) + (emi?.lateFee || 0);

  const statusOptions = ['', 'pending', 'partial', 'paid', 'overdue'];

  const emiActions = (emi) => (
    <>
      {(emi.status === 'pending' || emi.status === 'overdue' || emi.status === 'partial') && (
        <>
          <button
            type="button"
            onClick={() => { setCollectEmi(emi); setPaymentMethod('cash'); setReferenceNumber(''); }}
            className="btn-success action-chip"
          >
            {t('adminEmis.collectBtn')}
          </button>
          <button
            type="button"
            onClick={() => { setPartialEmi(emi); setPartialAmount(''); setPaymentMethod('cash'); }}
            className="btn-primary action-chip"
          >
            {t('adminEmis.partialBtn')}
          </button>
          <button
            type="button"
            onClick={() => { setPenaltyEmi(emi); setPenalty(emi.penalty || 0); }}
            className="btn-secondary action-chip"
          >
            {t('adminEmis.penaltyBtn')}
          </button>
        </>
      )}
      {emi.status === 'paid' && (
        <button type="button" onClick={() => handleDownload(emi._id, emi.receiptNumber)} className="text-accent-400 p-1">
          <HiDownload className="w-4 h-4" />
        </button>
      )}
    </>
  );

  if (loading && !emis.length) return <PageLoader />;

  return (
    <div className="page-stack">
      <PageHeader title={t('adminEmis.title')} subtitle={t('adminEmis.subtitle')} />

      <div className="filter-bar">
        <select className="input" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          {statusOptions.map((s) => (
            <option key={s || 'all'} value={s}>{s ? t(`statusLabel.${s}`) : t('ui.allStatus')}</option>
          ))}
        </select>
      </div>

      <div className="mobile-list">
        {emis.map((emi) => (
          <div key={emi._id} className="mobile-list-item">
            <div className="mobile-list-head">
              <div className="min-w-0">
                <p className="mobile-list-title">
                  {t('adminEmis.emiNumber')} #{emi.emiNumber} · {emi.loan?.loanId}
                </p>
                <p className="mobile-list-meta mt-0.5">
                  {emi.user?.name}
                  {emi.user?.mobile ? ` · ${emi.user.mobile}` : ''}
                </p>
              </div>
              <Badge status={emi.status} />
            </div>
            <div className="mobile-list-grid">
              <div className="mobile-list-field">
                <label>{t('table.amount')}</label>
                <span>{formatCurrency(emi.amount)}</span>
              </div>
              <div className="mobile-list-field">
                <label>{t('adminEmis.paid')}</label>
                <span>{formatCurrency(emi.paidAmount || 0)}</span>
              </div>
              <div className="mobile-list-field">
                <label>{t('emi.penalty')}</label>
                <span>{formatCurrency(emi.penalty)}</span>
              </div>
              <div className="mobile-list-field">
                <label>{t('emi.dueDate')}</label>
                <span>{formatDate(emi.dueDate)}</span>
              </div>
            </div>
            <div className="mobile-list-actions">{emiActions(emi)}</div>
          </div>
        ))}
        {!emis.length && (
          <p className="py-8 text-center text-[12px] text-slate-500">{t('noData')}</p>
        )}
      </div>

      <div className="card desktop-table">
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('adminEmis.emiNumber')}</th>
                <th>{t('table.user')}</th>
                <th>{t('table.mobile')}</th>
                <th>{t('adminEmis.loan')}</th>
                <th className="text-right">{t('table.amount')}</th>
                <th className="text-right">{t('adminEmis.paid')}</th>
                <th className="text-right">{t('emi.penalty')}</th>
                <th>{t('emi.dueDate')}</th>
                <th>{t('table.status')}</th>
                <th className="text-right">{t('table.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {emis.map((emi) => (
                <tr key={emi._id}>
                  <td>{emi.emiNumber}</td>
                  <td>{emi.user?.name}</td>
                  <td>{emi.user?.mobile || '-'}</td>
                  <td>{emi.loan?.loanId}</td>
                  <td className="text-right">{formatCurrency(emi.amount)}</td>
                  <td className="text-right">{formatCurrency(emi.paidAmount || 0)}</td>
                  <td className="text-right">{formatCurrency(emi.penalty)}</td>
                  <td>{formatDate(emi.dueDate)}</td>
                  <td><Badge status={emi.status} /></td>
                  <td className="text-right">
                    <div className="inline-flex flex-wrap gap-1 justify-end">{emiActions(emi)}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination meta={meta} onPageChange={setPage} />

      <Modal isOpen={!!collectEmi} onClose={() => setCollectEmi(null)} title={t('adminEmis.collectTitle')}>
        <div className="space-y-4">
          <p className="text-sm text-gray-500">EMI #{collectEmi?.emiNumber} — {collectEmi?.user?.name}</p>
          <p className="text-lg font-bold">{t('ui.total')}: {formatCurrency(totalDue(collectEmi))}</p>
          <div>
            <label className="label">{t('emi.paymentMethod')}</label>
            <select className="input" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
              {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{t(`paymentMethod.${m.value}`)}</option>)}
            </select>
          </div>
          <div>
            <label className="label">{t('adminEmis.referenceNumber')}</label>
            <input className="input" value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} placeholder={t('adminEmis.referencePlaceholder')} />
          </div>
          <button onClick={handleCollect} className="btn-success w-full">{t('adminEmis.confirmCollection')}</button>
        </div>
      </Modal>

      <Modal isOpen={!!partialEmi} onClose={() => setPartialEmi(null)} title={t('adminEmis.partialTitle')}>
        <div className="space-y-4">
          <p className="text-sm">EMI #{partialEmi?.emiNumber} — {t('ui.due')}: {formatCurrency(totalDue(partialEmi))}</p>
          <div>
            <label className="label">{t('adminEmis.amountReceived')}</label>
            <input type="number" className="input" value={partialAmount} onChange={(e) => setPartialAmount(e.target.value)} />
          </div>
          <div>
            <label className="label">{t('emi.paymentMethod')}</label>
            <select className="input" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
              {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{t(`paymentMethod.${m.value}`)}</option>)}
            </select>
          </div>
          <button onClick={handlePartialPay} className="btn-primary w-full">{t('adminEmis.recordPartial')}</button>
        </div>
      </Modal>

      <Modal isOpen={!!penaltyEmi} onClose={() => setPenaltyEmi(null)} title={t('adminEmis.penaltyTitle')}>
        <div className="space-y-4">
          <p>EMI #{penaltyEmi?.emiNumber} - {penaltyEmi?.loan?.loanId}</p>
          <div>
            <label className="label">{t('adminEmis.penaltyAmount')}</label>
            <input type="number" className="input" value={penalty} onChange={(e) => setPenalty(e.target.value)} />
          </div>
          <button onClick={handleUpdatePenalty} className="btn-primary w-full">{t('adminEmis.updatePenalty')}</button>
        </div>
      </Modal>
    </div>
  );
};

export default AdminEMIs;
