import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Typography, Box, Alert,
  Tabs, Tab, IconButton, Paper
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import PrintIcon from '@mui/icons-material/Print';
import SaveIcon from '@mui/icons-material/Save';
import { useTranslation } from 'react-i18next';
import { ZEBRA_IP_KEY } from '../services/zebraPrinterService';
import SpecialPropertyManager from './SpecialPropertyManager';

interface RDSettingsDialogProps {
  open: boolean;
  onClose: () => void;
  initialTab?: number;
}

const RDSettingsDialog: React.FC<RDSettingsDialogProps> = ({
  open,
  onClose,
  initialTab = 0,
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [printerIp, setPrinterIp] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (open) {
      setPrinterIp(localStorage.getItem(ZEBRA_IP_KEY) || '');
      setSaved(false);
      setActiveTab(initialTab);
    }
  }, [open, initialTab]);

  const handleSavePrinter = () => {
    localStorage.setItem(ZEBRA_IP_KEY, printerIp);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
    }, 2500);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      PaperProps={{
        sx: {
          borderRadius: 3,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column'
        }
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <Typography variant="h6" fontWeight={700}>
          {t('rdMaterial.settings_title', 'Cài đặt (Settings)')}
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, val) => setActiveTab(val)}
          sx={{
            minHeight: 44,
            '& .MuiTab-root': {
              minHeight: 44,
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.875rem',
              py: 1,
            }
          }}
        >
          <Tab
            icon={<LocalOfferIcon sx={{ fontSize: 18 }} />}
            iconPosition="start"
            label={t('rdMaterial.settings_tab_special_properties', 'Thuộc tính Sample Tag')}
          />
          <Tab
            icon={<PrintIcon sx={{ fontSize: 18 }} />}
            iconPosition="start"
            label={t('rdMaterial.settings_tab_printer', 'Máy in Zebra (WiFi)')}
          />
        </Tabs>
      </Box>

      <DialogContent dividers sx={{ p: 2.5, flexGrow: 1, overflowY: 'auto' }}>
        {/* Tab 0: Special Properties Management */}
        {activeTab === 0 && (
          <SpecialPropertyManager />
        )}

        {/* Tab 1: Zebra WiFi Printer Configuration */}
        {activeTab === 1 && (
          <Box sx={{ maxWidth: 540, mx: 'auto', py: 2 }}>
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, bgcolor: '#f8fafc' }}>
              <Typography variant="subtitle1" fontWeight={700} color="#0f172a" mb={0.5}>
                {t('rdMaterial.printer_config_title', 'Cấu hình Máy in Nhãn (Zebra WiFi)')}
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={2.5}>
                {t('rdMaterial.printer_config_desc', 'Nhập địa chỉ IP của máy in Zebra trong mạng nội bộ để có thể in từ máy tính bảng/điện thoại.')}
              </Typography>

              <TextField
                fullWidth
                size="small"
                label={t('rdMaterial.printer_ip_label', 'Printer IP Address')}
                placeholder="e.g. 192.168.1.100"
                value={printerIp}
                onChange={(e) => setPrinterIp(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSavePrinter();
                  }
                }}
                sx={{ mb: 2, bgcolor: '#ffffff' }}
              />

              {saved && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  {t('rdMaterial.printer_config_saved', 'Đã lưu cấu hình!')}
                </Alert>
              )}

              <Button
                variant="contained"
                startIcon={<SaveIcon sx={{ fontSize: 18 }} />}
                onClick={handleSavePrinter}
                sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
              >
                {t('rdMaterial.save_settings', 'Lưu cài đặt')}
              </Button>
            </Paper>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 2.5, py: 1.5 }}>
        <Button
          onClick={onClose}
          variant="outlined"
          sx={{ color: 'text.secondary', textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
        >
          {t('rdMaterial.close', 'Đóng')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RDSettingsDialog;
