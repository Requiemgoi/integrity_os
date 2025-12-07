import React, { useState } from 'react';
import {
  Box,
  Button,
  Paper,
  Typography,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
} from '@mui/material';
import { CloudUpload as UploadIcon, Science as ScienceIcon } from '@mui/icons-material';
import { importService } from '../services/importService';
import { toast } from 'react-toastify';

const PIPELINES = [
  { code: 'MT-01', name: 'Магистральный трубопровод 1' },
  { code: 'MT-02', name: 'Магистральный трубопровод 2' },
  { code: 'MT-03', name: 'Магистральный трубопровод 3' },
];

export default function ImportILIForm({ onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState(null);
  const [pipelineCode, setPipelineCode] = useState('');
  const [sheetName, setSheetName] = useState('Аномалии');
  const [availableSheets, setAvailableSheets] = useState([]);
  const [inspectionDate, setInspectionDate] = useState('');
  const [result, setResult] = useState(null);

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const ext = selectedFile.name.split('.').pop().toLowerCase();
      if (!['xlsx', 'xls'].includes(ext)) {
        toast.error('Поддерживаются только Excel файлы (.xlsx, .xls)');
        return;
      }
      setFile(selectedFile);
      setResult(null);
      
      // Try to get available sheets
      try {
        const sheetsData = await importService.getExcelSheets(selectedFile);
        setAvailableSheets(sheetsData.sheets || []);
        // Auto-select "Аномалии" if available
        if (sheetsData.sheets?.includes('Аномалии')) {
          setSheetName('Аномалии');
        } else if (sheetsData.sheets?.length > 0) {
          setSheetName(sheetsData.sheets[0]);
        }
      } catch (error) {
        console.error('Failed to get sheets:', error);
        setAvailableSheets([]);
      }
    }
  };

  const handleSubmit = async () => {
    if (!file) {
      toast.error('Выберите файл для импорта');
      return;
    }
    if (!pipelineCode) {
      toast.error('Выберите трубопровод');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await importService.importILI(
        file,
        pipelineCode,
        sheetName,
        inspectionDate || null
      );

      setResult(response);
      toast.success(`Импорт ILI завершен: ${response.imported} дефектов импортировано`);
      
      if (onSuccess) {
        onSuccess(response);
      }
    } catch (error) {
      const message = error.response?.data?.detail || 'Ошибка импорта ILI данных';
      toast.error(message);
      setResult({ errors: [message] });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <ScienceIcon sx={{ mr: 1, color: 'primary.main' }} />
        <Typography variant="h6">
          Импорт ILI данных
        </Typography>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Импорт данных внутритрубной диагностики из Excel отчёта.
        Поддерживается стандартный формат с листом "Аномалии".
      </Typography>

      {/* Pipeline selection */}
      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>Трубопровод *</InputLabel>
        <Select
          value={pipelineCode}
          label="Трубопровод *"
          onChange={(e) => setPipelineCode(e.target.value)}
          disabled={loading}
        >
          {PIPELINES.map((p) => (
            <MenuItem key={p.code} value={p.code}>
              {p.code} — {p.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* File selection */}
      <Box sx={{ mb: 2 }}>
        <input
          accept=".xlsx,.xls"
          style={{ display: 'none' }}
          id="ili-file-upload"
          type="file"
          onChange={handleFileChange}
        />
        <label htmlFor="ili-file-upload">
          <Button
            variant="outlined"
            component="span"
            startIcon={<UploadIcon />}
            disabled={loading}
          >
            Выбрать Excel файл
          </Button>
        </label>
        {file && (
          <Typography variant="body2" sx={{ mt: 1, ml: 2, display: 'inline-block' }}>
            📄 {file.name}
          </Typography>
        )}
      </Box>

      {/* Sheet selection (if file loaded) */}
      {availableSheets.length > 0 && (
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Лист Excel</InputLabel>
          <Select
            value={sheetName}
            label="Лист Excel"
            onChange={(e) => setSheetName(e.target.value)}
            disabled={loading}
          >
            {availableSheets.map((sheet) => (
              <MenuItem key={sheet} value={sheet}>
                {sheet}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      {/* Inspection date (optional) */}
      <TextField
        fullWidth
        type="date"
        label="Дата диагностики"
        value={inspectionDate}
        onChange={(e) => setInspectionDate(e.target.value)}
        InputLabelProps={{ shrink: true }}
        sx={{ mb: 3 }}
        disabled={loading}
        helperText="Опционально. Если не указана, используется текущая дата."
      />

      <Button
        variant="contained"
        onClick={handleSubmit}
        disabled={!file || !pipelineCode || loading}
        startIcon={loading ? <CircularProgress size={20} /> : <ScienceIcon />}
        fullWidth
        size="large"
      >
        {loading ? 'Импорт данных...' : 'Импортировать ILI данные'}
      </Button>

      {result && (
        <Box sx={{ mt: 3 }}>
          {result.imported > 0 && (
            <Alert severity="success" sx={{ mb: 2 }}>
              <Typography variant="subtitle2">
                Успешно импортировано: {result.imported} дефектов
              </Typography>
              {result.pipeline_code && (
                <Typography variant="body2">
                  Трубопровод: {result.pipeline_code}
                </Typography>
              )}
            </Alert>
          )}
          {result.errors && result.errors.length > 0 && (
            <Alert severity="warning">
              <Typography variant="subtitle2">
                Ошибки ({result.total_errors || result.errors.length}):
              </Typography>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {result.errors.slice(0, 5).map((error, idx) => (
                  <li key={idx}>{error}</li>
                ))}
                {result.errors.length > 5 && (
                  <li>...и ещё {result.errors.length - 5} ошибок</li>
                )}
              </ul>
            </Alert>
          )}
        </Box>
      )}
    </Paper>
  );
}
