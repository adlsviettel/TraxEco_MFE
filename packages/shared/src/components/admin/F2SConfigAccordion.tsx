import React from 'react';
import { Accordion, AccordionSummary, Typography, AccordionDetails, Box, TextField, Button } from '@mui/material';
import { ExpandMore as ExpandMoreIcon, AdminPanelSettings as AdminIcon } from '@mui/icons-material';

interface F2SConfigAccordionProps {
  currentAppCode: string | null;
  isSuperAdmin: boolean;
  f2sEditableCols: string;
  setF2sEditableCols: (cols: string) => void;
  handleSaveF2SEditableCols: () => void;
  themeColors: { main: string; dark: string; light: string };
  t: any;
}

export const F2SConfigAccordion: React.FC<F2SConfigAccordionProps> = ({
  currentAppCode,
  isSuperAdmin,
  f2sEditableCols,
  setF2sEditableCols,
  handleSaveF2SEditableCols,
  themeColors,
  t
}) => {
  if (!((currentAppCode === 'F2S_DELIVERY' || currentAppCode === 'F2S') && isSuperAdmin)) {
    return null;
  }

  return (
    <Accordion elevation={0}
      sx={{ 
        mt: { xs: 0.25, md: 0.75 }, border: '1px solid rgba(255,255,255,1)', borderRadius: '12px !important', 
        background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(20px)',
        boxShadow: '0 2px 10px rgba(0,0,0,0.01)', '&:before': { display: 'none' } 
      }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: themeColors.main }} />}
        sx={{ px: 2, minHeight: 36, height: 36, '& .MuiAccordionSummary-content': { alignItems: 'center', gap: 1 } }}>
        <AdminIcon sx={{ fontSize: 18, color: themeColors.main }} />
        <Typography variant="body2" sx={{ fontWeight: 800, color: themeColors.main }}>{t('admin.f2sConfigTitle')}</Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ px: 2, pb: 1.5, pt: 0 }}>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField 
            size="small" 
            label={t('admin.f2sEditableColsLabel')} 
            placeholder={t('admin.f2sEditableColsPlaceholder')}
            value={f2sEditableCols} 
            onChange={e => setF2sEditableCols(e.target.value)} 
            sx={{ flex: 1, minWidth: 300, '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#fff' } }}
          />
          <Button variant="contained" size="small" onClick={handleSaveF2SEditableCols} disableElevation
            sx={{ px: 2, fontWeight: 800, borderRadius: 2, bgcolor: themeColors.main, '&:hover': { bgcolor: themeColors.dark } }}>
            {t('admin.f2sSaveConfig')}
          </Button>
        </Box>
      </AccordionDetails>
    </Accordion>
  );
};
