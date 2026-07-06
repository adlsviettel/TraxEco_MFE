import React, { useState, useMemo } from 'react';
import { Card, CardContent, Typography, Divider, Box, Button, Table, TableBody, TableCell, TableHead, TableRow, IconButton, Select, MenuItem, TextField } from '@mui/material';
import { Delete as DeleteIcon, Add as AddIcon, PhotoCamera } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

export interface DefectItem {
  DefectCode: string;
  DefectName: string;
  DefectPoint: number;
  QtyDefect: number;
}

interface DefectTableProps {
  defects: DefectItem[];
  defectMasters: any[];
  onAdd: (code: string, point: number) => void;
  onDelete: (code: string, point: number) => void;
  onDeleteAll: () => void;
  yard: number;
  width: number;
  customer: string;
}

export default function DefectTable({ defects, defectMasters, onAdd, onDelete, onDeleteAll, yard, width, customer }: DefectTableProps) {
  const { t } = useTranslation();
  const [selectedCode, setSelectedCode] = useState('');
  const [selectedPoint, setSelectedPoint] = useState<number>(1);

  const totalPoints = useMemo(() => {
    return defects.reduce((sum, d) => sum + (d.QtyDefect * d.DefectPoint), 0);
  }, [defects]);

  const avgPoint = useMemo(() => {
    if (yard <= 0) return 0;
    if (customer === "Adidas") {
      return (totalPoints * 100) / yard;
    }
    if (width <= 0) return 0;
    return (totalPoints * 3600) / yard / width;
  }, [totalPoints, yard, width, customer]);

  const isPass = avgPoint <= 15;

  return (
    <Card elevation={0} sx={{ 
      height: '100%', 
      borderRadius: 4, 
      display: 'flex', 
      flexDirection: 'column', 
      bgcolor: '#ffffff', 
      border: '1px solid rgba(0,0,0,0.04)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.04)'
    }}>
      <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', flexGrow: 1, overflow: 'hidden' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, pb: 1.5, borderBottom: '1px solid #f1f5f9' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box sx={{ width: 4, height: 18, bgcolor: '#10b981', borderRadius: 1, mr: 1.5 }} />
            <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#0f172a' }}>
              {t('qcfb.inspection.defects', 'DEFECTS')}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
          <Select
            size="small"
            value={selectedCode}
            onChange={(e) => setSelectedCode(e.target.value)}
            displayEmpty
            sx={{ 
              flex: 2, fontSize: '0.875rem', borderRadius: 2, 
              bgcolor: '#f1f5f9', color: '#1e293b',
              '& .MuiOutlinedInput-notchedOutline': { border: 'none' }
            }}
          >
            <MenuItem value="" disabled>Select Code...</MenuItem>
            {defectMasters.map(m => (
              <MenuItem key={m.DefectCode} value={m.DefectCode}>
                {m.DefectCode} - {m.DefectName}
              </MenuItem>
            ))}
          </Select>
          <Select
            size="small"
            value={selectedPoint}
            onChange={(e) => setSelectedPoint(Number(e.target.value))}
            sx={{ 
              flex: 1, minWidth: '60px', borderRadius: 2, 
              bgcolor: '#f1f5f9', color: '#1e293b',
              '& .MuiOutlinedInput-notchedOutline': { border: 'none' }
            }}
          >
            {[1, 2, 3, 4].map(p => <MenuItem key={p} value={p}>{p} pt</MenuItem>)}
          </Select>
          <Button 
            variant="contained" 
            size="small" 
            disabled={!selectedCode}
            onClick={() => onAdd(selectedCode, selectedPoint)}
            sx={{ 
              minWidth: '40px', px: 1, borderRadius: 2,
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: 'white',
              boxShadow: '0 4px 10px rgba(16,185,129,0.3)',
              '&:hover': { background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', transform: 'translateY(-2px)' },
              transition: 'all 0.2s'
            }}
          >
            <AddIcon />
          </Button>
        </Box>

        <Box sx={{ flexGrow: 1, minHeight: 0, overflowY: 'auto', pr: 1, 
          '&::-webkit-scrollbar': { width: 4 }, 
          '&::-webkit-scrollbar-thumb': { bgcolor: '#cbd5e1', borderRadius: 2 } 
        }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, color: '#475569', bgcolor: '#f8fafc', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>Code</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, color: '#475569', bgcolor: '#f8fafc', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>Pt</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, color: '#475569', bgcolor: '#f8fafc', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>Qty</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, color: '#475569', bgcolor: '#f8fafc', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>Act</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {defects.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ color: '#64748b', py: 4, border: 'none' }}>
                    No defects added.
                  </TableCell>
                </TableRow>
              ) : (
                defects.map((d, i) => (
                  <TableRow key={i} sx={{ '& td': { borderBottom: '1px solid rgba(0,0,0,0.05)' }, '&:last-child td': { border: 0 }, '&:hover': { bgcolor: '#f1f5f9' } }}>
                    <TableCell sx={{ fontSize: '0.8rem', fontWeight: 600, color: '#1e293b' }}>{d.DefectCode}</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600, color: '#1e293b' }}>{d.DefectPoint}</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600, color: '#1e293b' }}>{d.QtyDefect}</TableCell>
                    <TableCell align="right" sx={{ p: 0 }}>
                      <IconButton size="small" sx={{ color: '#3b82f6' }}>
                         <PhotoCamera fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => onDelete(d.DefectCode, d.DefectPoint)} sx={{ color: '#ef4444' }}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Box>

        <Divider sx={{ my: 3, borderColor: 'rgba(0,0,0,0.05)' }} />
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, px: 1 }}>
          <Box>
            <Typography variant="body2" fontWeight={700} sx={{ color: '#64748b' }}>TOTAL: <span style={{ color: '#1e293b', fontSize: '1.1rem' }}>{totalPoints}</span> <span style={{fontSize: '0.7rem'}}>pt</span></Typography>
            <Typography variant="body2" fontWeight={700} sx={{ color: '#64748b' }}>AVG: <span style={{ color: '#1e293b', fontSize: '1.1rem' }}>{avgPoint.toFixed(2)}</span></Typography>
          </Box>
          <Box sx={{ 
            px: 4, py: 1.2, 
            borderRadius: 8, 
            background: isPass ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', 
            color: 'white',
            boxShadow: isPass ? '0 4px 20px rgba(16,185,129,0.3)' : '0 4px 20px rgba(239,68,68,0.3)'
          }}>
            <Typography fontWeight={900} fontSize="1.3rem" sx={{ letterSpacing: '2px' }}>
               {isPass ? t('qcfb.inspection.pass', 'PASS') : t('qcfb.inspection.fail', 'FAIL')}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="outlined" color="error" onClick={onDeleteAll} sx={{ flex: 1, borderRadius: 3, fontWeight: 800, borderWidth: 2, '&:hover': { borderWidth: 2 } }}>
            {t('qcfb.inspection.clearAll', 'CLEAR')}
          </Button>
          <Button variant="contained" color="primary" sx={{ 
            flex: 2, borderRadius: 3, fontWeight: 800, letterSpacing: '1px',
            background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
            boxShadow: '0 4px 14px rgba(37,99,235,0.3)',
            '&:hover': { background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)', transform: 'translateY(-2px)' },
            transition: 'all 0.2s'
          }}>
            {t('qcfb.inspection.confirm', 'CONFIRM')}
          </Button>
        </Box>

      </CardContent>
    </Card>
  );
}
