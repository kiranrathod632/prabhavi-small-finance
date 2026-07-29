import { useEffect, useState } from 'react';
import { recoveryAPI } from '../../services';
import StatCard from '../../components/StatCard';
import { formatCurrency, formatDate } from '../../utils/helpers';
import Badge from '../../components/Badge';
import { HiUsers, HiExclamation, HiCheck, HiCurrencyRupee } from 'react-icons/hi';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

const RecoveryDashboard = () => {
  const [data, setData] = useState(null);

  useEffect(() => {
    recoveryAPI.getDashboard()
      .then((res) => setData(res.data.data))
      .catch(() => toast.error('Failed to load recovery dashboard'));
  }, []);

  if (!data) return <div className="p-8 text-center">Loading...</div>;
  const { cards, overdueEmis } = data;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Recovery Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Assigned Customers" value={cards.assignedCustomers} icon={HiUsers} color="primary" />
        <StatCard title="Pending Cases" value={cards.pendingCases} icon={HiExclamation} color="yellow" />
        <StatCard title="Overdue Cases" value={cards.overdueCases} icon={HiExclamation} color="red" />
        <StatCard title="Recovered" value={cards.recoveredCases} icon={HiCheck} color="green" />
        <StatCard title="Total Penalty" value={formatCurrency(cards.totalPenalty)} icon={HiCurrencyRupee} color="red" />
      </div>

      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold">Overdue EMIs</h3>
          <Link to="/recovery/cases" className="text-sm text-primary-600 hover:underline">View All Cases</Link>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b dark:border-gray-700">
              <th className="text-left py-2">Customer</th>
              <th className="text-left py-2">Loan</th>
              <th className="text-right py-2">Amount</th>
              <th className="text-left py-2">Due Date</th>
              <th className="text-left py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {overdueEmis?.map((emi) => (
              <tr key={emi._id} className="border-b dark:border-gray-700/50">
                <td className="py-2">{emi.user?.name}</td>
                <td className="py-2">{emi.loan?.loanId}</td>
                <td className="py-2 text-right">{formatCurrency(emi.amount + (emi.penalty || 0))}</td>
                <td className="py-2">{formatDate(emi.dueDate)}</td>
                <td className="py-2"><Badge status={emi.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RecoveryDashboard;
