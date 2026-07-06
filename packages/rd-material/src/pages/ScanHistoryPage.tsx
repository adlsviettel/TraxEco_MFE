import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, InputAdornment, IconButton,
  TableContainer, Table, TableHead, TableRow, TableCell, TableBody,
  Pagination, Chip, Select, MenuItem, Menu, CircularProgress, Dialog, DialogContent,
  useMediaQuery
} from '@mui/material';
import type { Theme } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import ClearIcon from '@mui/icons-material/Clear';
import SyncIcon from '@mui/icons-material/Sync';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ImageIcon from '@mui/icons-material/Image';
import { rdItemApi } from '../services/rdMaterialApi';
import type { ScanLog } from '../types';
import { useTranslation } from 'react-i18next';
import { AdvancedFilterDrawer, AppButton, AppTextField } from '@traxeco/shared';

const ScanHistoryPage: React.FC = () => {
  const { t } = useTranslation();
  const isMobile = useMediaQuery((theme: Theme) => theme.breakpoints.down('sm'));
  
  const todayStr = new Date().toISOString().split('T')[0];
  
  const [logs, setLogs] = useState<ScanLog[]>([]);
  const [keyword, setKeyword] = useState('');
  const [itemType, setItemType] = useState('ALL');
  const [actionType, setActionType] = useState('ALL');
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(false);
  
  const [filterOpen, setFilterOpen] = useState(false);
  const activeFiltersCount = (itemType !== 'ALL' ? 1 : 0) + (actionType !== 'ALL' ? 1 : 0);
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);
  
  const [mobileMenuAnchor, setMobileMenuAnchor] = useState<null | HTMLElement>(null);

  const fetchLogs = async (options?: { forceLoading?: boolean }) => {
    const force = options?.forceLoading === true;
    const silent = !force && logs.length > 0;
    
    if (!silent) setLoading(true);
    try {
      const res = await rdItemApi.searchScanLogs({
        keyword: keyword || undefined,
        itemType: itemType !== 'ALL' ? itemType : undefined,
        actionType: actionType !== 'ALL' ? actionType : undefined,
        startDate: startDate ? `${startDate}T00:00:00.000` : undefined,
        endDate: endDate ? `${endDate}T23:59:59.999` : undefined,
        page,
        size: rowsPerPage
      });
      setLogs(res?.content || []);
      setTotalPages(res?.totalPages || 1);
      setTotalElements(res?.totalElements || 0);
    } catch (err) {
      console.error(err);
      if (!silent) setLogs([]);
    } finally {
      if (!silent) setLoading(false);
    }
  };



  useEffect(() => {
    fetchLogs();
  }, [page, keyword, rowsPerPage]);

  const [exporting, setExporting] = useState(false);
  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await rdItemApi.searchScanLogs({
        keyword: keyword || undefined,
        itemType: itemType !== 'ALL' ? itemType : undefined,
        actionType: actionType !== 'ALL' ? actionType : undefined,
        startDate: startDate ? `${startDate}T00:00:00.000` : undefined,
        endDate: endDate ? `${endDate}T23:59:59.999` : undefined,
        page: 0,
        size: 10000
      });
      const { exportScanLogsToExcel } = await import('../utils/excelExport');
      exportScanLogsToExcel(res?.content || [], t);
    } catch (err) {
      console.error(err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Box sx={{ flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>

      {/* 🚀 Toolbar Area 🚀 */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, alignItems: { lg: 'center' }, justifyContent: 'space-between', gap: 2, mb: 3 }}>
        
        {/* Left Section: Search & Filters */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', width: { xs: '100%', lg: 'auto' }, pt: { xs: 1, lg: 0 } }}>
          
          {/* Sub-group 1: Search & Mobile Icons */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: { xs: '1 1 100%', sm: '0 1 auto' }, minWidth: 200, flexWrap: 'nowrap' }}>
            <AppTextField placeholder={t('rdMaterial.search_placeholder', 'Search by name, code...')}
              value={keyword} debounceMs={400} onDebounceChange={setKeyword}
              InputProps={{
                startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 20, color: '#707975' }} /></InputAdornment>,
                endAdornment: keyword ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setKeyword('')}><ClearIcon sx={{ fontSize: 16 }} /></IconButton>
                  </InputAdornment>
                ) : null,
              }}
              sx={{ flex: 1, width: '100%', minWidth: { xs: 0, sm: 200 }, maxWidth: { xs: 'none', sm: 280, md: 320 } }}
            />

            {/* Mobile Action Icons */}
            <Box sx={{ display: { xs: 'flex', sm: 'none' }, alignItems: 'center', gap: 0.5 }}>
              <IconButton 
                onClick={() => { setPage(0); fetchLogs({ forceLoading: true }); }}
                sx={{ bgcolor: '#e8f5e9', color: '#2e7d32', width: 40, height: 40, borderRadius: '50%' }}
              >
                <SyncIcon sx={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
              </IconButton>
              
              <IconButton 
                onClick={() => setFilterOpen(true)}
                sx={{ 
                  bgcolor: activeFiltersCount > 0 ? 'rgba(46,125,50,0.1)' : '#f8fafc', 
                  color: activeFiltersCount > 0 ? '#2e7d32' : '#64748b', 
                  width: 40, height: 40, borderRadius: '50%' 
                }}
              >
                <FilterListIcon />
              </IconButton>

              <IconButton 
                onClick={(e) => setMobileMenuAnchor(e.currentTarget)}
                sx={{ bgcolor: '#f8fafc', color: '#64748b', width: 40, height: 40, borderRadius: '50%' }}
              >
                <MoreVertIcon />
              </IconButton>
            </Box>
          </Box>

          {/* Sub-group 2: Date Filters */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'nowrap', flex: { xs: '1 1 100%', sm: '0 1 auto' } }}>
            <AppTextField type="date" label={t('history.fromDate', 'From Date')} value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setPage(0); }}
              sx={{ flex: { xs: 1, sm: 'none' }, width: { sm: 145 } }}
              InputLabelProps={{ shrink: true }}
            />
            <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>-</Typography>
            <AppTextField type="date" label={t('history.toDate', 'To Date')} value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setPage(0); }}
              sx={{ flex: { xs: 1, sm: 'none' }, width: { sm: 145 } }}
              InputLabelProps={{ shrink: true }}
            />
          </Box>

          {/* Sub-group 3: Actions (Desktop) */}
          <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 1.5, flexWrap: 'nowrap' }}>
            <AppButton variant="outlined" customVariant="secondary"
              onClick={() => setFilterOpen(true)}
              startIcon={<FilterListIcon sx={{ fontSize: '20px !important' }} />}
              sx={{ 
                height: 40,
                ...(activeFiltersCount > 0 && { 
                  borderColor: '#2e7d32', 
                  color: '#2e7d32', 
                  bgcolor: 'rgba(46,125,50,0.05)',
                  '&:hover': { bgcolor: 'rgba(46,125,50,0.1)', borderColor: '#2e7d32' }
                })
              }}
            >
              {t('rdMaterial.filter', 'Filter')}{activeFiltersCount > 0 ? ` (${activeFiltersCount})` : ''}
            </AppButton>

            <AppButton variant="contained" customVariant="primary"
              disabled={loading}
              startIcon={
                <SyncIcon sx={{ 
                  fontSize: '20px !important',
                  animation: loading ? 'spin 1s linear infinite' : 'none',
                  '@keyframes spin': {
                    '0%': { transform: 'rotate(0deg)' },
                    '100%': { transform: 'rotate(360deg)' }
                  }
                }} />
              }
              onClick={() => {
                setPage(0); 
                fetchLogs({ forceLoading: true });
              }}
              sx={{ height: 40 }}
            >
              {loading ? t('common.loading', 'Loading...') : t('common.search', 'Search')}
            </AppButton>
          </Box>
        </Box>

        {/* Right Section: Actions */}
        <Box sx={{ 
          display: { xs: 'none', sm: 'flex' },
          alignItems: 'center', 
          gap: 1.5, 
          flexWrap: 'nowrap', 
          justifyContent: 'space-between', 
          flex: { xs: '1 1 100%', sm: '0 0 auto' },
          mt: { xs: 1, sm: 0 }
        }}>
          <Box sx={{ color: '#2e7d32', fontSize: 13, fontWeight: 500, bgcolor: 'rgba(46,125,50,0.1)', px: 1.5, py: 0.5, borderRadius: '8px', lineHeight: '30px', height: 40, display: 'flex', alignItems: 'center' }}>
            {loading ? t('common.loading', 'Loading...') : `${logs.length} ${t('common.records', 'records')}`}
          </Box>

          <AppButton variant="outlined" customVariant="primary"
            disabled={exporting || logs.length === 0}
            onClick={handleExport}
            startIcon={
              <FileDownloadIcon sx={{ 
                fontSize: '20px !important',
                animation: exporting ? 'bounce 1s infinite' : 'none',
              }} />
            }
            sx={{ 
              display: { xs: 'none', sm: 'flex' },
              height: 40,
              '@keyframes bounce': {
                '0%, 100%': { transform: 'translateY(0)' },
                '50%': { transform: 'translateY(3px)' }
              }
            }}
          >
            {exporting ? t('rdMaterial.exporting', 'Exporting...') : t('rdMaterial.export', 'Export')}
          </AppButton>
        </Box>
      </Box>

      {/* Filter Drawer */}
      <AdvancedFilterDrawer
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        hasActiveFilters={activeFiltersCount > 0}
        onClear={() => { setItemType('ALL'); setActionType('ALL'); setPage(0); }}
        onApply={() => { setFilterOpen(false); fetchLogs({ forceLoading: true }); }}
      >
        <Box>
          <Typography variant="caption" color="text.secondary" fontWeight={600} mb={0.5} display="block">{t('rdMaterial.materialType', 'MATERIAL TYPE').toUpperCase()}</Typography>
          <Select
            fullWidth size="small"
            value={itemType}
            onChange={(e) => { setItemType(e.target.value); setPage(0); }}
            sx={{ borderRadius: 1.5, fontSize: 14, bgcolor: '#fff' }}
          >
            <MenuItem value="ALL">{t('common.all', 'All')}</MenuItem>
            <MenuItem value="FABRIC">{t('rdMaterial.fabric', 'Fabric Hanger')}</MenuItem>
            <MenuItem value="ACCESSORY">{t('rdMaterial.accessories', 'Accessories')}</MenuItem>
            <MenuItem value="YARDAGE">{t('rdMaterial.yardage', 'Sample Yardage')}</MenuItem>
            <MenuItem value="PRODUCT">{t('rdMaterial.garment', 'Garment / Mockup')}</MenuItem>
          </Select>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary" fontWeight={600} mb={0.5} display="block">{t('rdMaterial.action', 'ACTION').toUpperCase()}</Typography>
          <Select
            fullWidth size="small"
            value={actionType}
            onChange={(e) => { setActionType(e.target.value); setPage(0); }}
            sx={{ borderRadius: 1.5, fontSize: 14, bgcolor: '#fff' }}
          >
            <MenuItem value="ALL">{t('common.all', 'All')}</MenuItem>
            <MenuItem value="IN">{t('rdMaterial.scanIn', 'Scan In')}</MenuItem>
            <MenuItem value="OUT">{t('rdMaterial.scanOut', 'Scan Out')}</MenuItem>
          </Select>
        </Box>
      </AdvancedFilterDrawer>

      {/* 🚀 Table 🚀 */}
      <Paper elevation={0} sx={{ flexGrow: 1, width: '100%', overflow: 'hidden', borderRadius: '12px', border: '1px solid #e1e3e4', boxShadow: '0px 4px 20px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', bgcolor: '#fff' }}>
        {isMobile ? (
          <Box sx={{ flexGrow: 1, minHeight: 0, overflowY: 'auto', p: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5, bgcolor: '#f8fafc' }}>
            {loading ? (
              <Box sx={{ py: 6, display: 'flex', justifyContent: 'center' }}><CircularProgress size={28} color="primary" /></Box>
            ) : logs.length > 0 ? logs.map((log) => {
              const isOut = log.actionType === 'OUT' || log.action === 'SCAN_OUT';
              return (
                <Box key={log.id} sx={{ bgcolor: '#fff', borderRadius: 3, p: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', display: 'flex', gap: 2, border: '1px solid #e2e8f0' }}>
                  {/* Left: Image */}
                  <Box 
                    onClick={() => log.photoUrl && setPreviewPhotoUrl(log.photoUrl)}
                    sx={{ width: 64, height: 64, borderRadius: 2, overflow: 'hidden', flexShrink: 0, bgcolor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: log.photoUrl ? 'pointer' : 'default' }}
                  >
                    {log.photoUrl ? (
                      <img src={rdItemApi.getImageUrl(log.photoUrl)} alt="img" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <ImageIcon sx={{ color: '#cbd5e1' }} />
                    )}
                  </Box>
                  {/* Right: Info */}
                  <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5, gap: 1 }}>
                      <Typography sx={{ fontWeight: 700, color: '#1e293b', fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {log.itemName || '–'}
                      </Typography>
                      <Typography sx={{ color: '#64748b', fontSize: 11, flexShrink: 0, mt: 0.25 }}>
                        {new Date(log.scannedAt).toLocaleString('vi-VN')}
                      </Typography>
                    </Box>
                    <Typography sx={{ color: '#64748b', fontSize: 13, mb: 1.5, fontWeight: 500 }}>{log.itemCode || '–'}</Typography>
                    
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Chip label={isOut ? 'SCAN OUT' : 'SCAN IN'} size="small" sx={{ height: 22, fontSize: 10, fontWeight: 700, bgcolor: isOut ? '#fef2f2' : '#f0fdf4', color: isOut ? '#b91c1c' : '#16a34a' }} />
                      <Chip label={`Qty: ${log.qtyChanged}`} size="small" sx={{ height: 22, fontSize: 11, fontWeight: 600, bgcolor: isOut ? 'rgba(185,28,28,0.1)' : 'rgba(22,163,74,0.1)', color: isOut ? '#b91c1c' : '#16a34a' }} />
                      <Chip label={log.holder || log.scannedBy || 'Unknown'} size="small" sx={{ height: 22, fontSize: 11, bgcolor: '#f1f5f9', color: '#475569', maxWidth: 100 }} />
                    </Box>
                    {log.note && <Typography sx={{ fontSize: 12, color: '#94a3b8', mt: 1, fontStyle: 'italic', borderTop: '1px dashed #e2e8f0', pt: 1 }}>{log.note}</Typography>}
                  </Box>
                </Box>
              );
            }) : (
              <Typography textAlign="center" color="text.secondary" sx={{ py: 6 }}>{t('common.no_records_found', 'No records found.')}</Typography>
            )}
          </Box>
        ) : (
          <TableContainer sx={{ flexGrow: 1, minHeight: 0 }}>
          <Table stickyHeader size="small" sx={{ minWidth: 1000 }}>
            <TableHead>
              <TableRow>
                {[t('rdMaterial.time', 'Time'), t('rdMaterial.action', 'Action'), t('rdMaterial.itemCode', 'Item Code'), t('rdMaterial.itemName', 'Item Name'), t('rdMaterial.qty', 'Qty'), t('rdMaterial.personInCharge', 'PIC / Borrower'), t('rdMaterial.notes', 'Notes'), t('rdMaterial.proofImage', 'Proof Image')].map((h, i) => {
                  const isCenter = h === t('rdMaterial.qty', 'Qty') || h === t('rdMaterial.action', 'Action');
                  return (
                    <TableCell key={i} sx={{
                      fontWeight: 700, fontSize: 11, color: '#707975',
                      textTransform: 'uppercase', letterSpacing: '0.05em',
                      bgcolor: '#F9FAFA', borderBottom: '1px solid #e1e3e4',
                      py: 2, px: 2, textAlign: isCenter ? 'center' : 'left'
                    }}>
                      {h}
                    </TableCell>
                  );
                })}
              </TableRow>
            </TableHead>
            <TableBody sx={{ '& tr:nth-of-type(even)': { bgcolor: '#fff' }, '& tr:nth-of-type(odd)': { bgcolor: '#fff' }, opacity: loading ? 0.6 : 1, transition: 'opacity 0.2s' }}>
              {loading ? (
                <TableRow><TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                  <CircularProgress size={28} color="primary" />
                </TableCell></TableRow>
              ) : logs.length > 0 ? logs.map((log) => {
                const isOut = log.actionType === 'OUT' || log.action === 'SCAN_OUT';
                return (
                  <TableRow 
                    key={log.id} hover
                    sx={{ 
                      '&:last-child td': { border: 0 },
                      bgcolor: '#fff',
                      transition: 'background-color 0.2s',
                      '&:hover': { bgcolor: '#F9FAFA !important' }
                    }}
                  >
                    <TableCell sx={{ py: 1.5, px: 2, fontSize: 13, color: '#3f4945' }}>{new Date(log.scannedAt).toLocaleString('vi-VN')}</TableCell>
                    <TableCell sx={{ py: 1.5, textAlign: 'center' }}>
                      <Chip
                        size="small"
                        label={isOut ? 'SCAN OUT' : 'SCAN IN'}
                        sx={{ 
                          fontWeight: 700, fontSize: 11, height: 22,
                          bgcolor: isOut ? '#fef2f2' : '#f0fdf4',
                          color: isOut ? '#b91c1c' : '#16a34a'
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ py: 1.5, fontSize: 13, fontFamily: 'monospace', color: '#1a73e8', fontWeight: 500 }}>{log.itemCode || '–'}</TableCell>
                    <TableCell sx={{ py: 1.5, fontSize: 13, fontWeight: 500, color: '#191c1d' }}>{log.itemName}</TableCell>
                    <TableCell sx={{ py: 1.5, textAlign: 'center' }}>
                      <Box sx={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', px: 1.25, py: 0.5, borderRadius: '6px', bgcolor: isOut ? 'rgba(185,28,28,0.1)' : 'rgba(22,163,74,0.1)', color: isOut ? '#b91c1c' : '#16a34a', fontFamily: 'monospace', fontSize: 13, fontWeight: 800, minWidth: 36 }}>
                        {log.qtyChanged}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ py: 1.5, fontSize: 13, color: '#3f4945' }}>{log.holder || log.scannedBy || '–'}</TableCell>
                    <TableCell sx={{ py: 1.5, fontSize: 13, color: '#707975' }}>{log.note || '–'}</TableCell>
                    <TableCell sx={{ py: 1.5 }}>
                      {log.photoUrl ? (
                        <Box 
                          onClick={() => setPreviewPhotoUrl(log.photoUrl || null)}
                          sx={{ 
                            width: 32, height: 32, borderRadius: 1, overflow: 'hidden', border: '1px solid #e1e3e4', cursor: 'pointer',
                            transition: 'transform 0.15s', '&:hover': { transform: 'scale(1.1)' }, display: 'inline-block'
                          }}
                        >
                          <img src={rdItemApi.getImageUrl(log.photoUrl)} alt="Evidence" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </Box>
                      ) : (
                        '–'
                      )}
                    </TableCell>
                  </TableRow>
                );
              }) : (
                <TableRow><TableCell colSpan={8} align="center" sx={{ py: 6, color: 'text.secondary' }}>Không tìm thấy giao dịch nào phù hợp.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        )}
        {/* Table Footer / Pagination */}
        <Box sx={{ 
          borderTop: '1px solid #e1e3e4', 
          px: { xs: 1, sm: 3 }, 
          py: 1, 
          bgcolor: '#fff', 
          display: 'flex', 
          flexDirection: 'row',
          alignItems: 'center', 
          gap: { xs: 0.5, sm: 2 },
          justifyContent: 'space-between', 
          flexShrink: 0 
        }}>
          <Typography variant="body2" color="#3f4945" fontWeight={500} fontSize={{ xs: 11, sm: 13 }} sx={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
            <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>
              Total: {totalElements}
            </Box>
            <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
              Showing {totalElements === 0 ? 0 : page * rowsPerPage + 1} - {Math.min((page + 1) * rowsPerPage, totalElements)} of {totalElements}
            </Box>
          </Typography>
          <Pagination
            count={totalPages}
            page={page + 1}
            onChange={(_, p) => setPage(p - 1)}
            color="primary"
            shape="rounded"
            size="small"
            siblingCount={0}
            boundaryCount={1}
            sx={{ 
              flexShrink: 1,
              '& .MuiPaginationItem-root': { 
                color: '#3f4945', 
                fontSize: { xs: 11, sm: 14 },
                height: { xs: 24, sm: 32 },
                minWidth: { xs: 24, sm: 32 },
                '&.Mui-selected': { bgcolor: '#2e7d32', color: '#fff', '&:hover': { bgcolor: '#1b6d24' } } 
              } 
            }}
          />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#3f4945', fontSize: { xs: 11, sm: 12 }, flexShrink: 0 }}>
            <Select
              value={rowsPerPage}
              onChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(0); }}
              size="small"
              sx={{ height: 24, fontSize: 11, bgcolor: '#f3f4f5', '& fieldset': { border: 'none' }, '&:hover fieldset': { border: '1px solid #bfc9c4' } }}
            >
              {[15, 30, 50, 100].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
            </Select>
          </Box>
        </Box>
      </Paper>

      {/* Preview Dialog */}
      <Dialog open={!!previewPhotoUrl} onClose={() => setPreviewPhotoUrl(null)} maxWidth="md" fullWidth>
        <DialogContent sx={{ p: 0, bgcolor: '#0f172a', display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative', minHeight: 200 }}>
          <IconButton
            onClick={() => setPreviewPhotoUrl(null)}
            sx={{ position: 'absolute', top: 12, right: 12, color: '#fff', bgcolor: 'rgba(0,0,0,0.5)', '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' }, zIndex: 10 }}
          >
            <CloseIcon />
          </IconButton>
          {previewPhotoUrl && (
            <img
              src={rdItemApi.getImageUrl(previewPhotoUrl)}
              alt="Preview Evidence"
              style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain', display: 'block' }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Mobile Actions Menu */}
      <Menu
        anchorEl={mobileMenuAnchor}
        open={Boolean(mobileMenuAnchor)}
        onClose={() => setMobileMenuAnchor(null)}
        PaperProps={{ sx: { minWidth: 150, borderRadius: 2, mt: 1, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' } }}
      >
        <MenuItem 
          onClick={() => { setMobileMenuAnchor(null); handleExport(); }} 
          disabled={exporting || logs.length === 0} 
          sx={{ gap: 1.5, py: 1.5 }}
        >
          <FileDownloadIcon sx={{ color: '#2e7d32', fontSize: 20 }} />
          <Typography variant="body2" fontWeight={500}>{exporting ? t('rdMaterial.exporting', 'Exporting...') : t('rdMaterial.exportExcel', 'Export Excel')}</Typography>
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default ScanHistoryPage;
