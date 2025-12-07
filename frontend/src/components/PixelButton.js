import React from 'react';
import { Button } from '@mui/material';

export default function PixelButton({ children, sx, ...props }) {
  return (
    <Button
      variant="contained"
      {...props}
      sx={{
        borderRadius: 12,
        border: '3px solid #1C1C1C',
        boxShadow: '0 0 0 3px #1C1C1C',
        textTransform: 'none',
        fontWeight: 600,
        px: 3,
        py: 1.2,
        fontSize: 14,
        letterSpacing: '0.06em',
        ...sx,
      }}
    >
      {children}
    </Button>
  );
}
