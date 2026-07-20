import React, { useState } from 'react';
import { 
    Box, Typography, TextField, Button, Paper, InputAdornment, CircularProgress, Chip, Pagination, Select, MenuItem
} from '@mui/material';
import { Search as SearchIcon, AutoAwesome as StarIcon, Download as DownloadIcon } from '@mui/icons-material';
import { DataGrid, GridColDef, gridPageCountSelector, gridPageSelector, gridPageSizeSelector, useGridApiContext, useGridSelector, GridFooterContainer } from '@mui/x-data-grid';
import { authFetch } from '@traxeco/shared';
import ExcelStyleColumnMenu from '../components/ExcelStyleColumnMenu';
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

function CustomFooter(props: any) {
  const { totalFilteredRows } = props;
  const apiRef = useGridApiContext();
  const page = useGridSelector(apiRef, gridPageSelector);
  const pageCount = useGridSelector(apiRef, gridPageCountSelector);
  const pageSize = useGridSelector(apiRef, gridPageSizeSelector) || 20;

  const handlePageChange = (newPage: number) => {
    if (newPage >= 0 && newPage < pageCount) {
      apiRef.current.setPage(newPage);
    }
  };

  const current = page + 1;
  const items: (number | string)[] = [];

  if (pageCount <= 5) {
      for (let i = 1; i <= pageCount; i++) items.push(i);
  } else {
      if (current <= 2) {
          // Near start: 1 2 3 ... last
          items.push(1, 2, 3, '...', pageCount);
      } else if (current >= pageCount - 1) {
          // Near end: 1 ... (last-2) (last-1) last
          items.push(1, '...', pageCount - 2, pageCount - 1, pageCount);
      } else {
          // Middle: 1 ... (cur) (cur+1) (cur+2) ... last
          const end = Math.min(current + 2, pageCount);
          const start = current;
          items.push(1);
          if (start > 2) items.push('...');
          for (let i = start; i <= end; i++) items.push(i);
          if (end < pageCount - 1) items.push('...');
          if (end < pageCount) items.push(pageCount);
      }
  }

  return (
    <GridFooterContainer sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2, borderTop: '1px solid #e2e8f0', minHeight: 52 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, color: '#15803d', mr: 2 }}>
            Total rows: {totalFilteredRows ?? 0}
        </Typography>
        <Typography variant="body2" color="text.secondary">Rows per page:</Typography>
        <Select
          value={pageSize}
          onChange={(e) => apiRef.current.setPageSize(Number(e.target.value))}
          size="small"
          variant="standard"
          disableUnderline
          sx={{ fontSize: '0.875rem', fontWeight: 500, color: 'text.secondary', '& .MuiSelect-select': { py: 0.5 } }}
        >
          <MenuItem value={15}>15</MenuItem>
          <MenuItem value={20}>20</MenuItem>
          <MenuItem value={30}>30</MenuItem>
          <MenuItem value={50}>50</MenuItem>
          <MenuItem value={100}>100</MenuItem>
        </Select>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Button 
          variant="text" 
          disabled={page === 0} 
          onClick={() => handlePageChange(page - 1)}
          sx={{ minWidth: 32, p: 0.5, color: '#15803d' }}
        >
          &lt;
        </Button>
        
        {items.map((item, index) => (
          item === '...' ? (
            <Typography key={`ellipsis-${index}`} variant="body2" sx={{ px: 1, color: '#64748b' }}>...</Typography>
          ) : (
            <Button
              key={`page-${item}`}
              variant={item === current ? "contained" : "text"}
              onClick={() => handlePageChange((item as number) - 1)}
              sx={{ 
                minWidth: 32, 
                width: 32,
                height: 32, 
                p: 0, 
                borderRadius: '50%',
                bgcolor: item === current ? '#15803d' : 'transparent',
                color: item === current ? '#fff' : '#15803d',
                '&:hover': { bgcolor: item === current ? '#166534' : '#f0fdf4' }
              }}
            >
              {item}
            </Button>
          )
        ))}

        <Button 
          variant="text" 
          disabled={page >= pageCount - 1} 
          onClick={() => handlePageChange(page + 1)}
          sx={{ minWidth: 32, p: 0.5, color: '#15803d' }}
        >
          &gt;
        </Button>
      </Box>
    </GridFooterContainer>
  );
}

export const DashboardPage = () => {
    const [poNumber, setPoNumber] = useState('');
    const [loading, setLoading] = useState(false);
    const [rows, setRows] = useState<ErpMaterial[]>([]);
    const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({});
    const pageId = 'coo-dashboard';

    React.useEffect(() => {
        columnFilterStore.register(pageId, columnFilters, setColumnFilters, rows);
    }, [columnFilters, rows]);

    const filteredRows = React.useMemo(() => {
        if (Object.keys(columnFilters).length === 0) return rows;
        return rows.filter(row => {
            return Object.entries(columnFilters).every(([field, allowedValues]) => {
                if (!allowedValues || allowedValues.length === 0) return true;
                const val = row[field as keyof ErpMaterial];
                const displayVal = (val !== undefined && val !== null && val !== '') ? String(val) : '(Blanks)';
                return allowedValues.includes(displayVal);
            });
        });
    }, [rows, columnFilters]);

    const handleSearch = async () => {
        if (!poNumber.trim()) return;
        setLoading(true);
        try {
            const res = await authFetch(`coo/erp-materials?poNumber=${encodeURIComponent(poNumber)}`);
            if (res.ok) {
                const rawData = await res.json();
                const data = rawData.map((row: any) => {
                    let formType = '';
                    let remark = '';
                    
                    // Bất kể vải chính hay phụ, luôn luôn điền FormType và Remark theo CountryRegion
                    const rawCountry = (row.countryRegion || '').trim();
                    if (rawCountry) {
                        const countryLower = rawCountry.toLowerCase();
                        if (countryLower === 'vietnam' || countryLower === 'vn' || countryLower === 'vnm' || countryLower === 'việt nam') {
                            formType = 'FORM EUR.1';
                            remark = '';
                        } else {
                            formType = 'FORM EUR.1-NO';
                            let formattedCountry = rawCountry.split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
                            if (formattedCountry.toUpperCase() === 'THAILND') {
                                formattedCountry = 'Thailand';
                            }
                            remark = `Import from ${formattedCountry}`;
                        }
                    }
                    
                    return { ...row, formType, remark };
                });
                setRows(data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleExportExcel = async () => {
        if (filteredRows.length === 0) return;
        
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('ERP Data Sync');
        
        // Add header row
        const headerRow = worksheet.addRow(columns.map(c => c.headerName));
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF15803D' }
        };
        
        // Adjust column widths
        columns.forEach((col, idx) => {
            worksheet.getColumn(idx + 1).width = (col.width || 100) / 7;
        });

        // Add data rows
        filteredRows.forEach(row => {
            const rowData = columns.map(col => {
                if (col.valueGetter) {
                    return (col.valueGetter as any)(row[col.field as keyof ErpMaterial], row);
                }
                let val = row[col.field as keyof ErpMaterial];
                if (val === null || val === undefined) return '';
                return val;
            });
            
            const addedRow = worksheet.addRow(rowData);
            
            // Apply formatting for Main Fabric
            if (row.isMainFabric) {
                const materialCodeIdx = columns.findIndex(c => c.field === 'materialCode') + 1;
                if (materialCodeIdx > 0) {
                    const cell = addedRow.getCell(materialCodeIdx);
                    cell.font = { bold: true, color: { argb: 'FFD32F2F' } }; // Red color
                }
            }
            
            // Highlight missing from weekly
            if (row.missingFromWeekly) {
                addedRow.eachCell((cell) => {
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FFFEF08A' } // Yellow color (#fef08a)
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
    };

    const columns: GridColDef[] = [
        { field: 'company', headerName: 'Company', width: 100 },
        { field: 'salesOrder', headerName: 'Sales order', width: 130 },
        { field: 'productionNumber', headerName: 'Production number', width: 150 },
        { field: 'productionStatus', headerName: 'Production Status', width: 150 },
        { field: 'customerRequisition', headerName: 'Customer requisition', width: 180 },
        { field: 'customerReference', headerName: 'Customer reference', width: 150 },
        { 
            field: 'formType', 
            headerName: 'FormType', 
            width: 150
        },
        { 
            field: 'remark', 
            headerName: 'Remark', 
            width: 250
        },
        { field: 'customerNo', headerName: 'Customer No.', width: 130 },
        { field: 'customerOrderNo', headerName: 'Customer order No.', width: 160 },
        { field: 'fgStyle', headerName: 'FG Style', width: 120 },
        { field: 'itemFgNumber', headerName: 'Item FG number', width: 150 },
        { field: 'garmentColor', headerName: 'Garment Color', width: 130 },
        { field: 'itemFgSize', headerName: 'Item FG Size', width: 120 },
        { field: 'unitOfFg', headerName: 'Unit Of FG', width: 100 },
        { field: 'salesOrderType', headerName: 'Sales order Type', width: 150 },
        { field: 'saleOrderLineStatus', headerName: 'Sale order Line status', width: 180 },
        { field: 'quantitySalesLine', headerName: 'Quantity Sales line', width: 150, type: 'number' },
        
        { field: 'matrClass', headerName: 'Matr Class', width: 120 },
        { 
            field: 'materialCode', 
            headerName: 'Material Code', 
            width: 150,
            renderCell: (params) => (
                params.row.isMainFabric ? (
                    <Typography sx={{ fontWeight: 700, color: '#d32f2f', fontSize: '13px' }}>
                        {params.value}
                    </Typography>
                ) : params.value
            )
        },
        { field: 'materialName', headerName: 'Material Name', width: 250 },
        { field: 'bomConfigId', headerName: 'Bom ConfigId', width: 120 },
        { field: 'color', headerName: 'Color', width: 100 },
        { field: 'colorName', headerName: 'Color Name', width: 150 },
        { field: 'size', headerName: 'Size', width: 100 },
        { field: 'rmStyle', headerName: 'RM Style', width: 100 },
        { field: 'requireQty', headerName: 'Require Qty', width: 100, type: 'number' },
        { field: 'reserveQty', headerName: 'Reserve Qty', width: 100, type: 'number' },
        { field: 'unitOfRm', headerName: 'Unit Of RM', width: 100 },
        
        { field: 'issueStatus', headerName: 'Issue status', width: 120 },
        { field: 'inventBatchIdPo', headerName: 'Invent BatchId / PO', width: 180 },
        { field: 'serialNumber', headerName: 'Serial number', width: 150 },
        { field: 'suppCode', headerName: 'Supp Code', width: 120 },
        { field: 'supplier', headerName: 'Supplier', width: 200 },
        { field: 'purchaseOrderStatus', headerName: 'Purchase order status', width: 180 },
        { field: 'text', headerName: 'Text', width: 200 },
        { field: 'priceRmPo', headerName: 'Price RM (P/O)', width: 120, type: 'number' },
        { field: 'unitOfRmPo', headerName: 'Unit Of RM (P/O)', width: 150 },
        { field: 'quantityPo', headerName: 'Quantity PO', width: 120, type: 'number' },
        
        { field: 'warehouse', headerName: 'Warehouse', width: 120 },
        { field: 'location', headerName: 'Location', width: 120 },
        { field: 'referenceLot', headerName: 'Reference lot', width: 150 },
        { 
            field: 'countryRegion', 
            headerName: 'Country / Region', 
            width: 150,
            renderCell: (params) => (
                params.value ? <Chip label={params.value} color="success" size="small" /> : null
            )
        },
        { field: 'customCode', headerName: 'Custom code', width: 120 },
        { field: 'productReceipt', headerName: 'Product receipt', width: 150 },
        { field: 'declarationNumber', headerName: 'Declaration number', width: 150 },
        { field: 'partName', headerName: 'Part Name', width: 200 },
        { field: 'bomConsumption', headerName: 'Bom consumption', width: 150, type: 'number' },
        
        { field: 'purchLine', headerName: 'PurchLine', width: 100 },
        { field: 'deliveryDate', headerName: 'Delivery date', width: 120 },
        { field: 'quantityOrder', headerName: 'Quantity Order', width: 120, type: 'number' },
        { field: 'quantityReceived', headerName: 'Quantity received', width: 150, type: 'number' },
        { field: 'currency', headerName: 'Currency', width: 100 },
        
        { field: 'productDescriptionOfMaterial', headerName: 'Product Description of material', width: 250 },
        { field: 'plantCodeField', headerName: 'Plant Code field', width: 150 },
        { field: 'customerNumber', headerName: 'Customer Number', width: 150 },
        { field: 'trxPolat', headerName: 'TRX_POLAT', width: 120 },
        { 
            field: 'missingFromWeekly', 
            headerName: 'Status', 
            width: 250,
            renderCell: (params) => (
                params.value ? <Chip label={params.value} color="warning" size="small" /> : null
            )
        }
    ];

    return (
        <Box sx={{ px: 2, pb: 2, pt: 0, height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#f8fafc' }}>
            <Paper sx={{ p: 2, mb: 2, borderRadius: 2, display: 'flex', gap: 2, alignItems: 'center', border: '1px solid #e2e8f0', flexShrink: 0 }} elevation={0}>
                <TextField 
                    label="Search PO (PO1, PO2, ...)" 
                    variant="outlined" 
                    size="small"
                    value={poNumber}
                    onChange={(e) => setPoNumber(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    InputProps={{
                        startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: '#15803d' }} /></InputAdornment>
                    }}
                    sx={{ width: 400, bgcolor: '#fff', '& .MuiOutlinedInput-root': { '&.Mui-focused fieldset': { borderColor: '#15803d' } } }}
                />
                <Button 
                    variant="contained" 
                    onClick={handleSearch} 
                    disabled={loading || !poNumber.trim()}
                    sx={{ px: 4, textTransform: 'none', fontWeight: 600, bgcolor: '#15803d', '&:hover': { bgcolor: '#166534' } }}
                >
                    {loading ? <CircularProgress size={24} color="inherit" /> : 'Tra Cứu (F3)'}
                </Button>
                <Button 
                    variant="outlined" 
                    onClick={handleExportExcel} 
                    disabled={rows.length === 0}
                    startIcon={<DownloadIcon />}
                    sx={{ px: 3, textTransform: 'none', fontWeight: 600, color: '#15803d', borderColor: '#15803d', '&:hover': { borderColor: '#166534', bgcolor: '#f0fdf4' } }}
                >
                    Xuất Excel
                </Button>
            </Paper>

            <Paper sx={{ flexGrow: 1, minHeight: 0, width: '100%', borderRadius: 2, overflow: 'hidden', border: '1px solid #e2e8f0' }} elevation={0}>
                <DataGrid 
                    rows={filteredRows} 
                    columns={columns} 
                    getRowId={(r) => (r.materialCode || '') + (r.location || '') + (r.declarationNumber || '') + Math.random()}
                    disableRowSelectionOnClick
                    density="compact"
                    getRowClassName={(params) => params.row.missingFromWeekly ? 'missing-weekly-row' : ''}
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
                            paginationModel: { pageSize: 20, page: 0 },
                        },
                    }}
                    pageSizeOptions={[20, 50, 100]}
                    sx={{
                        border: 'none',
                        '& .MuiDataGrid-columnHeaders, & .MuiDataGrid-filler, & .MuiDataGrid-scrollbarFiller, & .MuiDataGrid-columnHeader--filled': { backgroundColor: '#F9FAFA !important', borderBottom: '1px solid #e1e3e4 !important' },
                        '& .MuiDataGrid-columnHeader': { bgcolor: '#F9FAFA', color: '#707975', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' },
                        '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 700, whiteSpace: 'normal !important', lineHeight: '1.2 !important', wordBreak: 'normal' },
                        '& .MuiDataGrid-cell': { borderColor: '#e2e8f0', fontSize: '13px', color: '#3f4945', '&:focus': { outline: 'none !important' }, '&:focus-within': { outline: 'none !important' } },
                        '& .MuiDataGrid-row:hover': { bgcolor: '#F9FAFA !important' },
                        '& .missing-weekly-row': { bgcolor: '#fef08a !important' },
                        '& .missing-weekly-row:hover': { bgcolor: '#fde047 !important' }
                    }}
                />
            </Paper>
        </Box>
    );
};
