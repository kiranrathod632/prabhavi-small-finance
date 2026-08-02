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

const hexToRgba = (hex, alpha = 1) => {
  const raw = String(hex || '#2563eb').replace('#', '');
  const full = raw.length === 3
    ? raw.split('').map((c) => c + c).join('')
    : raw.padEnd(6, '0').slice(0, 6);
  const n = Number.parseInt(full, 16);
  if (!Number.isFinite(n)) return `rgba(37, 99, 235, ${alpha})`;
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const formatTick = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  if (Math.abs(n) >= 10000000) return `${(n / 10000000).toFixed(1)}Cr`;
  if (Math.abs(n) >= 100000) return `${(n / 100000).toFixed(1)}L`;
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`;
  return String(Math.round(n));
};

const formatTooltipValue = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
  }).format(n);
};

const shortenLabel = (label, narrow) => {
  if (!label) return '';
  const text = String(label);
  if (!narrow) return text;
  const parts = text.split(/\s+/);
  if (parts.length >= 2 && /^\d+$/.test(parts[1])) {
    return `${parts[0]} ${parts[1]}`;
  }
  return parts[0] || text;
};

const areaGradient = (color) => (context) => {
  const { chart } = context;
  const { ctx, chartArea } = chart;
  if (!chartArea) return hexToRgba(color, 0.18);
  const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
  gradient.addColorStop(0, hexToRgba(color, 0.45));
  gradient.addColorStop(0.55, hexToRgba(color, 0.14));
  gradient.addColorStop(1, hexToRgba(color, 0.02));
  return gradient;
};

const barGradient = (color) => (context) => {
  const { chart } = context;
  const { ctx, chartArea } = chart;
  if (!chartArea) return hexToRgba(color, 0.85);
  const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
  gradient.addColorStop(0, hexToRgba(color, 0.55));
  gradient.addColorStop(1, hexToRgba(color, 0.95));
  return gradient;
};

const buildOptions = (narrow, maxValue = 0) => ({
  responsive: true,
  maintainAspectRatio: false,
  animation: {
    duration: narrow ? 550 : 750,
    easing: 'easeOutQuart',
  },
  interaction: { mode: 'index', intersect: false },
  layout: {
    padding: {
      top: narrow ? 10 : 14,
      right: narrow ? 8 : 12,
      bottom: narrow ? 2 : 6,
      left: narrow ? 2 : 6,
    },
  },
  plugins: {
    legend: { display: false },
    tooltip: {
      enabled: true,
      backgroundColor: 'rgba(15, 23, 42, 0.94)',
      titleColor: '#f8fafc',
      bodyColor: '#e2e8f0',
      titleFont: { size: narrow ? 11 : 12, weight: '600' },
      bodyFont: { size: narrow ? 12 : 13, weight: '500' },
      padding: narrow ? 10 : 12,
      cornerRadius: 12,
      displayColors: true,
      boxPadding: 4,
      borderColor: 'rgba(148, 163, 184, 0.25)',
      borderWidth: 1,
      caretSize: 6,
      callbacks: {
        label(ctx) {
          const name = ctx.dataset?.label || 'Value';
          return ` ${name}: ${formatTooltipValue(ctx.parsed?.y ?? ctx.raw)}`;
        },
      },
    },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: {
        color: '#64748b',
        font: { size: narrow ? 9 : 11, weight: '600' },
        maxRotation: 0,
        minRotation: 0,
        autoSkip: true,
        maxTicksLimit: narrow ? 5 : 8,
        padding: narrow ? 6 : 8,
      },
      border: { display: false },
    },
    y: {
      beginAtZero: true,
      grace: maxValue > 0 ? '12%' : undefined,
      suggestedMax: maxValue > 0 ? undefined : 10,
      grid: {
        color: 'rgba(100, 116, 139, 0.10)',
        drawBorder: false,
        tickLength: 0,
      },
      ticks: {
        color: '#64748b',
        font: { size: narrow ? 9 : 11, weight: '500' },
        padding: narrow ? 6 : 10,
        maxTicksLimit: narrow ? 4 : 6,
        precision: 0,
        callback: formatTick,
      },
      border: { display: false },
    },
  },
});

const ChartShell = ({ children, empty = false }) => (
  <div className="chart-wrap">
    {empty ? (
      <div className="chart-empty">
        <span className="chart-empty-dot" />
        <p>No data for this period</p>
      </div>
    ) : (
      children
    )}
  </div>
);

const maxOf = (data) => Math.max(0, ...((data || []).map((d) => Number(d.value) || 0)));
const isEmptyData = (data) => !data?.length || data.every((d) => !Number(d.value));

export const LineChart = ({ data, label = 'Value', color = '#0d9488' }) => {
  const narrow = useIsNarrow();
  const maxValue = maxOf(data);
  const empty = isEmptyData(data);
  const options = useMemo(() => buildOptions(narrow, maxValue), [narrow, maxValue]);

  const chartData = useMemo(() => ({
    labels: (data || []).map((d) => shortenLabel(d.month, narrow)),
    datasets: [{
      label,
      data: (data || []).map((d) => Number(d.value) || 0),
      borderColor: color,
      backgroundColor: areaGradient(color),
      fill: true,
      tension: 0.42,
      borderWidth: narrow ? 2.5 : 3,
      pointRadius: narrow ? 0 : 0,
      pointHoverRadius: narrow ? 5 : 6,
      pointHitRadius: 12,
      pointBackgroundColor: '#fff',
      pointBorderColor: color,
      pointBorderWidth: 2.5,
      pointHoverBackgroundColor: color,
      pointHoverBorderColor: '#fff',
      pointHoverBorderWidth: 2,
    }],
  }), [data, label, color, narrow]);

  return (
    <ChartShell empty={empty}>
      <Line data={chartData} options={options} />
    </ChartShell>
  );
};

export const BarChart = ({ data, label = 'Value', color = '#1e4463' }) => {
  const narrow = useIsNarrow();
  const maxValue = maxOf(data);
  const empty = isEmptyData(data);
  const options = useMemo(() => buildOptions(narrow, maxValue), [narrow, maxValue]);

  const chartData = useMemo(() => ({
    labels: (data || []).map((d) => shortenLabel(d.month, narrow)),
    datasets: [{
      label,
      data: (data || []).map((d) => Number(d.value) || 0),
      backgroundColor: barGradient(color),
      hoverBackgroundColor: hexToRgba(color, 1),
      borderRadius: {
        topLeft: narrow ? 8 : 10,
        topRight: narrow ? 8 : 10,
        bottomLeft: 4,
        bottomRight: 4,
      },
      borderSkipped: false,
      maxBarThickness: narrow ? 26 : 36,
      categoryPercentage: 0.65,
      barPercentage: 0.8,
    }],
  }), [data, label, color, narrow]);

  return (
    <ChartShell empty={empty}>
      <Bar data={chartData} options={options} />
    </ChartShell>
  );
};

export const DoughnutChart = ({ data, labels, colors }) => {
  const narrow = useIsNarrow();
  const chartData = {
    labels: labels || data?.map((d) => d.label) || [],
    datasets: [{
      data: data?.map((d) => d.value) || [],
      backgroundColor: colors || ['#0d9488', '#1e4463', '#c99a2e', '#dc2626', '#7c3aed'],
      borderWidth: 3,
      borderColor: '#fff',
      hoverOffset: 6,
    }],
  };

  return (
    <ChartShell>
      <div className="h-full flex items-center justify-center p-2">
        <Doughnut
          data={chartData}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            cutout: narrow ? '62%' : '68%',
            plugins: {
              legend: {
                display: true,
                position: 'bottom',
                labels: {
                  boxWidth: 10,
                  boxHeight: 10,
                  usePointStyle: true,
                  pointStyle: 'circle',
                  padding: 12,
                  font: { size: narrow ? 10 : 11, weight: '600' },
                  color: '#64748b',
                },
              },
              tooltip: {
                backgroundColor: 'rgba(15, 23, 42, 0.94)',
                cornerRadius: 12,
                padding: 10,
              },
            },
          }}
        />
      </div>
    </ChartShell>
  );
};

export const ProgressChart = ({ data }) => {
  if (!data?.length) {
    return (
      <div className="chart-empty">
        <span className="chart-empty-dot" />
        <p>No loan data</p>
      </div>
    );
  }

  return (
    <div className="space-y-3.5 sm:space-y-4 p-1">
      {data.map((loan) => (
        <div key={loan.loanId}>
          <div className="flex justify-between text-xs sm:text-sm mb-1.5 gap-2">
            <span className="font-semibold text-primary-900 dark:text-white truncate">
              {loan.loanId} <span className="text-slate-400 font-medium">({loan.type})</span>
            </span>
            <span className="text-slate-500 shrink-0 font-semibold">{loan.progress}%</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-primary-800/60 rounded-full h-2.5 overflow-hidden">
            <div
              className="h-2.5 rounded-full transition-all duration-500 bg-gradient-to-r from-teal-500 to-cyan-400"
              style={{ width: `${Math.min(100, Math.max(0, loan.progress || 0))}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};
