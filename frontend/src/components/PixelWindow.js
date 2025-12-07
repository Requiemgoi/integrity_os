import React from 'react';
import { Box, Paper, Typography } from '@mui/material';

export default function PixelWindow({ title, children, contentSx, ...paperProps }) {
  return (
    <Paper
      elevation={0}
      {...paperProps}
      sx={{
        borderRadius: 4,
        borderWidth: 3,
        borderStyle: 'solid',
        borderColor: '#1C1C1C',
        boxShadow: '4px 4px 0px rgba(0, 0, 0, 0.35)',
        backgroundColor: '#F8D41F',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 1,
          backgroundColor: '#3C5BA9',
          borderBottom: '3px solid #1C1C1C',
        }}
      >
        <Typography
          variant="subtitle2"
          sx={{
            fontWeight: 700,
            letterSpacing: '0.08em',
            fontSize: 12,
            textTransform: 'uppercase',
            color: '#ffffff',
          }}
        >
          {title}
        </Typography>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Box sx={{ width: 10, height: 10, bgcolor: '#F8D41F', border: '2px solid #1C1C1C' }} />
          <Box sx={{ width: 10, height: 10, bgcolor: '#6DC5F1', border: '2px solid #1C1C1C' }} />
          <Box sx={{ width: 10, height: 10, bgcolor: '#E52521', border: '2px solid #1C1C1C' }} />
        </Box>
      </Box>
      <Box
        sx={{
          p: 2,
          ...contentSx,
        }}
      >
        {children}
      </Box>
    </Paper>
  );
}
