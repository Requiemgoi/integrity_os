import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
} from '@mui/material';
import {
  Close,
  ShowChart,
  TrendingUp,
  Warning,
  Info,
  Settings,
  Notifications,
  Refresh,
  Download,
} from '@mui/icons-material';
import { useLanguage } from '../contexts/LanguageContext';

const HelpDialog = ({ open, onClose }) => {
  const { t } = useLanguage();
  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {t('helpTitle')}
          </Typography>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#3C5BA9' }}>
            Обзор дашборда
          </Typography>
          <Typography variant="body2" sx={{ mb: 2, color: '#424242', lineHeight: 1.7 }}>
            Дашборд IntegrityOS предоставляет комплексный мониторинг сенсоров в реальном времени, 
            анализ данных с использованием машинного обучения и прогнозирование трендов.
          </Typography>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#3C5BA9' }}>
            Основные компоненты
          </Typography>
          
          <List>
            <ListItem>
              <ListItemIcon>
                <ShowChart color="primary" />
              </ListItemIcon>
              <ListItemText
                primary="Карточки метрик"
                secondary="Отображают количество сенсоров, точек данных за 24 часа, активных оповещений и тип сенсора"
              />
            </ListItem>

            <ListItem>
              <ListItemIcon>
                <TrendingUp color="primary" />
              </ListItemIcon>
              <ListItemText
                primary="Графики в реальном времени"
                secondary="Интерактивные графики показывают данные сенсоров с возможностью развернуть/свернуть через аккордеон"
              />
            </ListItem>

            <ListItem>
              <ListItemIcon>
                <TrendingUp color="error" />
              </ListItemIcon>
              <ListItemText
                primary="Прогноз Prophet"
                secondary="Прогнозирование значений на 24 часа вперед с использованием алгоритма Prophet"
              />
            </ListItem>

            <ListItem>
              <ListItemIcon>
                <Warning color="warning" />
              </ListItemIcon>
              <ListItemText
                primary="Обнаружение аномалий"
                secondary="Автоматическое обнаружение аномалий с помощью автоэнкодера. Можно обучить модель для каждого параметра"
              />
            </ListItem>

            <ListItem>
              <ListItemIcon>
                <Info color="info" />
              </ListItemIcon>
              <ListItemText
                primary="Анализ и рекомендации"
                secondary="ИИ-генерируемые инсайты и рекомендации на основе анализа данных"
              />
            </ListItem>

            <ListItem>
              <ListItemIcon>
                <Notifications color="error" />
              </ListItemIcon>
              <ListItemText
                primary="Панель оповещений"
                secondary="Отображение всех активных оповещений с фильтрацией по уровню важности (Критическое, Высокое, Среднее)"
              />
            </ListItem>
          </List>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#3C5BA9' }}>
            Функции управления
          </Typography>
          
          <List>
            <ListItem>
              <ListItemIcon>
                <Refresh color="primary" />
              </ListItemIcon>
              <ListItemText
                primary="Обновление данных"
                secondary="Кнопка обновления в правом верхнем углу для ручного обновления данных дашборда"
              />
            </ListItem>

            <ListItem>
              <ListItemIcon>
                <Download color="primary" />
              </ListItemIcon>
              <ListItemText
                primary="Экспорт данных"
                secondary="Экспорт данных в форматах CSV и PDF через меню 'Экспорт'"
              />
            </ListItem>

            <ListItem>
              <ListItemIcon>
                <Settings color="primary" />
              </ListItemIcon>
              <ListItemText
                primary="Обучение автоэнкодера"
                secondary="Для каждого параметра можно обучить модель автоэнкодера для улучшения обнаружения аномалий"
              />
            </ListItem>
          </List>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#3C5BA9' }}>
            Типы сенсоров
          </Typography>
          
          <List>
            <ListItem>
              <ListItemText
                primary="Сырье"
                secondary="Мониторинг параметров сырья: температура, влажность, качество"
              />
            </ListItem>

            <ListItem>
              <ListItemText
                primary="Производственная линия"
                secondary="Мониторинг производственных процессов: скорость, давление, температура"
              />
            </ListItem>

            <ListItem>
              <ListItemText
                primary="Склад"
                secondary="Мониторинг складских условий: температура, влажность, уровень запасов"
              />
            </ListItem>
          </List>
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} variant="contained" color="primary">
          {t('close')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default HelpDialog;

