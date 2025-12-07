import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Chip,
  TableSortLabel,
  IconButton,
} from '@mui/material';
import { Visibility as ViewIcon, FilterList as FilterIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import ImportForm from '../components/ImportForm';
import { defectsService } from '../services/defectsService';

const severityColors = {
  low: '#4caf50',
  medium: '#ff9800',
  high: '#f44336',
  critical: '#9c27b0',
};

export default function DefectsPage() {
  const navigate = useNavigate();
  const [defects, setDefects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    method: '',
    date_from: '',
    date_to: '',
    severity: '',
    param1_min: '',
    param1_max: '',
    sort_by: 'inspection_date',
    sort_order: 'desc',
  });
  const [showImport, setShowImport] = useState(false);

  useEffect(() => {
    loadDefects();
  }, [filters]);

  const loadDefects = async () => {
    setLoading(true);
    try {
      const data = await defectsService.getDefects(filters);
      setDefects(data);
    } catch (error) {
      console.error('Error loading defects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleSort = (field) => {
    setFilters((prev) => ({
      ...prev,
      sort_by: field,
      sort_order: prev.sort_by === field && prev.sort_order === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleResetFilters = () => {
    setFilters({
      method: '',
      date_from: '',
      date_to: '',
      severity: '',
      param1_min: '',
      param1_max: '',
      sort_by: 'inspection_date',
      sort_order: 'desc',
    });
  };

  return (
    <Layout>
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4">Дефекты</Typography>
          <Button variant="contained" onClick={() => setShowImport(!showImport)}>
            {showImport ? 'Скрыть импорт' : 'Импорт диагностик'}
          </Button>
        </Box>

        {showImport && (
          <Box sx={{ mb: 3 }}>
            <ImportForm type="inspections" onSuccess={loadDefects} />
          </Box>
        )}

        {/* Filters */}
        <Paper sx={{ p: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <FilterIcon />
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Метод</InputLabel>
              <Select
                value={filters.method}
                label="Метод"
                onChange={(e) => handleFilterChange('method', e.target.value)}
              >
                <MenuItem value="">Все</MenuItem>
                <MenuItem value="MT-01">MT-01</MenuItem>
                <MenuItem value="MT-02">MT-02</MenuItem>
                <MenuItem value="MT-03">MT-03</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Критичность</InputLabel>
              <Select
                value={filters.severity}
                label="Критичность"
                onChange={(e) => handleFilterChange('severity', e.target.value)}
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
              onChange={(e) => handleFilterChange('date_from', e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ width: 150 }}
            />

            <TextField
              size="small"
              label="Дата до"
              type="date"
              value={filters.date_to}
              onChange={(e) => handleFilterChange('date_to', e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ width: 150 }}
            />

            <TextField
              size="small"
              label="Param1 мин"
              type="number"
              value={filters.param1_min}
              onChange={(e) => handleFilterChange('param1_min', e.target.value)}
              sx={{ width: 120 }}
            />

            <TextField
              size="small"
              label="Param1 макс"
              type="number"
              value={filters.param1_max}
              onChange={(e) => handleFilterChange('param1_max', e.target.value)}
              sx={{ width: 120 }}
            />

            <Button variant="outlined" onClick={handleResetFilters}>
              Сбросить
            </Button>
          </Box>
        </Paper>

        {/* Table */}
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Код дефекта</TableCell>
                <TableCell>Объект</TableCell>
                <TableCell>Метод</TableCell>
                <TableCell>Критичность</TableCell>
                <TableCell>
                  <TableSortLabel
                    active={filters.sort_by === 'depth'}
                    direction={filters.sort_by === 'depth' ? filters.sort_order : 'asc'}
                    onClick={() => handleSort('depth')}
                  >
                    Глубина
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={filters.sort_by === 'inspection_date'}
                    direction={filters.sort_by === 'inspection_date' ? filters.sort_order : 'asc'}
                    onClick={() => handleSort('inspection_date')}
                  >
                    Дата обследования
                  </TableSortLabel>
                </TableCell>
                <TableCell>Действия</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    Загрузка...
                  </TableCell>
                </TableRow>
              ) : defects.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    Нет данных
                  </TableCell>
                </TableRow>
              ) : (
                defects.map((defect) => (
                  <TableRow key={defect.id} hover>
                    <TableCell>{defect.defect_code}</TableCell>
                    <TableCell>{defect.object_code || '-'}</TableCell>
                    <TableCell>{defect.method}</TableCell>
                    <TableCell>
                      <Chip
                        label={defect.severity}
                        size="small"
                        sx={{
                          bgcolor: severityColors[defect.severity] || '#gray',
                          color: 'white',
                        }}
                      />
                    </TableCell>
                    <TableCell>{defect.depth || '-'}</TableCell>
                    <TableCell>
                      {new Date(defect.inspection_date).toLocaleDateString('ru-RU')}
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => navigate(`/defects/${defect.id}`)}
                      >
                        <ViewIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Layout>
  );
}
