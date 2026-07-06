import React, { useState } from 'react';
import { Box, TextField, Button, Grid, Paper, Typography, CircularProgress, IconButton, Dialog, Tooltip, DialogTitle, DialogContent, DialogActions, Pagination, Select, MenuItem, Divider, Checkbox, FormControlLabel, FormGroup, Snackbar, Alert } from '@mui/material';
import { DataGrid, useGridApiRef, useGridApiContext, useGridSelector, gridPageSelector, gridPageCountSelector, gridRowCountSelector, gridPaginationModelSelector, GridColumnMenuContainer, gridFilterModelSelector } from '@mui/x-data-grid';
import type { GridColumnMenuProps, GridFilterOperator, GridFilterItem, GridColDef } from '@mui/x-data-grid';
import { Print as PrintIcon, Search as SearchIcon, Inventory as PutawayIcon, FilterAlt as FilterAltIcon, Check as CheckIcon } from '@mui/icons-material';
import { accessoryApi } from '../services/accessoryApi';
import type { AccItem } from '../services/accessoryApi';
import { zebraService } from '../services/zebraService';
function CustomFooter() {
  const apiRef = useGridApiContext();
  const page = useGridSelector(apiRef, gridPageSelector);
  const pageCount = useGridSelector(apiRef, gridPageCountSelector);
  const rowCount = useGridSelector(apiRef, gridRowCountSelector);
  const paginationModel = useGridSelector(apiRef, gridPaginationModelSelector);
  const pageSize = paginationModel?.pageSize || 10;
  
  const startRow = rowCount === 0 ? 0 : page * pageSize + 1;
  const endRow = Math.min((page + 1) * pageSize, rowCount);
  return (
    <Box sx={{ 
      display: 'flex', 
      justifyContent: 'flex-end', 
      alignItems: 'center', 
      borderTop: '2px solid #e2e8f0', 
      p: 1.5, 
      backgroundColor: '#f8fafc', 
      borderBottomLeftRadius: 8, 
      borderBottomRightRadius: 8,
      gap: 3,
      flexWrap: 'wrap'
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="body2" color="#475569" fontWeight={500}>Rows per page:</Typography>
        <Select
          size="small"
          value={pageSize}
          onChange={(e) => apiRef.current.setPageSize(Number(e.target.value))}
          sx={{ 
            height: 32, 
            bgcolor: 'white', 
            borderRadius: 2,
            fontSize: '0.875rem',
            fontWeight: 600,
            color: '#1e293b',
            '& .MuiOutlinedInput-notchedOutline': { borderColor: '#cbd5e1' },
            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#94a3b8' }
          }}
        >
          <MenuItem value={10}>10</MenuItem>
          <MenuItem value={20}>20</MenuItem>
          <MenuItem value={50}>50</MenuItem>
          <MenuItem value={100}>100</MenuItem>
        </Select>
      </Box>
      <Pagination
        color="primary"
        shape="rounded"
        count={pageCount}
        page={page + 1}
        onChange={(event, value) => apiRef.current.setPage(value - 1)}
        showFirstButton
        showLastButton
        sx={{ 
          '& .MuiPaginationItem-root': {
            fontWeight: 600,
            color: '#475569',
            border: '1px solid transparent',
          },
          '& .MuiPaginationItem-root:hover': {
            backgroundColor: '#f1f5f9',
            borderColor: '#e2e8f0'
          },
          '& .Mui-selected': {
            backgroundColor: '#eff6ff !important',
            color: '#3b82f6 !important',
            borderColor: '#93c5fd !important',
            boxShadow: '0 2px 4px rgba(59, 130, 246, 0.1)'
          }
        }}
      />
    </Box>
  );
}
const excelFilterOperator: GridFilterOperator = {
  label: 'is any of',
  value: 'isAnyOfCustom',
  getApplyFilterFn: (filterItem: GridFilterItem) => {
    if (!filterItem.value || !Array.isArray(filterItem.value) || filterItem.value.length === 0) {
      return null; // If nothing selected, or no array, don't filter
    }
    return (value: any): boolean => {
      return filterItem.value.includes(value);
    };
  },
  InputComponent: () => null,
};
function CustomColumnMenu(props: GridColumnMenuProps) {
  const { hideMenu, colDef, ownerState, open, rows } = props as any;
  const apiRef = useGridApiContext();
  
  // 1. Get all unique values (Memoized and ONLY computed when open)
  const uniqueValues = React.useMemo(() => {
    if (!open || !rows) return [];
    
    const uniqueSet = new Set<string>();
    const len = rows.length;
    for (let i = 0; i < len; i++) {
      const val = rows[i][colDef.field];
      if (val !== null && val !== undefined && val !== '') {
        uniqueSet.add(val.toString());
      }
    }
    return Array.from(uniqueSet).sort();
  }, [rows, colDef.field, open]);
  // 2. Get current filter state
  const filterModel = useGridSelector(apiRef, gridFilterModelSelector);
  const currentFilter = filterModel?.items?.find((item: any) => item.field === colDef.field);
  
  // Initialize selection
  const initialSelected = currentFilter && currentFilter.operator === 'isAnyOfCustom' && Array.isArray(currentFilter.value)
    ? currentFilter.value
    : uniqueValues;
    
  const [selectedValues, setSelectedValues] = useState<string[]>(initialSelected);
  const [searchValue, setSearchValue] = useState('');
  const handleSort = (direction: 'asc' | 'desc' | null) => {
    if (direction) {
      apiRef.current.sortColumn(colDef, direction);
    } else {
      apiRef.current.sortColumn(colDef, null);
    }
    hideMenu();
  };
  const handleToggleAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedValues(uniqueValues);
    } else {
      setSelectedValues([]);
    }
  };
  const handleToggleOne = (val: string) => {
    if (selectedValues.includes(val)) {
      setSelectedValues(selectedValues.filter(v => v !== val));
    } else {
      setSelectedValues([...selectedValues, val]);
    }
  };
  const handleApply = () => {
    // If all are selected, remove the filter to save performance
    if (selectedValues.length === uniqueValues.length) {
      apiRef.current.setFilterModel({
        items: filterModel.items.filter((item: any) => item.field !== colDef.field)
      });
    } else {
      apiRef.current.setFilterModel({
        items: [
          ...filterModel.items.filter((item: any) => item.field !== colDef.field),
          { id: colDef.field, field: colDef.field, operator: 'isAnyOfCustom', value: selectedValues }
        ],
      });
    }
    hideMenu();
  };
  const filteredUniqueValues = React.useMemo(() => {
    return uniqueValues.filter(v => v.toString().toLowerCase().includes(searchValue.toLowerCase()));
  }, [uniqueValues, searchValue]);
  
  // Cap rendered items to prevent browser freeze with 100k+ rows
  const displayedValues = filteredUniqueValues.slice(0, 100); 
  const isAllSelected = selectedValues.length === uniqueValues.length && uniqueValues.length > 0;
  const isIndeterminate = selectedValues.length > 0 && selectedValues.length < uniqueValues.length;
  return (
    <GridColumnMenuContainer hideMenu={hideMenu} colDef={colDef} ownerState={ownerState}>
      <MenuItem onClick={() => handleSort('asc')} sx={{ fontSize: '0.875rem' }}>
         Sắp xếp Tăng dần (A-Z)
      </MenuItem>
      <MenuItem onClick={() => handleSort('desc')} sx={{ fontSize: '0.875rem' }}>
         Sắp xếp Giảm dần (Z-A)
      </MenuItem>
      <Divider sx={{ my: 0.5 }} />
      
      {/* EXCEL LIKE CHECKBOX FILTER */}
      <Box sx={{ p: 1.5, minWidth: 250, maxWidth: 300, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <TextField
          autoFocus
          size="small"
          placeholder="Tìm kiếm..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          fullWidth
          variant="outlined"
          sx={{ '& .MuiInputBase-root': { borderRadius: 1, fontSize: '0.875rem' } }}
        />
        
        <Box sx={{ maxHeight: 200, overflowY: 'auto', mt: 1, border: '1px solid #e2e8f0', borderRadius: 1, p: 1 }}>
          <FormGroup>
            {searchValue === '' && (
              <FormControlLabel
                control={<Checkbox size="small" checked={isAllSelected} indeterminate={isIndeterminate} onChange={handleToggleAll} />}
                label="(Select All)"
                sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.875rem', fontWeight: 600 } }}
              />
            )}
            {displayedValues.map((val) => (
              <FormControlLabel
                key={val}
                control={<Checkbox size="small" checked={selectedValues.includes(val)} onChange={() => handleToggleOne(val)} />}
                label={val || '(Blank)'}
                sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.875rem' } }}
              />
            ))}
          </FormGroup>
        </Box>
        
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 1 }}>
          <Button size="small" onClick={hideMenu} color="inherit">Hủy</Button>
          <Button size="small" variant="contained" onClick={handleApply} color="primary">OK</Button>
        </Box>
      </Box>
    </GridColumnMenuContainer>
  );
}
export default function AccessorySearchPage() {
  const [params, setParams] = useState({ item: '', po: '', color: '', size: '', style: '', config: '' });
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<AccItem[]>([]);
  const [toast, setToast] = useState<{open: boolean, message: string, severity: 'success' | 'error' | 'warning' | 'info'}>({ open: false, message: '', severity: 'success' });
  const [putawayDialogOpen, setPutawayDialogOpen] = useState(false);
  const [putawayRow, setPutawayRow] = useState<AccItem | null>(null);
  const [putawayLocation, setPutawayLocation] = useState('');
  const [puttingAway, setPuttingAway] = useState(false);
  const [printingId, setPrintingId] = useState<string | null>(null);
  const [printedItems, setPrintedItems] = useState<Record<string, string>>({});
  const [rowSelectionModel, setRowSelectionModel] = useState<any[]>([]);
  const [isBulkMode, setIsBulkMode] = useState(false);
  const apiRef = useGridApiRef();
  const handleSearch = async () => {
    setLoading(true);
    try {
      const data = await accessoryApi.searchItems(params);
      const dataWithIds = data.map((r: any, i: number) => ({ ...r, id: r.ItemNumber + '_' + (r.BatchNumber || '') + '_' + i }));
      setRows(dataWithIds);
    } catch (err) {
      setToast({ open: true, message: 'Tìm kiếm thất bại!', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };
  const handleOpenPutaway = (row: AccItem) => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setPutawayRow(row);
    setIsBulkMode(false);
    setPutawayLocation('');
    setPutawayDialogOpen(true);
  };
  const handleOpenBulkPutaway = () => {
    if (rowSelectionModel.length === 0) return;
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setIsBulkMode(true);
    setPutawayLocation('');
    setPutawayDialogOpen(true);
  };
  const handleConfirmPutaway = async () => {
    if (!putawayLocation) return;
    setPuttingAway(true);
    try {
      if (isBulkMode) {
        const selectedItems = rows.filter(r => rowSelectionModel.includes((r as any).id)).map(r => ({
          itemNumber: r.ItemNumber,
          searchName: r.SearchName,
          configuration: r.Configuaration,
          size: r.Size,
          color: r.Color,
          style: r.Style,
          site: r.Site,
          warehouse: r.Warehouse,
          batchNumber: r.BatchNumber,
          quantity: r.PhysicalInventory,
          itemGroup: r.ItemGroup,
        }));
        await accessoryApi.putawayManualBulk(selectedItems, putawayLocation);
        setToast({ open: true, message: `Đã cất kệ thành công ${selectedItems.length} mã hàng vào vị trí: ` + putawayLocation, severity: 'success' });
        setRowSelectionModel([]);
        apiRef.current.setRowSelectionModel([]);
      } else {
        if (!putawayRow) return;
        await accessoryApi.putawayManual({
          itemNumber: putawayRow.ItemNumber,
          searchName: putawayRow.SearchName,
          configuration: putawayRow.Configuaration,
          size: putawayRow.Size,
          color: putawayRow.Color,
          style: putawayRow.Style,
          site: putawayRow.Site,
          warehouse: putawayRow.Warehouse,
          batchNumber: putawayRow.BatchNumber,
          quantity: putawayRow.PhysicalInventory,
          itemGroup: putawayRow.ItemGroup,
          locationCode: putawayLocation
        });
        setToast({ open: true, message: 'Cất kệ thành công! Đã ghi nhận vị trí: ' + putawayLocation, severity: 'success' });
      }
      setPutawayDialogOpen(false);
    } catch (err: any) {
      setToast({ open: true, message: 'Lỗi: ' + err.message, severity: 'error' });
    } finally {
      setPuttingAway(false);
    }
  };
  const handlePrint = async (row: AccItem) => {
    if (printingId) {
      return; // Prevent double click
    }
    const rowId = (row as any).id || row.ItemNumber;
    setPrintingId(rowId);
    try {
      // 1. Save to DB and get internal barcode
      const { barCode } = await accessoryApi.printLabel({
        itemNumber: row.ItemNumber,
        searchName: row.SearchName,
        configuration: row.Configuaration,
        size: row.Size,
        color: row.Color,
        style: row.Style,
        site: row.Site,
        warehouse: row.Warehouse,
        batchNumber: row.BatchNumber,
        quantity: row.PhysicalInventory,
        itemGroup: row.ItemGroup,
      });
      // 2. Generate ZPL
      const zpl = zebraService.generateZPL(row.ItemNumber, row.BatchNumber || '', row.PhysicalInventory, barCode);
      
      // 3. Print
      await zebraService.printZPL(zpl);
      
      // Update printed state
      setPrintedItems(prev => ({ ...prev, [rowId]: barCode }));
      setToast({ open: true, message: 'In tem thành công! Barcode: ' + barCode, severity: 'success' });
    } catch (err: any) {
      console.error("LỖI KHI IN:", err);
      setToast({ open: true, message: 'Lỗi in tem: ' + err.message, severity: 'error' });
    } finally {
      setPrintingId(null);
    }
  };
  const columns: GridColDef[] = [
    { field: 'ItemNumber', headerName: 'ITEM', width: 140, flex: 1 , filterOperators: [excelFilterOperator] },
    { field: 'SearchName', headerName: 'NAME', width: 200, flex: 1.5 , filterOperators: [excelFilterOperator] },
    { field: 'Color', headerName: 'COLOR', width: 100 , filterOperators: [excelFilterOperator] },
    { field: 'Size', headerName: 'SIZE', width: 90 , filterOperators: [excelFilterOperator] },
    { field: 'Style', headerName: 'STYLE', width: 90 , filterOperators: [excelFilterOperator] },
    { field: 'Configuaration', headerName: 'CONFIG', width: 90 , filterOperators: [excelFilterOperator] },
    { field: 'BatchNumber', headerName: 'PO', width: 180, flex: 1.2 , filterOperators: [excelFilterOperator] },
    { 
      field: 'PhysicalInventory', 
      headerName: 'QTY', 
      width: 100, 
      align: 'right', 
      headerAlign: 'right', 
      filterOperators: [excelFilterOperator],
      renderCell: (params) => {
        const qty = params.row.PhysicalInventory ?? 0;
        const unit = params.row.Unit ?? '';
        return unit ? `${qty} ${unit}` : qty;
      }
    },
    { field: 'Warehouse', headerName: 'WH', width: 100 , filterOperators: [excelFilterOperator] },
    {
      field: 'actions',
      headerName: 'THAO TÁC',
      width: 130,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', alignItems: 'center', height: '100%' }}>
          <Tooltip title={printedItems[(params.row as any).id || params.row.ItemNumber] ? `Đã in: ${printedItems[(params.row as any).id || params.row.ItemNumber]}` : "In Tem ZPL"}>
            <span>
              <IconButton 
                size="small" 
                onClick={() => handlePrint(params.row)}
                disabled={printingId === ((params.row as any).id || params.row.ItemNumber) || !!printedItems[(params.row as any).id || params.row.ItemNumber]}
                sx={{ 
                  bgcolor: printedItems[(params.row as any).id || params.row.ItemNumber] ? '#d1fae5' : '#e8f5e9', 
                  color: printedItems[(params.row as any).id || params.row.ItemNumber] ? '#059669' : '#2e7d32', 
                  '&:hover': { bgcolor: '#c8e6c9' },
                  boxShadow: '0 2px 4px rgba(46,125,50,0.1)',
                  opacity: printedItems[(params.row as any).id || params.row.ItemNumber] ? 0.7 : 1
                }}
              >
                {printingId === ((params.row as any).id || params.row.ItemNumber) ? (
                  <CircularProgress size={20} color="inherit" />
                ) : printedItems[(params.row as any).id || params.row.ItemNumber] ? (
                  <CheckIcon fontSize="small" />
                ) : (
                  <PrintIcon fontSize="small" />
                )}
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Cất Kệ Trực Tiếp">
            <IconButton 
              size="small" 
              onClick={() => handleOpenPutaway(params.row)}
              sx={{ 
                bgcolor: '#fff3e0', 
                color: '#ef6c00', 
                '&:hover': { bgcolor: '#ffe0b2' },
                boxShadow: '0 2px 4px rgba(239,108,0,0.1)'
              }}
            >
              <PutawayIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      )
    }
  ];
  return (
    <Box sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Paper sx={{ p: 2, mb: 2, borderRadius: 3, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Tra Cứu Phụ Liệu</Typography>
          {rowSelectionModel.length > 0 && (
            <Button 
              variant="contained" 
              color="warning" 
              startIcon={<PutawayIcon />}
              onClick={handleOpenBulkPutaway}
            >
              Cất Kệ Hàng Loạt ({rowSelectionModel.length})
            </Button>
          )}
        </Box>
        <Grid container spacing={1.5} alignItems="center">
          <Grid size={{ xs: 12, sm: 6, md: 2.5 }}>
            <TextField fullWidth label="Item Number" size="small" value={params.item} onChange={e => setParams({...params, item: e.target.value})} onKeyDown={e => e.key === 'Enter' && handleSearch()} sx={{ bgcolor: '#ffffff' }} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2.5 }}>
            <TextField fullWidth label="PO (Batch)" size="small" value={params.po} onChange={e => setParams({...params, po: e.target.value})} onKeyDown={e => e.key === 'Enter' && handleSearch()} sx={{ bgcolor: '#ffffff' }} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4, md: 2 }}>
            <TextField fullWidth label="Color" size="small" value={params.color} onChange={e => setParams({...params, color: e.target.value})} onKeyDown={e => e.key === 'Enter' && handleSearch()} sx={{ bgcolor: '#ffffff' }} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4, md: 2 }}>
            <TextField fullWidth label="Size" size="small" value={params.size} onChange={e => setParams({...params, size: e.target.value})} onKeyDown={e => e.key === 'Enter' && handleSearch()} sx={{ bgcolor: '#ffffff' }} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4, md: 2 }}>
            <TextField fullWidth label="Style" size="small" value={params.style} onChange={e => setParams({...params, style: e.target.value})} onKeyDown={e => e.key === 'Enter' && handleSearch()} sx={{ bgcolor: '#ffffff' }} />
          </Grid>
          <Grid size={{ xs: 12, md: 1 }}>
            <Button 
              fullWidth 
              variant="contained" 
              onClick={handleSearch} 
              disabled={loading} 
              sx={{ 
                height: { xs: '42px', md: '40px' }, 
                bgcolor: '#10b981', 
                '&:hover': { bgcolor: '#059669' },
                boxShadow: 'none',
                borderRadius: 2
              }}
            >
              {loading ? <CircularProgress size={20} color="inherit" /> : (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <SearchIcon />
                  <Typography sx={{ display: { md: 'none' }, fontWeight: 600 }}>TÌM</Typography>
                </Box>
              )}
            </Button>
          </Grid>
        </Grid>
      </Paper>
      
      <Dialog open={putawayDialogOpen} onClose={() => setPutawayDialogOpen(false)} fullWidth maxWidth="xs" disableRestoreFocus>
        <DialogTitle>Cất Kệ Trực Tiếp</DialogTitle>
        <DialogContent>
          {isBulkMode ? (
            <Typography variant="body2" sx={{ mb: 2, color: '#ef6c00', fontWeight: 600 }}>
              Bạn đang chọn cất kệ đồng loạt {rowSelectionModel.length} mã phụ liệu.
            </Typography>
          ) : (
            <Typography variant="body2" sx={{ mb: 2 }}>
              Sản phẩm: <b>{putawayRow?.ItemNumber}</b><br/>
              PO: <b>{putawayRow?.BatchNumber || '-'}</b>
            </Typography>
          )}
          <TextField 
            fullWidth label="Quét / Nhập mã vị trí (Kệ)" 
            value={putawayLocation}
            onChange={e => setPutawayLocation(e.target.value)}
            autoFocus
            onKeyDown={e => e.key === 'Enter' && handleConfirmPutaway()}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPutawayDialogOpen(false)}>Hủy</Button>
          <Button 
            variant="contained" 
            onClick={handleConfirmPutaway} 
            disabled={puttingAway || !putawayLocation}
          >
            {puttingAway ? <CircularProgress size={24} /> : 'Xác Nhận'}
          </Button>
        </DialogActions>
      </Dialog>
      <Paper sx={{ flexGrow: 1, minHeight: 600, width: '100%', borderRadius: 2, overflow: 'hidden', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
        <DataGrid 
          apiRef={apiRef}
          rows={rows} 
          columns={columns} 
          disableRowSelectionOnClick
          disableColumnSelector
          rowHeight={60}
          checkboxSelection
          onRowSelectionModelChange={(newSelection) => {
            setRowSelectionModel(newSelection);
          }}
          initialState={{
            pagination: { paginationModel: { pageSize: 10 } },
          }}
          slots={{
            footer: CustomFooter,
            columnMenu: CustomColumnMenu,
            columnMenuIcon: FilterAltIcon,
          }}
          slotProps={{
            columnMenu: { rows } as any,
            filterPanel: {
              sx: {
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                '& .MuiDataGrid-filterForm': {
                  p: 2,
                  gap: 1.5,
                },
                '& .MuiDataGrid-filterFormColumnInput': {
                  display: 'none',
                },
                '& .MuiDataGrid-filterFormOperatorInput': {
                  display: 'none',
                },
                '& .MuiInput-root': {
                  mt: 0,
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  px: 1,
                  py: 0.5,
                  '&:before, &:after': { display: 'none' },
                  '&:hover': { borderColor: '#cbd5e1' },
                  '&.Mui-focused': { borderColor: '#10b981', backgroundColor: '#ffffff' }
                },
                '& .MuiInputLabel-root': {
                  display: 'none', // Hide the floating label inside filter for a cleaner look
                },
                '& .MuiSelect-select': {
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  color: '#1e293b'
                },
                '& .MuiInputBase-input': {
                  fontSize: '0.9rem',
                  color: '#1e293b'
                },
                '& .MuiButton-root': {
                  textTransform: 'none',
                  fontWeight: 600,
                  color: '#10b981',
                  '&:hover': { backgroundColor: '#ecfdf5' }
                }
              }
            }
          }}
          pageSizeOptions={[10, 20, 50]}
          sx={{
            border: 'none',
            '& .MuiDataGrid-columnHeader:focus, & .MuiDataGrid-columnHeader:focus-within': {
              outline: 'none !important',
            },
            '& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within': {
              outline: 'none !important',
            },
            '--header-bg': '#f8fafc',
            '--DataGrid-t-header-background-base': '#f8fafc',
            '--DataGrid-containerBackground': '#f8fafc',
            '& .MuiDataGrid-columnHeaders, & .MuiDataGrid-filler, & .MuiDataGrid-scrollbarFiller, & .MuiDataGrid-columnHeader--filled': {
              backgroundColor: '#f8fafc !important',
            },
            '& .MuiDataGrid-columnHeaders': {
              color: '#475569',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              borderBottom: '2px solid #e2e8f0'
            },
            '& .MuiDataGrid-row:hover': {
              backgroundColor: '#f1f5f9'
            },
            '& .MuiDataGrid-cell': {
              borderBottom: '1px solid #f1f5f9'
            },
            '& .MuiDataGrid-footerContainer': {
              borderTop: '2px solid #e2e8f0',
              backgroundColor: '#f8fafc',
              borderBottomLeftRadius: 8,
              borderBottomRightRadius: 8,
              minHeight: '52px'
            },
            '& .MuiTablePagination-root': {
              color: '#475569',
              fontWeight: 600,
            },
            '& .MuiTablePagination-select': {
              backgroundColor: '#ffffff',
              borderRadius: 4,
              border: '1px solid #cbd5e1',
              py: 0.5,
              ml: 1
            },
            '& .MuiTablePagination-actions .MuiIconButton-root': {
              color: '#3b82f6',
              backgroundColor: '#ffffff',
              border: '1px solid #bfdbfe',
              borderRadius: 2,
              mx: 0.5,
              p: 0.5,
              transition: 'all 0.2s',
              '&:hover': {
                backgroundColor: '#eff6ff',
                borderColor: '#93c5fd',
              },
              '&.Mui-disabled': {
                backgroundColor: '#f8fafc',
                color: '#cbd5e1',
                borderColor: '#e2e8f0',
              }
            }
          }}
        />
      </Paper>
    </Box>
  );
}
