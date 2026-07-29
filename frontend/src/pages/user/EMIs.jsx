import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { emiAPI } from '../../services';
import { formatCurrency, formatDate, getErrorMessage } from '../../utils/helpers';
import Badge from '../../components/Badge';
import Pagination from '../../components/Pagination';
import ConfirmDialog from '../../components/ConfirmDialog';
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
      toast.success(t('ui.emiPaid'));
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

  const statusOptions = ['pending', 'paid', 'overdue'];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{t('ui.emiManagement')}</h1>

      <div className="mb-4">
        <select className="input w-40" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">{t('ui.allStatus')}</option>
          {statusOptions.map((s) => (
            <option key={s} value={s}>{t(`statusLabel.${s}`)}</option>
          ))}
        </select>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b dark:border-gray-700">
              <th className="text-left py-3 px-2">{t('adminEmis.emiNumber')}</th>
              <th className="text-left py-3 px-2">{t('adminEmis.loan')}</th>
              <th className="text-right py-3 px-2">{t('table.amount')}</th>
              <th className="text-right py-3 px-2">{t('emi.penalty')}</th>
              <th className="text-left py-3 px-2">{t('emi.dueDate')}</th>
              <th className="text-left py-3 px-2">{t('ui.paidDate')}</th>
              <th className="text-left py-3 px-2">{t('table.status')}</th>
              <th className="text-right py-3 px-2">{t('table.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {emis.map((emi) => (
              <tr key={emi._id} className="border-b dark:border-gray-700/50">
                <td className="py-3 px-2 font-medium">{emi.emiNumber}</td>
                <td className="py-3 px-2">{emi.loan?.loanId}</td>
                <td className="py-3 px-2 text-right">{formatCurrency(emi.amount)}</td>
                <td className="py-3 px-2 text-right">{formatCurrency(emi.penalty)}</td>
                <td className="py-3 px-2">{formatDate(emi.dueDate)}</td>
                <td className="py-3 px-2">{formatDate(emi.paidDate)}</td>
                <td className="py-3 px-2"><Badge status={emi.status} /></td>
                <td className="py-3 px-2 text-right space-x-2">
                  {emi.status === 'pending' && (
                    <button onClick={() => setPayEmi(emi)} className="btn-primary text-xs py-1 px-2">{t('ui.payNow')}</button>
                  )}
                  {emi.status === 'paid' && (
                    <button onClick={() => handleDownload(emi._id, emi.receiptNumber)} className="text-primary-600" title={t('emi.receipt')}>
                      <HiDownload className="w-4 h-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {!emis.length && (
              <tr><td colSpan={8} className="py-8 text-center text-gray-500">{t('noData')}</td></tr>
            )}
          </tbody>
        </table>
        <Pagination meta={meta} onPageChange={setPage} />
      </div>

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
