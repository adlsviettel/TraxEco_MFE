import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Tabs, Tab, TextField,
  Button, Alert, Breadcrumbs, Link, useTheme, useMediaQuery
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import PrintIcon from '@mui/icons-material/Print';
import SaveIcon from '@mui/icons-material/Save';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import WifiIcon from '@mui/icons-material/Wifi';
import DevicesIcon from '@mui/icons-material/Devices';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ZEBRA_IP_KEY } from '../services/zebraPrinterService';
import SpecialPropertyManager from '../components/SpecialPropertyManager';

export const RDSettingsPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [activeTab, setActiveTab] = useState(0);
  const [printerIp, setPrinterIp] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setPrinterIp(localStorage.getItem(ZEBRA_IP_KEY) || '');
  }, []);

  const handleSavePrinter = () => {
    localStorage.setItem(ZEBRA_IP_KEY, printerIp);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
    }, 2500);
  };

  return (
    <Box
      sx={{
        p: { xs: 1.5, sm: 2, md: 2.5 },
        width: '100%',
        boxSizing: 'border-box'
      }}
    >
      {/* Header & Breadcrumbs in one line */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: 2,
              bgcolor: 'rgba(46, 125, 50, 0.1)',
              color: '#2e7d32',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <SettingsIcon sx={{ fontSize: 22 }} />
          </Box>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="h6" fontWeight={700} color="#0f172a" sx={{ letterSpacing: -0.2 }}>
                {t('rdMaterial.settings_title', 'Cài đặt (Settings)')}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', md: 'inline' } }}>
                • {t('rdMaterial.settings_desc', 'Quản lý thuộc tính nhãn in Sample Tag và cấu hình thiết bị máy in nội bộ.')}
              </Typography>
            </Box>
          </Box>
        </Box>

        <Breadcrumbs
          separator={<NavigateNextIcon fontSize="inherit" sx={{ color: 'text.disabled', fontSize: '0.8rem' }} />}
          sx={{ '& .MuiBreadcrumbs-li': { fontSize: '0.8rem' } }}
        >
          <Link
            underline="hover"
            color="inherit"
            onClick={() => navigate('/rd-material/fabric')}
            sx={{ cursor: 'pointer', fontWeight: 500 }}
          >
            {t('rdMaterial.title', 'R&D Material')}
          </Link>
          <Typography color="text.primary" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>
            {t('rdMaterial.settings_title', 'Settings')}
          </Typography>
        </Breadcrumbs>
      </Box>

      {/* Main Settings Card */}
      <Paper
        elevation={0}
        variant="outlined"
        sx={{
          borderRadius: 2.5,
          overflow: 'hidden',
          bgcolor: '#ffffff',
          border: '1px solid #e2e8f0'
        }}
      >
        {/* Tabs Bar */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: { xs: 0.5, sm: 2.5 }, bgcolor: '#f8fafc' }}>
          <Tabs
            value={activeTab}
            onChange={(_, val) => setActiveTab(val)}
            variant={isMobile ? 'fullWidth' : 'standard'}
            sx={{
              minHeight: 48,
              '& .MuiTab-root': {
                minHeight: 48,
                textTransform: 'none',
                fontWeight: 600,
                fontSize: { xs: '0.8rem', sm: '0.875rem' },
                color: '#64748b',
                gap: 0.75,
                px: { xs: 1.5, sm: 2.5 },
                '&.Mui-selected': {
                  color: '#2e7d32',
                  fontWeight: 700
                }
              },
              '& .MuiTabs-indicator': {
                backgroundColor: '#2e7d32',
                height: 3,
                borderRadius: '3px 3px 0 0'
              }
            }}
          >
            <Tab
              icon={<LocalOfferIcon sx={{ fontSize: 18 }} />}
              iconPosition="start"
              label={isMobile ? t('rdMaterial.settings_tab_special_props_short', 'Thuộc tính Tag') : t('rdMaterial.settings_tab_special_properties', 'Thuộc tính Sample Tag')}
            />
            <Tab
              icon={<PrintIcon sx={{ fontSize: 18 }} />}
              iconPosition="start"
              label={isMobile ? t('rdMaterial.settings_tab_printer_short', 'Máy in Zebra') : t('rdMaterial.settings_tab_printer', 'Máy in Zebra (WiFi)')}
            />
          </Tabs>
        </Box>

        {/* Tab Content */}
        <Box sx={{ p: { xs: 2, sm: 2.5 } }}>
          {/* Tab 0: Special Properties Management */}
          {activeTab === 0 && (
            <SpecialPropertyManager />
          )}

          {/* Tab 1: Zebra Printer WiFi Configuration */}
          {activeTab === 1 && (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', lg: '440px 1fr' },
                gap: 3,
                alignItems: 'start'
              }}
            >
              {/* Left Column: Printer Config Form */}
              <Paper variant="outlined" sx={{ p: 3, borderRadius: 2.5, bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                  <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: 'rgba(46, 125, 50, 0.1)', color: '#2e7d32', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <WifiIcon sx={{ fontSize: 20 }} />
                  </Box>
                  <Typography variant="subtitle1" fontWeight={700} color="#0f172a">
                    {t('rdMaterial.printer_config_title', 'Cấu hình Máy in Nhãn (Zebra WiFi)')}
                  </Typography>
                </Box>
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
                  <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>
                    {t('rdMaterial.printer_config_saved', 'Đã lưu cấu hình!')}
                  </Alert>
                )}

                <Button
                  variant="contained"
                  startIcon={<SaveIcon sx={{ fontSize: 18 }} />}
                  onClick={handleSavePrinter}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 600,
                    borderRadius: 2,
                    px: 3,
                    py: 0.85,
                    bgcolor: '#2e7d32',
                    '&:hover': { bgcolor: '#1b5e20' }
                  }}
                >
                  {t('rdMaterial.save_settings', 'Lưu cài đặt')}
                </Button>
              </Paper>

              {/* Right Column: Connection Guide & Compatibility */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <Paper variant="outlined" sx={{ p: 3, borderRadius: 2.5, bgcolor: '#ffffff', border: '1px solid #e2e8f0' }}>
                  <Typography variant="subtitle1" fontWeight={700} color="#0f172a" mb={2} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    💡 {t('rdMaterial.printer_guide_title', 'Hướng dẫn kết nối Máy in Zebra')}
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                      <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: '#e2e8f0', color: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, flexShrink: 0 }}>1</Box>
                      <Typography variant="body2" color="text.secondary">
                        {t('rdMaterial.printer_guide_step1', 'Kết nối máy in Zebra vào mạng WiFi/LAN nội bộ của nhà máy.')}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                      <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: '#e2e8f0', color: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, flexShrink: 0 }}>2</Box>
                      <Typography variant="body2" color="text.secondary">
                        {t('rdMaterial.printer_guide_step2', 'In tem cấu hình mạng từ máy in để lấy địa chỉ IP (VD: 192.168.1.105).')}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                      <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: '#e2e8f0', color: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, flexShrink: 0 }}>3</Box>
                      <Typography variant="body2" color="text.secondary">
                        {t('rdMaterial.printer_guide_step3', 'Đảm bảo thiết bị (Tablet, Điện thoại hoặc PC) cùng kết nối vào chung mạng WiFi/LAN với máy in.')}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                      <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: '#e2e8f0', color: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, flexShrink: 0 }}>4</Box>
                      <Typography variant="body2" color="text.secondary">
                        {t('rdMaterial.printer_guide_step4', 'Lệnh in nhãn sẽ được truyền trực tiếp qua cổng mạng RAW TCP 9100.')}
                      </Typography>
                    </Box>
                  </Box>
                </Paper>

                {/* Compatibility Card */}
                <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2.5, bgcolor: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 2 }}>
                  <DevicesIcon sx={{ color: '#0284c7', fontSize: 28 }} />
                  <Box>
                    <Typography variant="subtitle2" fontWeight={700} color="#0f172a" fontSize="0.825rem">
                      Dòng máy in tương thích (Zebra Compatible Devices)
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Zebra ZD220, ZD230, ZD421, ZT411, ZT421 và các máy in hỗ trợ giao thức ZPL qua cổng RAW 9100.
                    </Typography>
                  </Box>
                </Paper>
              </Box>
            </Box>
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default RDSettingsPage;
