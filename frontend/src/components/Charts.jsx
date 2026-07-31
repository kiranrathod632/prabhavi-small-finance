import { useEffect, useMemo, useState } from 'react';
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

const useIsNarrow = (breakpoint = 640) => {
  const [narrow, setNarrow] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < breakpoint : true
  );

  useEffect(() => {
    const onResize = () => setNarrow(window.innerWidth < breakpoint);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [breakpoint]);

  return narrow;
};

const shortenLabel = (label, narrow) => {
  if (!label) return '';
  const text = String(label);
  if (!narrow) return text;
  // "Jul 26" / "Feb 26" → "Jul"
  const parts = text.split(/\s+/);
  return parts[0] || text;
};

const buildOptions = (narrow, maxValue = 0) => ({
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 450 },
  interaction: { mode: 'index', intersect: false },
  layout: {
    padding: {
      top: 8,
      right: narrow ? 4 : 8,
      bottom: narrow ? 4 : 8,
      left: narrow ? 0 : 4,
    },
  },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: 'rgba(15, 23, 42, 0.92)',
      titleFont: { size: 12 },
      bodyFont: { size: 12 },
      padding: 10,
      cornerRadius: 8,
      displayColors: false,
    },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: {
        color: '#64748b',
        font: { size: narrow ? 10 : 11, weight: '500' },
        maxRotation: 0,
        minRotation: 0,
        autoSkip: true,
        maxTicksLimit: narrow ? 6 : 8,
        padding: 4,
      },
      border: { display: false },
    },
    y: {
      beginAtZero: true,
      grace: maxValue > 0 ? '8%' : undefined,
      suggestedMax: maxValue > 0 ? undefined : 10,
      grid: {
        color: 'rgba(100, 116, 139, 0.12)',
        drawBorder: false,
      },
      ticks: {
        color: '#64748b',
        font: { size: narrow ? 9 : 11 },
        padding: narrow ? 4 : 8,
        maxTicksLimit: narrow ? 5 : 6,
        precision: 0,
        callback(value) {
          const n = Number(value);
          if (!Number.isFinite(n)) return value;
          if (Math.abs(n) >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
          if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`;
          return n;
        },
      },
      border: { display: false },
    },
  },
});

const ChartShell = ({ children }) => (
  <div className="chart-wrap">
    {children}
  </div>
);

const maxOf = (data) => Math.max(0, ...((data || []).map((d) => Number(d.value) || 0)));

export const LineChart = ({ data, label = 'Value', color = '#2563eb' }) => {
  const narrow = useIsNarrow();
  const maxValue = maxOf(data);
  const options = useMemo(() => buildOptions(narrow, maxValue), [narrow, maxValue]);

  const chartData = {
    labels: (data || []).map((d) => shortenLabel(d.month, narrow)),
    datasets: [{
      label,
      data: (data || []).map((d) => d.value),
      borderColor: color,
      backgroundColor: `${color}22`,
      fill: true,
      tension: 0.35,
      borderWidth: 2.5,
      pointRadius: narrow ? 3 : 4,
      pointHoverRadius: 6,
      pointBackgroundColor: color,
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
    }],
  };

  return (
    <ChartShell>
      <Line data={chartData} options={options} />
    </ChartShell>
  );
};

export const BarChart = ({ data, label = 'Value', color = '#2563eb' }) => {
  const narrow = useIsNarrow();
  const maxValue = maxOf(data);
  const options = useMemo(() => buildOptions(narrow, maxValue), [narrow, maxValue]);

  const chartData = {
    labels: (data || []).map((d) => shortenLabel(d.month, narrow)),
    datasets: [{
      label,
      data: (data || []).map((d) => d.value),
      backgroundColor: color,
      hoverBackgroundColor: color,
      borderRadius: narrow ? 8 : 10,
      borderSkipped: false,
      maxBarThickness: narrow ? 28 : 40,
    }],
  };

  return (
    <ChartShell>
      <Bar data={chartData} options={options} />
    </ChartShell>
  );
};

export const DoughnutChart = ({ data, labels, colors }) => {
  const chartData = {
    labels: labels || data?.map((d) => d.label) || [],
    datasets: [{
      data: data?.map((d) => d.value) || [],
      backgroundColor: colors || ['#2563eb', '#16a34a', '#eab308', '#ef4444', '#8b5cf6'],
      borderWidth: 0,
    }],
  };

  return (
    <ChartShell>
      <div className="h-full flex items-center justify-center">
        <Doughnut data={chartData} options={{ responsive: true, maintainAspectRatio: false }} />
      </div>
    </ChartShell>
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
