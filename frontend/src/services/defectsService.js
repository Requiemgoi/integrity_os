import api from './authService';

const USE_FAKE_DEFECTS = false;

const STORAGE_KEY = 'integrity_demo_user_defects';

const fakeDefects = [];

const getUserDefectsFromStorage = () => {
  try {
    if (typeof window === 'undefined') return [];
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Ошибка чтения пользовательских дефектов из localStorage:', e);
    return [];
  }
};

export const defectsService = {
  getDefects: async (filters = {}) => {
    if (USE_FAKE_DEFECTS) {
      const { method, severity } = filters;

      const base = fakeDefects;
      const user = getUserDefectsFromStorage();
      const combined = [...base, ...user];

      return combined.filter((d) => {
        if (method && d.method !== method) return false;
        if (severity && d.severity !== severity) return false;

        return true;
      });
    }

    const params = new URLSearchParams();
    
    if (filters.method) params.append('method', filters.method);
    if (filters.severity) params.append('severity', filters.severity);
    if (filters.date_from) params.append('date_from', filters.date_from);
    if (filters.date_to) params.append('date_to', filters.date_to);
    if (filters.param1_min !== undefined && filters.param1_min !== '') params.append('param1_min', filters.param1_min);
    if (filters.param1_max !== undefined && filters.param1_max !== '') params.append('param1_max', filters.param1_max);
    if (filters.sort_by) params.append('sort_by', filters.sort_by);
    if (filters.sort_order) params.append('sort_order', filters.sort_order);
    
    const response = await api.get(`/api/defects?${params.toString()}`);
    return response.data;
  },

  getDefect: async (defectId) => {
    if (USE_FAKE_DEFECTS) {
      return fakeDefects.find((d) => d.id === Number(defectId)) || null;
    }

    const response = await api.get(`/api/defects/${defectId}`);
    return response.data;
  },
};
