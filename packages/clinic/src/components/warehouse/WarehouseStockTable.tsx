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
  Tooltip
} from '@mui/material';
import { Delete as DeleteIcon } from '@mui/icons-material';
import TextureIcon from '@mui/icons-material/Texture';

import { WarehouseStock } from '../../types/warehouse';

interface WarehouseStockTableProps {
  items: WarehouseStock[];
  onDelete: (no: number) => void;
}

export default function WarehouseStockTable({ items, onDelete }: WarehouseStockTableProps) {
  const { t } = useTranslation();

  if (items.length === 0) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, py: 8 }}>
        <TextureIcon sx={{ fontSize: 48, color: '#e2e8f0' }} />
        <Typography color="text.secondary" fontWeight={600} fontSize={14}>
          {t('clinic.warehouse.noWarehouseStock', 'Không có thuốc nào trong kho chính.')}
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
            <TableCell sx={{ bgcolor: '#F9FAFA', borderBottom: '1px solid #e1e3e4', py: 2, px: 2, fontWeight: 700, fontSize: 11, color: '#707975', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('clinic.warehouse.col.lotNo', 'Lô số')}</TableCell>
            <TableCell sx={{ bgcolor: '#F9FAFA', borderBottom: '1px solid #e1e3e4', py: 2, px: 2, fontWeight: 700, fontSize: 11, color: '#707975', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('clinic.warehouse.col.medName', 'Tên thuốc')}</TableCell>
            <TableCell sx={{ bgcolor: '#F9FAFA', borderBottom: '1px solid #e1e3e4', py: 2, px: 2, fontWeight: 700, fontSize: 11, color: '#707975', textTransform: 'uppercase', letterSpacing: '0.05em' }} align="center">{t('clinic.warehouse.col.importQty', 'SL Nhập')}</TableCell>
            <TableCell sx={{ bgcolor: '#F9FAFA', borderBottom: '1px solid #e1e3e4', py: 2, px: 2, fontWeight: 700, fontSize: 11, color: '#707975', textTransform: 'uppercase', letterSpacing: '0.05em' }} align="center">{t('clinic.warehouse.col.qtyIssue', 'Tồn Kho')}</TableCell>
            <TableCell sx={{ bgcolor: '#F9FAFA', borderBottom: '1px solid #e1e3e4', py: 2, px: 2, fontWeight: 700, fontSize: 11, color: '#707975', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('clinic.warehouse.col.supplier', 'Nhà cung cấp')}</TableCell>
            <TableCell sx={{ bgcolor: '#F9FAFA', borderBottom: '1px solid #e1e3e4', py: 2, px: 2, fontWeight: 700, fontSize: 11, color: '#707975', textTransform: 'uppercase', letterSpacing: '0.05em' }} align="center">{t('clinic.warehouse.col.expDate', 'HSD')}</TableCell>
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
                <TableCell align="center" sx={{ py: 1.5, fontSize: 13, color: '#3f4945' }}>{item.qty}</TableCell>
                <TableCell align="center" sx={{ py: 1.5 }}>
                  <Box sx={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', px: 1.25, py: 0.5, borderRadius: '6px', bgcolor: item.qtyIssue > 0 ? 'rgba(46,125,50,0.1)' : 'rgba(239,68,68,0.1)', color: item.qtyIssue > 0 ? '#2e7d32' : '#ef4444', fontFamily: 'monospace', fontSize: 13, fontWeight: 700, minWidth: 36 }}>
                    {item.qtyIssue}
                  </Box>
                </TableCell>
                <TableCell sx={{ py: 1.5, fontSize: 13, color: '#3f4945' }}>{item.idSup}</TableCell>
                <TableCell align="center" sx={{ py: 1.5, fontSize: 13, color: '#3f4945' }}>{item.expDate}</TableCell>
                <TableCell align="center" sx={{ py: 1.5 }}>
                  <Tooltip title={t('clinic.warehouse.deleteLot', 'Xóa lô hàng')}>
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
