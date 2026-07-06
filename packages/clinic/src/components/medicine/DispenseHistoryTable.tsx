import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper, 
  Typography,
  Box,
  Chip
} from '@mui/material';
import TextureIcon from '@mui/icons-material/Texture';

export interface HistoryRecord {
  code: string;
  employeeId: string;
  fullName: string;
  date: string;
  sickness: string;
  medDetails: string; // Tên thuốc và số lượng
  type: 'Med' | 'Cabin';
}

interface DispenseHistoryTableProps {
  records: HistoryRecord[];
}

export default function DispenseHistoryTable({ records }: DispenseHistoryTableProps) {
  const { t } = useTranslation();

  if (records.length === 0) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, py: 8 }}>
        <TextureIcon sx={{ fontSize: 48, color: '#e2e8f0' }} />
        <Typography color="text.secondary" fontWeight={600} fontSize={14}>
          {t('clinic.dispense.noHistory', 'Không có lịch sử cấp phát thuốc gần đây.')}
        </Typography>
      </Box>
    );
  }

  return (
    <TableContainer sx={{
      flexGrow: 1,
      minHeight: 0,
      overflowX: 'auto',
      overflowY: 'auto',
      '&::-webkit-scrollbar': { width: '10px', height: '10px' },
      '&::-webkit-scrollbar-track': { bgcolor: '#f1f1f1', borderRadius: '10px' },
      '&::-webkit-scrollbar-thumb': {
        bgcolor: '#bfc9c4',
        borderRadius: '10px',
        border: '2px solid #f1f1f1',
        '&:hover': { bgcolor: '#8fa095' }
      }
    }}>
      <Table stickyHeader size="small" sx={{ minWidth: 'max-content', width: '100%', tableLayout: 'auto' }}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ bgcolor: '#F9FAFA', borderBottom: '1px solid #e1e3e4', py: 2, px: 2, fontWeight: 700, fontSize: 11, color: '#707975', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('clinic.dispense.col.code', 'Mã phiếu')}</TableCell>
            <TableCell sx={{ bgcolor: '#F9FAFA', borderBottom: '1px solid #e1e3e4', py: 2, px: 2, fontWeight: 700, fontSize: 11, color: '#707975', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('clinic.dispense.col.employee', 'Nhân viên')}</TableCell>
            <TableCell sx={{ bgcolor: '#F9FAFA', borderBottom: '1px solid #e1e3e4', py: 2, px: 2, fontWeight: 700, fontSize: 11, color: '#707975', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('clinic.dispense.col.date', 'Thời gian')}</TableCell>
            <TableCell sx={{ bgcolor: '#F9FAFA', borderBottom: '1px solid #e1e3e4', py: 2, px: 2, fontWeight: 700, fontSize: 11, color: '#707975', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('clinic.dispense.col.sickness', 'Triệu chứng')}</TableCell>
            <TableCell sx={{ bgcolor: '#F9FAFA', borderBottom: '1px solid #e1e3e4', py: 2, px: 2, fontWeight: 700, fontSize: 11, color: '#707975', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('clinic.dispense.col.meds', 'Thuốc cấp phát')}</TableCell>
            <TableCell sx={{ bgcolor: '#F9FAFA', borderBottom: '1px solid #e1e3e4', py: 2, px: 2, fontWeight: 700, fontSize: 11, color: '#707975', textTransform: 'uppercase', letterSpacing: '0.05em' }} align="center">{t('clinic.dispense.col.type', 'Loại')}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody sx={{ '& tr:nth-of-type(even)': { bgcolor: '#fff' }, '& tr:nth-of-type(odd)': { bgcolor: '#fff' } }}>
          {records.map((record) => (
            <TableRow key={record.code} hover sx={{ '&:last-child td': { borderBottom: 0 }, bgcolor: '#fff', '&:hover': { bgcolor: '#F9FAFA !important' }, '&:hover td': { bgcolor: '#F9FAFA !important' } }}>
              <TableCell sx={{ py: 1.5, fontSize: 13, fontFamily: 'monospace', color: '#1a73e8', fontWeight: 500 }}>{record.code}</TableCell>
              <TableCell sx={{ py: 1.5, fontSize: 13, color: '#191c1d' }}>
                <Typography fontSize={13} color="#191c1d" fontWeight={700}>{record.fullName}</Typography>
                <Typography fontSize={11} color="text.secondary">{record.employeeId}</Typography>
              </TableCell>
              <TableCell sx={{ py: 1.5, fontSize: 13, color: '#3f4945' }}>{record.date}</TableCell>
              <TableCell sx={{ py: 1.5, fontSize: 13, color: '#3f4945' }}>{record.sickness}</TableCell>
              <TableCell sx={{ py: 1.5, fontSize: 13, color: '#3f4945', maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{record.medDetails}</TableCell>
              <TableCell align="center" sx={{ py: 1.5 }}>
                <Chip 
                  label={record.type === 'Cabin' ? t('clinic.dispense.type.cabin', 'Tủ thuốc') : t('clinic.dispense.type.med', 'Phát NV')} 
                  sx={{ height: 22, fontSize: 10, fontWeight: 700, bgcolor: record.type === 'Cabin' ? 'rgba(2,132,199,0.1)' : 'rgba(46,125,50,0.1)', color: record.type === 'Cabin' ? '#0284c7' : '#2e7d32' }}
                  size="small"
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
