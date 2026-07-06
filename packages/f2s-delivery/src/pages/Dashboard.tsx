import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Typography, Paper, CircularProgress, Alert, Grid } from '@mui/material';
import {
  LocalShipping as DeliveryIcon,
  PrecisionManufacturing as AutoIcon,
  HandshakeOutlined as ManualIcon,
  Inventory2 as BoxIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, Legend, ResponsiveContainer
} from 'recharts';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  gradient: string;
}

function StatCard({ title, value, icon, color, gradient }: StatCardProps) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 3, borderRadius: 3,
        border: '1px solid #eee',
        display: 'flex', alignItems: 'center', gap: 2,
        transition: 'all 0.2s ease',
        '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 8px 25px rgba(0,0,0,0.08)' },
      }}
    >
      <Box sx={{
        width: 52, height: 52, borderRadius: 2.5,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: gradient, color: '#fff',
      }}>
        {icon}
      </Box>
      <Box>
        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {title}
        </Typography>
        <Typography variant="h4" sx={{ fontWeight: 800, color, lineHeight: 1.2 }}>
          {value}
        </Typography>
      </Box>
    </Paper>
  );
}

export default function Dashboard() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8100/api'}/f2s/dashboard/stats`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else {
        const errData = await response.json().catch(()=>({}));
        setError(errData.message || t('f2s.dashboard.errorStats'));
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // Auto refresh every 3 minutes
    const interval = setInterval(fetchStats, 180000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress color="success" />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>
    );
  }

  const totalDelivered = (stats?.autoTotal || 0) + (stats?.manualTotal || 0);
  const autoPercent = totalDelivered > 0 ? Math.round(((stats?.autoTotal || 0) / totalDelivered) * 100) : 0;

  return (
    <Box sx={{ minWidth: 0, overflow: 'hidden' }}>


      {/* Top STATS */}
      <Paper elevation={0} sx={{ p: { xs: 2, sm: 3 }, borderRadius: 4, bgcolor: 'transparent', mb: 3 }}>
        <Grid container spacing={2.5}>
          <Grid size={{ xs: 6, sm: 6, md: 3 }}>
          <StatCard
            title={t('f2s.dashboard.totalToday')}
            value={totalDelivered}
            icon={<BoxIcon />}
            color="#2e7d32"
            gradient="linear-gradient(135deg, #66bb6a, #2e7d32)"
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 6, md: 3 }}>
          <StatCard
            title={t('f2s.dashboard.autoAGV')}
            value={stats?.autoTotal || 0}
            icon={<AutoIcon />}
            color="#1565c0"
            gradient="linear-gradient(135deg, #42a5f5, #1565c0)"
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 6, md: 3 }}>
          <StatCard
            title={t('f2s.dashboard.manualDelivered')}
            value={stats?.manualTotal || 0}
            icon={<ManualIcon />}
            color="#e65100"
            gradient="linear-gradient(135deg, #ff9800, #e65100)"
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 6, md: 3 }}>
          <StatCard
            title={t('f2s.dashboard.automationRate')}
            value={`${autoPercent}%`}
            icon={<TrendingUpIcon />}
            color="#7b1fa2"
            gradient="linear-gradient(135deg, #ab47bc, #7b1fa2)"
          />
        </Grid>
      </Grid>
      </Paper>

      <Paper elevation={0} sx={{ p: { xs: 2, sm: 3 }, borderRadius: 4, bgcolor: 'transparent', mb: 3 }}>
        <Grid container spacing={3} sx={{ mt: 1 }}>
          {/* Hourly Chart */}
        <Grid size={{ xs: 12, lg: 8 }}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #e0e0e0', height: 400 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#334155', mb: 2 }}>
              {t('f2s.dashboard.hourlyChart')}
            </Typography>
            <ResponsiveContainer width="100%" height="85%">
              <LineChart data={Array.isArray(stats?.hourlyChart) ? stats.hourlyChart : []} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dx={-10} />
                <ChartTooltip
                  contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  labelStyle={{ fontWeight: 700, color: '#334155' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: 10, fontSize: 14 }} />
                <Line type="monotone" dataKey="auto" name={t('f2s.dashboard.autoLabel')} stroke="#2196f3" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="manual" name={t('f2s.dashboard.manualLabel')} stroke="#ff9800" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Top 5 Lines */}
        <Grid size={{ xs: 12, lg: 4 }}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #e0e0e0', height: 400 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#334155', mb: 2 }}>
              {t('f2s.dashboard.topLines')}
            </Typography>
            <ResponsiveContainer width="100%" height="85%">
              <BarChart data={Array.isArray(stats?.topLines) ? stats.topLines : []} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis dataKey="LineName" type="category" axisLine={false} tickLine={false} tick={{ fill: '#334155', fontWeight: 600, fontSize: 13 }} />
                <ChartTooltip
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="total" name={t('f2s.dashboard.cartonsExported')} fill="#10b981" radius={[0, 4, 4, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
}
