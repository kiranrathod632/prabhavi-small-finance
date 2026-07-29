import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Title, Tooltip, Legend, Filler
);

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
  },
  scales: {
    x: { grid: { display: false } },
    y: { grid: { color: 'rgba(0,0,0,0.05)' }, beginAtZero: true },
  },
};

export const LineChart = ({ data, label = 'Value', color = '#2563eb' }) => {
  const chartData = {
    labels: data?.map((d) => d.month) || [],
    datasets: [{
      label,
      data: data?.map((d) => d.value) || [],
      borderColor: color,
      backgroundColor: `${color}20`,
      fill: true,
      tension: 0.4,
    }],
  };

  return (
    <div className="h-64">
      <Line data={chartData} options={chartOptions} />
    </div>
  );
};

export const BarChart = ({ data, label = 'Value', color = '#2563eb' }) => {
  const chartData = {
    labels: data?.map((d) => d.month) || [],
    datasets: [{
      label,
      data: data?.map((d) => d.value) || [],
      backgroundColor: color,
      borderRadius: 6,
    }],
  };

  return (
    <div className="h-64">
      <Bar data={chartData} options={chartOptions} />
    </div>
  );
};

export const DoughnutChart = ({ data, labels, colors }) => {
  const chartData = {
    labels: labels || data?.map((d) => d.label) || [],
    datasets: [{
      data: data?.map((d) => d.value) || [],
      backgroundColor: colors || ['#2563eb', '#16a34a', '#eab308', '#ef4444', '#8b5cf6'],
    }],
  };

  return (
    <div className="h-64 flex items-center justify-center">
      <Doughnut data={chartData} options={{ responsive: true, maintainAspectRatio: false }} />
    </div>
  );
};

export const ProgressChart = ({ data }) => {
  if (!data?.length) return <p className="text-gray-500 text-center py-8">No loan data</p>;

  return (
    <div className="space-y-4">
      {data.map((loan) => (
        <div key={loan.loanId}>
          <div className="flex justify-between text-sm mb-1">
            <span className="font-medium">{loan.loanId} ({loan.type})</span>
            <span className="text-gray-500">{loan.progress}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
            <div
              className="bg-primary-600 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${loan.progress}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};
