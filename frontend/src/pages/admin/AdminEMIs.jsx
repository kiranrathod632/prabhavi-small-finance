import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import adminPanelAPI from '../../services/adminPanelAPI';
import { useAdminCounts } from '../../context/AdminCountsContext';
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
  const { refreshAdminCounts, setEmiCollectionCount } = useAdminCounts();
  const [activeTab, setActiveTab] = useState('collection'); // collection | all
  const [emis, setEmis] = useState([]);
  const [latestEmis, setLatestEmis] = useState([]);
  const [collectionCount, setCollectionCount] = useState(0);
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

  const fetchLatestEmis = async () => {
    try {
      // Upcoming next 10 EMIs by due date
      const res = await adminPanelAPI.getEMIs({
        page: 1,
        limit: 10,
        sort: 'dueDate',
        status: 'pending',
      });
      let list = Array.isArray(res.data?.data) ? res.data.data : [];

      if (list.length < 10) {
        const overdueRes = await adminPanelAPI.getEMIs({
          page: 1,
          limit: 10 - list.length,
          sort: 'dueDate',
          status: 'overdue',
        });
        const overdue = Array.isArray(overdueRes.data?.data) ? overdueRes.data.data : [];
        const ids = new Set(list.map((e) => e._id));
        list = [...list, ...overdue.filter((e) => !ids.has(e._id))].slice(0, 10);
      }

      setLatestEmis(list);
    } catch {
      // keep existing list; don't block page
    }
  };

  const fetchCollectionCount = async () => {
    try {
      const res = await adminPanelAPI.getEMIs({ page: 1, limit: 1, status: 'pending_collection' });
      const total = res.data.meta?.total || 0;
      setCollectionCount(total);
      setEmiCollectionCount(total);
    } catch {
      // ignore
    }
  };

  const fetchEMIs = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 10,
        sort: activeTab === 'collection' ? '-updatedAt' : 'dueDate',
      };
      if (activeTab === 'collection') {
        params.status = 'pending_collection';
      } else if (status) {
        params.status = status;
      }

      const res = await adminPanelAPI.getEMIs(params);
      setEmis(res.data.data);
      setMeta(res.data.meta);
      if (activeTab === 'collection') {
        const total = res.data.meta?.total || 0;
        setCollectionCount(total);
        setEmiCollectionCount(total);
      }
    } catch {
      toast.error(t('adminEmis.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const refreshAll = () => {
    fetchEMIs();
    fetchCollectionCount();
    fetchLatestEmis();
    refreshAdminCounts();
  };

  useEffect(() => {
    fetchEMIs();
    fetchCollectionCount();
    fetchLatestEmis();
  }, [page, status, activeTab]);

  const switchTab = (tab) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    setPage(1);
    if (tab === 'all') setStatus('');
  };

  const handleCollect = async () => {
    try {
      await adminPanelAPI.collectEMI(collectEmi._id, { paymentMethod, referenceNumber });
      toast.success(t('adminEmis.collected'));
      setCollectEmi(null);
      refreshAll();
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
      refreshAll();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleUpdatePenalty = async () => {
    try {
      await adminPanelAPI.addPenalty(penaltyEmi._id, { penalty: parseFloat(penalty) });
      toast.success(t('adminEmis.penaltyUpdated'));
      setPenaltyEmi(null);
      refreshAll();
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

  const statusOptions = ['', 'pending', 'pending_collection', 'partial', 'paid', 'overdue'];

  const emiActions = (emi, { collectOnly = false } = {}) => (
    <>
      {(emi.status === 'pending' || emi.status === 'overdue' || emi.status === 'partial' || emi.status === 'pending_collection') && (
        <>
          <button
            type="button"
            onClick={() => { setCollectEmi(emi); setPaymentMethod('cash'); setReferenceNumber(''); }}
            className="btn-success action-chip"
          >
            {t('adminEmis.collectBtn')}
          </button>
          {!collectOnly && emi.status !== 'pending_collection' && (
            <button
              type="button"
              onClick={() => { setPartialEmi(emi); setPartialAmount(''); setPaymentMethod('cash'); }}
              className="btn-primary action-chip"
            >
              {t('adminEmis.partialBtn')}
            </button>
          )}
          {!collectOnly && (
            <button
              type="button"
              onClick={() => { setPenaltyEmi(emi); setPenalty(emi.penalty || 0); }}
              className="btn-secondary action-chip"
            >
              {t('adminEmis.penaltyBtn')}
            </button>
          )}
        </>
      )}
      {!collectOnly && emi.status === 'paid' && (
        <button type="button" onClick={() => handleDownload(emi._id, emi.receiptNumber)} className="text-accent-400 p-1">
          <HiDownload className="w-4 h-4" />
        </button>
      )}
    </>
  );

  const renderEmiList = (list, { collectOnly = false, emptyKey = 'noData', pageNum = 1 } = {}) => (
    <div className="card">
      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>{t('table.srNo')}</th>
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
            {list.map((emi, index) => (
              <tr key={emi._id}>
                <td className="text-slate-500">{(pageNum - 1) * 10 + index + 1}</td>
                <td>{emi.emiNumber}</td>
                <td>{emi.user?.name || 'N/A'}</td>
                <td>{emi.user?.mobile || emi.user?.mobile_number || 'N/A'}</td>
                <td>{emi.loan?.loanId || 'N/A'}</td>
                <td className="text-right">{formatCurrency(emi.amount)}</td>
                <td className="text-right">{formatCurrency(emi.paidAmount || 0)}</td>
                <td className="text-right">{formatCurrency(emi.penalty)}</td>
                <td className="whitespace-nowrap">{formatDate(emi.dueDate)}</td>
                <td><Badge status={emi.status} /></td>
                <td className="text-right !whitespace-nowrap">
                  <div className="table-actions flex !flex-row !flex-nowrap items-center gap-1 justify-end whitespace-nowrap">
                    {emiActions(emi, { collectOnly })}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!list.length && (
        <p className="p-4 text-center text-slate-500 text-sm">{t(emptyKey)}</p>
      )}
    </div>
  );

  if (loading && !emis.length && !latestEmis.length) return <PageLoader />;

  return (
    <div className="page-stack">
      <PageHeader title={t('adminEmis.title')} subtitle={t('adminEmis.subtitle')} />

      <div className="filter-bar flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => switchTab('collection')}
          className={activeTab === 'collection' ? 'btn-primary action-chip' : 'btn-secondary action-chip'}
        >
          {t('adminEmis.tabCollection')}
          {collectionCount > 0 ? ` (${collectionCount})` : ''}
        </button>
        <button
          type="button"
          onClick={() => switchTab('all')}
          className={activeTab === 'all' ? 'btn-primary action-chip' : 'btn-secondary action-chip'}
        >
          {t('adminEmis.tabAll')}
        </button>
      </div>

      {activeTab === 'collection' && (
        <>
          <p className="text-xs text-slate-500">{t('adminEmis.collectionHint')}</p>
          {renderEmiList(emis, { collectOnly: true, emptyKey: 'adminEmis.noCollection', pageNum: page })}
          <Pagination meta={meta} onPageChange={setPage} />

          <div className="space-y-2 pt-2">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {t('adminEmis.latestTitle')}
            </h3>
            <p className="text-xs text-slate-500">{t('adminEmis.latestHint')}</p>
            {renderEmiList(latestEmis, { emptyKey: 'noData', pageNum: 1 })}
          </div>
        </>
      )}

      {activeTab === 'all' && (
        <>
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {t('adminEmis.latestTitle')}
            </h3>
            <p className="text-xs text-slate-500">{t('adminEmis.latestHint')}</p>
            {renderEmiList(latestEmis, { emptyKey: 'noData', pageNum: 1 })}
          </div>

          <div className="filter-bar">
            <select className="input" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
              {statusOptions.map((s) => (
                <option key={s || 'all'} value={s}>{s ? t(`statusLabel.${s}`) : t('ui.allStatus')}</option>
              ))}
            </select>
          </div>

          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            {t('adminEmis.allEmisTitle')}
          </h3>
          {renderEmiList(emis, { pageNum: page })}
          <Pagination meta={meta} onPageChange={setPage} />
        </>
      )}

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
