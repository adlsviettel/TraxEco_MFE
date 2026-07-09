import React from 'react';
import { Accordion, AccordionSummary, Typography, AccordionDetails, Box, Chip, TextField, Button } from '@mui/material';
import { ExpandMore as ExpandMoreIcon, Apps as AppsIcon, Add as AddIcon } from '@mui/icons-material';
import { type AppInfo } from '../../services/appService';

interface AppManagementAccordionProps {
  isSuperAdmin: boolean;
  apps: AppInfo[];
  newAppCode: string;
  setNewAppCode: (code: string) => void;
  newAppName: string;
  setNewAppName: (name: string) => void;
  onDeleteApp: (app: AppInfo) => void;
  onAddApp: (code: string, name: string) => void;
  themeColors: { main: string; dark: string; light: string };
  t: any;
}

export const AppManagementAccordion: React.FC<AppManagementAccordionProps> = ({
  isSuperAdmin,
  apps,
  newAppCode,
  setNewAppCode,
  newAppName,
  setNewAppName,
  onDeleteApp,
  onAddApp,
  themeColors,
  t
}) => {
  if (!isSuperAdmin) return null;

  return (
    <Accordion elevation={0}
      sx={{ 
        mt: { xs: 0.25, md: 0.75 }, border: '1px solid rgba(255,255,255,1)', borderRadius: '12px !important', 
        background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(20px)',
        boxShadow: '0 2px 10px rgba(0,0,0,0.01)', '&:before': { display: 'none' } 
      }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: themeColors.main }} />}
        sx={{ px: 2, minHeight: 36, height: 36, '& .MuiAccordionSummary-content': { alignItems: 'center', gap: 1 } }}>
        <AppsIcon sx={{ fontSize: 18, color: themeColors.main }} />
        <Typography variant="body2" sx={{ fontWeight: 800, color: themeColors.main }}>{t('admin.appManagement')}</Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ px: 2, pb: 1.5, pt: 0 }}>
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
          {apps.map(app => (
            <Chip key={app.appCode} label={`${app.appCode} — ${app.appName}`}
              onDelete={() => onDeleteApp(app)} 
              sx={{ fontWeight: 700, bgcolor: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' }} 
              variant="outlined" 
            />
          ))}
          <TextField size="small" placeholder={t('admin.codePlaceholder')} value={newAppCode} onChange={e => setNewAppCode(e.target.value)} sx={{ width: 120, '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#fff' } }} />
          <TextField size="small" placeholder={t('admin.namePlaceholder')} value={newAppName} onChange={e => setNewAppName(e.target.value)} sx={{ width: 180, '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#fff' } }} />
          <Button size="small" variant="contained" startIcon={<AddIcon />} disableElevation
            disabled={!newAppCode.trim() || !newAppName.trim()}
            onClick={() => onAddApp(newAppCode, newAppName)}
            sx={{ fontWeight: 800, borderRadius: 2, px: 2, backgroundColor: themeColors.main, '&:hover': { backgroundColor: themeColors.dark } }}>
            {t('admin.add')}
          </Button>
        </Box>
      </AccordionDetails>
    </Accordion>
  );
};
