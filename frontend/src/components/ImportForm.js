import React, { useState } from 'react';
import {
  Box,
  Button,
  Paper,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';
import { CloudUpload as UploadIcon } from '@mui/icons-material';
import { importService } from '../services/importService';
import { toast } from 'react-toastify';

export default function ImportForm({ type = 'objects', onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const ext = selectedFile.name.split('.').pop().toLowerCase();
      if (!['csv', 'xlsx', 'xls'].includes(ext)) {
        toast.error('Поддерживаются только файлы CSV и XLSX');
        return;
      }
      setFile(selectedFile);
      setResult(null);
    }
  };

  const handleSubmit = async () => {
    if (!file) {
      toast.error('Выберите файл для импорта');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      let response;
      if (type === 'objects') {
        response = await importService.importObjects(file);
      } else {
        response = await importService.importInspections(file);
      }

      setResult(response);
      toast.success(`Импорт завершен: ${response.imported} записей импортировано`);
      
      if (onSuccess) {
        onSuccess(response);
      }
    } catch (error) {
      const message = error.response?.data?.detail || 'Ошибка импорта';
      toast.error(message);
      setResult({ errors: [message] });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Импорт {type === 'objects' ? 'объектов' : 'диагностик'}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Поддерживаются форматы: CSV, XLSX
      </Typography>

      <Box sx={{ mb: 2 }}>
        <input
          accept=".csv,.xlsx,.xls"
          style={{ display: 'none' }}
          id={`file-upload-${type}`}
          type="file"
          onChange={handleFileChange}
        />
        <label htmlFor={`file-upload-${type}`}>
          <Button
            variant="outlined"
            component="span"
            startIcon={<UploadIcon />}
            disabled={loading}
          >
            Выбрать файл
          </Button>
        </label>
        {file && (
          <Typography variant="body2" sx={{ mt: 1, ml: 2, display: 'inline-block' }}>
            {file.name}
          </Typography>
        )}
      </Box>

      <Button
        variant="contained"
        onClick={handleSubmit}
        disabled={!file || loading}
        startIcon={loading ? <CircularProgress size={20} /> : null}
      >
        {loading ? 'Импорт...' : 'Импортировать'}
      </Button>

      {result && (
        <Box sx={{ mt: 3 }}>
          <Alert severity="success" sx={{ mb: 2 }}>
            Импортировано: {result.imported || 0}
            {result.updated && `, Обновлено: ${result.updated}`}
          </Alert>
          {result.errors && result.errors.length > 0 && (
            <Alert severity="warning">
              <Typography variant="subtitle2">Ошибки:</Typography>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {result.errors.map((error, idx) => (
                  <li key={idx}>{error}</li>
                ))}
              </ul>
            </Alert>
          )}
        </Box>
      )}
    </Paper>
  );
}
