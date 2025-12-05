import api from './authService';

export const sensorService = {
  getSensorTypes: async () => {
    const response = await api.get('/api/sensors/types');
    return response.data;
  },

  getSensorData: async (sensorType, hours = 24, limit = 1000) => {
    const response = await api.get(`/api/sensors/${sensorType}/data`, {
      params: { hours, limit },
    });
    return response.data;
  },

  getLatestSensorData: async (sensorType) => {
    const response = await api.get(`/api/sensors/${sensorType}/latest`);
    return response.data;
  },

  simulateSensorData: async (sensorType) => {
    const response = await api.post(`/api/sensors/${sensorType}/simulate`);
    return response.data;
  },
};

