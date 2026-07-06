import * as React from 'react';
import { Box, Typography } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { useTranslation } from 'react-i18next';

export default function CustomFilterPanel() {
  const { t } = useTranslation();
  return (
    <Box sx={{ p: 2, maxWidth: 260 }}>
      <Typography variant="body2" sx={{ lineHeight: 1.6, color: '#333' }}>
        {t('tcc.filterMovedToExcel', 'Tính năng lọc đã được chuyển sang giao diện Excel.')}
        <br/><br/>
        {t('tcc.filterClearHint', 'Vui lòng nhấn vào biểu tượng ⋮ trên tiêu đề cột và chọn Clear Filter để xóa bộ lọc.')}
      </Typography>
    </Box>
  );
}

