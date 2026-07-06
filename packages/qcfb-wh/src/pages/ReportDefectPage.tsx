import React, { useState, useMemo, useEffect } from 'react';
import {
  Box, Typography, Paper, TextField, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  CircularProgress, Snackbar, Alert,
  Pagination, Select, MenuItem
} from '@mui/material';
import {
  Search as SearchIcon,
  FileDownload as FileDownloadIcon
} from '@mui/icons-material';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { useTranslation } from 'react-i18next';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8100/api';

const todayStr = () => {
  const d = new Date();
  return d.toISOString().slice(0, 10);
};

const lastMonthStr = () => {
  const d = new Date();
  d.setMonth(d.getMonth() - 4); // Based on sql dateadd -4
  return d.toISOString().slice(0, 10);
};

let pageCache: any = null;

const COLUMNS = [
  'InvDate', 'DateCheck', 'SupCode', 'InvoiceNo', 'OrderNumber', 'RollItem',
  'Color', 'BatchNo', 'Job', 'Syle', 'OrdQty', 'AllocateQty', 'Width', 'WidthAc',
  'YdsRcv', 'RollRcv', 'YdsCheck', 'RollCheck', 'Handfeel', 'ColorApp', 'GSM',
  'StandardMS', 'AcMs', 'Yds20PO', 'Point', 'PointAgv', 'FBTime', 'atadate',
  'Description', 'Season', 'DF1', 'DF2', 'DF3', 'DF4', 'DF5', 'DF6', 'DF7', 'DF8',
  'DF9', 'DF10', 'DF11', 'DF12', 'DF13', 'DF15', 'DF21', 'DF23'
];

const ReportDefectPage: React.FC = () => {
  const { t } = useTranslation();
  // Filters
  const [fromDate, setFromDate] = useState(pageCache?.fromDate || lastMonthStr());
  const [toDate, setToDate] = useState(pageCache?.toDate || todayStr());
  const [invoiceNo, setInvoiceNo] = useState(pageCache?.invoiceNo || '');
  const [poNo, setPoNo] = useState(pageCache?.poNo || '');
  const [itemNo, setItemNo] = useState(pageCache?.itemNo || '');

  // Data
  const [data, setData] = useState<any[]>(pageCache?.data || []);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Pagination
  const [page, setPage] = useState(pageCache?.page || 0);
  const [rowsPerPage, setRowsPerPage] = useState(pageCache?.rowsPerPage || 50);

  // Cache Update
  pageCache = { fromDate, toDate, invoiceNo, poNo, itemNo, data, page, rowsPerPage };

  const paginatedData = useMemo(() => {
    return data.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [data, page, rowsPerPage]);

  // Toast
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [toastSeverity, setToastSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('success');

  const showToast = (msg: string, severity: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    setToastMsg(msg);
    setToastSeverity(severity);
    setToastOpen(true);
  };

  const handleSearch = async () => {
    try {
      setLoading(true);
      const q = new URLSearchParams();
      if (fromDate) q.append('fromDate', fromDate);
      if (toDate) q.append('toDate', toDate);
      if (invoiceNo) q.append('invoiceNo', invoiceNo);
      if (poNo) q.append('poNo', poNo);
      if (itemNo) q.append('itemNo', itemNo);

      const requestUrl = `${API_BASE}/qcfb/report-defect?${q.toString()}`;


      const response = await fetch(requestUrl, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch data');

      const result: any[] = await response.json();
      setData(result || []);
      setPage(0);

      if (!result || result.length === 0) {
        showToast(t('qcfb.noDataFound', 'Không tìm thấy dữ liệu!'), 'warning');
      } else {
        showToast(t('qcfb.loadSuccess', 'Tải thành công {{count}} dòng báo cáo', { count: result.length }), 'success');
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || t('qcfb.errorFetch', 'Lỗi khi tải dữ liệu!'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const exportExcel = async () => {
    if (!data || data.length === 0) {
      showToast(t('qcfb.noDataToExport', 'Không có dữ liệu để xuất!'), 'warning');
      return;
    }

    try {
      const headersRow = new Array(61).fill('');
      headersRow[0] = 'DateCheck';
      headersRow[1] = 'Rcv Date';
      headersRow[2] = 'Time (Days)';
      headersRow[3] = 'SupCode';
      headersRow[4] = 'InvoiceNo';
      headersRow[6] = 'OrderNumber';
      headersRow[7] = 'RollItem';
      headersRow[8] = 'Color 1';
      headersRow[9] = 'Color 2';
      headersRow[10] = 'Season';
      headersRow[11] = 'Job';
      headersRow[12] = 'Style';
      headersRow[13] = 'OrdQty';
      headersRow[14] = 'AllocateQty';
      headersRow[15] = 'Diff Qty';
      headersRow[16] = 'YdsRcv';
      headersRow[17] = 'RollRcv';
      headersRow[18] = 'YdsCheck';
      headersRow[19] = 'RollCheck';
      headersRow[20] = 'Yds %';
      headersRow[21] = 'Roll %';
      headersRow[22] = 'BatchNo';
      headersRow[23] = 'Width';
      headersRow[24] = 'WidthAc';
      headersRow[25] = 'Width Diff';
      headersRow[26] = 'Point/Yds20PO';
      headersRow[27] = 'DF9';
      headersRow[29] = 'DF12';
      headersRow[30] = 'DF8';
      headersRow[31] = 'DF5';
      headersRow[32] = 'DF11';
      headersRow[33] = 'DF10';
      headersRow[34] = 'DF21';
      headersRow[35] = 'DF2';
      headersRow[36] = 'DF1';
      headersRow[37] = 'DF7';
      headersRow[38] = 'DF23';
      headersRow[39] = 'DF13';
      headersRow[40] = 'DF15';
      headersRow[44] = 'PointAgv';
      headersRow[45] = 'Yds20PO';
      headersRow[49] = 'Handfeel';
      headersRow[52] = 'ColorApp';
      headersRow[54] = 'StandardMS';
      headersRow[55] = 'AcMs';
      headersRow[56] = 'Result MS';
      headersRow[57] = 'Extracted GSM';
      headersRow[58] = 'System GSM';
      headersRow[59] = 'Result GSM';
      headersRow[60] = 'Description';

      const mapData = data.map((row) => {
        const out = new Array(61).fill('');
        out[0] = row.DateCheck || '';
        out[1] = row.atadate || '';
        if (row.DateCheck && row.atadate) {
          const checktime = new Date(row.DateCheck);
          const rcvtime = new Date(row.atadate);
          if (!isNaN(checktime.getTime()) && !isNaN(rcvtime.getTime())) {
            out[2] = Math.floor((checktime.getTime() - rcvtime.getTime()) / (1000 * 3600 * 24));
          }
        }

        out[3] = row.SupCode || '';
        out[4] = row.InvoiceNo || '';
        out[6] = row.OrderNumber || '';
        out[7] = row.RollItem || '';

        if (row.Color) {
          const cTrim = row.Color.trim();
          const lastSpaceIdx = cTrim.lastIndexOf(' ');
          if (lastSpaceIdx === -1) {
            out[8] = cTrim;
          } else {
            out[8] = cTrim.substring(lastSpaceIdx + 1).trim();
            out[9] = cTrim.substring(0, lastSpaceIdx).trim();
          }
        }

        out[10] = row.Season || row.season || '';
        out[11] = row.Job || '';
        out[12] = row.Syle || '';

        const oQty = parseFloat(row.OrdQty);
        const aQty = parseFloat(row.AllocateQty);
        if (!isNaN(oQty)) out[13] = oQty;
        if (!isNaN(aQty)) out[14] = aQty;
        if (!isNaN(oQty) && !isNaN(aQty)) out[15] = oQty - aQty;

        let n9 = 0;
        if (row.YdsRcv && row.YdsRcv !== 'Notcheck') n9 = parseFloat(row.YdsRcv); else if (row.YdsRcv === 'Notcheck') out[16] = row.YdsRcv;
        if (n9 > 0 || row.YdsRcv === '0') out[16] = n9;

        if (row.RollRcv) out[17] = parseInt(row.RollRcv, 10);

        let p9 = 0;
        if (row.YdsCheck !== 'Notcheck' && row.YdsCheck) p9 = parseFloat(String(row.YdsCheck).replace(',', '.')); else if (row.YdsCheck === 'Notcheck') out[18] = row.YdsCheck;
        if (p9 > 0 || row.YdsCheck === '0') out[18] = p9;

        out[19] = row.RollCheck || 'Notcheck';

        if (n9 !== 0 && !isNaN(p9)) out[20] = parseFloat((p9 / n9 * 100).toFixed(1));

        const rRcv = parseFloat(row.RollRcv);
        const rChk = parseFloat(row.RollCheck);
        if (row.RollRcv !== 'Notcheck' && row.RollCheck !== 'Notcheck' && !isNaN(rRcv) && !isNaN(rChk) && rRcv !== 0) {
          out[21] = parseFloat((rChk / rRcv * 100).toFixed(1));
        }

        out[22] = row.BatchNo || '';

        const w = parseFloat(row.Width);
        if (!isNaN(w)) out[23] = w;
        const wAc = parseFloat(row.WidthAc);
        if (!isNaN(wAc)) out[24] = wAc; else if (row.WidthAc === 'Notcheck') out[24] = 'Notcheck';
        if (!isNaN(w) && !isNaN(wAc) && row.WidthAc !== 'Notcheck') out[25] = wAc - w;

        if (row.Point) out[26] = parseInt(row.Point, 10);
        if (row.Yds20PO) out[26] = Math.round(parseFloat(row.Yds20PO)); // legacy logic overwrite

        if (row.DF9 !== null && row.DF9 !== undefined && row.DF9 !== '') out[27] = parseInt(row.DF9, 10);
        if (row.DF12 !== null && row.DF12 !== undefined && row.DF12 !== '') out[29] = parseInt(row.DF12, 10);
        if (row.DF8 !== null && row.DF8 !== undefined && row.DF8 !== '') out[30] = parseInt(row.DF8, 10);
        if (row.DF5 !== null && row.DF5 !== undefined && row.DF5 !== '') out[31] = parseInt(row.DF5, 10);
        if (row.DF11 !== null && row.DF11 !== undefined && row.DF11 !== '') out[32] = parseInt(row.DF11, 10);
        if (row.DF10 !== null && row.DF10 !== undefined && row.DF10 !== '') out[33] = parseInt(row.DF10, 10);
        if (row.DF21 !== null && row.DF21 !== undefined && row.DF21 !== '') out[34] = parseInt(row.DF21, 10);
        if (row.DF2 !== null && row.DF2 !== undefined && row.DF2 !== '') out[35] = parseInt(row.DF2, 10);
        if (row.DF1 !== null && row.DF1 !== undefined && row.DF1 !== '') out[36] = parseInt(row.DF1, 10);
        if (row.DF7 !== null && row.DF7 !== undefined && row.DF7 !== '') out[37] = parseInt(row.DF7, 10);
        if (row.DF23 !== null && row.DF23 !== undefined && row.DF23 !== '') out[38] = parseInt(row.DF23, 10);
        if (row.DF13 !== null && row.DF13 !== undefined && row.DF13 !== '') out[39] = parseInt(row.DF13, 10);
        if (row.DF15 !== null && row.DF15 !== undefined && row.DF15 !== '') out[40] = parseInt(row.DF15, 10);

        out[44] = row.PointAgv || '';
        if (row.Yds20PO) out[45] = Math.round(parseFloat(row.Yds20PO));

        if (row.Handfeel) out[49] = row.Handfeel;
        if (row.ColorApp) out[52] = row.ColorApp;

        const sMs = parseFloat(row.StandardMS);
        const aMs = parseFloat(row.AcMs);
        if (!isNaN(sMs) && sMs !== 0) out[54] = sMs;
        if (!isNaN(aMs) && aMs !== 0) out[55] = aMs;
        if (!isNaN(sMs) && sMs !== 0 && !isNaN(aMs) && aMs !== 0) {
          out[56] = aMs <= sMs ? 'P' : 'F';
        }

        if (row.GSM && row.GSM !== "0") out[58] = row.GSM;

        if (row.Description) {
          const ss = String(row.Description);
          out[60] = ss;
          if (ss.toLowerCase().includes('g/s')) {
            try {
              const idx = ss.toLowerCase().indexOf('g/s');
              const beforeStr = ss.substring(0, idx).trim();
              const lastSpace = beforeStr.lastIndexOf(' ');
              let extracted = lastSpace === -1 ? beforeStr : beforeStr.substring(lastSpace + 1).trim();
              if (extracted.includes(';')) extracted = extracted.split(';')[1];
              out[57] = extracted;

              if (row.GSM && !isNaN(parseFloat(row.GSM)) && !isNaN(parseFloat(extracted))) {
                const gsmNum = parseFloat(row.GSM);
                const extNum = parseFloat(extracted);
                const kt = gsmNum + (gsmNum * 5 / 100);
                const kd = gsmNum - (gsmNum * 5 / 100);
                out[59] = (extNum >= kd && extNum <= kt) ? 'P' : 'F';
              }
            } catch (e) { }
          }
        }

        return out;
      });

      // Fetch the template from the public folder
      const response = await fetch('/QRReport_Defect_Template.xlsx');
      if (!response.ok) {
        throw new Error(t('qcfb.templateNotFound', 'Không tìm thấy file template QRReport_Defect_Template.xlsx rỗng'));
      }
      const arrayBuffer = await response.arrayBuffer();

      // Load into ExcelJS
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(arrayBuffer);
      const ws = wb.worksheets[0];

      // Start inserting data from row 2
      const startRow = 2;
      mapData.forEach((rowData, index) => {
        const row = ws.getRow(startRow + index);
        rowData.forEach((val, colIndex) => {
          row.getCell(colIndex + 1).value = val;
        });
        row.commit();
      });

      // Generate buffer and save
      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `Report_Defect_${new Date().getTime()}.xlsx`);
      showToast(t('qcfb.exportSuccess', 'Xuất Excel thành công'), 'success');
    } catch (err: any) {
      console.error('Export Error', err);
      showToast(t('qcfb.exportError', 'Lỗi khi xuất định dạng Excel'), 'error');
    }
  };

  return (
    <Box sx={{ px: 1, py: 0.5, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>

      <Paper elevation={0} sx={{ flexShrink: 0, borderRadius: 2, border: '1px solid #e0e0e0', overflow: 'hidden' }}>
        <Box sx={{
          p: 2, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap',
          background: 'linear-gradient(135deg, #f5f5f5 0%, #fafafa 100%)',
          borderBottom: '1px solid #e8e8e8',
        }}>
          {/* Date range element */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, backgroundColor: '#fff', borderRadius: 1.5, border: '1px solid #e0e0e0', px: 1.5, py: 0.5 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: '#2e7d32', mr: 0.5, whiteSpace: 'nowrap' }}>📅 {t('qcfb.dateTitle', 'Date')}</Typography>
            <TextField size="small" type="date" value={fromDate}
              onChange={e => setFromDate(e.target.value)}
              variant="standard" InputProps={{ disableUnderline: true }}
              sx={{ width: 125, '& input': { fontSize: '0.85rem' } }} />
            <Typography variant="body2" sx={{ color: '#999', mx: 0.5 }}>→</Typography>
            <TextField size="small" type="date" value={toDate}
              onChange={e => setToDate(e.target.value)}
              variant="standard" InputProps={{ disableUnderline: true }}
              sx={{ width: 125, '& input': { fontSize: '0.85rem' } }} />
          </Box>

          <Box sx={{ flexGrow: 1, display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            <TextField size="small" placeholder={t('qcfb.invoiceNo', 'Invoice No')} value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()}
              InputProps={{ startAdornment: <Typography sx={{ color: '#94a3b8', mr: 1, fontSize: '0.85rem', fontWeight: 600 }}>INV</Typography> }}
              sx={{ flex: '1 1 150px', '& .MuiOutlinedInput-root': { backgroundColor: '#fff', borderRadius: 2, transition: 'all 0.2s', '& fieldset': { borderColor: '#e2e8f0' }, '&:hover fieldset': { borderColor: '#cbd5e1' }, '&.Mui-focused fieldset': { borderColor: '#2e7d32', borderWidth: '1px', boxShadow: '0 0 0 3px rgba(46,125,50,0.1)' } }, '& input': { fontSize: '0.875rem', fontWeight: 500, color: '#334155' } }}
            />
            <TextField size="small" placeholder={t('qcfb.poNumber', 'PO Number')} value={poNo} onChange={e => setPoNo(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()}
              InputProps={{ startAdornment: <Typography sx={{ color: '#94a3b8', mr: 1, fontSize: '0.85rem', fontWeight: 600 }}>PO#</Typography> }}
              sx={{ flex: '1 1 150px', '& .MuiOutlinedInput-root': { backgroundColor: '#fff', borderRadius: 2, transition: 'all 0.2s', '& fieldset': { borderColor: '#e2e8f0' }, '&:hover fieldset': { borderColor: '#cbd5e1' }, '&.Mui-focused fieldset': { borderColor: '#2e7d32', borderWidth: '1px', boxShadow: '0 0 0 3px rgba(46,125,50,0.1)' } }, '& input': { fontSize: '0.875rem', fontWeight: 500, color: '#334155' } }}
            />
            <TextField size="small" placeholder={t('qcfb.itemNo', 'Item No')} value={itemNo} onChange={e => setItemNo(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()}
              InputProps={{ startAdornment: <Typography sx={{ color: '#94a3b8', mr: 1, fontSize: '0.85rem', fontWeight: 600 }}>ITM</Typography> }}
              sx={{ flex: '1 1 150px', '& .MuiOutlinedInput-root': { backgroundColor: '#fff', borderRadius: 2, transition: 'all 0.2s', '& fieldset': { borderColor: '#e2e8f0' }, '&:hover fieldset': { borderColor: '#cbd5e1' }, '&.Mui-focused fieldset': { borderColor: '#2e7d32', borderWidth: '1px', boxShadow: '0 0 0 3px rgba(46,125,50,0.1)' } }, '& input': { fontSize: '0.875rem', fontWeight: 500, color: '#334155' } }}
            />
          </Box>

          <Button variant="contained" size="small" startIcon={!loading ? <SearchIcon sx={{ fontSize: '18px !important' }} /> : undefined} onClick={handleSearch}
            disabled={loading} disableElevation
            sx={{
              borderRadius: 1.5, fontWeight: 700, height: 32, fontSize: '0.8rem', px: 2.5, textTransform: 'none',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', boxShadow: 'none',
              '&:hover': { background: 'linear-gradient(135deg, #34d399 0%, #10b981 100%)' },
            }}>
            {loading ? <CircularProgress size={24} color="inherit" /> : t('qcfb.loadReport', 'Search')}
          </Button>
        </Box>
      </Paper>

      <Paper sx={{ width: '100%', overflow: 'hidden', boxShadow: 3, borderRadius: 2, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ flexShrink: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">{t('qcfb.reportTitleD', 'Báo cáo Defect')} ({data.length})</Typography>
          <Button
            variant="contained"
            color="success"
            startIcon={<FileDownloadIcon />}
            onClick={exportExcel}
            disabled={!data.length}
          >
            {t('qcfb.exportExcel', 'Export Excel')}
          </Button>
        </Box>
        <TableContainer sx={{ flexGrow: 1, minHeight: 0, overflow: 'auto' }}>
          <Table stickyHeader size="small" sx={{ minWidth: 2000 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5', position: 'sticky', left: 0, zIndex: 10 }}>#</TableCell>
                {COLUMNS.map(h => (
                  <TableCell key={h} sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5', whiteSpace: 'nowrap' }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading || !mounted ? (
                <TableRow>
                  <TableCell colSpan={COLUMNS.length + 1} align="center" sx={{ py: 5 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={COLUMNS.length + 1} align="center">{t('qcfb.noDataDefect', 'Không có dữ liệu defect')}</TableCell>
                </TableRow>
              ) : (
                paginatedData.map((row, idx) => (
                  <TableRow key={idx} hover>
                    <TableCell sx={{ position: 'sticky', left: 0, backgroundColor: 'inherit', borderRight: '1px solid #e0e0e0', zIndex: 5 }}>
                      {page * rowsPerPage + idx + 1}
                    </TableCell>
                    {COLUMNS.map(col => (
                      <TableCell key={col} sx={{ whiteSpace: 'nowrap' }}>
                        {row[col]}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* F2S Pagination */}
        <Box sx={{ flexShrink: 0, borderTop: '1px solid #e2e8f0', bgcolor: '#fff', p: 1.5, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" sx={{ color: '#475569', fontWeight: 500 }}>{t('qcfb.rowsPerPage', 'Dòng / trang:')}</Typography>
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
              {[25, 50, 100, 200, 500].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
            </Select>
            <Typography variant="body2" sx={{ color: '#64748b', ml: 1 }}>
              {data.length > 0 ? page * rowsPerPage + 1 : 0}-{Math.min((page + 1) * rowsPerPage, data.length)} trong {data.length}
            </Typography>
          </Box>
          <Pagination
            count={Math.ceil(data.length / rowsPerPage) || 1}
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

      <Snackbar open={toastOpen} autoHideDuration={3000} onClose={() => setToastOpen(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setToastOpen(false)} severity={toastSeverity} sx={{ width: '100%', fontWeight: 600 }}>
          {toastMsg}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ReportDefectPage;

