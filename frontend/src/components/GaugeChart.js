import React from 'react';
import { Card, CardContent, Typography, Box, CircularProgress } from '@mui/material';
import { Doughnut } from 'react-chartjs-2';

const GaugeChart = ({ data }) => {
  if (!data) return null;

  // Determine max value based on parameter type
  const getMaxValue = (parameter) => {
    const maxValues = {
      temperature: 100,
      vibration: 10,
      production_speed: 150,
      OEE: 100,
      humidity: 100,
      pressure: 5,
    };
    return maxValues[parameter] || data.value * 1.5;
  };

  const maxValue = getMaxValue(data.parameter);
  const percentage = (data.value / maxValue) * 100;

  // Determine color based on percentage
  const getColor = (percent) => {
    if (percent >= 80) return 'rgb(76, 175, 80)'; // Green
    if (percent >= 60) return 'rgb(255, 193, 7)'; // Yellow
    if (percent >= 40) return 'rgb(255, 152, 0)'; // Orange
    return 'rgb(244, 67, 54)'; // Red
  };

  const chartData = {
    datasets: [
      {
        data: [percentage, 100 - percentage],
        backgroundColor: [getColor(percentage), 'rgba(0, 0, 0, 0.1)'],
        borderWidth: 0,
        cutout: '75%',
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: false,
      },
    },
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom align="center">
          {data.parameter === 'temperature' ? 'Температура' :
           data.parameter === 'vibration' ? 'Вибрация' :
           data.parameter === 'production_speed' ? 'Скорость производства' :
           data.parameter === 'OEE' ? 'OEE' :
           data.parameter.replace('_', ' ')}
        </Typography>
        <Box
          sx={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: 200,
          }}
        >
          <Doughnut data={chartData} options={options} />
          <Box
            sx={{
              position: 'absolute',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <Typography variant="h4" component="div">
              {data.value.toFixed(1)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {data.unit}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default GaugeChart;

