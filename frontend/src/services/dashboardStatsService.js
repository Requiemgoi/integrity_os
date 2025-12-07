import api from './authService';

export const dashboardStatsService = {
  getWidgets: async () => {
    const response = await api.get('/api/dashboard/stats/widgets');
    return response.data;
  },
};
