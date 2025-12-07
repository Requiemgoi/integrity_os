import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Grid, Paper, Typography, Box, Card, CardContent, Stack, Button, Chip, Alert, Divider, Accordion, AccordionSummary, AccordionDetails, Tabs, Tab } from '@mui/material';
import { ExpandMore, ShowChart, TrendingUp, Settings, Warning, Info } from '@mui/icons-material';
import { sensorService } from '../services/sensorService';
import { websocketService } from '../services/websocketService';
import { analyticsService } from '../services/analyticsService';
import { useLanguage } from '../contexts/LanguageContext';
import AIParameterChart from './ai/AIParameterChart';
import ForecastChart from './ai/ForecastChart';
import { useAIDashboard } from '../hooks/useAIDashboard';

/**
 * DashboardTab Component
 * 
 * Этот компонент отображает данные сенсоров для выбранного типа.
 * 
 * ВАЖНО: Графики удалены. Область для ИИ-генерации контента помечена комментариями.
 * 
 * Доступные данные для ИИ:
 * - sensorData: массив всех точек данных за последние 24 часа
 * - latestData: массив последних значений для каждого параметра
 * - dataByParameter: объект с данными, сгруппированными по параметрам
 * - parameters: массив уникальных параметров
 * - summary: сводная информация о сенсорах
 * - sensorType: тип сенсора ('raw_material', 'production_line', 'warehouse')
 * 
 * Функции для использования ИИ:
 * - loadData(): загружает данные сенсоров (уже работает)
 * - WebSocket подключение для real-time обновлений (уже настроено)
 * 
 * ИИ должен генерировать:
 * - Визуализации данных (графики, диаграммы)
 * - Аналитические инсайты
 * - Рекомендации на основе данных
 * - Предупреждения и алерты
 */
const DashboardTab = ({ sensorType, summary }) => {
  const { t } = useLanguage();
  const [sensorData, setSensorData] = useState([]);
  const [latestData, setLatestData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [forecasts, setForecasts] = useState({}); // { parameter: forecastData }
  const [anomalies, setAnomalies] = useState({}); // { parameter: anomaliesData }
  const [trainingStatus, setTrainingStatus] = useState({}); // { parameter: 'idle' | 'training' | 'success' | 'error' }
  const [trainingDetails, setTrainingDetails] = useState({}); // { parameter: trainingDetails }
  const loadingForecastsRef = useRef(false);
  const loadingAnomaliesRef = useRef(false);
  const lastForecastParamsRef = useRef('');
  const lastAnomalyParamsRef = useRef('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [data, latest] = await Promise.all([
        sensorService.getSensorData(sensorType, 24, 1000),
        sensorService.getLatestSensorData(sensorType),
      ]);
      
      // Ensure data is an array - check different possible formats
      let sensorDataArray = [];
      if (Array.isArray(data)) {
        sensorDataArray = data;
      } else if (data?.data && Array.isArray(data.data)) {
        sensorDataArray = data.data;
      } else if (data?.sensor_data && Array.isArray(data.sensor_data)) {
        sensorDataArray = data.sensor_data;
      }
      
      let latestDataArray = [];
      if (Array.isArray(latest)) {
        latestDataArray = latest;
      } else if (latest?.data && Array.isArray(latest.data)) {
        latestDataArray = latest.data;
      } else if (latest?.latest && Array.isArray(latest.latest)) {
        latestDataArray = latest.latest;
      }
      
      // Debug: log data structure
      console.log(`[DashboardTab ${sensorType}] Raw data:`, data);
      console.log(`[DashboardTab ${sensorType}] Raw latest:`, latest);
      console.log(`[DashboardTab ${sensorType}] Processed: ${sensorDataArray.length} sensor points, ${latestDataArray.length} latest values`);
      
      if (sensorDataArray.length > 0) {
        console.log(`[DashboardTab ${sensorType}] Sample sensor point:`, sensorDataArray[0]);
        console.log(`[DashboardTab ${sensorType}] Parameters found:`, [...new Set(sensorDataArray.map(d => d.parameter))]);
      }
      
      setSensorData(sensorDataArray);
      setLatestData(latestDataArray);
    } catch (error) {
      console.error('Failed to load sensor data:', error);
      setSensorData([]);
      setLatestData([]);
    } finally {
      setLoading(false);
    }
  }, [sensorType]);

  useEffect(() => {
    loadData();
    
    const handleSensorData = (data) => {
      if (data.sensor_type === sensorType) {
        loadData();
      }
    };
    
    websocketService.on('sensor_data', handleSensorData);

    return () => {
      websocketService.off('sensor_data', handleSensorData);
    };
  }, [sensorType, loadData]);

  // Group data by parameter
  // ИИ может использовать эту структуру для анализа данных
  const dataByParameter = useMemo(() => {
    const grouped = {};
    sensorData.forEach((point) => {
      if (point && point.parameter) {
        if (!grouped[point.parameter]) {
          grouped[point.parameter] = [];
        }
        grouped[point.parameter].push(point);
      }
    });
    
    // Debug: log grouped data
    Object.keys(grouped).forEach(param => {
      console.log(`Parameter ${param}: ${grouped[param].length} points`);
      if (grouped[param].length > 0) {
        console.log(`Sample point for ${param}:`, grouped[param][0]);
      }
    });
    
    return grouped;
  }, [sensorData]);

  // Get unique parameters
  const parameters = useMemo(() => Object.keys(dataByParameter), [dataByParameter]);

  // Get unique sensor IDs for this type (memoized to keep stable reference)
  const sensorIds = useMemo(() => {
    return [...new Set(sensorData.map(d => d.sensor_id))];
  }, [sensorData]);

  // Load forecasts for parameters
  const loadForecasts = useCallback(async () => {
    if (sensorIds.length === 0 || parameters.length === 0) return;
    
    // Создаем ключ для проверки изменений
    const paramsKey = `${sensorIds.join(',')}:${parameters.join(',')}`;
    
    // Предотвращаем множественные одновременные запросы
    if (loadingForecastsRef.current) {
      return;
    }
    
    // Проверяем, изменились ли параметры
    if (lastForecastParamsRef.current === paramsKey) {
      return;
    }
    
    loadingForecastsRef.current = true;
    lastForecastParamsRef.current = paramsKey;
    
    const forecastsData = {};
    for (const param of parameters) {
      // Use first sensor ID for this parameter (can be improved)
      const sensorId = sensorIds.find(id => 
        sensorData.some(d => d.sensor_id === id && d.parameter === param)
      ) || sensorIds[0];
      
      if (sensorId) {
        try {
          const forecast = await analyticsService.getForecastParameter(sensorId, param, 24, 168);
          if (forecast && forecast.forecast) {
            forecastsData[param] = forecast;
          }
        } catch (error) {
          // Не логируем ошибки для 404 или connection refused, так как бэкенд может быть не запущен
          if (error.code !== 'ERR_NETWORK' && error.response?.status !== 404) {
            console.error(`Failed to load forecast for ${param}:`, error);
          }
        }
      }
    }
    setForecasts(forecastsData);
    loadingForecastsRef.current = false;
  }, [sensorIds, parameters, sensorData]);

  // Load autoencoder anomalies
  const loadAnomalies = useCallback(async () => {
    if (sensorIds.length === 0 || parameters.length === 0) return;
    
    // Создаем ключ для проверки изменений
    const paramsKey = `${sensorIds.join(',')}:${parameters.join(',')}`;
    
    // Предотвращаем множественные одновременные запросы
    if (loadingAnomaliesRef.current) {
      return;
    }
    
    // Проверяем, изменились ли параметры
    if (lastAnomalyParamsRef.current === paramsKey) {
      return;
    }
    
    loadingAnomaliesRef.current = true;
    lastAnomalyParamsRef.current = paramsKey;
    
    const anomaliesData = {};
    for (const param of parameters) {
      const sensorId = sensorIds.find(id => 
        sensorData.some(d => d.sensor_id === id && d.parameter === param)
      ) || sensorIds[0];
      
      if (sensorId) {
        try {
          const result = await analyticsService.getAnomaliesAutoencoder(sensorId, param, 24);
          if (result && result.anomalies) {
            anomaliesData[param] = result.anomalies;
          }
        } catch (error) {
          // Не логируем ошибки для 404 или connection refused, так как бэкенд может быть не запущен
          if (error.code !== 'ERR_NETWORK' && error.response?.status !== 404) {
            console.error(`Failed to load anomalies for ${param}:`, error);
          }
        }
      }
    }
    setAnomalies(anomaliesData);
    loadingAnomaliesRef.current = false;
  }, [sensorIds, parameters, sensorData]);

  // Train autoencoder
  const handleTrainAutoencoder = async (sensorId, parameter) => {
    setTrainingStatus(prev => ({ ...prev, [parameter]: 'training' }));
    try {
      const result = await analyticsService.trainAutoencoder(sensorId, parameter);
      setTrainingStatus(prev => ({ ...prev, [parameter]: 'success' }));
      
      // Show training details if available
      if (result.training_details) {
        const details = result.training_details;
        setTrainingDetails(prev => ({ ...prev, [parameter]: details }));
        console.log(`✅ Обучение завершено для ${parameter}:`, {
          epochs: details.epochs,
          loss: `${details.initial_loss} → ${details.final_loss}`,
          dataPoints: details.data_points,
          windows: details.windows
        });
      }
      
      // Reload anomalies after training
      setTimeout(() => {
        loadAnomalies();
      }, 1000);
    } catch (error) {
      console.error(`❌ Ошибка обучения автоэнкодера для ${parameter}:`, error);
      setTrainingStatus(prev => ({ ...prev, [parameter]: 'error' }));
    }
  };

  // Load forecasts and anomalies when data changes
  useEffect(() => {
    if (!loading && parameters.length > 0) {
      loadForecasts();
      loadAnomalies();
    }
  }, [loading, parameters.length, loadForecasts, loadAnomalies]);

  // Вызов хука должен быть на верхнем уровне компонента
  const { insights } = useAIDashboard({ sensorData, dataByParameter, parameters });

  // Область для ИИ-генерации контента
  // ИИ использует данные: sensorData, latestData, dataByParameter, parameters, summary, sensorType
  const renderAIGeneratedContent = () => {
    return (
      <Grid container spacing={2} sx={{ position: 'relative', zIndex: 0 }}>
        {parameters.map((param) => {
          const series = dataByParameter[param] || [];
          const latest = latestData.find(l => l.parameter === param);
          const info = insights.find(i => i.param === param);
          const forecast = forecasts[param];
          const paramAnomalies = anomalies[param] || [];
          const sensorId = sensorIds.find(id => 
            sensorData.some(d => d.sensor_id === id && d.parameter === param)
          ) || sensorIds[0];
          const trainingStatusParam = trainingStatus[param] || 'idle';

          return (
            <Grid item xs={12} md={6} key={param}>
              <Paper 
                elevation={4}
                sx={{ 
                  p: 0,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  background: 'background.paper',
                  overflow: 'hidden',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 8
                  }
                }}
              >
                <Stack spacing={0}>
                  {/* Header */}
                  <Box 
                    sx={{
                      backgroundColor: '#3C5BA9',
                      p: 2,
                      color: '#ffffff',
                      borderBottom: '3px solid #1C1C1C',
                    }}
                  >
                    <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                      <Typography variant="h6" sx={{ fontWeight: 700, textTransform: 'capitalize' }}>
                        {param}
                      </Typography>
                      <Box display="flex" gap={1} alignItems="center">
                        {latest && (
                          <Chip
                            label={`${Number(latest.value).toFixed(2)} ${latest.unit || ''}`}
                            sx={(theme) => {
                              const isDark = theme.palette.mode === 'dark';
                              return {
                                backgroundColor: isDark
                                  ? 'rgba(255, 255, 255, 0.15)'
                                  : 'rgba(255, 255, 255, 0.9)',
                                color: isDark
                                  ? theme.palette.common.white
                                  : theme.palette.primary.dark,
                                fontWeight: 600,
                                border: `1px solid ${isDark
                                  ? 'rgba(255, 255, 255, 0.25)'
                                  : theme.palette.primary.light}`,
                                boxShadow: isDark ? 'inset 0 0 0 1px rgba(255,255,255,0.05)' : 'none'
                              };
                            }}
                            size="small"
                          />
                        )}
                        {paramAnomalies.length > 0 && (
                          <Chip 
                            label={`${paramAnomalies.length} аномалий`} 
                            sx={{
                              backgroundColor: 'rgba(255, 0, 0, 0.3)',
                              color: 'primary.contrastText',
                              fontWeight: 600,
                              border: (theme) => `1px solid ${theme.palette.mode === 'dark' 
                                ? 'rgba(255, 255, 255, 0.2)' 
                                : 'rgba(255, 255, 255, 0.3)'}`
                            }}
                            size="small"
                          />
                        )}
                      </Box>
                    </Box>
                  </Box>
                  
                  <Box sx={{ p: 2 }}>
                    <Stack spacing={1.5}>
                      {/* Charts in Accordion */}
                      <Accordion defaultExpanded sx={{ boxShadow: 'none', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                        <AccordionSummary 
                          expandIcon={<ExpandMore />}
                          sx={{ 
                            bgcolor: 'background.default',
                            minHeight: 48,
                            '&.Mui-expanded': { minHeight: 48 }
                          }}
                        >
                          <Box display="flex" alignItems="center" gap={1} width="100%">
                            <ShowChart sx={{ fontSize: 20, color: 'primary.main' }} />
                            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                              Данные в реальном времени
                            </Typography>
                            <Chip 
                              label={`${series.length} точек`}
                              size="small"
                              sx={{ 
                                ml: 'auto',
                                bgcolor: 'primary.light',
                                color: 'primary.main',
                                fontWeight: 600,
                                fontSize: '0.7rem',
                                height: 22
                              }}
                            />
                          </Box>
                        </AccordionSummary>
                        <AccordionDetails sx={{ p: 2, bgcolor: 'background.paper' }}>
                          {series.length === 0 ? (
                            <Alert severity="info" sx={{ borderRadius: 1 }}>
                              Нет данных для параметра {param}
                            </Alert>
                          ) : (
                            <Box sx={{ height: 250 }}>
                              <AIParameterChart 
                                param={param} 
                                series={series}
                                anomalies={paramAnomalies}
                              />
                            </Box>
                          )}
                        </AccordionDetails>
                      </Accordion>

                      {/* Forecast chart */}
                      {forecast && (
                        <Accordion sx={{ boxShadow: 'none', border: '1px solid', borderColor: '#e0e0e0', borderRadius: 1 }}>
                          <AccordionSummary 
                            expandIcon={<ExpandMore />}
                            sx={{ 
                              bgcolor: 'background.default',
                              minHeight: 48,
                              '&.Mui-expanded': { minHeight: 48 }
                            }}
                          >
                            <Box display="flex" alignItems="center" gap={1}>
                              <TrendingUp sx={{ fontSize: 20, color: '#d32f2f' }} />
                              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                {t('forecastProphet')}
                              </Typography>
                            </Box>
                          </AccordionSummary>
                          <AccordionDetails sx={{ p: 2, bgcolor: 'background.paper' }}>
                            <Box sx={{ height: 250 }}>
                              <ForecastChart
                                historicalData={series}
                                forecastData={forecast}
                                parameter={param}
                              />
                            </Box>
                          </AccordionDetails>
                        </Accordion>
                      )}

                      {/* Autoencoder training */}
                      <Accordion sx={{ boxShadow: 'none', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                        <AccordionSummary 
                          expandIcon={<ExpandMore />}
                          sx={{ 
                            bgcolor: 'background.default',
                            minHeight: 48,
                            '&.Mui-expanded': { minHeight: 48 }
                          }}
                        >
                          <Box display="flex" alignItems="center" gap={1} width="100%">
                            <Settings sx={{ fontSize: 20, color: '#7b1fa2' }} />
                            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                              Обучение автоэнкодера
                            </Typography>
                            {trainingStatusParam === 'success' && (
                              <Chip 
                                label="Обучено"
                                size="small"
                                color="success"
                                sx={{ ml: 'auto', height: 22, fontSize: '0.7rem' }}
                              />
                            )}
                          </Box>
                        </AccordionSummary>
                        <AccordionDetails sx={{ p: 2, bgcolor: 'background.paper' }}>
                          <Box display="flex" gap={1} alignItems="center" mb={1}>
                            <Button
                              size="small"
                              variant={trainingStatusParam === 'success' ? 'contained' : 'outlined'}
                              color={trainingStatusParam === 'success' ? 'success' : 'primary'}
                              onClick={() => handleTrainAutoencoder(sensorId, param)}
                              disabled={trainingStatusParam === 'training'}
                              sx={{ minWidth: 180 }}
                            >
                              {trainingStatusParam === 'training' 
                                ? 'Обучение...' 
                                : trainingStatusParam === 'success'
                                ? 'Обучено'
                                : 'Обучить автоэнкодер'}
                            </Button>
                            {trainingStatusParam === 'error' && (
                              <Typography variant="caption" color="error">
                                Ошибка обучения
                              </Typography>
                            )}
                          </Box>
                          {trainingStatusParam === 'training' && (
                            <Typography variant="caption" color="text.secondary">
                              Обучается на {trainingDetails[param]?.data_points || '...'} точках данных...
                            </Typography>
                          )}
                          {trainingStatusParam === 'success' && trainingDetails[param] && (
                            <Box sx={{ mt: 1 }}>
                              <Typography variant="caption" color="success.main" display="block" sx={{ fontWeight: 600 }}>
                                Обучено: {trainingDetails[param].epochs} эпох
                              </Typography>
                              <Typography variant="caption" color="text.secondary" display="block">
                                Loss: {trainingDetails[param].initial_loss} → {trainingDetails[param].final_loss}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" display="block">
                                Данных: {trainingDetails[param].data_points} точек, {trainingDetails[param].windows} окон
                              </Typography>
                            </Box>
                          )}
                        </AccordionDetails>
                      </Accordion>

                      {/* Anomalies list */}
                      {paramAnomalies.length > 0 && (
                        <Accordion sx={{ boxShadow: 'none', border: '1px solid', borderColor: '#ffc107', borderRadius: 1 }}>
                          <AccordionSummary 
                            expandIcon={<ExpandMore />}
                            sx={{ 
                              bgcolor: 'warning.light',
                              minHeight: 48,
                              '&.Mui-expanded': { minHeight: 48 }
                            }}
                          >
                            <Box display="flex" alignItems="center" gap={1} width="100%">
                              <Warning sx={{ fontSize: 20, color: '#f57c00' }} />
                              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                {t('anomalies')} (Autoencoder)
                              </Typography>
                              <Chip 
                                label={paramAnomalies.length}
                                size="small"
                                sx={{ 
                                  ml: 'auto',
                                  bgcolor: '#ffc107',
                                  color: 'primary.contrastText',
                                  fontWeight: 600,
                                  height: 22,
                                  fontSize: '0.7rem'
                                }}
                              />
                            </Box>
                          </AccordionSummary>
                          <AccordionDetails sx={{ p: 2, bgcolor: 'background.paper' }}>
                            <Box sx={{ maxHeight: 150, overflow: 'auto' }}>
                              {paramAnomalies.slice(0, 10).map((anomaly, idx) => (
                                <Alert key={idx} severity="warning" sx={{ mb: 0.5, py: 0.5 }}>
                                  <Typography variant="caption">
                                    {new Date(anomaly.timestamp).toLocaleString()}: {anomaly.value.toFixed(2)} 
                                    {anomaly.reconstruction_error && ` (ошибка: ${anomaly.reconstruction_error.toFixed(4)})`}
                                  </Typography>
                                </Alert>
                              ))}
                              {paramAnomalies.length > 10 && (
                                <Typography variant="caption" color="text.secondary">
                                  ... и еще {paramAnomalies.length - 10} аномалий
                                </Typography>
                              )}
                            </Box>
                          </AccordionDetails>
                        </Accordion>
                      )}

                      {/* Insights */}
                      {info && (
                        <Accordion sx={{ boxShadow: 'none', border: '1px solid', borderColor: 'info.main', borderRadius: 1 }}>
                          <AccordionSummary 
                            expandIcon={<ExpandMore />}
                            sx={{ 
                              bgcolor: 'info.light',
                              minHeight: 48,
                              '&.Mui-expanded': { minHeight: 48 }
                            }}
                          >
                            <Box display="flex" alignItems="center" gap={1}>
                              <Info sx={{ fontSize: 20, color: 'info.dark' }} />
                              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                {t('analysis')}
                              </Typography>
                            </Box>
                          </AccordionSummary>
                          <AccordionDetails sx={{ p: 2, bgcolor: 'background.paper' }}>
                            <Typography variant="body2" sx={{ mb: 1.5, fontSize: '0.875rem' }}>{info.text}</Typography>
                            {info.recommendations && info.recommendations.length > 0 && (
                              <Box component="ul" sx={{ margin: 0, paddingLeft: 2 }}>
                                {info.recommendations.map((r, idx) => (
                                  <li key={idx} style={{ fontSize: '0.8rem', marginBottom: 6, lineHeight: 1.5 }}>{r}</li>
                                ))}
                              </Box>
                            )}
                          </AccordionDetails>
                        </Accordion>
                      )}
                    </Stack>
                  </Box>
                </Stack>
              </Paper>
            </Grid>
          );
        })}

        {summary && (
          <Grid item xs={12}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Card 
                  sx={{ 
                    bgcolor: 'background.paper',
                    borderRadius: 2,
                    boxShadow: 2,
                    border: '1px solid',
                    borderColor: '#e0e0e0',
                    transition: 'box-shadow 0.2s',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    zIndex: 1,
                    '&:hover': { boxShadow: 4 }
                  }}
                >
                  <CardContent sx={{ p: 2, flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <Box display="flex" alignItems="center" justifyContent="space-between" flex={1}>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="caption" sx={{ color: '#757575', fontSize: '0.75rem', fontWeight: 500, display: 'block' }}>
                          Сенсоры
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 700, mt: 0.5, color: '#3C5BA9', lineHeight: 1.2 }}>
                          {summary.sensor_count || 0}
                        </Typography>
                      </Box>
                      <Box 
                        sx={{ 
                          width: 48,
                          height: 48,
                          borderRadius: '50%',
                          bgcolor: '#e3f2fd',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          ml: 1
                        }}
                      >
                        <ShowChart sx={{ fontSize: 24, color: '#3C5BA9' }} />
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card 
                  sx={{ 
                    bgcolor: 'background.paper',
                    borderRadius: 2,
                    boxShadow: 2,
                    border: '1px solid',
                    borderColor: '#e0e0e0',
                    transition: 'box-shadow 0.2s',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    zIndex: 1,
                    '&:hover': { boxShadow: 4 }
                  }}
                >
                  <CardContent sx={{ p: 2, flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <Box display="flex" alignItems="center" justifyContent="space-between" flex={1}>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="caption" sx={{ color: '#757575', fontSize: '0.75rem', fontWeight: 500, display: 'block' }}>
                          {t('points24h')}
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 700, mt: 0.5, color: '#7b1fa2', lineHeight: 1.2 }}>
                          {summary.recent_data_points || 0}
                        </Typography>
                      </Box>
                      <Box 
                        sx={{ 
                          width: 48,
                          height: 48,
                          borderRadius: '50%',
                          bgcolor: '#f3e5f5',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          ml: 1
                        }}
                      >
                        <TrendingUp sx={{ fontSize: 24, color: '#7b1fa2' }} />
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card 
                  sx={{ 
                    bgcolor: 'background.paper',
                    borderRadius: 2,
                    boxShadow: 2,
                    border: '1px solid',
                    borderColor: summary.active_alerts > 0 ? '#ff9800' : '#e0e0e0',
                    transition: 'box-shadow 0.2s',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    zIndex: 1,
                    '&:hover': { boxShadow: 4 }
                  }}
                >
                  <CardContent sx={{ p: 2, flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <Box display="flex" alignItems="center" justifyContent="space-between" flex={1}>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="caption" sx={{ color: '#757575', fontSize: '0.75rem', fontWeight: 500, display: 'block' }}>
                          {t('activeAlerts')}
                        </Typography>
                        <Typography 
                          variant="h5" 
                          sx={{ 
                            fontWeight: 700, 
                            mt: 0.5, 
                            color: summary.active_alerts > 0 ? '#f57c00' : '#4caf50',
                            lineHeight: 1.2
                          }}
                        >
                          {summary.active_alerts || 0}
                        </Typography>
                      </Box>
                      <Box 
                        sx={{ 
                          width: 48,
                          height: 48,
                          borderRadius: '50%',
                          bgcolor: summary.active_alerts > 0 ? 'warning.light' : 'success.light',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          ml: 1
                        }}
                      >
                        {summary.active_alerts > 0 ? (
                          <Warning sx={{ fontSize: 24, color: '#f57c00' }} />
                        ) : (
                          <Info sx={{ fontSize: 24, color: '#4caf50' }} />
                        )}
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card 
                  sx={{ 
                    bgcolor: 'background.paper',
                    borderRadius: 2,
                    boxShadow: 2,
                    border: '1px solid',
                    borderColor: '#e0e0e0',
                    transition: 'box-shadow 0.2s',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    zIndex: 1,
                    '&:hover': { boxShadow: 4 }
                  }}
                >
                  <CardContent sx={{ p: 2, flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <Box display="flex" alignItems="center" justifyContent="space-between" flex={1}>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="caption" sx={{ color: '#757575', fontSize: '0.75rem', fontWeight: 500, display: 'block' }}>
                          {t('sensorType')}
                        </Typography>
                        <Typography 
                          variant="h5" 
                          sx={{ 
                            fontWeight: 700, 
                            mt: 0.5, 
                            color: '#424242', 
                            textTransform: 'capitalize',
                            lineHeight: 1.2,
                            fontSize: '1.5rem'
                          }}
                        >
                          {sensorType === 'raw_material' ? t('rawMaterial') :
                           sensorType === 'production_line' ? t('productionLine') :
                           t('warehouse')}
                        </Typography>
                      </Box>
                      <Box 
                        sx={{ 
                          width: 48,
                          height: 48,
                          borderRadius: '50%',
                          bgcolor: 'background.default',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          ml: 1
                        }}
                      >
                        <Settings sx={{ fontSize: 24, color: '#757575' }} />
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Grid>
        )}
      </Grid>
    );
  };

  return (
    <Box sx={{ position: 'relative', zIndex: 0 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          {sensorType === 'raw_material' ? t('monitoringRawMaterial') :
           sensorType === 'production_line' ? t('monitoringProductionLine') :
           t('monitoringWarehouse')}
        </Typography>
      </Box>

      {/* Область для ИИ-генерации контента */}
      <Box sx={{ position: 'relative', zIndex: 0 }}>
        {loading ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography>Загрузка данных сенсоров...</Typography>
          </Box>
        ) : (
          renderAIGeneratedContent()
        )}
      </Box>

      {/* Скрытая область с данными для отладки (можно удалить в production) */}
      {process.env.NODE_ENV === 'development' && (
        <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1, display: 'none' }}>
          <Typography variant="caption" color="text.secondary">
            Данные для ИИ (только для разработки):
          </Typography>
          <Typography variant="caption" component="pre" sx={{ fontSize: '0.7rem', mt: 1 }}>
            {JSON.stringify({
              sensorType,
              parametersCount: parameters.length,
              dataPointsCount: sensorData.length,
              latestDataCount: latestData.length,
              summary,
            }, null, 2)}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default DashboardTab;

