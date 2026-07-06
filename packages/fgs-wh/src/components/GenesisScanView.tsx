import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Chip,
  Alert,
  Checkbox,
  useTheme,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Popover,
  Autocomplete,
  Badge,
} from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';

const EMPTY_OPTIONS: readonly string[] = [];
const ACCENT = '#1565c0';

const ColumnFilter = React.memo(({ colKey, label, value, onChange }: { colKey: string; label: string; value: string; onChange: (k: string, v: string) => void }) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const active = !!value;

  const handleChange = React.useCallback((v: string) => { onChange(colKey, v); }, [colKey, onChange]);
  const parsedValue = useMemo(() => value ? value.split(',').map(s => s.trim()).filter(Boolean) : [], [value]);

  return (
    <>
      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25 }}>
        <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.8rem', lineHeight: 1.2 }}>{label}</Typography>
        <IconButton
          size="small"
          onClick={(e) => { setAnchorEl(e.currentTarget); setTimeout(() => inputRef.current?.focus(), 80); }}
          sx={{ p: 0.25, color: active ? ACCENT : '#bbb', '&:hover': { color: ACCENT, backgroundColor: '#e8f5e9' } }}
        >
          <Badge variant="dot" invisible={!active} color="info">
            <FilterListIcon sx={{ fontSize: 15 }} />
          </Badge>
        </IconButton>
      </Box>
      <Popover
        open={!!anchorEl} anchorEl={anchorEl} onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{ paper: { sx: { p: 1.5, borderRadius: 2, boxShadow: '0 4px 20px rgba(0,0,0,0.12)', minWidth: 260, maxWidth: 350 } } }}
      >
        <Autocomplete
          multiple
          freeSolo
          options={EMPTY_OPTIONS}
          value={parsedValue}
          onChange={(e, newVal) => handleChange(newVal.join(', '))}
          renderTags={(tagValue, getTagProps) =>
            tagValue.map((option, index) => {
              const { key, ...restProps } = getTagProps({ index });
              return <Chip variant="outlined" label={option} size="small" key={key} {...restProps} sx={{ height: 24, fontSize: '0.75rem' }} />;
            })
          }
          renderInput={(params) => (
            <TextField {...params} inputRef={inputRef} size="small" placeholder={value ? '' : `Filter ${label}...`}
              onKeyDown={(e) => { if (e.key === 'Escape') setAnchorEl(null); }}
              autoFocus fullWidth
              InputProps={{
                ...params.InputProps,
                startAdornment: (
                  <>
                    <SearchIcon sx={{ fontSize: 18, color: '#999', ml: 0.5, mr: 0.5 }} />
                    {params.InputProps.startAdornment}
                  </>
                )
              }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5, fontSize: '0.85rem' } }}
            />
          )}
        />
      </Popover>
    </>
  );
});
import {
  Search as SearchIcon,
  Inventory2 as BoxIcon,
  Print as PrintIcon,
  Close as CloseIcon,
  RemoveCircleOutline as RemoveCircleOutlineIcon,
  AddCircleOutline as AddCircleOutlineIcon,
  DeleteOutline as DeleteOutlineIcon,
  Replay as ReplayIcon,
  QrCodeScanner as QrScanIcon,
} from '@mui/icons-material';
import {
  packingPlanService,
  type PackingListItem,
  type PackingDetailItem,
} from '../services/packingPlanService';
import { packService, type PackAndPrintPayload } from '../services/packService';
import { buildLabelData, printLabels } from '../services/printLabelService';

// Memoized row component — only re-renders when its own props change
const PackingRow = React.memo(function PackingRow({
  row,
  idx,
  isSelected,
  onRowClick,
  t,
}: {
  row: PackingListItem;
  idx: number;
  isSelected: boolean;
  onRowClick: (idx: number) => void;
  t: ReturnType<typeof useTranslation>['t'];
}) {
  const isPacked = row.PackStt !== 'New';
  return (
    <TableRow
      hover
      onClick={() => onRowClick(idx)}
      selected={isSelected}
      sx={{
        cursor: 'pointer',
        '&.Mui-selected': { backgroundColor: '#e8f5e9 !important' },
        '&.Mui-selected:hover': { backgroundColor: '#c8e6c9 !important' },
        ...(isPacked && !isSelected
          ? {
              backgroundColor: '#f1f8e9 !important',
              '&:hover': { backgroundColor: '#dcedc8 !important' },
              '&:hover .sticky-cell': { backgroundColor: '#dcedc8 !important' },
            }
          : {
              '&:nth-of-type(odd):not(.Mui-selected)': { backgroundColor: '#fafafa' },
            }),
      }}
    >
      <TableCell padding="checkbox" className="sticky-cell" sx={{ position: 'sticky', left: 0, bgcolor: isSelected ? '#e8f5e9' : (isPacked ? '#f1f8e9' : 'inherit'), zIndex: 1, transition: 'background-color 0.2s', '&:hover': { bgcolor: 'inherit'} }}>
        <Checkbox
          checked={isSelected}
          sx={{ color: '#2e7d32', '&.Mui-checked': { color: '#2e7d32' } }}
        />
      </TableCell>
      <TableCell>{idx + 1}</TableCell>
      <TableCell sx={{ fontWeight: 600 }}>{row.CartonNo}</TableCell>
      <TableCell>
        <Chip label={row.CartonIndex} size="small" variant="outlined" sx={{ fontWeight: 600 }} />
      </TableCell>
      <TableCell align="right" sx={{ fontWeight: 700, color: 'primary.main' }}>{row.PackedQty}</TableCell>
      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{row.CTNSeriNo}</TableCell>
      <TableCell>{row.WorkingNumber}</TableCell>
      <TableCell>{row.JobNo}</TableCell>
      <TableCell align="center">
        <Chip
          label={isPacked ? t('genesis.packed', 'Packed') : t('genesis.new', 'New')}
          size="small"
          sx={{
            fontWeight: 700,
            fontSize: '0.75rem',
            backgroundColor: isPacked ? '#2e7d32' : '#e2e8f0',
            color: isPacked ? '#fff' : '#475569',
            minWidth: 55,
          }}
        />
      </TableCell>
    </TableRow>
  );
});

interface GenesisScanViewProps {
  customerName: string;
  onHistoryRefresh?: () => void;
}

export default function GenesisScanView({ onHistoryRefresh }: GenesisScanViewProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  // Load saved state from sessionStorage
  const savedScan = (() => {
    try {
      const raw = sessionStorage.getItem('scanPageState');
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  })();

  const [poNumber, setPoNumber] = useState(savedScan?.poNumber ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [packingList, setPackingList] = useState<PackingListItem[]>(savedScan?.packingList ?? []);
  const [packingDetail, setPackingDetail] = useState<PackingDetailItem[]>(savedScan?.packingDetail ?? []);
  const [selectedRows, setSelectedRows] = useState<Record<number, boolean>>(savedScan?.selectedRows ?? {});
  const [hasSearched, setHasSearched] = useState(savedScan?.hasSearched ?? false);
  const [packDialogOpen, setPackDialogOpen] = useState(false);
  const [packDialogItem, setPackDialogItem] = useState<PackingListItem | null>(null);
  const [scanDialogOpen, setScanDialogOpen] = useState(false);

  const [colFilters, setColFilters] = useState<Record<string, string>>({});
  const updateColFilter = React.useCallback((col: string, val: string) => { setColFilters(prev => ({ ...prev, [col]: val })); }, []);

  // Filter Data
  const filteredPackingList = useMemo(() => {
    const activeFilters = Object.entries(colFilters).filter(([, v]) => v);
    if (activeFilters.length === 0) return packingList;
    return packingList.filter(row => {
      for (const [key, val] of activeFilters) {
        let cellVal = String((row as any)[key] ?? '').toLowerCase();
        if (key === 'PackStt') {
          cellVal = row.PackStt !== 'New' ? 'packed' : 'new';
        }
        const tokens = val.split(',').map(t => t.trim().toLowerCase()).filter(t => t);
        if (tokens.length > 0) {
          if (!tokens.some(t => cellVal.includes(t))) return false;
        } else {
          if (!cellVal.includes(val.toLowerCase())) return false;
        }
      }
      return true;
    });
  }, [packingList, colFilters]);

  // Persist state to sessionStorage
  useEffect(() => {
    sessionStorage.setItem('scanPageState', JSON.stringify({
      poNumber, packingList, packingDetail, selectedRows, hasSearched, colFilters
    }));
  }, [poNumber, packingList, packingDetail, selectedRows, hasSearched, colFilters]);

  const handleSearch = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!poNumber.trim()) return;

    setLoading(true);
    setError(null);
    setHasSearched(true);
    setSelectedRows({});

    try {
      const data = await packingPlanService.getByPO(poNumber.trim());
      setPackingList(data.packingList || []);
      setPackingDetail(data.packingDetail || []);
    } catch (err) {
      setError(t('genesis.errorFetch', 'Failed to fetch Packing Plan. Please check the PO number.'));
      setPackingList([]);
      setPackingDetail([]);
    } finally {
      setLoading(false);
    }
  }, [poNumber, t]);

  const handleRowClick = useCallback((idx: number) => {
    setSelectedRows((prev) => {
      const next = { ...prev };
      if (next[idx]) {
        delete next[idx];
      } else {
        next[idx] = true;
      }
      return next;
    });
  }, []);

  const selectedCount = useMemo(() => Object.keys(selectedRows).length, [selectedRows]);

  const handleSelectAll = useCallback(() => {
    if (selectedCount === packingList.length) {
      setSelectedRows({});
    } else {
      const all: Record<number, boolean> = {};
      packingList.forEach((_, i) => { all[i] = true; });
      setSelectedRows(all);
    }
  }, [selectedCount, packingList]);

  const totalCartons = packingList.length;
  const totalQty = useMemo(() => packingList.reduce((sum, item) => sum + (item.PackedQty || 0), 0), [packingList]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, flexGrow: 1, minHeight: 0 }}>
      {/* PO Search — compact */}
      <Paper
        elevation={0}
        sx={{
          p: 1.5,
          borderRadius: 2,
          border: '2px solid #4caf50',
          background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
          flexShrink: 0,
        }}
      >
        <form onSubmit={handleSearch}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#2e7d32', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 0.5, lineHeight: 1 }}>
              ⚡ {t('genesis.title', 'Genesis Scan')}
            </Typography>
            <TextField
              value={poNumber}
              onChange={(e) => setPoNumber(e.target.value)}
              placeholder={t('genesis.poPlaceholder', 'Enter PO Number...')}
              variant="outlined"
              size="small"
              autoFocus
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: '#999', fontSize: 18 }} />
                  </InputAdornment>
                ),
                sx: {
                  backgroundColor: '#fff',
                  borderRadius: 1.5,
                  fontSize: '0.85rem',
                  height: 36,
                },
              }}
              sx={{ flexGrow: 1, maxWidth: 350 }}
            />
            <Button
              type="submit"
              variant="contained"
              disabled={!poNumber.trim() || loading}
              disableElevation
              sx={{
                px: 3,
                height: 36,
                fontSize: '0.85rem',
                fontWeight: 700,
                borderRadius: 1.5,
                background: 'linear-gradient(135deg, #2e7d32 0%, #388e3c 100%)',
                '&:hover': { background: '#1b5e20' },
                textTransform: 'none'
              }}
            >
              {loading ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : t('genesis.searchBtn', 'Search')}
            </Button>
          </Box>
        </form>
      </Paper>

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      {/* Results */}
      {hasSearched && !loading && !error && (
        <>
          {packingList.length === 0 ? (
            <Paper elevation={0} sx={{ p: 6, borderRadius: 3, textAlign: 'center', border: `1px dashed ${theme.palette.divider}` }}>
              <BoxIcon sx={{ fontSize: 64, opacity: 0.15, mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                {t('genesis.noData', 'No Packing Plan found for this PO')}
              </Typography>
            </Paper>
          ) : (
            <>
              {/* Summary chips + action button — fixed */}
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center', flexShrink: 0 }}>
                <Chip
                  icon={<BoxIcon sx={{ fontSize: 16 }} />}
                  label={`PO: ${packingList[0]?.PONo || poNumber}`}
                  sx={{ fontWeight: 700, fontSize: '0.85rem', height: 32, backgroundColor: '#f1f5f9', color: '#0f172a', border: '1px solid #e2e8f0' }}
                />
                <Chip
                  label={`${t('genesis.totalCartons', 'Cartons')}: ${totalCartons}`}
                  sx={{ fontWeight: 600, height: 32, backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' }}
                />
                <Chip
                  label={`${t('genesis.totalQty', 'Total Qty')}: ${totalQty}`}
                  sx={{ fontWeight: 600, height: 32, backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' }}
                />
                {selectedCount > 0 && (
                  <Chip
                    label={`${t('genesis.selected', 'Selected')}: ${selectedCount}`}
                    sx={{ fontWeight: 700, height: 32, backgroundColor: '#e2e8f0', color: '#0f172a', border: '1px solid #cbd5e1' }}
                  />
                )}

                {/* Direct Scan button — always visible when packing list exists */}
                <Button
                  variant="outlined"
                  disableElevation
                  onClick={() => setScanDialogOpen(true)}
                  startIcon={<QrScanIcon />}
                  sx={{
                    px: 2, height: 32, fontWeight: 700, fontSize: '0.85rem', borderRadius: 1.5, textTransform: 'none',
                    borderColor: '#2e7d32', color: '#2e7d32', backgroundColor: '#fff',
                    '&:hover': { backgroundColor: '#f0fdf4', borderColor: '#1b5e20' },
                  }}
                >
                  {t('genesis.scan', 'Scan')}
                </Button>

                {/* Action buttons based on selection */}
                {selectedCount > 0 && (() => {
                  const singleItem = selectedCount === 1 ? packingList.find((_, i) => selectedRows[i]) : null;
                  const isSingleNew = singleItem && singleItem.PackStt === 'New';
                  const isSinglePacked = singleItem && singleItem.PackStt !== 'New';

                  const handlePrint = async () => {
                    const selectedItems = packingList.filter((_, i) => selectedRows[i]);
                    try {
                      // Print labels for ALL selected items (no DB insert)
                      const labelDataList = selectedItems.map((si) =>
                        buildLabelData(si, packingDetail, packingList.length)
                      );
                      printLabels(labelDataList);
                    } catch (err) {
                      alert(t('genesis.printError', 'Failed to print labels.'));
                    }
                  };

                  const handleOpenPopup = () => {
                    if (singleItem) {
                      setPackDialogItem(singleItem);
                      setPackDialogOpen(true);
                    }
                  };

                  return (
                    <Box sx={{ display: 'flex', gap: 1, ml: 'auto' }}>
                      {/* Single row = New → Pack and Print */}
                      {isSingleNew && (
                        <Button
                          variant="contained"
                          disableElevation
                          onClick={handleOpenPopup}
                          startIcon={<BoxIcon />}
                          sx={{
                            px: 2, height: 32, textTransform: 'none', fontWeight: 700, fontSize: '0.85rem', borderRadius: 1.5,
                            background: 'linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%)', boxShadow: '0 2px 4px rgba(46, 125, 50, 0.2)',
                            '&:hover': { background: '#1b5e20' },
                          }}
                        >
                          {t('genesis.packAndPrint', 'Pack and Print')}
                        </Button>
                      )}

                      {/* Single row = Packed → ReScan */}
                      {isSinglePacked && (
                        <Button
                          variant="outlined"
                          disableElevation
                          onClick={handleOpenPopup}
                          startIcon={<ReplayIcon />}
                          sx={{
                            px: 2, height: 32, textTransform: 'none', fontWeight: 700, fontSize: '0.85rem', borderRadius: 1.5,
                            borderColor: '#eab308', color: '#ca8a04', backgroundColor: '#fff',
                            '&:hover': { backgroundColor: '#fefce8', borderColor: '#a16207' },
                          }}
                        >
                          {t('genesis.rescan', 'ReScan')}
                        </Button>
                      )}

                      {/* Print button — always shown when rows selected */}
                      <Button
                        variant="outlined"
                        disableElevation
                        onClick={handlePrint}
                        startIcon={<PrintIcon />}
                        sx={{
                          px: 2, height: 32, textTransform: 'none', fontWeight: 700, fontSize: '0.85rem', borderRadius: 1.5,
                          borderColor: '#cbd5e1', color: '#334155', backgroundColor: '#fff',
                          '&:hover': { backgroundColor: '#f8fafc', borderColor: '#94a3b8' },
                        }}
                      >
                        {t('genesis.print', 'Print')}
                      </Button>
                    </Box>
                  );
                })()}
              </Box>

              {/* Packing List Table — scrollable with sticky header */}
              <Paper elevation={0} sx={{ borderRadius: 2, overflow: 'hidden', border: `1px solid ${theme.palette.divider}`, flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                <TableContainer sx={{ flexGrow: 1, overflow: 'auto' }}>
                  <Table stickyHeader size="small" sx={{ '& .MuiTableCell-root': { py: { xs: 0.5, lg: 1 }, px: { xs: 1, lg: 2 }, fontSize: { xs: '0.75rem', lg: '0.85rem' } } }}>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700, backgroundColor: '#f5f5f5', position: 'sticky', left: 0, zIndex: 3 }} padding="checkbox">
                          <Checkbox
                            indeterminate={selectedCount > 0 && selectedCount < packingList.length}
                            checked={selectedCount === packingList.length && packingList.length > 0}
                            onChange={handleSelectAll}
                            sx={{ color: '#2e7d32', '&.Mui-checked': { color: '#2e7d32' }, '&.MuiCheckbox-indeterminate': { color: '#2e7d32' } }}
                          />
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700, backgroundColor: '#f5f5f5' }}>#</TableCell>
                        <TableCell sx={{ fontWeight: 700, backgroundColor: '#f5f5f5' }}><ColumnFilter colKey="CartonNo" label={t('genesis.col.cartonNo', 'Carton No')} value={colFilters['CartonNo'] || ''} onChange={updateColFilter} /></TableCell>
                        <TableCell sx={{ fontWeight: 700, backgroundColor: '#f5f5f5' }}><ColumnFilter colKey="CartonIndex" label={t('genesis.col.cartonIndex', 'Carton Index')} value={colFilters['CartonIndex'] || ''} onChange={updateColFilter} /></TableCell>
                        <TableCell sx={{ fontWeight: 700, backgroundColor: '#f5f5f5' }} align="right"><ColumnFilter colKey="PackedQty" label={t('genesis.col.packedQty', 'Packed Qty')} value={colFilters['PackedQty'] || ''} onChange={updateColFilter} /></TableCell>
                        <TableCell sx={{ fontWeight: 700, backgroundColor: '#f5f5f5' }}><ColumnFilter colKey="CTNSeriNo" label={t('genesis.col.ctnSerial', 'CTN Serial')} value={colFilters['CTNSeriNo'] || ''} onChange={updateColFilter} /></TableCell>
                        <TableCell sx={{ fontWeight: 700, backgroundColor: '#f5f5f5' }}><ColumnFilter colKey="WorkingNumber" label={t('genesis.col.workingNo', 'Working No')} value={colFilters['WorkingNumber'] || ''} onChange={updateColFilter} /></TableCell>
                        <TableCell sx={{ fontWeight: 700, backgroundColor: '#f5f5f5' }}><ColumnFilter colKey="JobNo" label={t('genesis.col.jobNo', 'Job No')} value={colFilters['JobNo'] || ''} onChange={updateColFilter} /></TableCell>
                        <TableCell sx={{ fontWeight: 700, backgroundColor: '#f5f5f5' }} align="center"><ColumnFilter colKey="PackStt" label={t('genesis.col.status', 'Status')} value={colFilters['PackStt'] || ''} onChange={updateColFilter} /></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredPackingList.map((row) => {
                        const originalIdx = packingList.findIndex(r => r === row);
                        return (
                          <PackingRow
                            key={originalIdx}
                            row={row}
                            idx={originalIdx}
                            isSelected={!!selectedRows[originalIdx]}
                            onRowClick={handleRowClick}
                            t={t}
                          />
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </>
          )}
        </>
      )}

      {/* Pack and Print Dialog — locked screen */}
      <Dialog
        open={packDialogOpen}
        onClose={(_event, reason) => {
          // Only allow closing via X button, not backdrop or escape
          if (reason === 'backdropClick' || reason === 'escapeKeyDown') return;
          setPackDialogOpen(false);
        }}
        disableEscapeKeyDown
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3, minHeight: 400 },
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontWeight: 700,
            backgroundColor: '#4caf50',
            color: '#fff',
            py: 1.5,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <BoxIcon />
            {t('genesis.packAndPrint', 'Pack and Print')}
          </Box>
          <IconButton
            onClick={() => setPackDialogOpen(false)}
            sx={{ color: '#fff', '&:hover': { backgroundColor: 'rgba(255,255,255,0.2)' } }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 3, mt: 1 }}>
          {packDialogItem && (
            <PackDialogContent
              item={packDialogItem}
              packingDetail={packingDetail}
              totalCartons={packingList.length}
              t={t}
              onPacked={(packedItem) => {
                // Update local state instead of calling API again
                setPackingList(prev => prev.map(row =>
                  row.CTNSeriNo === packedItem.CTNSeriNo ? { ...row, PackStt: packedItem.CTNSeriNo } : row
                ));
                // Uncheck all rows
                setSelectedRows({});
                // Refresh scan history
                onHistoryRefresh?.();
              }}
              onClose={() => setPackDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Direct Scan Dialog */}
      <Dialog
        open={scanDialogOpen}
        onClose={(_event, reason) => {
          if (reason === 'backdropClick' || reason === 'escapeKeyDown') return;
          setScanDialogOpen(false);
        }}
        disableEscapeKeyDown
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, minHeight: 400 } }}
      >
        <DialogTitle
          sx={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            fontWeight: 700, backgroundColor: '#1565c0', color: '#fff', py: 1.5,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <QrScanIcon />
            {t('genesis.directScan', 'Direct Scan')} — {poNumber}
          </Box>
          <IconButton
            onClick={() => setScanDialogOpen(false)}
            sx={{ color: '#fff', '&:hover': { backgroundColor: 'rgba(255,255,255,0.2)' } }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 3, mt: 1 }}>
          <DirectScanDialog
            poNumber={poNumber}
            packingList={packingList}
            packingDetail={packingDetail}
            t={t}
            onPacked={(packedItem: PackingListItem) => {
              setPackingList(prev => prev.map(row =>
                row.CTNSeriNo === packedItem.CTNSeriNo ? { ...row, PackStt: packedItem.CTNSeriNo } : row
              ));
              setSelectedRows({});
              onHistoryRefresh?.();
            }}
            onClose={() => setScanDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </Box>
  );
}

// =================== Pack Dialog Content ===================
const PackDialogContent = React.memo(function PackDialogContent({
  item,
  packingDetail,
  totalCartons,
  t,
  onPacked,
  onClose,
}: {
  item: PackingListItem;
  packingDetail: PackingDetailItem[];
  totalCartons: number;
  t: ReturnType<typeof useTranslation>['t'];
  onPacked: (item: PackingListItem) => void;
  onClose: () => void;
}) {
  const isPacked = item.PackStt !== 'New';
  const [scannedCodes, setScannedCodes] = useState<Record<string, number>>({});
  const [scanError, setScanError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(isPacked); // packed = already saved
  const [saveError, setSaveError] = useState<string | null>(null);
  const [rescanMode, setRescanMode] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(isPacked);
  const scanInputRef = React.useRef<HTMLInputElement>(null);

  // Load scan history from API for packed cartons
  React.useEffect(() => {
    if (!isPacked) return;
    const load = async () => {
      try {
        const history = await packService.getScanHistory(item.PackStt, item.PONo);
        const codes: Record<string, number> = {};
        for (const row of history) {
          codes[row.GarmentBarcode] = row.ScanedQty;
        }
        setScannedCodes(codes);
      } catch (err) {
        console.error('Failed to load scan history:', err);
        // Fallback: show as full qty
        setScannedCodes({ [item.CTNSeriNo]: item.PackedQty });
      } finally {
        setLoadingHistory(false);
      }
    };
    load();
  }, [isPacked, item.PackStt, item.PONo, item.CTNSeriNo, item.PackedQty]);

  // Filter Result 2 by PKInsNo + PONo + JobNo + CartonNo
  const cartonSizes = useMemo(
    () => packingDetail.filter((d) =>
      d.PKInsNo === item.PKInsNo &&
      d.PONo === item.PONo &&
      d.JobNo === item.JobNo &&
      d.CartonNo === item.CartonNo
    ),
    [packingDetail, item.PKInsNo, item.PONo, item.JobNo, item.CartonNo]
  );

  const maxUniqueCodes = cartonSizes.length; // number of sizes = max unique codes
  const totalQty = item.PackedQty;
  const scannedCount = useMemo(() => Object.values(scannedCodes).reduce((s, v) => s + v, 0), [scannedCodes]);
  const uniqueCodeCount = Object.keys(scannedCodes).length;
  // Packed cartons are always "complete" unless user clicked ReScan
  const isComplete = (isPacked && !rescanMode) || scannedCount >= totalQty;
  const progressPercent = totalQty > 0 ? (isComplete ? 100 : Math.min((scannedCount / totalQty) * 100, 100)) : 0;

  // Handle ReScan — reset everything
  const handleReScan = useCallback(() => {
    setScannedCodes({});
    setScanError(null);
    setSaving(false);
    setSaveSuccess(false);
    setSaveError(null);
    setRescanMode(true);
    setTimeout(() => scanInputRef.current?.focus(), 300);
  }, []);

  // Auto-focus scan field (only for new cartons or rescan mode)
  React.useEffect(() => {
    if (isPacked && !rescanMode) return;
    const timer = setTimeout(() => scanInputRef.current?.focus(), 300);
    return () => clearTimeout(timer);
  }, [isPacked, rescanMode]);

  const [skipPrint, setSkipPrint] = useState(false); // true when packed via CTNSeriNo scan (no print needed)

  // Auto-save when scan completes
  React.useEffect(() => {
    if (!isComplete || saveSuccess || saving) return;

    const doSave = async () => {
      setSaving(true);
      setSaveError(null);
      try {
        const payload: PackAndPrintPayload = {
          poNo: item.PONo,
          ctnBarCode: item.CTNSeriNo,
          ctnNo: item.CartonNo,
          packedQty: item.PackedQty,
          facLine: 'F1A00',
          ctnSeriNo: item.CTNSeriNo,
          scannedItems: Object.entries(scannedCodes).map(([code, qty]) => ({
            garmentBarcode: code,
            qty,
          })),
        };
        await packService.packAndPrint(payload);
        setSaveSuccess(true);
        // Ask user if they want to print (only when scanning garments, not CTNSeriNo)
        if (!skipPrint) {
            const labelData = buildLabelData(item, packingDetail, totalCartons);
            printLabels([labelData]);
          }
        // Update local state + close dialog (no API call)
        onPacked(item);
        onClose();
      } catch (err) {
        setSaveError(t('genesis.saveError', 'Failed to save data. Please try again.'));
      } finally {
        setSaving(false);
      }
    };

    doSave();
  }, [isComplete, saveSuccess, saving, item, scannedCodes, t, skipPrint]);

  const handleScan = (e: React.FormEvent) => {
    e.preventDefault();
    const code = scanInputRef.current?.value?.trim() || '';
    if (!code || isComplete) return;

    // Case 1: Scanned code = CTNSeriNo → auto pack immediately (no print)
    if (code === item.CTNSeriNo) {
      setScanError(null);
      setSkipPrint(true);
      // Fill all qty with CTNSeriNo as the barcode to trigger auto-complete
      setScannedCodes({ [code]: totalQty });
      if (scanInputRef.current) scanInputRef.current.value = '';
      return;
    }

    // Case 2: Scanning garment barcodes one by one
    // Validate: if this is a NEW code and we already have max unique codes
    const isNewCode = !(code in scannedCodes);
    if (isNewCode && maxUniqueCodes > 0 && uniqueCodeCount >= maxUniqueCodes) {
      setScanError(t('genesis.scanWrongCode', `Wrong barcode! This carton only has ${maxUniqueCodes} size(s). Code "${code}" does not match.`));
      if (scanInputRef.current) scanInputRef.current.value = '';
      setTimeout(() => scanInputRef.current?.focus(), 50);
      return;
    }

    // Clear error on valid scan
    setScanError(null);
    setSkipPrint(false);
    setScannedCodes((prev) => ({
      ...prev,
      [code]: (prev[code] || 0) + 1,
    }));
    if (scanInputRef.current) scanInputRef.current.value = '';
    setTimeout(() => scanInputRef.current?.focus(), 50);
  };

  const handleDeleteCode = useCallback((code: string) => {
    setScannedCodes((prev) => {
      const next = { ...prev };
      delete next[code];
      return next;
    });
    setScanError(null);
  }, []);

  const handleChangeQty = useCallback((code: string, newQty: number) => {
    if (newQty <= 0) {
      handleDeleteCode(code);
      return;
    }
    // Cap: total of all codes must not exceed totalQty
    setScannedCodes((prev) => {
      const otherTotal = Object.entries(prev)
        .filter(([k]) => k !== code)
        .reduce((s, [, v]) => s + v, 0);
      const maxForThis = totalQty - otherTotal;
      return { ...prev, [code]: Math.min(newQty, maxForThis) };
    });
  }, [handleDeleteCode, totalQty]);

  const entries = useMemo(() => Object.entries(scannedCodes), [scannedCodes]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      {/* Loading scan history */}
      {loadingHistory ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
      <>
      {/* Carton info */}
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Chip label={`${t('genesis.col.cartonNo', 'Carton')}: ${item.CartonNo}`} color="primary" sx={{ fontWeight: 600 }} />
        <Chip label={`${t('genesis.col.cartonIndex', 'Index')}: ${item.CartonIndex}`} variant="outlined" sx={{ fontWeight: 600 }} />
        <Chip label={`${t('genesis.col.packedQty', 'Qty')}: ${totalQty}`} color="success" sx={{ fontWeight: 600 }} />
        <Chip label={`${t('genesis.col.ctnSerial', 'CTN')}: ${item.CTNSeriNo}`} variant="outlined" sx={{ fontWeight: 600, fontFamily: 'monospace' }} />
        <Chip label={`${t('genesis.col.jobNo', 'Job')}: ${item.JobNo}`} variant="outlined" sx={{ fontWeight: 600 }} />
      </Box>

      {/* Size detail table from Result 2 */}
      {cartonSizes.length > 0 && (
        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
          <Typography variant="subtitle2" sx={{ px: 2, py: 1, backgroundColor: '#f5f5f5', fontWeight: 700 }}>
            📦 {t('genesis.sizeDetail', 'Size Detail')}
          </Typography>
          <Table size="small" sx={{ '& .MuiTableCell-root': { py: { xs: 0.5, lg: 1 }, px: { xs: 1, lg: 2 }, fontSize: { xs: '0.75rem', lg: '0.85rem' } } }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>{t('genesis.size', 'Size')}</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">{t('genesis.qty', 'Qty')}</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">{t('genesis.nw', 'NW')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {cartonSizes.map((s, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Chip label={s.Sizx} size="small" sx={{ fontWeight: 700, minWidth: 40 }} />
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>{s.CartonQty}</TableCell>
                  <TableCell align="right">{s.NW}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      {/* Scan progress */}
      <Paper
        variant="outlined"
        sx={{
          p: 2,
          borderRadius: 2,
          border: isComplete ? '2px solid #4caf50' : scanError ? '2px solid #d32f2f' : '2px solid #ff9800',
          backgroundColor: isComplete ? '#e8f5e9' : scanError ? '#ffebee' : '#fff',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: isComplete ? '#2e7d32' : '#e65100' }}>
            {isComplete ? '✅ ' : '📱 '}
            {t('genesis.scanProgress', 'Scan Progress')}
          </Typography>
          <Chip
            label={`${scannedCount} / ${totalQty}`}
            sx={{
              fontWeight: 800,
              fontSize: '1rem',
              backgroundColor: isComplete ? '#4caf50' : '#ff9800',
              color: '#fff',
            }}
          />
        </Box>

        {/* Progress bar */}
        <Box sx={{ width: '100%', backgroundColor: '#e0e0e0', borderRadius: 1, height: 8, mb: 2 }}>
          <Box
            sx={{
              width: `${progressPercent}%`,
              backgroundColor: isComplete ? '#4caf50' : '#ff9800',
              borderRadius: 1,
              height: '100%',
              transition: 'width 0.3s ease',
            }}
          />
        </Box>

        {/* Scan error */}
        {scanError && (
          <Alert severity="error" sx={{ borderRadius: 2, mb: 1.5, fontWeight: 600 }} onClose={() => setScanError(null)}>
            {scanError}
          </Alert>
        )}

        {/* Scan input */}
        {!isComplete ? (
          <form onSubmit={handleScan}>
            <TextField
              fullWidth
              defaultValue=""
              placeholder={t('genesis.scanBarcode', 'Scan barcode here...')}
              variant="outlined"
              size="small"
              autoFocus
              inputRef={scanInputRef}
              onBlur={() => {
                setTimeout(() => {
                  const active = document.activeElement;
                        if (active && active !== document.body) return;
                  scanInputRef.current?.focus();
                }, 100);
              }}
              error={!!scanError}
              InputProps={{
                sx: {
                  backgroundColor: '#fff',
                  borderRadius: 1.5,
                  fontSize: '1.1rem',
                  fontFamily: 'monospace',
                },
              }}
            />
          </form>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {saving && (
              <Alert severity="info" icon={<CircularProgress size={20} />} sx={{ borderRadius: 2, fontWeight: 600 }}>
                {t('genesis.saving', 'Saving data...')}
              </Alert>
            )}
            {saveSuccess && (
              <Alert severity="success" sx={{ borderRadius: 2, fontWeight: 600 }}>
                {isPacked && !rescanMode
                  ? t('genesis.alreadyPacked', 'This carton has already been packed.')
                  : t('genesis.saveSuccess', 'Data saved successfully! ✅')}
              </Alert>
            )}
            {saveError && (
              <Alert severity="error" sx={{ borderRadius: 2, fontWeight: 600 }}>
                {saveError}
              </Alert>
            )}
            {!saving && !saveSuccess && !saveError && (
              <Alert severity="success" sx={{ borderRadius: 2, fontWeight: 600 }}>
                {t('genesis.scanComplete', 'All items scanned successfully!')}
              </Alert>
            )}
            {/* ReScan button */}
            {!saving && (
              <Button
                variant="outlined"
                color="warning"
                size="small"
                onClick={handleReScan}
                startIcon={<ReplayIcon />}
                sx={{ fontWeight: 700, borderRadius: 1.5, alignSelf: 'flex-start' }}
              >
                {t('genesis.rescan', 'ReScan')}
              </Button>
            )}
          </Box>
        )}
      </Paper>

      {/* Scan history — grouped by code, editable */}
      {entries.length > 0 && (
        <Paper variant="outlined" sx={{ borderRadius: 2, maxHeight: 250, overflow: 'auto' }}>
          <Typography variant="subtitle2" sx={{ px: 2, py: 1, backgroundColor: '#f5f5f5', fontWeight: 700, position: 'sticky', top: 0, zIndex: 1 }}>
            📋 {t('genesis.scanHistory', 'Scan History')} ({scannedCount})
          </Typography>
          <Box sx={{ px: 2, pb: 1 }}>
            {entries.map(([code, qty], i) => (
              <Box key={code} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.75, borderBottom: '1px solid #f0f0f0' }}>
                <Chip label={i + 1} size="small" sx={{ minWidth: 30, fontWeight: 700, backgroundColor: '#e0e0e0' }} />
                <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.85rem', flexGrow: 1 }}>{code}</Typography>
                {/* Qty controls */}
                <IconButton size="small" disabled={isComplete} onClick={() => handleChangeQty(code, qty - 1)} sx={{ color: '#999' }}>
                  <RemoveCircleOutlineIcon fontSize="small" />
                </IconButton>
                <TextField
                  value={qty}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val)) handleChangeQty(code, val);
                  }}
                  type="number"
                  size="small"
                  variant="standard"
                  disabled={isComplete}
                  inputProps={{ min: 0, style: { textAlign: 'center', fontWeight: 700, width: 40, padding: 0 } }}
                />
                <IconButton size="small" disabled={isComplete} onClick={() => handleChangeQty(code, qty + 1)} sx={{ color: '#4caf50' }}>
                  <AddCircleOutlineIcon fontSize="small" />
                </IconButton>
                {/* Delete */}
                <IconButton size="small" disabled={isComplete} onClick={() => handleDeleteCode(code)} sx={{ color: '#d32f2f' }}>
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Box>
            ))}
          </Box>
        </Paper>
      )}
      </>
      )}
    </Box>
  );
});

// Style for table header cells
const headerStyle = {
  fontWeight: 700,
  backgroundColor: '#f5f5f5',
  whiteSpace: 'nowrap' as const,
};

// =================== Direct Scan Dialog Content ===================
const DirectScanDialog = React.memo(function DirectScanDialog({
  poNumber,
  packingList,
  packingDetail: _packingDetail,
  t,
  onPacked,
  onClose: _onClose,
}: {
  poNumber: string;
  packingList: PackingListItem[];
  packingDetail: PackingDetailItem[];
  t: ReturnType<typeof useTranslation>['t'];
  onPacked: (item: PackingListItem) => void;
  onClose: () => void;
}) {
  const [scannedGarments, setScannedGarments] = useState<Record<string, number>>({});
  const [scanError, setScanError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [matchedItem, setMatchedItem] = useState<PackingListItem | null>(null);
  const scanInputRef = React.useRef<HTMLInputElement>(null);

  // Auto focus
  React.useEffect(() => {
    const timer = setTimeout(() => scanInputRef.current?.focus(), 300);
    return () => clearTimeout(timer);
  }, []);

  const garmentCount = useMemo(() => Object.values(scannedGarments).reduce((s, v) => s + v, 0), [scannedGarments]);

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = scanInputRef.current?.value?.trim() || '';
    if (!code || saving || saveSuccess) return;

    // Check if code matches any CTNSeriNo in packing list (NEW cartons only)
    const carton = packingList.find(row => row.CTNSeriNo === code && row.PackStt === 'New');

    if (carton) {
      // CTNSeriNo scanned → Pack this carton immediately
      setScanError(null);
      setMatchedItem(carton);
      setSaving(true);

      try {
        const payload: PackAndPrintPayload = {
          poNo: carton.PONo,
          ctnBarCode: carton.CTNSeriNo,
          ctnNo: carton.CartonNo,
          packedQty: carton.PackedQty,
          facLine: 'F1A00',
          ctnSeriNo: carton.CTNSeriNo,
          scannedItems: garmentCount > 0
            ? Object.entries(scannedGarments).map(([g, qty]) => ({ garmentBarcode: g, qty }))
            : [{ garmentBarcode: code, qty: carton.PackedQty }],
        };
        await packService.packAndPrint(payload);
        setSaveSuccess(true);
        onPacked(carton);

        // Reset after short delay, ready for next carton
        setTimeout(() => {
          setScannedGarments({});
          setMatchedItem(null);
          setSaveSuccess(false);
          setSaving(false);
          if (scanInputRef.current) scanInputRef.current.value = '';
          setTimeout(() => scanInputRef.current?.focus(), 100);
        }, 800);
      } catch (err) {
        setScanError(t('genesis.saveError', 'Failed to save data. Please try again.'));
        setSaving(false);
      }
    } else {
      // Check if it's an already-packed CTNSeriNo
      const alreadyPacked = packingList.find(row => row.CTNSeriNo === code && row.PackStt !== 'New');
      if (alreadyPacked) {
        setScanError(t('genesis.cartonAlreadyPacked', 'Carton {{code}} is already packed!', { code }));
        if (scanInputRef.current) scanInputRef.current.value = '';
        setTimeout(() => scanInputRef.current?.focus(), 50);
        return;
      }

      // Regular garment barcode → accumulate
      setScanError(null);
      setScannedGarments(prev => ({
        ...prev,
        [code]: (prev[code] || 0) + 1,
      }));
      if (scanInputRef.current) scanInputRef.current.value = '';
      setTimeout(() => scanInputRef.current?.focus(), 50);
    }
  };

  const handleClearGarments = () => {
    setScannedGarments({});
    setScanError(null);
    setTimeout(() => scanInputRef.current?.focus(), 50);
  };

  const garmentEntries = useMemo(() => Object.entries(scannedGarments), [scannedGarments]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      {/* Info */}
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
        <Chip label={`PO: ${poNumber}`} color="primary" sx={{ fontWeight: 700 }} />
        <Chip
          label={`${t('genesis.newCartons', 'New Cartons')}: ${packingList.filter(r => r.PackStt === 'New').length}`}
          color="warning"
          sx={{ fontWeight: 700 }}
        />
        {garmentCount > 0 && (
          <Chip label={`${t('genesis.garmentsScanned', 'Garments scanned')}: ${garmentCount}`} color="success" sx={{ fontWeight: 700 }} />
        )}
      </Box>

      {/* Scan input */}
      <form onSubmit={handleScan}>
        <TextField
          inputRef={scanInputRef}
          onBlur={() => {
            setTimeout(() => {
              const active = document.activeElement;
                        if (active && active !== document.body) return;
              scanInputRef.current?.focus();
            }, 100);
          }}
          defaultValue=""
          placeholder={garmentCount > 0
            ? t('genesis.scanCtnLabel', 'Now scan CTN label to pack...')
            : t('genesis.scanGarmentOrCtn', 'Scan garment barcode or CTN label...')
          }
          fullWidth
          size="small"
          autoComplete="off"
          disabled={saving}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <QrScanIcon sx={{ color: '#1565c0' }} />
              </InputAdornment>
            ),
          }}
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
        />
      </form>

      {/* Error */}
      {scanError && <Alert severity="error" sx={{ borderRadius: 1.5 }}>{scanError}</Alert>}

      {/* Success flash */}
      {saveSuccess && matchedItem && (
        <Alert severity="success" sx={{ borderRadius: 1.5, fontWeight: 700 }}>
          ✅ {t('genesis.packedSuccess', 'Packed carton {{carton}} ({{serial}}) successfully!', { carton: matchedItem.CartonNo, serial: matchedItem.CTNSeriNo })}
        </Alert>
      )}

      {/* Saving indicator */}
      {saving && !saveSuccess && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CircularProgress size={20} />
          <Typography variant="body2">{t('genesis.packing', 'Packing...')}</Typography>
        </Box>
      )}

      {/* Scanned garments list */}
      {garmentEntries.length > 0 && (
        <Paper elevation={0} sx={{ borderRadius: 2, border: '1px solid #e0e0e0', overflow: 'hidden' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1, backgroundColor: '#f5f5f5' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              {t('genesis.scannedGarments', 'Scanned Garments')} ({garmentCount})
            </Typography>
            <Button size="small" color="error" onClick={handleClearGarments} startIcon={<DeleteOutlineIcon />}>
              {t('genesis.clearAll', 'Clear all')}
            </Button>
          </Box>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>{t('genesis.barcode', 'Barcode')}</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">Qty</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {garmentEntries.map(([code, qty]) => (
                <TableRow key={code}>
                  <TableCell sx={{ fontFamily: 'monospace' }}>{code}</TableCell>
                  <TableCell align="right">{qty}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      {/* Hint text */}
      <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
        {garmentCount > 0
          ? `📦 ${t('genesis.hintScanCtn', 'Scan the CTN label barcode to pack this carton')}`
          : `🔍 ${t('genesis.hintScanBoth', 'Scan garment barcodes first, or scan CTN label directly to pack')}`
        }
      </Typography>
    </Box>
  );
});
