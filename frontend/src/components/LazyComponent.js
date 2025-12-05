import React, { Suspense } from 'react';
import { Box, CircularProgress } from '@mui/material';

/**
 * Компонент для ленивой загрузки с fallback
 */
const LazyComponent = ({ component: Component, fallback, ...props }) => {
  const defaultFallback = (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 200,
      }}
    >
      <CircularProgress />
    </Box>
  );

  return (
    <Suspense fallback={fallback || defaultFallback}>
      <Component {...props} />
    </Suspense>
  );
};

export default LazyComponent;

