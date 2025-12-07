import React from 'react';
import {
  Box,
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Chip,
  Divider,
} from '@mui/material';
import { FilterList as FilterIcon } from '@mui/icons-material';

export default function MapSidebar({
  filters,
  onChange,
  onFilterChange,
  onReset,
  pipelines,
  selectedPipelineId,
  setSelectedPipelineId,
  showPipelines,
  toggleShowPipelines,
  defectsCount,
  onApply,
}) {
  const handleFilterChange = onFilterChange || onChange;

  return (
    <Paper sx={{ p: 2, height: '70vh', overflow: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <FilterIcon />
        <Typography variant="h6">Фильтры</Typography>
      </Box>

      <FormControl fullWidth size="small" sx={{ mb: 2 }}>
        <InputLabel>Метод</InputLabel>
        <Select
          value={filters.method}
          label="Метод"
          onChange={(e) => handleFilterChange && handleFilterChange('method', e.target.value)}
        >
          <MenuItem value="">Все</MenuItem>
          <MenuItem value="MT-01">MT-01</MenuItem>
          <MenuItem value="MT-02">MT-02</MenuItem>
          <MenuItem value="MT-03">MT-03</MenuItem>
        </Select>
      </FormControl>

      <FormControl fullWidth size="small" sx={{ mb: 2 }}>
        <InputLabel>Критичность</InputLabel>
        <Select
          value={filters.severity}
          label="Критичность"
          onChange={(e) => handleFilterChange && handleFilterChange('severity', e.target.value)}
        >
          <MenuItem value="">Все</MenuItem>
          <MenuItem value="low">Низкая</MenuItem>
          <MenuItem value="medium">Средняя</MenuItem>
          <MenuItem value="high">Высокая</MenuItem>
          <MenuItem value="critical">Критическая</MenuItem>
        </Select>
      </FormControl>

      <TextField
        size="small"
        label="Дата от"
        type="date"
        value={filters.date_from}
        onChange={(e) => handleFilterChange && handleFilterChange('date_from', e.target.value)}
        InputLabelProps={{ shrink: true }}
        sx={{ width: '100%', mb: 2 }}
      />

      <TextField
        size="small"
        label="Дата до"
        type="date"
        value={filters.date_to}
        onChange={(e) => handleFilterChange && handleFilterChange('date_to', e.target.value)}
        InputLabelProps={{ shrink: true }}
        sx={{ width: '100%', mb: 2 }}
      />

      <FormControl fullWidth size="small" sx={{ mb: 2 }}>
        <InputLabel>Трубопровод</InputLabel>
        <Select
          value={selectedPipelineId}
          label="Трубопровод"
          onChange={(e) => setSelectedPipelineId(e.target.value)}
        >
          <MenuItem value="">Все</MenuItem>
          {pipelines.map((p) => (
            <MenuItem key={p.id} value={p.id}>{p.name || p.pipeline_code}</MenuItem>
          ))}
        </Select>
      </FormControl>

      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <Button variant="contained" onClick={onApply} fullWidth>Применить</Button>
        <Button variant="outlined" onClick={onReset} fullWidth>Сбросить</Button>
      </Box>

      <Divider sx={{ my: 2 }} />

      <Typography variant="subtitle1" sx={{ mb: 1 }}>Статистика</Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Typography variant="h4">{defectsCount ?? '-'}</Typography>
        <Typography variant="body2">дефектов</Typography>
      </Box>

      <Button variant="outlined" onClick={toggleShowPipelines} fullWidth>
        {showPipelines ? 'Скрыть трубопроводы' : 'Показать трубопроводы'}
      </Button>

      <Box sx={{ mt: 2 }}>
        <Typography variant="subtitle2">Легенда</Typography>
        <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
          <Chip label="Критические" size="small" sx={{ bgcolor: '#9c27b0', color: 'white' }} />
          <Chip label="Высокие" size="small" sx={{ bgcolor: '#f44336', color: 'white' }} />
          <Chip label="Средние" size="small" sx={{ bgcolor: '#ff9800', color: 'white' }} />
          <Chip label="Низкие" size="small" sx={{ bgcolor: '#4caf50', color: 'white' }} />
        </Box>
      </Box>
    </Paper>
  );
}
