import React from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Typography, Paper } from '@mui/material';

export default function MasterDataPage() {
  const { t } = useTranslation();
  return (
    <Box p={3}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          {t('clinic.pages.masterData.title', 'Quản lý danh mục')}
        </Typography>
        <Typography variant="body1">
          {t('clinic.pages.masterData.description', 'Quản lý danh mục Thuốc, Nhóm thuốc, Nhà cung cấp và Loại bệnh.')}
        </Typography>
      </Paper>
    </Box>
  );
}
