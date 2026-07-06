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
  IconButton, 
  Typography,
  Box,
  Tooltip,
  Chip
} from '@mui/material';
import { Delete as DeleteIcon } from '@mui/icons-material';
import TextureIcon from '@mui/icons-material/Texture';

import { FactoryStock } from '../../types/warehouse';

interface FactoryStockTableProps {
  items: FactoryStock[];
  onDelete: (no: number) => void;
}

export default function FactoryStockTable({ items, onDelete }: FactoryStockTableProps) {
  const { t } = useTranslation();

  if (items.length === 0) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, py: 8 }}>
        <TextureIcon sx={{ fontSize: 48, color: '#e2e8f0' }} />
        <Typography color="text.secondary" fontWeight={600} fontSize={14}>
          {t('clinic.warehouse.noFactoryStock', 'Không có thuốc nào ở các phân xưởng.')}
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
      <Table size="small" stickyHeader sx={{ minWidth: 'max-content', width: '100%', tableLayout: 'auto' }}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ bgcolor: '#F9FAFA', borderBottom: '1px solid #e1e3e4', py: 2, px: 2, fontWeight: 700, fontSize: 11, color: '#707975', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('clinic.warehouse.col.txNo', 'Mã chuyển')}</TableCell>
            <TableCell sx={{ bgcolor: '#F9FAFA', borderBottom: '1px solid #e1e3e4', py: 2, px: 2, fontWeight: 700, fontSize: 11, color: '#707975', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('clinic.warehouse.col.medName', 'Tên thuốc')}</TableCell>
            <TableCell sx={{ bgcolor: '#F9FAFA', borderBottom: '1px solid #e1e3e4', py: 2, px: 2, fontWeight: 700, fontSize: 11, color: '#707975', textTransform: 'uppercase', letterSpacing: '0.05em' }} align="center">{t('clinic.warehouse.col.factory', 'Nhà máy')}</TableCell>
            <TableCell sx={{ bgcolor: '#F9FAFA', borderBottom: '1px solid #e1e3e4', py: 2, px: 2, fontWeight: 700, fontSize: 11, color: '#707975', textTransform: 'uppercase', letterSpacing: '0.05em' }} align="center">{t('clinic.warehouse.col.qtyTrans', 'SL Nhận')}</TableCell>
            <TableCell sx={{ bgcolor: '#F9FAFA', borderBottom: '1px solid #e1e3e4', py: 2, px: 2, fontWeight: 700, fontSize: 11, color: '#707975', textTransform: 'uppercase', letterSpacing: '0.05em' }} align="center">{t('clinic.warehouse.col.qtyIssue', 'Còn lại')}</TableCell>
            <TableCell sx={{ bgcolor: '#F9FAFA', borderBottom: '1px solid #e1e3e4', py: 2, px: 2, fontWeight: 700, fontSize: 11, color: '#707975', textTransform: 'uppercase', letterSpacing: '0.05em' }} align="center">{t('clinic.warehouse.col.sourceLot', 'Lô nguồn')}</TableCell>
            <TableCell sx={{ bgcolor: '#F9FAFA', borderBottom: '1px solid #e1e3e4', py: 2, px: 2, fontWeight: 700, fontSize: 11, color: '#707975', textTransform: 'uppercase', letterSpacing: '0.05em' }} align="center">{t('common.actions', 'Thao tác')}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody sx={{ '& tr:nth-of-type(even)': { bgcolor: '#fff' }, '& tr:nth-of-type(odd)': { bgcolor: '#fff' } }}>
          {items.map((item) => {
            const rowBgColor = item.qtyIssue === 0 ? '#fef2f2' : '#fff';
            return (
              <TableRow key={item.no} hover sx={{ '&:last-child td': { borderBottom: 0 }, bgcolor: rowBgColor, '&:hover': { bgcolor: '#F9FAFA !important' }, '&:hover td': { bgcolor: '#F9FAFA !important' } }}>
                <TableCell sx={{ py: 1.5, fontSize: 13, fontFamily: 'monospace', color: '#1a73e8', fontWeight: 500 }}>#{item.no}</TableCell>
                <TableCell sx={{ py: 1.5, fontSize: 13, color: '#191c1d' }}>
                  <Typography fontSize={13} color="#191c1d" fontWeight={700}>{item.nameMed}</Typography>
                  <Typography fontSize={11} color="text.secondary">{item.idMed}</Typography>
                </TableCell>
                <TableCell align="center" sx={{ py: 1.5 }}>
                  <Chip label={item.factory} size="small" sx={{ height: 22, fontSize: 10, fontWeight: 700, bgcolor: 'rgba(156,39,176,0.1)', color: '#9c27b0' }} />
                </TableCell>
                <TableCell align="center" sx={{ py: 1.5, fontSize: 13, color: '#3f4945' }}>{item.qty}</TableCell>
                <TableCell align="center" sx={{ py: 1.5 }}>
                  <Box sx={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', px: 1.25, py: 0.5, borderRadius: '6px', bgcolor: item.qtyIssue > 0 ? 'rgba(156,39,176,0.1)' : 'rgba(239,68,68,0.1)', color: item.qtyIssue > 0 ? '#9c27b0' : '#ef4444', fontFamily: 'monospace', fontSize: 13, fontWeight: 700, minWidth: 36 }}>
                    {item.qtyIssue}
                  </Box>
                </TableCell>
                <TableCell align="center" sx={{ py: 1.5, fontSize: 13, color: '#3f4945' }}>#{item.recNo}</TableCell>
                <TableCell align="center" sx={{ py: 1.5 }}>
                  <Tooltip title={t('clinic.warehouse.deleteTrans', 'Hủy lô chuyển')}>
                    <IconButton 
                      onClick={() => onDelete(item.no)}
                      size="small"
                      sx={{ color: '#707975', '&:hover': { color: '#ba1a1a', bgcolor: '#ffdad6' } }}
                    >
                      <DeleteIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
