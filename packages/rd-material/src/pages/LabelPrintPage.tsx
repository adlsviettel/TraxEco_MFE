import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Card, Grid, Paper, Stack,
  Typography, Select, MenuItem, Snackbar, Alert, CircularProgress
} from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import WifiIcon from '@mui/icons-material/Wifi';
import { QRCodeSVG } from 'qrcode.react';
import { rdItemApi } from '../services/rdMaterialApi';
import { LABEL_SIZES, ZEBRA_IP_KEY, printViaZebraIp } from '../services/zebraPrinterService';
import type { Item } from '../types';
import { useTranslation } from 'react-i18next';
import { AppButton, AppTextField } from '@traxeco/shared';

const LabelPrintPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [item, setItem] = useState<Item | null>(null);
  const [sizeIdx, setSizeIdx] = useState(0);
  const [copies, setCopies] = useState(1);
  const [isPrinting, setIsPrinting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  useEffect(() => {
    if (!id) return;
    rdItemApi.getById(+id)
      .then((data) => setItem(data))
      .catch((err) => {
        console.error('Failed to load item for print:', err);
        setError('Failed to load item data');
      });
  }, [id]);

  const size = LABEL_SIZES[sizeIdx];
  let prefix = '';
  if (item?.itemType === 'FABRIC') prefix = 'FB';
  else if (item?.itemType === 'ACCESSORY') prefix = 'AC';
  else if (item?.itemType === 'YARDAGE') prefix = 'YD';
  else if (item?.itemType === 'PRODUCT') prefix = (item as any).category?.toUpperCase() === 'MOCKUP' ? 'MK' : 'GM';
  else prefix = item?.itemType?.substring(0, 2).toUpperCase() || 'IT';

  const qrValue = `${prefix}-${item?.id}`;

  const handlePrint = () => window.print();

  const handleWifiPrint = async () => {
    if (!item) return;
    const savedIp = localStorage.getItem(ZEBRA_IP_KEY);
    if (!savedIp) {
      setSnackbar({ open: true, message: 'Vui lòng cấu hình IP máy in Zebra trong mục Settings', severity: 'error' });
      return;
    }
    setIsPrinting(true);
    try {
      const zpl = size.generateZPL(item, qrValue, copies);
      await printViaZebraIp(savedIp, zpl);
      setSnackbar({ open: true, message: 'Lệnh in đã được gửi qua WiFi!', severity: 'success' });
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Failed to print', severity: 'error' });
    } finally {
      setIsPrinting(false);
    }
  };

  if (error) return <Alert severity="error" sx={{ m: 3 }}>{error}</Alert>;
  if (!item) return <Typography p={4}>{t('rdMaterial.print_loading', 'Đang tải...')}</Typography>;

  return (
    <Box>
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #label-print, #label-print * {
            visibility: visible;
          }
          #label-print {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
          }
          @page {
            margin: 0;
          }
        }
      `}</style>
      <AppButton variant="text" startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} sx={{ mb: 2 }}>
        {t('rdMaterial.print_back', 'Quay lại')}
      </AppButton>

      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="caption" color="text.secondary">Home › {item.itemType} › Label</Typography>
          <Typography variant="h5">{t('rdMaterial.print_title', 'In Label / QR Code')}</Typography>
        </Box>
        <Box display="flex" gap={1.5}>
          <AppButton variant="outlined" customVariant="secondary" startIcon={<PrintIcon />} onClick={handlePrint} sx={{ bgcolor: '#fff' }}>
            {t('rdMaterial.print_pc', 'Print (PC)')}
          </AppButton>
          <AppButton variant="contained" customVariant="primary" color="success" startIcon={isPrinting ? <CircularProgress size={20} color="inherit" /> : <WifiIcon />} onClick={handleWifiPrint} disabled={isPrinting}>
            {t('rdMaterial.print_via_wifi', 'Print via WiFi')}
          </AppButton>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Left: Item info + print settings */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Card elevation={1} sx={{ mb: 2, borderRadius: 2 }}>
            <Box sx={{ px: 2.5, py: 1.5, borderBottom: '1px solid #e0e0e0' }}>
              <Typography fontWeight={700}>{t('rdMaterial.print_item_info', 'Thông tin Item')}</Typography>
            </Box>
            <Box sx={{ p: 2.5, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
              {[
                [t('rdMaterial.itemCode', 'Item Code'), item.itemCode],
                [t('rdMaterial.name', 'Name'), item.name],
                [t('rdMaterial.itemType', 'Type'), item.itemType],
                [t('rdMaterial.supplier', 'Supplier'), item.supplierName],
                [t('rdMaterial.location', 'Location'), item.location],
                [t('rdMaterial.quantity', 'Quantity'), `${item.quantity ?? '–'}`],
              ].map(([k, v]) => (
                <Box key={k as string}>
                  <Typography fontSize={11} color="text.secondary">{k}</Typography>
                  <Typography fontWeight={600} fontSize={13}>{(v as string) ?? '–'}</Typography>
                </Box>
              ))}
              <Box sx={{ gridColumn: '1/-1' }}>
                <Typography fontSize={11} color="text.secondary">{t('rdMaterial.qr_system_id', 'Mã QR (ID hệ thống)')}</Typography>
                <Typography fontFamily="monospace" fontSize={11} sx={{ bgcolor: '#f5f5f5', p: 0.75, borderRadius: 1, border: '1px solid #e0e0e0', wordBreak: 'break-all' }}>
                  {qrValue}
                </Typography>
              </Box>
            </Box>
          </Card>

          <Card elevation={1} sx={{ borderRadius: 2 }}>
            <Box sx={{ px: 2.5, py: 1.5, borderBottom: '1px solid #e0e0e0' }}>
              <Typography fontWeight={700}>{t('rdMaterial.print_settings', 'Cài đặt in')}</Typography>
            </Box>
            <Stack spacing={2} sx={{ p: 2.5 }}>
              <Box>
                <Typography variant="caption" fontWeight={700} sx={{ textTransform: 'uppercase', color: 'text.secondary' }}>{t('rdMaterial.print_size', 'Kích thước Label')}</Typography>
                <Select fullWidth size="small" value={sizeIdx} onChange={(e) => setSizeIdx(+e.target.value)} sx={{ mt: 0.5 }}>
                  {LABEL_SIZES.map((s, i) => <MenuItem key={i} value={i}>{s.label}</MenuItem>)}
                </Select>
              </Box>
              <Box>
                <Typography variant="caption" fontWeight={700} sx={{ textTransform: 'uppercase', color: 'text.secondary' }}>{t('rdMaterial.print_copies', 'Số lượng in')}</Typography>
                <AppTextField type="number" value={copies} onChange={(e) => setCopies(+e.target.value)} inputProps={{ min: 1, max: 50 }} sx={{ mt: 0.5, width: 100 }} />
              </Box>
            </Stack>
          </Card>
        </Grid>

        {/* Right: Label preview */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Typography variant="caption" fontWeight={700} sx={{ textTransform: 'uppercase', color: 'text.secondary', mb: 1, display: 'block' }}>
            {t('rdMaterial.print_preview', 'Preview Label')}
          </Typography>
          <Paper elevation={2} sx={{ p: 2.5, borderRadius: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Box
              id="label-print"
              sx={{
                border: '2px solid #333', borderRadius: 1,
                p: 1.5, width: size.width, fontFamily: 'monospace',
              }}
            >
              <Typography fontSize={9} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1, mb: 0.5 }}>
                R&D Material Library
              </Typography>
              <Typography fontSize={14} fontWeight={800} lineHeight={1.2} mb={0.25}>{item.name}</Typography>
              <Typography fontSize={10} color="text.secondary" mb={1}>
                {item.itemCode} · {item.location} · {item.supplierName}
              </Typography>
              <Box display="flex" gap={1.5} alignItems="center">
                <QRCodeSVG value={qrValue} size={72} />
                <Box>
                  <Typography fontSize={9} color="text.secondary" lineHeight={1.8}>
                    Type: {item.itemType}<br />
                    {item.fabric?.weightGsm ? `GSM: ${item.fabric.weightGsm}` : ''}<br />
                    Qty: {item.quantity ?? '–'}<br />
                    <span style={{ fontSize: 8, color: '#aaa', wordBreak: 'break-all' }}>{qrValue}</span>
                  </Typography>
                </Box>
              </Box>
            </Box>
            <Typography fontSize={11} color="text.secondary" mt={1}>{size.label}</Typography>
          </Paper>
        </Grid>
      </Grid>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert severity={snackbar.severity} sx={{ width: '100%', borderRadius: 2 }}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default LabelPrintPage;
