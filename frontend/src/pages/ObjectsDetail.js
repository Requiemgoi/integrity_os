import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Chip,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
} from '@mui/material';
import { ArrowBack as BackIcon } from '@mui/icons-material';
import Layout from '../components/Layout';
import { objectsService } from '../services/objectsService';

const severityColors = {
  low: '#4caf50',
  medium: '#ff9800',
  high: '#f44336',
  critical: '#9c27b0',
};

export default function ObjectsDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [object, setObject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadObject();
  }, [id]);

  const loadObject = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await objectsService.getObject(id);
      setObject(data);
    } catch (err) {
      setError('Ошибка загрузки данных объекта');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  if (error || !object) {
    return (
      <Layout>
        <Alert severity="error">{error || 'Объект не найден'}</Alert>
        <Button startIcon={<BackIcon />} onClick={() => navigate('/objects')} sx={{ mt: 2 }}>
          Назад к списку
        </Button>
      </Layout>
    );
  }

  return (
    <Layout>
      <Box>
        <Button startIcon={<BackIcon />} onClick={() => navigate('/objects')} sx={{ mb: 2 }}>
          Назад к списку
        </Button>

        <Typography variant="h4" gutterBottom>
          Объект: {object.object_code}
        </Typography>

        <Grid container spacing={3} sx={{ mt: 1 }}>
          {/* Main Info */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Основная информация
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Код объекта
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {object.object_code}
                </Typography>

                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  Название
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {object.name || '-'}
                </Typography>

                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  Тип объекта
                </Typography>
                {object.object_type && (
                  <Chip label={object.object_type} sx={{ mt: 1 }} />
                )}

                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  Трубопровод
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {object.pipeline_code || '-'}
                </Typography>

                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  Координаты
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {object.latitude && object.longitude
                    ? `${object.latitude.toFixed(6)}, ${object.longitude.toFixed(6)}`
                    : '-'}
                </Typography>

                {object.param1 && (
                  <>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                      Параметр 1
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      {object.param1}
                    </Typography>
                  </>
                )}

                {object.param2 && (
                  <>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                      Параметр 2
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      {object.param2}
                    </Typography>
                  </>
                )}
              </Box>
            </Paper>
          </Grid>

          {/* AI Criticality (placeholder) */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                AI-критичность
              </Typography>
              <Alert severity="info" sx={{ mt: 2 }}>
                Функция AI-анализа будет добавлена в будущих версиях
              </Alert>
            </Paper>
          </Grid>

          {/* Defects History */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                История диагностик ({object.defects?.length || 0})
              </Typography>
              {object.defects && object.defects.length > 0 ? (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Код дефекта</TableCell>
                        <TableCell>Метод</TableCell>
                        <TableCell>Критичность</TableCell>
                        <TableCell>Глубина</TableCell>
                        <TableCell>Дата обследования</TableCell>
                        <TableCell>Действия</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {object.defects.map((defect) => (
                        <TableRow key={defect.id} hover>
                          <TableCell>{defect.defect_code}</TableCell>
                          <TableCell>{defect.method}</TableCell>
                          <TableCell>
                            <Chip
                              label={defect.severity}
                              size="small"
                              sx={{
                                bgcolor: severityColors[defect.severity] || '#gray',
                                color: 'white',
                              }}
                            />
                          </TableCell>
                          <TableCell>{defect.depth || '-'}</TableCell>
                          <TableCell>
                            {defect.inspection_date
                              ? new Date(defect.inspection_date).toLocaleDateString('ru-RU')
                              : '-'}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="small"
                              onClick={() => navigate(`/defects?defect=${defect.id}`)}
                            >
                              Подробнее
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Alert severity="info" sx={{ mt: 2 }}>
                  Нет данных о диагностиках
                </Alert>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Layout>
  );
}
