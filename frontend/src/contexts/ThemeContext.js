import React, { createContext, useContext, useState, useEffect } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProviderWrapper = ({ children }) => {
  const [mode, setMode] = useState(() => {
    const savedMode = localStorage.getItem('themeMode');
    return savedMode || 'light';
  });

  useEffect(() => {
    localStorage.setItem('themeMode', mode);
  }, [mode]);

  const toggleTheme = () => {
    setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
  };

  const theme = createTheme({
    palette: {
      mode,
      ...(mode === 'light'
        ? {
            primary: {
              main: '#4F46E5',
              light: '#6366F1',
              dark: '#3730A3',
            },
            secondary: {
              main: '#06B6D4',
              light: '#22D3EE',
              dark: '#0E7490',
            },
            success: {
              main: '#22C55E',
              light: '#4ADE80',
            },
            warning: {
              main: '#F97316',
            },
            error: {
              main: '#EF4444',
            },
            info: {
              main: '#0EA5E9',
            },
            background: {
              default: '#F3F4F6',
              paper: '#FFFFFF',
            },
            text: {
              primary: '#0F172A',
              secondary: 'rgba(15, 23, 42, 0.7)',
            },
            divider: 'rgba(15, 23, 42, 0.12)',
          }
        : {
            primary: {
              main: '#6366F1',
              light: '#818CF8',
              dark: '#4F46E5',
            },
            secondary: {
              main: '#06B6D4',
              light: '#22D3EE',
              dark: '#0E7490',
            },
            success: {
              main: '#22C55E',
              light: '#4ADE80',
            },
            warning: {
              main: '#F97316',
            },
            error: {
              main: '#F97373',
            },
            info: {
              main: '#0EA5E9',
            },
            background: {
              default: '#020617',
              paper: 'rgba(15, 23, 42, 0.96)',
            },
            text: {
              primary: '#F5F7FA',
              secondary: 'rgba(229, 231, 235, 0.72)',
            },
            divider: 'rgba(148, 163, 184, 0.35)',
          }),
    },
    typography: {
      fontFamily:
        "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
      h1: {
        fontWeight: 800,
        letterSpacing: '0.04em',
        fontSize: '2.4rem',
        lineHeight: 1.2,
      },
      h2: {
        fontWeight: 800,
        letterSpacing: '0.04em',
        fontSize: '2rem',
        lineHeight: 1.2,
      },
      h3: {
        fontWeight: 800,
        letterSpacing: '0.04em',
        fontSize: '1.6rem',
        lineHeight: 1.2,
      },
      h4: {
        fontWeight: 700,
        letterSpacing: '0.04em',
        fontSize: '1.4rem',
        lineHeight: 1.2,
      },
      h5: {
        fontWeight: 700,
        letterSpacing: '0.04em',
        fontSize: '1.2rem',
        lineHeight: 1.2,
      },
      h6: {
        fontWeight: 700,
        letterSpacing: '0.04em',
        fontSize: '1rem',
        lineHeight: 1.2,
      },
      button: {
        fontWeight: 700,
        letterSpacing: '0.08em',
        fontSize: '0.9rem',
      },
    },
    shape: {
      borderRadius: 16,
    },
    components: {
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: 20,
            border: mode === 'light'
              ? '1px solid rgba(15, 23, 42, 0.06)'
              : '1px solid rgba(255, 255, 255, 0.08)',
            backgroundImage:
              mode === 'light'
                ? 'linear-gradient(135deg, rgba(255,255,255,0.97), rgba(243,246,255,0.97))'
                : 'linear-gradient(135deg, rgba(26,35,50,0.96), rgba(45,62,95,0.96))',
            boxShadow:
              mode === 'light'
                ? '0 18px 45px rgba(15, 23, 42, 0.15)'
                : '0 22px 55px rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(18px)',
            transition:
              'transform 0.3s cubic-bezier(0.22, 0.61, 0.36, 1), box-shadow 0.3s cubic-bezier(0.22, 0.61, 0.36, 1)',
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 20,
            backgroundColor: 'transparent',
            boxShadow:
              mode === 'light'
                ? '0 14px 36px rgba(15, 23, 42, 0.18)'
                : '0 20px 50px rgba(0, 0, 0, 0.9)',
            border: mode === 'light'
              ? '1px solid rgba(15, 23, 42, 0.06)'
              : '1px solid rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(18px)',
            transition:
              'transform 0.3s cubic-bezier(0.22, 0.61, 0.36, 1), box-shadow 0.3s cubic-bezier(0.22, 0.61, 0.36, 1)',
            '&:hover': {
              transform: 'translateY(-6px)',
              boxShadow:
                mode === 'light'
                  ? '0 22px 60px rgba(15, 23, 42, 0.25)'
                  : '0 28px 70px rgba(0, 0, 0, 0.95)',
            },
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 999,
            textTransform: 'none',
            paddingTop: 10,
            paddingBottom: 10,
            paddingLeft: 20,
            paddingRight: 20,
            fontWeight: 700,
            letterSpacing: '0.08em',
            border: '1px solid rgba(255, 255, 255, 0.16)',
            boxShadow:
              mode === 'light'
                ? '0 10px 25px rgba(15, 23, 42, 0.18)'
                : '0 14px 32px rgba(0, 0, 0, 0.85)',
            transition:
              'transform 0.3s cubic-bezier(0.22, 0.61, 0.36, 1), box-shadow 0.3s cubic-bezier(0.22, 0.61, 0.36, 1), background 0.3s cubic-bezier(0.22, 0.61, 0.36, 1)',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow:
                mode === 'light'
                  ? '0 16px 40px rgba(15, 23, 42, 0.28)'
                  : '0 20px 50px rgba(0, 0, 0, 0.95)',
            },
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            boxShadow: 'none',
          },
        },
      },
    },
  });

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeContext.Provider>
  );
};

