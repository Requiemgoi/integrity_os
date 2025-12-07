import api from './authService';

export const reportsService = {
  generateReport: async () => {
    const response = await api.get('/api/reports/generate', {
      responseType: 'blob',
    });
    
    // Create blob URL and open in new window
    const blob = new Blob([response.data], { type: 'text/html' });
    const url = window.URL.createObjectURL(blob);
    window.open(url, '_blank');
    
    return url;
  },
};
