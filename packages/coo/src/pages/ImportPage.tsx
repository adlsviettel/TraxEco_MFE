import React, { useState, useEffect, useCallback, useMemo, useRef, useDeferredValue, startTransition } from 'react';
import { 
    Box, Typography, Button, CircularProgress, 
    Alert, Tabs, Tab, Paper, Fade, useTheme, TextField, InputAdornment,
    IconButton, Chip, Tooltip, Snackbar, Select, MenuItem
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { 
    CloudUploadOutlined as CloudUploadIcon,
    DownloadOutlined as DownloadIcon,
    SecurityOutlined as SecurityIcon,
    FilterAltOutlined as FilterIcon,
    Search as SearchIcon,
    Refresh as RefreshIcon
} from '@mui/icons-material';
import { authFetch } from '@traxeco/shared';
import { useTranslation } from 'react-i18next';
import ExcelStyleColumnMenu from '../components/ExcelStyleColumnMenu';
import CustomFooter from '../components/CustomFooter';
import ExcelJS from 'exceljs';

export const ImportPage = () => {
    const { t } = useTranslation();
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const [tabIndex, setTabIndex] = useState(0);

    const cooInputRef = useRef<HTMLInputElement>(null);
    const fabricInputRef = useRef<HTMLInputElement>(null);

    // States for custom COO import
    const [cooLoading, setCooLoading] = useState(false);
    const [cooMessage, setCooMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

    // States for main fabric import
    const [fabricLoading, setFabricLoading] = useState(false);
    const [fabricMessage, setFabricMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

    // States for Customs Data Table
    const [customsData, setCustomsData] = useState<any[]>([]);
    const [customsLoading, setCustomsLoading] = useState(false);
    const [customsSearch, setCustomsSearch] = useState('');
    const [loadLimit, setLoadLimit] = useState<number>(5000); // Mặc định 5,000 dòng mới nhất để load tức thì trong 100ms

    // States for Consumption Data Table
    const [consumptionData, setConsumptionData] = useState<any[]>([]);
    const [consumptionLoading, setConsumptionLoading] = useState(false);
    const [consumptionSearch, setConsumptionSearch] = useState('');

    // Fetch Customs Data
    const fetchCustomsData = useCallback(async (searchQuery?: string, limitVal?: number) => {
        setCustomsLoading(true);
        try {
            const lim = limitVal !== undefined ? limitVal : loadLimit;
            let url = `coo/customs?limit=${lim}`;
            if (searchQuery) {
                url += `&search=${encodeURIComponent(searchQuery)}`;
            }
            const res = await authFetch(url);
            if (res.ok) {
                const data = await res.json();
                const items = Array.isArray(data) ? data : [];
                startTransition(() => {
                    setCustomsData(items);
                });
            }
        } catch (e) {
            console.error('Error fetching customs data:', e);
        } finally {
            setCustomsLoading(false);
        }
    }, [loadLimit]);

    // Fetch Consumption Data
    const fetchConsumptionData = useCallback(async (searchQuery?: string, limitVal?: number) => {
        setConsumptionLoading(true);
        try {
            const lim = limitVal !== undefined ? limitVal : loadLimit;
            let url = `coo/consumption?limit=${lim}`;
            if (searchQuery) {
                url += `&search=${encodeURIComponent(searchQuery)}`;
            }
            const res = await authFetch(url);
            if (res.ok) {
                const data = await res.json();
                const items = Array.isArray(data) ? data : [];
                startTransition(() => {
                    setConsumptionData(items);
                });
            }
        } catch (e) {
            console.error('Error fetching consumption data:', e);
        } finally {
            setConsumptionLoading(false);
        }
    }, [loadLimit]);

    useEffect(() => {
        if (tabIndex === 0) {
            fetchCustomsData();
        } else if (tabIndex === 1) {
            fetchConsumptionData();
        }
    }, [tabIndex, fetchCustomsData, fetchConsumptionData]);

    useEffect(() => {
        if (cooMessage) {
            const timer = setTimeout(() => setCooMessage(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [cooMessage]);

    useEffect(() => {
        if (fabricMessage) {
            const timer = setTimeout(() => setFabricMessage(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [fabricMessage]);

    // Direct file picker handler for COO Customs
    const handleCooFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        setCooLoading(true); 
        setCooMessage(null);
        try {
            const formData = new FormData();
            files.forEach(file => formData.append('file', file));
            const res = await authFetch('coo/import/customs', {
                method: 'POST',
                body: formData
            });
            if (!res.ok) {
                let errMessage = 'API Error (Status: ' + res.status + ')';
                try {
                    const errBody = await res.json();
                    if (errBody.message) errMessage = errBody.message;
                    else if (errBody.error) errMessage = errBody.error;
                } catch(err) {}
                throw new Error(errMessage);
            }
            setCooMessage({ type: 'success', text: `Đã map thành công dữ liệu Tờ Khai từ ${files.length} file.` });
            fetchCustomsData();
        } catch (error: any) {
            setCooMessage({ type: 'error', text: error.message || 'Lỗi khi import file' });
        } finally {
            setCooLoading(false);
            if (e.target) e.target.value = '';
        }
    }, [fetchCustomsData]);

    // Direct file picker handler for Main Fabric
    const handleFabricFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        setFabricLoading(true); 
        setFabricMessage(null);
        try {
            const formData = new FormData();
            files.forEach(file => formData.append('file', file));
            const res = await authFetch('coo/import/consumption', {
                method: 'POST',
                body: formData
            });
            if (!res.ok) {
                let errMessage = 'API Error (Status: ' + res.status + ')';
                try {
                    const errBody = await res.json();
                    if (errBody.message) errMessage = errBody.message;
                    else if (errBody.error) errMessage = errBody.error;
                } catch(err) {}
                throw new Error(errMessage);
            }
            setFabricMessage({ type: 'success', text: `Đã cập nhật Vải Chính từ ${files.length} file.` });
            fetchConsumptionData();
        } catch (error: any) {
            setFabricMessage({ type: 'error', text: error.message || 'Lỗi khi import file' });
        } finally {
            setFabricLoading(false);
            if (e.target) e.target.value = '';
        }
    }, [fetchConsumptionData]);

    const deferredCustomsSearch = useDeferredValue(customsSearch);
    const deferredConsumptionSearch = useDeferredValue(consumptionSearch);

    const getRowIdCustoms = useCallback((r: any) => r.Id ?? r.id, []);
    const getRowIdConsumption = useCallback((r: any) => r.Id ?? r.id, []);

    // Filter Customs Data
    const filteredCustomsData = useMemo(() => {
        if (!deferredCustomsSearch.trim()) return customsData;
        const q = deferredCustomsSearch.toLowerCase().trim();
        return customsData.filter((r) => {
            return Object.values(r).some(val => val !== null && val !== undefined && String(val).toLowerCase().includes(q));
        });
    }, [customsData, deferredCustomsSearch]);

    // Filter Consumption Data
    const filteredConsumptionData = useMemo(() => {
        if (!deferredConsumptionSearch.trim()) return consumptionData;
        const q = deferredConsumptionSearch.toLowerCase().trim();
        return consumptionData.filter((r) => {
            return Object.values(r).some(val => val !== null && val !== undefined && String(val).toLowerCase().includes(q));
        });
    }, [consumptionData, deferredConsumptionSearch]);

    // Export Customs to Excel
    const exportCustomsExcel = useCallback(async () => {
        if (filteredCustomsData.length === 0) return;
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Customs Data');
        
        const keys = Object.keys(filteredCustomsData[0] || {}).filter(k => k !== 'Id');
        const headerRow = worksheet.addRow(keys);
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF15803D' } };

        filteredCustomsData.forEach(row => {
            worksheet.addRow(keys.map(k => row[k] ?? ''));
        });

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Customs_Data_${new Date().toISOString().slice(0,10)}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, [filteredCustomsData]);

    // Export Consumption to Excel
    const exportConsumptionExcel = useCallback(async () => {
        if (filteredConsumptionData.length === 0) return;
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Consumption Data');
        
        const keys = Object.keys(filteredConsumptionData[0] || {}).filter(k => k !== 'Id');
        const headerRow = worksheet.addRow(keys);
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D4ED8' } };

        filteredConsumptionData.forEach(row => {
            worksheet.addRow(keys.map(k => row[k] ?? ''));
        });

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Main_Fabric_Data_${new Date().toISOString().slice(0,10)}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, [filteredConsumptionData]);

    // Columns for Customs Grid
    const customsColumns: GridColDef[] = useMemo(() => [
        { field: 'Số TK', headerName: 'Số TK', width: 140 },
        { field: 'Ngày ĐK', headerName: 'Ngày ĐK', width: 120 },
        { field: 'Mã loại hình', headerName: 'Mã loại hình', width: 120 },
        { field: 'Xuất xứ', headerName: 'Xuất xứ', width: 120 },
        { field: 'Mã NPL/SP', headerName: 'Mã NPL/SP', width: 140 },
        { field: 'Mã HS', headerName: 'Mã HS', width: 120 },
        { field: 'Tên hàng', headerName: 'Tên hàng', width: 220 },
        { field: 'Số lượng kiện', headerName: 'Số lượng', width: 110 },
        { field: 'Đơn vị tính', headerName: 'ĐVT', width: 90 },
        { field: 'Số hóa đơn', headerName: 'Số hóa đơn', width: 140 },
        { field: 'Số hợp đồng', headerName: 'Số hợp đồng', width: 140 },
        { field: 'Ghi chú', headerName: 'Ghi chú', width: 180 },
        { field: 'ImportDate', headerName: 'Ngày Import', width: 150 }
    ], []);

    // Columns for Consumption Grid
    const consumptionColumns: GridColDef[] = useMemo(() => [
        { field: 'Customer order No.', headerName: 'Customer Order No.', width: 160 },
        { field: 'Material Code', headerName: 'Material Code', width: 150 },
        { field: 'Viet Nam name FG', headerName: 'Tên SP (VN)', width: 220 },
        { field: 'Eng name FG', headerName: 'Tên SP (EN)', width: 220 },
        { field: 'Unit Of FG', headerName: 'ĐVT FG', width: 100 },
        { field: 'Customs code', headerName: 'Customs Code', width: 140 },
        { field: 'Có xuất xứ', headerName: 'Có xuất xứ', width: 120 },
        { field: 'Không có xuất xứ', headerName: 'Không có xuất xứ', width: 130 },
        { field: 'ImportDate', headerName: 'Ngày Import', width: 150 }
    ], []);

    return (
        <Box sx={{ p: { xs: 2, md: 3 }, height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
            {/* Hidden File Inputs */}
            <input 
                type="file" 
                ref={cooInputRef} 
                hidden 
                accept=".xlsx, .xls" 
                multiple 
                onChange={handleCooFileSelect} 
            />
            <input 
                type="file" 
                ref={fabricInputRef} 
                hidden 
                accept=".xlsx, .xls" 
                multiple 
                onChange={handleFabricFileSelect} 
            />

            {/* Paper Container */}
            <Paper elevation={0} sx={{ flexGrow: 1, minHeight: 0, borderRadius: 3, display: 'flex', flexDirection: 'column', overflow: 'hidden', border: `1px solid ${theme.palette.divider}`, bgcolor: 'background.paper' }}>
                {/* Tabs */}
                <Tabs 
                    value={tabIndex} 
                    onChange={(_, v) => setTabIndex(v)} 
                    sx={{ 
                        px: 2,
                        minHeight: 52,
                        borderBottom: `1px solid ${theme.palette.divider}`,
                        '& .MuiTab-root': { py: 1.5, minHeight: 52, fontWeight: 700, fontSize: '0.9rem', color: isDark ? '#94a3b8' : '#64748b' },
                        '& .Mui-selected': { color: isDark ? '#4ade80 !important' : '#15803d !important' },
                        '& .MuiTabs-indicator': { height: 3, borderTopLeftRadius: 3, borderTopRightRadius: 3, bgcolor: isDark ? '#4ade80' : '#22c55e' }
                    }}
                >
                    <Tab 
                        label={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, whiteSpace: 'nowrap' }}>
                                <SecurityIcon fontSize="small" />
                                <span>HẢI QUAN WEEKLY</span>
                                <Chip label={customsData.length} size="small" sx={{ height: 20, fontSize: '11px', fontWeight: 700, bgcolor: isDark ? 'rgba(34,197,94,0.2)' : '#dcfce7', color: isDark ? '#4ade80' : '#15803d' }} />
                            </Box>
                        } 
                    />
                    <Tab 
                        label={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, whiteSpace: 'nowrap' }}>
                                <FilterIcon fontSize="small" />
                                <span>VẢI CHÍNH (CONSUMPTION)</span>
                                <Chip label={consumptionData.length} size="small" sx={{ height: 20, fontSize: '11px', fontWeight: 700, bgcolor: isDark ? 'rgba(59,130,246,0.2)' : '#dbeafe', color: isDark ? '#60a5fa' : '#1d4ed8' }} />
                            </Box>
                        } 
                    />
                </Tabs>

                {/* TAB 1: CUSTOMS DATA */}
                {tabIndex === 0 && (
                    <Fade in={tabIndex === 0}>
                        <Box sx={{ flexGrow: 1, minHeight: 0, p: 2, display: 'flex', flexDirection: 'column' }}>
                            {/* Action Bar */}
                            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}>
                                <TextField
                                    placeholder="Tìm kiếm Số TK, Loại hình, Xuất xứ, Mã NPL..."
                                    size="small"
                                    value={customsSearch}
                                    onChange={(e) => setCustomsSearch(e.target.value)}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                                            </InputAdornment>
                                        )
                                    }}
                                    sx={{ width: { xs: '100%', sm: 340 } }}
                                />

                                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                    <Select
                                        size="small"
                                        value={loadLimit}
                                        onChange={(e) => {
                                            const val = Number(e.target.value);
                                            setLoadLimit(val);
                                            fetchCustomsData(customsSearch, val);
                                        }}
                                        sx={{ 
                                            height: 32, fontSize: '12px', fontWeight: 700, borderRadius: 1, 
                                            color: isDark ? '#4ade80' : '#15803d',
                                            '& .MuiOutlinedInput-notchedOutline': { borderColor: isDark ? '#334155' : '#cbd5e1' }
                                        }}
                                    >
                                        <MenuItem value={0}>Tất cả (All 147k+)</MenuItem>
                                        <MenuItem value={2000}>2.000 dòng</MenuItem>
                                        <MenuItem value={5000}>5.000 dòng</MenuItem>
                                        <MenuItem value={10000}>10.000 dòng</MenuItem>
                                        <MenuItem value={50000}>50.000 dòng</MenuItem>
                                    </Select>

                                    <Button
                                        variant="outlined"
                                        size="small"
                                        startIcon={customsLoading ? <CircularProgress size={16} color="inherit" /> : <RefreshIcon />}
                                        onClick={() => fetchCustomsData(customsSearch)}
                                        disabled={customsLoading}
                                        sx={{ borderRadius: 1, textTransform: 'none', fontWeight: 700, color: isDark ? '#4ade80' : '#15803d', borderColor: isDark ? '#4ade80' : '#15803d', '&:hover': { borderColor: isDark ? '#22c55e' : '#166534', bgcolor: isDark ? 'rgba(74, 222, 128, 0.1)' : '#f0fdf4' } }}
                                    >
                                        {customsLoading ? 'Đang Load...' : 'Load Dữ Liệu'}
                                    </Button>

                                    <Button
                                        variant="outlined"
                                        size="small"
                                        startIcon={<DownloadIcon />}
                                        onClick={exportCustomsExcel}
                                        disabled={filteredCustomsData.length === 0}
                                        sx={{ borderRadius: 1, textTransform: 'none', fontWeight: 700, color: isDark ? '#4ade80' : '#15803d', borderColor: isDark ? '#4ade80' : '#15803d', '&:hover': { borderColor: isDark ? '#22c55e' : '#166534', bgcolor: isDark ? 'rgba(74, 222, 128, 0.1)' : '#f0fdf4' } }}
                                    >
                                        Export Excel
                                    </Button>

                                    <Button
                                        variant="contained"
                                        size="small"
                                        disabled={cooLoading}
                                        startIcon={cooLoading ? <CircularProgress size={16} color="inherit" /> : <CloudUploadIcon />}
                                        onClick={() => cooInputRef.current?.click()}
                                        sx={{ borderRadius: 1, textTransform: 'none', fontWeight: 700, bgcolor: isDark ? '#22c55e' : '#15803d', '&:hover': { bgcolor: isDark ? '#16a34a' : '#166534' } }}
                                    >
                                        {cooLoading ? 'Đang Import...' : 'Import File Mới'}
                                    </Button>
                                </Box>
                            </Box>

                            {/* Notifications */}
                            {cooMessage && (
                                <Alert severity={cooMessage.type} onClose={() => setCooMessage(null)} sx={{ mb: 2, borderRadius: 2 }}>
                                    {cooMessage.text}
                                </Alert>
                            )}

                            {/* DataGrid */}
                            <Box sx={{ flexGrow: 1, minHeight: 0, width: '100%' }}>
                                <DataGrid
                                    rows={filteredCustomsData}
                                    columns={customsColumns}
                                    getRowId={getRowIdCustoms}
                                    rowBuffer={10}
                                    columnBuffer={5}
                                    density="compact"
                                    loading={customsLoading}
                                    disableRowSelectionOnClick
                                    slots={{
                                        footer: CustomFooter,
                                        columnMenu: ExcelStyleColumnMenu
                                    }}
                                    slotProps={{
                                        footer: { totalFilteredRows: filteredCustomsData.length } as any
                                    }}
                                    initialState={{
                                        pagination: { paginationModel: { pageSize: 50, page: 0 } }
                                    }}
                                    pageSizeOptions={[50, 100, 200, 500, 1000]}
                                    sx={{
                                        border: 'none',
                                        '& .MuiDataGrid-columnHeaders, & .MuiDataGrid-filler, & .MuiDataGrid-scrollbarFiller, & .MuiDataGrid-columnHeader--filled': { backgroundColor: isDark ? '#0f172a !important' : '#F9FAFA !important', borderBottom: `1px solid ${theme.palette.divider} !important` },
                                        '& .MuiDataGrid-columnHeader': { bgcolor: isDark ? '#0f172a' : '#F9FAFA', color: isDark ? '#94a3b8' : '#707975', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' },
                                        '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 700, whiteSpace: 'normal !important', lineHeight: '1.2 !important', wordBreak: 'normal' },
                                        '& .MuiDataGrid-cell': { borderColor: theme.palette.divider, fontSize: '13px', color: theme.palette.text.primary, '&:focus': { outline: 'none !important' }, '&:focus-within': { outline: 'none !important' } },
                                        '& .MuiDataGrid-row:hover': { bgcolor: isDark ? 'rgba(255,255,255,0.03) !important' : '#F9FAFA !important' }
                                    }}
                                />
                            </Box>
                        </Box>
                    </Fade>
                )}

                {/* TAB 2: CONSUMPTION DATA */}
                {tabIndex === 1 && (
                    <Fade in={tabIndex === 1}>
                        <Box sx={{ flexGrow: 1, minHeight: 0, p: 2, display: 'flex', flexDirection: 'column' }}>
                            {/* Action Bar */}
                            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}>
                                <TextField
                                    placeholder="Tìm kiếm Customer Order No, Material Code, Tên SP..."
                                    size="small"
                                    value={consumptionSearch}
                                    onChange={(e) => setConsumptionSearch(e.target.value)}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                                            </InputAdornment>
                                        )
                                    }}
                                    sx={{ width: { xs: '100%', sm: 340 } }}
                                />

                                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                    <Select
                                        size="small"
                                        value={loadLimit}
                                        onChange={(e) => {
                                            const val = Number(e.target.value);
                                            setLoadLimit(val);
                                            fetchConsumptionData(consumptionSearch, val);
                                        }}
                                        sx={{ 
                                            height: 32, fontSize: '12px', fontWeight: 700, borderRadius: 1, 
                                            color: isDark ? '#4ade80' : '#15803d',
                                            '& .MuiOutlinedInput-notchedOutline': { borderColor: isDark ? '#334155' : '#cbd5e1' }
                                        }}
                                    >
                                        <MenuItem value={0}>Tất cả (All 147k+)</MenuItem>
                                        <MenuItem value={2000}>2.000 dòng</MenuItem>
                                        <MenuItem value={5000}>5.000 dòng</MenuItem>
                                        <MenuItem value={10000}>10.000 dòng</MenuItem>
                                        <MenuItem value={50000}>50.000 dòng</MenuItem>
                                    </Select>

                                    <Button
                                        variant="outlined"
                                        size="small"
                                        startIcon={consumptionLoading ? <CircularProgress size={16} color="inherit" /> : <RefreshIcon />}
                                        onClick={() => fetchConsumptionData(consumptionSearch)}
                                        disabled={consumptionLoading}
                                        sx={{ borderRadius: 1, textTransform: 'none', fontWeight: 700, color: isDark ? '#4ade80' : '#15803d', borderColor: isDark ? '#4ade80' : '#15803d', '&:hover': { borderColor: isDark ? '#22c55e' : '#166534', bgcolor: isDark ? 'rgba(74, 222, 128, 0.1)' : '#f0fdf4' } }}
                                    >
                                        {consumptionLoading ? 'Đang Load...' : 'Load Dữ Liệu'}
                                    </Button>

                                    <Button
                                        variant="outlined"
                                        size="small"
                                        startIcon={<DownloadIcon />}
                                        onClick={exportConsumptionExcel}
                                        disabled={filteredConsumptionData.length === 0}
                                        sx={{ borderRadius: 1, textTransform: 'none', fontWeight: 700, color: isDark ? '#4ade80' : '#15803d', borderColor: isDark ? '#4ade80' : '#15803d', '&:hover': { borderColor: isDark ? '#22c55e' : '#166534', bgcolor: isDark ? 'rgba(74, 222, 128, 0.1)' : '#f0fdf4' } }}
                                    >
                                        Export Excel
                                    </Button>

                                    <Button
                                        variant="contained"
                                        size="small"
                                        disabled={fabricLoading}
                                        startIcon={fabricLoading ? <CircularProgress size={16} color="inherit" /> : <CloudUploadIcon />}
                                        onClick={() => fabricInputRef.current?.click()}
                                        sx={{ borderRadius: 1, textTransform: 'none', fontWeight: 700, bgcolor: isDark ? '#22c55e' : '#15803d', '&:hover': { bgcolor: isDark ? '#16a34a' : '#166534' } }}
                                    >
                                        {fabricLoading ? 'Đang Import...' : 'Import File Mới'}
                                    </Button>
                                </Box>
                            </Box>

                            {/* Notifications */}
                            {fabricMessage && (
                                <Alert severity={fabricMessage.type} onClose={() => setFabricMessage(null)} sx={{ mb: 2, borderRadius: 2 }}>
                                    {fabricMessage.text}
                                </Alert>
                            )}

                            {/* DataGrid */}
                            <Box sx={{ flexGrow: 1, minHeight: 0, width: '100%' }}>
                                <DataGrid
                                    rows={filteredConsumptionData}
                                    columns={consumptionColumns}
                                    getRowId={getRowIdConsumption}
                                    rowBuffer={10}
                                    columnBuffer={5}
                                    density="compact"
                                    loading={consumptionLoading}
                                    disableRowSelectionOnClick
                                    slots={{
                                        footer: CustomFooter,
                                        columnMenu: ExcelStyleColumnMenu
                                    }}
                                    slotProps={{
                                        footer: { totalFilteredRows: filteredConsumptionData.length } as any
                                    }}
                                    initialState={{
                                        pagination: { paginationModel: { pageSize: 50, page: 0 } }
                                    }}
                                    pageSizeOptions={[50, 100, 200, 500, 1000]}
                                    sx={{
                                        border: 'none',
                                        '& .MuiDataGrid-columnHeaders, & .MuiDataGrid-filler, & .MuiDataGrid-scrollbarFiller, & .MuiDataGrid-columnHeader--filled': { backgroundColor: isDark ? '#0f172a !important' : '#F9FAFA !important', borderBottom: `1px solid ${theme.palette.divider} !important` },
                                        '& .MuiDataGrid-columnHeader': { bgcolor: isDark ? '#0f172a' : '#F9FAFA', color: isDark ? '#94a3b8' : '#707975', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' },
                                        '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 700, whiteSpace: 'normal !important', lineHeight: '1.2 !important', wordBreak: 'normal' },
                                        '& .MuiDataGrid-cell': { borderColor: theme.palette.divider, fontSize: '13px', color: theme.palette.text.primary, '&:focus': { outline: 'none !important' }, '&:focus-within': { outline: 'none !important' } },
                                        '& .MuiDataGrid-row:hover': { bgcolor: isDark ? 'rgba(255,255,255,0.03) !important' : '#F9FAFA !important' }
                                    }}
                                />
                            </Box>
                        </Box>
                    </Fade>
                )}
            </Paper>
        </Box>
    );
};
