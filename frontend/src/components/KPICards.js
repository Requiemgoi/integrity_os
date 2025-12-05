import React from 'react';
import { Grid, Card, CardContent, Typography, Box } from '@mui/material';
import KPIProgressCard from './ai/KPIProgressCard';

/**
 * KPICards Component
 * 
 * Этот компонент отображает KPI (ключевые показатели эффективности).
 * 
 * ВАЖНО: Графики и визуализации удалены. Область для ИИ-генерации контента помечена комментариями.
 * 
 * Доступные данные для ИИ:
 * - kpis: массив объектов KPI с полями:
 *   - id: идентификатор
 *   - kpi_name: название KPI (OEE, stock_level, production_rate)
 *   - value: текущее значение
 *   - target: целевое значение (опционально)
 *   - unit: единица измерения
 *   - timestamp: время обновления
 * 
 * Функции для использования ИИ:
 * - Данные загружаются через dashboardService.getKPIs() (уже работает)
 * - Данные обновляются через WebSocket (уже настроено)
 * 
 * ИИ должен генерировать:
 * - Визуализации KPI (графики, индикаторы прогресса)
 * - Анализ трендов
 * - Сравнение с целевыми значениями
 * - Рекомендации по улучшению показателей
 */
const KPICards = ({ kpis }) => {
  // Область для ИИ-генерации контента
  // ИИ использует данные: kpis (массив объектов KPI)
  const renderAIGeneratedKPIs = () => {
    if (!kpis || kpis.length === 0) {
      return (
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" align="center">
                Нет KPI данных
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      );
    }

    return kpis.map((kpi) => (
      <Grid item xs={12} sm={6} md={3} key={kpi.id || kpi.kpi_name}>
        <Card
          sx={{
            borderRadius: 2,
            boxShadow: 2,
            border: '1px solid',
            borderColor: 'divider',
            height: '100%',
            transition: 'transform 0.2s, box-shadow 0.2s',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: 4
            }
          }}
        >
          <CardContent sx={{ p: 2.5 }}>
            <KPIProgressCard kpi={kpi} />
            {kpi.target != null && (
              <Typography 
                variant="caption" 
                sx={{ 
                  display: 'block',
                  mt: 1.5,
                  color: 'text.secondary',
                  fontSize: '0.75rem',
                  lineHeight: 1.4
                }}
              >
                {Number(kpi.value) >= Number(kpi.target)
                  ? 'Порог достигнут — закрепляйте результат.'
                  : 'Цель не достигнута — ускорьте производство/снизьте простой.'}
              </Typography>
            )}
          </CardContent>
        </Card>
      </Grid>
    ));
  };

  return (
    <Grid container spacing={2}>
      {renderAIGeneratedKPIs()}
      
      {/* Скрытая область с данными для отладки (можно удалить в production) */}
      {process.env.NODE_ENV === 'development' && kpis && kpis.length > 0 && (
        <Grid item xs={12}>
          <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1, display: 'none' }}>
            <Typography variant="caption" color="text.secondary">
              Данные KPI для ИИ (только для разработки):
            </Typography>
            <Typography variant="caption" component="pre" sx={{ fontSize: '0.7rem', mt: 1 }}>
              {JSON.stringify(kpis, null, 2)}
            </Typography>
          </Box>
        </Grid>
      )}
    </Grid>
  );
};

export default KPICards;

