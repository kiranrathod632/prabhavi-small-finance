import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import adminPanelAPI from '../../services/adminPanelAPI';
import { formatCurrency, formatDate, getErrorMessage, downloadBlob } from '../../utils/helpers';
import Badge from '../../components/Badge';
import SearchBar from '../../components/SearchBar';
import Pagination from '../../components/Pagination';
import Modal from '../../components/Modal';
import { PageLoader } from '../../components/LoadingSpinner';
import { HiDownload } from 'react-icons/hi';
import { TENURE_OPTIONS } from '../../utils/roles';

const AdminLoans = () => {
  const { t } = useTranslation();
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
    setActionLoan(loan);
    setActionType('approved');
    setSelectedTenure('');
    
    if (defaultSettings) {
      setInterestRate(loan.interestRate || defaultSettings.defaultInterestRate || '');
      setInterestType(loan.interestType || defaultSettings.interestType || 'reducing_balance');
      setInterestRatePeriod(loan.interestRatePeriod || defaultSettings.interestRatePeriod || 'monthly');
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
    try {
      const data = { status: actionType };
      
      if (actionType === 'rejected') {
        data.rejectedReason = rejectReason;
      }
      
      if (actionType === 'approved') {
        if (!selectedTenure) {
          toast.error(t('adminLoans.selectTenureToast'));
          return;
        }
        
        data.tenure = parseInt(selectedTenure);
        
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
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const resetFields = () => {
    setActionLoan(null);
    setActionType('');
    setRejectReason('');
    setSelectedTenure('');
    setInterestRate('');
    setInterestType('reducing_balance');
    setInterestRatePeriod('monthly');
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

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">{t('adminLoans.title')}</h1>
        <button onClick={handleExport} className="btn-secondary"><HiDownload className="w-4 h-4 mr-1" /> {t('adminDash.exportExcel')}</button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder={t('adminLoans.searchPlaceholder')} className="sm:w-64" />
        <select className="input sm:w-40" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          {statusOptions.map((s) => (
            <option key={s || 'all'} value={s}>{s ? t(`statusLabel.${s}`) : t('ui.allStatus')}</option>
          ))}
        </select>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b dark:border-gray-700">
              <th className="text-left py-3 px-2">{t('table.loanId')}</th>
              <th className="text-left py-3 px-2">{t('table.user')}</th>
              <th className="text-left py-3 px-2">{t('table.type')}</th>
              <th className="text-right py-3 px-2">{t('table.amount')}</th>
              <th className="text-right py-3 px-2">{t('ui.rate')}</th>
              <th className="text-right py-3 px-2">{t('adminLoans.procFee')}</th>
              <th className="text-right py-3 px-2">{t('loan.emiAmount')}</th>
              <th className="text-left py-3 px-2">{t('table.status')}</th>
              <th className="text-left py-3 px-2">{t('table.date')}</th>
              <th className="text-right py-3 px-2">{t('table.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {loans.map((loan) => (
              <tr key={loan._id} className="border-b dark:border-gray-700/50">
                <td className="py-3 px-2 font-medium">{loan.loanId}</td>
                <td className="py-3 px-2">{loan.user?.name}</td>
                <td className="py-3 px-2 capitalize">{loan.loanType}</td>
                <td className="py-3 px-2 text-right">{formatCurrency(loan.amount)}</td>
                <td className="py-3 px-2 text-right">{loan.interestRate}%</td>
                <td className="py-3 px-2 text-right">{formatCurrency(loan.processingFee || 0)}</td>
                <td className="py-3 px-2 text-right">{formatCurrency(loan.emiAmount)}</td>
                <td className="py-3 px-2"><Badge status={loan.status} /></td>
                <td className="py-3 px-2">{formatDate(loan.createdAt)}</td>
                <td className="py-3 px-2 text-right space-x-1">
                  {loan.status === 'pending' && (
                    <>
                      <button onClick={() => { setActionLoan(loan); setActionType('under_review'); }} className="btn-secondary text-xs py-1 px-2">{t('ui.review')}</button>
                      <button onClick={() => openApprovalModal(loan)} className="btn-success text-xs py-1 px-2">{t('loan.approve')}</button>
                      <button onClick={() => { setActionLoan(loan); setActionType('rejected'); }} className="btn-danger text-xs py-1 px-2">{t('loan.reject')}</button>
                    </>
                  )}
                  {loan.status === 'under_review' && (
                    <>
                      <button onClick={() => openApprovalModal(loan)} className="btn-success text-xs py-1 px-2">{t('loan.approve')}</button>
                      <button onClick={() => { setActionLoan(loan); setActionType('rejected'); }} className="btn-danger text-xs py-1 px-2">{t('loan.reject')}</button>
                    </>
                  )}
      
                  {canCloseLoan(loan) && (
                    <button onClick={() => { setActionLoan(loan); setActionType('closed'); }} className="btn-secondary text-xs py-1 px-2">{t('ui.close')}</button>
                  )}
                </td>
              </tr>
            ))}
            {!loans.length && (
              <tr>
                <td colSpan={10} className="py-10 text-center text-primary-400">{t('noData')}</td>
              </tr>
            )}
          </tbody>
        </table>
        <Pagination meta={meta} onPageChange={setPage} />
      </div>

      <Modal 
        isOpen={!!actionLoan && actionType === 'approved'} 
        onClose={resetFields} 
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
                <span className="ml-2 font-medium">{actionLoan?.user?.name}</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-3">{t('adminLoans.selectTenure')} <span className="text-red-500">*</span></h3>
            <div className="flex flex-wrap gap-2">
              {TENURE_OPTIONS.map((tenure) => (
                <button
                  key={tenure}
                  type="button"
                  onClick={() => setSelectedTenure(tenure)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedTenure === tenure 
                      ? 'bg-primary-600 text-white' 
                      : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {t('adminLoans.months', { count: tenure })}
                </button>
              ))}
            </div>
            {!selectedTenure && (
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
                  <label className="label">{t('adminLoans.processingFeeAmount')}</label>
                  <input
                    type="number"
                    className="input"
                    value={processingFeeValue}
                    onChange={(e) => handleProcessingFeeChange('processingFeeValue', e.target.value)}
                    placeholder={t('adminLoans.enterFeeAmount')}
                  />
                </div>
              {/* <div>
                <label className="label">{t('adminLoans.ratePeriod')}</label>
                <select 
                  className="input" 
                  value={interestRatePeriod} 
                  onChange={(e) => setInterestRatePeriod(e.target.value)}
                >
                  <option value="yearly">{t('adminLoans.yearly')}</option>
                  <option value="monthly">{t('adminLoans.monthly')}</option>
                </select>
              </div> */}
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

          <div>
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
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">{t('adminLoans.disbursementSummary')}</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>{t('loan.loanAmount')}:</span>
                <span className="font-medium">{formatCurrency(actionLoan?.amount || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span>{t('loan.tenure')}:</span>
                <span className="font-medium">{selectedTenure ? t('adminLoans.months', { count: selectedTenure }) : t('adminLoans.notSelected')}</span>
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

          <button onClick={handleAction} className="btn-primary w-full">
            {t('adminLoans.confirmApproval')}
          </button>
        </div>
      </Modal>

      <Modal 
        isOpen={!!actionLoan && (actionType === 'under_review' || actionType === 'disbursed' || actionType === 'closed')} 
        onClose={resetFields} 
        title={t('adminLoans.actionLoanTitle', { action: getActionLabel(actionType) })}
      >
        <div className="space-y-4">
          <p>{t('adminLoans.actionConfirm', { action: getActionLabel(actionType).toLowerCase() })}</p>
          <p>{t('adminLoans.loanLabel')}: <strong>{actionLoan?.loanId}</strong> - {formatCurrency(actionLoan?.amount)}</p>
          <div className="flex gap-2">
            <button onClick={resetFields} className="btn-secondary flex-1">{t('cancel')}</button>
            <button onClick={handleAction} className="btn-primary flex-1">{t('ui.confirm')}</button>
          </div>
        </div>
      </Modal>

      <Modal 
        isOpen={!!actionLoan && actionType === 'rejected'} 
        onClose={resetFields} 
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
            />
          </div>
          <button onClick={handleAction} className="btn-primary w-full">{t('adminLoans.confirmRejection')}</button>
        </div>
      </Modal>
    </div>
  );
};

export default AdminLoans;
