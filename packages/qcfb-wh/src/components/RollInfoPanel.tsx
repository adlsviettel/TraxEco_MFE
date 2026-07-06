import React from 'react';
import { Card, CardContent, Typography, Grid, Divider, Box } from '@mui/material';
import { useTranslation } from 'react-i18next';

export interface RollInfo {
  InvoiceNo?: string;
  SupCode?: string;
  OrderNumber?: string;
  RollItem?: string;
  Color?: string;
  BatchNo?: string;
  RollNo?: string;
  NW?: string;
  GW?: string;
  Width?: string;
  ShipLength?: string;
  ItemMoisture?: string;
  GSM?: string;
}

export default function RollInfoPanel({ rollInfo }: { rollInfo?: RollInfo }) {
  const { t } = useTranslation();

  return (
    <Card elevation={0} sx={{ 
      borderRadius: 4, 
      bgcolor: '#ffffff', 
      border: '1px solid rgba(0,0,0,0.04)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.04)',
      position: 'relative', overflow: 'hidden'
    }}>
      <Box sx={{ position: 'absolute', top: -30, right: -30, width: 100, height: 100, background: 'radial-gradient(circle, rgba(16,185,129,0.05) 0%, rgba(255,255,255,0) 70%)', borderRadius: '50%' }} />
      <CardContent sx={{ p: 2, position: 'relative', zIndex: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, pb: 1.5, borderBottom: '1px solid #f1f5f9' }}>
          <Box sx={{ width: 4, height: 18, bgcolor: '#10b981', borderRadius: 1, mr: 1.5 }} />
          <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#0f172a' }}>
            {t('qcfb.inspection.rollInfo', 'ROLL INFO')}
          </Typography>
        </Box>
        <Grid container spacing={2}>
          <Grid size={{ xs: 6, sm: 4, md: 2 }}>
            <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, display: 'block', mb: 0.5, letterSpacing: '0.5px' }}>
              {t('qcfb.inspection.rollNo', 'ROLL NO')}
            </Typography>
            <Typography variant="body1" fontWeight={700} sx={{ color: '#0f172a' }}>{rollInfo?.RollNo || '-'}</Typography>
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2 }}>
            <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, display: 'block', mb: 0.5, letterSpacing: '0.5px' }}>
              {t('qcfb.inspection.item', 'ITEM')}
            </Typography>
            <Typography variant="body1" fontWeight={700} sx={{ color: '#0f172a' }}>{rollInfo?.Item || '-'}</Typography>
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2 }}>
            <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, display: 'block', mb: 0.5, letterSpacing: '0.5px' }}>
              {t('qcfb.inspection.color', 'COLOR')}
            </Typography>
            <Typography variant="body1" fontWeight={700} sx={{ color: '#0f172a' }}>{rollInfo?.Color || '-'}</Typography>
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2 }}>
            <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, display: 'block', mb: 0.5, letterSpacing: '0.5px' }}>
              {t('qcfb.inspection.width', 'WIDTH')}
            </Typography>
            <Typography variant="body1" fontWeight={700} sx={{ color: '#0f172a' }}>{rollInfo?.Width || '-'}</Typography>
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2 }}>
            <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, display: 'block', mb: 0.5, letterSpacing: '0.5px' }}>
              {t('qcfb.inspection.yard', 'YARD/MET')}
            </Typography>
            <Typography variant="body1" fontWeight={700} sx={{ color: '#0f172a' }}>{rollInfo?.ShipLength || '-'}</Typography>
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2 }}>
            <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, display: 'block', mb: 0.5, letterSpacing: '0.5px' }}>
              {t('qcfb.inspection.supplier', 'SUPPLIER')}
            </Typography>
            <Typography variant="body1" fontWeight={700} sx={{ color: '#0f172a' }}>{rollInfo?.SupCode || '-'}</Typography>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}
