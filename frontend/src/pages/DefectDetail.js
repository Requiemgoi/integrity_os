import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Chip,
  Button,
  CircularProgress,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemText,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Psychology as AIIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import Layout from '../components/Layout';
import { defectsService } from '../services/defectsService';
import { aiService } from '../services/aiService';

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

export default function DefectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [defect, setDefect] = useState(null);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState(null);
  const [error, setError] = useState(null);

  const loadDefect = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await defectsService.getDefect(id);
      setDefect(data);
    } catch (err) {
      setError('Ошибка загрузки данных дефекта');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEvaluateWithAI = async () => {
    if (!defect) return;

    setEvaluating(true);
    try {
      // Подготовка данных для AI оценки
      const defectData = {
        pipeline_id: defect.pipeline_code,
        object_id: defect.object_id?.toString(),
        defect_type: defect.defect_type || defect.method || 'неизвестно',
        description: defect.comment || defect.identification || '',
        depth_mm: defect.depth_mm || defect.depth,
        wall_thickness_mm: defect.wall_thickness,
        length_mm: defect.length_mm,
        width_mm: defect.width_mm,
        metal_loss_percent: defect.max_depth_percent,
        distance_from_weld_mm: defect.weld_distance ? defect.weld_distance * 1000 : null,
        detection_method: defect.method,
        inspection_date: defect.inspection_date,
      };

      const result = await aiService.evaluateDefect(defectData);
      setEvaluation(result);
      toast.success('Оценка дефекта выполнена');
    } catch (err) {
      console.error('Ошибка оценки дефекта:', err);
      toast.error('Ошибка при оценке дефекта: ' + (err.message || 'Неизвестная ошибка'));
    } finally {
      setEvaluating(false);
    }
  };

  useEffect(() => {
    loadDefect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    // Auto-evaluate defect with AI when it loads
    if (defect && !evaluation) {
      handleEvaluateWithAI();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defect]);

  if (loading) {
    return (
      <Layout>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  if (error || !defect) {
    return (
      <Layout>
        <Alert severity="error">{error || 'Дефект не найден'}</Alert>
        <Button startIcon={<BackIcon />} onClick={() => navigate('/defects')} sx={{ mt: 2 }}>
          Назад к списку
        </Button>
      </Layout>
    );
  }

  return (
    <Layout>
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button startIcon={<BackIcon />} onClick={() => navigate('/defects')}>
              Назад
            </Button>
            <Typography variant="h4">Дефект {defect.defect_code}</Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AIIcon />}
            onClick={handleEvaluateWithAI}
            disabled={evaluating}
          >
            {evaluating ? 'Оценка...' : 'Переоценить через AI'}
          </Button>
        </Box>

        <Grid container spacing={3}>
          {/* Левая колонка - Информация о дефекте */}
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Основная информация
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Код дефекта
                  </Typography>
                  <Typography variant="body1">{defect.defect_code}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Трубопровод
                  </Typography>
                  <Typography variant="body1">{defect.pipeline_code || '-'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Объект
                  </Typography>
                  <Typography variant="body1">{defect.object_code || defect.object_name || '-'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Критичность
                  </Typography>
                  <Chip
                    label={severityLabels[defect.severity] || defect.severity}
                    sx={{
                      bgcolor: severityColors[defect.severity] || '#gray',
                      color: 'white',
                    }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Тип дефекта
                  </Typography>
                  <Typography variant="body1">{defect.defect_type || defect.method || '-'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Идентификация
                  </Typography>
                  <Typography variant="body1">{defect.identification || '-'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Дата обследования
                  </Typography>
                  <Typography variant="body1">
                    {defect.inspection_date
                      ? new Date(defect.inspection_date).toLocaleDateString('ru-RU')
                      : '-'}
                  </Typography>
                </Grid>
              </Grid>

              {defect.comment && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="body2" color="text.secondary">
                    Комментарий
                  </Typography>
                  <Typography variant="body1">{defect.comment}</Typography>
                </>
              )}
            </Paper>

            {/* Параметры дефекта */}
            <Paper sx={{ p: 3, mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                Параметры дефекта
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={6} md={4}>
                  <Typography variant="body2" color="text.secondary">
                    Глубина, мм
                  </Typography>
                  <Typography variant="body1">{defect.depth_mm || defect.depth || '-'}</Typography>
                </Grid>
                <Grid item xs={6} md={4}>
                  <Typography variant="body2" color="text.secondary">
                    Макс. глубина, %
                  </Typography>
                  <Typography variant="body1">
                    {defect.max_depth_percent ? `${defect.max_depth_percent.toFixed(1)}%` : '-'}
                  </Typography>
                </Grid>
                <Grid item xs={6} md={4}>
                  <Typography variant="body2" color="text.secondary">
                    Длина, мм
                  </Typography>
                  <Typography variant="body1">{defect.length_mm || '-'}</Typography>
                </Grid>
                <Grid item xs={6} md={4}>
                  <Typography variant="body2" color="text.secondary">
                    Ширина, мм
                  </Typography>
                  <Typography variant="body1">{defect.width_mm || '-'}</Typography>
                </Grid>
                <Grid item xs={6} md={4}>
                  <Typography variant="body2" color="text.secondary">
                    Толщина стенки, мм
                  </Typography>
                  <Typography variant="body1">{defect.wall_thickness || '-'}</Typography>
                </Grid>
                <Grid item xs={6} md={4}>
                  <Typography variant="body2" color="text.secondary">
                    Остаточная толщина, мм
                  </Typography>
                  <Typography variant="body1">{defect.remaining_wall || '-'}</Typography>
                </Grid>
                <Grid item xs={6} md={4}>
                  <Typography variant="body2" color="text.secondary">
                    ERF B31G
                  </Typography>
                  <Typography variant="body1">{defect.erf_b31g || '-'}</Typography>
                </Grid>
                <Grid item xs={6} md={4}>
                  <Typography variant="body2" color="text.secondary">
                    ERF DNV
                  </Typography>
                  <Typography variant="body1">{defect.erf_dnv || '-'}</Typography>
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* Правая колонка - AI Анализ */}
          <Grid item xs={12} md={4}>
            {evaluation && (
              <Paper sx={{ p: 3, mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <AIIcon color="primary" />
                  <Typography variant="h6">AI Оценка</Typography>
                  {evaluation.used_ai && (
                    <Chip label="Gemini" size="small" color="primary" />
                  )}
                </Box>
                <Divider sx={{ mb: 2 }} />

                {/* Rule-based оценка */}
                <Accordion defaultExpanded>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="subtitle1">
                      Rule-based оценка
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Уровень риска
                      </Typography>
                      <Chip
                        label={severityLabels[evaluation.rule_based.risk_level] || evaluation.rule_based.risk_level}
                        sx={{
                          bgcolor: severityColors[evaluation.rule_based.risk_level] || '#gray',
                          color: 'white',
                          mt: 0.5,
                        }}
                      />
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Оценка риска
                      </Typography>
                      <Typography variant="h6">{evaluation.rule_based.risk_score.toFixed(1)} / 100</Typography>
                    </Box>
                    {evaluation.rule_based.factors && evaluation.rule_based.factors.length > 0 && (
                      <Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          Факторы риска:
                        </Typography>
                        <List dense>
                          {evaluation.rule_based.factors.map((factor, idx) => (
                            <ListItem key={idx} sx={{ py: 0.5 }}>
                              <ListItemText
                                primary={factor}
                                primaryTypographyProps={{ variant: 'body2' }}
                              />
                            </ListItem>
                          ))}
                        </List>
                      </Box>
                    )}
                  </AccordionDetails>
                </Accordion>

                {/* ML классификация */}
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="subtitle1">
                      ML Классификация
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Метка
                      </Typography>
                      <Chip
                        label={evaluation.ml.label}
                        sx={{ mt: 0.5 }}
                      />
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Вероятность
                      </Typography>
                      <Typography variant="h6">
                        {(evaluation.ml.probability * 100).toFixed(1)}%
                      </Typography>
                    </Box>
                  </AccordionDetails>
                </Accordion>

                {/* AI оценка (Gemini) */}
                {evaluation.ai && (
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle1">
                        AI Анализ (Gemini)
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      {evaluation.ai.summary && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                            Краткое описание
                          </Typography>
                          <Typography variant="body1">{evaluation.ai.summary}</Typography>
                        </Box>
                      )}
                      {evaluation.ai.recommended_action && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                            Рекомендуемое действие
                          </Typography>
                          <Typography variant="body1">{evaluation.ai.recommended_action}</Typography>
                        </Box>
                      )}
                      {evaluation.ai.explanation && (
                        <Box>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                            Объяснение
                          </Typography>
                          <Typography variant="body1">{evaluation.ai.explanation}</Typography>
                        </Box>
                      )}
                    </AccordionDetails>
                  </Accordion>
                )}

                              </Paper>
            )}

            {!evaluation && (
              <Paper sx={{ p: 3 }}>
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  {evaluating ? (
                    <>
                      <CircularProgress sx={{ mb: 2 }} />
                      <Typography variant="body1" color="text.secondary">
                        Загрузка AI анализа...
                      </Typography>
                    </>
                  ) : (
                    <>
                      <AIIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                      <Typography variant="body1" color="text.secondary" gutterBottom>
                        Нажмите кнопку "Переоценить через AI" для обновления оценки дефекта
                      </Typography>
                    </>
                  )}
                </Box>
              </Paper>
            )}
          </Grid>
        </Grid>
      </Box>
    </Layout>
  );
}

