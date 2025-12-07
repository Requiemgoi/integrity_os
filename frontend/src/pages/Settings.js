import React from 'react';
import {
  Box,
  Typography,
  Grid,
  TextField,
  FormControlLabel,
  Switch,
  Select,
  MenuItem,
  Divider,
  Button,
  Paper,
} from '@mui/material';
import Layout from '../components/Layout';

export default function SettingsPage() {
  return (
    <Layout>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Typography
          variant="h4"
          gutterBottom
          sx={{
            fontWeight: 600,
            color: '#e5e7eb',
            fontSize: 24,
          }}
        >
          Настройки
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#e5e7eb', mb: 2 }}>
                Профиль пользователя
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField label="Имя пользователя" size="small" fullWidth />
                <TextField label="Email" size="small" fullWidth />
                <Button variant="contained" sx={{ alignSelf: 'flex-start', mt: 1 }}>
                  Сохранить профиль
                </Button>
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#e5e7eb', mb: 2 }}>
                Система
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <FormControlLabel control={<Switch />} label="Звуковые эффекты" />
                <FormControlLabel control={<Switch />} label="Анимации интерфейса" />

                <Divider sx={{ my: 1.5 }} />

                <Typography
                  variant="subtitle2"
                  sx={{
                    fontWeight: 600,
                    color: '#9ca3af',
                    fontSize: 12,
                    textTransform: 'uppercase',
                  }}
                >
                  Тема и язык
                </Typography>

                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Select size="small" defaultValue="dark" sx={{ minWidth: 180 }}>
                    <MenuItem value="dark">Тёмная тема (по умолчанию)</MenuItem>
                    <MenuItem value="light">Светлая тема</MenuItem>
                  </Select>

                  <Select size="small" defaultValue="ru" sx={{ minWidth: 120 }}>
                    <MenuItem value="ru">Русский</MenuItem>
                    <MenuItem value="kz">Казахский</MenuItem>
                    <MenuItem value="en">Английский</MenuItem>
                  </Select>
                </Box>
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#e5e7eb', mb: 2 }}>
                Опасная зона
              </Typography>
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: { xs: 'column', md: 'row' },
                  alignItems: { md: 'center' },
                  justifyContent: 'space-between',
                  gap: 2,
                }}
              >
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#e5e7eb' }}>
                    Сбросить настройки
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#9ca3af' }}>
                    Вернуть систему к настройкам по умолчанию. Данные и учетные записи не будут
                    удалены.
                  </Typography>
                </Box>

                <Button variant="outlined" color="error">
                  Сбросить
                </Button>
              </Box>
            </Paper>
          </Grid>
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 600,
                  color: '#9ca3af',
                  fontSize: 12,
                  textTransform: 'uppercase',
                  mb: 1.5,
                }}
              >
                Предпросмотр интерфейса
              </Typography>
              <Typography variant="body2" sx={{ color: '#9ca3af' }}>
                Здесь будет визуальный предпросмотр активной темы и настроек интерфейса.
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Layout>
  );
}
