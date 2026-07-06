/**
 * Tracking Page for Fabric WH Audit Logs
 */
import { useState, useMemo } from 'react';
import { 
  Box, Typography, Paper, CircularProgress, 
  TableContainer, Table, TableHead, 
  TableRow, TableCell, TableBody, TextField, Chip,
  Pagination, Select, MenuItem, Button
} from '@mui/material';
import { 
  History as HistoryIcon, Edit as EditIcon, 
  ManageSearch as ManageSearchIcon, Event as DateIcon, Numbers as NumberIcon,
  TextFields as TextIcon, SwapHoriz as SwapIcon, DeleteOutline as DeleteIcon
} from '@mui/icons-material';
import { useToast } from '@traxeco/shared';
import { fabricInventoryService } from '../services/fabricInventoryService';
import { useTranslation } from 'react-i18next';

/**
 * Standard colors per action
 */
const getActionStyle = (action: string, detail: string = '') => {
  const key = (action + ' ' + detail).toLowerCase();
  
  if (key.includes('delete')) return { color: '#ef4444', bg: '#fef2f2', icon: <DeleteIcon fontSize="small" /> };
  if (key.includes('relax') || key.includes('date') || key.includes('time')) return { color: '#0ea5e9', bg: '#e0f2fe', icon: <DateIcon fontSize="small" /> };
  if (key.includes('balance') || key.includes('length') || key.includes('width') || key.includes('nw') || key.includes('gw') || key.includes('number')) return { color: '#f57c00', bg: '#fff3e0', icon: <NumberIcon fontSize="small" /> };
  if (key.includes('location')) return { color: '#8b5cf6', bg: '#f5f3ff', icon: <SwapIcon fontSize="small" /> };
  if (key.includes('comment') || key.includes('note') || key.includes('name') || key.includes('text') || key.includes('col')) return { color: '#10b981', bg: '#ecfdf5', icon: <TextIcon fontSize="small" /> };
  if (key.includes('edit') || key.includes('update')) return { color: '#0ea5e9', bg: '#e0f2fe', icon: <EditIcon fontSize="small" /> };
  
  return { color: '#6b7280', bg: '#f3f4f6', icon: <HistoryIcon fontSize="small" /> };
};

export default function TrackingPage() {
  const { showToast } = useToast();
  const { t } = useTranslation();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false); // Initially false since we don't load immediately
  const [filter, setFilter] = useState('');
  
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);

  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fabricInventoryService.getAuditLogs(fromDate, toDate);
      setLogs(data);
      if (data.length > 0) showToast(t('tracking.loadSuccess', { count: data.length }), 'success');
      else showToast(t('tracking.noData'), 'warning');
    } catch (err: any) {
      showToast(err.message || t('tracking.loadError'), 'error');
    } finally {
      setLoading(false);
    }
  };

  // Removed useEffect on mount so it doesn't load immediately

  // Filter logs locally
  const filteredLogs = useMemo(() => {
    if (!filter) return logs;
    const lowerFilter = filter.toLowerCase();
    return logs.filter(l => 
      (l.Username || '').toLowerCase().includes(lowerFilter) ||
      (l.Action || '').toLowerCase().includes(lowerFilter) ||
      (l.QrCode || '').toLowerCase().includes(lowerFilter) ||
      (l.Detail || '').toLowerCase().includes(lowerFilter)
    );
  }, [logs, filter]);

  const pagedLogs = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredLogs.slice(start, start + rowsPerPage);
  }, [filteredLogs, page, rowsPerPage]);

  return (
    <Box sx={{ px: 1, py: 0.5, flex: 1, height: '100%', overflowY: 'auto', minHeight: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
<Box sx={{ flexShrink: 0, display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
</Box>      <Paper elevation={0} sx={{ flexShrink: 0, borderRadius: 2, border: '1px solid #e0e0e0', overflow: 'hidden' }}>
        <Box sx={{
          p: 1, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap',
          background: 'linear-gradient(135deg, #f5f5f5 0%, #fafafa 100%)',
          borderBottom: '1px solid #e8e8e8',
        }}>
          <TextField
            type="date"
            size="small"
            label={t('history.fromDate', 'From Date')}
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ width: 140, '& .MuiOutlinedInput-root': { backgroundColor: '#fff', borderRadius: 2, borderColor: '#e2e8f0' } }}
          />

          <TextField
            type="date"
            size="small"
            label={t('history.toDate', 'To Date')}
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ width: 140, '& .MuiOutlinedInput-root': { backgroundColor: '#fff', borderRadius: 2, borderColor: '#e2e8f0' } }}
          />

          <TextField 
            size="small" 
            placeholder={t('tracking.localFilter', 'Local filter (who, action, target)...')} 
            value={filter} 
            onChange={e => { setFilter(e.target.value); setPage(0); }}
            InputProps={{ startAdornment: <ManageSearchIcon sx={{ color: '#94a3b8', mr: 1, fontSize: '1.2rem' }} /> }}
            sx={{ flex: '1 1 200px', maxWidth: 400, '& .MuiOutlinedInput-root': { backgroundColor: '#fff', borderRadius: 2, borderColor: '#e2e8f0' } }}
          />

          <Button variant="contained" startIcon={!loading ? <ManageSearchIcon /> : undefined} onClick={loadData}
            disabled={loading} disableElevation
            sx={{
              borderRadius: '12px', fontWeight: 700, px: 2.5, height: 32, fontSize: '0.8rem', backgroundColor: '#2e7d32',
              '&:hover': { backgroundColor: '#1b5e20' }, marginLeft: 'auto', textTransform: 'none',
              boxShadow: '0 2px 8px rgba(46,125,50,0.25)'
            }}>
            {loading ? <CircularProgress size={24} color="inherit" /> : t('printQr.searchBtn', 'Search')}
          </Button>
        </Box>
      </Paper>

      <Paper elevation={0} sx={{ flexGrow: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', borderRadius: 2, border: '1px solid #e2e8f0' }}>
        <TableContainer sx={{ flexGrow: 1 }}>
          <Table stickyHeader size="small" sx={{
            '& .MuiTableCell-root': { fontSize: '12px', py: 0.75, px: 1, borderColor: '#f0f0f0' },
            '& .MuiTableBody-root .MuiTableRow-root': { bgcolor: '#fff' },
            '& .MuiTableBody-root .MuiTableRow-root:nth-of-type(even)': { bgcolor: '#fafbfc' },
            '& .MuiTableBody-root .MuiTableRow-root:hover': { bgcolor: '#e8f5e9 !important' }
          }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, bgcolor: '#f8fafc', width: 60, borderBottom: '2px solid #e2e8f0', color: '#334155' }}>#</TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: '#f8fafc', width: 150, borderBottom: '2px solid #e2e8f0', color: '#334155' }}>When</TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: '#f8fafc', width: 120, borderBottom: '2px solid #e2e8f0', color: '#334155' }}>Who (User)</TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: '#f8fafc', width: 150, borderBottom: '2px solid #e2e8f0', color: '#334155' }}>Action</TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: '#f8fafc', width: 150, borderBottom: '2px solid #e2e8f0', color: '#334155' }}>Target</TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#334155' }}>Details</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={32} />
                  </TableCell>
                </TableRow>
              ) : pagedLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    {t('tracking.noDataHint')}
                  </TableCell>
                </TableRow>
              ) : (
                pagedLogs.map((log, idx) => {
                  const style = getActionStyle(log.Action, log.Detail);
                  return (
                    <TableRow key={log.LogId || idx} hover sx={{ transition: 'background-color 0.15s' }}>
                      <TableCell>{page * rowsPerPage + idx + 1}</TableCell>
                      <TableCell sx={{ color: 'text.secondary', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                        {log.CreatedAt ? (() => {
                          const d = new Date(log.CreatedAt);
                          if (isNaN(d.getTime())) return log.CreatedAt;
                          const p = (n: number) => n.toString().padStart(2, '0');
                          return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
                        })() : ''}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{log.Username}</TableCell>
                      <TableCell>
                        <Chip
                          icon={style.icon}
                          label={log.Action}
                          size="small"
                          sx={{ 
                            bgcolor: style.bg, color: style.color, 
                            fontWeight: 600, borderRadius: 1.5,
                            '& .MuiChip-icon': { color: style.color }
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{log.QrCode}</TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ 
                          maxWidth: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' 
                        }}>
                          {log.Detail}
                        </Typography>
                        {/* If there's old->new value change, display it explicitly if not present in detail */}
                        {log.OldValue !== null && log.OldValue !== undefined && log.OldValue !== 'N/A' && (
                          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                            Value: <span style={{textDecoration:'line-through'}}>{log.OldValue === '' ? '(empty)' : log.OldValue}</span> &rarr; <span style={{color:'#10b981', fontWeight: 600}}>{log.NewValue === '' ? '(empty)' : log.NewValue}</span>
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <Box sx={{ flexShrink: 0, borderTop: '1px solid #e2e8f0', bgcolor: '#fff', p: 1, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" sx={{ color: '#475569', fontWeight: 500 }}>{t('history.rowsPerPage', 'Rows / page:')}</Typography>
            <Select
              size="small"
              value={rowsPerPage}
              onChange={(e) => {
                const val = Number(e.target.value);
                setRowsPerPage(val);
                setPage(0);
              }}
              sx={{ height: 32, fontSize: '0.875rem' }}
            >
              {[15, 30, 50, 100].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
            </Select>
            <Typography variant="body2" sx={{ color: '#64748b', ml: 1 }}>
              {filteredLogs.length > 0 ? page * rowsPerPage + 1 : 0}-{Math.min((page + 1) * rowsPerPage, filteredLogs.length)} / {filteredLogs.length}
            </Typography>
          </Box>
          <Pagination
            count={Math.ceil(filteredLogs.length / rowsPerPage) || 1}
            page={page + 1}
            onChange={(_, newPage) => setPage(newPage - 1)}
            shape="rounded"
            showFirstButton
            showLastButton
            siblingCount={1}
            boundaryCount={1}
            size="medium"
            sx={{
              '& .MuiPagination-ul': { flexWrap: 'nowrap' },
              '& .MuiPaginationItem-root.Mui-selected': { bgcolor: '#2e7d32', color: '#fff', '&:hover': { bgcolor: '#1b5e20' } }
            }}
          />
        </Box>
      </Paper>
    </Box>
  );
}

