import api from './authService';

export const importService = {
  importObjects: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post('/api/import/objects', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  importInspections: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post('/api/import/inspections', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Import ILI (In-Line Inspection) data from Excel
  importILI: async (file, pipelineCode, sheetName = 'Аномалии', inspectionDate = null) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('pipeline_code', pipelineCode);
    formData.append('sheet_name', sheetName);
    if (inspectionDate) {
      formData.append('inspection_date', inspectionDate);
    }
    
    const response = await api.post('/api/import/ili', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Get available sheets from Excel file
  getExcelSheets: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post('/api/import/ili/sheets', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};
