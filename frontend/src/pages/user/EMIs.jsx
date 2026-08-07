import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { emiAPI } from '../../services';
import { formatCurrency, formatDate, getErrorMessage } from '../../utils/helpers';
import Badge from '../../components/Badge';
import Pagination from '../../components/Pagination';
import Modal from '../../components/Modal';
import PageHeader from '../../components/PageHeader';
import LoadingSpinner, { PageLoader } from '../../components/LoadingSpinner';
import { HiDownload, HiCash, HiDeviceMobile } from 'react-icons/hi';

const UPI_QR_SRC = '/payments/phonepe-upi-qr.png';
const PHONEPE_FALLBACK_URL = 'https://www.phonepe.com/';

/** Open PhonePe / UPI pay intent (direct pay when VITE_UPI_ID is set). */
const openPhonePePay = ({ amount, note } = {}) => {
  const upiId = String(import.meta.env.VITE_UPI_ID || '').trim();
  const upiName = String(import.meta.env.VITE_UPI_NAME || 'Prabhavi Small Finance').trim();
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '');
  const am = amount != null && Number(amount) > 0 ? Number(amount).toFixed(2) : '';

  if (upiId) {
    const params = new URLSearchParams({
      pa: upiId,
      pn: upiName,
      cu: 'INR',
      tn: note || 'EMI Payment',
    });
    if (am) params.set('am', am);
    const qs = params.toString();
    const phonepeUrl = `phonepe://pay?${qs}`;
    const upiUrl = `upi://pay?${qs}`;

    if (isMobile) {
      window.location.href = phonepeUrl;
      setTimeout(() => {
        window.location.href = upiUrl;
      }, 900);
      return;
    }
    window.open(upiUrl, '_blank', 'noopener,noreferrer');
    return;
  }

  if (isMobile) {
    window.location.href = 'phonepe://pay';
    setTimeout(() => {
      window.open(PHONEPE_FALLBACK_URL, '_blank', 'noopener,noreferrer');
    }, 1200);
    return;
  }
  window.open(PHONEPE_FALLBACK_URL, '_blank', 'noopener,noreferrer');
};

const EMIs = () => {
  const { t } = useTranslation();
  const [emis, setEmis] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [payEmi, setPayEmi] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paying, setPaying] = useState(false);

  const fetchEMIs = async () => {
    setLoading(true);
    try {
      const res = await emiAPI.getAll({ page, limit: 10, status });
      setEmis(res.data.data);
      setMeta(res.data.meta);
    } catch {
      toast.error(t('ui.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEMIs(); }, [page, status]);

  const openPay = (emi) => {
    setPaymentMethod('cash');
    setPayEmi(emi);
  };

  const closePay = () => {
    if (paying) return;
    setPayEmi(null);
    setPaymentMethod('cash');
  };

  const handlePay = async () => {
    if (!payEmi) return;
    setPaying(true);
    try {
      if (paymentMethod === 'upi') {
        const total = (payEmi.amount || 0) + (payEmi.penalty || 0);
        openPhonePePay({
          amount: total,
          note: `EMI #${payEmi.emiNumber || ''}`.trim(),
        });
      }
      await emiAPI.pay({ emiId: payEmi._id, paymentMethod });
      toast.success(t('ui.emiPaymentRequested'));
      setPayEmi(null);
      setPaymentMethod('cash');
      fetchEMIs();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setPaying(false);
    }
  };

  const handleDownload = async (id, receiptNumber) => {
    try {
      const res = await emiAPI.downloadReceipt(id);
      const url = window.URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt-${receiptNumber || id}.pdf`;
      a.click();
    } catch {
      toast.error(t('ui.downloadFailed'));
    }
  };

  if (loading && !emis.length) return <PageLoader />;

  const statusOptions = ['pending', 'pending_collection', 'paid', 'overdue'];
  const payAmount = formatCurrency((payEmi?.amount || 0) + (payEmi?.penalty || 0));

  const emiActions = (emi) => (
    <>
      {(emi.status === 'pending' || emi.status === 'overdue') && (
        <button type="button" onClick={() => openPay(emi)} className="btn-primary action-chip">{t('ui.payNow')}</button>
      )}
      {emi.status === 'pending_collection' && (
        <span className="text-xs text-slate-500">{t('ui.awaitingCollection')}</span>
      )}
      {emi.status === 'paid' && (
        <button
          type="button"
          onClick={() => handleDownload(emi._id, emi.receiptNumber)}
          className="text-accent-400 p-1"
          title={t('emi.receipt')}
        >
          <HiDownload className="w-4 h-4" />
        </button>
      )}
    </>
  );

  return (
    <div className="page-stack">
      <PageHeader title={t('ui.emiManagement')} />

      <div className="filter-bar">
        <select className="input w-full sm:w-40" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">{t('ui.allStatus')}</option>
          {statusOptions.map((s) => (
            <option key={s} value={s}>{t(`statusLabel.${s}`)}</option>
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
              </div>
              <Badge status={emi.status} />
            </div>
            <div className="mobile-list-grid">
              <div className="mobile-list-field">
                <label>{t('table.amount')}</label>
                <span>{formatCurrency(emi.amount)}</span>
              </div>
              <div className="mobile-list-field">
                <label>{t('emi.penalty')}</label>
                <span>{formatCurrency(emi.penalty)}</span>
              </div>
              <div className="mobile-list-field">
                <label>{t('emi.dueDate')}</label>
                <span>{formatDate(emi.dueDate)}</span>
              </div>
              <div className="mobile-list-field">
                <label>{t('ui.paidDate')}</label>
                <span>{formatDate(emi.paidDate)}</span>
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
                <th>{t('adminEmis.loan')}</th>
                <th className="text-right">{t('table.amount')}</th>
                <th className="text-right">{t('emi.penalty')}</th>
                <th>{t('emi.dueDate')}</th>
                <th>{t('ui.paidDate')}</th>
                <th>{t('table.status')}</th>
                <th className="text-right">{t('table.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {emis.map((emi) => (
                <tr key={emi._id}>
                  <td className="font-medium">{emi.emiNumber}</td>
                  <td>{emi.loan?.loanId}</td>
                  <td className="text-right">{formatCurrency(emi.amount)}</td>
                  <td className="text-right">{formatCurrency(emi.penalty)}</td>
                  <td>{formatDate(emi.dueDate)}</td>
                  <td>{formatDate(emi.paidDate)}</td>
                  <td><Badge status={emi.status} /></td>
                  <td className="text-right">
                    <div className="inline-flex flex-wrap gap-1 justify-end">{emiActions(emi)}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!emis.length && (
          <p className="p-4 text-center text-slate-500 text-sm">{t('noData')}</p>
        )}
      </div>

      <Pagination meta={meta} onPageChange={setPage} />

      <Modal isOpen={!!payEmi} onClose={closePay} title={t('ui.payEmi')} size="sm">
        <div className="space-y-4">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {t('ui.payEmiConfirm', {
              number: payEmi?.emiNumber,
              amount: payAmount,
            })}
          </p>

          <div>
            <label className="label">{t('emi.paymentMethod')}</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className={`flex flex-col items-center gap-1.5 rounded-xl border px-3 py-3 text-sm font-medium transition-all ${
                  paymentMethod === 'cash'
                    ? 'border-accent-400 bg-accent-400/10 text-accent-600 dark:text-accent-400'
                    : 'border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <HiCash className="w-5 h-5" />
                {t('paymentMethod.cash')}
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('upi')}
                className={`flex flex-col items-center gap-1.5 rounded-xl border px-3 py-3 text-sm font-medium transition-all ${
                  paymentMethod === 'upi'
                    ? 'border-accent-400 bg-accent-400/10 text-accent-600 dark:text-accent-400'
                    : 'border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <HiDeviceMobile className="w-5 h-5" />
                {t('ui.onlineUpi')}
              </button>
            </div>
          </div>

          {paymentMethod === 'upi' && (
            <div className="rounded-xl border border-black/10 dark:border-white/10 p-3 space-y-3 bg-black/[0.02] dark:bg-white/[0.03]">
              <p className="text-center text-xs sm:text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                {t('ui.scanUpiQr')}
              </p>
              <div className="mx-auto w-44 h-44 sm:w-52 sm:h-52 rounded-lg overflow-hidden bg-white p-2 shadow-sm">
                <img
                  src={UPI_QR_SRC}
                  alt="PhonePe UPI QR"
                  className="w-full h-full object-contain"
                />
              </div>
              <p className="text-center text-[11px] sm:text-xs" style={{ color: 'var(--text-muted)' }}>
                {t('ui.upiPayHint')}
              </p>
            </div>
          )}

          <div className="flex gap-3 justify-end pt-1">
            <button type="button" onClick={closePay} disabled={paying} className="btn-secondary">
              {t('cancel')}
            </button>
            <button type="button" onClick={handlePay} disabled={paying} className="btn-primary min-w-[7rem]">
              {paying ? <LoadingSpinner size="sm" /> : t('ui.payNow')}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default EMIs;
