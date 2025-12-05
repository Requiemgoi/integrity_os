import React from 'react';
import {
  Box,
  Container,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Paper,
  Grid
} from '@mui/material';
import {
  ExitToApp,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import ThemeLanguageSwitcher from '../components/ThemeLanguageSwitcher';

const Dashboard = () => {
  const { logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar 
        position="static"
        sx={{
          borderRadius: 0,
          boxShadow: 2,
          bgcolor: '#1976d2'
        }}
      >
        <Toolbar sx={{ px: { xs: 2, sm: 3 } }}>
          <Typography 
            variant="h6" 
            component="div" 
            sx={{ 
              flexGrow: 1,
              fontWeight: 600,
              fontSize: '1.25rem'
            }}
          >
            IntegrityOS MVP
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <ThemeLanguageSwitcher />
            <IconButton 
              color="inherit" 
              onClick={handleLogout} 
              title="Выход"
            >
              <ExitToApp />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="h4" gutterBottom>
                Добро пожаловать в IntegrityOS
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Здесь будет карта трубопроводов, список объектов и дашборд.
                Используйте меню для навигации (когда создадите его).
              </Typography>
            </Paper>
          </Grid>
          
          {/* Место для ваших новых компонентов */}
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3, height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(0,0,0,0.02)' }}>
              <Typography variant="h6" color="text.disabled">
                [Место для Карты / Map Component]
              </Typography>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3, height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(0,0,0,0.02)' }}>
               <Typography variant="h6" color="text.disabled">
                [Список объектов / Objects List]
              </Typography>
            </Paper>
          </Grid>

        </Grid>
      </Container>
    </Box>
  );
};

export default Dashboard;
