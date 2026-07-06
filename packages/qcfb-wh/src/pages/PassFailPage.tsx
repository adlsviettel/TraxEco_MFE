import React, { useState } from 'react';
import { Box, Tabs, Tab, Paper, Typography } from '@mui/material';
import { FactCheck, Assessment } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import BulkPassFailTab from '../components/BulkPassFailTab';
import ReportPassFailPage from './ReportPassFailPage';

export default function PassFailPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState(0);

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <Paper elevation={0} sx={{ borderRadius: 0, borderBottom: '1px solid #e0e0e0', backgroundColor: '#fff', px: 2, pt: 1, flexShrink: 0 }}>
        <Tabs 
          value={activeTab} 
          onChange={(_, val) => setActiveTab(val)}
          textColor="primary"
          indicatorColor="primary"
          sx={{ minHeight: 48 }}
        >
          <Tab 
            icon={<FactCheck sx={{ fontSize: 20 }} />} 
            iconPosition="start" 
            label={<Typography sx={{ fontWeight: 600, fontSize: '0.9rem' }}>Thao tác Pass/Fail</Typography>} 
            sx={{ minHeight: 48, textTransform: 'none' }}
          />
          <Tab 
            icon={<Assessment sx={{ fontSize: 20 }} />} 
            iconPosition="start" 
            label={<Typography sx={{ fontWeight: 600, fontSize: '0.9rem' }}>Lịch sử & Báo cáo</Typography>} 
            sx={{ minHeight: 48, textTransform: 'none' }}
          />
        </Tabs>
      </Paper>

      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, p: 0, backgroundColor: '#f5f7fa' }}>
        {/* We use display: 'none' instead of unmounting to keep state alive */}
        <Box sx={{ flex: 1, display: activeTab === 0 ? 'flex' : 'none', flexDirection: 'column', minHeight: 0 }}>
          <BulkPassFailTab />
        </Box>
        <Box sx={{ flex: 1, display: activeTab === 1 ? 'flex' : 'none', flexDirection: 'column', minHeight: 0 }}>
          <ReportPassFailPage />
        </Box>
      </Box>
    </Box>
  );
}
