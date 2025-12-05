import api from './authService';

export const analyticsService = {
  getForecast: async (sensorId, daysAhead = 7) => {
    const response = await api.get(`/api/analytics/forecast/${sensorId}`, {
      params: { days_ahead: daysAhead },
    });
    return response.data;
  },

  getAnomalies: async (sensorId, hours = 24) => {
    const response = await api.get(`/api/analytics/anomalies/${sensorId}`, {
      params: { hours },
    });
    return response.data;
  },

  exportCSV: async (sensorType = null, hours = 24) => {
    const response = await api.get('/api/analytics/export/csv', {
      params: { sensor_type: sensorType, hours },
      responseType: 'blob',
    });
    return response.data;
  },

  exportPDF: async () => {
    const response = await api.get('/api/analytics/export/pdf', {
      responseType: 'blob',
    });
    return response.data;
  },

  getForecastParameter: async (sensorId, parameter, horizon = 24, hoursHistory = 168) => {
    const response = await api.get(`/api/analytics/forecast-parameter/${sensorId}/${parameter}`, {
      params: { horizon, hours_history: hoursHistory },
    });
    return response.data;
  },

  getAnomaliesAutoencoder: async (sensorId, parameter, hours = 24, windowSize = 10, threshold = 0.1) => {
    const response = await api.get(`/api/analytics/anomalies-autoencoder/${sensorId}/${parameter}`, {
      params: { hours, window_size: windowSize, threshold },
    });
    return response.data;
  },

  trainAutoencoder: async (sensorId, parameter, windowSize = 10, hoursHistory = 168) => {
    const response = await api.post(`/api/analytics/train-autoencoder/${sensorId}/${parameter}`, null, {
      params: { window_size: windowSize, hours_history: hoursHistory },
    });
    return response.data;
  },
};

