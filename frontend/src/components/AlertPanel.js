import React, { useState, useMemo } from 'react';
import {
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  Chip,
  Box,
  IconButton,
  Divider,
  Tabs,
  Tab,
  Badge,
} from '@mui/material';
import { Refresh, Warning, Error, Info, Notifications } from '@mui/icons-material';
import { format } from 'date-fns';
import { useLanguage } from '../contexts/LanguageContext';

const AlertPanel = ({ alerts, onRefresh }) => {
  const { t } = useLanguage();
  const [filterSeverity, setFilterSeverity] = useState('all');

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical':
        return '#d32f2f';
      case 'high':
        return '#f57c00';
      case 'medium':
        return '#fbc02d';
      case 'low':
        return '#6DC5F1';
      default:
        return '#757575';
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical':
      case 'high':
        return <Error sx={{ fontSize: 18 }} />;
      case 'medium':
        return <Warning sx={{ fontSize: 18 }} />;
      case 'low':
        return <Info sx={{ fontSize: 18 }} />;
      default:
        return <Notifications sx={{ fontSize: 18 }} />;
    }
  };

  const translateSeverity = (severity) => {
    const translations = {
      'critical': t('critical'),
      'high': t('high'),
      'medium': t('medium'),
      'low': t('low')
    };
    return translations[severity] || severity;
  };

  const translateAlertType = (type) => {
    const translations = {
      'threshold': 'Пороговое',
      'ml_anomaly': 'ML-аномалия',
      'prediction': 'Прогноз'
    };
    return translations[type] || type;
  };

  const filteredAlerts = useMemo(() => {
    if (filterSeverity === 'all') return alerts;
    return alerts.filter(alert => alert.severity === filterSeverity);
  }, [alerts, filterSeverity]);

  const severityCounts = useMemo(() => {
    const counts = { all: alerts.length, critical: 0, high: 0, medium: 0, low: 0 };
    alerts.forEach(alert => {
      if (counts[alert.severity] !== undefined) {
        counts[alert.severity]++;
      }
    });
    return counts;
  }, [alerts]);

  return (
    <Paper 
      sx={{ 
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 2,
        overflow: 'hidden',
        border: '1px solid',
        borderColor: 'divider',
        boxShadow: 2
      }}
    >
      {/* Header */}
      <Box 
        sx={{ 
          p: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.default'
        }}
      >
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
          <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.1rem' }}>
            Оповещения
          </Typography>
          <IconButton 
            size="small" 
            onClick={onRefresh}
            sx={{ 
              bgcolor: 'background.paper',
              '&:hover': { bgcolor: 'action.hover' }
            }}
          >
            <Refresh fontSize="small" />
          </IconButton>
        </Box>
        
        {/* Filter Tabs */}
        <Tabs 
          value={filterSeverity} 
          onChange={(e, v) => setFilterSeverity(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ 
            minHeight: 36,
            '& .MuiTab-root': { 
              minHeight: 36,
              fontSize: '0.75rem',
              textTransform: 'none',
              fontWeight: 500
            }
          }}
        >
          <Tab 
            label={
              <Badge badgeContent={severityCounts.all} color="primary" max={999}>
                <span>{t('all')}</span>
              </Badge>
            } 
            value="all" 
          />
          <Tab 
            label={
              <Badge badgeContent={severityCounts.critical} color="error" max={999}>
                <span>{t('critical')}</span>
              </Badge>
            } 
            value="critical" 
          />
          <Tab 
            label={
              <Badge badgeContent={severityCounts.high} color="warning" max={999}>
                <span>{t('high')}</span>
              </Badge>
            } 
            value="high" 
          />
          <Tab 
            label={
              <Badge badgeContent={severityCounts.medium} color="info" max={999}>
                <span>{t('medium')}</span>
              </Badge>
            } 
            value="medium" 
          />
        </Tabs>
      </Box>

      {/* Alerts List */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <List sx={{ p: 0 }}>
          {filteredAlerts.length === 0 ? (
            <ListItem>
              <ListItemText 
                primary={t('noActiveAlerts')} 
                secondary={t('allSystemsOk')}
                sx={{ textAlign: 'center', py: 4 }}
              />
            </ListItem>
          ) : (
            filteredAlerts.map((alert, index) => (
              <React.Fragment key={alert.id}>
                <ListItem 
                  sx={{ 
                    py: 1.5,
                    px: 2,
                    bgcolor: index % 2 === 0 ? 'background.paper' : 'background.default',
                    '&:hover': { bgcolor: 'action.hover' },
                    transition: 'background-color 0.2s'
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', width: '100%', gap: 1.5 }}>
                    {/* Severity Icon */}
                    <Box 
                      sx={{ 
                        color: getSeverityColor(alert.severity),
                        mt: 0.5
                      }}
                    >
                      {getSeverityIcon(alert.severity)}
                    </Box>
                    
                    {/* Content */}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box display="flex" alignItems="center" gap={1} mb={0.5} flexWrap="wrap">
                        <Chip
                          label={translateSeverity(alert.severity)}
                          size="small"
                          sx={{
                            bgcolor: getSeverityColor(alert.severity),
                            color: 'primary.contrastText',
                            fontWeight: 600,
                            fontSize: '0.7rem',
                            height: 20
                          }}
                        />
                        <Chip
                          label={translateAlertType(alert.alert_type)}
                          size="small"
                          variant="outlined"
                          sx={{
                            fontSize: '0.7rem',
                            height: 20,
                            borderColor: '#e0e0e0'
                          }}
                        />
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            color: '#757575',
                            ml: 'auto',
                            fontSize: '0.7rem'
                          }}
                        >
                          {format(new Date(alert.created_at), 'dd.MM HH:mm')}
                        </Typography>
                      </Box>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          fontSize: '0.85rem',
                          lineHeight: 1.4,
                          color: '#424242'
                        }}
                      >
                        {alert.message}
                      </Typography>
                    </Box>
                  </Box>
                </ListItem>
                {index < filteredAlerts.length - 1 && <Divider />}
              </React.Fragment>
            ))
          )}
        </List>
      </Box>
    </Paper>
  );
};

export default AlertPanel;

