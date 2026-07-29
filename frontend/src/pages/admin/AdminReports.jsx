import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { dashboardAPI } from '../../services';
import { formatCurrency, formatDate } from '../../utils/helpers';
import { downloadBlob } from '../../utils/helpers';

const AdminReports = () => {
  const { t } = useTranslation();
  const [activeReport, setActiveReport] = useState('loans');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const reportTypes = [
    { id: 'loans', label: t('adminReports.loanReport') },
    { id: 'emis', label: t('adminReports.emiReport') },
    { id: 'transactions', label: t('adminReports.transactionReport') },
    { id: 'users', label: t('adminReports.userReport') },
    { id: 'profit', label: t('adminReports.profitReport') },
  ];

  const fetchReport = async (type) => {
    setLoading(true);
    setActiveReport(type);
    try {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const res = await dashboardAPI.getReport(type, params);
      setData(res.data.data);
    } catch {
      toast.error(t('adminReports.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const renderTable = () => {
    if (!data) return <p className="text-gray-500 text-center py-8">{t('ui.selectReport')}</p>;
    if (loading) return <p className="text-center py-8">{t('loading')}</p>;

    if (activeReport === 'profit') {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(data).map(([key, value]) => (
            <div key={key} className="card">
              <p className="text-sm text-gray-500 capitalize">{key.replace(/([A-Z])/g, ' $1')}</p>
              <p className="text-xl font-bold mt-1">{formatCurrency(value)}</p>
            </div>
          ))}
        </div>
      );
    }

    if (!Array.isArray(data) || !data.length) {
      return <p className="text-gray-500 text-center py-8">{t('noData')}</p>;
    }

    const headers = Object.keys(data[0]).filter((k) => !k.startsWith('_') && k !== '__v');

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b dark:border-gray-700">
              {headers.map((h) => (
                <th key={h} className="text-left py-2 px-2 capitalize">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.slice(0, 50).map((row, i) => (
              <tr key={i} className="border-b dark:border-gray-700/50">
                {headers.map((h) => (
                  <td key={h} className="py-2 px-2">
                    {typeof row[h] === 'object' ? (row[h]?.name || row[h]?.loanId || '-') :
                      h.includes('amount') || h.includes('Balance') || h.includes('Fund') ? formatCurrency(row[h]) :
                      h.includes('Date') || h.includes('At') ? formatDate(row[h]) :
                      String(row[h] ?? '-')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {data.length > 50 && <p className="text-sm text-gray-500 mt-2">{t('ui.showingRecords', { count: data.length })}</p>}
      </div>
    );
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{t('adminReports.title')}</h1>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input type="date" className="input sm:w-40" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <input type="date" className="input sm:w-40" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto">
        {reportTypes.map((r) => (
          <button
            key={r.id}
            onClick={() => fetchReport(r.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
              activeReport === r.id ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-700'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="card">{renderTable()}</div>
    </div>
  );
};

export default AdminReports;
