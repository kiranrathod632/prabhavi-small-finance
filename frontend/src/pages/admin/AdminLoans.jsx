import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import adminPanelAPI from '../../services/adminPanelAPI';
import { useAdminCounts } from '../../context/AdminCountsContext';
import { formatCurrency, formatDate, getErrorMessage, downloadBlob, getFullName } from '../../utils/helpers';
import Badge from '../../components/Badge';
import SearchBar from '../../components/SearchBar';
import Pagination from '../../components/Pagination';
import Modal from '../../components/Modal';
import PageHeader from '../../components/PageHeader';
import { PageLoader } from '../../components/LoadingSpinner';
import { HiDownload } from 'react-icons/hi';
import { TENURE_OPTIONS } from '../../utils/roles';

const AdminLoans = () => {
  const { t } = useTranslation();
  const { refreshAdminCounts } = useAdminCounts();
  const [loans, setLoans] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [actionLoan, setActionLoan] = useState(null);
  const [actionType, setActionType] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  
  const [interestRate, setInterestRate] = useState('');
  const [interestType, setInterestType] = useState('reducing_balance');
  const [interestRatePeriod, setInterestRatePeriod] = useState('monthly');
  const [processingFeeType, setProcessingFeeType] = useState('flat');
  const [processingFeeValue, setProcessingFeeValue] = useState('');
  const [processingFeePercent, setProcessingFeePercent] = useState('');
  const [gstEnabled, setGstEnabled] = useState(false);
  const [gstPercent, setGstPercent] = useState('');
  const [gstAmount, setGstAmount] = useState('');
  const [latePaymentPenalty, setLatePaymentPenalty] = useState('');
  const [dailyPenaltyRate, setDailyPenaltyRate] = useState('');
  const [penaltyEnabled, setPenaltyEnabled] = useState(false);
  const [bounceCharge, setBounceCharge] = useState('');
  
  const [selectedTenure, setSelectedTenure] = useState('');
  const [manualTenure, setManualTenure] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [defaultSettings, setDefaultSettings] = useState(null);

  const statusOptions = ['', 'pending', 'approved', 'active', 'closed', 'rejected'];

  useEffect(() => {
    fetchDefaultSettings();
  }, []);

  const fetchDefaultSettings = async () => {
    try {
      const res = await adminPanelAPI.getInterestSettings();
      setDefaultSettings(res.data.data);
    } catch (error) {
      console.error('Failed to load interest settings');
    }
  };

  const fetchLoans = async () => {
    setLoading(true);
    try {
      const res = await adminPanelAPI.getLoans({ page, limit: 10, search, status });
      const list = Array.isArray(res.data?.data) ? res.data.data : [];
      setLoans(list);
      setMeta(res.data?.meta || null);
    } catch {
      toast.error(t('adminLoans.loadFailed'));
      setLoans([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLoans(); }, [page, search, status]);

  const openApprovalModal = (loan) => {
    if (submittingRef.current) return;
    setActionLoan(loan);
    setActionType('approved');
    setSelectedTenure('');
    setManualTenure('');
    submittingRef.current = false;
    setSubmitting(false);
    
    if (defaultSettings) {
      setInterestRate(loan.interestRate || defaultSettings.defaultInterestRate || '');
      setInterestType(loan.interestType || defaultSettings.interestType || 'reducing_balance');
      setInterestRatePeriod(loan.interestRatePeriod || defaultSettings.interestRatePeriod || 'yearly');
      setProcessingFeeType(defaultSettings.processingFeeType || 'flat');
      setProcessingFeeValue(defaultSettings.processingFeeValue || '');
      setProcessingFeePercent(defaultSettings.processingFeePercent || '');
      setGstEnabled(defaultSettings.gstEnabled || false);
      setGstPercent(defaultSettings.gstPercent || '');
      setLatePaymentPenalty(defaultSettings.latePaymentPenalty || '');
      setDailyPenaltyRate(defaultSettings.dailyPenaltyRate || '');
      setPenaltyEnabled(defaultSettings.penaltyEnabled || false);
      setBounceCharge(defaultSettings.bounceCharge || '');
      
      if (defaultSettings.gstEnabled && defaultSettings.processingFeeValue) {
        const fee = parseFloat(defaultSettings.processingFeeValue) || 0;
        const gst = (fee * (parseFloat(defaultSettings.gstPercent) || 0)) / 100;
        setGstAmount(gst.toFixed(2));
      }
    } else {
      setInterestRate(loan.interestRate || '');
      setInterestType(loan.interestType || 'reducing_balance');
      setInterestRatePeriod(loan.interestRatePeriod || 'yearly');
    }
  };

  const calculateGST = (feeValue, feePercent, gstPerc) => {
    if (gstEnabled) {
      let baseFee = 0;
      if (processingFeeType === 'flat') {
        baseFee = parseFloat(feeValue) || 0;
      } else if (processingFeeType === 'percentage' && actionLoan) {
        baseFee = ((parseFloat(feePercent) || 0) * (actionLoan.amount || 0)) / 100;
      }
      const gst = (baseFee * (parseFloat(gstPerc) || 0)) / 100;
      setGstAmount(gst.toFixed(2));
    } else {
      setGstAmount('0');
    }
  };

  const handleProcessingFeeChange = (field, value) => {
    if (field === 'processingFeeType') {
      setProcessingFeeType(value);
      if (value === 'flat') {
        calculateGST(processingFeeValue, 0, gstPercent);
      } else {
        calculateGST(0, processingFeePercent, gstPercent);
      }
    } else if (field === 'processingFeeValue') {
      setProcessingFeeValue(value);
      if (processingFeeType === 'flat') {
        calculateGST(value, 0, gstPercent);
      }
    } else if (field === 'processingFeePercent') {
      setProcessingFeePercent(value);
      if (processingFeeType === 'percentage') {
        calculateGST(0, value, gstPercent);
      }
    } else if (field === 'gstPercent') {
      setGstPercent(value);
      calculateGST(processingFeeValue, processingFeePercent, value);
    } else if (field === 'gstEnabled') {
      setGstEnabled(value);
      if (value) {
        calculateGST(processingFeeValue, processingFeePercent, gstPercent);
      } else {
        setGstAmount('0');
      }
    }
  };

  const handleAction = async () => {
    // Sync lock — blocks double-click before React re-renders disabled state
    if (submittingRef.current || submitting) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const data = { status: actionType };
      
      if (actionType === 'rejected') {
        data.rejectedReason = rejectReason;
      }
      
      if (actionType === 'approved') {
        const tenureValue = selectedTenure || (manualTenure ? parseInt(manualTenure, 10) : null);
        if (!tenureValue || Number.isNaN(tenureValue) || tenureValue < 1) {
          toast.error(t('adminLoans.selectTenureToast'));
          submittingRef.current = false;
          setSubmitting(false);
          return;
        }
        
        data.tenure = tenureValue;
        
        if (interestRate) data.interestRate = parseFloat(interestRate);
        data.interestType = interestType;
        data.interestRatePeriod = interestRatePeriod;
        
        let processingFee = 0;
        if (processingFeeType === 'flat') {
          processingFee = parseFloat(processingFeeValue) || 0;
        } else if (processingFeeType === 'percentage' && actionLoan) {
          processingFee = ((parseFloat(processingFeePercent) || 0) * (actionLoan.amount || 0)) / 100;
        }
        
        data.processingFee = processingFee;
        data.processingFeeType = processingFeeType;
        data.processingFeeValue = parseFloat(processingFeeValue) || 0;
        data.processingFeePercent = parseFloat(processingFeePercent) || 0;
        
        data.gstEnabled = gstEnabled;
        data.gstPercent = parseFloat(gstPercent) || 0;
        data.gstAmount = parseFloat(gstAmount) || 0;
        
        data.latePaymentPenalty = parseFloat(latePaymentPenalty) || 0;
        data.dailyPenaltyRate = parseFloat(dailyPenaltyRate) || 0;
        data.penaltyEnabled = penaltyEnabled;
        data.bounceCharge = parseFloat(bounceCharge) || 0;
      }
      
      await adminPanelAPI.updateLoan(actionLoan._id, data);
      toast.success(
        actionType === 'approved'
          ? t('adminLoans.approvedDisbursed')
          : t(`statusLabel.${actionType}`)
      );
      
      resetFields();
      fetchLoans();
      refreshAdminCounts();
    } catch (error) {
      toast.error(getErrorMessage(error));
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const resetFields = () => {
    setActionLoan(null);
    setActionType('');
    setRejectReason('');
    setSelectedTenure('');
    setManualTenure('');
    submittingRef.current = false;
    setSubmitting(false);
    setInterestRate('');
    setInterestType('reducing_balance');
    setInterestRatePeriod('yearly');
    setProcessingFeeType('flat');
    setProcessingFeeValue('');
    setProcessingFeePercent('');
    setGstEnabled(false);
    setGstPercent('');
    setGstAmount('');
    setLatePaymentPenalty('');
    setDailyPenaltyRate('');
    setPenaltyEnabled(false);
    setBounceCharge('');
  };

  const handleExport = async () => {
    try {
      const res = await adminPanelAPI.exportLoans();
      downloadBlob(res.data, 'loans.xlsx');
    } catch {
      toast.error(t('ui.exportFailed'));
    }
  };

  const getActionLabel = (type) => {
    const keyMap = {
      under_review: 'statusLabel.under_review',
      disbursed: 'statusLabel.disbursed',
      closed: 'statusLabel.closed',
      rejected: 'statusLabel.rejected',
    };
    return t(keyMap[type] || `statusLabel.${type}`);
  };

  const getOutstandingAmount = (loan) => {
    const outstandingCandidates = [
      loan?.totalOutstanding,
      loan?.remainingBalance,
      loan?.remainingAmount,
      loan?.outstandingAmount,
      loan?.pendingAmount,
    ];

    for (const value of outstandingCandidates) {
      if (typeof value === 'number' && Number.isFinite(value)) return value;
    }
    return null;
  };

  const canCloseLoan = (loan) => {
    if (loan?.status !== 'active') return false;
    const outstanding = getOutstandingAmount(loan);
    // If outstanding data is unavailable, keep Close hidden for safety.
    if (outstanding === null) return false;
    return outstanding <= 0;
  };

  if (loading && !loans.length) return <PageLoader />;

  const loanActions = (loan) => {
    if (loan.status === 'pending') {
      return (
        <>
          <button type="button" onClick={() => { setActionLoan(loan); setActionType('under_review'); }} className="btn-secondary action-chip">{t('ui.review')}</button>
          <button type="button" onClick={() => openApprovalModal(loan)} className="btn-success action-chip">{t('loan.approve')}</button>
          <button type="button" onClick={() => { setActionLoan(loan); setActionType('rejected'); }} className="btn-danger action-chip">{t('loan.reject')}</button>
        </>
      );
    }
    if (loan.status === 'under_review') {
      return (
        <>
          <button type="button" onClick={() => openApprovalModal(loan)} className="btn-success action-chip">{t('loan.approve')}</button>
          <button type="button" onClick={() => { setActionLoan(loan); setActionType('rejected'); }} className="btn-danger action-chip">{t('loan.reject')}</button>
        </>
      );
    }
    if (canCloseLoan(loan)) {
      return (
        <button type="button" onClick={() => { setActionLoan(loan); setActionType('closed'); }} className="btn-secondary action-chip">{t('ui.close')}</button>
      );
    }

    // Keep right-side column filled so every row aligns like pending loans with buttons
    const statusText =
      loan.status === 'approved' || loan.status === 'active'
        ? t('adminLoans.loanApprovedLabel')
        : loan.status === 'rejected'
          ? t('adminLoans.loanRejectedLabel')
          : loan.status === 'closed'
            ? t('adminLoans.loanClosedLabel')
            : t(`statusLabel.${loan.status}`, { defaultValue: loan.status });

    const tone =
      loan.status === 'approved' || loan.status === 'active'
        ? 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800'
        : loan.status === 'rejected' || loan.status === 'cancelled' || loan.status === 'defaulted'
          ? 'text-red-700 bg-red-50 border-red-200 dark:text-red-300 dark:bg-red-950/40 dark:border-red-800'
          : 'text-slate-600 bg-slate-50 border-slate-200 dark:text-slate-300 dark:bg-slate-800/60 dark:border-slate-700';

    return (
      <span className={`action-chip border ${tone}`}>
        {statusText}
      </span>
    );
  };

  return (
    <div className="page-stack">
      <PageHeader
        title={t('adminLoans.title')}
        actions={
          <button type="button" onClick={handleExport} className="btn-secondary">
            <HiDownload className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" /> {t('adminDash.exportExcel')}
          </button>
        }
      />

      <div className="filter-bar">
        <SearchBar
          value={search}
          onChange={(v) => { setSearch(v); setPage(1); }}
          placeholder={t('adminLoans.searchPlaceholder')}
          className="w-full sm:w-64"
        />
        <select className="input" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          {statusOptions.map((s) => (
            <option key={s || 'all'} value={s}>{s ? t(`statusLabel.${s}`) : t('ui.allStatus')}</option>
          ))}
        </select>
      </div>

      {/* Clean table list (mobile + desktop) */}
      <div className="card">
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('table.srNo')}</th>
                <th>{t('table.loanId')}</th>
                <th>{t('table.user')}</th>
                <th>{t('table.type')}</th>
                <th className="text-right">{t('table.amount')}</th>
                <th className="text-right">{t('ui.rate')}</th>
                <th className="text-right">{t('adminLoans.procFee')}</th>
                <th className="text-right">{t('loan.emiAmount')}</th>
                <th>{t('table.status')}</th>
                <th>{t('table.date')}</th>
                <th className="text-right">{t('table.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loans.map((loan, index) => (
                <tr key={loan._id}>
                  <td className="text-slate-500">{((page || 1) - 1) * 10 + index + 1}</td>
                  <td className="font-medium">{loan.loanId}</td>
                  <td>{getFullName(loan.user)}</td>
                  <td className="capitalize">{loan.loanType}</td>
                  <td className="text-right">{formatCurrency(loan.amount)}</td>
                  <td className="text-right">{loan.interestRate}%</td>
                  <td className="text-right">{formatCurrency(loan.processingFee || 0)}</td>
                  <td className="text-right">{formatCurrency(loan.emiAmount)}</td>
                  <td><Badge status={loan.status} /></td>
                  <td className="whitespace-nowrap">{formatDate(loan.createdAt)}</td>
                  <td className="text-right !whitespace-nowrap">
                    <div className="table-actions flex !flex-row !flex-nowrap items-center gap-1 justify-end whitespace-nowrap">
                      {loanActions(loan)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loans.length && (
          <p className="p-4 text-center text-slate-500 text-sm">{t('noData')}</p>
        )}
      </div>

      <Pagination meta={meta} onPageChange={setPage} />

      <Modal 
        isOpen={!!actionLoan && actionType === 'approved'} 
        onClose={() => { if (!submittingRef.current) resetFields(); }} 
        title={t('adminLoans.approveTitle')}
        size="lg"
      >
        <div className="space-y-6 max-h-[70vh] overflow-y-auto">
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <p className="font-semibold text-lg">{t('adminLoans.loanDetails')}</p>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div>
                <span className="text-sm text-gray-600 dark:text-gray-400">{t('table.loanId')}:</span>
                <span className="ml-2 font-medium">{actionLoan?.loanId}</span>
              </div>
              <div>
                <span className="text-sm text-gray-600 dark:text-gray-400">{t('table.amount')}:</span>
                <span className="ml-2 font-medium">{formatCurrency(actionLoan?.amount)}</span>
              </div>
              <div>
                <span className="text-sm text-gray-600 dark:text-gray-400">{t('table.type')}:</span>
                <span className="ml-2 font-medium capitalize">{actionLoan?.loanType}</span>
              </div>
              <div>
                <span className="text-sm text-gray-600 dark:text-gray-400">{t('table.user')}:</span>
                <span className="ml-2 font-medium">{getFullName(actionLoan?.user)}</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-3">{t('adminLoans.selectTenure')} <span className="text-red-500">*</span></h3>
            <div className="flex flex-wrap gap-2">
              {/* {TENURE_OPTIONS.map((tenure) => (
                <button
                  key={tenure}
                  type="button"
                  onClick={() => {
                    setSelectedTenure(tenure);
                    setManualTenure('');
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedTenure === tenure 
                      ? 'bg-primary-600 text-white' 
                      : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {t('adminLoans.months', { count: tenure })}
                </button>
              ))} */}
            </div>
            <div className="mt-3">
              <label className="label">{t('adminLoans.manualTenure')}</label>
              <input
                type="number"
                className="input"
                min={1}
                max={360}
                placeholder={t('adminLoans.manualTenurePlaceholder')}
                value={manualTenure}
                onChange={(e) => {
                  setManualTenure(e.target.value);
                  setSelectedTenure('');
                }}
              />
            </div>
            {!selectedTenure && !manualTenure && (
              <p className="text-red-500 text-sm mt-2">{t('adminLoans.selectTenureRequired')}</p>
            )}
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-3">{t('adminLoans.interestConfig')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">{t('adminLoans.interestRatePercent')}</label>
                <input
                  type="number"
                  className="input"
                  value={interestRate}
                  onChange={(e) => setInterestRate(e.target.value)}
                  placeholder={t('adminLoans.enterInterestRate')}
                  step="0.01"
                />
              </div>
              <div>
                <label className="label">{t('adminLoans.interestType')}</label>
                <select
                  className="input"
                  value={interestType}
                  onChange={(e) => setInterestType(e.target.value)}
                >
                  <option value="reducing_balance">{t('adminLoans.reducingBalance')}</option>
                  <option value="flat">{t('adminLoans.flatInterest')}</option>
                </select>
              </div>
               <div>
                  <label className="label">{t('adminLoans.processingFeeAmount')}</label>
                  <input
                    type="number"
                    className="input"
                    value={processingFeeValue}
                    onChange={(e) => handleProcessingFeeChange('processingFeeValue', e.target.value)}
                    placeholder={t('adminLoans.enterFeeAmount')}
                  />
                </div>
            </div>
          </div>

          {/* <div>
            <h3 className="text-lg font-semibold mb-3">{t('loan.processingFee')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">{t('adminLoans.feeType')}</label>
                <select 
                  className="input" 
                  value={processingFeeType} 
                  onChange={(e) => handleProcessingFeeChange('processingFeeType', e.target.value)}
                >
                  <option value="flat">{t('adminLoans.flatAmount')}</option>
                  <option value="percentage">{t('adminLoans.percentage')}</option>
                </select>
              </div>
              {processingFeeType === 'flat' ? (
                <div>
                  <label className="label">{t('adminLoans.processingFeeAmount')}</label>
                  <input
                    type="number"
                    className="input"
                    value={processingFeeValue}
                    onChange={(e) => handleProcessingFeeChange('processingFeeValue', e.target.value)}
                    placeholder={t('adminLoans.enterFeeAmount')}
                  />
                </div>
              ) : (
                <div>
                  <label className="label">{t('adminLoans.processingFeePercent')}</label>
                  <input
                    type="number"
                    className="input"
                    value={processingFeePercent}
                    onChange={(e) => handleProcessingFeeChange('processingFeePercent', e.target.value)}
                    placeholder={t('adminLoans.enterFeePercent')}
                    step="0.01"
                  />
                </div>
              )}
            </div>
            
            {actionLoan && (
              <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-sm">
                <span className="font-medium">{t('adminLoans.calculatedFee')}: </span>
                {processingFeeType === 'flat' 
                  ? formatCurrency(parseFloat(processingFeeValue) || 0)
                  : formatCurrency(((parseFloat(processingFeePercent) || 0) * (actionLoan.amount || 0)) / 100)
                }
              </div>
            )}
          </div> */}

          {/* <div>
            <h3 className="text-lg font-semibold mb-3">{t('adminLoans.gstConfig')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={gstEnabled} 
                    onChange={(e) => handleProcessingFeeChange('gstEnabled', e.target.checked)}
                    className="rounded"
                  />
                  <span className="label">{t('adminLoans.enableGst')}</span>
                </label>
              </div>
              {gstEnabled && (
                <>
                  <div>
                    <label className="label">{t('adminLoans.gstRate')}</label>
                    <input
                      type="number"
                      className="input"
                      value={gstPercent}
                      onChange={(e) => handleProcessingFeeChange('gstPercent', e.target.value)}
                      placeholder={t('adminLoans.gstPercentPlaceholder')}
                      step="0.01"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="label">{t('adminLoans.calculatedGst')}</label>
                    <input
                      type="number"
                      className="input bg-gray-50 dark:bg-gray-700"
                      value={gstAmount}
                      readOnly
                      placeholder={t('adminLoans.autoCalculated')}
                    />
                  </div>
                </>
              )}
            </div>
          </div> */}

          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">{t('adminLoans.disbursementSummary')}</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>{t('loan.loanAmount')}:</span>
                <span className="font-medium">{formatCurrency(actionLoan?.amount || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span>{t('loan.tenure')}:</span>
                <span className="font-medium">
                  {(selectedTenure || manualTenure)
                    ? t('adminLoans.months', { count: selectedTenure || parseInt(manualTenure, 10) })
                    : t('adminLoans.notSelected')}
                </span>
              </div>
              <div className="flex justify-between">
                <span>{t('loan.processingFee')}:</span>
                <span className="font-medium text-red-600">
                  -{formatCurrency(
                    processingFeeType === 'flat' 
                      ? (parseFloat(processingFeeValue) || 0)
                      : ((parseFloat(processingFeePercent) || 0) * (actionLoan?.amount || 0)) / 100
                  )}
                </span>
              </div>
              {gstEnabled && (
                <div className="flex justify-between">
                  <span>{t('loan.gst')}:</span>
                  <span className="font-medium text-red-600">-{formatCurrency(parseFloat(gstAmount) || 0)}</span>
                </div>
              )}
              <div className="flex justify-between border-t pt-1 mt-1">
                <span className="font-semibold">{t('adminLoans.netDisbursed')}:</span>
                <span className="font-semibold text-green-600">
                  {formatCurrency(
                    (actionLoan?.amount || 0) - 
                    (processingFeeType === 'flat' 
                      ? (parseFloat(processingFeeValue) || 0)
                      : ((parseFloat(processingFeePercent) || 0) * (actionLoan?.amount || 0)) / 100
                    ) - 
                    (gstEnabled ? (parseFloat(gstAmount) || 0) : 0)
                  )}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAction}
            disabled={submitting}
            aria-busy={submitting}
            className="btn-primary w-full disabled:opacity-60 disabled:cursor-not-allowed disabled:pointer-events-none"
          >
            {submitting ? t('loading') : t('adminLoans.confirmApproval')}
          </button>
        </div>
      </Modal>

      <Modal 
        isOpen={!!actionLoan && (actionType === 'under_review' || actionType === 'disbursed' || actionType === 'closed')} 
        onClose={() => { if (!submittingRef.current) resetFields(); }} 
        title={t('adminLoans.actionLoanTitle', { action: getActionLabel(actionType) })}
      >
        <div className="space-y-4">
          <p>{t('adminLoans.actionConfirm', { action: getActionLabel(actionType).toLowerCase() })}</p>
          <p>{t('adminLoans.loanLabel')}: <strong>{actionLoan?.loanId}</strong> - {formatCurrency(actionLoan?.amount)}</p>
          <div className="flex gap-2">
            <button type="button" onClick={resetFields} className="btn-secondary flex-1" disabled={submitting}>{t('cancel')}</button>
            <button
              type="button"
              onClick={handleAction}
              className="btn-primary flex-1 disabled:opacity-60 disabled:pointer-events-none"
              disabled={submitting}
              aria-busy={submitting}
            >
              {submitting ? t('loading') : t('ui.confirm')}
            </button>
          </div>
        </div>
      </Modal>

      <Modal 
        isOpen={!!actionLoan && actionType === 'rejected'} 
        onClose={() => { if (!submittingRef.current) resetFields(); }} 
        title={t('adminLoans.rejectTitle')}
      >
        <div className="space-y-4">
          <p>{t('adminLoans.loanLabel')}: <strong>{actionLoan?.loanId}</strong> - {formatCurrency(actionLoan?.amount)}</p>
          <div>
            <label className="label">{t('adminLoans.rejectionReason')}</label>
            <textarea 
              className="input" 
              rows={3} 
              value={rejectReason} 
              onChange={(e) => setRejectReason(e.target.value)} 
              placeholder={t('adminLoans.rejectionPlaceholder')}
              disabled={submitting}
            />
          </div>
          <button
            type="button"
            onClick={handleAction}
            className="btn-primary w-full disabled:opacity-60 disabled:pointer-events-none"
            disabled={submitting}
            aria-busy={submitting}
          >
            {submitting ? t('loading') : t('adminLoans.confirmRejection')}
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default AdminLoans;
