import React, { useState } from 'react';
import { 
    Box, Typography, TextField, Button, Paper, InputAdornment, CircularProgress, Chip, Pagination, Select, MenuItem, useTheme, IconButton, Grid, Tooltip
} from '@mui/material';
import { 
    Search as SearchIcon, AutoAwesome as StarIcon, Download as DownloadIcon, Clear as ClearIcon,
    Inventory as InventoryIcon, Verified as VerifiedIcon, WarningAmber as WarningIcon, ErrorOutline as ErrorIcon,
    FilterList as FilterListIcon
} from '@mui/icons-material';
import { DataGrid, GridColDef, gridPageCountSelector, gridPageSelector, gridPageSizeSelector, useGridApiContext, useGridSelector, GridFooterContainer } from '@mui/x-data-grid';
import { authFetch } from '@traxeco/shared';
import { useTranslation } from 'react-i18next';
import ExcelStyleColumnMenu from '../components/ExcelStyleColumnMenu';
import CustomFooter from '../components/CustomFooter';
import { columnFilterStore } from '../components/ColumnFilterContext';
import ExcelJS from 'exceljs';

interface ErpMaterial {
    formType?: string;
    remark?: string;
    company: string;
    salesOrder: string;
    productionNumber: string;
    productionStatus: string;
    customerRequisition: string;
    customerReference: string;
    customerNo: string;
    customerOrderNo: string;
    fgStyle: string;
    itemFgNumber: string;
    garmentColor: string;
    itemFgSize: string;
    unitOfFg: string;
    salesOrderType: string;
    saleOrderLineStatus: string;
    quantitySalesLine: number;
    
    matrClass: string;
    materialCode: string;
    materialName: string;
    bomConfigId: string;
    color: string;
    colorName: string;
    size: string;
    rmStyle: string;
    requireQty: number;
    reserveQty: number;
    unitOfRm: string;
    
    issueStatus: string;
    inventBatchIdPo: string;
    serialNumber: string;
    suppCode: string;
    supplier: string;
    purchaseOrderStatus: string;
    text: string;
    priceRmPo: number;
    unitOfRmPo: string;
    quantityPo: number;
    
    warehouse: string;
    location: string;
    referenceLot: string;
    countryRegion: string;
    customCode: string;
    productReceipt: string;
    declarationNumber: string;
    partName: string;
    bomConsumption: number;
    
    purchLine: string;
    deliveryDate: string;
    quantityOrder: number;
    quantityReceived: number;
    currency: string;
    
    productDescriptionOfMaterial: string;
    plantCodeField: string;
    customerNumber: string;
    trxPolat: string;
    
    isMainFabric: boolean;
    missingFromWeekly: string;
}



export const DashboardPage = () => {
    const { t } = useTranslation();
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const [poNumber, setPoNumber] = useState('');
    const [loading, setLoading] = useState(false);
    const [rows, setRows] = useState<ErpMaterial[]>([]);
    const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({});
    const [filterMode, setFilterMode] = useState<'all' | 'valid' | 'missingCustoms' | 'missingMain'>('all');
    const searchInputRef = React.useRef<HTMLInputElement | null>(null);
    const searchCache = React.useRef<Record<string, ErpMaterial[]>>({});
    const pageId = 'coo-dashboard';

    React.useEffect(() => {
        columnFilterStore.register(pageId, columnFilters, setColumnFilters, rows);
    }, [columnFilters, rows]);

    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'f')) {
                e.preventDefault();
                searchInputRef.current?.focus();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const filteredRows = React.useMemo(() => {
        let list = rows;
        if (filterMode === 'valid') {
            list = list.filter(r => !r.missingFromWeekly);
        } else if (filterMode === 'missingCustoms') {
            list = list.filter(r => r.missingFromWeekly && r.missingFromWeekly.includes('Missing Declaration'));
        } else if (filterMode === 'missingMain') {
            list = list.filter(r => r.missingFromWeekly && r.missingFromWeekly.includes('Missing Main Fabric'));
        }

        if (Object.keys(columnFilters).length === 0) return list;
        return list.filter(row => {
            return Object.entries(columnFilters).every(([field, allowedValues]) => {
                if (!allowedValues || allowedValues.length === 0) return true;
                const val = row[field as keyof ErpMaterial];
                const displayVal = (val !== undefined && val !== null && val !== '') ? String(val) : '(Blanks)';
                return allowedValues.includes(displayVal);
            });
        });
    }, [rows, columnFilters, filterMode]);

    const stats = React.useMemo(() => {
        let validCount = 0;
        let missingDeclCount = 0;
        let missingMainCount = 0;
        
        rows.forEach(r => {
            const missing = r.missingFromWeekly;
            if (!missing) {
                validCount++;
            } else if (missing.includes('Missing Declaration')) {
                missingDeclCount++;
            } else if (missing.includes('Missing Main Fabric')) {
                missingMainCount++;
            } else {
                validCount++;
            }
        });
        const total = rows.length;
        const complianceRate = total > 0 ? ((validCount / total) * 100).toFixed(1) : '100.0';
        return { total, validCount, missingDeclCount, missingMainCount, complianceRate };
    }, [rows]);

    const handleSearch = React.useCallback(async () => {
        if (!poNumber.trim()) return;
        const cleanPo = poNumber.replace(/[\r\n]+/g, ',');

        setLoading(true);

        try {
            const res = await authFetch(`coo/erp-materials?poNumber=${encodeURIComponent(cleanPo)}`);
            if (res.ok) {
                const responseData = await res.json();
                const rawData = Array.isArray(responseData) ? responseData : (responseData.data || []);

                const mainFabricsByPo: Record<string, any> = {};
                rawData.forEach((row: any) => {
                    if (row.isMainFabric && row.customerReference) {
                        mainFabricsByPo[row.customerReference] = row;
                    }
                });

                rawData.forEach((row: any) => {
                    const po = row.customerReference;
                    if (!po) return;
                    if (!mainFabricsByPo[po]) {
                        const isFOC = row.serialNumber && row.serialNumber.toLowerCase().includes('foc');
                        if (!isFOC) {
                            const nameLower = (row.materialName || '').toLowerCase();
                            const classLower = (row.matrClass || '').toLowerCase();
                            const customCode = (row.customCode || '').toLowerCase();
                            const isFabric = nameLower.includes('fabric') || nameLower.includes('fab') || classLower.includes('fab') || customCode.startsWith('t');
                            
                            if (isFabric || !mainFabricsByPo[po + '_candidate']) {
                                mainFabricsByPo[po + '_candidate'] = row;
                            }
                        }
                    }
                });

                rawData.forEach((row: any) => {
                    const po = row.customerReference;
                    if (po && !mainFabricsByPo[po]) {
                        const candidate = mainFabricsByPo[po + '_candidate'];
                        if (candidate) {
                            candidate.isMainFabric = true;
                            mainFabricsByPo[po] = candidate;
                        }
                    }
                });

                const declNoByPo: Record<string, string> = {};
                const countryByPo: Record<string, string> = {};
                rawData.forEach((row: any) => {
                    const po = row.customerReference;
                    if (!po) return;
                    if (row.declarationNumber && row.declarationNumber.trim() && !declNoByPo[po]) {
                        declNoByPo[po] = row.declarationNumber.trim();
                    }
                    if (row.countryRegion && row.countryRegion.trim() && !countryByPo[po]) {
                        countryByPo[po] = row.countryRegion.trim();
                    }
                });

                const data = rawData.map((row: any, index: number) => {
                    row.id = `row-${index}`;
                    let formType = '';
                    let remark = '';
                    
                    const mainFabric = mainFabricsByPo[row.customerReference];
                    const hasMainFabric = !!mainFabric;
                    const po = row.customerReference;
                    
                    const declarationToUse = (row.declarationNumber && row.declarationNumber.trim())
                        ? row.declarationNumber.trim()
                        : (mainFabric && mainFabric.declarationNumber && mainFabric.declarationNumber.trim())
                            ? mainFabric.declarationNumber.trim()
                            : declNoByPo[po] || '';

                    let countryToUse = (row.countryRegion && row.countryRegion.trim())
                        ? row.countryRegion.trim()
                        : (mainFabric && mainFabric.countryRegion && mainFabric.countryRegion.trim())
                            ? mainFabric.countryRegion.trim()
                            : countryByPo[po] || '';

                    if (countryToUse.toUpperCase() === 'THAILND') {
                        countryToUse = 'THAILAND';
                    }

                    const rawCountry = (countryToUse || '').trim();
                    const rawDecl = (declarationToUse || '').trim();
                    
                    const backendMissing = row.missingFromWeekly || '';
                    const missingItems: string[] = [];
                    if (!hasMainFabric || backendMissing.includes('Missing Main Fabric')) {
                        missingItems.push('Missing Main Fabric');
                    }
                    if (!rawDecl || !rawCountry || backendMissing.includes('Missing Declaration')) {
                        missingItems.push('Missing Declaration');
                    }

                    const status = missingItems.join(', ');

                    // FormType & Remark rules specified by user:
                    // FormType & Remark MUST strictly follow the Country of the MAIN FABRIC item of the PO!
                    const mainFabricCountry = (mainFabric && mainFabric.countryRegion && mainFabric.countryRegion.trim())
                        ? mainFabric.countryRegion.trim()
                        : countryByPo[po] || countryToUse || '';

                    const mainCountryUpper = (mainFabricCountry || '').toUpperCase().trim();

                    if (row.formType !== undefined && row.formType !== null) {
                        formType = row.formType;
                        remark = row.remark || '';
                    } else if (!mainCountryUpper || mainCountryUpper === 'VNM' || mainCountryUpper === 'VN') {
                        formType = '';
                        remark = '';
                    } else if (mainCountryUpper === 'VIETNAME' || mainCountryUpper === 'VIETNAM' || mainCountryUpper === 'VIỆT NAM' || mainCountryUpper === 'VIET NAM') {
                        formType = 'FORM EUR.1';
                        remark = '';
                    } else {
                        formType = 'FORM EUR.1-NO';
                        let formattedCountry = mainFabricCountry.split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
                        if (formattedCountry.toUpperCase() === 'THAILND' || formattedCountry.toUpperCase() === 'THAILAND') {
                            formattedCountry = 'Thailand';
                        }
                        remark = `Main Fabric Import from ${formattedCountry}`;
                    }
                    
                    return { 
                        ...row, 
                        customerOrderNo: row.customerOrderNo || row.customerReference || '',
                        declarationNumber: declarationToUse, 
                        countryRegion: countryToUse, 
                        formType, 
                        remark,
                        missingFromWeekly: status
                    };
                });

                const poIndexMap: Record<string, number> = {};
                cleanPo.split(',').map((s: string) => s.trim()).filter(Boolean).forEach((p: string, idx: number) => {
                    poIndexMap[p] = idx;
                    if (p.startsWith('0')) poIndexMap[p.slice(1)] = idx;
                });

                data.sort((a: any, b: any) => {
                    const poA = String(a.customerReference || '');
                    const poB = String(b.customerReference || '');
                    const idxA = poIndexMap[poA] !== undefined ? poIndexMap[poA] : 9999;
                    const idxB = poIndexMap[poB] !== undefined ? poIndexMap[poB] : 9999;
                    if (idxA !== idxB) return idxA - idxB;
                    if (poA !== poB) return poA.localeCompare(poB);

                    const prodA = String(a.productionNumber || '');
                    const prodB = String(b.productionNumber || '');
                    if (prodA !== prodB) return prodA.localeCompare(prodB);

                    const matA = String(a.materialCode || '');
                    const matB = String(b.materialCode || '');
                    if (matA !== matB) return matA.localeCompare(matB);

                    const recA = String(a.productReceipt || '');
                    const recB = String(b.productReceipt || '');
                    return recA.localeCompare(recB);
                });

                data.forEach((r: any, idx: number) => {
                    r.id = `row-${idx}`;
                });

                searchCache.current[cleanPo] = data;
                setRows(data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [poNumber]);

    const columns: GridColDef[] = React.useMemo(() => [
        { field: 'company', headerName: 'Company', width: 100 },
        { field: 'salesOrder', headerName: 'Sales order', width: 130 },
        { field: 'productionNumber', headerName: 'Production number', width: 150 },
        { field: 'productionStatus', headerName: 'Production Status', width: 150 },
        { field: 'customerRequisition', headerName: 'Customer requisition', width: 180 },
        { field: 'customerReference', headerName: 'Customer reference', width: 160 },
        { field: 'formType', headerName: 'FORMTYPE', width: 140 },
        { field: 'remark', headerName: 'REMARK', width: 220 },
        { field: 'customerNo', headerName: 'Customer No.', width: 130 },
        { field: 'customerOrderNo', headerName: 'Customer order No.', width: 160 },
        { field: 'fgStyle', headerName: 'FG Style', width: 120 },
        { field: 'itemFgNumber', headerName: 'Item FG number', width: 140 },
        { field: 'garmentColor', headerName: 'Garment Color', width: 140 },
        { field: 'itemFgSize', headerName: 'Item FG Size', width: 120 },
        { field: 'unitOfFg', headerName: 'Unit Of FG', width: 110 },
        { field: 'salesOrderType', headerName: 'Sales order Type', width: 150 },
        { field: 'saleOrderLineStatus', headerName: 'Sale order Line status', width: 170 },
        { field: 'quantitySalesLine', headerName: 'Quantity Sales line', width: 160, type: 'number' },
        { field: 'matrClass', headerName: 'Matr Class', width: 120 },
        { 
            field: 'materialCode', 
            headerName: 'Material Code', 
            width: 160,
            renderCell: (params) => {
                const isMain = params.row.isMainFabric;
                return (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontWeight: isMain ? 700 : 400, color: isMain ? '#d32f2f' : 'inherit' }}>
                        {params.value}
                        {isMain && <StarIcon sx={{ fontSize: 14, color: '#d32f2f' }} />}
                    </Box>
                );
            }
        },
        { field: 'materialName', headerName: 'Material Name', width: 200 },
        { field: 'bomConfigId', headerName: 'Bom ConfigId', width: 130 },
        { field: 'color', headerName: 'Color', width: 100 },
        { field: 'colorName', headerName: 'Color Name', width: 140 },
        { field: 'size', headerName: 'Size', width: 90 },
        { field: 'rmStyle', headerName: 'RM Style', width: 110 },
        { field: 'requireQty', headerName: 'Require Qty', width: 130, type: 'number' },
        { field: 'reserveQty', headerName: 'Reserve Qty', width: 130, type: 'number' },
        { field: 'unitOfRm', headerName: 'Unit Of RM', width: 110 },
        { field: 'issueStatus', headerName: 'Issue status', width: 120 },
        { field: 'inventBatchIdPo', headerName: 'Invent BatchId / PO', width: 160 },
        { field: 'serialNumber', headerName: 'Serial number', width: 140 },
        { field: 'suppCode', headerName: 'Supp Code', width: 120 },
        { field: 'supplier', headerName: 'Supplier', width: 180 },
        { field: 'purchaseOrderStatus', headerName: 'Purchase order status', width: 170 },
        { field: 'text', headerName: 'Text', width: 150 },
        { field: 'priceRmPo', headerName: 'Price RM (P/O)', width: 130, type: 'number' },
        { field: 'unitOfRmPo', headerName: 'Unit Of RM (P/O)', width: 130 },
        { field: 'quantityPo', headerName: 'Quantity PO', width: 130, type: 'number' },
        { field: 'warehouse', headerName: 'Warehouse', width: 120 },
        { field: 'location', headerName: 'Location', width: 120 },
        { field: 'referenceLot', headerName: 'Reference lot', width: 130 },
        { field: 'countryRegion', headerName: 'Country/region', width: 140 },
        { field: 'customCode', headerName: 'Custom code', width: 120 },
        { field: 'productReceipt', headerName: 'Product receipt', width: 140 },
        { field: 'declarationNumber', headerName: 'Declaration number', width: 170 },
        { field: 'partName', headerName: 'Part Name', width: 140 },
        { field: 'bomConsumption', headerName: 'Bom consumption', width: 150, type: 'number' },
        { field: 'purchLine', headerName: 'PurchLine', width: 130 },
        { field: 'deliveryDate', headerName: 'Delivery date', width: 130 },
        { field: 'quantityOrder', headerName: 'Quantity Order', width: 130, type: 'number' },
        { field: 'quantityReceived', headerName: 'Quantity received', width: 140, type: 'number' },
        { field: 'currency', headerName: 'Currency', width: 100 },
        { field: 'productDescriptionOfMaterial', headerName: 'Product Description of material', width: 220 },
        { field: 'plantCodeField', headerName: 'Plant Code field', width: 140 },
        { field: 'customerNumber', headerName: 'Customer Number', width: 140 },
        { field: 'trxPoLat', headerName: 'TRX_POLAT', width: 130 }
    ], []);

    const handleExportExcel = React.useCallback(async () => {
        if (filteredRows.length === 0) return;
        
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('ERP Data Sync');
        
        const headerRow = worksheet.addRow(columns.map(c => c.headerName));
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF15803D' }
        };
        
        columns.forEach((col, idx) => {
            worksheet.getColumn(idx + 1).width = (col.width || 100) / 7;
        });

        worksheet.autoFilter = {
            from: { row: 1, column: 1 },
            to: { row: 1, column: columns.length }
        };

        const poIndexMap: Record<string, number> = {};
        poNumber.replace(/[\r\n]+/g, ',').split(',').map((s: string) => s.trim()).filter(Boolean).forEach((p: string, idx: number) => {
            poIndexMap[p] = idx;
            if (p.startsWith('0')) poIndexMap[p.slice(1)] = idx;
        });

        const exportRows = [...filteredRows].sort((a, b) => {
            const poA = String(a.customerReference || '');
            const poB = String(b.customerReference || '');
            const idxA = poIndexMap[poA] !== undefined ? poIndexMap[poA] : 9999;
            const idxB = poIndexMap[poB] !== undefined ? poIndexMap[poB] : 9999;
            if (idxA !== idxB) return idxA - idxB;
            if (poA !== poB) return poA.localeCompare(poB);

            const prodA = String(a.productionNumber || '');
            const prodB = String(b.productionNumber || '');
            if (prodA !== prodB) return prodA.localeCompare(prodB);

            const matA = String(a.materialCode || '');
            const matB = String(b.materialCode || '');
            if (matA !== matB) return matA.localeCompare(matB);

            const recA = String(a.productReceipt || '');
            const recB = String(b.productReceipt || '');
            return recA.localeCompare(recB);
        });

        const posWithMainFabric = new Set<string>();
        exportRows.forEach(row => {
            if (row.isMainFabric && row.customerReference) {
                posWithMainFabric.add(row.customerReference);
            }
        });

        exportRows.forEach(row => {
            const rowData = columns.map(col => {
                let val = row[col.field as keyof ErpMaterial];
                if (val === null || val === undefined) return '';
                return val;
            });
            
            const addedRow = worksheet.addRow(rowData);
            
            if (row.isMainFabric) {
                const materialCodeIdx = columns.findIndex(c => c.field === 'materialCode') + 1;
                if (materialCodeIdx > 0) {
                    const cell = addedRow.getCell(materialCodeIdx);
                    cell.font = { bold: true, color: { argb: 'FFD32F2F' } };
                }
            }
            
            const po = row.customerReference;
            const isMissingMain = (po && !posWithMainFabric.has(po)) || (row.missingFromWeekly && row.missingFromWeekly.includes('Missing Main Fabric'));
            const isMissingDecl = (row.missingFromWeekly && row.missingFromWeekly.includes('Missing Declaration')) || !row.declarationNumber || !row.countryRegion;

            let bgHex: string | null = null;
            if (isMissingDecl) {
                bgHex = 'FFFFEDD5'; // Soft Orange for Missing Declaration
            } else if (isMissingMain) {
                bgHex = 'FFFFF08A'; // Soft Yellow for Missing Main Fabric
            }

            if (bgHex) {
                addedRow.eachCell((cell) => {
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: bgHex }
                    };
                });
            }
        });
        
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `ERP_Data_Sync_${new Date().toISOString().slice(0,10)}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, [filteredRows, columns, stats, t]);    return (
        <Box sx={{ px: 2, pb: 2, pt: 0, height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
            <Paper sx={{ p: 2, mb: 2, borderRadius: 2, display: 'flex', gap: 2, alignItems: 'center', border: `1px solid ${theme.palette.divider}`, bgcolor: 'background.paper', flexShrink: 0, flexWrap: 'wrap' }} elevation={0}>
                <TextField 
                    inputRef={searchInputRef}
                    placeholder={t('coo.dashboard.poSearchPlaceholder', 'Search PO (Ctrl+K)...')} 
                    variant="outlined" 
                    size="small"
                    value={poNumber}
                    onChange={(e) => setPoNumber(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && poNumber.trim() && !loading) {
                            handleSearch();
                        }
                    }}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    InputProps={{
                        startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: isDark ? '#4ade80' : '#15803d' }} /></InputAdornment>,
                        endAdornment: poNumber ? (
                            <InputAdornment position="end">
                                <IconButton 
                                    size="small" 
                                    onClick={() => { setPoNumber(''); setRows([]); setFilterMode('all'); }}
                                    sx={{ color: isDark ? '#94a3b8' : '#64748b', p: 0.5, '&:hover': { color: isDark ? '#f8fafc' : '#0f172a' } }}
                                >
                                    <ClearIcon fontSize="small" />
                                </IconButton>
                            </InputAdornment>
                        ) : null
                    }}
                    sx={{ 
                        width: 320, 
                        '& .MuiOutlinedInput-root': { 
                            bgcolor: isDark ? '#0f172a !important' : '#ffffff !important',
                            color: isDark ? '#f8fafc !important' : '#0f172a !important',
                            borderRadius: 2,
                            '& fieldset': { borderColor: isDark ? '#334155 !important' : '#cbd5e1 !important' },
                            '&:hover fieldset': { borderColor: isDark ? '#4ade80 !important' : '#15803d !important' },
                            '&.Mui-focused fieldset': { borderColor: isDark ? '#4ade80 !important' : '#15803d !important' } 
                        },
                        '& .MuiInputBase-input': {
                            color: isDark ? '#f8fafc !important' : '#0f172a !important',
                            bgcolor: 'transparent !important'
                        }
                    }}
                />
                <Button 
                    variant="contained" 
                    onClick={handleSearch} 
                    disabled={loading || !poNumber.trim()}
                    sx={{ px: 4, borderRadius: 1, textTransform: 'none', fontWeight: 600, bgcolor: isDark ? '#22c55e' : '#15803d', '&:hover': { bgcolor: isDark ? '#16a34a' : '#166534' } }}
                >
                    {loading ? <CircularProgress size={24} color="inherit" /> : t('coo.dashboard.searchBtn', 'Tìm Kiếm PO')}
                </Button>
                <Button 
                    variant="outlined" 
                    onClick={handleExportExcel} 
                    disabled={rows.length === 0}
                    startIcon={<DownloadIcon />}
                    sx={{ px: 3, borderRadius: 1, textTransform: 'none', fontWeight: 600, color: isDark ? '#4ade80' : '#15803d', borderColor: isDark ? '#4ade80' : '#15803d', '&:hover': { borderColor: isDark ? '#22c55e' : '#166534', bgcolor: isDark ? 'rgba(74, 222, 128, 0.1)' : '#f0fdf4' } }}
                >
                    {t('coo.dashboard.exportExcel', 'Xuất Excel')}
                </Button>

                {rows.length > 0 && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, ml: 'auto', flexWrap: 'wrap' }}>
                        {/* 1. Total Rows Card */}
                        <Paper 
                            onClick={() => setFilterMode('all')}
                            sx={{ 
                                px: 1.5, py: 1, borderRadius: 2, 
                                bgcolor: filterMode === 'all' ? (isDark ? 'rgba(59, 130, 246, 0.2)' : '#dbeafe') : (isDark ? '#0f172a' : '#f8fafc'), 
                                border: `1px solid ${filterMode === 'all' ? '#3b82f6' : (isDark ? '#334155' : '#cbd5e1')}`, 
                                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 1, transition: 'all 0.2s',
                                '&:hover': { borderColor: '#3b82f6' }
                            }} 
                            elevation={0}
                        >
                            <Box sx={{ width: 32, height: 32, borderRadius: 1.5, bgcolor: isDark ? 'rgba(59, 130, 246, 0.2)' : '#eff6ff', color: isDark ? '#60a5fa' : '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <InventoryIcon fontSize="small" />
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, fontSize: '9px', textTransform: 'uppercase', display: 'block', lineHeight: 1 }}>
                                    {t('coo.dashboard.kpiTotal', 'TỔNG DÒNG')}
                                </Typography>
                                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: theme.palette.text.primary, lineHeight: 1.1 }}>
                                    {stats.total.toLocaleString()}
                                </Typography>
                            </Box>
                        </Paper>

                        {/* 2. Valid Rate Card */}
                        <Paper 
                            onClick={() => setFilterMode(filterMode === 'valid' ? 'all' : 'valid')}
                            sx={{ 
                                px: 1.5, py: 1, borderRadius: 2, 
                                bgcolor: filterMode === 'valid' ? (isDark ? 'rgba(34, 197, 94, 0.25)' : '#bbf7d0') : (isDark ? '#0f172a' : '#f8fafc'), 
                                border: `1px solid ${filterMode === 'valid' ? '#22c55e' : (isDark ? '#334155' : '#cbd5e1')}`, 
                                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 1, transition: 'all 0.2s',
                                '&:hover': { borderColor: '#22c55e' }
                            }} 
                            elevation={0}
                        >
                            <Box sx={{ width: 32, height: 32, borderRadius: 1.5, bgcolor: isDark ? 'rgba(34, 197, 94, 0.2)' : '#dcfce7', color: isDark ? '#4ade80' : '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <VerifiedIcon fontSize="small" />
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, fontSize: '9px', textTransform: 'uppercase', display: 'block', lineHeight: 1 }}>
                                    {t('coo.dashboard.kpiRate', 'TỶ LỆ HỢP LỆ')}
                                </Typography>
                                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: isDark ? '#4ade80' : '#15803d', lineHeight: 1.1 }}>
                                    {stats.complianceRate}% <Typography component="span" variant="caption" color="text.secondary">({stats.validCount}/{stats.total})</Typography>
                                </Typography>
                            </Box>
                        </Paper>

                        {/* 3. Missing Declaration Card - ORANGE */}
                        <Paper 
                            onClick={() => setFilterMode(filterMode === 'missingDecl' ? 'all' : 'missingDecl')}
                            sx={{ 
                                px: 1.5, py: 1, borderRadius: 2, 
                                bgcolor: filterMode === 'missingDecl' ? (isDark ? 'rgba(249, 115, 22, 0.3)' : '#ffedd5') : (isDark ? '#0f172a' : '#f8fafc'), 
                                border: `1px solid ${filterMode === 'missingDecl' ? '#f97316' : (isDark ? '#334155' : '#cbd5e1')}`, 
                                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 1, transition: 'all 0.2s',
                                '&:hover': { borderColor: '#f97316' }
                            }} 
                            elevation={0}
                        >
                            <Box sx={{ width: 32, height: 32, borderRadius: 1.5, bgcolor: isDark ? 'rgba(249, 115, 22, 0.2)' : '#ffedd5', color: isDark ? '#ffedd5' : '#9a3412', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <WarningIcon fontSize="small" />
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, fontSize: '9px', textTransform: 'uppercase', display: 'block', lineHeight: 1 }}>
                                    {t('coo.dashboard.kpiMissingCustoms', 'THIẾU HẢI QUAN')}
                                </Typography>
                                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: isDark ? '#ffedd5' : '#9a3412', lineHeight: 1.1 }}>
                                    {stats.missingDeclCount}
                                </Typography>
                            </Box>
                        </Paper>

                        {/* 4. Missing Main Fabric Card - YELLOW */}
                        <Paper 
                            onClick={() => setFilterMode(filterMode === 'missingMain' ? 'all' : 'missingMain')}
                            sx={{ 
                                px: 1.5, py: 1, borderRadius: 2, 
                                bgcolor: filterMode === 'missingMain' ? (isDark ? 'rgba(234, 179, 8, 0.3)' : '#fef08a') : (isDark ? '#0f172a' : '#f8fafc'), 
                                border: `1px solid ${filterMode === 'missingMain' ? '#eab308' : (isDark ? '#334155' : '#cbd5e1')}`, 
                                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 1, transition: 'all 0.2s',
                                '&:hover': { borderColor: '#eab308' }
                            }} 
                            elevation={0}
                        >
                            <Box sx={{ width: 32, height: 32, borderRadius: 1.5, bgcolor: isDark ? 'rgba(234, 179, 8, 0.2)' : '#fef9c3', color: isDark ? '#fef08a' : '#854d0e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <ErrorIcon fontSize="small" />
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, fontSize: '9px', textTransform: 'uppercase', display: 'block', lineHeight: 1 }}>
                                    {t('coo.dashboard.kpiMissingMain', 'THIẾU VẢI CHÍNH')}
                                </Typography>
                                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: isDark ? '#fef08a' : '#854d0e', lineHeight: 1.1 }}>
                                    {stats.missingMainCount}
                                </Typography>
                            </Box>
                        </Paper>
                    </Box>
                )}
            </Paper>

            <Paper sx={{ flexGrow: 1, minHeight: 0, width: '100%', borderRadius: 2, overflow: 'hidden', border: `1px solid ${theme.palette.divider}`, bgcolor: 'background.paper' }} elevation={0}>
                <DataGrid 
                    rows={filteredRows} 
                    columns={columns} 
                    getRowId={(r) => (r as any).id}
                    disableRowSelectionOnClick
                    density="compact"
                    getRowClassName={(params) => {
                        const missing = params.row.missingFromWeekly;
                        if (!missing) return '';
                        if (missing.includes('Missing Declaration')) return 'missing-weekly-row';
                        if (missing.includes('Missing Main Fabric')) return 'missing-main-fabric-row';
                        return '';
                    }}
                    loading={loading}
                    slots={{
                        footer: CustomFooter,
                        columnMenu: ExcelStyleColumnMenu
                    }}
                    slotProps={{
                        footer: { totalFilteredRows: filteredRows.length } as any
                    }}
                    initialState={{
                        pagination: {
                            paginationModel: { pageSize: 50, page: 0 },
                        },
                    }}
                    pageSizeOptions={[50, 100, 200, 500, 1000]}
                    sx={{
                        border: 'none',
                        '& .MuiDataGrid-columnHeaders, & .MuiDataGrid-filler, & .MuiDataGrid-scrollbarFiller, & .MuiDataGrid-columnHeader--filled': { backgroundColor: isDark ? '#0f172a !important' : '#F9FAFA !important', borderBottom: `1px solid ${theme.palette.divider} !important` },
                        '& .MuiDataGrid-columnHeader': { bgcolor: isDark ? '#0f172a' : '#F9FAFA', color: isDark ? '#94a3b8' : '#707975', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' },
                        '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 700, whiteSpace: 'normal !important', lineHeight: '1.2 !important', wordBreak: 'normal' },
                        '& .MuiDataGrid-cell': { borderColor: theme.palette.divider, fontSize: '13px', color: theme.palette.text.primary, '&:focus': { outline: 'none !important' }, '&:focus-within': { outline: 'none !important' } },
                        '& .MuiDataGrid-row:hover': { bgcolor: isDark ? 'rgba(255,255,255,0.03) !important' : '#F9FAFA !important' },
                        '& .missing-main-fabric-row, & .missing-main-fabric-row .MuiDataGrid-cell': { backgroundColor: isDark ? 'rgba(234, 179, 8, 0.25) !important' : '#fef08a !important', color: isDark ? '#fef08a !important' : '#854d0e !important' },
                        '& .missing-main-fabric-row:hover, & .missing-main-fabric-row:hover .MuiDataGrid-cell': { backgroundColor: isDark ? 'rgba(234, 179, 8, 0.35) !important' : '#fde047 !important' },
                        '& .missing-weekly-row, & .missing-weekly-row .MuiDataGrid-cell': { backgroundColor: isDark ? 'rgba(249, 115, 22, 0.25) !important' : '#ffedd5 !important', color: isDark ? '#ffedd5 !important' : '#9a3412 !important' },
                        '& .missing-weekly-row:hover, & .missing-weekly-row:hover .MuiDataGrid-cell': { backgroundColor: isDark ? 'rgba(249, 115, 22, 0.35) !important' : '#fed7aa !important' },
                        '& .MuiDataGrid-iconButtonContainer, & .MuiDataGrid-menuIcon': {
                            visibility: 'visible !important',
                            width: 'auto !important'
                        },
                        '& .MuiDataGrid-menuIcon .MuiIconButton-root, & .MuiDataGrid-iconButtonContainer .MuiIconButton-root': {
                            color: isDark ? '#94a3b8 !important' : '#64748b !important',
                            backgroundColor: 'transparent !important',
                            '&:hover': {
                                backgroundColor: isDark ? 'rgba(255,255,255,0.1) !important' : 'rgba(0,0,0,0.05) !important'
                            }
                        },
                        '& .MuiBadge-badge': {
                            backgroundColor: isDark ? '#22c55e !important' : '#15803d !important',
                            color: '#ffffff !important'
                        }
                    }}
                />
            </Paper>
        </Box>
    );
};
