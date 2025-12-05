export function useAIDashboard({ sensorData, dataByParameter, parameters }) {
  const computeStats = (points) => {
    if (!points?.length) return null;
    const values = points
      .map(p => Number(p.value))
      .filter(v => Number.isFinite(v));
    if (!values.length) return null;
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const latest = points[points.length - 1];
    const N = Math.min(8, values.length);
    const trend = values.slice(-N)[N - 1] - values.slice(0, N)[0];
    const anomaliesCount = points.filter(p => p.is_anomaly).length;
    return { avg, min, max, latest, trend, anomaliesCount };
  };

  const insights = (parameters || []).map(param => {
    const series = dataByParameter?.[param] || [];
    const stats = computeStats(series);
    if (!stats) {
      return { param, text: 'Нет данных', recommendations: ['Ожидаем поступление данных.'] };
    }
    const direction = stats.trend > 0 ? 'растёт' : stats.trend < 0 ? 'снижается' : 'стабилен';
    const parts = [
      `Параметр ${param}: ${direction}.`,
      `Среднее=${stats.avg.toFixed(2)}, мин=${stats.min.toFixed(2)}, макс=${stats.max.toFixed(2)}.`
    ];
    if (stats.anomaliesCount > 0) {
      parts.push(`Аномалий: ${stats.anomaliesCount}.`);
    }
    const recommendations = [];
    if (stats.anomaliesCount > 2) recommendations.push('Проверьте датчик/процесс: серия аномалий.');
    if (Math.abs(stats.trend) > (stats.avg || 1) * 0.1) recommendations.push('Тренд значимый — пересмотрите пороги.');
    if (!recommendations.length) recommendations.push('Существенных отклонений не обнаружено.');
    return { param, text: parts.join(' '), recommendations };
  });

  return { insights };
}







