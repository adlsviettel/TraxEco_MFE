import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Button, TextField, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, CircularProgress, MenuItem,
  IconButton, Tooltip,
} from '@mui/material';
import {
  Visibility as VisIcon,
  Refresh as RefreshIcon,
  People as PeopleIcon,
  Timeline as TimelineIcon,
  Login as LoginIcon,
  TouchApp as ActionIcon,
  FiberManualRecord as DotIcon,
  ArrowBack as BackIcon,
} from '@mui/icons-material';
import { trackingService } from '@traxeco/shared';
import { useNavigate } from 'react-router-dom';

const todayStr = () => new Date().toISOString().slice(0, 10);

const ACTION_COLORS: Record<string, 'success' | 'primary' | 'warning' | 'error' | 'info' | 'default'> = {
  LOGIN: 'success',
  LOGOUT: 'error',
  PAGE_VISIT: 'info',
  CRUD: 'warning',
  BUTTON_CLICK: 'primary',
};

export default function TrackingDashboard() {
  const navigate = useNavigate();
  const [activities, setActivities] = useState<any[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Filters
  const [filterUser, setFilterUser] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterModule, setFilterModule] = useState('');
  const [fromDate, setFromDate] = useState(todayStr());
  const [toDate, setToDate] = useState(todayStr());

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { limit: '300' };
      if (filterUser) params.username = filterUser;
      if (filterAction) params.action = filterAction;
      if (filterModule) params.module = filterModule;
      if (fromDate) params.fromDate = fromDate;
      if (toDate) params.toDate = toDate;

      const [acts, online, st] = await Promise.all([
        trackingService.getActivities(params),
        trackingService.getOnlineUsers(),
        trackingService.getStats(fromDate, toDate),
      ]);
      setActivities(acts);
      setOnlineUsers(online);
      setStats(st);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filterUser, filterAction, filterModule, fromDate, toDate]);

  useEffect(() => { loadAll(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-refresh online users mỗi 30s
  useEffect(() => {
    const interval = setInterval(async () => {
      try { setOnlineUsers(await trackingService.getOnlineUsers()); } catch { /* silent */ }
    }, 30_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', '& > *:not(:last-child)': { mr: 2, mb: 2 }, mb: 3 }}>
        <Tooltip title="Quay lại">
          <IconButton onClick={() => navigate(-1)} sx={{ backgroundColor: '#f5f5f5' }}>
            <BackIcon />
          </IconButton>
        </Tooltip>
        <Typography variant="h5" sx={{ fontWeight: 800, color: '#1565c0', display: 'flex', alignItems: 'center', '& > *:not(:last-child)': { mr: 1, mb: 1 } }}>
          <VisIcon /> User Activity Tracking
        </Typography>
      </Box>

      {/* Stats Cards */}
      {stats && (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', '& > *:not(:last-child)': { mr: 2, mb: 2 }, mb: 3 }}>
          <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: '1px solid #e0e0e0', textAlign: 'center', background: 'linear-gradient(135deg, #e8f5e9, #c8e6c9)' }}>
            <PeopleIcon sx={{ fontSize: 32, color: '#2e7d32', mb: 0.5 }} />
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#2e7d32' }}>{onlineUsers.length}</Typography>
            <Typography variant="body2" color="text.secondary">Đang Online</Typography>
          </Paper>
          <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: '1px solid #e0e0e0', textAlign: 'center', background: 'linear-gradient(135deg, #e3f2fd, #bbdefb)' }}>
            <TimelineIcon sx={{ fontSize: 32, color: '#1565c0', mb: 0.5 }} />
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#1565c0' }}>{stats.totalActivities || 0}</Typography>
            <Typography variant="body2" color="text.secondary">Tổng Hoạt Động</Typography>
          </Paper>
          <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: '1px solid #e0e0e0', textAlign: 'center', background: 'linear-gradient(135deg, #fff3e0, #ffe0b2)' }}>
            <LoginIcon sx={{ fontSize: 32, color: '#e65100', mb: 0.5 }} />
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#e65100' }}>{stats.totalLogins || 0}</Typography>
            <Typography variant="body2" color="text.secondary">Lượt Đăng Nhập</Typography>
          </Paper>
          <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: '1px solid #e0e0e0', textAlign: 'center', background: 'linear-gradient(135deg, #fce4ec, #f8bbd0)' }}>
            <ActionIcon sx={{ fontSize: 32, color: '#c62828', mb: 0.5 }} />
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#c62828' }}>{stats.uniqueUsers || 0}</Typography>
            <Typography variant="body2" color="text.secondary">Unique Users</Typography>
          </Paper>
        </Box>
      )}

      {/* Online Users */}
      <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: '1px solid #c8e6c9', backgroundColor: '#f1f8e9', mb: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#2e7d32', mb: 1, display: 'flex', alignItems: 'center', '& > *:not(:last-child)': { mr: 1, mb: 1 } }}>
          <DotIcon sx={{ color: '#4caf50', fontSize: 16, animation: 'pulse 1.5s infinite' }} />
          Users Đang Online ({onlineUsers.length})
        </Typography>
        <Box sx={{ display: 'flex', '& > *:not(:last-child)': { mr: 1, mb: 1 }, flexWrap: 'wrap' }}>
          {onlineUsers.length === 0 ? (
            <Typography variant="body2" color="text.secondary">Không có ai online</Typography>
          ) : (
            onlineUsers.map((u: any, i: number) => (
              <Chip
                key={i}
                icon={<DotIcon sx={{ fontSize: '12px !important', color: '#4caf50 !important' }} />}
                label={`${u.Username} — ${u.CurrentPage || '?'}`}
                variant="outlined"
                sx={{ fontWeight: 600, borderColor: '#4caf50' }}
              />
            ))
          )}
        </Box>
      </Paper>

      {/* Search Filters */}
      <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: '1px solid #e0e0e0', mb: 3, background: '#fafafa' }}>
        <Box sx={{ display: 'flex', '& > *:not(:last-child)': { mr: 1.5, mb: 1.5 }, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField size="small" label="Username" value={filterUser} onChange={e => setFilterUser(e.target.value)}
            sx={{ minWidth: 140, '& .MuiOutlinedInput-root': { borderRadius: 1.5, backgroundColor: '#fff' } }} />
          <TextField select size="small" label="Action" value={filterAction} onChange={e => setFilterAction(e.target.value)}
            sx={{ minWidth: 140, '& .MuiOutlinedInput-root': { borderRadius: 1.5, backgroundColor: '#fff' } }}>
            <MenuItem value="">Tất cả</MenuItem>
            <MenuItem value="LOGIN">Login</MenuItem>
            <MenuItem value="LOGOUT">Logout</MenuItem>
            <MenuItem value="PAGE_VISIT">Page Visit</MenuItem>
            <MenuItem value="CRUD">CRUD</MenuItem>
          </TextField>
          <TextField select size="small" label="Module" value={filterModule} onChange={e => setFilterModule(e.target.value)}
            sx={{ minWidth: 140, '& .MuiOutlinedInput-root': { borderRadius: 1.5, backgroundColor: '#fff' } }}>
            <MenuItem value="">Tất cả</MenuItem>
            <MenuItem value="FGS_WH">FGS WH</MenuItem>
            <MenuItem value="F2S_DELIVERY">F2S Delivery</MenuItem>
            <MenuItem value="INSW">INSW</MenuItem>
            <MenuItem value="ADMIN">Admin</MenuItem>
            <MenuItem value="INVENTORY">Inventory</MenuItem>
            <MenuItem value="AUTH">Auth</MenuItem>
          </TextField>
          <TextField size="small" label="Từ ngày" type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 150, '& .MuiOutlinedInput-root': { borderRadius: 1.5, backgroundColor: '#fff' } }} />
          <TextField size="small" label="Đến ngày" type="date" value={toDate} onChange={e => setToDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 150, '& .MuiOutlinedInput-root': { borderRadius: 1.5, backgroundColor: '#fff' } }} />
          <Button variant="contained" startIcon={<RefreshIcon />} onClick={loadAll} disabled={loading}
            disableElevation sx={{ borderRadius: 1.5, fontWeight: 700, backgroundColor: '#1565c0' }}>
            Tìm
          </Button>
        </Box>
      </Paper>

      {/* Top Users + By Module (side by side) */}
      {stats && (
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', '& > *:not(:last-child)': { mr: 2, mb: 2 }, mb: 3 }}>
          <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: '1px solid #e0e0e0' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>🏆 Top Active Users</Typography>
            {(stats.topUsers || []).map((u: any, i: number) => (
              <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5, borderBottom: '1px solid #f5f5f5' }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{i + 1}. {u.Username}</Typography>
                <Chip label={u.ActivityCount} size="small" color="primary" sx={{ fontWeight: 700, minWidth: 40 }} />
              </Box>
            ))}
          </Paper>
          <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: '1px solid #e0e0e0' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>📊 Theo Module</Typography>
            {(stats.byModule || []).map((m: any, i: number) => (
              <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5, borderBottom: '1px solid #f5f5f5' }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{m.Module || 'N/A'}</Typography>
                <Chip label={m.Count} size="small" variant="outlined" sx={{ fontWeight: 700, minWidth: 40 }} />
              </Box>
            ))}
          </Paper>
        </Box>
      )}

      {/* Activity Log Table */}
      <Paper elevation={0} sx={{ borderRadius: 2, border: '1px solid #e0e0e0', overflow: 'hidden' }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, p: 2, pb: 1, color: '#455a64' }}>
          📋 Activity Log ({activities.length} records)
        </Typography>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
        ) : (
          <TableContainer sx={{ maxHeight: 500 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, backgroundColor: '#f5f5f5' }}>#</TableCell>
                  <TableCell sx={{ fontWeight: 700, backgroundColor: '#f5f5f5' }}>Username</TableCell>
                  <TableCell sx={{ fontWeight: 700, backgroundColor: '#f5f5f5' }}>Action</TableCell>
                  <TableCell sx={{ fontWeight: 700, backgroundColor: '#f5f5f5' }}>Module</TableCell>
                  <TableCell sx={{ fontWeight: 700, backgroundColor: '#f5f5f5' }}>Details</TableCell>
                  <TableCell sx={{ fontWeight: 700, backgroundColor: '#f5f5f5' }}>IP</TableCell>
                  <TableCell sx={{ fontWeight: 700, backgroundColor: '#f5f5f5' }}>Thời gian</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {activities.map((row, i) => (
                  <TableRow key={row.Id || i} hover>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{row.Username}</TableCell>
                    <TableCell>
                      <Chip label={row.Action} size="small" color={ACTION_COLORS[row.Action] || 'default'} sx={{ fontWeight: 700, fontSize: '0.75rem' }} />
                    </TableCell>
                    <TableCell>{row.Module || '-'}</TableCell>
                    <TableCell sx={{ maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {row.Details || '-'}
                    </TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{row.IpAddress}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap', fontSize: '0.85rem' }}>{row.CreatedAt}</TableCell>
                  </TableRow>
                ))}
                {activities.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">Không có dữ liệu</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Pulse animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </Box>
  );
}
