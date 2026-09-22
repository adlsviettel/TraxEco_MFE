import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { qcfbStatusUpdateService, SaveStatusUpdatePayload } from '../services/qcfbStatusUpdateService';
import {
  Box, Typography, Paper, Grid, TextField, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, IconButton, InputAdornment, Select, MenuItem, FormControl,
  Alert, Drawer, Badge, Divider, Popover, Checkbox, FormControlLabel, CircularProgress,
  TablePagination
} from '@mui/material';
import {
  Search as SearchIcon,
  FileDownload as ExcelIcon,
  Add as AddIcon,
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  AssignmentTurnedIn as SaveIcon,
  Refresh as RefreshIcon,
  Inventory2 as WarehouseIcon,
  FilterList as FilterListIcon,
  Tune as TuneIcon,
  FilterAlt as FilterAltIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

const ACCENT = '#2e7d32';
const ACCENT_HOVER = '#1b5e20';
const ACCENT_LIGHT = '#e8f5e9';
const ACCENT_BORDER = '#a5d6a7';

export interface FabricLotItem {
  id: string;
  po: string;
  item: string;
  colorCode: string;
  colorName: string;
  invoice: string;
  supplier: string;
  batch: string;
  qtyReceive: number;
  qtyInspection: number;
  stdWidth: number;
  totalRolls?: number;
  actualWidthAvg?: number;
  latestInspectDate?: string | null;
  isProcessed?: boolean;
  statusUpdateId?: number | null;
  savedDateApprove?: string;
  savedActualWidth?: number;
  savedQtyInspection?: number;
  savedJobsJson?: string;
  savedRemark?: string;
}

export interface JobAllocation {
  job: string;
  yard: number;
}

export interface ProcessedRecord {
  id: string;
  dateApprove: string;
  po: string;
  item: string;
  colorCode?: string;
  colorName?: string;
  color: string;
  invoice: string;
  supplier: string;
  batch?: string;
  qtyReceive: number;
  qtyInspection?: number;
  stdWidth: number;
  actualWidth: number;
  jobs: JobAllocation[];
  remark: string;
}

// Mock Database Records (F1, F2, F3)
const INITIAL_LOTS: FabricLotItem[] = [
  {
    id: '1',
    po: 'POAD000059398',
    item: '62696410-70',
    colorCode: '095A',
    colorName: '095A BLACK',
    invoice: 'TSI/CSAI250708CO.1',
    supplier: 'TREASURE STAR',
    batch: 'LOT-250812',
    qtyReceive: 164.00,
    qtyInspection: 30.00,
    stdWidth: 70
  },
  {
    id: '2',
    po: 'POPU0000618',
    item: 'WK-303-04-00089',
    colorCode: '074-36-25',
    colorName: 'POWER GREEN',
    invoice: 'MCVA-063023-2',
    supplier: 'MEN - CHUEN VIET NAM',
    batch: 'LOT-MC23-99',
    qtyReceive: 2651.00,
    qtyInspection: 347.00,
    stdWidth: 64
  },
  {
    id: '3',
    po: 'POAD000070915',
    item: '70042127-59',
    colorCode: '001A/ADAN',
    colorName: 'WHITE',
    invoice: 'FTC-25C157V',
    supplier: 'FORMOSA',
    batch: 'LOT-FM-157',
    qtyReceive: 1010.00,
    qtyInspection: 189.00,
    stdWidth: 59
  },
  {
    id: '4',
    po: 'POAD000061736',
    item: '62583910-56',
    colorCode: '095A',
    colorName: '095A BLACK',
    invoice: 'TSI/CSAI250705CO.1',
    supplier: 'TREASURE STAR',
    batch: 'LOT-TS-736',
    qtyReceive: 93.00,
    qtyInspection: 20.00,
    stdWidth: 56
  },
  {
    id: '5',
    po: 'MFAD0001776',
    item: '70028244-68',
    colorCode: 'AE6Z-P4P',
    colorName: 'DUSKY PETROL S26',
    invoice: 'HB/AO251752.1',
    supplier: 'UNIVERSAL STAR',
    batch: 'LOT-US-1752',
    qtyReceive: 997.00,
    qtyInspection: 100.00,
    stdWidth: 68
  },
  {
    id: '6',
    po: 'POPU0007838',
    item: 'CK-110-04-00237',
    colorCode: '120-22-18',
    colorName: 'PERSIAN BLUE',
    invoice: '3311-2307250009',
    supplier: 'SHINKONG',
    batch: 'LOT-SK-838',
    qtyReceive: 412.00,
    qtyInspection: 112.00,
    stdWidth: 55
  }
];

const INITIAL_PROCESSED_RECORDS: ProcessedRecord[] = [];

// Memoized Row for Table 1 (Prevents lag when typing in form inputs)
interface LotRowProps {
  lot: FabricLotItem;
  isCurrent: boolean;
  onSelect: (lot: FabricLotItem) => void;
}

const LotRow = React.memo(({ lot, isCurrent, onSelect }: LotRowProps) => {
  return (
    <TableRow
      hover
      onClick={() => onSelect(lot)}
      sx={{
        cursor: 'pointer',
        bgcolor: isCurrent ? 'rgba(46, 125, 50, 0.08)' : 'inherit',
        borderLeft: isCurrent ? `4px solid ${ACCENT}` : '4px solid transparent',
        '& td': { fontSize: '0.78rem', py: 0.6 }
      }}
    >
      <TableCell align="center" sx={{ width: 50, p: '4px 8px' }}>
        {isCurrent ? (
          <CheckCircleIcon sx={{ color: ACCENT, fontSize: 18, display: 'block', mx: 'auto' }} />
        ) : (
          <Box sx={{
            width: 14,
            height: 14,
            borderRadius: '50%',
            border: '1.5px solid #cbd5e1',
            mx: 'auto'
          }} />
        )}
      </TableCell>
      <TableCell sx={{ color: ACCENT, fontWeight: 800, fontFamily: 'monospace' }}>
        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
          {lot.isProcessed ? (
            <Chip label="Đã duyệt" size="small" sx={{ bgcolor: ACCENT_LIGHT, color: ACCENT, fontWeight: 800, height: 18, fontSize: '0.65rem', border: `1px solid ${ACCENT_BORDER}` }} />
          ) : (
            <Chip label="Chưa duyệt" size="small" sx={{ bgcolor: '#f1f5f9', color: '#64748b', fontWeight: 600, height: 18, fontSize: '0.65rem' }} />
          )}
          <span>{lot.po}</span>
        </Box>
      </TableCell>
      <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700 }}>{lot.item}</TableCell>
      <TableCell>{lot.colorCode} - {lot.colorName}</TableCell>
      <TableCell sx={{ color: '#64748b' }}>{lot.invoice}</TableCell>
      <TableCell sx={{ color: '#64748b' }}>{lot.supplier}</TableCell>
      <TableCell sx={{ fontFamily: 'monospace' }}>{lot.batch}</TableCell>
      <TableCell align="right" sx={{ fontWeight: 800, color: ACCENT }}>{Number(lot.qtyReceive || 0).toFixed(1)} Yd</TableCell>
      <TableCell align="right">{Number(lot.qtyInspection || 0).toFixed(1)} Yd</TableCell>
      <TableCell align="center" sx={{ fontWeight: 700 }}>{lot.stdWidth}&quot;</TableCell>
    </TableRow>
  );
});

// Memoized Row for Table 3
interface HistRowProps {
  rec: ProcessedRecord;
}

const HistRow = React.memo(({ rec }: HistRowProps) => {
  return (
    <TableRow hover sx={{ '& td': { fontSize: '0.78rem', py: 0.75 } }}>
      <TableCell sx={{ fontWeight: 700, color: ACCENT }}>{rec.dateApprove}</TableCell>
      <TableCell sx={{ fontWeight: 800, fontFamily: 'monospace' }}>{rec.po}</TableCell>
      <TableCell sx={{ fontFamily: 'monospace' }}>{rec.item}</TableCell>
      <TableCell>{rec.color}</TableCell>
      <TableCell sx={{ color: '#64748b' }}>{rec.invoice}</TableCell>
      <TableCell sx={{ color: '#64748b' }}>{rec.supplier}</TableCell>
      <TableCell align="right" sx={{ fontWeight: 800 }}>{Number(rec.qtyReceive || 0).toFixed(1)} Yd</TableCell>
      <TableCell align="center">{rec.stdWidth}&quot;</TableCell>
      <TableCell align="center" sx={{ fontWeight: 800, color: ACCENT }}>{rec.actualWidth}&quot;</TableCell>
      <TableCell>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {rec.jobs.map((j, i) => (
            <Chip
              key={i}
              label={`${j.job} (${Number(j.yard || 0).toFixed(2)} Yd)`}
              size="small"
              sx={{ backgroundColor: ACCENT_LIGHT, color: ACCENT, fontWeight: 600, fontSize: '0.68rem', borderRadius: 0.5, height: 20 }}
            />
          ))}
          {rec.jobs.length === 0 && <span style={{ color: '#94a3b8' }}>-</span>}
        </Box>
      </TableCell>
      <TableCell sx={{ maxWidth: 280, color: '#475569' }}>{rec.remark}</TableCell>
    </TableRow>
  );
});

// Debounced Search Input Component for instant 0ms typing response
interface DebouncedSearchInputProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  sx?: any;
}

const DebouncedSearchInput = React.memo(({ value, onChange, placeholder, sx }: DebouncedSearchInputProps) => {
  const [innerVal, setInnerVal] = useState(value);

  useEffect(() => {
    setInnerVal(value);
  }, [value]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (innerVal !== value) {
        onChange(innerVal);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [innerVal, onChange, value]);

  return (
    <TextField
      size="small"
      placeholder={placeholder}
      value={innerVal}
      onChange={(e) => setInnerVal(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          onChange(innerVal);
        }
      }}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon sx={{ color: '#64748b', fontSize: 18 }} />
          </InputAdornment>
        ),
        endAdornment: innerVal ? (
          <InputAdornment position="end">
            <IconButton size="small" onClick={() => { setInnerVal(''); onChange(''); }} sx={{ p: 0.25 }}>
              <CloseIcon sx={{ fontSize: 13 }} />
            </IconButton>
          </InputAdornment>
        ) : null
      }}
      sx={sx}
    />
  );
});

// Section 2: Isolated QC Status & Job Allocation Form Component
// Having this as a separate component ensures typing into any field (remark, qty, width, jobs)
// ONLY re-renders this form (taking < 1ms) and NEVER re-renders Table 1, Table 3, or Drawers!
interface QCStatusFormSectionProps {
  selectedLot: FabricLotItem | null;
  processedRecords: ProcessedRecord[];
  todayStr: string;
  onSaveSuccess: () => void;
  setSuccessMsg: (msg: string | null) => void;
}

const QCStatusFormSection = React.memo(({
  selectedLot,
  processedRecords,
  todayStr,
  onSaveSuccess,
  setSuccessMsg
}: QCStatusFormSectionProps) => {
  const [dateApprove, setDateApprove] = useState(() => todayStr);
  const [actualWidth, setActualWidth] = useState<number | string>('');
  const [qtyInspection, setQtyInspection] = useState<number | string>('');
  const [remarkText, setRemarkText] = useState('');
  const [inputJobCode, setInputJobCode] = useState('');
  const [inputJobYard, setInputJobYard] = useState('');
  const [addedJobs, setAddedJobs] = useState<JobAllocation[]>([]);
  const [editingRecordId, setEditingRecordId] = useState<number | string | null>(null);
  const [savingRecord, setSavingRecord] = useState(false);

  // Sync form state when selected lot or history changes
  useEffect(() => {
    if (!selectedLot) {
      setDateApprove(todayStr);
      setActualWidth('');
      setQtyInspection('');
      setAddedJobs([]);
      setRemarkText('');
      setEditingRecordId(null);
      return;
    }

    const existingInHistory = processedRecords.find(r =>
      r.po === selectedLot.po &&
      r.item === selectedLot.item &&
      (!selectedLot.colorCode || !r.colorCode || r.colorCode === selectedLot.colorCode) &&
      (!selectedLot.batch || !r.batch || r.batch === selectedLot.batch) &&
      (!selectedLot.invoice || !r.invoice || r.invoice === selectedLot.invoice)
    );

    if (selectedLot.isProcessed || existingInHistory) {
      let jobs: JobAllocation[] = [];
      if (existingInHistory && existingInHistory.jobs) {
        jobs = existingInHistory.jobs;
      } else if (selectedLot.savedJobsJson) {
        try {
          jobs = typeof selectedLot.savedJobsJson === 'string' ? JSON.parse(selectedLot.savedJobsJson) : selectedLot.savedJobsJson;
        } catch (e) {
          jobs = [];
        }
      }

      setDateApprove(existingInHistory?.dateApprove || selectedLot.savedDateApprove || todayStr);
      setActualWidth(existingInHistory?.actualWidth ?? selectedLot.savedActualWidth ?? selectedLot.actualWidthAvg ?? selectedLot.stdWidth);
      const currentQty = existingInHistory?.qtyInspection ?? selectedLot.savedQtyInspection ?? (selectedLot.qtyInspection > 0 ? selectedLot.qtyInspection : selectedLot.qtyReceive);
      setQtyInspection(currentQty);
      setAddedJobs(jobs);
      setRemarkText(existingInHistory?.remark || selectedLot.savedRemark || '');
      setEditingRecordId(selectedLot.statusUpdateId || existingInHistory?.id || null);
    } else {
      setDateApprove(todayStr);
      setActualWidth(selectedLot.actualWidthAvg || selectedLot.stdWidth);
      const currentQty = selectedLot.qtyInspection > 0 ? selectedLot.qtyInspection : selectedLot.qtyReceive;
      setQtyInspection(currentQty);
      setAddedJobs([]);
      setRemarkText('');
      setEditingRecordId(null);
    }
  }, [selectedLot, processedRecords, todayStr]);

  const handleAddJob = () => {
    const job = inputJobCode.trim();
    const yard = parseFloat(inputJobYard);

    if (!job) {
      alert('Vui lòng nhập Mã Job!');
      return;
    }
    if (isNaN(yard) || yard <= 0) {
      alert('Vui lòng nhập Số Yard hợp lệ (> 0)!');
      return;
    }

    setAddedJobs(prev => [...prev, { job, yard }]);
    setInputJobCode('');
    setInputJobYard('');
  };

  const handleRemoveJob = (index: number) => {
    setAddedJobs(prev => prev.filter((_, i) => i !== index));
  };

  const totalAllocatedYards = useMemo(() => {
    return addedJobs.reduce((sum, j) => sum + j.yard, 0);
  }, [addedJobs]);

  const handleSave = async () => {
    if (!selectedLot) {
      alert('Vui lòng chọn 1 Lô vải trước khi lưu!');
      return;
    }

    setSavingRecord(true);
    try {
      const inspectNum = Number(qtyInspection) > 0 ? Number(qtyInspection) : selectedLot.qtyReceive;
      const widthNum = Number(actualWidth) > 0 ? Number(actualWidth) : selectedLot.stdWidth;

      const payload: SaveStatusUpdatePayload = {
        id: editingRecordId ? Number(editingRecordId) : null,
        dateApprove,
        po: selectedLot.po,
        item: selectedLot.item,
        colorCode: selectedLot.colorCode,
        colorName: selectedLot.colorName,
        invoice: selectedLot.invoice,
        supplier: selectedLot.supplier,
        batch: selectedLot.batch,
        totalRolls: selectedLot.totalRolls || 1,
        qtyReceive: selectedLot.qtyReceive,
        qtyInspection: inspectNum,
        stdWidth: selectedLot.stdWidth,
        actualWidth: widthNum,
        jobs: [...addedJobs],
        remark: remarkText.trim() || '-',
        factory: (selectedLot as any).factory || '',
      };

      const res = await qcfbStatusUpdateService.saveStatusUpdate(payload);
      if (res.success) {
        setSuccessMsg(res.message || `Đã lưu thành công lô vải PO: ${selectedLot.po} (${selectedLot.item})`);
        setTimeout(() => setSuccessMsg(null), 4000);

        onSaveSuccess();

        setAddedJobs([]);
        setInputJobCode('');
        setInputJobYard('');
        setRemarkText('');
        setEditingRecordId(null);
      } else {
        alert('Lỗi lưu: ' + res.message);
      }
    } catch (err: any) {
      console.error('Save error:', err);
      alert('Lỗi khi lưu dữ liệu lên hệ thống: ' + (err?.message || err));
    } finally {
      setSavingRecord(false);
    }
  };

  return (
    <Paper elevation={0} sx={{
      p: { xs: 1.25, sm: 2 },
      borderRadius: '4px !important',
      border: '1px solid #e2e8f0',
      backgroundColor: '#fff',
      width: '100%',
      maxWidth: '100%',
      minWidth: 0,
      boxSizing: 'border-box'
    }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1.25, mb: 1.5, borderBottom: '1px solid #f1f5f9', flexWrap: 'wrap', gap: 1, width: '100%', minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 22, height: 22, borderRadius: 0.5, backgroundColor: ACCENT, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.75rem' }}>
            2
          </Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#1e293b' }}>
            Cập Nhật Thông Tin QC & Phân Bổ Sản Xuất
          </Typography>
        </Box>

        {editingRecordId ? (
          <Chip
            label="Chế độ: Đang chỉnh sửa bản ghi đã lưu"
            size="small"
            sx={{ bgcolor: '#fef3c7', color: '#b45309', fontWeight: 800, border: '1px solid #fde68a', fontSize: '0.72rem', height: 24 }}
          />
        ) : (
          <Chip
            label="Chế độ: Tạo mới"
            size="small"
            sx={{ bgcolor: '#f1f5f9', color: '#64748b', fontWeight: 700, fontSize: '0.72rem', height: 24 }}
          />
        )}
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%', minWidth: 0 }}>
        {/* Hàng 1: Các thông số cơ bản */}
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, minmax(0, 1fr))',
            md: 'repeat(2, minmax(0, 1fr))',
            lg: 'repeat(4, minmax(0, 1fr))'
          },
          gap: { xs: 1.25, sm: 1.5, md: 2 },
          width: '100%',
          minWidth: 0
        }}>
          {/* Ngày QC Duyệt */}
          <Box sx={{ width: '100%', minWidth: 0 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: '#1e293b', mb: 0.5, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              Ngày QC Duyệt (Date QC Approve) <span style={{ color: '#ef4444' }}>*</span>
            </Typography>
            <TextField
              fullWidth
              size="small"
              type="date"
              value={dateApprove}
              onChange={(e) => setDateApprove(e.target.value)}
              sx={{
                width: '100%',
                '& .MuiOutlinedInput-root': {
                  height: 38,
                  borderRadius: '4px !important',
                  bgcolor: '#fff',
                  '& fieldset': { borderRadius: '4px !important' }
                }
              }}
            />
            <Typography variant="caption" sx={{ color: '#94a3b8', mt: 0.5, display: 'block', fontSize: '0.7rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              Mặc định ngày hôm nay, user có thể chọn lại
            </Typography>
          </Box>

          {/* Khổ Chuẩn (DB) */}
          <Box sx={{ width: '100%', minWidth: 0 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: '#1e293b', mb: 0.5, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              Khổ Chuẩn (Standard Width từ DB)
            </Typography>
            <Box sx={{
              p: 0.75,
              px: 1.5,
              borderRadius: '4px !important',
              backgroundColor: '#f1f5f9',
              border: '1px solid #cbd5e1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              height: 38,
              width: '100%',
              minWidth: 0,
              boxSizing: 'border-box'
            }}>
              <Typography variant="body2" sx={{ fontWeight: 800, color: '#334155', fontSize: '0.92rem' }}>
                {selectedLot ? selectedLot.stdWidth : '--'}
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700 }}>Inch</Typography>
            </Box>
            <Typography variant="caption" sx={{ color: '#94a3b8', mt: 0.5, display: 'block', fontSize: '0.7rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              Quy cách khổ chuẩn truy vấn từ hệ thống
            </Typography>
          </Box>

          {/* Khổ Thực Kiểm (Auto-fill) */}
          <Box sx={{ width: '100%', minWidth: 0 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: '#1e293b', mb: 0.5, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              Khổ Thực Kiểm (Actual Width) <span style={{ color: ACCENT, fontWeight: 700 }}>(Auto-fill)</span>
            </Typography>
            <TextField
              fullWidth
              size="small"
              type="number"
              value={actualWidth}
              onChange={(e) => setActualWidth(e.target.value)}
              InputProps={{
                endAdornment: <InputAdornment position="end"><Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>Inch</Typography></InputAdornment>,
              }}
              sx={{
                width: '100%',
                '& .MuiOutlinedInput-root': {
                  height: 38,
                  borderRadius: '4px !important',
                  fontWeight: 700,
                  bgcolor: '#fff',
                  '& fieldset': { borderRadius: '4px !important' }
                }
              }}
            />
            <Typography variant="caption" sx={{ color: '#94a3b8', mt: 0.5, display: 'block', fontSize: '0.7rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              Tự động lấy theo khổ chuẩn, user có thể sửa
            </Typography>
          </Box>

          {/* Số Lượng Kiểm (Auto-fill & Có Thể Sửa) */}
          <Box sx={{ width: '100%', minWidth: 0 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: '#1e293b', mb: 0.5, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              Số Lượng Kiểm (Qty Inspect) <span style={{ color: ACCENT, fontWeight: 700 }}>(Có thể sửa)</span>
            </Typography>
            <TextField
              fullWidth
              size="small"
              type="number"
              value={qtyInspection}
              onChange={(e) => setQtyInspection(e.target.value)}
              InputProps={{
                endAdornment: <InputAdornment position="end"><Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>Yd</Typography></InputAdornment>,
              }}
              sx={{
                width: '100%',
                '& .MuiOutlinedInput-root': {
                  height: 38,
                  borderRadius: '4px !important',
                  fontWeight: 700,
                  bgcolor: '#fff',
                  '& fieldset': { borderRadius: '4px !important' }
                }
              }}
            />
            <Typography variant="caption" sx={{ color: '#94a3b8', mt: 0.5, display: 'block', fontSize: '0.7rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              Tự động lấy theo số lượng hiện có, user có thể sửa lại
            </Typography>
          </Box>
        </Box>

        {/* Hàng 2: Phân Bổ Job & Ghi Chú */}
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            md: 'minmax(0, 7fr) minmax(0, 5fr)',
            lg: 'minmax(0, 7fr) minmax(0, 5fr)'
          },
          gap: { xs: 1.5, md: 2 },
          width: '100%',
          minWidth: 0,
          alignItems: 'stretch'
        }}>
          {/* Phân Bổ Job & Số Yard (Trái: 7fr) */}
          <Paper elevation={0} sx={{ p: 1.5, borderRadius: '4px !important', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 1, width: '100%', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 0.5 }}>
              <Typography variant="caption" sx={{ fontWeight: 800, color: '#1e293b' }}>
                Phân Bổ Job & Số Yard (Bấm Enter để thêm tiếp)
              </Typography>
              <Chip
                size="small"
                label={`Đã phân bổ: ${Number(totalAllocatedYards || 0).toFixed(2)} / ${selectedLot ? Number(selectedLot.qtyReceive || 0).toFixed(2) : '0.00'} Yd`}
                sx={{
                  backgroundColor: ACCENT_LIGHT,
                  color: ACCENT,
                  fontWeight: 800,
                  border: `1px solid ${ACCENT_BORDER}`,
                  fontSize: '0.72rem',
                  borderRadius: 0.5,
                  height: 22
                }}
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 1, width: '100%', minWidth: 0, alignItems: 'center', flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
              <TextField
                fullWidth
                size="small"
                value={inputJobCode}
                onChange={(e) => setInputJobCode(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddJob(); } }}
                placeholder="Nhập Mã Job (vd: AA2601/00029)"
                sx={{
                  flex: { xs: '1 1 100%', sm: '1 1 55%' },
                  minWidth: 0,
                  backgroundColor: '#fff',
                  '& .MuiOutlinedInput-root': {
                    height: 36,
                    borderRadius: '4px !important',
                    fontSize: '0.8rem',
                    '& fieldset': { borderRadius: '4px !important' }
                  }
                }}
              />
              <TextField
                size="small"
                type="number"
                value={inputJobYard}
                onChange={(e) => setInputJobYard(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddJob(); } }}
                placeholder="Số Yard (vd: 42.5)"
                sx={{
                  flex: { xs: '1 1 calc(60% - 8px)', sm: '1 1 30%' },
                  minWidth: 0,
                  backgroundColor: '#fff',
                  '& .MuiOutlinedInput-root': {
                    height: 36,
                    borderRadius: '4px !important',
                    fontSize: '0.8rem',
                    '& fieldset': { borderRadius: '4px !important' }
                  }
                }}
              />
              <Button
                variant="contained"
                onClick={handleAddJob}
                startIcon={<AddIcon />}
                sx={{
                  flex: { xs: '1 1 calc(40% - 8px)', sm: '0 0 auto' },
                  height: 36,
                  px: 2,
                  backgroundColor: ACCENT,
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  borderRadius: '4px !important',
                  textTransform: 'none',
                  boxShadow: 'none',
                  whiteSpace: 'nowrap',
                  '&:hover': { backgroundColor: ACCENT_HOVER }
                }}
              >
                Thêm
              </Button>
            </Box>

            <Box sx={{ flex: 1, minHeight: 70, p: 0.75, backgroundColor: '#fff', border: '1px dashed #cbd5e1', borderRadius: '4px !important', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
              {addedJobs.map((item, idx) => (
                <Chip
                  key={idx}
                  label={`${item.job} (${item.yard.toFixed(2)} Yd)`}
                  onDelete={() => handleRemoveJob(idx)}
                  size="small"
                  sx={{
                    backgroundColor: ACCENT_LIGHT,
                    color: ACCENT,
                    fontWeight: 700,
                    border: `1px solid ${ACCENT_BORDER}`,
                    fontSize: '0.72rem',
                    borderRadius: 0.5,
                    height: 24,
                    '& .MuiChip-deleteIcon': { color: ACCENT, fontSize: 16, '&:hover': { color: '#ef4444' } }
                  }}
                />
              ))}
              {addedJobs.length === 0 && (
                <Typography variant="caption" sx={{ color: '#94a3b8', fontStyle: 'italic', px: 0.5, fontSize: '0.75rem' }}>
                  Chưa có Job nào được gán. Nhập Job + Yard ở trên rồi bấm Enter để tự động thêm...
                </Typography>
              )}
            </Box>
          </Paper>

          {/* Ghi Chú QC & Chỉ Dẫn (Phải: 5fr) */}
          <Paper elevation={0} sx={{ p: 1.5, borderRadius: '4px !important', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 1, width: '100%', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box' }}>
            <Typography variant="caption" sx={{ fontWeight: 800, color: '#1e293b' }}>
              Ghi Chú QC & Chỉ Dẫn (Remark)
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={5}
              value={remarkText}
              onChange={(e) => setRemarkText(e.target.value)}
              placeholder="Nhập ghi chú kiểm vải, hướng dẫn cắt nhóm, bấm số, ngăn giấy hoặc chỉ dẫn phân bổ lot/roll..."
              sx={{
                flex: 1,
                backgroundColor: '#fff',
                '& .MuiOutlinedInput-root': {
                  borderRadius: '4px !important',
                  fontSize: '0.82rem',
                  height: '100%',
                  alignItems: 'flex-start',
                  '& fieldset': { borderRadius: '4px !important' }
                }
              }}
            />
          </Paper>
        </Box>

        {/* Hàng 3: Các Nút Thao Tác (Bottom Bar) */}
        <Box sx={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 1.25,
          pt: 0.5,
          width: '100%',
          minWidth: 0,
          flexDirection: { xs: 'column-reverse', sm: 'row' }
        }}>
          <Button
            variant="outlined"
            onClick={() => {
              setAddedJobs([]);
              setInputJobCode('');
              setInputJobYard('');
              setRemarkText('');
              setActualWidth(selectedLot?.actualWidthAvg || selectedLot?.stdWidth || '');
              const defaultQty = (selectedLot?.qtyInspection && selectedLot.qtyInspection > 0)
                ? selectedLot.qtyInspection
                : (selectedLot?.qtyReceive || '');
              setQtyInspection(defaultQty);
            }}
            sx={{
              borderRadius: '4px !important',
              textTransform: 'none',
              color: '#64748b',
              borderColor: '#cbd5e1',
              height: 38,
              px: 2.5,
              width: { xs: '100%', sm: 'auto' }
            }}
          >
            Xóa làm lại
          </Button>

          <Button
            variant="contained"
            disabled={savingRecord}
            onClick={handleSave}
            startIcon={savingRecord ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
            sx={{
              px: 3,
              height: 38,
              backgroundColor: ACCENT,
              fontWeight: 700,
              fontSize: '0.82rem',
              borderRadius: '4px !important',
              textTransform: 'none',
              boxShadow: 'none',
              width: { xs: '100%', sm: 'auto' },
              '&:hover': { backgroundColor: ACCENT_HOVER },
              '&.Mui-disabled': { backgroundColor: '#a5d6a7', color: '#fff' }
            }}
          >
            {savingRecord
              ? 'Đang lưu vào hệ thống...'
              : (editingRecordId ? 'Cập Nhật Thay Đổi' : 'Lưu Dữ Liệu Vào Hệ Thống')}
          </Button>
        </Box>
      </Box>
    </Paper>
  );
});

export default function FabricStatusUpdatePage() {
  const { t } = useTranslation();

  // Common Date String
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Section 1: Filter & Drawer States
  const [openLotDrawer, setOpenLotDrawer] = useState(false);
  const [quickLotSearch, setQuickLotSearch] = useState('');
  const [filterPo, setFilterPo] = useState('');
  const [filterItem, setFilterItem] = useState('');
  const [filterColor, setFilterColor] = useState('');
  const [filterSupplier, setFilterSupplier] = useState('');

  // Excel Column-Level Filter & Sort States
  const [lotColFilters, setLotColFilters] = useState<Record<string, string[]>>({});
  const [lotSort, setLotSort] = useState<{ col: string; order: 'asc' | 'desc' } | null>(null);

  const [histColFilters, setHistColFilters] = useState<Record<string, string[]>>({});
  const [histSort, setHistSort] = useState<{ col: string; order: 'asc' | 'desc' } | null>(null);

  // Active Excel Popover state
  const [activeColFilter, setActiveColFilter] = useState<{
    table: 'lot' | 'hist';
    col: string;
    label: string;
    anchorEl: HTMLElement;
    distinctValues: string[];
  } | null>(null);
  const [searchInColFilter, setSearchInColFilter] = useState('');
  const [tempSelectedValues, setTempSelectedValues] = useState<string[]>([]);

  // Toast Notification Message
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Processed Records History (Audit Trail)
  const [processedRecords, setProcessedRecords] = useState<ProcessedRecord[]>(INITIAL_PROCESSED_RECORDS);

  // Backend lots state
  const [lots, setLots] = useState<FabricLotItem[]>([]);
  const [loadingLots, setLoadingLots] = useState(true);

  // Selected Lot
  const [selectedLot, setSelectedLot] = useState<FabricLotItem | null>(null);

  // Section 3: History Filters & Drawer State
  const [openHistDrawer, setOpenHistDrawer] = useState(false);
  const [quickHistSearch, setQuickHistSearch] = useState('');
  const [histFromDate, setHistFromDate] = useState('2026-09-01');
  const [histToDate, setHistToDate] = useState(todayStr);
  const [histPo, setHistPo] = useState('');
  const [histItem, setHistItem] = useState('');
  const [histSupplier, setHistSupplier] = useState('');
  const [histKeyword, setHistKeyword] = useState('');

  // Select lot from grid
  const handleSelectLot = useCallback((lot: FabricLotItem) => {
    setSelectedLot(lot);
  }, []);

  // Fetch lots from Backend
  const fetchLots = useCallback(async (overrides?: any) => {
    setLoadingLots(true);
    try {
      const queryPo = overrides?.po !== undefined ? overrides.po : filterPo;
      const queryItem = overrides?.item !== undefined ? overrides.item : filterItem;
      const queryColor = overrides?.color !== undefined ? overrides.color : filterColor;
      const querySupplier = overrides?.supplier !== undefined ? overrides.supplier : filterSupplier;
      const queryQuick = overrides?.quickSearch !== undefined ? overrides.quickSearch : quickLotSearch;

      const data = await qcfbStatusUpdateService.getLots({
        po: queryPo,
        item: queryItem,
        color: queryColor,
        supplier: querySupplier,
        quickSearch: queryQuick,
      });

      console.log('>>> fetchLots API response:', data);

      const list: any[] = Array.isArray(data) ? data : (Array.isArray((data as any)?.data) ? (data as any).data : []);

      const mapped: FabricLotItem[] = list.map((d: any, index: number) => ({
        id: `lot-${d.po || ''}-${d.item || ''}-${d.batch || ''}-${index}`,
        po: String(d.po || '').trim(),
        item: String(d.item || '').trim(),
        colorCode: String(d.colorCode || '').trim(),
        colorName: String(d.colorName || '').trim(),
        invoice: String(d.invoice || '').trim(),
        supplier: String(d.supplier || '').trim(),
        batch: String(d.batch || '').trim(),
        qtyReceive: Number(d.qtyReceive) || 0,
        qtyInspection: (d.savedQtyInspection && Number(d.savedQtyInspection) > 0)
          ? Number(d.savedQtyInspection)
          : (Number(d.qtyInspection) > 0 ? Number(d.qtyInspection) : (Number(d.qtyReceive) || 0)),
        stdWidth: Number(d.stdWidth) || 0,
        totalRolls: Number(d.totalRolls) || 1,
        actualWidthAvg: Number(d.actualWidthAvg) || Number(d.stdWidth) || 0,
        latestInspectDate: d.latestInspectDate || null,
        isProcessed: Boolean(d.isProcessed),
        statusUpdateId: d.statusUpdateId || null,
        savedDateApprove: d.savedDateApprove,
        savedActualWidth: d.savedActualWidth ? Number(d.savedActualWidth) : undefined,
        savedQtyInspection: d.savedQtyInspection !== undefined && d.savedQtyInspection !== null ? Number(d.savedQtyInspection) : undefined,
        savedJobsJson: d.savedJobsJson,
        savedRemark: d.savedRemark
      }));

      setLots(mapped);
      if (mapped.length > 0) {
        handleSelectLot(mapped[0]);
      } else {
        setSelectedLot(null);
      }
    } catch (err) {
      console.error('Backend API /api/qcfb/status-update/lots error:', err);
    } finally {
      setLoadingLots(false);
    }
  }, [filterPo, filterItem, filterColor, filterSupplier, quickLotSearch, handleSelectLot]);

  // Fetch History from Backend
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fetchHistory = useCallback(async (overrides?: any) => {
    setLoadingHistory(true);
    try {
      const data = await qcfbStatusUpdateService.getHistory({
        fromDate: overrides?.fromDate !== undefined ? overrides.fromDate : histFromDate,
        toDate: overrides?.toDate !== undefined ? overrides.toDate : histToDate,
        po: overrides?.po !== undefined ? overrides.po : histPo,
        item: overrides?.item !== undefined ? overrides.item : histItem,
        supplier: overrides?.supplier !== undefined ? overrides.supplier : histSupplier,
        keyword: overrides?.keyword !== undefined ? overrides.keyword : histKeyword,
      });

      if (Array.isArray(data)) {
        const mappedHist: ProcessedRecord[] = data.map((item) => {
          let jobsList: JobAllocation[] = [];
          if (item.jobsJson) {
            try {
              jobsList = typeof item.jobsJson === 'string' ? JSON.parse(item.jobsJson) : item.jobsJson;
            } catch (e) {
              jobsList = [];
            }
          }
          return {
            id: String(item.id),
            dateApprove: item.dateApprove,
            po: item.po,
            item: item.item,
            colorCode: item.colorCode,
            colorName: item.colorName,
            color: `${item.colorCode} - ${item.colorName}`,
            invoice: item.invoice,
            supplier: item.supplier,
            batch: item.batch,
            qtyReceive: Number(item.qtyReceive) || 0,
            qtyInspection: Number(item.qtyInspection) || 0,
            stdWidth: Number(item.stdWidth) || 0,
            actualWidth: Number(item.actualWidth) || 0,
            jobs: Array.isArray(jobsList) ? jobsList : [],
            remark: item.remark || '-',
          };
        });
        setProcessedRecords(mappedHist);
      }
    } catch (err) {
      console.error('Failed to fetch status update history from backend:', err);
    } finally {
      setLoadingHistory(false);
    }
  }, [histFromDate, histToDate, histPo, histItem, histSupplier, histKeyword]);

  useEffect(() => {
    fetchLots();
    fetchHistory();
  }, []);

  // Debounced live search when quick search or drawer filters change
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLots();
    }, 400);
    return () => clearTimeout(timer);
  }, [quickLotSearch]);

  // Unique list of suppliers for dropdown
  const uniqueSuppliers = useMemo(() => {
    return Array.from(new Set(lots.map(l => l.supplier).filter(Boolean))).sort();
  }, [lots]);

  // Distinct values for Table 1 columns
  const table1DistinctValues = useMemo(() => {
    return {
      po: Array.from(new Set(lots.map(l => l.po).filter(Boolean))).sort(),
      item: Array.from(new Set(lots.map(l => l.item).filter(Boolean))).sort(),
      color: Array.from(new Set(lots.map(l => `${l.colorCode} - ${l.colorName}`).filter(Boolean))).sort(),
      invoice: Array.from(new Set(lots.map(l => l.invoice).filter(Boolean))).sort(),
      supplier: Array.from(new Set(lots.map(l => l.supplier).filter(Boolean))).sort(),
      batch: Array.from(new Set(lots.map(l => l.batch).filter(Boolean))).sort(),
      qtyReceive: Array.from(new Set(lots.map(l => String(l.qtyReceive)))).sort((a, b) => Number(a) - Number(b)),
      qtyInspection: Array.from(new Set(lots.map(l => String(l.qtyInspection)))).sort((a, b) => Number(a) - Number(b)),
      stdWidth: Array.from(new Set(lots.map(l => String(l.stdWidth)))).sort((a, b) => Number(a) - Number(b)),
    };
  }, [lots]);

  // Filtered Lots for Grid Selection (including Excel Column Filters & Sort)
  const filteredLots = useMemo(() => {
    const q = (quickLotSearch || '').toLowerCase().trim();
    const p = (filterPo || '').toLowerCase().trim();
    const it = (filterItem || '').toLowerCase().trim();
    const c = (filterColor || '').toLowerCase().trim();
    const s = filterSupplier;

    let result = lots.filter((lot) => {
      const matchQuick = !q || (
        (lot.po || '').toLowerCase().includes(q) ||
        (lot.invoice || '').toLowerCase().includes(q) ||
        (lot.item || '').toLowerCase().includes(q) ||
        (lot.colorCode || '').toLowerCase().includes(q) ||
        (lot.colorName || '').toLowerCase().includes(q) ||
        (lot.supplier || '').toLowerCase().includes(q) ||
        (lot.batch || '').toLowerCase().includes(q)
      );
      const matchPo = !p || (lot.po || '').toLowerCase().includes(p) || (lot.invoice || '').toLowerCase().includes(p);
      const matchItem = !it || (lot.item || '').toLowerCase().includes(it);
      const matchColor = !c || (lot.colorCode || '').toLowerCase().includes(c) || (lot.colorName || '').toLowerCase().includes(c);
      const matchSupplier = !s || lot.supplier === s;

      // Excel Column Filters
      const matchColFilters = Object.entries(lotColFilters).every(([col, selectedVals]) => {
        if (!selectedVals || selectedVals.length === 0) return true;
        let val = '';
        if (col === 'po') val = lot.po;
        else if (col === 'item') val = lot.item;
        else if (col === 'color') val = `${lot.colorCode} - ${lot.colorName}`;
        else if (col === 'invoice') val = lot.invoice;
        else if (col === 'supplier') val = lot.supplier;
        else if (col === 'batch') val = lot.batch;
        else if (col === 'qtyReceive') val = String(lot.qtyReceive);
        else if (col === 'qtyInspection') val = String(lot.qtyInspection);
        else if (col === 'stdWidth') val = String(lot.stdWidth);
        return selectedVals.includes(val);
      });

      return matchQuick && matchPo && matchItem && matchColor && matchSupplier && matchColFilters;
    });

    // Sort
    if (lotSort) {
      result = [...result].sort((a, b) => {
        let valA: any = (a as any)[lotSort.col] ?? '';
        let valB: any = (b as any)[lotSort.col] ?? '';
        if (lotSort.col === 'color') {
          valA = `${a.colorCode} ${a.colorName}`;
          valB = `${b.colorCode} ${b.colorName}`;
        }
        if (typeof valA === 'number' && typeof valB === 'number') {
          return lotSort.order === 'asc' ? valA - valB : valB - valA;
        }
        return lotSort.order === 'asc'
          ? String(valA).localeCompare(String(valB))
          : String(valB).localeCompare(String(valA));
      });
    }

    return result;
  }, [lots, quickLotSearch, filterPo, filterItem, filterColor, filterSupplier, lotColFilters, lotSort]);

  // Pagination for Table 1 (Lots)
  const [lotPage, setLotPage] = useState(0);
  const [lotRowsPerPage, setLotRowsPerPage] = useState(25);

  const paginatedLots = useMemo(() => {
    const start = lotPage * lotRowsPerPage;
    return filteredLots.slice(start, start + lotRowsPerPage);
  }, [filteredLots, lotPage, lotRowsPerPage]);

  const lotActiveFilterCount = useMemo(() => {
    let cnt = 0;
    if (filterPo) cnt++;
    if (filterItem) cnt++;
    if (filterColor) cnt++;
    if (filterSupplier) cnt++;
    cnt += Object.keys(lotColFilters).length;
    return cnt;
  }, [filterPo, filterItem, filterColor, filterSupplier, lotColFilters]);

  const hasActiveFilter = Boolean(quickLotSearch || lotActiveFilterCount > 0 || lotSort);

  const handleResetFilters = () => {
    setQuickLotSearch('');
    setFilterPo('');
    setFilterItem('');
    setFilterColor('');
    setFilterSupplier('');
    setLotColFilters({});
    setLotSort(null);
    setLotPage(0);
    fetchLots({ quickSearch: '', po: '', item: '', color: '', supplier: '' });
  };

  // Distinct values for Table 3 columns
  const table3DistinctValues = useMemo(() => {
    return {
      dateApprove: Array.from(new Set(processedRecords.map(r => r.dateApprove))).sort().reverse(),
      po: Array.from(new Set(processedRecords.map(r => r.po))).sort(),
      item: Array.from(new Set(processedRecords.map(r => r.item))).sort(),
      color: Array.from(new Set(processedRecords.map(r => r.color))).sort(),
      invoice: Array.from(new Set(processedRecords.map(r => r.invoice))).sort(),
      supplier: Array.from(new Set(processedRecords.map(r => r.supplier))).sort(),
      qtyReceive: Array.from(new Set(processedRecords.map(r => String(r.qtyReceive)))).sort((a, b) => Number(a) - Number(b)),
      stdWidth: Array.from(new Set(processedRecords.map(r => String(r.stdWidth)))).sort((a, b) => Number(a) - Number(b)),
      actualWidth: Array.from(new Set(processedRecords.map(r => String(r.actualWidth)))).sort((a, b) => Number(a) - Number(b)),
      jobs: Array.from(new Set(processedRecords.flatMap(r => r.jobs.map(j => `${j.job} (${j.yard.toFixed(2)} Yd)`)))).sort(),
      remark: Array.from(new Set(processedRecords.map(r => r.remark))).sort(),
    };
  }, [processedRecords]);

  // Filtered & Sorted History Records (including Excel Column Filters & Sort)
  const filteredHistoryRecords = useMemo(() => {
    const qk = quickHistSearch.toLowerCase().trim();
    let result = processedRecords.filter((rec) => {
      const matchQuick = !qk || (
        rec.po.toLowerCase().includes(qk) ||
        rec.item.toLowerCase().includes(qk) ||
        rec.color.toLowerCase().includes(qk) ||
        rec.invoice.toLowerCase().includes(qk) ||
        rec.supplier.toLowerCase().includes(qk) ||
        rec.remark.toLowerCase().includes(qk) ||
        rec.jobs.some(j => j.job.toLowerCase().includes(qk))
      );
      const matchDate = (!histFromDate || rec.dateApprove >= histFromDate) &&
                        (!histToDate || rec.dateApprove <= histToDate);
      const p = histPo.toLowerCase().trim();
      const matchPo = !p || rec.po.toLowerCase().includes(p);
      const it = histItem.toLowerCase().trim();
      const matchItem = !it || rec.item.toLowerCase().includes(it);
      const s = histSupplier;
      const matchSup = !s || rec.supplier === s;
      const kw = histKeyword.toLowerCase().trim();
      const matchKeyword = !kw || (
        rec.color.toLowerCase().includes(kw) ||
        rec.invoice.toLowerCase().includes(kw) ||
        rec.remark.toLowerCase().includes(kw) ||
        rec.jobs.some(j => j.job.toLowerCase().includes(kw))
      );

      // Excel Column Filters
      const matchColFilters = Object.entries(histColFilters).every(([col, selectedVals]) => {
        if (!selectedVals || selectedVals.length === 0) return true;
        let val = '';
        if (col === 'dateApprove') val = rec.dateApprove;
        else if (col === 'po') val = rec.po;
        else if (col === 'item') val = rec.item;
        else if (col === 'color') val = rec.color;
        else if (col === 'invoice') val = rec.invoice;
        else if (col === 'supplier') val = rec.supplier;
        else if (col === 'qtyReceive') val = String(rec.qtyReceive);
        else if (col === 'stdWidth') val = String(rec.stdWidth);
        else if (col === 'actualWidth') val = String(rec.actualWidth);
        else if (col === 'remark') val = rec.remark;
        else if (col === 'jobs') {
          return selectedVals.some(sv => rec.jobs.some(j => `${j.job} (${j.yard.toFixed(2)} Yd)` === sv || j.job === sv));
        }
        return selectedVals.includes(val);
      });

      return matchQuick && matchDate && matchPo && matchItem && matchSup && matchKeyword && matchColFilters;
    });

    // Sort
    if (histSort) {
      result = [...result].sort((a, b) => {
        let valA: any = (a as any)[histSort.col] ?? '';
        let valB: any = (b as any)[histSort.col] ?? '';
        if (typeof valA === 'number' && typeof valB === 'number') {
          return histSort.order === 'asc' ? valA - valB : valB - valA;
        }
        return histSort.order === 'asc'
          ? String(valA).localeCompare(String(valB))
          : String(valB).localeCompare(String(valA));
      });
    }

    return result;
  }, [processedRecords, quickHistSearch, histFromDate, histToDate, histPo, histItem, histSupplier, histKeyword, histColFilters, histSort]);

  // Pagination for Table 3 (History)
  const [histPage, setHistPage] = useState(0);
  const [histRowsPerPage, setHistRowsPerPage] = useState(25);

  const paginatedHistory = useMemo(() => {
    const start = histPage * histRowsPerPage;
    return filteredHistoryRecords.slice(start, start + histRowsPerPage);
  }, [filteredHistoryRecords, histPage, histRowsPerPage]);

  const totalFilteredYards = useMemo(() => {
    return filteredHistoryRecords.reduce((sum, r) => sum + r.qtyReceive, 0);
  }, [filteredHistoryRecords]);

  const histActiveFilterCount = useMemo(() => {
    let cnt = 0;
    if (histFromDate !== '2026-09-01') cnt++;
    if (histToDate !== todayStr) cnt++;
    if (histPo) cnt++;
    if (histItem) cnt++;
    if (histSupplier) cnt++;
    if (histKeyword) cnt++;
    cnt += Object.keys(histColFilters).length;
    return cnt;
  }, [histFromDate, histToDate, histPo, histItem, histSupplier, histKeyword, todayStr, histColFilters]);

  const hasActiveHistFilter = Boolean(quickHistSearch || histActiveFilterCount > 0 || histSort);

  const handleResetHistFilters = () => {
    setQuickHistSearch('');
    setHistFromDate('2026-09-01');
    setHistToDate(todayStr);
    setHistPo('');
    setHistItem('');
    setHistSupplier('');
    setHistKeyword('');
    setHistColFilters({});
    setHistSort(null);
    setHistPage(0);
  };

  // Popover Actions for Excel Column Filters
  const handleOpenColFilter = (
    table: 'lot' | 'hist',
    col: string,
    label: string,
    anchorEl: HTMLElement,
    distinctVals: string[]
  ) => {
    const currentFilters = table === 'lot' ? lotColFilters : histColFilters;
    const existing = currentFilters[col];
    setActiveColFilter({ table, col, label, anchorEl, distinctValues: distinctVals });
    setSearchInColFilter('');
    setTempSelectedValues(existing ? [...existing] : [...distinctVals]);
  };

  const handleCloseColFilter = () => {
    setActiveColFilter(null);
  };

  const handleToggleColFilterValue = (val: string) => {
    setTempSelectedValues(prev =>
      prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]
    );
  };

  const handleToggleSelectAllColFilter = () => {
    if (!activeColFilter) return;
    const visibleVals = activeColFilter.distinctValues.filter(v =>
      v.toLowerCase().includes(searchInColFilter.toLowerCase())
    );
    const allVisibleSelected = visibleVals.every(v => tempSelectedValues.includes(v));
    if (allVisibleSelected) {
      setTempSelectedValues(prev => prev.filter(v => !visibleVals.includes(v)));
    } else {
      setTempSelectedValues(prev => Array.from(new Set([...prev, ...visibleVals])));
    }
  };

  const handleApplyColFilter = () => {
    if (!activeColFilter) return;
    const { table, col, distinctValues } = activeColFilter;
    if (tempSelectedValues.length === distinctValues.length || tempSelectedValues.length === 0) {
      if (table === 'lot') {
        setLotColFilters(prev => {
          const next = { ...prev };
          delete next[col];
          return next;
        });
      } else {
        setHistColFilters(prev => {
          const next = { ...prev };
          delete next[col];
          return next;
        });
      }
    } else {
      if (table === 'lot') {
        setLotColFilters(prev => ({ ...prev, [col]: tempSelectedValues }));
      } else {
        setHistColFilters(prev => ({ ...prev, [col]: tempSelectedValues }));
      }
    }
    handleCloseColFilter();
  };

  const handleClearColFilter = () => {
    if (!activeColFilter) return;
    const { table, col } = activeColFilter;
    if (table === 'lot') {
      setLotColFilters(prev => {
        const next = { ...prev };
        delete next[col];
        return next;
      });
    } else {
      setHistColFilters(prev => {
        const next = { ...prev };
        delete next[col];
        return next;
      });
    }
    handleCloseColFilter();
  };

  const handleSortCol = (order: 'asc' | 'desc') => {
    if (!activeColFilter) return;
    const { table, col } = activeColFilter;
    if (table === 'lot') {
      setLotSort({ col, order });
    } else {
      setHistSort({ col, order });
    }
    handleCloseColFilter();
  };

  // Helper to render Excel Filter Header Cell
  const renderExcelHeader = (
    table: 'lot' | 'hist',
    colKey: string,
    label: string,
    align: 'left' | 'center' | 'right' = 'left',
    width?: number | string
  ) => {
    const colFilters = table === 'lot' ? lotColFilters : histColFilters;
    const sortState = table === 'lot' ? lotSort : histSort;
    const distinctVals = table === 'lot'
      ? (table1DistinctValues as any)[colKey] || []
      : (table3DistinctValues as any)[colKey] || [];
    const isFiltered = Boolean(colFilters[colKey] && colFilters[colKey].length > 0);
    const isSorted = sortState?.col === colKey;

    return (
      <TableCell
        key={colKey}
        align={align}
        sx={{
          bgcolor: isFiltered ? '#ecfdf5' : '#f8fafc',
          fontWeight: 800,
          fontSize: '0.72rem',
          color: isFiltered ? ACCENT : '#475569',
          py: 0.75,
          px: 1,
          whiteSpace: 'nowrap',
          userSelect: 'none',
          width,
          borderBottom: isFiltered ? `2px solid ${ACCENT}` : undefined
        }}
      >
        <Box sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.25,
          justifyContent: align === 'right' ? 'flex-end' : align === 'center' ? 'center' : 'flex-start',
          width: '100%'
        }}>
          <span>{label}</span>
          {isSorted && (
            <span style={{ color: ACCENT, fontSize: '10px', fontWeight: 900, marginLeft: 2 }}>
              {sortState?.order === 'asc' ? '▲' : '▼'}
            </span>
          )}
          <IconButton
            size="small"
            title={`Lọc & sắp xếp cột: ${label}`}
            onClick={(e) => {
              e.stopPropagation();
              handleOpenColFilter(table, colKey, label, e.currentTarget, distinctVals);
            }}
            sx={{
              p: 0.25,
              ml: 0.25,
              color: isFiltered ? '#fff !important' : '#94a3b8',
              bgcolor: isFiltered ? `${ACCENT} !important` : 'transparent',
              borderRadius: '3px !important',
              width: 19,
              height: 19,
              '&:hover': {
                bgcolor: isFiltered ? `${ACCENT_HOVER} !important` : '#e2e8f0',
                color: isFiltered ? '#fff !important' : ACCENT
              }
            }}
          >
            <FilterAltIcon sx={{ fontSize: 13 }} />
          </IconButton>
        </Box>
      </TableCell>
    );
  };

  const setDateShortcut = (type: 'today' | 'week' | 'month' | 'all') => {
    const today = new Date();
    const todayIso = today.toISOString().split('T')[0];
    if (type === 'today') {
      setHistFromDate(todayIso);
      setHistToDate(todayIso);
    } else if (type === 'week') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      setHistFromDate(d.toISOString().split('T')[0]);
      setHistToDate(todayIso);
    } else if (type === 'month') {
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
      setHistFromDate(firstDayOfMonth);
      setHistToDate(todayIso);
    } else if (type === 'all') {
      setHistFromDate('');
      setHistToDate('');
    }
  };

  // Export to Excel (Theo bộ lọc lịch sử)
  const handleExportExcel = async () => {
    if (filteredHistoryRecords.length === 0) {
      alert('Không có dữ liệu nào khớp với bộ lọc để xuất!');
      return;
    }

    try {
      const ExcelJS = (await import('exceljs')).default;
      const { saveAs } = await import('file-saver');

      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('QC_Fabric_Status', {
        views: [{ state: 'frozen', xSplit: 9, ySplit: 1, activeCell: 'J2' }]
      });

      const headers = [
        'DATE QC APP',
        'PO (ERP)',
        'ITEM',
        'COLOR CODE',
        'COLOR NAME',
        'INVOICE',
        'SUPPLIER',
        'LOT / BATCH',
        'ROLLS',
        'QTY RECEIVE (YD)',
        'QTY INSPECT (YD)',
        'STD WIDTH (INCH)',
        'ACTUAL WIDTH (INCH)',
        'JOB & YARD ALLOCATION',
        'REMARK'
      ];

      const headerRow = ws.addRow(headers);
      headerRow.height = 28;
      headerRow.font = { name: 'Calibri', bold: true, color: { argb: 'FFFFFFFF' }, size: 10.5 };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF2E7D32' }
      };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };

      filteredHistoryRecords.forEach(rec => {
        const jobStr = rec.jobs.length > 0
          ? rec.jobs.map(j => `${j.job} (${j.yard} Yd)`).join(', ')
          : '-';

        const colorParts = (rec.color || '').split(' - ');
        const colorCode = colorParts[0] || '';
        const colorName = colorParts.slice(1).join(' - ') || rec.color || '';

        const row = ws.addRow([
          rec.dateApprove,
          rec.po,
          rec.item,
          colorCode,
          colorName,
          rec.invoice,
          rec.supplier,
          rec.batch || '-',
          1, // Rolls
          rec.qtyReceive,
          rec.qtyInspection || 0,
          rec.stdWidth,
          rec.actualWidth,
          jobStr,
          rec.remark
        ]);

        row.alignment = { vertical: 'middle' };
        row.getCell(1).alignment = { horizontal: 'center' };
        row.getCell(4).alignment = { horizontal: 'center' };
        row.getCell(8).alignment = { horizontal: 'center' };
        row.getCell(9).alignment = { horizontal: 'right' };
        row.getCell(10).alignment = { horizontal: 'right' };
        row.getCell(11).alignment = { horizontal: 'right' };
        row.getCell(12).alignment = { horizontal: 'center' };
        row.getCell(13).alignment = { horizontal: 'center' };
      });

      const colWidths = [15, 18, 22, 15, 24, 20, 28, 14, 10, 18, 18, 17, 18, 34, 40];
      colWidths.forEach((w, idx) => {
        ws.getColumn(idx + 1).width = w;
      });

      ws.eachRow((r) => {
        r.eachCell((c) => {
          c.border = {
            top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
            left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
            bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
            right: { style: 'thin', color: { argb: 'FFE0E0E0' } }
          };
        });
      });

      const buffer = await wb.xlsx.writeBuffer();
      const dateStr = new Date().toISOString().slice(0, 10);
      saveAs(new Blob([buffer]), `QC_Fabric_Status_${dateStr}.xlsx`);
    } catch (err: any) {
      alert('Lỗi xuất Excel: ' + (err?.message || err));
    }
  };

  return (
    <Box sx={{
      p: { xs: 1, sm: 1.5, md: 2 },
      width: '100%',
      maxWidth: '100%',
      minWidth: 0,
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      gap: 1.5,
      overflowX: 'hidden'
    }}>
      
      {/* Top Banner Card */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 1.25, sm: 1.75 },
          borderRadius: '4px !important',
          background: 'linear-gradient(135deg, #2e7d32 0%, #388e3c 100%)',
          color: '#fff',
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          gap: 1.5,
          border: '1px solid #1b5e20',
          width: '100%',
          maxWidth: '100%',
          minWidth: 0,
          boxSizing: 'border-box'
        }}
      >
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <Chip
              label="TRAXECO • QC FABRIC WH"
              size="small"
              sx={{ backgroundColor: 'rgba(0,0,0,0.25)', color: '#fff', fontWeight: 700, fontSize: '0.68rem', borderRadius: 0.5, height: 22 }}
            />
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.9)' }}>
              Biểu Mẫu Chuẩn Hóa
            </Typography>
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: '-0.01em', lineHeight: 1.2 }}>
            {t('qcfb.statusUpdate.title', 'Cập Nhật & Phân Bổ Tình Trạng Kiểm Vải')}
          </Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.85)', mt: 0.25, display: 'block', fontSize: '0.8rem' }}>
            {t('qcfb.statusUpdate.subtitle', 'Biểu mẫu thống nhất dùng chung cho toàn bộ các xưởng (F1, F2, F3)')}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, alignSelf: { xs: 'flex-end', sm: 'center' } }}>
          <Button
            variant="contained"
            size="small"
            startIcon={<ExcelIcon sx={{ fontSize: '18px !important' }} />}
            onClick={handleExportExcel}
            sx={{
              backgroundColor: '#fff',
              color: ACCENT,
              fontWeight: 700,
              fontSize: '0.78rem',
              borderRadius: 1,
              height: 32,
              px: 2,
              textTransform: 'none',
              '&:hover': { backgroundColor: 'rgba(255,255,255,0.9)' }
            }}
          >
            {t('qcfb.exportExcel', 'Xuất Excel')}
          </Button>
        </Box>
      </Paper>

      {/* Success alert */}
      {successMsg && (
        <Alert severity="success" icon={<CheckCircleIcon fontSize="inherit" />} sx={{ borderRadius: 1, py: 0.5 }}>
          {successMsg}
        </Alert>
      )}

      {/* SECTION 1: TRA CỨU & CHỌN LÔ VẢI (TRỰC TIẾP DẠNG GRID + FILTER CHUẨN ERP) */}
      <Paper elevation={0} sx={{
        p: { xs: 1.25, sm: 2 },
        borderRadius: '4px !important',
        border: '1px solid #e2e8f0',
        backgroundColor: '#fff',
        width: '100%',
        maxWidth: '100%',
        minWidth: 0,
        boxSizing: 'border-box'
      }}>
        
        {/* Section 1 Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1.25, borderBottom: '1px solid #f1f5f9', mb: 1.5, flexWrap: 'wrap', gap: 1, width: '100%', minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 22, height: 22, borderRadius: 0.5, backgroundColor: ACCENT, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.75rem' }}>
              1
            </Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#1e293b' }}>
              Tra Cứu & Chọn Lô Vải Tiếp Nhận (Dữ Liệu Từ DB)
            </Typography>
          </Box>

          {selectedLot && (
            <Chip
              icon={<CheckCircleIcon sx={{ fontSize: '14px !important', color: `${ACCENT} !important` }} />}
              label={`Đang chọn: ${selectedLot.po} (${selectedLot.item}) • ${Number(selectedLot.qtyReceive || 0).toFixed(0)} Yd`}
              size="small"
              sx={{
                backgroundColor: ACCENT_LIGHT,
                color: ACCENT,
                fontWeight: 700,
                fontSize: '0.72rem',
                borderRadius: 0.5,
                border: `1px solid ${ACCENT_BORDER}`,
                height: 24
              }}
            />
          )}
        </Box>

        {/* Thanh Công Cụ: Quick Search + Nút Mở Drawer Bộ Lọc */}
        <Box sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 1.25,
          mb: 1.25,
          flexWrap: 'wrap'
        }}>
          {/* Quick Search (Debounced 0ms typing response) */}
          <DebouncedSearchInput
            placeholder="Tìm nhanh theo PO, Item, Màu, Invoice, NCC..."
            value={quickLotSearch}
            onChange={(val) => {
              setQuickLotSearch(val);
              fetchLots({ quickSearch: val });
            }}
            sx={{
              flex: { xs: '1 1 100%', sm: '1 1 320px' },
              maxWidth: { sm: 420 },
              '& .MuiOutlinedInput-root': {
                height: 34,
                borderRadius: '4px !important',
                bgcolor: '#fff',
                fontSize: '0.8rem',
                '& fieldset': { borderRadius: '4px !important' }
              }
            }}
          />

          {/* Action buttons on Toolbar */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600 }}>
              Tìm thấy <span style={{ color: ACCENT, fontWeight: 800 }}>{filteredLots.length}</span> / {lots.length} lô
            </Typography>

            <IconButton
              size="small"
              onClick={() => fetchLots()}
              title="Tải lại từ Database"
              sx={{
                height: 34,
                width: 34,
                border: '1px solid #cbd5e1',
                borderRadius: '4px !important',
                bgcolor: '#fff',
                color: '#334155',
                '&:hover': { bgcolor: '#f8fafc', borderColor: ACCENT }
              }}
            >
              <RefreshIcon sx={{ fontSize: 18 }} />
            </IconButton>

            <Badge badgeContent={lotActiveFilterCount} color="success">
              <Button
                variant={lotActiveFilterCount > 0 ? 'contained' : 'outlined'}
                size="small"
                startIcon={<FilterListIcon sx={{ fontSize: '18px !important' }} />}
                onClick={() => setOpenLotDrawer(true)}
                sx={{
                  height: 34,
                  borderRadius: '4px !important',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  textTransform: 'none',
                  px: 1.5,
                  ...(lotActiveFilterCount > 0 ? {
                    backgroundColor: ACCENT,
                    color: '#fff',
                    '&:hover': { backgroundColor: ACCENT_HOVER }
                  } : {
                    borderColor: '#cbd5e1',
                    color: '#334155',
                    bgcolor: '#fff',
                    '&:hover': { bgcolor: '#f8fafc', borderColor: '#94a3b8' }
                  })
                }}
              >
                Bộ lọc nâng cao
              </Button>
            </Badge>

            {hasActiveFilter && (
              <Button
                size="small"
                variant="text"
                onClick={handleResetFilters}
                startIcon={<RefreshIcon sx={{ fontSize: '15px !important' }} />}
                sx={{ height: 34, color: '#64748b', fontSize: '0.75rem', textTransform: 'none', px: 1 }}
              >
                Xóa lọc
              </Button>
            )}
          </Box>
        </Box>

        {/* Active Filter Chips for Section 1 */}
        {lotActiveFilterCount > 0 && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1.25, alignItems: 'center' }}>
            <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, fontSize: '0.7rem' }}>
              Đang lọc:
            </Typography>
            {filterPo && (
              <Chip
                size="small"
                label={`PO/INV: ${filterPo}`}
                onDelete={() => setFilterPo('')}
                sx={{ borderRadius: '4px !important', height: 24, fontSize: '0.72rem', bgcolor: '#f1f5f9' }}
              />
            )}
            {filterItem && (
              <Chip
                size="small"
                label={`ITEM: ${filterItem}`}
                onDelete={() => setFilterItem('')}
                sx={{ borderRadius: '4px !important', height: 24, fontSize: '0.72rem', bgcolor: '#f1f5f9' }}
              />
            )}
            {filterColor && (
              <Chip
                size="small"
                label={`MÀU: ${filterColor}`}
                onDelete={() => setFilterColor('')}
                sx={{ borderRadius: '4px !important', height: 24, fontSize: '0.72rem', bgcolor: '#f1f5f9' }}
              />
            )}
            {filterSupplier && (
              <Chip
                size="small"
                label={`NCC: ${filterSupplier}`}
                onDelete={() => setFilterSupplier('')}
                sx={{ borderRadius: '4px !important', height: 24, fontSize: '0.72rem', bgcolor: '#f1f5f9' }}
              />
            )}
          </Box>
        )}

        {/* Bảng Danh Sách Lô Vải Để User Chọn */}
        <TableContainer sx={{
          width: '100%',
          maxWidth: '100%',
          overflowX: 'auto',
          border: '1px solid #e2e8f0',
          borderRadius: '4px !important',
          maxHeight: 240
        }}>
          <Table size="small" stickyHeader sx={{ minWidth: 780, width: '100%' }}>
            <TableHead>
              <TableRow sx={{ '& th': { bgcolor: '#f8fafc', fontWeight: 800, fontSize: '0.72rem', color: '#475569', py: 0.75 } }}>
                <TableCell align="center" sx={{ width: 50 }}>Chọn</TableCell>
                {renderExcelHeader('lot', 'po', 'Số PO (ERP)')}
                {renderExcelHeader('lot', 'item', 'Mã Vải (Item)')}
                {renderExcelHeader('lot', 'color', 'Màu Sắc')}
                {renderExcelHeader('lot', 'invoice', 'Số Invoice')}
                {renderExcelHeader('lot', 'supplier', 'Nhà Cung Cấp')}
                {renderExcelHeader('lot', 'batch', 'Mã Lot (Batch)')}
                {renderExcelHeader('lot', 'qtyReceive', 'SL Nhận', 'right')}
                {renderExcelHeader('lot', 'qtyInspection', 'SL Kiểm', 'right')}
                {renderExcelHeader('lot', 'stdWidth', 'Khổ Chuẩn', 'center')}
              </TableRow>
            </TableHead>
            <TableBody>
              {loadingLots ? (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 3, color: '#64748b' }}>
                    Đang tìm kiếm & tải dữ liệu lô vải từ ERP...
                  </TableCell>
                </TableRow>
              ) : filteredLots.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 3, color: '#94a3b8', fontStyle: 'italic' }}>
                    Không tìm thấy Lô vải nào khớp với bộ lọc. Vui lòng bấm &ldquo;Đặt lại&rdquo; để hiển thị toàn bộ.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedLots.map((lot) => (
                  <LotRow
                    key={lot.id}
                    lot={lot}
                    isCurrent={selectedLot?.id === lot.id}
                    onSelect={handleSelectLot}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          rowsPerPageOptions={[15, 25, 50, 100]}
          component="div"
          count={filteredLots.length}
          rowsPerPage={lotRowsPerPage}
          page={lotPage}
          onPageChange={(_, newPage) => setLotPage(newPage)}
          onRowsPerPageChange={(e) => {
            setLotRowsPerPage(parseInt(e.target.value, 10));
            setLotPage(0);
          }}
          labelRowsPerPage="Số dòng / trang:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} trên ${count}`}
          sx={{ borderTop: '1px solid #f1f5f9', '& .MuiTablePagination-toolbar': { minHeight: 40, px: 1 } }}
        />

        {/* Chi Tiết Lô Vải Đang Chọn (8 Thẻ Thông Tin Chuẩn Giao Diện) */}
        {selectedLot && (
          <Box sx={{
            mt: 1.5,
            p: 1.25,
            bgcolor: '#f8fafc',
            borderRadius: '4px !important',
            border: '1px solid #e2e8f0',
            width: '100%',
            maxWidth: '100%',
            minWidth: 0,
            boxSizing: 'border-box'
          }}>
            <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', mb: 1, display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <CheckCircleIcon sx={{ fontSize: 16, color: ACCENT }} /> Chi tiết Lô Vải đang chọn:
            </Typography>

            <Box sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: 'repeat(2, minmax(0, 1fr))',
                sm: 'repeat(2, minmax(0, 1fr))',
                md: 'repeat(4, minmax(0, 1fr))',
                lg: 'repeat(4, minmax(0, 1fr))'
              },
              gap: 1,
              width: '100%',
              minWidth: 0
            }}>
              {/* Row 1 */}
              <Box sx={{ p: 1, px: 1.25, borderRadius: '4px !important', bgcolor: '#fff', border: '1px solid #e2e8f0', minWidth: 0, overflow: 'hidden' }}>
                <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.68rem', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>PO (ERP)</Typography>
                <Typography variant="body2" title={selectedLot.po} sx={{ fontWeight: 800, color: ACCENT, fontSize: '0.85rem', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedLot.po}</Typography>
              </Box>

              <Box sx={{ p: 1, px: 1.25, borderRadius: '4px !important', bgcolor: '#fff', border: '1px solid #e2e8f0', minWidth: 0, overflow: 'hidden' }}>
                <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.68rem', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>MÃ VẢI (ITEM)</Typography>
                <Typography variant="body2" title={selectedLot.item} sx={{ fontWeight: 800, fontSize: '0.85rem', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedLot.item}</Typography>
              </Box>

              <Box sx={{ p: 1, px: 1.25, borderRadius: '4px !important', bgcolor: '#fff', border: '1px solid #e2e8f0', minWidth: 0, overflow: 'hidden' }}>
                <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.68rem', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>MÀU SẮC</Typography>
                <Typography variant="body2" title={`${selectedLot.colorCode} - ${selectedLot.colorName}`} sx={{ fontWeight: 700, fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedLot.colorCode} - {selectedLot.colorName}</Typography>
              </Box>

              <Box sx={{ p: 1, px: 1.25, borderRadius: '4px !important', bgcolor: '#fff', border: '1px solid #e2e8f0', minWidth: 0, overflow: 'hidden' }}>
                <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.68rem', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>SỐ INVOICE</Typography>
                <Typography variant="body2" title={selectedLot.invoice} sx={{ fontWeight: 600, color: '#334155', fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedLot.invoice || '-'}</Typography>
              </Box>

              {/* Row 2 */}
              <Box sx={{ p: 1, px: 1.25, borderRadius: '4px !important', bgcolor: '#fff', border: '1px solid #e2e8f0', minWidth: 0, overflow: 'hidden' }}>
                <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.68rem', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>NHÀ CUNG CẤP</Typography>
                <Typography variant="body2" title={selectedLot.supplier} sx={{ fontWeight: 600, color: '#334155', fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedLot.supplier || '-'}</Typography>
              </Box>

              <Box sx={{ p: 1, px: 1.25, borderRadius: '4px !important', bgcolor: '#fff', border: '1px solid #e2e8f0', minWidth: 0, overflow: 'hidden' }}>
                <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.68rem', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>SL NHẬN (YD)</Typography>
                <Typography variant="body2" sx={{ fontWeight: 800, color: ACCENT, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{Number(selectedLot.qtyReceive || 0).toFixed(2)} Yd</Typography>
              </Box>

              <Box sx={{ p: 1, px: 1.25, borderRadius: '4px !important', bgcolor: '#fff', border: '1px solid #e2e8f0', minWidth: 0, overflow: 'hidden' }}>
                <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.68rem', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>SL KIỂM (YD)</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: '#334155', fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {Number(selectedLot.qtyInspection || 0).toFixed(2)} Yd
                </Typography>
              </Box>

              <Box sx={{ p: 1, px: 1.25, borderRadius: '4px !important', bgcolor: '#fff', border: '1px solid #e2e8f0', minWidth: 0, overflow: 'hidden' }}>
                <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.68rem', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>KHỔ CHUẨN</Typography>
                <Typography variant="body2" sx={{ fontWeight: 800, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedLot.stdWidth} Inch</Typography>
              </Box>
            </Box>
          </Box>
        )}

      </Paper>

      {/* SECTION 2: STANDARDIZED FORM FOR QC APPROVE & JOB ALLOCATION */}
      <QCStatusFormSection
        selectedLot={selectedLot}
        processedRecords={processedRecords}
        todayStr={todayStr}
        onSaveSuccess={() => {
          fetchHistory();
          fetchLots();
        }}
        setSuccessMsg={setSuccessMsg}
      />

      {/* SECTION 3: LỊCH SỬ DUYỆT & CẬP NHẬT TÌNH TRẠNG VẢI (THEO NGÀY & FILTER) */}
      <Paper elevation={0} sx={{
        p: { xs: 1.25, sm: 2 },
        borderRadius: '4px !important',
        border: '1px solid #e2e8f0',
        backgroundColor: '#fff',
        width: '100%',
        maxWidth: '100%',
        minWidth: 0,
        boxSizing: 'border-box'
      }}>
        
        {/* Section 3 Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, flexWrap: 'wrap', gap: 1, width: '100%', minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Box sx={{ width: 22, height: 22, borderRadius: 0.5, backgroundColor: '#475569', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.75rem' }}>
              3
            </Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#1e293b' }}>
              Lịch Sử Duyệt & Cập Nhật Tình Trạng Vải
            </Typography>
            <Chip
              label={`${filteredHistoryRecords.length} / ${processedRecords.length} bản ghi`}
              size="small"
              sx={{ backgroundColor: '#f1f5f9', color: '#475569', fontWeight: 700, borderRadius: 0.5, height: 22, fontSize: '0.72rem' }}
            />
            <Chip
              label={`Tổng nhận: ${totalFilteredYards.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} Yd`}
              size="small"
              sx={{ backgroundColor: ACCENT_LIGHT, color: ACCENT, fontWeight: 700, borderRadius: 0.5, height: 22, fontSize: '0.72rem', border: `1px solid ${ACCENT_BORDER}` }}
            />
          </Box>

          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', width: { xs: '100%', sm: 'auto' }, justifyContent: { xs: 'flex-start', sm: 'flex-end' } }}>
            <Badge badgeContent={histActiveFilterCount} color="success">
              <Button
                variant={histActiveFilterCount > 0 ? 'contained' : 'outlined'}
                size="small"
                startIcon={<FilterListIcon sx={{ fontSize: '18px !important' }} />}
                onClick={() => setOpenHistDrawer(true)}
                sx={{
                  height: 32,
                  borderRadius: '4px !important',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  textTransform: 'none',
                  px: 1.5,
                  ...(histActiveFilterCount > 0 ? {
                    backgroundColor: ACCENT,
                    color: '#fff',
                    '&:hover': { backgroundColor: ACCENT_HOVER }
                  } : {
                    borderColor: '#cbd5e1',
                    color: '#334155',
                    bgcolor: '#fff',
                    '&:hover': { bgcolor: '#f8fafc', borderColor: '#94a3b8' }
                  })
                }}
              >
                Bộ lọc lịch sử
              </Button>
            </Badge>

            <Button
              variant="contained"
              size="small"
              startIcon={<ExcelIcon sx={{ fontSize: '18px !important' }} />}
              onClick={handleExportExcel}
              sx={{
                backgroundColor: ACCENT,
                color: '#fff',
                fontWeight: 700,
                fontSize: '0.78rem',
                borderRadius: '4px !important',
                height: 32,
                px: 2,
                textTransform: 'none',
                boxShadow: 'none',
                '&:hover': { backgroundColor: ACCENT_HOVER }
              }}
            >
              Xuất Excel Theo Bộ Lọc
            </Button>
          </Box>
        </Box>

        {/* Section 3 Toolbar: Quick Search + Quick Date Buttons */}
        <Box sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 1.25,
          mb: 1.25,
          flexWrap: 'wrap',
          width: '100%',
          minWidth: 0
        }}>
          {/* Quick Search (Debounced 0ms typing response) */}
          <DebouncedSearchInput
            placeholder="Tìm nhanh PO, Item, Màu, Invoice, Job, Ghi chú..."
            value={quickHistSearch}
            onChange={(val) => setQuickHistSearch(val)}
            sx={{
              flex: { xs: '1 1 100%', sm: '1 1 320px' },
              maxWidth: { sm: 420 },
              '& .MuiOutlinedInput-root': {
                height: 34,
                borderRadius: '4px !important',
                bgcolor: '#fff',
                fontSize: '0.8rem',
                '& fieldset': { borderRadius: '4px !important' }
              }
            }}
          />

          {/* Quick Date Shortcuts on Toolbar */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
            <Typography variant="caption" sx={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b' }}>
              NGÀY QC:
            </Typography>
            <Button
              size="small"
              variant={histFromDate === todayStr && histToDate === todayStr ? 'contained' : 'outlined'}
              onClick={() => setDateShortcut('today')}
              sx={{ height: 26, fontSize: '0.7rem', px: 1, minWidth: 'auto', borderRadius: '4px !important', textTransform: 'none', boxShadow: 'none' }}
            >
              Hôm nay
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={() => setDateShortcut('week')}
              sx={{ height: 26, fontSize: '0.7rem', px: 1, minWidth: 'auto', borderRadius: '4px !important', textTransform: 'none' }}
            >
              7 ngày
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={() => setDateShortcut('month')}
              sx={{ height: 26, fontSize: '0.7rem', px: 1, minWidth: 'auto', borderRadius: '4px !important', textTransform: 'none' }}
            >
              Tháng này
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={() => setDateShortcut('all')}
              sx={{ height: 26, fontSize: '0.7rem', px: 1, minWidth: 'auto', borderRadius: '4px !important', textTransform: 'none' }}
            >
              Tất cả
            </Button>

            {hasActiveHistFilter && (
              <Button
                size="small"
                variant="text"
                onClick={handleResetHistFilters}
                startIcon={<RefreshIcon sx={{ fontSize: '15px !important' }} />}
                sx={{ height: 26, color: '#64748b', fontSize: '0.72rem', textTransform: 'none', px: 1 }}
              >
                Xóa lọc
              </Button>
            )}
          </Box>
        </Box>

        {/* Active Filter Chips for Section 3 */}
        {histActiveFilterCount > 0 && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1.25, alignItems: 'center' }}>
            <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, fontSize: '0.7rem' }}>
              Đang lọc:
            </Typography>
            {(histFromDate || histToDate) && (
              <Chip
                size="small"
                label={`Khoảng ngày: ${histFromDate || '...'} → ${histToDate || '...'}`}
                onDelete={() => { setHistFromDate(''); setHistToDate(''); }}
                sx={{ borderRadius: '4px !important', height: 24, fontSize: '0.72rem', bgcolor: '#f1f5f9' }}
              />
            )}
            {histPo && (
              <Chip
                size="small"
                label={`PO: ${histPo}`}
                onDelete={() => setHistPo('')}
                sx={{ borderRadius: '4px !important', height: 24, fontSize: '0.72rem', bgcolor: '#f1f5f9' }}
              />
            )}
            {histItem && (
              <Chip
                size="small"
                label={`ITEM: ${histItem}`}
                onDelete={() => setHistItem('')}
                sx={{ borderRadius: '4px !important', height: 24, fontSize: '0.72rem', bgcolor: '#f1f5f9' }}
              />
            )}
            {histSupplier && (
              <Chip
                size="small"
                label={`NCC: ${histSupplier}`}
                onDelete={() => setHistSupplier('')}
                sx={{ borderRadius: '4px !important', height: 24, fontSize: '0.72rem', bgcolor: '#f1f5f9' }}
              />
            )}
            {histKeyword && (
              <Chip
                size="small"
                label={`Từ khóa: ${histKeyword}`}
                onDelete={() => setHistKeyword('')}
                sx={{ borderRadius: '4px !important', height: 24, fontSize: '0.72rem', bgcolor: '#f1f5f9' }}
              />
            )}
          </Box>
        )}

        {/* Bảng Dữ Liệu Lịch Sử Đã Xử Lý */}
        <TableContainer sx={{
          width: '100%',
          maxWidth: '100%',
          overflowX: 'auto',
          border: '1px solid #e2e8f0',
          borderRadius: '4px !important',
          maxHeight: 340
        }}>
          <Table size="small" stickyHeader sx={{ minWidth: 950, width: '100%' }}>
            <TableHead>
              <TableRow sx={{ '& th': { backgroundColor: '#f8fafc', fontWeight: 800, fontSize: '0.72rem', color: '#475569', py: 0.75 } }}>
                {renderExcelHeader('hist', 'dateApprove', 'Date QC')}
                {renderExcelHeader('hist', 'po', 'PO (ERP)')}
                {renderExcelHeader('hist', 'item', 'Mã Vải (Item)')}
                {renderExcelHeader('hist', 'color', 'Màu Sắc')}
                {renderExcelHeader('hist', 'invoice', 'Số Invoice')}
                {renderExcelHeader('hist', 'supplier', 'Nhà Cung Cấp')}
                {renderExcelHeader('hist', 'qtyReceive', 'SL Nhận', 'right')}
                {renderExcelHeader('hist', 'stdWidth', 'Khổ Chuẩn', 'center')}
                {renderExcelHeader('hist', 'actualWidth', 'Khổ Thực', 'center')}
                {renderExcelHeader('hist', 'jobs', 'Job & Số Yard (Phân bổ)')}
                {renderExcelHeader('hist', 'remark', 'Ghi Chú (Remark)')}
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedHistory.map((rec) => (
                <HistRow key={rec.id} rec={rec} />
              ))}
              {filteredHistoryRecords.length === 0 && (
                <TableRow>
                  <TableCell colSpan={11} align="center" sx={{ py: 4, color: '#94a3b8', fontStyle: 'italic' }}>
                    Không tìm thấy bản ghi nào khớp với khoảng ngày hoặc từ khóa đã chọn. Vui lòng bấm &ldquo;Đặt lại&rdquo; để hiển thị toàn bộ.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          rowsPerPageOptions={[15, 25, 50, 100]}
          component="div"
          count={filteredHistoryRecords.length}
          rowsPerPage={histRowsPerPage}
          page={histPage}
          onPageChange={(_, newPage) => setHistPage(newPage)}
          onRowsPerPageChange={(e) => {
            setHistRowsPerPage(parseInt(e.target.value, 10));
            setHistPage(0);
          }}
          labelRowsPerPage="Số dòng / trang:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} trên ${count}`}
          sx={{ borderTop: '1px solid #f1f5f9', '& .MuiTablePagination-toolbar': { minHeight: 40, px: 1 } }}
        />

      </Paper>

      {/* DRAWER: BỘ LỌC LÔ VẢI TIẾP NHẬN (SECTION 1) */}
      <Drawer
        anchor="right"
        open={openLotDrawer}
        onClose={() => setOpenLotDrawer(false)}
        sx={{ zIndex: 1300 }}
        PaperProps={{
          sx: {
            width: { xs: '100%', sm: 380 },
            borderRadius: '4px 0 0 4px !important',
            boxShadow: '-4px 0 24px rgba(0,0,0,0.12)'
          }
        }}
      >
        {/* Drawer Header */}
        <Box sx={{
          p: 2,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #e2e8f0',
          bgcolor: '#f8fafc'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{
              width: 30,
              height: 30,
              borderRadius: '4px !important',
              bgcolor: ACCENT_LIGHT,
              color: ACCENT,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <TuneIcon fontSize="small" />
            </Box>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#1e293b', lineHeight: 1.2 }}>
                Bộ Lọc Lô Vải Tiếp Nhận
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.72rem' }}>
                Tìm kiếm theo nhiều tiêu chí từ cơ sở dữ liệu
              </Typography>
            </Box>
          </Box>
          <IconButton size="small" onClick={() => setOpenLotDrawer(false)} sx={{ color: '#64748b' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        {/* Drawer Content */}
        <Box sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2.5, flex: 1, overflowY: 'auto' }}>
          {/* PO / Invoice */}
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 700, color: '#475569', mb: 0.75, display: 'block' }}>
              Số PO hoặc Invoice
            </Typography>
            <TextField
              fullWidth
              size="small"
              placeholder="VD: POAD000059398, FTC-25C..."
              value={filterPo}
              onChange={(e) => setFilterPo(e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  height: 38,
                  borderRadius: '4px !important',
                  fontSize: '0.82rem',
                  '& fieldset': { borderRadius: '4px !important' }
                }
              }}
            />
          </Box>

          {/* Mã Vải (Item) */}
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 700, color: '#475569', mb: 0.75, display: 'block' }}>
              Mã Vải (Item)
            </Typography>
            <TextField
              fullWidth
              size="small"
              placeholder="VD: 62696410-70, WK-303..."
              value={filterItem}
              onChange={(e) => setFilterItem(e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  height: 38,
                  borderRadius: '4px !important',
                  fontSize: '0.82rem',
                  '& fieldset': { borderRadius: '4px !important' }
                }
              }}
            />
          </Box>

          {/* Màu Sắc (Color) */}
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 700, color: '#475569', mb: 0.75, display: 'block' }}>
              Tên / Mã Màu Sắc
            </Typography>
            <TextField
              fullWidth
              size="small"
              placeholder="VD: 095A, BLACK, WHITE..."
              value={filterColor}
              onChange={(e) => setFilterColor(e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  height: 38,
                  borderRadius: '4px !important',
                  fontSize: '0.82rem',
                  '& fieldset': { borderRadius: '4px !important' }
                }
              }}
            />
          </Box>

          {/* Nhà Cung Cấp */}
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 700, color: '#475569', mb: 0.75, display: 'block' }}>
              Nhà Cung Cấp
            </Typography>
            <FormControl fullWidth size="small">
              <Select
                value={filterSupplier}
                onChange={(e) => setFilterSupplier(e.target.value)}
                displayEmpty
                sx={{
                  height: 38,
                  borderRadius: '4px !important',
                  fontSize: '0.82rem',
                  '& .MuiOutlinedInput-notchedOutline': { borderRadius: '4px !important' }
                }}
              >
                <MenuItem value="" sx={{ fontSize: '0.82rem' }}>Tất cả Nhà Cung Cấp</MenuItem>
                {uniqueSuppliers.map((sup) => (
                  <MenuItem key={sup} value={sup} sx={{ fontSize: '0.82rem' }}>{sup}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Box>

        {/* Drawer Footer */}
        <Box sx={{
          p: 2,
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          gap: 1.5,
          bgcolor: '#f8fafc'
        }}>
          <Button
            variant="outlined"
            fullWidth
            onClick={() => {
              setFilterPo('');
              setFilterItem('');
              setFilterColor('');
              setFilterSupplier('');
              fetchLots({ po: '', item: '', color: '', supplier: '' });
            }}
            sx={{
              height: 38,
              borderRadius: '4px !important',
              color: '#64748b',
              borderColor: '#cbd5e1',
              textTransform: 'none',
              fontWeight: 700,
              fontSize: '0.8rem',
              '&:hover': { bgcolor: '#f1f5f9', borderColor: '#94a3b8' }
            }}
          >
            Đặt lại
          </Button>
          <Button
            variant="contained"
            fullWidth
            onClick={() => {
              setOpenLotDrawer(false);
              fetchLots();
            }}
            sx={{
              height: 38,
              borderRadius: '4px !important',
              bgcolor: ACCENT,
              color: '#fff',
              textTransform: 'none',
              fontWeight: 700,
              fontSize: '0.8rem',
              boxShadow: 'none',
              '&:hover': { bgcolor: ACCENT_HOVER }
            }}
          >
            Áp dụng ({lotActiveFilterCount})
          </Button>
        </Box>
      </Drawer>

      {/* DRAWER: BỘ LỌC LỊCH SỬ KIỂM VẢI (SECTION 3) */}
      <Drawer
        anchor="right"
        open={openHistDrawer}
        onClose={() => setOpenHistDrawer(false)}
        sx={{ zIndex: 1300 }}
        PaperProps={{
          sx: {
            width: { xs: '100%', sm: 400 },
            borderRadius: '4px 0 0 4px !important',
            boxShadow: '-4px 0 24px rgba(0,0,0,0.12)'
          }
        }}
      >
        {/* Drawer Header */}
        <Box sx={{
          p: 2,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #e2e8f0',
          bgcolor: '#f8fafc'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{
              width: 30,
              height: 30,
              borderRadius: '4px !important',
              bgcolor: ACCENT_LIGHT,
              color: ACCENT,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FilterListIcon fontSize="small" />
            </Box>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#1e293b', lineHeight: 1.2 }}>
                Bộ Lọc Lịch Sử Kiểm Vải
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.72rem' }}>
                Lọc theo ngày duyệt và giá trị từng cột
              </Typography>
            </Box>
          </Box>
          <IconButton size="small" onClick={() => setOpenHistDrawer(false)} sx={{ color: '#64748b' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        {/* Drawer Content */}
        <Box sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2.5, flex: 1, overflowY: 'auto' }}>
          {/* Khoảng Ngày Duyệt */}
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 700, color: '#475569', mb: 1, display: 'block' }}>
              Khoảng Ngày QC Approve
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.75, mb: 1.25, flexWrap: 'wrap' }}>
              <Button
                size="small"
                variant={histFromDate === todayStr && histToDate === todayStr ? 'contained' : 'outlined'}
                onClick={() => setDateShortcut('today')}
                sx={{ height: 26, fontSize: '0.7rem', px: 1, minWidth: 'auto', borderRadius: '4px !important', textTransform: 'none', boxShadow: 'none' }}
              >
                Hôm nay
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={() => setDateShortcut('week')}
                sx={{ height: 26, fontSize: '0.7rem', px: 1, minWidth: 'auto', borderRadius: '4px !important', textTransform: 'none' }}
              >
                7 ngày
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={() => setDateShortcut('month')}
                sx={{ height: 26, fontSize: '0.7rem', px: 1, minWidth: 'auto', borderRadius: '4px !important', textTransform: 'none' }}
              >
                Tháng này
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={() => setDateShortcut('all')}
                sx={{ height: 26, fontSize: '0.7rem', px: 1, minWidth: 'auto', borderRadius: '4px !important', textTransform: 'none' }}
              >
                Tất cả
              </Button>
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
              <TextField
                size="small"
                type="date"
                label="Từ ngày"
                value={histFromDate}
                onChange={(e) => setHistFromDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    height: 38,
                    borderRadius: '4px !important',
                    fontSize: '0.8rem',
                    '& fieldset': { borderRadius: '4px !important' }
                  }
                }}
              />
              <TextField
                size="small"
                type="date"
                label="Đến ngày"
                value={histToDate}
                onChange={(e) => setHistToDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    height: 38,
                    borderRadius: '4px !important',
                    fontSize: '0.8rem',
                    '& fieldset': { borderRadius: '4px !important' }
                  }
                }}
              />
            </Box>
          </Box>

          <Divider sx={{ my: 0.5 }} />

          {/* PO (ERP) */}
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 700, color: '#475569', mb: 0.75, display: 'block' }}>
              Số PO (ERP)
            </Typography>
            <TextField
              fullWidth
              size="small"
              placeholder="VD: POAD..., POPU..."
              value={histPo}
              onChange={(e) => setHistPo(e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  height: 38,
                  borderRadius: '4px !important',
                  fontSize: '0.82rem',
                  '& fieldset': { borderRadius: '4px !important' }
                }
              }}
            />
          </Box>

          {/* Mã Vải (Item) */}
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 700, color: '#475569', mb: 0.75, display: 'block' }}>
              Mã Vải (Item)
            </Typography>
            <TextField
              fullWidth
              size="small"
              placeholder="VD: 62696410-70, WK-303..."
              value={histItem}
              onChange={(e) => setHistItem(e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  height: 38,
                  borderRadius: '4px !important',
                  fontSize: '0.82rem',
                  '& fieldset': { borderRadius: '4px !important' }
                }
              }}
            />
          </Box>

          {/* Nhà Cung Cấp */}
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 700, color: '#475569', mb: 0.75, display: 'block' }}>
              Nhà Cung Cấp
            </Typography>
            <FormControl fullWidth size="small">
              <Select
                value={histSupplier}
                onChange={(e) => setHistSupplier(e.target.value)}
                displayEmpty
                sx={{
                  height: 38,
                  borderRadius: '4px !important',
                  fontSize: '0.82rem',
                  '& .MuiOutlinedInput-notchedOutline': { borderRadius: '4px !important' }
                }}
              >
                <MenuItem value="" sx={{ fontSize: '0.82rem' }}>Tất cả Nhà Cung Cấp</MenuItem>
                {uniqueSuppliers.map((sup) => (
                  <MenuItem key={sup} value={sup} sx={{ fontSize: '0.82rem' }}>{sup}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {/* Từ Khóa Khác (Màu, Invoice, Job, Remark) */}
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 700, color: '#475569', mb: 0.75, display: 'block' }}>
              Từ Khóa Khác (Màu, Invoice, Job, Remark)
            </Typography>
            <TextField
              fullWidth
              size="small"
              placeholder="VD: AA2601, BLACK, TSI/CSAI..."
              value={histKeyword}
              onChange={(e) => setHistKeyword(e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  height: 38,
                  borderRadius: '4px !important',
                  fontSize: '0.82rem',
                  '& fieldset': { borderRadius: '4px !important' }
                }
              }}
            />
          </Box>
        </Box>

        {/* Drawer Footer */}
        <Box sx={{
          p: 2,
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          gap: 1.5,
          bgcolor: '#f8fafc'
        }}>
          <Button
            variant="outlined"
            fullWidth
            onClick={handleResetHistFilters}
            sx={{
              height: 38,
              borderRadius: '4px !important',
              color: '#64748b',
              borderColor: '#cbd5e1',
              textTransform: 'none',
              fontWeight: 700,
              fontSize: '0.8rem',
              '&:hover': { bgcolor: '#f1f5f9', borderColor: '#94a3b8' }
            }}
          >
            Đặt lại
          </Button>
          <Button
            variant="contained"
            fullWidth
            onClick={() => setOpenHistDrawer(false)}
            sx={{
              height: 38,
              borderRadius: '4px !important',
              bgcolor: ACCENT,
              color: '#fff',
              textTransform: 'none',
              fontWeight: 700,
              fontSize: '0.8rem',
              boxShadow: 'none',
              '&:hover': { bgcolor: ACCENT_HOVER }
            }}
          >
            Áp dụng ({histActiveFilterCount})
          </Button>
        </Box>
      </Drawer>

      {/* EXCEL COLUMN FILTER POPOVER */}
      <Popover
        open={Boolean(activeColFilter)}
        anchorEl={activeColFilter?.anchorEl}
        onClose={handleCloseColFilter}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        sx={{ zIndex: 1400 }}
        PaperProps={{
          sx: {
            width: 260,
            p: 1.5,
            borderRadius: '4px !important',
            boxShadow: '0 8px 28px rgba(0,0,0,0.18)',
            border: '1px solid #cbd5e1'
          }
        }}
      >
        {activeColFilter && (() => {
          const { col, label, distinctValues, table } = activeColFilter;
          const sortState = table === 'lot' ? lotSort : histSort;
          const currentSort = sortState?.col === col ? sortState.order : null;
          const visibleVals = distinctValues.filter(v =>
            v.toLowerCase().includes(searchInColFilter.toLowerCase())
          );
          const isAllChecked = visibleVals.length > 0 && visibleVals.every(v => tempSelectedValues.includes(v));
          const isSomeChecked = visibleVals.some(v => tempSelectedValues.includes(v)) && !isAllChecked;

          return (
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              {/* Header: Column Name */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, pb: 0.75, borderBottom: '1px solid #f1f5f9' }}>
                <Typography sx={{ fontSize: '0.78rem', fontWeight: 800, color: '#1e293b' }}>
                  Lọc: {label}
                </Typography>
                <IconButton size="small" onClick={handleCloseColFilter} sx={{ p: 0.25, color: '#94a3b8' }}>
                  <CloseIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Box>

              {/* Sort Buttons */}
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.75, mb: 1 }}>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<ArrowUpwardIcon sx={{ fontSize: '13px !important' }} />}
                  onClick={() => handleSortCol('asc')}
                  sx={{
                    height: 26,
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    borderRadius: '4px !important',
                    textTransform: 'none',
                    borderColor: currentSort === 'asc' ? ACCENT : '#cbd5e1',
                    color: currentSort === 'asc' ? ACCENT : '#475569',
                    bgcolor: currentSort === 'asc' ? ACCENT_LIGHT : 'transparent',
                    '&:hover': { bgcolor: '#f1f5f9' }
                  }}
                >
                  Tăng (A-Z)
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<ArrowDownwardIcon sx={{ fontSize: '13px !important' }} />}
                  onClick={() => handleSortCol('desc')}
                  sx={{
                    height: 26,
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    borderRadius: '4px !important',
                    textTransform: 'none',
                    borderColor: currentSort === 'desc' ? ACCENT : '#cbd5e1',
                    color: currentSort === 'desc' ? ACCENT : '#475569',
                    bgcolor: currentSort === 'desc' ? ACCENT_LIGHT : 'transparent',
                    '&:hover': { bgcolor: '#f1f5f9' }
                  }}
                >
                  Giảm (Z-A)
                </Button>
              </Box>

              {/* Search input in filter */}
              <TextField
                size="small"
                placeholder="Tìm giá trị..."
                value={searchInColFilter}
                onChange={(e) => setSearchInColFilter(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ fontSize: 15, color: '#94a3b8' }} />
                    </InputAdornment>
                  ),
                  endAdornment: searchInColFilter ? (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setSearchInColFilter('')} sx={{ p: 0.25 }}>
                        <CloseIcon sx={{ fontSize: 12 }} />
                      </IconButton>
                    </InputAdornment>
                  ) : null
                }}
                sx={{
                  mb: 1,
                  '& .MuiOutlinedInput-root': {
                    height: 28,
                    fontSize: '0.75rem',
                    borderRadius: '4px !important',
                    bgcolor: '#fff',
                    '& fieldset': { borderRadius: '4px !important' }
                  }
                }}
              />

              {/* Select All Checkbox */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5, px: 0.5 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"
                      checked={isAllChecked}
                      indeterminate={isSomeChecked}
                      onChange={handleToggleSelectAllColFilter}
                      sx={{ p: 0.25, '&.Mui-checked': { color: ACCENT }, '&.MuiCheckbox-indeterminate': { color: ACCENT } }}
                    />
                  }
                  label={<Typography sx={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155' }}>(Chọn tất cả)</Typography>}
                  sx={{ m: 0 }}
                />
                <Typography sx={{ fontSize: '0.68rem', color: '#64748b' }}>
                  {tempSelectedValues.length}/{distinctValues.length}
                </Typography>
              </Box>

              {/* Scrollable List of Checkboxes */}
              <Box sx={{
                maxHeight: 180,
                overflowY: 'auto',
                border: '1px solid #e2e8f0',
                borderRadius: '4px',
                p: 0.5,
                bgcolor: '#fafafa',
                display: 'flex',
                flexDirection: 'column',
                gap: 0.25
              }}>
                {visibleVals.map((val) => {
                  const isChecked = tempSelectedValues.includes(val);
                  return (
                    <Box
                      key={val}
                      onClick={() => handleToggleColFilterValue(val)}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        py: 0.25,
                        px: 0.5,
                        borderRadius: '3px',
                        cursor: 'pointer',
                        bgcolor: isChecked ? '#f0fdf4' : 'transparent',
                        '&:hover': { bgcolor: '#f1f5f9' }
                      }}
                    >
                      <Checkbox
                        size="small"
                        checked={isChecked}
                        onChange={() => {}}
                        sx={{ p: 0.25, mr: 0.5, '&.Mui-checked': { color: ACCENT } }}
                      />
                      <Typography sx={{ fontSize: '0.75rem', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {val || '(Trống)'}
                      </Typography>
                    </Box>
                  );
                })}
                {visibleVals.length === 0 && (
                  <Typography sx={{ fontSize: '0.72rem', color: '#94a3b8', textAlign: 'center', py: 2 }}>
                    Không có giá trị nào khớp
                  </Typography>
                )}
              </Box>

              {/* Footer: Clear & Apply */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, mt: 1.25, pt: 1, borderTop: '1px solid #f1f5f9' }}>
                <Button
                  size="small"
                  variant="text"
                  onClick={handleClearColFilter}
                  sx={{ fontSize: '0.72rem', textTransform: 'none', color: '#64748b', p: 0.5 }}
                >
                  Xóa lọc cột
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  onClick={handleApplyColFilter}
                  sx={{
                    fontSize: '0.72rem',
                    textTransform: 'none',
                    bgcolor: ACCENT,
                    color: '#fff',
                    boxShadow: 'none',
                    borderRadius: '4px !important',
                    height: 28,
                    px: 1.75,
                    fontWeight: 700,
                    '&:hover': { bgcolor: ACCENT_HOVER }
                  }}
                >
                  Áp dụng
                </Button>
              </Box>
            </Box>
          );
        })()}
      </Popover>

    </Box>
  );
}
