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
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Chip,
  IconButton,
} from '@mui/material';
import { Search as SearchIcon, Visibility as ViewIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import ImportForm from '../components/ImportForm';
import { objectsService } from '../services/objectsService';

export default function ObjectsPage() {
  const navigate = useNavigate();
  const [objects, setObjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    pipeline_code: '',
    object_type: '',
  });
  const [showImport, setShowImport] = useState(false);

  useEffect(() => {
    loadObjects();
  }, [filters]);

  const loadObjects = async () => {
    setLoading(true);
    try {
      const data = await objectsService.getObjects(filters);
      setObjects(data);
    } catch (error) {
      console.error('Error loading objects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Layout>
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4">Объекты</Typography>
          <Button variant="contained" onClick={() => setShowImport(!showImport)}>
            {showImport ? 'Скрыть импорт' : 'Импорт объектов'}
          </Button>
        </Box>

        {showImport && (
          <Box sx={{ mb: 3 }}>
            <ImportForm type="objects" onSuccess={loadObjects} />
          </Box>
        )}

        {/* Filters */}
        <Paper sx={{ p: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <TextField
              size="small"
              label="Поиск"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
              }}
              sx={{ minWidth: 250 }}
            />

            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Трубопровод</InputLabel>
              <Select
                value={filters.pipeline_code}
                label="Трубопровод"
                onChange={(e) => handleFilterChange('pipeline_code', e.target.value)}
              >
                <MenuItem value="">Все</MenuItem>
                <MenuItem value="MT-01">MT-01</MenuItem>
                <MenuItem value="MT-02">MT-02</MenuItem>
                <MenuItem value="MT-03">MT-03</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Тип объекта</InputLabel>
              <Select
                value={filters.object_type}
                label="Тип объекта"
                onChange={(e) => handleFilterChange('object_type', e.target.value)}
              >
                <MenuItem value="">Все</MenuItem>
                <MenuItem value="station">Станция</MenuItem>
                <MenuItem value="valve">Клапан</MenuItem>
                <MenuItem value="pump">Насос</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Paper>

        {/* Table */}
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Код</TableCell>
                <TableCell>Название</TableCell>
                <TableCell>Тип</TableCell>
                <TableCell>Трубопровод</TableCell>
                <TableCell>Координаты</TableCell>
                <TableCell>Дефектов</TableCell>
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
              ) : objects.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    Нет данных
                  </TableCell>
                </TableRow>
              ) : (
                objects.map((obj) => (
                  <TableRow key={obj.id} hover>
                    <TableCell>{obj.object_code}</TableCell>
                    <TableCell>{obj.name || '-'}</TableCell>
                    <TableCell>
                      {obj.object_type && (
                        <Chip label={obj.object_type} size="small" />
                      )}
                    </TableCell>
                    <TableCell>{obj.pipeline_code || '-'}</TableCell>
                    <TableCell>
                      {obj.latitude && obj.longitude
                        ? `${obj.latitude.toFixed(4)}, ${obj.longitude.toFixed(4)}`
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={obj.defects_count}
                        size="small"
                        color={obj.defects_count > 0 ? 'error' : 'default'}
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => navigate(`/objects/${obj.id}`)}
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
