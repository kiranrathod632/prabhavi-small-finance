import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import adminPanelAPI from '../../services/adminPanelAPI';
import { formatCurrency, formatDate, getErrorMessage } from '../../utils/helpers';
import { PAYMENT_METHODS } from '../../utils/roles';
import Badge from '../../components/Badge';
import Pagination from '../../components/Pagination';
import Modal from '../../components/Modal';
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

  if (loading && !emis.length) return <PageLoader />;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">{t('adminEmis.title')}</h1>
      <p className="text-gray-500 mb-6">{t('adminEmis.subtitle')}</p>

      <select className="input w-40 mb-4" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
        {statusOptions.map((s) => (
          <option key={s || 'all'} value={s}>{s ? t(`statusLabel.${s}`) : t('ui.allStatus')}</option>
        ))}
      </select>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b dark:border-gray-700">
              <th className="text-left py-3 px-2">{t('adminEmis.emiNumber')}</th>
              <th className="text-left py-3 px-2">{t('table.user')}</th>
              <th className="text-left py-3 px-2">{t('table.mobile')}</th>
              <th className="text-left py-3 px-2">{t('adminEmis.loan')}</th>
              <th className="text-right py-3 px-2">{t('table.amount')}</th>
              <th className="text-right py-3 px-2">{t('adminEmis.paid')}</th>
              <th className="text-right py-3 px-2">{t('emi.penalty')}</th>
              <th className="text-left py-3 px-2">{t('emi.dueDate')}</th>
              <th className="text-left py-3 px-2">{t('table.status')}</th>
              <th className="text-right py-3 px-2">{t('table.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {emis.map((emi) => (
              <tr key={emi._id} className="border-b dark:border-gray-700/50">
                <td className="py-3 px-2">{emi.emiNumber}</td>
                <td className="py-3 px-2">{emi.user?.name}</td>
                <td className="py-3 px-2">{emi.user?.mobile || '-'}</td>
                <td className="py-3 px-2">{emi.loan?.loanId}</td>
                <td className="py-3 px-2 text-right">{formatCurrency(emi.amount)}</td>
                <td className="py-3 px-2 text-right">{formatCurrency(emi.paidAmount || 0)}</td>
                <td className="py-3 px-2 text-right">{formatCurrency(emi.penalty)}</td>
                <td className="py-3 px-2">{formatDate(emi.dueDate)}</td>
                <td className="py-3 px-2"><Badge status={emi.status} /></td>
                <td className="py-3 px-2 text-right">
                  <div className="flex flex-wrap gap-1 justify-end">
                    {(emi.status === 'pending' || emi.status === 'overdue' || emi.status === 'partial') && (
                      <>
                        <button onClick={() => { setCollectEmi(emi); setPaymentMethod('cash'); setReferenceNumber(''); }} className="btn-success text-xs py-1 px-2">{t('adminEmis.collectBtn')}</button>
                        <button onClick={() => { setPartialEmi(emi); setPartialAmount(''); setPaymentMethod('cash'); }} className="btn-primary text-xs py-1 px-2">{t('adminEmis.partialBtn')}</button>
                        <button onClick={() => { setPenaltyEmi(emi); setPenalty(emi.penalty || 0); }} className="btn-secondary text-xs py-1 px-2">{t('adminEmis.penaltyBtn')}</button>
                      </>
                    )}
                    {emi.status === 'paid' && (
                      <button onClick={() => handleDownload(emi._id, emi.receiptNumber)} className="text-primary-600 p-1">
                        <HiDownload className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination meta={meta} onPageChange={setPage} />
      </div>

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
