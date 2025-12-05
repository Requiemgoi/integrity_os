import api from './authService';

export const dashboardService = {
  getKPIs: async () => {
    const response = await api.get('/api/dashboard/kpis');
    return response.data;
  },

  getAlerts: async (limit = 50) => {
    const response = await api.get('/api/dashboard/alerts', {
      params: { limit },
    });
    return response.data;
  },

  getSummary: async () => {
    const response = await api.get('/api/dashboard/summary');
    return response.data;
  },

  generateKPIs: async () => {
    const response = await api.post('/api/dashboard/kpis/generate');
    return response.data;
  },
};

