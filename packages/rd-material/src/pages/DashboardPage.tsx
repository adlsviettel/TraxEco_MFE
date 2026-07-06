import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, Card, Grid, Typography, Avatar, Chip, Divider } from '@mui/material';
import TextureIcon from '@mui/icons-material/Texture';
import ExtensionIcon from '@mui/icons-material/Extension';
import CheckroomIcon from '@mui/icons-material/Checkroom';
import LinearScaleIcon from '@mui/icons-material/LinearScale';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import WarehouseIcon from '@mui/icons-material/Warehouse';

const BASE = '/rd-material';

// STATS is now moved inside the component to use state

const QUICK_ACTIONS = [
  { label: 'Scan In / Out', icon: <QrCodeScannerIcon />, path: `${BASE}/scan`, color: '#16a34a' },
  { label: 'View Inventory', icon: <WarehouseIcon />, path: `${BASE}/fabric`, color: '#2563eb' },
];

import { authService } from '@traxeco/shared';
import { useTranslation } from 'react-i18next';
import { rdItemApi } from '../services/rdMaterialApi';
import { useEffect, useState } from 'react';

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [error, setError] = useState<string | null>(null);
  const [counts, setCounts] = useState<{ [key: string]: string }>({
    M1: '--', M2: '--', M3: '--', M4: '--'
  });

  useEffect(() => {
    const loadCounts = async () => {
      try {
        const [fabric, accessory, yardage, product] = await Promise.all([
          rdItemApi.getAll({ itemType: 'FABRIC', size: 1 }).catch(() => ({ totalElements: 0 })),
          rdItemApi.getAll({ itemType: 'ACCESSORY', size: 1 }).catch(() => ({ totalElements: 0 })),
          rdItemApi.getAll({ itemType: 'YARDAGE', size: 1 }).catch(() => ({ totalElements: 0 })),
          rdItemApi.getAll({ itemType: 'PRODUCT', size: 1 }).catch(() => ({ totalElements: 0 })),
        ]);
        setCounts({
          M1: fabric.totalElements?.toString() || '0',
          M2: accessory.totalElements?.toString() || '0',
          M3: yardage.totalElements?.toString() || '0',
          M4: product.totalElements?.toString() || '0',
        });
      } catch (err) {
        console.error(err);
        setError('Không thể tải dữ liệu dashboard');
      }
    };
    loadCounts();
  }, []);

  const STATS = [
    { label: 'Fabric Hanger', value: counts.M1, icon: <TextureIcon />, iconBg: '#dcfce7', iconColor: '#16a34a', path: `${BASE}/fabric`, tag: 'M1' },
    { label: 'Accessories', value: counts.M2, icon: <ExtensionIcon />, iconBg: '#dbeafe', iconColor: '#2563eb', path: `${BASE}/accessory`, tag: 'M2' },
    { label: 'Sample Yardage', value: counts.M3, icon: <LinearScaleIcon />, iconBg: '#f3e8ff', iconColor: '#9333ea', path: `${BASE}/yardage`, tag: 'M3' },
    { label: 'Products & Mockups', value: counts.M4, icon: <CheckroomIcon />, iconBg: '#fff7ed', iconColor: '#ea580c', path: `${BASE}/product`, tag: 'M4' },
  ];

  if (!authService.hasPageAccess('rd_dashboard')) {
    return null; // Leave rendering to RDLayout's auto-redirect
  }

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {/* Page Header */}
      <Box sx={{ mb: 4 }}>
        <Box display="flex" alignItems="center" gap={1} mb={0.5}>
          <TrendingUpIcon sx={{ color: '#3ba55c', fontSize: 20 }} />
          <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {t('rdMaterial.dashboard_overview', 'Overview')}
          </Typography>
        </Box>
        <Typography variant="h5" fontWeight={800} color="text.primary">{t('rdMaterial.dashboard', 'Bảng điều khiển')}</Typography>
        <Typography variant="body2" color="text.secondary" mt={0.5}>
          {t('rdMaterial.dashboard_desc', 'Tổng quan kho vật liệu R&D — ')}{new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </Typography>
      </Box>

      {/* Stat Cards */}
      <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.06em', mb: 1.5, display: 'block' }}>
        {t('rdMaterial.modules', 'Các phân hệ')}
      </Typography>
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {STATS.map((s) => (
          <Grid size={{ xs: 6, sm: 6, md: 4, lg: 3 }} key={s.label}>
            <Card
              elevation={0}
              onClick={() => navigate(s.path)}
              sx={{
                p: 2.5,
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
                cursor: 'pointer',
                transition: 'all 0.18s ease',
                '&:hover': {
                  borderColor: '#3ba55c',
                  boxShadow: '0 4px 20px rgba(59,165,92,0.12)',
                  transform: 'translateY(-2px)',
                },
              }}
            >
              <Box display="flex" alignItems="flex-start" justifyContent="space-between" mb={2}>
                <Avatar
                  sx={{
                    bgcolor: s.iconBg,
                    width: 44, height: 44,
                    borderRadius: 2,
                    '& svg': { color: s.iconColor, fontSize: 22 },
                  }}
                >
                  {s.icon}
                </Avatar>
                <Chip
                  label={s.tag}
                  size="small"
                  sx={{ height: 20, fontSize: 10, fontWeight: 700, color: 'text.secondary', bgcolor: '#f1f5f9' }}
                />
              </Box>
              <Typography variant="h4" fontWeight={800} color="text.primary" lineHeight={1} mb={0.5}>
                {s.value}
              </Typography>
              <Typography variant="body2" color="text.secondary" fontWeight={500}>
                {t(s.label.toLowerCase().replace(/ /g, '_'), s.label)}
              </Typography>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Divider sx={{ mb: 3 }} />

      {/* Quick Actions */}
      <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.06em', mb: 1.5, display: 'block' }}>
        {t('rdMaterial.quick_actions', 'Tác vụ nhanh')}
      </Typography>
      <Box display="flex" gap={1.5} flexWrap="wrap">
        {QUICK_ACTIONS.map((a) => (
          <Card
            key={a.label}
            elevation={0}
            onClick={() => navigate(a.path)}
            sx={{
              p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 1.5,
              transition: 'all 0.15s',
              '&:hover': { borderColor: a.color, bgcolor: '#f8faf9' },
            }}
          >
            <Box sx={{ color: a.color, display: 'flex' }}>{a.icon}</Box>
            <Typography fontWeight={600} fontSize={13}>{a.label}</Typography>
          </Card>
        ))}
      </Box>
    </Box>
  );
};

export default DashboardPage;
