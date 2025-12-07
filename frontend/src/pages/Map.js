import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';

import { Box, Paper, Button, Grid, Typography } from '@mui/material';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import Layout from '../components/Layout';
import { defectsService } from '../services/defectsService';
import { pipelinesService } from '../services/pipelinesService';
import MapSidebar from '../components/MapSidebar';

// Fix for default marker icons in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom component to handle map instance
const MapEvents = ({ onMapCreated }) => {
  const map = useMap();

  useEffect(() => {
    if (map) {
      onMapCreated(map);
    }
  }, [map, onMapCreated]);
  return null;
};

const MapPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [defects, setDefects] = useState([]);
  const [userDefects, setUserDefects] = useState([]);
  const [pipelines, setPipelines] = useState([]);

  const [loading, setLoading] = useState(true);
  const [showPipelines, setShowPipelines] = useState(true);
  const [selectedPipelineId, setSelectedPipelineId] = useState('');
  const [appliedPipelineId, setAppliedPipelineId] = useState('');
  const [mapInstance, setMapInstance] = useState(null);
  const [error, setError] = useState(null);

  // filters — то, что выбрано в UI, appliedFilters — то, что реально применено на карту/загрузку
  const [filters, setFilters] = useState({
    method: searchParams.get('method') || '',
    date_from: searchParams.get('startDate') || '',
    date_to: searchParams.get('endDate') || '',
    severity: searchParams.get('severity') || '',
    param1_min: '',
    param1_max: '',
  });
  const [appliedFilters, setAppliedFilters] = useState({
    method: searchParams.get('method') || '',
    date_from: searchParams.get('startDate') || '',
    date_to: searchParams.get('endDate') || '',
    severity: searchParams.get('severity') || '',
    param1_min: '',
    param1_max: '',
  });

  const severityColors = {
    low: '#4caf50',
    medium: '#ff9800',
    high: '#f44336',
    critical: '#9c27b0',
  };

  const severityLabels = {
    low: 'Низкая',
    medium: 'Средняя',
    high: 'Высокая',
    critical: 'Критическая',
  };

  useEffect(() => {
    const initialFilters = {
      method: searchParams.get('method') || '',
      date_from: searchParams.get('startDate') || '',
      date_to: searchParams.get('endDate') || '',
      severity: searchParams.get('severity') || '',
      param1_min: '',
      param1_max: '',
    };
    setFilters(initialFilters);
    setAppliedFilters(initialFilters);

    const initialPipeline = searchParams.get('pipeline') || '';
    setSelectedPipelineId(initialPipeline);
    setAppliedPipelineId(initialPipeline);
  }, [searchParams]);

  // Загружаем пользовательские демо-дефекты из localStorage
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      const stored = window.localStorage.getItem('integrity_demo_user_defects');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setUserDefects(parsed);
        }
      }
    } catch (e) {
      console.error('Ошибка загрузки пользовательских точек:', e);
    }
  }, []);

  const loadData = async (overrideFilters) => {
    if (!isAuthenticated) return;

    setLoading(true);
    setError(null);
    console.log('Начало загрузки данных...');

    try {
      // Сначала загружаем трубопроводы
      const pipelinesData = await pipelinesService.getPipelines()
        .catch(err => {
          console.error('Ошибка загрузки трубопроводов:', err);
          return [];
        });

      console.log('Загружены трубопроводы:', pipelinesData);
      setPipelines(Array.isArray(pipelinesData) ? pipelinesData : []);

      let defectsData = [];

      // Всегда загружаем дефекты (фильтры учитываются на стороне сервиса)
      try {
        const effectiveFilters = overrideFilters || appliedFilters;
        defectsData = await defectsService.getDefects(effectiveFilters);
      } catch (err) {
        console.error('Ошибка загрузки дефектов:', err);
        setError('Ошибка загрузки дефектов');
      }

      console.log('Загружены дефекты:', defectsData);
      setDefects(Array.isArray(defectsData) ? defectsData : []);

    } catch (error) {
      console.error('Общая ошибка при загрузке данных:', error);
      setError('Ошибка при загрузке данных');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      // Первичная загрузка данных при входе на страницу
      loadData();
    } else {
      navigate('/login');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, navigate]);

  const handleMapCreated = (map) => {
    setMapInstance(map);
    try {
      const allCoords = visiblePipelines
        .map((p) => parsePipelineGeometry(p.geometry))
        .flat()
        .filter((c) => c && c.length === 2);
      if (allCoords.length > 0) {
        map.fitBounds(allCoords, { padding: [50, 50] });
      }
    } catch (e) {
      // ignore
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleResetFilters = async () => {
    const emptyFilters = {
      method: '',
      date_from: '',
      date_to: '',
      severity: '',
      param1_min: '',
      param1_max: '',
    };

    setFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
    setSelectedPipelineId('');
    setAppliedPipelineId('');

    await loadData(emptyFilters);

    if (mapInstance) {
      try {
        const allCoords = pipelines
          .map((p) => parsePipelineGeometry(p.geometry))
          .flat()
          .filter((c) => c && c.length === 2);

        if (allCoords.length > 0) {
          mapInstance.fitBounds(allCoords, { padding: [50, 50] });
        }
      } catch (e) {
        // ignore
      }
    }
  };

  const allDefects = [...defects, ...userDefects];

  const allPipelines = pipelines;

  const appliedPipelineNumericId = appliedPipelineId
    ? Number(appliedPipelineId)
    : null;

  const visiblePipelines = appliedPipelineNumericId
    ? allPipelines.filter((p) => Number(p.id) === appliedPipelineNumericId)
    : allPipelines;

  const visibleDefects = allDefects.filter((d) => {
    if (appliedFilters.method && d.method !== appliedFilters.method) return false;
    if (appliedFilters.severity && d.severity !== appliedFilters.severity) return false;
    return true;
  });

  const visibleDefectsWithCoords = visibleDefects.filter(
    (d) => d.latitude && d.longitude
  );

  // Убираем возможные дубликаты по координатам и идентификатору/коду дефекта
  const uniqueDefectsWithCoords = Array.from(
    new Map(
      visibleDefectsWithCoords.map((d) => {
        const key = `${d.latitude}_${d.longitude}_${d.severity}_${d.defect_code || d.id}`;
        return [key, d];
      })
    ).values()
  );

  const parsePipelineGeometry = (geometryStr) => {
    try {
      console.log('Разбор геометрии:', geometryStr);
      const geometry = JSON.parse(geometryStr);
      if (geometry.type === 'LineString' && geometry.coordinates) {
        return geometry.coordinates.map(([lng, lat]) => [lat, lng]);
      }
      console.warn('Неверный формат геометрии:', geometry);
      return [];
    } catch (e) {
      console.error('Ошибка разбора геометрии:', e);
      return [];
    }
  };

  const pipelineColors = {
    'MT-01': '#E52521', // красная
    'MT-02': '#3C5BA9', // синяя
    'MT-03': '#F8D41F', // жёлтая
    'MT-04': '#6DC5F1', // небесно-голубая
  };

  const handleApplyFilters = async () => {
    const newAppliedFilters = { ...filters };
    setAppliedFilters(newAppliedFilters);

    await loadData(newAppliedFilters);

    setAppliedPipelineId(selectedPipelineId || '');

    if (!mapInstance) return;

    try {
      const targetPipelineId = selectedPipelineId ? Number(selectedPipelineId) : null;
      const pipelinesForBounds = targetPipelineId
        ? allPipelines.filter((p) => Number(p.id) === targetPipelineId)
        : allPipelines;

      const allCoords = pipelinesForBounds
        .map((p) => parsePipelineGeometry(p.geometry))
        .flat()
        .filter((c) => c && c.length === 2);

      if (allCoords.length > 0) {
        mapInstance.fitBounds(allCoords, { padding: [50, 50] });
      }
    } catch (e) {
      // ignore
    }
  };

  return (
    <Layout>
      <Box>
        <Typography variant="h4" gutterBottom>
          Карта дефектов
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Paper sx={{ height: '70vh', position: 'relative' }}>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                  <Typography>Загрузка карты...</Typography>
                </Box>
              ) : (
                <>
                  {visiblePipelines.length > 0 ? (
                    <MapContainer
                      center={[48.0196, 66.9237]}
                      zoom={6}
                      style={{ height: '100%', width: '100%' }}
                      scrollWheelZoom={true}
                    >
                      <MapEvents onMapCreated={handleMapCreated} />

                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />

                      {/* Линии трубопроводов */}
                      {showPipelines && visiblePipelines.map((pipeline) => {
                        const coords = parsePipelineGeometry(pipeline.geometry);
                        if (!coords || coords.length === 0) return null;
                        return (
                          <Polyline
                            key={pipeline.id}
                            positions={coords}
                            color={pipelineColors[pipeline.pipeline_code] || '#444'}
                            weight={4}
                          />
                        );
                      })}

                      {/* Маркеры дефектов */}
                      {uniqueDefectsWithCoords.map((d) => (
                        <Marker
                          key={d.id}
                          position={[d.latitude, d.longitude]}
                          icon={L.divIcon({
                            className: 'map-defect-marker',
                            html: `<div style="background:${severityColors[d.severity] || '#f44336'}; width:16px; height:16px; border-radius:50%; border:2px solid white;"></div>`,
                            iconSize: [16, 16],
                            iconAnchor: [8, 8],
                          })}
                        >
                          <Popup>
                            <Typography variant="subtitle2">{d.defect_code}</Typography>
                            <Typography variant="body2">{d.object_code || ''}</Typography>
                            <Typography variant="body2">Метод: {d.method}</Typography>
                            <Typography variant="body2">Критичность: {severityLabels[d.severity] || d.severity}</Typography>
                          </Popup>
                        </Marker>
                      ))}
                    </MapContainer>
                  ) : (
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        height: '100%',
                        textAlign: 'center',
                        p: 3,
                      }}
                    >
                      <Typography variant="h6" gutterBottom>
                        Нет данных о трубопроводах
                      </Typography>
                      <Typography variant="body1" color="text.secondary" paragraph>
                        В системе пока нет загруженных данных о трубопроводах.
                      </Typography>
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={loadData}
                        sx={{ mt: 2 }}
                      >
                        Обновить данные
                      </Button>
                    </Box>
                  )}

                  {/* Панель статуса */}
                  <Box sx={{
                    position: 'absolute',
                    bottom: 10,
                    left: 10,
                    background: 'rgba(255, 255, 255, 0.9)',
                    padding: '8px 12px',
                    borderRadius: '4px',
                    zIndex: 1000,
                    fontSize: '12px',
                    maxWidth: '300px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                  }}>
                    <div><strong>Статус:</strong> {loading ? 'Загрузка...' : 'Готово'}</div>
                    <div><strong>Трубопроводы:</strong> {visiblePipelines?.length || 0} шт.</div>
                    <div><strong>Дефекты:</strong> {uniqueDefectsWithCoords?.length || 0} шт.</div>

                    {error && (
                      <div style={{ color: 'red', marginTop: '5px' }}>
                        {error}
                      </div>
                    )}
                  </Box>

                  {!loading && (!visiblePipelines || visiblePipelines.length === 0) && (
                    <Box
                      sx={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        backgroundColor: 'background.paper',
                        p: 3,
                        borderRadius: 1,
                        boxShadow: 3,
                        textAlign: 'center',
                        zIndex: 1000
                      }}
                    >
                      <Typography variant="h6" color="error" gutterBottom>
                        Не удалось загрузить данные
                      </Typography>
                      <Typography variant="body2" paragraph>
                        {!visiblePipelines || visiblePipelines.length === 0
                          ? 'Не удалось загрузить данные о трубопроводах'
                          : 'Не удалось загрузить данные о дефектах'}
                      </Typography>
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={loadData}
                        sx={{ mt: 2 }}
                      >
                        Повторить загрузку
                      </Button>
                    </Box>
                  )}
                </>
              )}
            </Paper>
          </Grid>

          <Grid item xs={12} md={4}>
            <MapSidebar
              filters={filters}
              onFilterChange={handleFilterChange}
              onReset={handleResetFilters}
              pipelines={allPipelines}
              selectedPipelineId={selectedPipelineId}
              setSelectedPipelineId={setSelectedPipelineId}
              showPipelines={showPipelines}
              toggleShowPipelines={() => setShowPipelines(!showPipelines)}
              defectsCount={uniqueDefectsWithCoords?.length || 0}
              onApply={handleApplyFilters}
            />
          </Grid>

        </Grid>
      </Box>
    </Layout>
  );
};

export default MapPage;
