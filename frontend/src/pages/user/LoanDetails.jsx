import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { loanAPI } from '../../services';
import { formatCurrency, formatDate, getErrorMessage } from '../../utils/helpers';
import { TENURE_OPTIONS } from '../../utils/roles';
import Badge from '../../components/Badge';
import LoanTimeline from '../../components/LoanTimeline';
import FeeBreakup from '../../components/FeeBreakup';
import { PageLoader } from '../../components/LoadingSpinner';
import { HiArrowLeft, HiChevronDown, HiChevronUp } from 'react-icons/hi';

const LoanDetails = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTenure, setSelectedTenure] = useState(null);
  const [selectingTenure, setSelectingTenure] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);

  const fetchLoan = async () => {
    try {
      const res = await loanAPI.getById(id);
      setData(res.data.data);
    } catch {
      toast.error(t('ui.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLoan(); }, [id]);

  const handleSelectTenure = async () => {
    if (!selectedTenure) return toast.error(t('ui.pleaseSelectTenure'));
    setSelectingTenure(true);
    try {
      await loanAPI.selectTenure(id, selectedTenure);
      toast.success(t('ui.tenureSelected'));
      fetchLoan();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSelectingTenure(false);
    }
  };

  if (loading) return <PageLoader />;
  if (!data) return <p>{t('ui.loanNotFound')}</p>;

  const { loan, emis, timeline, feeBreakup, allowedTenures } = data;
  const tenures = allowedTenures || TENURE_OPTIONS;

  const summaryItems = [
    { label: t('loan.loanAmount'), value: formatCurrency(loan.amount) },
    { label: t('loan.interestRate'), value: `${loan.interestRate}%` },
    { label: t('loan.emiAmount'), value: loan.emiAmount ? formatCurrency(loan.emiAmount) : t('ui.pending') },
    { label: t('ui.tenure'), value: loan.tenure ? `${loan.tenure}m` : t('ui.notSelected') },
    { label: t('ui.totalPayable'), value: formatCurrency(loan.totalPayable) },
    { label: t('ui.totalInterest'), value: formatCurrency(loan.totalInterest) },
    { label: t('emi.paidAmount'), value: formatCurrency(loan.paidAmount) },
    { label: t('ui.remaining'), value: formatCurrency(loan.remainingBalance) },
  ];

  return (
    <div>
      <Link to="/loans" className="inline-flex items-center text-xs sm:text-sm text-primary-600 hover:underline mb-3 sm:mb-4">
        <HiArrowLeft className="w-3 h-3 sm:w-4 sm:h-4 mr-1" /> {t('ui.backToLoans')}
      </Link>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4 mb-4 sm:mb-6">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-lg sm:text-2xl font-bold">{loan.loanId}</h1>
          <Badge status={loan.status} />
        </div>
      </div>

      {/* Toggle Button for Timeline */}
      <button
        onClick={() => setShowTimeline(!showTimeline)}
        className="w-full flex items-center justify-between p-3 sm:p-4 mb-3 sm:mb-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
      >
        <span className="text-sm sm:text-base font-medium text-slate-700 dark:text-slate-300">
          {t('loan.statusTimeline', { defaultValue: 'Loan Status Timeline' })}
        </span>
        {showTimeline ? (
          <HiChevronUp className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500" />
        ) : (
          <HiChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500" />
        )}
      </button>

      {/* Timeline - Show only when expanded */}
      {showTimeline && <LoanTimeline timeline={timeline} currentStatus={loan.status} />}

      <FeeBreakup feeBreakup={feeBreakup} loan={loan} />

      {loan.status === 'approved' && !loan.selectedTenure && (
        <div className="card mb-4 sm:mb-6 border-2 border-primary-200 p-3 sm:p-6">
          <h3 className="font-semibold mb-2 sm:mb-4 text-sm sm:text-base">{t('ui.selectLoanTenure')}</h3>
          <p className="text-xs sm:text-sm text-gray-500 mb-3 sm:mb-4">{t('ui.selectTenureHint')}</p>
          <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-3 sm:mb-4">
            {tenures.map((opt) => (
              <button
                key={opt}
                onClick={() => setSelectedTenure(opt)}
                className={`px-2.5 sm:px-4 py-1 sm:py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap ${selectedTenure === opt ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-700'}`}
              >
                {opt}m
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <Link to="/emi-calculator" state={{ amount: loan.amount, loanType: loan.loanType }} className="text-xs sm:text-sm text-primary-600 hover:underline">
              {t('ui.viewEmiCalculator')}
            </Link>
            <button onClick={handleSelectTenure} disabled={selectingTenure} className="btn-primary whitespace-nowrap text-xs sm:text-sm py-1 sm:py-2 px-3 sm:px-4">
              {t('ui.confirmTenure')}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
        {summaryItems.map((item) => (
          <div key={item.label} className="card p-2.5 sm:p-4">
            <p className="text-[10px] sm:text-sm text-gray-500 truncate">{item.label}</p>
            <p className="text-xs sm:text-lg font-semibold mt-0.5 sm:mt-1 truncate">{item.value}</p>
          </div>
        ))}
      </div>

      {emis?.length > 0 && (
        <div className="card overflow-hidden p-3 sm:p-6">
          <h3 className="font-semibold mb-2 sm:mb-4 text-sm sm:text-base">{t('ui.emiSchedule')}</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm min-w-[600px] sm:min-w-[700px]">
              <thead>
                <tr className="border-b dark:border-gray-700 bg-slate-50 dark:bg-slate-800">
                  <th className="text-left py-1.5 sm:py-2 px-2 sm:px-3 text-[10px] sm:text-xs font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">#</th>
                  <th className="text-right py-1.5 sm:py-2 px-2 sm:px-3 text-[10px] sm:text-xs font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">{t('loan.emiAmount')}</th>
                  <th className="text-right py-1.5 sm:py-2 px-2 sm:px-3 text-[10px] sm:text-xs font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">{t('ui.principal')}</th>
                  <th className="text-right py-1.5 sm:py-2 px-2 sm:px-3 text-[10px] sm:text-xs font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">{t('ui.interest')}</th>
                  <th className="text-right py-1.5 sm:py-2 px-2 sm:px-3 text-[10px] sm:text-xs font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">{t('emi.penalty')}</th>
                  <th className="text-right py-1.5 sm:py-2 px-2 sm:px-3 text-[10px] sm:text-xs font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">{t('ui.pending')}</th>
                  <th className="text-left py-1.5 sm:py-2 px-2 sm:px-3 text-[10px] sm:text-xs font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">{t('emi.dueDate')}</th>
                  <th className="text-center py-1.5 sm:py-2 px-2 sm:px-3 text-[10px] sm:text-xs font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">{t('table.status')}</th>
                </tr>
              </thead>
              <tbody>
                {emis.map((emi, index) => (
                  <tr key={emi._id} className="border-b dark:border-gray-700/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-1.5 sm:py-2 px-2 sm:px-3 whitespace-nowrap font-medium text-[10px] sm:text-sm">
                      {emi.emiNumber ? emi.emiNumber.replace(/^[^-]+-/, '') : index + 1}
                    </td>
                    <td className="py-1.5 sm:py-2 px-2 sm:px-3 text-right whitespace-nowrap text-[10px] sm:text-sm">{formatCurrency(emi.amount)}</td>
                    <td className="py-1.5 sm:py-2 px-2 sm:px-3 text-right whitespace-nowrap text-[10px] sm:text-sm">{formatCurrency(emi.principal)}</td>
                    <td className="py-1.5 sm:py-2 px-2 sm:px-3 text-right whitespace-nowrap text-[10px] sm:text-sm">{formatCurrency(emi.interest)}</td>
                    <td className="py-1.5 sm:py-2 px-2 sm:px-3 text-right text-red-600 whitespace-nowrap text-[10px] sm:text-sm">{formatCurrency(emi.penalty)}</td>
                    <td className="py-1.5 sm:py-2 px-2 sm:px-3 text-right whitespace-nowrap text-[10px] sm:text-sm">{formatCurrency(emi.pendingAmount)}</td>
                    <td className="py-1.5 sm:py-2 px-2 sm:px-3 whitespace-nowrap text-[10px] sm:text-sm">{formatDate(emi.dueDate)}</td>
                    <td className="py-1.5 sm:py-2 px-2 sm:px-3 text-center whitespace-nowrap">
                      <Badge status={emi.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoanDetails;