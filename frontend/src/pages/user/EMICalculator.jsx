import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { loanAPI } from '../../services';
import { formatCurrency, getErrorMessage, loanTypes } from '../../utils/helpers';
import { TENURE_OPTIONS } from '../../utils/roles';
import { BarChart } from '../../components/Charts';

const LOAN_TYPE_KEYS = {
  personal: 'ui.personal',
  home: 'ui.homeLoan',
  business: 'ui.business',
  education: 'ui.education',
  vehicle: 'ui.vehicle',
};

const EMICalculator = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const [amount, setAmount] = useState(location.state?.amount || 100000);
  const [tenure, setTenure] = useState(12);
  const [loanType, setLoanType] = useState(location.state?.loanType || 'personal');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const calculate = async () => {
    setLoading(true);
    try {
      const res = await loanAPI.calculate({ amount, tenure, loanType });
      setResult(res.data.data);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const chartData = result?.schedule?.slice(0, 12).map((s) => ({
    month: `M${s.emiNumber}`,
    value: s.principal,
  }));

  const summaryItems = result ? [
    { label: t('ui.monthlyEmi'), value: formatCurrency(result.emiAmount) },
    { label: t('ui.totalInterest'), value: formatCurrency(result.totalInterest) },
    { label: t('ui.totalPayable'), value: formatCurrency(result.totalPayable) },
    { label: t('ui.netDisbursed'), value: formatCurrency(result.netDisbursed) },
    { label: t('loan.processingFee'), value: formatCurrency(result.processingFee) },
    { label: t('loan.gst'), value: formatCurrency(result.gstAmount) },
  ] : [];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{t('emiCalculator')}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card space-y-4">
          <div>
            <label className="label">{t('loan.loanType')}</label>
            <select className="input" value={loanType} onChange={(e) => setLoanType(e.target.value)}>
              {loanTypes.map((lt) => <option key={lt.value} value={lt.value}>{t(LOAN_TYPE_KEYS[lt.value])}</option>)}
            </select>
          </div>
          <div>
            <label className="label">{t('loan.loanAmount')} (₹)</label>
            <input type="number" className="input" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div>
            <label className="label">{t('loan.tenure')}</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {TENURE_OPTIONS.map((opt) => (
                <button key={opt} onClick={() => setTenure(opt)} className={`px-3 py-1.5 rounded-lg text-sm ${tenure === opt ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-700'}`}>
                  {opt}
                </button>
              ))}
            </div>
            <input type="number" className="input" value={tenure} onChange={(e) => setTenure(parseInt(e.target.value))} />
          </div>
          <button onClick={calculate} disabled={loading} className="btn-primary w-full">{t('ui.calculateEmi')}</button>
        </div>

        {result && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {summaryItems.map((item) => (
                <div key={item.label} className="card">
                  <p className="text-sm text-gray-500">{item.label}</p>
                  <p className="text-xl font-bold mt-1">{item.value}</p>
                </div>
              ))}
            </div>
            {chartData && (
              <div className="card">
                <h3 className="font-semibold mb-4">{t('ui.principalVsMonth')}</h3>
                <BarChart data={chartData} label={t('ui.principal')} color="#2563eb" />
              </div>
            )}
          </div>
        )}
      </div>

      {result?.schedule && (
        <div className="card mt-6 overflow-x-auto">
          <h3 className="font-semibold mb-4">{t('ui.amortization')}</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b dark:border-gray-700">
                <th className="text-left py-2 px-2">#</th>
                <th className="text-right py-2 px-2">{t('loan.emiAmount')}</th>
                <th className="text-right py-2 px-2">{t('ui.principal')}</th>
                <th className="text-right py-2 px-2">{t('ui.interest')}</th>
                <th className="text-right py-2 px-2">{t('ui.balance')}</th>
              </tr>
            </thead>
            <tbody>
              {result.schedule.map((s) => (
                <tr key={s.emiNumber} className="border-b dark:border-gray-700/50">
                  <td className="py-2 px-2">{s.emiNumber}</td>
                  <td className="py-2 px-2 text-right">{formatCurrency(s.amount)}</td>
                  <td className="py-2 px-2 text-right">{formatCurrency(s.principal)}</td>
                  <td className="py-2 px-2 text-right">{formatCurrency(s.interest)}</td>
                  <td className="py-2 px-2 text-right">{formatCurrency(s.remainingBalance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default EMICalculator;
