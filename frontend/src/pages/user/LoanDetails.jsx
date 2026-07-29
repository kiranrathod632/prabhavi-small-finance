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
import { HiArrowLeft } from 'react-icons/hi';

const LoanDetails = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTenure, setSelectedTenure] = useState(null);
  const [selectingTenure, setSelectingTenure] = useState(false);

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
    { label: t('loan.interestRate'), value: `${loan.interestRate}% p.a.` },
    { label: t('loan.emiAmount'), value: loan.emiAmount ? formatCurrency(loan.emiAmount) : t('ui.pending') },
    { label: t('ui.tenure'), value: loan.tenure ? t('adminLoans.months', { count: loan.tenure }) : t('ui.notSelected') },
    { label: t('ui.totalPayable'), value: formatCurrency(loan.totalPayable) },
    { label: t('ui.totalInterest'), value: formatCurrency(loan.totalInterest) },
    { label: t('emi.paidAmount'), value: formatCurrency(loan.paidAmount) },
    { label: t('ui.remaining'), value: formatCurrency(loan.remainingBalance) },
  ];

  return (
    <div>
      <Link to="/loans" className="inline-flex items-center text-sm text-primary-600 hover:underline mb-4">
        <HiArrowLeft className="w-4 h-4 mr-1" /> {t('ui.backToLoans')}
      </Link>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">{loan.loanId}</h1>
          <Badge status={loan.status} />
        </div>
      </div>

      <LoanTimeline timeline={timeline} currentStatus={loan.status} />
      <FeeBreakup feeBreakup={feeBreakup} loan={loan} />

      {loan.status === 'approved' && !loan.selectedTenure && (
        <div className="card mb-6 border-2 border-primary-200">
          <h3 className="font-semibold mb-4">{t('ui.selectLoanTenure')}</h3>
          <p className="text-sm text-gray-500 mb-4">{t('ui.selectTenureHint')}</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {tenures.map((opt) => (
              <button
                key={opt}
                onClick={() => setSelectedTenure(opt)}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${selectedTenure === opt ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-700'}`}
              >
                {opt} {t('ui.months')}
              </button>
            ))}
          </div>
          <Link to="/emi-calculator" state={{ amount: loan.amount, loanType: loan.loanType }} className="text-sm text-primary-600 hover:underline mr-4">
            {t('ui.viewEmiCalculator')}
          </Link>
          <button onClick={handleSelectTenure} disabled={selectingTenure} className="btn-primary">
            {t('ui.confirmTenure')}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {summaryItems.map((item) => (
          <div key={item.label} className="card">
            <p className="text-sm text-gray-500">{item.label}</p>
            <p className="text-lg font-semibold mt-1">{item.value}</p>
          </div>
        ))}
      </div>

      {emis?.length > 0 && (
        <div className="card">
          <h3 className="font-semibold mb-4">{t('ui.emiSchedule')}</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b dark:border-gray-700">
                  <th className="text-left py-2 px-2">#</th>
                  <th className="text-right py-2 px-2">{t('loan.emiAmount')}</th>
                  <th className="text-right py-2 px-2">{t('ui.principal')}</th>
                  <th className="text-right py-2 px-2">{t('ui.interest')}</th>
                  <th className="text-right py-2 px-2">{t('emi.penalty')}</th>
                  <th className="text-right py-2 px-2">{t('ui.pending')}</th>
                  <th className="text-left py-2 px-2">{t('emi.dueDate')}</th>
                  <th className="text-left py-2 px-2">{t('table.status')}</th>
                </tr>
              </thead>
              <tbody>
                {emis.map((emi) => (
                  <tr key={emi._id} className="border-b dark:border-gray-700/50">
                    <td className="py-2 px-2">{emi.emiNumber}</td>
                    <td className="py-2 px-2 text-right">{formatCurrency(emi.amount)}</td>
                    <td className="py-2 px-2 text-right">{formatCurrency(emi.principal)}</td>
                    <td className="py-2 px-2 text-right">{formatCurrency(emi.interest)}</td>
                    <td className="py-2 px-2 text-right text-red-600">{formatCurrency(emi.penalty)}</td>
                    <td className="py-2 px-2 text-right">{formatCurrency(emi.pendingAmount)}</td>
                    <td className="py-2 px-2">{formatDate(emi.dueDate)}</td>
                    <td className="py-2 px-2"><Badge status={emi.status} /></td>
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
