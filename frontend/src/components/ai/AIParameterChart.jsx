import React from 'react';
import { Line } from 'react-chartjs-2';
import { useTheme } from '@mui/material/styles';

export default function AIParameterChart({ param, series, color = 'rgb(75, 192, 192)', anomalies = [] }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  
  // Debug: log received data
  React.useEffect(() => {
    console.log(`[AIParameterChart ${param}] Received ${series?.length || 0} points`);
    if (series && series.length > 0) {
      console.log(`[AIParameterChart ${param}] Sample point:`, series[0]);
    }
  }, [param, series]);

  // Filter out invalid data and sort by timestamp
  const validSeries = React.useMemo(() => {
    if (!series || series.length === 0) {
      return [];
    }

    const filtered = series
      .filter(p => {
        if (!p) return false;
        if (!p.timestamp) {
          console.warn(`[AIParameterChart ${param}] Point missing timestamp:`, p);
          return false;
        }
        if (p.value == null || isNaN(Number(p.value))) {
          console.warn(`[AIParameterChart ${param}] Point has invalid value:`, p);
          return false;
        }
        return true;
      })
      .map(p => {
        try {
          const timestamp = p.timestamp instanceof Date ? p.timestamp : new Date(p.timestamp);
          if (isNaN(timestamp.getTime())) {
            console.warn(`[AIParameterChart ${param}] Invalid timestamp:`, p.timestamp);
            return null;
          }
          return {
            ...p,
            timestamp,
            value: Number(p.value)
          };
        } catch (error) {
          console.warn(`[AIParameterChart ${param}] Error processing point:`, error, p);
          return null;
        }
      })
      .filter(p => p != null)
      .sort((a, b) => a.timestamp - b.timestamp);

    console.log(`[AIParameterChart ${param}] Valid points: ${filtered.length} out of ${series.length}`);
    return filtered;
  }, [series, param]);

  // Use {x, y} format for Chart.js time scale
  const chartDataPoints = React.useMemo(() => {
    if (validSeries.length === 0) return [];
    
    const points = validSeries.map(p => ({
      x: p.timestamp,
      y: p.value
    }));
    
    // Debug: log first and last points
    if (points.length > 0) {
      console.log(`[AIParameterChart ${param}] Chart data points:`, {
        count: points.length,
        first: points[0],
        last: points[points.length - 1],
        xRange: {
          min: points[0]?.x,
          max: points[points.length - 1]?.x
        },
        yRange: {
          min: Math.min(...points.map(p => p.y)),
          max: Math.max(...points.map(p => p.y))
        }
      });
    }
    
    return points;
  }, [validSeries, param]);

  // Create anomaly points dataset
  const anomalyTimestamps = React.useMemo(() => new Set(anomalies.map(a => {
    try {
      return new Date(a.timestamp).getTime();
    } catch {
      return null;
    }
  }).filter(t => t != null)), [anomalies]);

  const anomalyData = React.useMemo(() => {
    if (chartDataPoints.length === 0) return [];
    return chartDataPoints.filter(point => {
      const timestamp = point.x.getTime();
      return anomalyTimestamps.has(timestamp);
    });
  }, [chartDataPoints, anomalyTimestamps]);

  // Calculate value range for better scaling
  const valueRange = React.useMemo(() => {
    if (chartDataPoints.length === 0) return { min: 0, max: 1 };
    const values = chartDataPoints.map(p => p.y);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;
    return {
      min: min - range * 0.1, // Add 10% padding
      max: max + range * 0.1
    };
  }, [chartDataPoints]);

  // Calculate time range
  const timeRange = React.useMemo(() => {
    if (chartDataPoints.length === 0) return null;
    const times = chartDataPoints.map(p => p.x.getTime());
    return {
      min: Math.min(...times),
      max: Math.max(...times)
    };
  }, [chartDataPoints]);

  const chartData = React.useMemo(() => ({
    datasets: [
      {
        label: param,
        data: chartDataPoints,
        borderColor: color,
        backgroundColor: color.replace('rgb', 'rgba').replace(')', ',0.1)'),
        tension: 0.4,
        pointRadius: validSeries.length < 50 ? 2 : 0,
        pointHoverRadius: 4,
        pointBackgroundColor: color,
        borderWidth: 2,
        fill: true,
        spanGaps: false,
      },
      ...(anomalyData.length > 0 ? [{
        label: 'Аномалии',
        data: anomalyData,
        borderColor: 'rgb(255, 0, 0)',
        backgroundColor: 'rgba(255, 0, 0, 0.5)',
        pointRadius: 5,
        pointHoverRadius: 7,
        pointBackgroundColor: 'rgb(255, 0, 0)',
        pointBorderColor: isDark ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 1)',
        pointBorderWidth: 2,
        showLine: false,
        spanGaps: false,
      }] : [])
    ]
  }), [param, chartDataPoints, color, validSeries.length, anomalyData]);

  const options = React.useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    parsing: false,
    animation: {
      duration: 0 // Disable animation for faster rendering
    },
    interaction: {
      intersect: false,
      mode: 'index',
    },
    scales: {
      x: { 
        type: 'time', 
        time: { 
          unit: validSeries.length > 100 ? 'hour' : 'minute',
          displayFormats: {
            minute: 'HH:mm',
            hour: 'HH:mm'
          },
          tooltipFormat: 'dd.MM.yyyy HH:mm'
        }, 
        ticks: { 
          maxTicksLimit: validSeries.length > 100 ? 12 : 8,
          font: {
            size: 11
          }
        },
        grid: {
          color: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
          display: true,
        },
        title: {
          display: true,
          text: 'Время',
          font: {
            size: 12
          }
        },
        min: timeRange ? new Date(timeRange.min) : undefined,
        max: timeRange ? new Date(timeRange.max) : undefined,
      },
      y: { 
        beginAtZero: false,
        min: valueRange.min,
        max: valueRange.max,
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
          display: true,
        },
        title: {
          display: true,
          text: param,
          font: {
            size: 12
          }
        }
      }
    },
    plugins: { 
      legend: { 
        display: false 
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
      }
    }
  }), [validSeries.length, param, valueRange, timeRange]);

  // Debug: log chart data and options
  React.useEffect(() => {
    if (chartDataPoints.length > 0) {
      console.log(`[AIParameterChart ${param}] Rendering chart with:`, {
        datasets: chartData.datasets.length,
        points: chartDataPoints.length,
        options: {
          scales: options.scales,
          responsive: options.responsive
        }
      });
    }
  }, [param, chartData, chartDataPoints, options]);

  // Early return after all hooks
  if (validSeries.length === 0) {
    return (
      <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', flexDirection: 'column', gap: 8 }}>
        <span>Нет данных для отображения</span>
        <span style={{ fontSize: '0.85em', opacity: 0.7 }}>
          Получено: {series?.length || 0} точек | Валидных: 0
        </span>
        {series && series.length > 0 && (
          <span style={{ fontSize: '0.75em', opacity: 0.6 }}>
            Первая точка: {JSON.stringify(series[0])}
          </span>
        )}
      </div>
    );
  }

  return (
    <div 
      style={{ 
        height: 280, 
        position: 'relative', 
        minHeight: 280,
        width: '100%',
        backgroundColor: 'transparent',
        borderRadius: 4,
        padding: 8
      }}
    >
      {chartDataPoints.length > 0 ? (
        <>
          <Line 
            data={chartData} 
            options={options} 
            key={`${param}-${validSeries.length}`}
            redraw={false}
          />
          {/* Debug info - remove in production */}
          {process.env.NODE_ENV === 'development' && (
            <div style={{ 
              position: 'absolute', 
              bottom: 4, 
              left: 4, 
              fontSize: '9px', 
              color: isDark ? 'rgba(230, 237, 243, 0.6)' : 'rgba(0, 0, 0, 0.5)',
              backgroundColor: isDark ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.7)',
              padding: '2px 6px',
              borderRadius: 2,
              pointerEvents: 'none',
              zIndex: 1
            }}>
              {chartDataPoints.length} pts | Y: {valueRange.min.toFixed(2)}-{valueRange.max.toFixed(2)}
            </div>
          )}
        </>
      ) : (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '100%',
          color: isDark ? '#e6edf3' : '#666'
        }}>
          <span>Нет данных для графика</span>
        </div>
      )}
    </div>
  );
}



