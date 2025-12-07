import React from 'react';
import { Box, Typography, Grid, Paper, Divider } from '@mui/material';
import Layout from '../components/Layout';
import ImportForm from '../components/ImportForm';
import ImportILIForm from '../components/ImportILIForm';

export default function ImportPage() {
  return (
    <Layout>
      <Box>
        <Typography variant="h4" gutterBottom>
          Импорт данных
        </Typography>
        
        {/* ILI Import - Main feature */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" color="primary" gutterBottom>
            Внутритрубная диагностика (ILI)
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <ImportILIForm />
            </Grid>
          </Grid>
        </Box>

        <Divider sx={{ my: 4 }} />

        {/* Legacy imports */}
        <Typography variant="h6" color="text.secondary" gutterBottom>
          Другие форматы
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <ImportForm type="objects" />
          </Grid>
          <Grid item xs={12} md={6}>
            <ImportForm type="inspections" />
          </Grid>
        </Grid>
      </Box>
    </Layout>
  );
}
