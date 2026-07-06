/**
 * Fabric Warehouse — Dashboard Page
 * Landing page for the FABRIC_WH app
 */
import { useState, useEffect, useMemo } from 'react';
import { Box, Typography, Paper, CircularProgress, Chip, LinearProgress, IconButton, Avatar, Grid } from '@mui/material';
import { useTranslation } from 'react-i18next';
import {
  Inventory as InventoryIcon,
  LocalShipping as ShippingIcon,
  GppGood as QcPassIcon,
  WarningAmber as WarningIcon,
  NotificationsActive as AlertIcon,
  MoreVert as MoreVertIcon,
  Speed as SpeedIcon,
  CheckCircleOutline as CheckIcon,
  ErrorOutline as ErrorIcon,
} from '@mui/icons-material';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, 
  AreaChart, Area, Cell, PieChart, Pie, Legend
} from 'recharts';
import { fabricInventoryService } from '../services/fabricInventoryService';

// Premium styling tokens
const colors = {
  primary: '#2563eb',     // Sapphire Blue
  secondary: '#0f172a',   // Slate Titanium
  success: '#10b981',     // Emerald
  warning: '#f59e0b',     // Amber
  error: '#ef4444',       // Rose Red
  bg: '#f8fafc',          // Soft gray
  cardBorder: '1px solid #e2e8f0',
};

export default function DashboardPage() {
  const { t } = useTranslation();
  const [stats, setStats] = useState({
    totalRolls: 0,
    totalNW: 0,
    agingData: [] as any[],
    locationsData: [] as any[],
    qcPassRate: 0,
    qcFail: 0,
    qcInProcess: 0,
    relaxNotEnough: 0,
    relaxEnough: 0
  });
  const [loading, setLoading] = useState(true);

  // Derive alerts from data
  const alerts = useMemo(() => {
    const list = [];
    const over90 = stats.agingData.find(d => d.name === t('dashboard.aging.over90', '> 90 Days'))?.value || 0;
    
    if (over90 > 0) {
      list.push({ id: 1, type: 'error', icon: <WarningIcon sx={{color: colors.error}}/>, title: t('dashboard.alert.deadStock', 'Dead Stock Alert'), time: t('dashboard.time.justNow', 'Just now'), 
        desc: t('dashboard.alert.deadStockDesc', '{{count}} rolls exceeding 90 days in storage. Liquidation or clearance recommended.', { count: over90 }) });
    }
    if (stats.qcFail > 0) {
      list.push({ id: 2, type: 'warning', icon: <ErrorIcon sx={{color: colors.warning}}/>, title: t('dashboard.alert.qcFailed', 'QC Failed Rolls'), time: t('dashboard.time.4hrs', '4 hrs ago'), 
        desc: t('dashboard.alert.qcFailedDesc', '{{count}} rolls failed quality control and pending review.', { count: stats.qcFail }) });
    }
    if (stats.relaxNotEnough > 0) {
      list.push({ id: 3, type: 'info', icon: <SpeedIcon sx={{color: colors.primary}}/>, title: t('dashboard.alert.relaxing', 'Relaxing Bottleneck'), time: t('dashboard.time.12hrs', '12 hrs ago'),
        desc: t('dashboard.alert.relaxingDesc', '{{count}} rolls are currently locked in relaxing phase.', { count: stats.relaxNotEnough }) });
    }
    if (list.length === 0) {
      list.push({ id: 4, type: 'success', icon: <CheckIcon sx={{color: colors.success}}/>, title: t('dashboard.alert.optimal', 'Optimal Operation'), time: t('dashboard.time.active', 'Active'),
        desc: t('dashboard.alert.optimalDesc', 'No critical anomalies detected in the warehouse routing.') });
    }
    return list;
  }, [stats, t]);

  useEffect(() => {
    fabricInventoryService.getDashboardStats()
      .then(data => {
        const agingData = [
          { name: t('dashboard.aging.under7', '< 7 Days'), value: data.agingUnder7 || 0 },
          { name: t('dashboard.aging.8to30', '8-30 Days'), value: data.aging8to30 || 0 },
          { name: t('dashboard.aging.31to90', '31-90 Days'), value: data.aging31to90 || 0 },
          { name: t('dashboard.aging.over90', '> 90 Days'), value: data.agingOver90 || 0 }
        ];
        
        const totalQc = (data.qcPass || 0) + (data.qcFail || 0) + (data.qcInProcess || 0);
        const qcPassRate = totalQc > 0 ? ((data.qcPass || 0) / totalQc) * 100 : 0;

        setStats({
          totalRolls: data.totalRolls || 0,
          totalNW: data.totalNW || 0,
          agingData,
          locationsData: data.locationsData || [],
          qcPassRate,
          qcFail: data.qcFail || 0,
          qcInProcess: data.qcInProcess || 0,
          relaxNotEnough: data.relaxNotEnough || 0,
          relaxEnough: data.relaxEnough || 0
        });
      })
      .catch(err => console.error("Failed to load dashboard stats", err))
      .finally(() => setLoading(false));
  }, [t]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', bgcolor: colors.bg }}>
        <CircularProgress size={40} thickness={4} sx={{ color: colors.primary }} />
      </Box>
    );
  }

  // Generate fake sparkline data for organic look
  const sparklineData = Array.from({length: 12}, () => ({ value: Math.floor(Math.random() * 50) + 100 }));

  return (
    <Box sx={{ p: { xs: 2, lg: 4 }, flexGrow: 1, height: '100%', overflowY: 'auto', backgroundColor: colors.bg,
      '&::-webkit-scrollbar': { width: '6px' }, '&::-webkit-scrollbar-thumb': { background: '#cbd5e1', borderRadius: '4px' }
    }} className="animate-fade-in">
      
      {/* Header section */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Chip icon={<CheckIcon fontSize="small"/>} label={t('dashboard.systemHealthy', 'System Healthy')} color="success" size="small" sx={{ fontWeight: 700, borderRadius: 1.5 }} />
        </Box>
      </Box>

      {/* KPI Cards Grid */}
      <Paper elevation={0} sx={{ p: { xs: 2, sm: 3 }, borderRadius: 4, bgcolor: 'transparent', mb: 4 }}>
        <Grid container spacing={2}>
          {/* KPI 1 */}
          <Grid size={{ xs: 6, md: 6, lg: 3 }}>
        <Paper sx={{ p: 3, borderRadius: 3, border: colors.cardBorder, boxShadow: '0 2px 10px rgba(0,0,0,0.02)', position: 'relative', overflow: 'hidden' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="subtitle2" sx={{ color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>{t('dashboard.totalRolls', 'Total Fabric Rolls')}</Typography>
            <Avatar sx={{ bgcolor: 'rgba(37,99,235,0.1)', color: colors.primary, width: 32, height: 32 }}><InventoryIcon fontSize="small"/></Avatar>
          </Box>
          <Typography variant="h3" sx={{ fontWeight: 800, color: colors.secondary, letterSpacing: '-1px' }}>{stats.totalRolls.toLocaleString()}</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
            <Chip label="+2.4%" size="small" sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700, bgcolor: 'rgba(16,185,129,0.1)', color: colors.success }} />
            <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 500 }}>{t('dashboard.vsLastWeek', 'vs last week')}</Typography>
          </Box>
          <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 40 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparklineData}>
                <Area type="monotone" dataKey="value" stroke={colors.primary} fill="rgba(37,99,235,0.05)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </Box>
        </Paper>
      </Grid>

          {/* KPI 2 */}
          <Grid size={{ xs: 6, md: 6, lg: 3 }}>
            <Paper sx={{ p: 3, borderRadius: 3, border: colors.cardBorder, boxShadow: '0 2px 10px rgba(0,0,0,0.02)', height: '100%' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="subtitle2" sx={{ color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>{t('dashboard.totalNW', 'Total Net Weight')}</Typography>
            <Avatar sx={{ bgcolor: 'rgba(245,158,11,0.1)', color: colors.warning, width: 32, height: 32 }}><ShippingIcon fontSize="small"/></Avatar>
          </Box>
          <Typography variant="h3" sx={{ fontWeight: 800, color: colors.secondary, letterSpacing: '-1px' }}>
            {stats.totalNW.toLocaleString('en-US', {maximumFractionDigits: 0})} <span style={{fontSize: '1.2rem', color: '#94a3b8'}}>kg</span>
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
            <Chip label="+1.1%" size="small" sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700, bgcolor: 'rgba(16,185,129,0.1)', color: colors.success }} />
            <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 500 }}>{t('dashboard.vsLastWeek', 'vs last week')}</Typography>
          </Box>
            </Paper>
          </Grid>

          {/* KPI 3 */}
          <Grid size={{ xs: 6, md: 6, lg: 3 }}>
            <Paper sx={{ p: 3, borderRadius: 3, border: colors.cardBorder, boxShadow: '0 2px 10px rgba(0,0,0,0.02)', height: '100%' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="subtitle2" sx={{ color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>{t('dashboard.qcPassRate', 'QC Pass Rate')}</Typography>
            <Avatar sx={{ bgcolor: 'rgba(16,185,129,0.1)', color: colors.success, width: 32, height: 32 }}><QcPassIcon fontSize="small"/></Avatar>
          </Box>
          <Typography variant="h3" sx={{ fontWeight: 800, color: colors.secondary, letterSpacing: '-1px' }}>
            {stats.qcPassRate.toFixed(1)}%
          </Typography>
          <Box sx={{ mt: 1.5 }}>
            <LinearProgress variant="determinate" value={stats.qcPassRate} 
              sx={{ height: 6, borderRadius: 3, bgcolor: '#e2e8f0', '& .MuiLinearProgress-bar': { bgcolor: colors.success } }} />
          </Box>
            </Paper>
          </Grid>

          {/* KPI 4 */}
          <Grid size={{ xs: 6, md: 6, lg: 3 }}>
            <Paper sx={{ p: 3, borderRadius: 3, border: colors.cardBorder, boxShadow: '0 2px 10px rgba(0,0,0,0.02)', height: '100%' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="subtitle2" sx={{ color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>{t('dashboard.activeAlerts', 'Active Alerts')}</Typography>
            <Avatar sx={{ bgcolor: 'rgba(239,68,68,0.1)', color: colors.error, width: 32, height: 32 }}><AlertIcon fontSize="small"/></Avatar>
          </Box>
          <Typography variant="h3" sx={{ fontWeight: 800, color: alerts[0].type === 'success' ? colors.success : colors.error, letterSpacing: '-1px' }}>
            {alerts[0].type === 'success' ? '0' : alerts.length}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
            <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600 }}>{t('dashboard.requireAttention', 'Require immediate attention')}</Typography>
          </Box>
            </Paper>
          </Grid>
        </Grid>
      </Paper>

      {/* Main Analytics Section - Asymmetrical Grid */}
      <Paper elevation={0} sx={{ p: { xs: 2, sm: 3 }, borderRadius: 4, bgcolor: 'transparent', mb: 4 }}>
        <Grid container spacing={2}>
          {/* Left Col: Main Chart */}
          <Grid size={{ xs: 12, lg: 8 }}>
            <Paper sx={{ p: 3, borderRadius: 3, border: colors.cardBorder, boxShadow: '0 2px 10px rgba(0,0,0,0.02)', height: '100%' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, color: colors.secondary }}>{t('dashboard.agingHeatmap', 'Inventory Aging Heatmap')}</Typography>
              <Typography variant="body2" sx={{ color: '#64748b' }}>{t('dashboard.agingDesc', 'Roll frequency by days retained in warehouse')}</Typography>
            </Box>
            <IconButton size="small"><MoreVertIcon/></IconButton>
          </Box>
          <Box sx={{ height: 320 }}>
            {stats.agingData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.agingData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} />
                  <RechartsTooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', fontWeight: 600 }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={60} animationDuration={1000}>
                    {stats.agingData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={index === 3 ? colors.error : index === 2 ? colors.warning : colors.primary} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <Typography sx={{ textAlign: 'center', mt: 10 }}>{t('common.noData', 'No Data')}</Typography>}
          </Box>
            </Paper>
          </Grid>

          {/* Right Col: Actionable Alerts */}
          <Grid size={{ xs: 12, lg: 4 }}>
            <Paper sx={{ p: 3, borderRadius: 3, border: colors.cardBorder, boxShadow: '0 2px 10px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, color: colors.secondary }}>{t('dashboard.actionItems', 'Action Items')}</Typography>
            <Chip label={`${alerts.length} New`} size="small" sx={{ fontWeight: 700, bgcolor: 'rgba(37,99,235,0.1)', color: colors.primary }} />
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minHeight: 0, height: '100%', overflowY: 'auto' }}>
            {alerts.map((alert, idx) => (
              <Box key={idx} sx={{ display: 'flex', gap: 2, p: 2, borderRadius: 2, bgcolor: '#f8fafc', border: '1px solid #f1f5f9' }}>
                <Box sx={{ mt: 0.5 }}>{alert.icon}</Box>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: colors.secondary }}>{alert.title}</Typography>
                  <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mb: 0.5 }}>{alert.desc}</Typography>
                  <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600 }}>{alert.time}</Typography>
                </Box>
              </Box>
            ))}
          </Box>
            </Paper>
          </Grid>
        </Grid>
      </Paper>

      {/* Bottom Grid: Breakdown Details */}
      <Paper elevation={0} sx={{ p: { xs: 2, sm: 3 }, borderRadius: 4, bgcolor: 'transparent', mb: 4 }}>
        <Grid container spacing={2}>
          {/* Location Distribution */}
          <Grid size={{ xs: 12, lg: 6 }}>
            <Paper sx={{ p: 3, borderRadius: 3, border: colors.cardBorder, boxShadow: '0 2px 10px rgba(0,0,0,0.02)', height: '100%' }}>
          <Typography variant="h6" sx={{ fontWeight: 800, color: colors.secondary, mb: 1 }}>{t('dashboard.topLocations', 'Top Constrained Locations')}</Typography>
          <Typography variant="body2" sx={{ color: '#64748b', mb: 3 }}>{t('dashboard.locationsDesc', 'Shelves mapping by highest density')}</Typography>
          <Box sx={{ height: 280 }}>
            {stats.locationsData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.locationsData} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 700, fill: colors.secondary }} width={80} />
                  <RechartsTooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', fontWeight: 600 }} />
                  <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} maxBarSize={20} animationDuration={1000} />
                </BarChart>
              </ResponsiveContainer>
            ) : <Typography sx={{ textAlign: 'center', mt: 10 }}>{t('common.noData', 'No Data')}</Typography>}
          </Box>
            </Paper>
          </Grid>

          {/* Relaxing vs QC Status */}
          <Grid size={{ xs: 12, lg: 6 }}>
            <Paper sx={{ p: 3, borderRadius: 3, border: colors.cardBorder, boxShadow: '0 2px 10px rgba(0,0,0,0.02)', height: '100%' }}>
          <Typography variant="h6" sx={{ fontWeight: 800, color: colors.secondary, mb: 1 }}>{t('dashboard.processHealth', 'Process Health')}</Typography>
          <Typography variant="body2" sx={{ color: '#64748b', mb: 3 }}>{t('dashboard.processDesc', 'Status breakdown for Relaxing Phase')}</Typography>
          <Box sx={{ height: 280, display: 'flex', alignItems: 'center' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={[
                    { name: t('dashboard.relax.cleared', 'Cleared standards'), value: stats.relaxEnough, color: colors.success },
                    { name: t('dashboard.relax.below', 'Below standards'), value: stats.relaxNotEnough, color: colors.warning }
                  ].filter(d => d.value > 0)} 
                  cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={4} dataKey="value" stroke="none"
                >
                  {[
                    { name: t('dashboard.relax.cleared', 'Cleared standards'), value: stats.relaxEnough, color: colors.success },
                    { name: t('dashboard.relax.below', 'Below standards'), value: stats.relaxNotEnough, color: colors.warning }
                  ].filter(d => d.value > 0).map((ent, idx) => (
                    <Cell key={idx} fill={ent.color} />
                  ))}
                </Pie>
                <RechartsTooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', fontWeight: 600 }} />
                <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: '13px', fontWeight: 600, color: '#475569' }} />
              </PieChart>
            </ResponsiveContainer>
          </Box>
            </Paper>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
}
