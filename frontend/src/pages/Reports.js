import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  PictureAsPdf as PdfIcon,
  TableChart as ExcelIcon,
  Description as HtmlIcon,
} from '@mui/icons-material';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { toast } from 'react-toastify';
import Layout from '../components/Layout';
import { dashboardStatsService } from '../services/dashboardStatsService';
import { defectsService } from '../services/defectsService';

export default function ReportsPage() {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [defects, setDefects] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statsData, defectsData] = await Promise.all([
        dashboardStatsService.getWidgets().catch(() => null),
        defectsService.getDefects().catch(() => []),
      ]);
      setStats(statsData);
      setDefects(defectsData || []);
    } catch (err) {
      setError('Ошибка загрузки данных для отчётов');
      console.error(err);
    }
  };

  const generateHTMLReport = async () => {
    try {
      setLoading(true);
      // Используем бэкенд для генерации полного отчета
      const token = localStorage.getItem('token');
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
      
      const response = await fetch(`${apiUrl}/api/reports/generate?download=true`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Ошибка генерации отчета');
      }
      
      const html = await response.text();
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      
      // Открыть в новой вкладке
      window.open(url, '_blank');
      
      // Также скачать файл
      const downloadLink = document.createElement('a');
      downloadLink.href = url;
      downloadLink.download = `integrityos-report-${new Date().toISOString().split('T')[0]}.html`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      
      // Освободить память через некоторое время
      setTimeout(() => URL.revokeObjectURL(url), 100);
      
      toast.success('HTML-отчёт открыт и скачан');
    } catch (err) {
      console.error(err);
      toast.error('Не удалось сформировать HTML-отчёт: ' + (err.message || 'Неизвестная ошибка'));
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = async () => {
    try {
      setLoading(true);
      
      if (!defects || defects.length === 0) {
        toast.warning('Нет данных для генерации PDF');
        return;
      }

      // Функция транслитерации для кириллицы (jsPDF не поддерживает кириллицу)
      const transliterate = (text) => {
        if (!text) return '-';
        const map = {
          'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
          'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
          'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
          'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
          'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
          'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ё': 'Yo',
          'Ж': 'Zh', 'З': 'Z', 'И': 'I', 'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M',
          'Н': 'N', 'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U',
          'Ф': 'F', 'Х': 'H', 'Ц': 'Ts', 'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Sch',
          'Ъ': '', 'Ы': 'Y', 'Ь': '', 'Э': 'E', 'Ю': 'Yu', 'Я': 'Ya',
        };
        return String(text).split('').map(char => map[char] || char).join('');
      };

      const doc = new jsPDF('p', 'mm', 'a4'); // portrait orientation (вертикальная)
      doc.setFontSize(16);
      doc.text('Otchet IntegrityOS', 14, 20);
      doc.setFontSize(10);
      doc.text(`Data generacii: ${new Date().toLocaleString('ru-RU')}`, 14, 30);
      doc.text(`Vsego defektov: ${defects.length}`, 14, 35);

      // Функция для перевода типа дефекта с транслитерацией
      const translateDefectType = (type) => {
        if (!type) return '-';
        const typeStr = String(type).trim();
        const typeLower = typeStr.toLowerCase();
        const translations = {
          'потеря металла': 'Poterya metalla',
          'вмятина': 'Vmyatina',
          'расслоение': 'Rassloenie',
        };
        const translated = translations[typeLower] || transliterate(typeStr);
        // Капитализируем первую букву
        return translated.charAt(0).toUpperCase() + translated.slice(1);
      };

      // Функция для перевода критичности с транслитерацией
      const translateSeverity = (severity) => {
        if (!severity) return '-';
        const sev = String(severity).toLowerCase().trim();
        const translations = {
          'low': 'Nizkaia',
          'medium': 'Sredniaia',
          'high': 'Vysokaia',
          'critical': 'Kriticheskaia',
        };
        return translations[sev] || severity;
      };

      // Подготовка данных для таблицы
      const rows = defects.slice(0, 200).map((d) => [
        d.defect_code || '-',
        d.pipeline_code || d.object_code || '-',
        translateDefectType(d.defect_type),
        translateSeverity(d.severity),
        d.max_depth_percent != null ? `${d.max_depth_percent.toFixed(1)}%` : '-',
        d.inspection_date ? new Date(d.inspection_date).toLocaleDateString('ru-RU') : '-',
      ]);

      // Использование autoTable для версии 5.x - вызывается как функция, а не метод
      // Используем транслитерацию для заголовков
      autoTable(doc, {
        head: [['Kod defekta', 'Truboprovod', 'Tip', 'Kritichnost', 'Glubina, %', 'Data obsledovaniia']],
        body: rows,
        startY: 45,
        styles: { 
          fontSize: 7, 
          cellPadding: 1.5,
        },
        headStyles: { 
          fillColor: [25, 118, 210], 
          textColor: 255, 
          fontStyle: 'bold',
          fontSize: 7,
        },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        margin: { top: 45, right: 10, bottom: 30, left: 10 },
        // Автоматически создавать новые страницы при необходимости
        didDrawPage: (data) => {
          // Эта функция вызывается после отрисовки каждой страницы
        },
      });

      // Добавить статистику по критичности
      const bySeverity = defects.reduce((acc, d) => {
        // Нормализовать значение критичности
        const sev = (d.severity || '').toLowerCase().trim();
        if (sev) {
          acc[sev] = (acc[sev] || 0) + 1;
        }
        return acc;
      }, {});

      // Получить позицию после таблицы
      // В версии 5.x finalY доступен через doc.lastAutoTable.finalY
      let yPos = 0;
      const pageHeight = doc.internal.pageSize.height;
      const marginBottom = 20;
      
      try {
        // Получаем позицию после последней таблицы
        if (doc.lastAutoTable && typeof doc.lastAutoTable.finalY === 'number') {
          yPos = doc.lastAutoTable.finalY;
        } else {
          // Если finalY недоступен, используем примерную высоту
          yPos = 45 + (rows.length * 4) + 20;
        }
        
        // Проверяем, не выходит ли за границы страницы
        if (yPos > pageHeight - marginBottom - 30) {
          // Если выходит, добавляем новую страницу
          doc.addPage();
          yPos = 20;
        } else {
          yPos += 15; // Отступ после таблицы
        }
      } catch (e) {
        // Если finalY недоступен, используем примерную высоту
        console.warn('Не удалось получить finalY из autoTable, используется примерная высота');
        yPos = pageHeight - 50; // Размещаем внизу страницы с отступом
      }
      
      doc.setFontSize(12);
      doc.text('Statistika po kritichnosti:', 10, yPos);
      yPos += 8;
      doc.setFontSize(10);
      
      // Отсортировать статистику в правильном порядке и отобразить
      const severityOrder = ['critical', 'high', 'medium', 'low'];
      let hasStats = false;
      severityOrder.forEach((sev) => {
        if (bySeverity[sev] !== undefined && bySeverity[sev] > 0) {
          // Проверяем, не выходит ли за границы страницы
          if (yPos > pageHeight - marginBottom) {
            doc.addPage();
            yPos = 20;
          }
          const sevRu = translateSeverity(sev);
          doc.text(`${sevRu}: ${bySeverity[sev]}`, 15, yPos);
          yPos += 6;
          hasStats = true;
        }
      });
      
      // Если нет статистики, показать сообщение
      if (!hasStats) {
        if (yPos > pageHeight - marginBottom) {
          doc.addPage();
          yPos = 20;
        }
        doc.text('Net dannykh', 15, yPos);
      }

      const filename = `integrityos-report-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(filename);
      toast.success('PDF-отчёт сохранён');
    } catch (err) {
      console.error('Ошибка генерации PDF:', err);
      toast.error('Не удалось сформировать PDF: ' + (err.message || 'Неизвестная ошибка'));
    } finally {
      setLoading(false);
    }
  };

  const generateExcel = () => {
    try {
      const worksheetData = (defects || []).map((d) => ({
        Код: d.defect_code,
        Объект: d.object_code,
        Метод: d.method,
        Критичность: d.severity,
        Глубина: d.depth,
        Дата: d.inspection_date,
      }));

      const worksheet = XLSX.utils.json_to_sheet(worksheetData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Defects');
      XLSX.writeFile(workbook, 'integrityos-report.xlsx');
      toast.success('Excel-отчёт сохранён');
    } catch (err) {
      console.error(err);
      toast.error('Не удалось сформировать Excel');
    }
  };

  return (
    <Layout>
      <Box>
        <Typography variant="h4" gutterBottom>
          Отчёты
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  HTML-отчёт
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Сформирует и скачает HTML-отчёт с полной статистикой.
                </Typography>
              </CardContent>
              <CardActions>
                <Button
                  startIcon={<HtmlIcon />}
                  variant="contained"
                  onClick={generateHTMLReport}
                  disabled={loading}
                >
                  Сформировать
                </Button>
              </CardActions>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  PDF-отчёт
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Сформирует PDF-файл с перечнем дефектов.
                </Typography>
              </CardContent>
              <CardActions>
                <Button
                  startIcon={<PdfIcon />}
                  variant="contained"
                  color="error"
                  onClick={generatePDF}
                  disabled={loading}
                >
                  Сформировать
                </Button>
              </CardActions>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Excel-отчёт
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Выгрузит таблицу дефектов в формате XLSX.
                </Typography>
              </CardContent>
              <CardActions>
                <Button
                  startIcon={<ExcelIcon />}
                  variant="contained"
                  color="success"
                  onClick={generateExcel}
                  disabled={loading}
                >
                  Сформировать
                </Button>
              </CardActions>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Layout>
  );
}
