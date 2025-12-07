import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Container,
  Breadcrumbs,
  Link as MuiLink,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  UploadFile as ImportIcon,
  Assessment as ReportsIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  Search as SearchIcon,
  BugReport as DefectsIcon,
} from '@mui/icons-material';
import HomeIcon from '@mui/icons-material/Home';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import {
  IconButton,
  Select,
  MenuItem,
  FormControl,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  InputAdornment,
  DialogActions,
  Button,
  Tooltip,
} from '@mui/material';
import { Brightness4, Brightness7 } from '@mui/icons-material';

const drawerWidth = 280;

const menuItems = [
  { text: 'Панель управления', icon: <DashboardIcon />, path: '/dashboard' },
  { text: 'Дефекты', icon: <DefectsIcon />, path: '/defects' },
  { text: 'Новый импорт', icon: <ImportIcon />, path: '/import' },
  { text: 'Отчеты', icon: <ReportsIcon />, path: '/reports' },
  { text: 'Настройки', icon: <SettingsIcon />, path: '/settings' },
];

export default function Layout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const { mode, toggleTheme } = useTheme();
  const { language, setLanguage } = useLanguage();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSearchClick = () => {
    setSearchOpen(true);
  };

  const handleSearchClose = () => {
    setSearchOpen(false);
    setSearchQuery('');
  };

  const handleSearch = () => {
    // TODO: Implement search functionality
    console.log('Searching for:', searchQuery);
    handleSearchClose();
  };

  const handleLanguageChange = (lang) => {
    setLanguage(lang);
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{ 
          zIndex: (theme) => theme.zIndex.drawer + 1,
          backgroundImage:
            mode === 'light'
              ? 'linear-gradient(135deg, #4A90E2, #9B59B6)'
              : 'linear-gradient(135deg, #1a2332, #2d3e5f, #1e2b42)',
          backgroundColor: 'transparent',
          color: mode === 'light' ? '#f9fafb' : '#f9fafb',
          boxShadow: '0 18px 40px rgba(0, 0, 0, 0.6)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <Toolbar>
          <Typography 
            variant="h6" 
            noWrap 
            component="div" 
            sx={{ 
              flexGrow: 1, 
              fontWeight: 600,
              color: mode === 'light' ? 'white' : '#e6edf3',
            }}
          >
            Система мониторинга трубопроводов
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* Search Button */}
            <Tooltip title="Поиск">
              <IconButton 
                onClick={handleSearchClick}
                sx={{
                  color: mode === 'light' ? 'white' : '#e6edf3',
                  '&:hover': {
                    bgcolor: mode === 'light' 
                      ? 'rgba(255, 255, 255, 0.1)' 
                      : 'rgba(255, 255, 255, 0.05)',
                  },
                }}
              >
                <SearchIcon />
              </IconButton>
            </Tooltip>

            {/* Theme Toggle */}
            <Tooltip title={mode === 'light' ? 'Темная тема' : 'Светлая тема'}>
              <IconButton 
                onClick={toggleTheme}
                sx={{
                  color: mode === 'light' ? 'white' : '#e6edf3',
                  '&:hover': {
                    bgcolor: mode === 'light' 
                      ? 'rgba(255, 255, 255, 0.1)' 
                      : 'rgba(255, 255, 255, 0.05)',
                  },
                }}
              >
                {mode === 'light' ? <Brightness4 /> : <Brightness7 />}
              </IconButton>
            </Tooltip>

            {/* Language Selector */}
            <FormControl 
              size="small" 
              sx={{ 
                minWidth: 100, 
                bgcolor: mode === 'light' 
                  ? 'rgba(255,255,255,0.1)' 
                  : 'rgba(255, 255, 255, 0.05)',
                borderRadius: 1,
              }}
            >
              <Select
                value={language === 'kz' ? 'kz' : language === 'en' ? 'en' : 'ru'}
                onChange={(e) => handleLanguageChange(e.target.value)}
                sx={{ 
                  color: mode === 'light' ? 'white' : '#e6edf3',
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'transparent' },
                  '& .MuiSvgIcon-root': { 
                    color: mode === 'light' ? 'white' : '#e6edf3',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': { 
                    borderColor: mode === 'light' 
                      ? 'rgba(255,255,255,0.3)' 
                      : 'rgba(255, 255, 255, 0.1)',
                  },
                }}
              >
                <MenuItem value="ru">RU</MenuItem>
                <MenuItem value="kz">KZ</MenuItem>
                <MenuItem value="en">EN</MenuItem>
              </Select>
            </FormControl>

            {/* Logout Button */}
            <Tooltip title="Выход">
              <IconButton 
                onClick={handleLogout}
                sx={{
                  color: mode === 'light' ? 'white' : '#e6edf3',
                  '&:hover': {
                    bgcolor: mode === 'light' 
                      ? 'rgba(255, 255, 255, 0.1)' 
                      : 'rgba(255, 255, 255, 0.05)',
                  },
                }}
              >
                <LogoutIcon />
              </IconButton>
            </Tooltip>
          </Box>

          {/* Search Dialog */}
          <Dialog open={searchOpen} onClose={handleSearchClose} maxWidth="sm" fullWidth>
            <DialogTitle>Поиск</DialogTitle>
            <DialogContent>
              <TextField
                autoFocus
                margin="dense"
                label="Поиск по объектам, дефектам..."
                fullWidth
                variant="outlined"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch();
                  }
                }}
                InputProps={
                  {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }
                }
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={handleSearchClose}>Отмена</Button>
              <Button onClick={handleSearch} variant="contained">
                Найти
              </Button>
            </DialogActions>
          </Dialog>
        </Toolbar>
      </AppBar>
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            bgcolor: mode === 'light' ? '#111827' : '#050816',
            backgroundImage:
              mode === 'light'
                ? 'linear-gradient(180deg, #1f2937, #111827)'
                : 'radial-gradient(circle at 0% 0%, #2d3e5f, transparent 55%), linear-gradient(180deg, #050816, #020617)',
            color: mode === 'light' ? '#f9fafb' : '#e5e7eb',
            borderRight: '1px solid rgba(255, 255, 255, 0.08)',
          },
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: 'auto' }}>
          <List>
            {menuItems.map((item) => (
              <ListItem key={item.path} disablePadding>
                <ListItemButton
                  selected={location.pathname === item.path}
                  onClick={() => navigate(item.path)}
                  sx={{
                    '&.Mui-selected': {
                      bgcolor: mode === 'light' 
                        ? 'rgba(255, 255, 255, 0.15)' 
                        : 'rgba(255, 255, 255, 0.08)',
                      '&:hover': {
                        bgcolor: mode === 'light' 
                          ? 'rgba(255, 255, 255, 0.2)' 
                          : 'rgba(255, 255, 255, 0.12)',
                      },
                      borderLeft: '3px solid',
                      borderLeftColor: mode === 'light' ? 'white' : '#58a6ff',
                    },
                    '&:hover': {
                      bgcolor: mode === 'light' 
                        ? 'rgba(255, 255, 255, 0.1)' 
                        : 'rgba(255, 255, 255, 0.05)',
                    },
                    color: mode === 'light' ? 'white' : '#e6edf3',
                    pl: location.pathname === item.path ? '13px' : '16px',
                  }}
                >
                  <ListItemIcon 
                    sx={{ 
                      color: mode === 'light' 
                        ? 'rgba(255, 255, 255, 0.7)' 
                        : 'rgba(230, 237, 243, 0.7)',
                      minWidth: 40,
                      '& .MuiSvgIcon-root': {
                        color: location.pathname === item.path 
                          ? (mode === 'light' ? 'white' : '#58a6ff')
                          : (mode === 'light' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(230, 237, 243, 0.7)'),
                      }
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText 
                    primary={item.text}
                    primaryTypographyProps={{
                      sx: {
                        color: location.pathname === item.path 
                          ? (mode === 'light' ? 'white' : '#58a6ff')
                          : (mode === 'light' ? 'rgba(255, 255, 255, 0.9)' : '#e6edf3'),
                        fontWeight: location.pathname === item.path ? 600 : 400,
                      }
                    }}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          bgcolor: 'background.default',
          p: 3,
          minHeight: '100vh',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Toolbar />

        {/* Subtle decorative background glow */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 0,
            background:
              'radial-gradient(circle at 0% 0%, rgba(74, 144, 226, 0.22), transparent 55%), radial-gradient(circle at 100% 0%, rgba(155, 89, 182, 0.25), transparent 55%)',
          }}
        />

        {/* Foreground content */}
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          {/* Breadcrumbs / вкладки */}
          <Box sx={{ mb: 2 }}>
            <Breadcrumbs aria-label="breadcrumb" sx={{ color: 'text.secondary', fontSize: 14 }}>
              <MuiLink
                component="button"
                onClick={() => navigate('/dashboard')}
                sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}
              >
                <HomeIcon fontSize="small" sx={{ mr: 0.5 }} />
                <Typography sx={{ color: 'text.secondary' }}>Главная</Typography>
              </MuiLink>
              <Typography sx={{ color: 'text.primary', fontWeight: 600 }}>
                {menuItems.find((m) => m.path === location.pathname)?.text ||
                  // fallback: derive from path
                  (location.pathname === '/' ? 'Панель управления' : location.pathname.replace('/', ''))}
              </Typography>
            </Breadcrumbs>
          </Box>
          <Container maxWidth="xl">{children}</Container>
        </Box>
      </Box>
    </Box>
  );
}
