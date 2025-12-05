import React from 'react';
import { Line } from 'react-chartjs-2';
import { useTheme } from '@mui/material/styles';

export default function ForecastChart({ historicalData, forecastData, parameter }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  if (!forecastData || !forecastData.forecast || forecastData.forecast.length === 0) {
    return null;
  }

  // Prepare historical data - filter invalid and sort
  const validHistorical = (historicalData || [])
    .filter(p => p && p.timestamp && p.value != null && !isNaN(Number(p.value)))
    .map(p => ({
      x: new Date(p.timestamp),
      y: Number(p.value)
    }))
    .sort((a, b) => a.x - b.x);

  // Prepare forecast data - filter invalid and sort
  const forecastPoints = (forecastData.forecast || [])
    .filter(p => p && p.timestamp && p.value != null && !isNaN(Number(p.value)))
    .map(p => ({
      x: new Date(p.timestamp),
      y: Number(p.value),
      lower: Number(p.lower_bound || p.value),
      upper: Number(p.upper_bound || p.value)
    }))
    .sort((a, b) => a.x - b.x);

  if (forecastPoints.length === 0) {
    return (
      <div style={{ 
        height: 300, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        color: isDark ? theme.palette.text.secondary : '#999' 
      }}>
        <span>Нет данных прогноза</span>
      </div>
    );
  }

  const forecastDataPoints = forecastPoints.map(p => ({ x: p.x, y: p.y }));
  const forecastLower = forecastPoints.map(p => ({ x: p.x, y: p.lower }));
  const forecastUpper = forecastPoints.map(p => ({ x: p.x, y: p.upper }));

  const chartData = {
    datasets: [
      ...(validHistorical.length > 0 ? [{
        label: `${parameter} (история)`,
        data: validHistorical,
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.1)',
        tension: 0.4,
        pointRadius: validHistorical.length < 50 ? 2 : 0,
        pointHoverRadius: 4,
        borderWidth: 2,
        fill: false,
        spanGaps: false,
      }] : []),
      {
        label: `${parameter} (прогноз)`,
        data: forecastDataPoints,
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.1)',
        tension: 0.4,
        pointRadius: forecastDataPoints.length < 50 ? 3 : 1,
        pointHoverRadius: 5,
        pointBackgroundColor: 'rgb(255, 99, 132)',
        borderWidth: 2.5,
        borderDash: [8, 4],
        fill: false,
        spanGaps: false,
      },
      {
        label: 'Верхняя граница',
        data: forecastUpper,
        borderColor: 'rgba(255, 99, 132, 0.4)',
        backgroundColor: 'rgba(255, 99, 132, 0.05)',
        fill: '+1',
        pointRadius: 0,
        borderWidth: 1,
        borderDash: [3, 3],
        spanGaps: false,
      },
      {
        label: 'Нижняя граница',
        data: forecastLower,
        borderColor: 'rgba(255, 99, 132, 0.4)',
        backgroundColor: 'rgba(255, 99, 132, 0.05)',
        fill: false,
        pointRadius: 0,
        borderWidth: 1,
        borderDash: [3, 3],
        spanGaps: false,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    parsing: false,
    interaction: {
      intersect: false,
      mode: 'index',
    },
    scales: {
      x: {
        type: 'time',
        time: {
          unit: forecastPoints.length > 24 ? 'hour' : 'minute',
          displayFormats: {
            minute: 'HH:mm',
            hour: 'dd.MM HH:mm'
          },
          tooltipFormat: 'dd.MM.yyyy HH:mm'
        },
        ticks: {
          maxTicksLimit: forecastPoints.length > 24 ? 12 : 8,
          font: {
            size: 11
          }
        },
        grid: {
          color: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
        },
        title: {
          display: true,
          text: 'Время',
          font: {
            size: 12
          }
        },
      },
      y: {
        beginAtZero: false,
        ticks: {
          font: {
            size: 11
          },
          callback: function(value) {
            return Number(value).toFixed(2);
          }
        },
        grid: {
          color: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
        },
        title: {
          display: true,
          text: parameter,
          font: {
            size: 12
          }
        },
      },
    },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          font: {
            size: 11
          },
          padding: 10,
          usePointStyle: true,
        }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 10,
        titleFont: {
          size: 13
        },
        bodyFont: {
          size: 12
        }
      },
    },
  };

  // Generate unique key for chart to force re-render when data changes
  const chartKey = `${parameter}-${validHistorical.length}-${forecastPoints.length}`;

  return (
    <div style={{ height: 300, position: 'relative' }}>
      <Line data={chartData} options={options} key={chartKey} />
    </div>
  );
}

