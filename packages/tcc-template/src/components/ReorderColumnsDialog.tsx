import React, { useRef } from 'react';
import { Dialog, DialogTitle, DialogContent, Typography, Box, IconButton, DialogActions, Button } from '@mui/material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { type GridColDef } from '@mui/x-data-grid';

interface ReorderColumnsDialogProps {
  open: boolean;
  onClose: () => void;
  localFields: string[];
  setLocalFields: React.Dispatch<React.SetStateAction<string[]>>;
  sortedColumns: GridColDef[];
  setColumnOrder: (order: string[]) => void;
  t: any;
}

export function ReorderColumnsDialog({
  open,
  onClose,
  localFields,
  setLocalFields,
  sortedColumns,
  setColumnOrder,
  t
}: ReorderColumnsDialogProps) {
  const draggedIndexRef = useRef<number | null>(null);

  const defaultFields = [
    'requestId',
    'createdAt',
    'customer',
    'season',
    'styleNumber',
    'productType',
    'sampleStage',
    'factory',
    'materialSentDate',
    'processType',
    'operationDescription',
    'machineType',
    'machineDimension',
    'sizesRequired',
    'isPriority',
    'priorityReason',
    'expectedDeliveryDate',
    'confirmDeliveryDate',
    'finishedDate',
    'delayRemakeReason',
    'templateQty',
    'lineQuantity',
    'requesterName',
    'remarks',
    'updatedBy',
    'updatedAt',
    'actions'
  ];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
    >
      <DialogTitle sx={{ fontWeight: 'bold', pb: 1, fontSize: '16px' }}>
        {t('tcc.reorderColumnsTitle', 'Sắp xếp vị trí cột')}
      </DialogTitle>
      <DialogContent>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2, lineHeight: 1.3 }}>
          {t('tcc.reorderColumnsDesc', 'Kéo thả các mục bên dưới để thay đổi vị trí, hoặc sử dụng các nút mũi tên bấm di chuyển.')}
        </Typography>
        
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.8, maxHeight: 350, overflowY: 'auto', pr: 0.5 }}>
          {localFields.map((field, index) => {
            const colDef = sortedColumns.find(c => c.field === field);
            if (!colDef) return null;
            
            return (
              <Box
                key={field}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = 'move';
                  draggedIndexRef.current = index;
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                }}
                onDragEnter={() => {
                  const dragIndex = draggedIndexRef.current;
                  const hoverIndex = index;
                  if (dragIndex === null || dragIndex === hoverIndex) return;
                  
                  const updated = [...localFields];
                  const [removed] = updated.splice(dragIndex, 1);
                  updated.splice(hoverIndex, 0, removed);
                  draggedIndexRef.current = hoverIndex;
                  setLocalFields(updated);
                }}
                onDragEnd={() => {
                  draggedIndexRef.current = null;
                }}
                sx={{
                  p: 1.2,
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  bgcolor: '#f8fafc',
                  cursor: 'grab',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'background-color 0.2s',
                  '&:hover': { bgcolor: '#f1f5f9' },
                  '&:active': { cursor: 'grabbing' }
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#334155', fontSize: '13px' }}>
                  {index + 1}. {colDef.headerName || colDef.field}
                </Typography>
                <Box display="flex" gap={0.5}>
                  <IconButton
                    size="small"
                    disabled={index === 0}
                    onClick={() => {
                      const updated = [...localFields];
                      const temp = updated[index];
                      updated[index] = updated[index - 1];
                      updated[index - 1] = temp;
                      setLocalFields(updated);
                    }}
                    sx={{ p: 0.5 }}
                  >
                    <ArrowUpwardIcon fontSize="inherit" sx={{ fontSize: 16 }} />
                  </IconButton>
                  <IconButton
                    size="small"
                    disabled={index === localFields.length - 1}
                    onClick={() => {
                      const updated = [...localFields];
                      const temp = updated[index];
                      updated[index] = updated[index + 1];
                      updated[index + 1] = temp;
                      setLocalFields(updated);
                    }}
                    sx={{ p: 0.5 }}
                  >
                    <ArrowDownwardIcon fontSize="inherit" sx={{ fontSize: 16 }} />
                  </IconButton>
                </Box>
              </Box>
            );
          })}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, pt: 1, gap: 1 }}>
        <Button
          onClick={() => setLocalFields(defaultFields)}
          variant="text"
          color="secondary"
          sx={{ fontWeight: 'bold', fontSize: 13 }}
        >
          {t('tcc.resetDefault', 'Mặc định')}
        </Button>
        <Button
          onClick={onClose}
          variant="outlined"
          color="secondary"
          sx={{ borderRadius: 2, fontWeight: 'bold', px: 2.5, fontSize: 13 }}
        >
          {t('common.cancel', 'Hủy')}
        </Button>
        <Button
          onClick={() => {
            setColumnOrder(localFields);
            onClose();
          }}
          variant="contained"
          color="primary"
          sx={{ borderRadius: 2, fontWeight: 'bold', px: 3, bgcolor: '#1b5e20', '&:hover': { bgcolor: '#1b5e20' }, fontSize: 13 }}
        >
          {t('common.save', 'Lưu')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
