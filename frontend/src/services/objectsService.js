import api from './authService';

export const objectsService = {
  getObjects: async (filters = {}) => {
    const params = new URLSearchParams();
    
    if (filters.search) params.append('search', filters.search);
    if (filters.pipeline_code) params.append('pipeline_code', filters.pipeline_code);
    if (filters.object_type) params.append('object_type', filters.object_type);
    
    const response = await api.get(`/api/objects?${params.toString()}`);
    return response.data;
  },

  getObject: async (objectId) => {
    const response = await api.get(`/api/objects/${objectId}`);
    return response.data;
  },
};
