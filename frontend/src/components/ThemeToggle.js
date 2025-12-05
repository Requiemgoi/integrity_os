import React from 'react';
import { IconButton, Tooltip, Box, useTheme as useMuiTheme } from '@mui/material';
import { Brightness4, Brightness7 } from '@mui/icons-material';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';

const ThemeToggle = () => {
  const { mode, toggleTheme } = useTheme();
  const { language } = useLanguage();
  const muiTheme = useMuiTheme();
  const isDark = muiTheme.palette.mode === 'dark';

  const tooltipText = mode === 'light' 
    ? (language === 'kz' ? 'Қараңғы тақырып' : 'Темная тема')
    : (language === 'kz' ? 'Жарық тақырып' : 'Светлая тема');

  return (
    <Tooltip title={tooltipText} arrow>
      <IconButton
        color="inherit"
        onClick={toggleTheme}
        sx={{
          borderRadius: 2,
          width: 40,
          height: 40,
          transition: 'all 0.3s ease',
          bgcolor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.08)',
          '&:hover': {
            bgcolor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.15)',
            transform: 'scale(1.05)'
          },
          '&:active': {
            transform: 'scale(0.95)'
          }
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 0.3s ease',
            transform: mode === 'dark' ? 'rotate(180deg)' : 'rotate(0deg)'
          }}
        >
          {mode === 'light' ? (
            <Brightness4 sx={{ fontSize: 22 }} />
          ) : (
            <Brightness7 sx={{ fontSize: 22, color: '#ffd700' }} />
          )}
        </Box>
      </IconButton>
    </Tooltip>
  );
};

export default ThemeToggle;

