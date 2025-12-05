import React from 'react';
import { Line } from 'react-chartjs-2';
import { format } from 'date-fns';

const SensorChart = ({ data, parameter }) => {
  // Функция для перевода названий параметров
  const translateParameter = (param) => {
    const translations = {
      temperature: 'Температура',
      humidity: 'Влажность',
      quantity: 'Количество',
      vibration: 'Вибрация',
      production_speed: 'Скорость производства',
      'брак_rate': 'Процент брака',
      pressure: 'Давление',
      stock_level: 'Уровень запасов',
    };
    return translations[param] || param.replace('_', ' ');
  };

  if (!data || data.length === 0) {
    return <div>Нет данных</div>;
  }

  // Sort by timestamp
  const sortedData = [...data].sort(
    (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
  );

  // Prepare chart data
  const chartData = {
    labels: sortedData.map((point) =>
      format(new Date(point.timestamp), 'HH:mm')
    ),
    datasets: [
      {
        label: translateParameter(parameter),
        data: sortedData.map((point) => point.value),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.1,
        pointRadius: 2,
        pointHoverRadius: 5,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
      },
      tooltip: {
        mode: 'index',
        intersect: false,
      },
    },
    scales: {
      y: {
        beginAtZero: false,
      },
    },
  };

  return (
    <div style={{ height: '250px', position: 'relative' }}>
      <Line data={chartData} options={options} />
    </div>
  );
};

export default SensorChart;

