import React, { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

const translations = {
  ru: {
    // Dashboard
    dashboard: 'Панель управления IntegrityOS',
    export: 'Экспорт',
    exportCSV: 'Экспорт CSV',
    exportPDF: 'Экспорт PDF',
    refresh: 'Обновить данные',
    help: 'Справка',
    logout: 'Выход',
    
    // Sensor types
    rawMaterial: 'Сырье',
    productionLine: 'Производственная линия',
    warehouse: 'Склад',
    
    // Monitoring
    monitoringRawMaterial: 'Мониторинг сырья',
    monitoringProductionLine: 'Мониторинг производственной линии',
    monitoringWarehouse: 'Мониторинг склада',
    
    // Metrics
    sensors: 'Сенсоры',
    points24h: 'Точек за 24ч',
    activeAlerts: 'Активные оповещения',
    sensorType: 'Тип сенсора',
    
    // Alerts
    alerts: 'Оповещения',
    all: 'Все',
    critical: 'Критическое',
    high: 'Высокое',
    medium: 'Среднее',
    low: 'Низкое',
    noActiveAlerts: 'Нет активных оповещений',
    allSystemsOk: 'Все системы работают нормально',
    
    // Charts
    realTimeData: 'Данные в реальном времени',
    points: 'точек',
    forecastProphet: 'Прогноз Prophet (24 часа)',
    anomalies: 'Аномалии',
    analysis: 'Анализ и рекомендации',
    
    // Help
    helpTitle: 'Справка по дашборду',
    close: 'Понятно',
  },
  kz: {
    // Dashboard
    dashboard: 'IntegrityOS Басқару панелі',
    export: 'Экспорт',
    exportCSV: 'CSV экспорт',
    exportPDF: 'PDF экспорт',
    refresh: 'Деректерді жаңарту',
    help: 'Анықтама',
    logout: 'Шығу',
    
    // Sensor types
    rawMaterial: 'Шикізат',
    productionLine: 'Өндіріс желісі',
    warehouse: 'Қойма',
    
    // Monitoring
    monitoringRawMaterial: 'Шикізатты мониторинг',
    monitoringProductionLine: 'Өндіріс желісін мониторинг',
    monitoringWarehouse: 'Қойманы мониторинг',
    
    // Metrics
    sensors: 'Сенсорлар',
    points24h: '24 сағаттағы нүктелер',
    activeAlerts: 'Белсенді ескертулер',
    sensorType: 'Сенсор түрі',
    
    // Alerts
    alerts: 'Ескертулер',
    all: 'Барлығы',
    critical: 'Сыни',
    high: 'Жоғары',
    medium: 'Орташа',
    low: 'Төмен',
    noActiveAlerts: 'Белсенді ескертулер жоқ',
    allSystemsOk: 'Барлық жүйелер қалыпты жұмыс істейді',
    
    // Charts
    realTimeData: 'Нақты уақыттағы деректер',
    points: 'нүктелер',
    forecastProphet: 'Prophet болжамы (24 сағат)',
    anomalies: 'Аномалиялар',
    analysis: 'Талдау және ұсыныстар',
    
    // Help
    helpTitle: 'Басқару панелі бойынша анықтама',
    close: 'Түсіндім',
  },
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    const savedLanguage = localStorage.getItem('language');
    return savedLanguage || 'ru';
  });

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  const toggleLanguage = () => {
    setLanguage((prevLang) => (prevLang === 'ru' ? 'kz' : 'ru'));
  };

  const t = (key) => {
    return translations[language]?.[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};


