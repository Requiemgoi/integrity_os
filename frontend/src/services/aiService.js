import api from './authService';

export const aiService = {
  /**
   * Оценить дефект с помощью AI (rule-based + Gemini)
   * @param {Object} defectData - Данные дефекта для оценки
   * @returns {Promise<Object>} Результат оценки с rule-based, ML и AI данными
   */
  evaluateDefect: async (defectData) => {
    const response = await api.post('/api/ai/defect/evaluate', defectData);
    return response.data;
  },

  /**
   * Получить сводку по дефектам для дашборда
   * @param {Array<Object>} defects - Массив дефектов для анализа
   * @returns {Promise<Object>} Статистика по дефектам
   */
  getDefectsSummary: async (defects) => {
    const response = await api.post('/api/ai/defects/summary', defects);
    return response.data;
  },
};

