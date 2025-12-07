import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Alert,
  Typography,
  Button,
} from '@mui/material';
import { keyframes } from '@mui/system';
import {
  BugReport,
  Storage,
  Assessment,
  TrendingUp,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
// leaflet for compact dashboard map
import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { defectsService } from '../services/defectsService';
import { pipelinesService } from '../services/pipelinesService';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const fadeUp = keyframes({
  '0%': {
    opacity: 0,
    transform: 'translateY(16px) scale(0.98)',
  },
  '100%': {
    opacity: 1,
    transform: 'translateY(0) scale(1)',
  },
});

const AnimatedNumber = ({ value, duration = 900 }) => {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const target = Number(value) || 0;
    if (target === 0) {
      setDisplay(0);
      return;
    }
    let frame;
    const start = performance.now();
    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
    const step = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = easeOutCubic(progress);
      const current = Math.round(target * eased);
      setDisplay(current);
      if (progress < 1) {
        frame = requestAnimationFrame(step);
      }
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  return <span>{display}</span>;
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [mapLoading, setMapLoading] = useState(true);
  const [pipelines, setPipelines] = useState([]);
  const [defectsMap, setDefectsMap] = useState([]);
  const [mounted, setMounted] = useState(false);
  const [filters, setFilters] = useState({
    method: '',
    severity: '',
    startDate: null,
    endDate: null,
    pipeline: '',
  });

  useEffect(() => {
    setMounted(true);
    loadMapData();
  }, []);

  const loadMapData = async () => {
    setLoading(true);
    setMapLoading(true);
    setError(null);
    try {
      const [pData, dData] = await Promise.all([
        pipelinesService.getPipelines(),
        defectsService.getDefects(),
      ]);

      const pipelinesSafe = pData || [];
      const defectsSafe = dData || [];

      setPipelines(pipelinesSafe);
      setDefectsMap(defectsSafe);

      // Локально считаем агрегированную статистику по тем же дефектам, что и на карте
      const methodsMap = new Map();
      const severityMap = new Map();
      const objectsMap = new Map();
      const yearsMap = new Map();

      defectsSafe.forEach((d) => {
        // Методы: учитываем только непустые значения
        if (d.method) {
          const methodKey = d.method;
          methodsMap.set(methodKey, (methodsMap.get(methodKey) || 0) + 1);
        }

        // Критичность: учитываем только непустые значения
        if (d.severity) {
          const severityKey = d.severity;
          severityMap.set(severityKey, (severityMap.get(severityKey) || 0) + 1);
        }

        // Топ-5 объектов: группируем по pipeline_id, подтягиваем данные из pipelines
        const pipelineId = d.pipeline_id ? Number(d.pipeline_id) : null;
        let objectKey = 'NO_PIPELINE';
        let objectCode = 'NO_CODE';
        let objectName = '-';

        if (pipelineId) {
          const pipeline = pipelinesSafe.find((p) => Number(p.id) === pipelineId);
          if (pipeline) {
            objectKey = `PIPELINE_${pipeline.id}`;
            objectCode = pipeline.pipeline_code || `PL-${pipeline.id}`;
            objectName = pipeline.name || objectCode;
          }
        } else if (d.object_code || d.object_id) {
          objectKey = d.object_code || d.object_id;
          objectCode = d.object_code || String(d.object_id);
          objectName = d.object_name || objectCode;
        }

        if (!objectsMap.has(objectKey)) {
          objectsMap.set(objectKey, {
            id: objectKey,
            object_code: objectCode,
            name: objectName,
            defects_count: 0,
          });
        }
        const obj = objectsMap.get(objectKey);
        obj.defects_count += 1;

        // Обследования по годам: пробуем взять год из inspection_date или отдельных полей
        let yearValue = null;
        if (d.inspection_date) {
          const dt = new Date(d.inspection_date);
          const y = dt.getFullYear();
          if (!Number.isNaN(y)) yearValue = y;
        } else if (d.inspection_year) {
          yearValue = Number(d.inspection_year);
        } else if (d.year) {
          yearValue = Number(d.year);
        }

        if (yearValue && !Number.isNaN(yearValue)) {
          yearsMap.set(yearValue, (yearsMap.get(yearValue) || 0) + 1);
        }
      });

      const computedStats = {
        methods: Array.from(methodsMap.entries()).map(([method, count]) => ({ method, count })),
        severity: Array.from(severityMap.entries()).map(([severity, count]) => ({ severity, count })),
        top_objects: Array.from(objectsMap.values())
          .sort((a, b) => b.defects_count - a.defects_count)
          .slice(0, 5),
        inspections_by_year: Array.from(yearsMap.entries())
          .map(([year, count]) => ({ year, count }))
          .sort((a, b) => a.year - b.year),
      };

      setStats(computedStats);
    } catch (e) {
      console.error('Error loading dashboard data', e);
      setError('Ошибка загрузки статистики');
    } finally {
      setLoading(false);
      setMapLoading(false);
    }
  };

  const severityColors = {
    low: '#6B7280',
    medium: '#9CA3AF',
    high: '#6B7280',
    critical: '#4B5563',
  };

  const severityLabels = {
    low: 'Низкая',
    medium: 'Средняя',
    high: 'Высокая',
    critical: 'Критическая',
  };

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  // Prepare chart data for methods
  const methodsChartData = stats?.methods
    ? {
        labels: stats.methods.map((m) => m.method),
        datasets: [
          {
            label: 'Количество дефектов',
            data: stats.methods.map((m) => m.count),
            backgroundColor: ['#64748B', '#475569', '#6B7280'],
          },
        ],
      }
    : null;

  // Prepare chart data for inspections by year
  const inspectionsChartData = stats?.inspections_by_year
    ? {
        labels: stats.inspections_by_year.map((y) => y.year.toString()),
        datasets: [
          {
            label: 'Обследования',
            data: stats.inspections_by_year.map((y) => y.count),
            backgroundColor: '#64748B',
          },
        ],
      }
    : null;

  // Map helpers
  const parsePipelineGeometry = (geometryStr) => {
    try {
      const geometry = JSON.parse(geometryStr);
      if (geometry.type === 'LineString' && geometry.coordinates) {
        return geometry.coordinates.map(([lng, lat]) => [lat, lng]);
      }
      return [];
    } catch (e) {
      return [];
    }
  };

  const pipelineColors = {
    'MT-01': '#64748B',
    'MT-02': '#475569',
    'MT-03': '#6B7280',
  };

  const totalObjects = (stats && stats.total_objects) || pipelines.length || 0;
  const totalDefects = (stats && stats.total_defects) || defectsMap.length || 0;

   const createFadeUp = (delayMs) =>
    mounted
      ? `${fadeUp} 0.7s cubic-bezier(0.22, 0.61, 0.36, 1) ${delayMs}ms both`
      : 'none';

  return (
    <Layout>
      <Box>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        ) : (
          <Grid container spacing={4} sx={{ px: 3, py: 2 }}>
            {/* Welcome Card */}
            <Grid item xs={12}>
              <Box 
                sx={{ 
                  p: 3, 
                  textAlign: 'center',
                  borderRadius: 2,
                  mb: 3,
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                  animation: createFadeUp(0),
                }}
              >
                <Typography
                  variant="h4"
                  gutterBottom
                  sx={{ fontWeight: 600, color: '#111827', fontSize: '1.5rem' }}
                >
                  Добро пожаловать в IntegrityOS
                </Typography>
                <Typography
                  variant="h6"
                  sx={{ mt: 1, color: '#6b7280', fontSize: '1rem', fontWeight: 400 }}
                >
                  Платформа для мониторинга трубопроводов и управления дефектами
                </Typography>
              </Box>
            </Grid>

            {/* Compact Map Widget */}
            <Grid item xs={12} md={6}>
              <Box 
                sx={{ 
                  p: 3, 
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  borderRadius: 2,
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                  animation: createFadeUp(120),
                }}
              >
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  mb: 2,
                  pb: 1,
                  borderBottom: '1px solid #e5e7eb'
                }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#111827', fontSize: '1rem' }}>
                    Карта (обзор)
                  </Typography>
                  <Button 
                    size="small" 
                    variant="outlined"
                    sx={{ 
                      textTransform: 'none',
                      fontWeight: 500,
                      borderRadius: 2,
                      fontSize: '0.85rem',
                      py: 0.6,
                      px: 1.5,
                      color: '#6b7280',
                      borderColor: '#d1d5db',
                      '&:hover': {
                        borderColor: '#9ca3af',
                        color: '#4b5563'
                      }
                    }}
                    onClick={() => {
                      const params = new URLSearchParams();
                      if (filters.method) params.append('method', filters.method);
                      if (filters.severity) params.append('severity', filters.severity);
                      if (filters.startDate) params.append('startDate', filters.startDate);
                      if (filters.endDate) params.append('endDate', filters.endDate);
                      if (filters.pipeline) params.append('pipeline', filters.pipeline);
                      navigate(`/map${params.toString() ? '?' + params.toString() : ''}`);
                    }}
                  >
                    Открыть полную
                  </Button>
                </Box>
                <Box sx={{ 
                  height: 300, 
                  borderRadius: 1,
                  overflow: 'hidden',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  mt: 1
                }}>
                  {mapLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                      <CircularProgress />
                    </Box>
                  ) : (
                    <MapContainer
                      center={[48.0196, 66.9237]}
                      zoom={6}
                      style={{ height: '100%', width: '100%' }}
                      scrollWheelZoom={true}
                    >
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />

                      {/* Pipelines (small) */}
                      {pipelines.map((pipeline) => {
                        const coords = parsePipelineGeometry(pipeline.geometry);
                        if (!coords || coords.length === 0) return null;
                        return (
                          <Polyline
                            key={pipeline.id}
                            positions={coords}
                            color={pipelineColors[pipeline.pipeline_code] || '#444'}
                            weight={2}
                          />
                        );
                      })}

                      {/* Defect markers (limited to first 50 for performance) */}
                      {defectsMap
                        .filter((d) => d.latitude && d.longitude)
                        .slice(0, 50)
                        .map((d) => (
                          <Marker
                            key={d.id}
                            position={[d.latitude, d.longitude]}
                            icon={L.divIcon({
                              className: 'compact-marker',
                              html: `<div style="background:${severityColors[d.severity] || '#f44336'}; width:12px; height:12px; border-radius:50%; border:1px solid white;"></div>`,
                              iconSize: [12, 12],
                              iconAnchor: [6, 6],
                            })}
                          >
                            <Popup>
                              <Typography variant="subtitle2">{d.defect_code}</Typography>
                              <Typography variant="body2">{d.object_code || ''}</Typography>
                            </Popup>
                          </Marker>
                      ))}
                    </MapContainer>
                  )}
                </Box>
              </Box>
            </Grid>

            {/* Total Stats Cards */}
            <Grid item xs={12} md={6} sx={{ animation: createFadeUp(200) }}>
              <Grid container spacing={3}>
                <Grid item xs={6}>
                  <Box 
                    sx={{ 
                      height: '100%',
                      borderRadius: 2,
                      background: '#ffffff',
                      border: '1px solid #e5e7eb',
                      p: 2.5,
                      transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                      },
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Storage sx={{ mr: 1.5, color: '#6b7280', fontSize: '1.4rem' }} />
                        <Typography variant="subtitle2" sx={{ color: '#6b7280', fontWeight: 500, fontSize: '0.85rem' }}>
                          Всего объектов
                        </Typography>
                      </Box>
                      <Typography
                        variant="h4"
                        sx={{ fontWeight: 600, color: '#111827', fontSize: '1.8rem', mt: 0.5 }}
                      >
                        <AnimatedNumber value={totalObjects} />
                      </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box 
                    sx={{ 
                      height: '100%',
                      borderRadius: 2,
                      background: '#ffffff',
                      border: '1px solid #e5e7eb',
                      p: 2.5,
                      transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                      }
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <BugReport sx={{ mr: 1.5, color: '#6b7280', fontSize: '1.4rem' }} />
                        <Typography variant="subtitle2" sx={{ color: '#6b7280', fontWeight: 500, fontSize: '0.85rem' }}>
                          Всего дефектов
                        </Typography>
                      </Box>
                      <Typography
                        variant="h4"
                        sx={{ fontWeight: 600, color: '#111827', fontSize: '1.8rem', mt: 0.5 }}
                      >
                        <AnimatedNumber value={totalDefects} />
                      </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Grid>

            {/* Methods Widget */}
            <Grid item xs={12} md={6} sx={{ animation: createFadeUp(260) }}>
              <Box 
                sx={{ 
                  borderRadius: 2,
                  height: '100%',
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                  p: 3,
                }}
              >
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  mb: 2,
                  pb: 1,
                  borderBottom: '1px solid #e5e7eb'
                }}>
                  <Assessment sx={{ mr: 1.5, color: '#6b7280', fontSize: '1.3rem' }} />
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#111827', fontSize: '1rem' }}>
                    Дефекты по методам
                  </Typography>
                </Box>
                  {methodsChartData ? (
                    <Box sx={{ height: 250, mt: 1 }}>
                      <Bar
                        data={methodsChartData}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              position: 'top',
                              labels: {
                                color: '#94A3B8',
                                font: {
                                  size: 12
                                }
                              },
                            },
                          },
                          scales: {
                            y: {
                              beginAtZero: true,
                              ticks: {
                                stepSize: 1,
                                color: '#94A3B8',
                                font: {
                                  size: 11
                                }
                              },
                              grid: {
                                color: 'rgba(148, 163, 184, 0.1)'
                              }
                            },
                            x: {
                              ticks: {
                                color: '#94A3B8',
                                font: {
                                  size: 11
                                }
                              },
                              grid: {
                                display: false
                              }
                            }
                          },
                          animation: {
                            duration: 600,
                            easing: 'easeOutQuart',
                          },
                        }}
                      />
                    </Box>
                  ) : (
                    <Box sx={{ 
                      display: 'flex', 
                      justifyContent: 'center', 
                      alignItems: 'center', 
                      height: 200 
                    }}>
                      <CircularProgress />
                    </Box>
                  )}
              </Box>
            </Grid>

            {/* Severity Widget */}
            <Grid item xs={12} md={6} sx={{ animation: createFadeUp(320) }}>
              <Box sx={{ p: 3, borderRadius: 2, background: '#ffffff', border: '1px solid #e5e7eb' }}>
                <Typography
                  variant="h6"
                  gutterBottom
                  sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 600, color: '#111827', fontSize: '1rem', mb: 2, pb: 1, borderBottom: '1px solid #e5e7eb' }}
                >
                  <TrendingUp sx={{ color: '#6b7280', fontSize: '1.3rem' }} />
                  Дефекты по критичности
                </Typography>
                {stats?.severity && stats.severity.length > 0 ? (
                  <Box sx={{ mt: 2 }}>
                    {stats.severity.map((item) => (
                      <Box key={item.severity} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Chip
                          label={severityLabels[item.severity] || item.severity}
                          sx={{
                            bgcolor: severityColors[item.severity] || '#gray',
                            color: 'white',
                            minWidth: 120,
                          }}
                        />
                        <Typography variant="h5" sx={{ fontWeight: 700 }}>
                          {item.count}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                ) : (
                  <Alert severity="info">Нет данных</Alert>
                )}
              </Box>
            </Grid>

            {/* Top 5 Objects */}
            <Grid item xs={12} md={6} sx={{ animation: createFadeUp(380) }}>
              <Box sx={{ p: 3, borderRadius: 2, background: '#ffffff', border: '1px solid #e5e7eb' }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: '#111827', fontSize: '1rem', mb: 2, pb: 1, borderBottom: '1px solid #e5e7eb' }}>
                  Топ-5 объектов по дефектам
                </Typography>
                {stats?.top_objects && stats.top_objects.length > 0 ? (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Код</TableCell>
                          <TableCell>Название</TableCell>
                          <TableCell align="right">Дефектов</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {stats.top_objects.map((obj) => (
                          <TableRow
                            key={obj.id}
                            hover
                            sx={{ cursor: 'pointer' }}
                            onClick={() => navigate(`/objects/${obj.id}`)}
                          >
                            <TableCell>{obj.object_code}</TableCell>
                            <TableCell>{obj.name}</TableCell>
                            <TableCell align="right">
                              <Chip
                                label={obj.defects_count}
                                size="small"
                                color={obj.defects_count > 0 ? 'error' : 'default'}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    Нет данных
                  </Alert>
                )}
              </Box>
            </Grid>

            {/* Inspections by Year */}
            <Grid item xs={12} md={6} sx={{ animation: createFadeUp(440) }}>
              <Box sx={{ p: 3, borderRadius: 2, background: '#ffffff', border: '1px solid #e5e7eb' }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: '#111827', fontSize: '1rem', mb: 2, pb: 1, borderBottom: '1px solid #e5e7eb' }}>
                  Обследования по годам
                </Typography>
                {inspectionsChartData ? (
                  <Box sx={{ height: 300, mt: 2 }}>
                    <Bar
                      data={inspectionsChartData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            display: false,
                            labels: {
                              color: '#E5E7EB',
                            },
                          },
                        },
                        scales: {
                          y: {
                            ticks: {
                              color: '#94A3B8',
                              font: {
                                size: 11
                              }
                            },
                            grid: {
                              color: 'rgba(148, 163, 184, 0.1)',
                            },
                          },
                          x: {
                            ticks: {
                              color: '#94A3B8',
                              font: {
                                size: 11
                              }
                            },
                            grid: {
                              display: false,
                            },
                          },
                        },
                        animation: {
                          duration: 600,
                          easing: 'easeOutQuart',
                        },
                      }}
                    />
                  </Box>
                ) : (
                  <Alert severity="info">Нет данных</Alert>
                )}
              </Box>
            </Grid>
          </Grid>
        )}
      </Box>
    </Layout>
  );
};

export default Dashboard;
