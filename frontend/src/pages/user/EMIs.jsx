import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { emiAPI } from '../../services';
import { formatCurrency, formatDate, getErrorMessage } from '../../utils/helpers';
import Badge from '../../components/Badge';
import Pagination from '../../components/Pagination';
import ConfirmDialog from '../../components/ConfirmDialog';
import PageHeader from '../../components/PageHeader';
import { PageLoader } from '../../components/LoadingSpinner';
import { HiDownload } from 'react-icons/hi';

const EMIs = () => {
  const { t } = useTranslation();
  const [emis, setEmis] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [payEmi, setPayEmi] = useState(null);

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

  const handlePay = async () => {
    try {
      await emiAPI.pay({ emiId: payEmi._id });
      toast.success(t('ui.emiPaymentRequested'));
      setPayEmi(null);
      fetchEMIs();
    } catch (error) {
      toast.error(getErrorMessage(error));
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

  const emiActions = (emi) => (
    <>
      {(emi.status === 'pending' || emi.status === 'overdue') && (
        <button type="button" onClick={() => setPayEmi(emi)} className="btn-primary action-chip">{t('ui.payNow')}</button>
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

      <ConfirmDialog
        isOpen={!!payEmi}
        onClose={() => setPayEmi(null)}
        onConfirm={handlePay}
        title={t('ui.payEmi')}
        message={t('ui.payEmiConfirm', {
          number: payEmi?.emiNumber,
          amount: formatCurrency((payEmi?.amount || 0) + (payEmi?.penalty || 0)),
        })}
        confirmText={t('ui.payNow')}
      />
    </div>
  );
};

export default EMIs;
