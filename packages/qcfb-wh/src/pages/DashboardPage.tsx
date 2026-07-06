import React, { useState, useMemo, useEffect } from 'react';
import {
  Box, Typography, Paper, TextField, Button, CircularProgress,
  Snackbar, Alert, Chip, Avatar, Grid, LinearProgress
} from '@mui/material';
import {
  Search as SearchIcon, 
  QrCodeScanner as QrCodeIcon,
  CheckCircleOutline as PassIcon,
  ErrorOutline as FailIcon
} from '@mui/icons-material';
import { Client } from '@stomp/stompjs';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8100/api';
const todayStr = () => new Date().toISOString().slice(0, 10);
const lastMonthStr = () => {
  const d = new Date(); d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 10);
};

// --- LUXURY STYLES ---
const luxuryShadow = '0 10px 40px -10px rgba(0,0,0,0.05)';
const luxuryBorder = '1px solid rgba(0,0,0,0.04)';
const luxuryRadius = 4;

export default function DashboardPage() {
  const [fromDate, setFromDate] = useState(lastMonthStr());
  const [toDate, setToDate] = useState(todayStr());
  const [loading, setLoading] = useState(false);

  // Raw data states
  const [dailyData, setDailyData] = useState<any[]>([]);
  const [defectData, setDefectData] = useState<any[]>([]);
  const [liveRoll, setLiveRoll] = useState<any>(null);

  // Toast
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const fetchDashboard = async (silent = false) => {
    if (!silent) setLoading(true);
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };
    const params = `fromDate=${fromDate}&toDate=${toDate}`;

    try {
      const [dailyRes, defectRes] = await Promise.allSettled([
        fetch(`${API_BASE}/qcfb/daily-report?${params}`, { headers }),
        fetch(`${API_BASE}/qcfb/report-defect?${params}`, { headers }),
      ]);

      if (dailyRes.status === 'fulfilled' && dailyRes.value.ok) setDailyData(await dailyRes.value.json());
      if (defectRes.status === 'fulfilled' && defectRes.value.ok) setDefectData(await defectRes.value.json());
    } catch (err: any) {
      setToastMsg(err.message || 'Failed to load data'); setToastOpen(true);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard(true);
    
    // Fetch latest scan on load
    const fetchLatest = async () => {
      try {
        const res = await fetch(`${API_BASE}/qc/scans/latest`);
        if (res.ok) {
          const data = await res.json();
          if (data.qrCode) {
            const rollRes = await fetch(`${API_BASE}/qc/rolls/${data.qrCode}`);
            if (rollRes.ok) setLiveRoll(await rollRes.json());
          }
        }
      } catch (err) {}
    };
    fetchLatest();

    const getWsUrl = () => {
      const apiBase = import.meta.env.VITE_API_BASE_URL || '/api';
      if (apiBase.startsWith('https://')) {
        const wsBase = apiBase.replace(/^https/, 'wss');
        return wsBase.replace(/\/api\/?$/, '') + '/ws-qc';
      } else if (apiBase.startsWith('http://')) {
        const wsBase = apiBase.replace(/^http/, 'ws');
        return wsBase.replace(/\/api\/?$/, '') + '/ws-qc';
      } else {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsPath = apiBase.replace(/\/api\/?$/, '');
        return `${protocol}//${window.location.host}${wsPath}/ws-qc`;
      }
    };

    const client = new Client({
      brokerURL: getWsUrl(),
      onConnect: () => {
        client.subscribe('/topic/qc-scans', async (message) => {
          if (message.body) {
            const code = message.body;
            fetchDashboard(true);
            try {
              const res = await fetch(`${API_BASE}/qc/rolls/${code}`);
              if(res.ok) setLiveRoll(await res.json());
            } catch (err) {}
          }
        });
      },
    });
    client.activate();
    return () => { client.deactivate(); };
  }, [fromDate, toDate]);

  // ─── SIMPLIFIED KPIs ───
  const kpis = useMemo(() => {
    const totalRolls = dailyData.length;
    const passRolls = dailyData.filter(r => r.InsptReslt === 'P').length;
    const failRolls = dailyData.filter(r => r.InsptReslt === 'F').length;
    const passRate = totalRolls > 0 ? Math.round((passRolls / totalRolls) * 100) : 0;
    
    const defectCols = ['DF1', 'DF2', 'DF3', 'DF4', 'DF5', 'DF6', 'DF7', 'DF8', 'DF9', 'DF10', 'DF11', 'DF12', 'DF13', 'DF15', 'DF21', 'DF23'];
    const defectSums: Record<string, number> = {};
    defectCols.forEach(dc => {
      defectSums[dc] = defectData.reduce((sum, row) => sum + (Number(row[dc]) || 0), 0);
    });

    const topDefects = defectCols
      .map(dc => ({ code: dc, points: defectSums[dc] || 0 }))
      .filter(d => d.points > 0)
      .sort((a, b) => b.points - a.points)
      .slice(0, 3); // Only top 3 for extreme simplicity

    return { totalRolls, passRolls, failRolls, passRate, topDefects };
  }, [dailyData, defectData]);

  return (
    <Box sx={{ p: { xs: 3, md: 5 }, flex: 1, minHeight: 0, overflowY: 'auto', bgcolor: '#FAFAFA', fontFamily: '"Inter", sans-serif' }}>
      
      {/* ─── HEADER & CLEAN FILTERS ─── */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 6 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 900, color: '#111827', letterSpacing: '-0.02em' }}>
            Quality Overview
          </Typography>
          <Typography variant="body1" sx={{ color: '#6B7280', mt: 0.5 }}>
            Minimalist executive summary of fabric inspection.
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <TextField type="date" size="small" variant="outlined" value={fromDate} onChange={e => setFromDate(e.target.value)} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#fff', '& fieldset': { borderColor: '#E5E7EB' } } }} />
          <Typography variant="body2" color="#9CA3AF">—</Typography>
          <TextField type="date" size="small" variant="outlined" value={toDate} onChange={e => setToDate(e.target.value)} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#fff', '& fieldset': { borderColor: '#E5E7EB' } } }} />
          <Button variant="contained" onClick={() => fetchDashboard(false)} disabled={loading}
            sx={{ height: 40, px: 3, borderRadius: 2, bgcolor: '#111827', color: '#fff', textTransform: 'none', fontWeight: 600, boxShadow: 'none', '&:hover': { bgcolor: '#000' } }}
          >
            {loading ? <CircularProgress size={20} color="inherit" /> : 'Apply'}
          </Button>
        </Box>
      </Box>

      {/* ─── LIVE SCAN EVENT (ELEGANT) ─── */}
      {liveRoll && (
        <Paper elevation={0} sx={{ p: 4, mb: 6, borderRadius: luxuryRadius, border: luxuryBorder, bgcolor: '#fff', boxShadow: luxuryShadow, display: 'flex', alignItems: 'center', gap: 4, position: 'relative', overflow: 'hidden' }}>
           <Box sx={{ position: 'absolute', top: 0, left: 0, width: 4, height: '100%', bgcolor: '#3B82F6', animation: 'pulse 2s infinite' }} />
           <Avatar sx={{ bgcolor: '#EFF6FF', color: '#3B82F6', width: 64, height: 64 }}><QrCodeIcon fontSize="large" /></Avatar>
           <Box sx={{ flexGrow: 1 }}>
             <Typography variant="overline" sx={{ color: '#3B82F6', fontWeight: 800, letterSpacing: 1.5 }}>
               ● Live Inspection Active
             </Typography>
             <Typography variant="h5" sx={{ color: '#111827', fontWeight: 800, mt: 0.5 }}>
               {liveRoll.materialCode} — {liveRoll.color}
             </Typography>
             <Typography variant="body1" sx={{ color: '#6B7280', mt: 0.5 }}>
               PO: {liveRoll.orderNumber} &nbsp;·&nbsp; {liveRoll.shipLength} Yds &nbsp;·&nbsp; {liveRoll.supplier}
             </Typography>
           </Box>
           {/* Live Defect Counter */}
           <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
             <Chip 
               label={`${liveRoll.defects?.length || 0} Lỗi`} 
               sx={{ fontWeight: 800, bgcolor: (liveRoll.defects?.length || 0) > 0 ? '#FEE2E2' : '#F3F4F6', color: (liveRoll.defects?.length || 0) > 0 ? '#EF4444' : '#9CA3AF', borderRadius: 2 }} 
             />
             <Typography variant="h6" sx={{ color: (liveRoll.defects?.length || 0) > 0 ? '#EF4444' : '#9CA3AF', fontWeight: 900 }}>
               +{liveRoll.defects?.reduce((sum: number, d: any) => sum + (d.defectPoint || 0), 0) || 0} Pts
             </Typography>
           </Box>
        </Paper>
      )}

      {/* ─── THE BIG METRIC (PASS RATE) ─── */}
      <Grid container spacing={4} sx={{ mb: 6 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper elevation={0} sx={{ p: 5, height: '100%', borderRadius: luxuryRadius, border: luxuryBorder, bgcolor: '#fff', boxShadow: luxuryShadow, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <Typography variant="h6" sx={{ color: '#6B7280', fontWeight: 600, mb: 2 }}>Pass Rate</Typography>
            <Typography variant="h1" sx={{ color: '#111827', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1 }}>
              {kpis.passRate}<span style={{ fontSize: '2.5rem', color: '#9CA3AF' }}>%</span>
            </Typography>
            <Box sx={{ mt: 4, width: '100%', height: 8, bgcolor: '#F3F4F6', borderRadius: 4, overflow: 'hidden' }}>
              <Box sx={{ width: `${kpis.passRate}%`, height: '100%', bgcolor: kpis.passRate >= 90 ? '#10B981' : '#F59E0B', borderRadius: 4 }} />
            </Box>
            <Typography variant="body2" sx={{ color: '#6B7280', mt: 2, fontWeight: 500 }}>
              Based on {kpis.totalRolls} total rolls inspected.
            </Typography>
          </Paper>
        </Grid>

        {/* ─── SECONDARY METRICS ─── */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, height: '100%' }}>
            
            <Paper elevation={0} sx={{ p: 4, flex: 1, borderRadius: luxuryRadius, border: luxuryBorder, bgcolor: '#fff', boxShadow: luxuryShadow, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="h6" sx={{ color: '#6B7280', fontWeight: 600, mb: 1 }}>Passed Rolls</Typography>
                <Typography variant="h3" sx={{ color: '#10B981', fontWeight: 800 }}>{kpis.passRolls}</Typography>
              </Box>
              <PassIcon sx={{ fontSize: 64, color: '#D1FAE5' }} />
            </Paper>

            <Paper elevation={0} sx={{ p: 4, flex: 1, borderRadius: luxuryRadius, border: luxuryBorder, bgcolor: '#fff', boxShadow: luxuryShadow, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="h6" sx={{ color: '#6B7280', fontWeight: 600, mb: 1 }}>Failed Rolls</Typography>
                <Typography variant="h3" sx={{ color: '#EF4444', fontWeight: 800 }}>{kpis.failRolls}</Typography>
              </Box>
              <FailIcon sx={{ fontSize: 64, color: '#FEE2E2' }} />
            </Paper>

          </Box>
        </Grid>
      </Grid>

      {/* ─── TOP DEFECTS (CLEAN LIST) ─── */}
      <Paper elevation={0} sx={{ p: 5, borderRadius: luxuryRadius, border: luxuryBorder, bgcolor: '#fff', boxShadow: luxuryShadow }}>
        <Typography variant="h6" sx={{ color: '#111827', fontWeight: 800, mb: 4 }}>Top Critical Defects</Typography>
        {kpis.topDefects.length > 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {kpis.topDefects.map((d, i) => (
              <Box key={d.code} sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <Typography variant="h5" sx={{ color: '#D1D5DB', fontWeight: 900, minWidth: 32 }}>0{i + 1}</Typography>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="body1" sx={{ color: '#111827', fontWeight: 700 }}>{d.code} Defect</Typography>
                  <LinearProgress variant="determinate" value={(d.points / kpis.topDefects[0].points) * 100} sx={{ mt: 1, height: 6, borderRadius: 3, bgcolor: '#F3F4F6', '& .MuiLinearProgress-bar': { bgcolor: '#111827', borderRadius: 3 } }} />
                </Box>
                <Typography variant="h6" sx={{ color: '#111827', fontWeight: 800 }}>{Math.round(d.points)} pts</Typography>
              </Box>
            ))}
          </Box>
        ) : (
          <Typography variant="body1" sx={{ color: '#9CA3AF' }}>No significant defects recorded.</Typography>
        )}
      </Paper>

      <Snackbar open={toastOpen} autoHideDuration={3000} onClose={() => setToastOpen(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="info" variant="standard" sx={{ bgcolor: '#111827', color: '#fff', '& .MuiAlert-icon': { color: '#fff' } }}>{toastMsg}</Alert>
      </Snackbar>
    </Box>
  );
}
