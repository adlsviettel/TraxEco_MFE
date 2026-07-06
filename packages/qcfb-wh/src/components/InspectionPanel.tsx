import React, { useState } from 'react';
import { Card, CardContent, Typography, Grid, Divider, Box, Button, TextField, Select, MenuItem, Switch, FormControlLabel } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { CheckCircle as PassIcon, Cancel as FailIcon } from '@mui/icons-material';
import { qcfbInspectionService } from '../services/qcfbInspectionService';

// Mock hook
const useAutoSave = (qrCode: string, field: string, initialValue: any) => {
  const [value, setValue] = useState(initialValue || '');
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const handleUpdate = async (newVal: string) => {
    setValue(newVal);
    setStatus('saving');
    try {
      if (qrCode) await qcfbInspectionService.updateField(qrCode, field, newVal);
      setStatus('saved');
    } catch (e) {
      setStatus('error');
    }
  };

  return { value, status, setValue: handleUpdate };
};

const SaveIndicator = ({ status }: { status: 'idle' | 'saving' | 'saved' | 'error' }) => {
  if (status === 'saving') return <Typography variant="caption" color="textSecondary">Saving...</Typography>;
  if (status === 'saved') return <Typography variant="caption" color="success.main">Saved</Typography>;
  if (status === 'error') return <Typography variant="caption" color="error.main">Error</Typography>;
  return null;
};

const AutoSaveField = ({ qrCode, field, label, initialValue, type = "number" }: any) => {
  const { value, status, setValue } = useAutoSave(qrCode, field, initialValue);
  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, display: 'block', mb: 0.5, letterSpacing: '0.5px' }}>
        {label}
      </Typography>
      <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <TextField
          fullWidth size="small" type={type}
          value={value} onChange={e => setValue(e.target.value)}
          sx={{ 
            '& .MuiOutlinedInput-root': { 
              bgcolor: '#f8fafc', 
              borderRadius: 3, 
              color: '#1e293b',
              transition: 'all 0.2s ease-in-out',
              '&:hover': { bgcolor: '#f1f5f9' },
              '&.Mui-focused': { bgcolor: '#ffffff', boxShadow: '0 0 0 2px rgba(16, 185, 129, 0.2)' }
            },
            '& .MuiOutlinedInput-notchedOutline': { border: '1px solid transparent' }
          }}
        />
        <Box sx={{ position: 'absolute', right: 10 }}><SaveIndicator status={status} /></Box>
      </Box>
    </Box>
  );
};

export default function InspectionPanel({ qrCode, data, onColorChange, onHandfeelChange }: any) {
  const { t } = useTranslation();
  const [cycleMode, setCycleMode] = useState(false);

  const PassFailButton = ({ label, field, value, onChange }: any) => (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
      <Typography variant="caption" fontWeight={700} sx={{ color: '#64748b' }}>{label}</Typography>
      <Box sx={{ display: 'flex', gap: 1, bgcolor: '#f1f5f9', p: 0.5, borderRadius: 8 }}>
        <Button 
          variant={value === 'P' ? 'contained' : 'text'} 
          color="success" 
          onClick={async () => {
            onChange('P');
            if (qrCode) await qcfbInspectionService.updateField(qrCode, field, 'P');
          }}
          sx={{ minWidth: 40, borderRadius: 8, px: 2, py: 1 }}
        >
          P
        </Button>
        <Button 
          variant={value === 'F' ? 'contained' : 'text'} 
          color="error" 
          onClick={async () => {
            onChange('F');
            if (qrCode) await qcfbInspectionService.updateField(qrCode, field, 'F');
          }}
          sx={{ minWidth: 40, borderRadius: 8, px: 2, py: 1 }}
        >
          F
        </Button>
      </Box>
    </Box>
  );

  return (
    <Card elevation={0} sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column', 
      borderRadius: 4, 
      bgcolor: '#ffffff', 
      border: '1px solid rgba(0,0,0,0.04)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.04)'
    }}>
      <CardContent sx={{ p: 3, flexGrow: 1, overflowY: 'auto' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, pb: 1.5, borderBottom: '1px solid #f1f5f9' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box sx={{ width: 4, height: 18, bgcolor: '#10b981', borderRadius: 1, mr: 1.5 }} />
            <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#0f172a' }}>
              {t('qcfb.inspection.inspectForm', 'INSPECTION FORM')}
            </Typography>
          </Box>
          <FormControlLabel
            control={<Switch size="small" checked={cycleMode} onChange={(e) => setCycleMode(e.target.checked)} color="success" />}
            label={<Typography variant="caption" fontWeight={700} sx={{ color: cycleMode ? '#10b981' : '#64748b' }}>{t('qcfb.inspection.cycleMode', 'CYCLE MODE')}</Typography>}
          />
        </Box>

        <Grid container spacing={2}>
          <Grid size={{ xs: 4 }}>
            <AutoSaveField qrCode={qrCode} field="wb" label={t('qcfb.inspection.widthBegin', 'Width B')} initialValue={data.wb} />
          </Grid>
          <Grid size={{ xs: 4 }}>
            <AutoSaveField qrCode={qrCode} field="wm" label={t('qcfb.inspection.widthMid', 'Width M')} initialValue={data.wm} />
          </Grid>
          <Grid size={{ xs: 4 }}>
            <AutoSaveField qrCode={qrCode} field="we" label={t('qcfb.inspection.widthEnd', 'Width E')} initialValue={data.we} />
          </Grid>

          <Grid size={{ xs: 4 }}>
            <AutoSaveField qrCode={qrCode} field="ya" label={t('qcfb.inspection.actualYard', 'Act Yard')} initialValue={data.ya} />
          </Grid>
          <Grid size={{ xs: 4 }}>
            <AutoSaveField qrCode={qrCode} field="ms" label={t('qcfb.inspection.actualMoisture', 'Act Moist')} initialValue={data.ms} />
          </Grid>
          <Grid size={{ xs: 4 }}>
            <AutoSaveField qrCode={qrCode} field="gsm" label={t('qcfb.inspection.gsm', 'GSM')} initialValue={data.gsm} />
          </Grid>

          {cycleMode && (
            <>
              <Grid size={{ xs: 6 }}>
                <AutoSaveField qrCode={qrCode} field="distance" label={t('qcfb.inspection.distance2Stripes', 'Dist 2 Stripes')} initialValue={data.distance} />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <AutoSaveField qrCode={qrCode} field="cyclestandard" label={t('qcfb.inspection.cycleStandard', 'Cycle Std')} initialValue={data.cycleStandard} />
              </Grid>
              <Grid size={{ xs: 4 }}>
                <AutoSaveField qrCode={qrCode} field="cycleac" label={t('qcfb.inspection.cycleActual', 'Cycle Act')} initialValue={data.cycleActual} />
              </Grid>
              <Grid size={{ xs: 4 }}>
                <AutoSaveField qrCode={qrCode} field="cyclenum" label={t('qcfb.inspection.cycleNumber', 'Cycle Num')} initialValue={data.cycleNumber} />
              </Grid>
              <Grid size={{ xs: 4 }}>
                <AutoSaveField qrCode={qrCode} field="cyclehori" label={t('qcfb.inspection.cycleHorizontal', 'Hori')} initialValue={data.cycleHori} />
              </Grid>
              <Grid size={{ xs: 4 }}>
                <AutoSaveField qrCode={qrCode} field="cyclever" label={t('qcfb.inspection.cycleVertical', 'Ver')} initialValue={data.cycleVer} />
              </Grid>
            </>
          )}

          <Grid size={{ xs: 6 }}>
             <AutoSaveField qrCode={qrCode} field="uppallet" label={t('qcfb.inspection.pallet', 'Pallet')} initialValue={data.pallet} type="text" />
          </Grid>
          <Grid size={{ xs: 12 }}>
             <AutoSaveField qrCode={qrCode} field="upnote" label={t('qcfb.inspection.note', 'Note')} initialValue={data.note} type="text" />
          </Grid>
        </Grid>

        <Divider sx={{ my: 3, borderColor: 'rgba(0,0,0,0.05)' }} />
        <Box sx={{ display: 'flex', justifyContent: 'space-evenly', alignItems: 'center' }}>
          <PassFailButton label={t('qcfb.inspection.colorCheck', 'Color Check')} field="color" value={data.colorApp} onChange={onColorChange} />
          <PassFailButton label={t('qcfb.inspection.handfeel', 'Handfeel Check')} field="handfeel" value={data.handfeel} onChange={onHandfeelChange} />
        </Box>
      </CardContent>
    </Card>
  );
}
