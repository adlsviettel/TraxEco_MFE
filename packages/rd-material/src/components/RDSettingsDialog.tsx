import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Typography, Box, Alert
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { ZEBRA_IP_KEY } from '../services/zebraPrinterService';

interface RDSettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

const RDSettingsDialog: React.FC<RDSettingsDialogProps> = ({ open, onClose }) => {
  const { t } = useTranslation();
  const [printerIp, setPrinterIp] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (open) {
      setPrinterIp(localStorage.getItem(ZEBRA_IP_KEY) || '');
      setSaved(false);
    }
  }, [open]);

  const handleSave = () => {
    localStorage.setItem(ZEBRA_IP_KEY, printerIp);
    setSaved(true);
    setTimeout(() => {
      onClose();
    }, 1000);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontWeight: 700 }}>{t('rdMaterial.settings_title', 'Cài đặt (Settings)')}</DialogTitle>
      <DialogContent dividers>
        <Typography variant="subtitle2" fontWeight={600} mb={1}>
          {t('rdMaterial.printer_config_title', 'Cấu hình Máy in Nhãn (Zebra WiFi)')}
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={2}>
          {t('rdMaterial.printer_config_desc', 'Nhập địa chỉ IP của máy in Zebra trong mạng nội bộ để có thể in từ máy tính bảng/điện thoại.')}
        </Typography>
        <TextField
          fullWidth
          size="small"
          label={t('rdMaterial.printer_ip_label', 'Printer IP Address')}
          placeholder="e.g. 192.168.1.100"
          value={printerIp}
          onChange={(e) => setPrinterIp(e.target.value)}
        />
        {saved && (
          <Alert severity="success" sx={{ mt: 2 }}>
            {t('rdMaterial.printer_config_saved', 'Đã lưu cấu hình!')}
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} sx={{ color: 'text.secondary', textTransform: 'none', fontWeight: 600 }}>
          {t('rdMaterial.close', 'Đóng')}
        </Button>
        <Button variant="contained" onClick={handleSave} sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}>
          {t('rdMaterial.save_settings', 'Lưu cài đặt')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RDSettingsDialog;
