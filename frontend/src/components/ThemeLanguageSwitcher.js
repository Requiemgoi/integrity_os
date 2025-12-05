import React, { useState } from 'react';
import { 
  Box, 
  IconButton, 
  Tooltip, 
  Menu, 
  MenuItem, 
  Typography, 
  Switch, 
  FormControlLabel,
  Divider
} from '@mui/material';
import { useTheme as useMuiTheme } from '@mui/material/styles';
import { Brightness4, Brightness7, Language, Check } from '@mui/icons-material';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';

const ThemeLanguageSwitcher = () => {
  const { mode, toggleTheme } = useTheme();
  const { language, toggleLanguage } = useLanguage();
  const muiTheme = useMuiTheme();
  const isDark = muiTheme.palette.mode === 'dark';
  const [anchorEl, setAnchorEl] = useState(null);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLanguageChange = (lang) => {
    if (language !== lang) {
      toggleLanguage();
    }
    handleClose();
  };

  const languages = [
    { code: 'ru', name: 'Русский', flag: '🇷🇺' },
    { code: 'kz', name: 'Қазақша', flag: '🇰🇿' }
  ];

  const currentLang = languages.find(l => l.code === language);

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        bgcolor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.08)',
        borderRadius: 2,
        px: 1.5,
        py: 0.5,
        border: '1px solid',
        borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.1)',
        transition: 'all 0.3s ease',
        '&:hover': {
          bgcolor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.12)',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.15)'
        }
      }}
    >
      {/* Theme Toggle Switch */}
      <Tooltip title={mode === 'light' ? 'Темная тема' : 'Светлая тема'} arrow>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            pr: 1,
            borderRight: '1px solid',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.1)'
          }}
        >
          <Brightness4 
            sx={{ 
              fontSize: 18, 
              color: mode === 'light' ? 'rgba(255, 255, 255, 0.7)' : '#ffd700',
              transition: 'all 0.3s ease',
              transform: mode === 'dark' ? 'rotate(180deg)' : 'rotate(0deg)'
            }} 
          />
          <Switch
            checked={mode === 'dark'}
            onChange={toggleTheme}
            size="small"
            sx={{
              '& .MuiSwitch-switchBase': {
                '&.Mui-checked': {
                  color: '#ffd700',
                  '& + .MuiSwitch-track': {
                    backgroundColor: '#ffd700',
                    opacity: 0.5,
                  },
                },
              },
              '& .MuiSwitch-thumb': {
                width: 16,
                height: 16,
              },
              '& .MuiSwitch-track': {
                height: 10,
                borderRadius: 5,
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.3)',
              },
            }}
          />
          <Brightness7 
            sx={{ 
              fontSize: 18, 
              color: mode === 'dark' ? '#ffd700' : 'rgba(255, 255, 255, 0.7)',
              transition: 'all 0.3s ease'
            }} 
          />
        </Box>
      </Tooltip>

      {/* Language Selector */}
      <Tooltip title="Язык / Тіл" arrow>
        <IconButton
          color="inherit"
          onClick={handleClick}
          sx={{
            borderRadius: 1.5,
            width: 36,
            height: 36,
            transition: 'all 0.3s ease',
            '&:hover': {
              bgcolor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.1)',
              transform: 'scale(1.05)'
            },
            '&:active': {
              transform: 'scale(0.95)'
            }
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Language sx={{ fontSize: 18 }} />
            <Typography 
              variant="caption" 
              sx={{ 
                fontSize: '0.85rem',
                fontWeight: 600,
                lineHeight: 1
              }}
            >
              {currentLang?.flag}
            </Typography>
          </Box>
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        PaperProps={{
          sx: {
            borderRadius: 2,
            mt: 1.5,
            boxShadow: 6,
            minWidth: 200,
            overflow: 'hidden',
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper'
          }
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <Box sx={{ px: 1.5, py: 1 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.75rem', fontWeight: 600 }}>
            Выберите язык / Тілді таңдаңыз
          </Typography>
        </Box>
        <Divider />
        {languages.map((lang) => (
          <MenuItem
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            selected={language === lang.code}
            sx={{
              py: 1.5,
              px: 2,
              '&:hover': {
                bgcolor: 'action.hover'
              },
              '&.Mui-selected': {
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                '&:hover': {
                  bgcolor: 'primary.dark'
                },
                '& .MuiTypography-root': {
                  color: 'primary.contrastText'
                }
              }
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Typography variant="h6" sx={{ fontSize: '1.3rem' }}>
                  {lang.flag}
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    fontWeight: language === lang.code ? 600 : 400,
                    fontSize: '0.95rem'
                  }}
                >
                  {lang.name}
                </Typography>
              </Box>
              {language === lang.code && (
                <Check sx={{ fontSize: 18, ml: 1 }} />
              )}
            </Box>
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
};

export default ThemeLanguageSwitcher;

