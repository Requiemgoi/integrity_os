import React from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Box, Typography } from '@mui/material';

export default function KPIProgressCard({ kpi }) {
  const progress = kpi?.target ? Math.max(0, Math.min(100, (Number(kpi.value) / Number(kpi.target)) * 100)) : null;

  const data = progress != null ? {
    labels: ['Прогресс', 'Осталось'],
    datasets: [{
      data: [progress, 100 - progress],
      backgroundColor: ['rgb(76, 175, 80)', 'rgba(0, 0, 0, 0.08)'],
      borderWidth: 0
    }]
  } : null;

  const options = {
    cutout: '70%',
    plugins: { 
      legend: { display: false }, 
      tooltip: { enabled: false }
    },
    maintainAspectRatio: false
  };

  return (
    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
      <Box sx={{ width: 80, height: 80, flexShrink: 0 }}>
        {data ? (
          <Doughnut data={data} options={options} />
        ) : (
          <Box 
            sx={{ 
              width: '100%', 
              height: '100%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              borderRadius: '50%',
              bgcolor: 'background.default'
            }}
          >
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
              Нет цели
            </Typography>
          </Box>
        )}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography 
          variant="subtitle2" 
          sx={{ 
            fontWeight: 600, 
            mb: 0.5,
            color: 'text.primary',
            textTransform: 'capitalize'
          }}
        >
          {kpi.kpi_name}
        </Typography>
        <Typography 
          variant="h6" 
          sx={{ 
            fontWeight: 700, 
            mb: 0.5,
            color: 'primary.main',
            fontSize: '1.25rem'
          }}
        >
          {kpi.value} {kpi.unit || ''}
        </Typography>
        {kpi.target != null && (
          <Typography 
            variant="caption" 
            sx={{ 
              color: 'text.secondary',
              fontSize: '0.75rem'
            }}
          >
            Цель: {kpi.target} {kpi.unit || ''}
          </Typography>
        )}
      </Box>
    </Box>
  );
}







