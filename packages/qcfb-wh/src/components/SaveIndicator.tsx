import React from 'react';
import { CircularProgress, Box, Typography } from '@mui/material';
import { CheckCircle, Error as ErrorIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import type { SaveStatus } from '../hooks/useAutoSave';

interface SaveIndicatorProps {
  status: SaveStatus;
}

export default function SaveIndicator({ status }: SaveIndicatorProps) {
  const { t } = useTranslation();

  if (status === 'idle') return null;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', ml: 1 }}>
      {status === 'saving' && (
        <>
          <CircularProgress size={14} sx={{ color: 'text.secondary', mr: 0.5 }} />
          <Typography variant="caption" color="text.secondary">
            {t('qcfb.inspection.saving', 'Saving...')}
          </Typography>
        </>
      )}
      {status === 'saved' && (
        <>
          <CheckCircle sx={{ color: 'success.main', mr: 0.5, fontSize: 16 }} />
          <Typography variant="caption" color="success.main">
            {t('qcfb.inspection.saved', 'Saved')}
          </Typography>
        </>
      )}
      {status === 'error' && (
        <>
          <ErrorIcon sx={{ color: 'error.main', mr: 0.5, fontSize: 16 }} />
          <Typography variant="caption" color="error.main">
            {t('qcfb.inspection.error', 'Error')}
          </Typography>
        </>
      )}
    </Box>
  );
}
