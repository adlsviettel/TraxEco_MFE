import React from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Typography, Button, IconButton
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from 'react-i18next';
import { SpecialPropertyItem } from '../services/specialPropertyService';
import SpecialPropertyManager from './SpecialPropertyManager';

export interface SpecialPropertyManagerDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect?: (property: SpecialPropertyItem) => void;
  selectedId?: string;
}

export const SpecialPropertyManagerDialog: React.FC<SpecialPropertyManagerDialogProps> = ({
  open,
  onClose,
  onSelect,
  selectedId,
}) => {
  const { t } = useTranslation();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3, p: 0.5 } }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <Typography variant="h6" fontWeight={700}>
          {t('rdMaterial.labelPrint.sp_dialog_title', 'Quản lý danh mục Special Property')}
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 2.5 }}>
        <SpecialPropertyManager
          onSelect={onSelect}
          selectedId={selectedId}
          onClose={onClose}
        />
      </DialogContent>

      <DialogActions sx={{ px: 2.5, py: 1.5 }}>
        <Button onClick={onClose} variant="outlined" sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}>
          {t('rdMaterial.labelPrint.sp_dialog_close', 'Đóng')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SpecialPropertyManagerDialog;
