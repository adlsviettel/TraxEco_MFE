import React, { useState, useRef } from 'react';
import { 
  Box, Typography, Paper, Button, Autocomplete, TextField, 
  Switch, FormGroup, FormControlLabel, CircularProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Alert, Divider, IconButton, Avatar, Slider, Stack, Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import { 
  UploadFile as UploadIcon, 
  CloudUpload as CloudUploadIcon,
  CheckCircle as CheckCircleIcon,
  Delete as DeleteIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon
} from '@mui/icons-material';
import * as XLSX from 'xlsx';
import { useToast, authService } from '@traxeco/shared';
import { useTranslation } from 'react-i18next';

const CUSTOMERS = ['Adidas', 'Puma', 'New Balance'];

const DB_COLUMNS = [
  'OrderNumber', 'SupCode', 'InvoiceNo', 'InvoiceDate', 'RollItem', 
  'Color', 'BatchNo', 'RollNo', 'ShipLength', 'NW', 'GW', 'Width', 'Location', 'Note', 'QrCode'
];

export default function UploadPkListPage() {
  const { showToast } = useToast();
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const userInfo = authService.getUserInfo();

  const [customer, setCustomer] = useState<string | null>('Adidas');
  const [isSupplier, setIsSupplier] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sheets, setSheets] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string | null>(null);
  
  const [allData, setAllData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [columnMappingOpen, setColumnMappingOpen] = useState(false);
  
  const [scale, setScale] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Derived mapped data
  const mappedData = React.useMemo(() => {
    if (allData.length === 0) return [];
    
    let inv = "";
    let dem = 0;
    
    return allData.map(row => {
      const getVal = (dbCol: string) => {
        const mapCol = columnMapping[dbCol];
        if (!mapCol) return '';
        return (row[mapCol] || '').toString().trim();
      };

      let colorcode = '';
      const colorVal = getVal('Color');
      if (colorVal) {
         const colorStr = colorVal + " ";
         colorcode = colorStr.substring(0, colorStr.indexOf(" "));
      }
      colorcode = colorcode ? colorcode.trim().replace(/ /g, "").replace(/'/g, "") : "";

      let cust = '';
      if (customer === 'Adidas') cust = 'ADS';
      else if (customer === 'Puma') cust = 'PU';
      else if (customer === 'New Balance') cust = 'NB';

      const rowInv = getVal('InvoiceNo').trim().replace(/'/g, "");
      if (inv === "") inv = rowInv;
      if (inv !== rowInv) {
          dem = 1;
          inv = rowInv;
      } else {
          dem++;
      }

      const cleanNumber = (val: string) => {
         if (!val) return '0';
         let str = val.toString().trim();
         if (str.includes(',') && !str.includes('.')) {
             str = str.replace(/,/g, '.');
         } else {
             str = str.replace(/,/g, '');
         }
         const match = str.match(/[-+]?[0-9]*\.?[0-9]+/);
         const num = match ? parseFloat(match[0]) : 0;
         return num.toString();
      };

      const normalizeDate = (val: string) => {
        if (!val) return '';
        // Excel serial date number (e.g. 45384)
        const num = Number(val);
        if (!isNaN(num) && num > 30000 && num < 100000) {
          const d = new Date((num - 25569) * 86400 * 1000);
          return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        }
        // Try parsing as date string
        const d = new Date(val);
        if (!isNaN(d.getTime()) && d.getFullYear() > 2000) {
          return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        }
        return val;
      };

      let batchNo = getVal('BatchNo');
      let rollNo = getVal('RollNo');
      const mappedBatch = columnMapping['BatchNo']?.toLowerCase().replace(/[^a-z0-9]/g, '');
      const mappedRoll = columnMapping['RollNo']?.toLowerCase().replace(/[^a-z0-9]/g, '');

      if (mappedBatch === 'itmavalue1' && batchNo.includes('/')) {
         batchNo = batchNo.substring(batchNo.indexOf('/') + 1);
      }
      if (mappedRoll === 'itmavalue1' && rollNo.includes('/')) {
         rollNo = rollNo.substring(0, rollNo.indexOf('/'));
      }

      let nwStr = getVal('NW');
      const mappedNW = columnMapping['NW']?.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (mappedNW === 'itmavalue2' && nwStr.includes('/')) {
         nwStr = nwStr.substring(nwStr.indexOf('/') + 1);
      }

      return {
         OrderNumber: getVal('OrderNumber'),
         SupCode: getVal('SupCode'),
         InvoiceNo: rowInv,
         InvoiceDate: normalizeDate(getVal('InvoiceDate')),
         RollItem: getVal('RollItem'),
         Color: colorVal,
         BatchNo: batchNo,
         RollNo: rollNo,
         ShipLength: cleanNumber(getVal('ShipLength')),
         NW: cleanNumber(nwStr),
         GW: cleanNumber(getVal('GW')),
         Width: cleanNumber(getVal('Width')),
         Factory: userInfo?.factory || 'Unknown',
         ColorCode: colorcode,
         Customer: cust,
         Note: getVal('Note'),
         Code: `${inv}:${dem}`,
         QrCode: getVal('QrCode'),
         Location: getVal('Location')
      };
    });
  }, [allData, columnMapping, customer, userInfo?.factory]);

  const previewCols = ['OrderNumber', 'SupCode', 'InvoiceNo', 'InvoiceDate', 'RollItem', 'Color', 'ColorCode', 'BatchNo', 'RollNo', 'Code', 'ShipLength', 'Width', 'NW', 'GW', 'Customer', 'Factory', 'Location', 'Note', 'QrCode'];

  // Parse file on change
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    setFile(selectedFile);
    setLoading(true);
    setSelectedSheet(null);
    setSheets([]);

    try {
      const data = await selectedFile.arrayBuffer();
      const wb = XLSX.read(data, { type: 'array' });
      setWorkbook(wb);
      setSheets(wb.SheetNames);
    } catch (err: any) {
      showToast(t('upload.readFileError', { err: err?.message }), 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchMapping = async () => {
    try {
      const typeStr = isSupplier ? 'supplier' : 'standard';
      const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';
      const resp = await fetch(`${API_BASE}/fabric-wh/config-mapping?moduleType=${typeStr}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (resp.ok) {
        const data = await resp.json();
        return JSON.parse(data.mappingJson || '{}');
      }
    } catch {
      // Ignore
    }
    return {};
  };

  const handleSheetChange = async (val: string | null) => {
    setSelectedSheet(val);
    if (!val || !workbook) {
      setAllData([]);
      setColumns([]);
      setColumnMapping({});
      return;
    }

    const ws = workbook.Sheets[val];
    const rawData = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: '' });
    
    // Winforms Logic: if Supplier, the header might not be at row 1 (often starts with 'Issue Date' or similar)
    let headerRowIdx = 0;
    if (isSupplier) {
      const foundIdx = rawData.findIndex(row => 
        row.some((cell: any) => String(cell).trim().toLowerCase() === 'issue date' || String(cell).trim().toLowerCase() === 'order number' || String(cell).trim().toLowerCase() === 't2 factory code')
      );
      if (foundIdx !== -1) headerRowIdx = foundIdx;
    }

    if (rawData.length <= headerRowIdx) {
      setAllData([]);
      setColumns([]);
      setColumnMapping({});
      return;
    }

    const headers: string[] = rawData[headerRowIdx].map((c: any, i: number) => c ? String(c).trim() : `__EMPTY_${i}`);
    let jsonData = rawData.slice(headerRowIdx + 1).map(row => {
      const obj: any = {};
      headers.forEach((h, i) => {
        obj[h] = row[i] !== undefined ? row[i] : '';
      });
      return obj;
    });

    // Filter out completely empty rows
    jsonData = jsonData.filter(row => 
      Object.keys(row).some(k => !k.startsWith('__EMPTY_') && row[k] !== null && row[k] !== undefined && String(row[k]).trim() !== '')
    );
    
    if (jsonData.length > 0) {
      setAllData(jsonData);
      const shiftCols = ['qrcode', 'qr code', 'recno', 'barcode', 'id'];
      const normal = headers.filter(k => !shiftCols.includes(k.toLowerCase().trim()) && !k.startsWith('__EMPTY_'));
      const endCols = headers.filter(k => shiftCols.includes(k.toLowerCase().trim()) && !k.startsWith('__EMPTY_'));
      const cols = [...normal, ...endCols];
      setColumns(cols);
      
      const savedMapping = await fetchMapping();

      const newMap: Record<string, string> = {};
      
      const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
      
      const aliases: Record<string, string[]> = {
        'OrderNumber': ['po', 'order', 'orderno', 'ordernumber', 'lotno'],
        'SupCode': ['sup', 'supplier', 't2factorycode', 'configuration'],
        'InvoiceNo': ['invoice', 'inv', 'packinglistno', 'lotnoref'],
        'InvoiceDate': ['invoicedate', 'date', 'issuedate', 'dateinhouse'],
        'RollItem': ['item', 'itemno', 'ref', 'matrcode', 'ref#'],
        'Color': ['color', 'col', 'materialcolor', 'color2'],
        'BatchNo': ['batch', 'lot', 'batchno', 'itmavalue1'],
        'RollNo': ['roll', 'caydinh', 'packageno', 'itmavalue1'],
        'ShipLength': ['yds', 'length', 'qty', 'shippedquantity'],
        'NW': ['nw', 'n.w', 'netweight', 'itmavalue2'],
        'GW': ['gw', 'g.w', 'grossweight'],
        'Width': ['widthsticker', 'width', 'size1', 'size', 'size_1'],
        'Location': ['loc', 'location', 'vitri', 'pallet'],
        'Note': ['note', 'remark'],
        'QrCode': ['qrcode', 'qr code']
      };

      DB_COLUMNS.forEach(dbCol => {
        if (savedMapping[dbCol] && cols.includes(savedMapping[dbCol])) {
          newMap[dbCol] = savedMapping[dbCol];
        } else {
          // Check exact match from actual excel cols
          const aliasList = aliases[dbCol] || [];
          const match = cols.find(c => {
             const normC = normalize(c);
             return normalize(dbCol) === normC || aliasList.some(alias => normC === normalize(alias));
          });
          newMap[dbCol] = match || '';
        }
      });
      // Try to auto-map QrCode if it's in the data but not in DB_COLUMNS list natively
      if (!newMap['QrCode']) {
          const qrMatch = cols.find(c => normalize(c) === 'qrcode');
          if (qrMatch) newMap['QrCode'] = qrMatch;
      }
      setColumnMapping(newMap);
    } else {
      setAllData([]);
      setColumns([]);
      setColumnMapping({});
    }
  };

  const handleClear = () => {
    setFile(null);
    setWorkbook(null);
    setSheets([]);
    setSelectedSheet(null);
    setAllData([]);
    setColumns([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSaveMapping = async () => {
    try {
      const typeStr = isSupplier ? 'supplier' : 'standard';
      const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';
      const resp = await fetch(`${API_BASE}/fabric-wh/config-mapping`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
           moduleType: typeStr,
           mappingJson: JSON.stringify(columnMapping)
        })
      });
      if (!resp.ok) throw new Error();
      showToast(t('upload.syncConfigSuccess', { mode: isSupplier ? 'Supplier' : 'Standard' }), 'success');
    } catch {
      showToast(t('upload.syncConfigError'), 'error');
    } finally {
      setColumnMappingOpen(false);
    }
  };

  const handleUpload = async () => {
    if (!file || !selectedSheet || !customer) {
      showToast(t('upload.incompleteMapping'), 'warning');
      return;
    }

    if (mappedData.length === 0) {
      showToast(t('upload.noValidData'), 'error');
      return;
    }

    setUploading(true);
    try {
      if (isSupplier) {
        showToast(t('upload.dynamicMappingUsed'), 'info');
      }

      const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';
      
      // 1. Kiểm tra lặp trùng
      const dupResp = await fetch(`${API_BASE}/fabric-wh/packing-list/check-duplicates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify(mappedData)
      });
      const dupData = await dupResp.json().catch(() => ({}));
      
      let finalUploadData = mappedData;
      if (dupResp.ok && dupData.existingIndexes && dupData.existingIndexes.length > 0) {
          const skipCount = dupData.existingIndexes.length;
          finalUploadData = mappedData.filter((_, idx) => !dupData.existingIndexes.includes(idx));
          showToast(t('upload.duplicateSkipped', { skip: skipCount, count: finalUploadData.length }), 'info');
      }

      if (finalUploadData.length === 0) {
          showToast(t('upload.allDuplicates'), 'warning');
          setUploading(false);
          return;
      }

      // 2. Upload Dữ liệu (chỉ Cuộn Mới)
      const resp = await fetch(`${API_BASE}/fabric-wh/packing-list/upload?isSupplier=${isSupplier}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(finalUploadData)
      });

      const resData = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(resData.error || t('upload.uploadServerError'));

      showToast(resData.message || t('upload.uploadSuccess'), 'success');
      handleClear();
    } catch (err: any) {
      showToast(t('upload.uploadFailed', { err: err?.message }), 'error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Box sx={{ 
        p: { xs: 1, md: 2 }, 
        flex: 1, 
        height: '100%',
        overflowY: 'auto',
        minHeight: 0, 
        backgroundColor: '#f8fafc', 
        display: 'flex', 
        flexDirection: 'column',
        zoom: { xs: 1, md: 0.9 } // Thu nhỏ toàn bộ page lại 90% trên màn hình Desktop
    }}>


      <Box sx={{ 
        display: { xs: 'flex', md: 'grid' }, 
        flexDirection: 'column', 
        gridTemplateColumns: 'minmax(250px, 320px) 1fr', 
        gap: 2, 
        flexGrow: 1, 
        minHeight: 0 
      }}>
        {/* Settings & File Selection (Left Column) */}
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
          <Paper sx={{ p: 2, borderRadius: 3, border: '1px solid #e2e8f0', boxShadow: 'none', overflow: 'auto' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>Configuration</Typography>

            <Autocomplete
              options={CUSTOMERS}
              value={customer}
              onChange={(_, val) => setCustomer(val)}
              renderInput={(params) => <TextField {...params} label="Customer" size="small" />}
              sx={{ mb: 3 }}
            />

            <FormGroup sx={{ mb: 3 }}>
              <FormControlLabel 
                control={<Switch checked={isSupplier} onChange={e => setIsSupplier(e.target.checked)} color="warning" />} 
                label={
                  <Typography variant="body2" sx={{ fontWeight: isSupplier ? 700 : 400, color: isSupplier ? '#ea580c' : 'text.primary' }}>
                    {t('upload.supplierMode')}
                  </Typography>
                } 
              />
            </FormGroup>

            <Divider sx={{ mb: 3 }} />

            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Packing List File (Excel)</Typography>
            
            <input 
              type="file" 
              accept=".xls,.xlsx" 
              style={{ display: 'none' }} 
              ref={fileInputRef} 
              onChange={handleFileChange} 
            />
            
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}><CircularProgress size={24} /></Box>
            ) : !file ? (
              <Button 
                variant="outlined" 
                fullWidth 
                startIcon={<UploadIcon />} 
                onClick={() => fileInputRef.current?.click()}
                sx={{ py: 1.5, borderStyle: 'dashed', borderWidth: 2, borderColor: '#cbd5e1', color: '#334155', fontWeight: 600, borderRadius: 1.5 }}
              >
                {t('upload.selectFile')}
              </Button>
            ) : (
              <Alert 
                severity="success" 
                icon={<CheckCircleIcon />}
                action={<IconButton size="small" onClick={handleClear}><DeleteIcon fontSize="small" /></IconButton>}
              >
                {file.name}
              </Alert>
            )}

              {sheets.length > 0 && (
                <>
                  <Autocomplete
                    options={sheets}
                    value={selectedSheet || ''}
                    onChange={(_, val) => handleSheetChange(val)}
                    renderInput={(params) => <TextField {...params} label="Select Data Sheet" size="small" />}
                    sx={{ mt: 2 }}
                    disableClearable
                  />
                  <Button 
                    variant="outlined" 
                    fullWidth 
                    size="small"
                    color="secondary"
                    onClick={() => setColumnMappingOpen(true)}
                    sx={{ mt: 1.5, fontWeight: 700, borderRadius: '12px', height: 32, fontSize: '0.8rem', textTransform: 'none', borderColor: '#cbd5e1', color: '#475569', '&:hover': { bgcolor: '#f1f5f9' } }}
                  >
                    {t('upload.mapping')}
                  </Button>
                </>
              )}

              <Button 
                variant="contained" 
                fullWidth 
                size="medium"
                disableElevation
                disabled={!file || !selectedSheet || uploading}
                startIcon={uploading ? <CircularProgress size={16} color="inherit" /> : <CloudUploadIcon />}
                onClick={handleUpload}
                sx={{ mt: 3, fontWeight: 700, borderRadius: '12px', height: 36, fontSize: '0.85rem', textTransform: 'none', bgcolor: isSupplier ? '#ea580c' : '#2e7d32', '&:hover': { bgcolor: isSupplier ? '#c2410c' : '#1b5e20' } }}
              >
                {uploading ? 'UPLOADING...' : 'START UPLOAD'}
              </Button>
          </Paper>
        </Box>

        {/* Data Preview */}
        <Paper sx={{ width: '100%', height: '100%', p: 0, borderRadius: 3, border: '1px solid #e2e8f0', boxShadow: 'none', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ p: 1.5, borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{t('upload.preview')}</Typography>
                {mappedData.length > 0 && (
                  <Typography variant="caption" sx={{ bgcolor: '#eff6ff', color: '#1d4ed8', px: 1, py: 0.5, borderRadius: 1, fontWeight: 600 }}>
                    {mappedData.length} records logic identified
                  </Typography>
                )}
              </Box>
              
              {/* Scale Screen Controller for Data */}
              <Box sx={{ display: 'flex', alignItems: 'center', width: 200, bgcolor: '#f8fafc', px: 1.5, py: 0.5, borderRadius: 2, border: '1px solid #e2e8f0' }}>
                <ZoomOutIcon sx={{ color: '#64748b', fontSize: 18 }} />
                <Slider 
                  size="small"
                  value={scale} 
                  min={0.5} max={1.5} step={0.1}
                  onChange={(_, val) => setScale(val as number)}
                  sx={{ mx: 1.5, color: '#4f46e5' }}
                />
                <ZoomInIcon sx={{ color: '#64748b', fontSize: 18 }} />
                <Typography variant="caption" sx={{ ml: 1, fontWeight: 600, color: '#475569', minWidth: 35 }}>
                  {Math.round(scale * 100)}%
                </Typography>
              </Box>
            </Box>
            
            <Box sx={{ flex: 1, height: '100%', minHeight: 0, overflowY: 'auto', p: 0.5, backgroundColor: '#f1f5f9', position: 'relative' }}>
              {mappedData.length > 0 ? (
                <Box sx={{ zoom: scale, transformOrigin: 'top left', minWidth: '100%', height: '100%' }}>
                  <TableContainer component={Paper} elevation={0} sx={{ height: '100%', borderRadius: 1, border: '1px solid #e2e8f0' }}>
                    <Table stickyHeader size="small" sx={{
                      '& .MuiTableCell-root': { fontSize: '12px', py: 0.75, px: 1, borderColor: '#f0f0f0' },
                      '& .MuiTableBody-root .MuiTableRow-root': { bgcolor: '#fff' },
                      '& .MuiTableBody-root .MuiTableRow-root:nth-of-type(even)': { bgcolor: '#fafbfc' },
                      '& .MuiTableBody-root .MuiTableRow-root:hover': { bgcolor: '#e8f5e9 !important' }
                    }}>
                    <TableHead>
                      <TableRow>
                        {previewCols.map((col, idx) => (
                          <TableCell key={idx} sx={{ fontWeight: 700, bgcolor: '#f8fafc', whiteSpace: 'nowrap', borderRight: '1px solid #e2e8f0', borderBottom: '2px solid #e2e8f0', color: '#334155' }}>
                            {col}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {mappedData.map((row, rIdx) => (
                        <TableRow key={rIdx} hover sx={{ transition: 'background-color 0.15s' }}>
                          {previewCols.map((col, cIdx) => (
                            <TableCell key={cIdx} sx={{ whiteSpace: 'nowrap', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', borderRight: '1px solid #e2e8f0' }}>
                              {(row as Record<string, any>)[col]?.toString() || ''}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', py: 10 }}>
                  <UploadIcon sx={{ fontSize: 64, color: '#cbd5e1', mb: 2 }} />
                  <Typography variant="body1" sx={{ color: '#94a3b8' }}>{t('upload.noValidData')}</Typography>
                </Box>
              )}
            </Box>
          </Paper>
      </Box>

      {/* Column Mapping Dialog */}
      <Dialog open={columnMappingOpen} onClose={() => setColumnMappingOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: '#1e293b' }}>{t('upload.mapping', 'Column Mapping')} Config</DialogTitle>
        <DialogContent dividers sx={{ backgroundColor: '#f8fafc' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="body2" color="text.secondary">
              {t('upload.mappingDesc', 'Match the required system columns (left) with the corresponding columns in your Excel file (right). The system automatically identified columns with the same name.')}
            </Typography>
            <Paper sx={{ p: 2, borderRadius: 2, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {DB_COLUMNS.map(dbCol => (
                  <Box key={dbCol} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography sx={{ width: 140, fontWeight: 600, fontSize: '0.85rem', color: '#475569' }}>
                      {dbCol} {!['Note', 'Location'].includes(dbCol) && <span style={{color:'#ef4444'}}>*</span>}
                    </Typography>
                    <Autocomplete
                      size="small"
                      fullWidth
                      options={columns}
                      value={columnMapping[dbCol] || null}
                      onChange={(_, val) => setColumnMapping(prev => ({ ...prev, [dbCol]: val || '' }))}
                      renderInput={(params) => <TextField {...params} placeholder={t('upload.selectExcelColumn', 'Select Excel Column...')} />}
                      disableClearable={false}
                    />
                  </Box>
                ))}
              </Box>
            </Paper>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={handleSaveMapping} variant="contained" disableElevation sx={{ fontWeight: 700, px: 4, borderRadius: 1.5, bgcolor: '#2e7d32', '&:hover': { bgcolor: '#1b5e20' } }}>
            {t('upload.syncConfig')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

