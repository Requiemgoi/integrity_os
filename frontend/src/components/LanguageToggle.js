import React from 'react';
import { IconButton, Tooltip, Menu, MenuItem, Box, Typography, Chip, useTheme } from '@mui/material';
import { Language, Check } from '@mui/icons-material';
import { useLanguage } from '../contexts/LanguageContext';

const LanguageToggle = () => {
  const { language, toggleLanguage } = useLanguage();
  const muiTheme = useTheme();
  const isDark = muiTheme.palette.mode === 'dark';
  const [anchorEl, setAnchorEl] = React.useState(null);

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
    <>
      <Tooltip title="Язык / Тіл" arrow>
        <IconButton
          color="inherit"
          onClick={handleClick}
          sx={{
            borderRadius: 2,
            width: 40,
            height: 40,
            transition: 'all 0.3s ease',
            bgcolor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.08)',
            position: 'relative',
            '&:hover': {
              bgcolor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.15)',
              transform: 'scale(1.05)'
            },
            '&:active': {
              transform: 'scale(0.95)'
            }
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Language sx={{ fontSize: 20 }} />
            <Typography 
              variant="caption" 
              sx={{ 
                fontSize: '0.7rem',
                fontWeight: 600,
                lineHeight: 1,
                mt: 0.5
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
            minWidth: 180,
            overflow: 'hidden',
            border: '1px solid',
            borderColor: 'divider'
          }
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {languages.map((lang) => (
          <MenuItem
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            selected={language === lang.code}
            sx={{
              borderRadius: 0,
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
                }
              }
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Typography variant="h6" sx={{ fontSize: '1.2rem' }}>
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
    </>
  );
};

export default LanguageToggle;

