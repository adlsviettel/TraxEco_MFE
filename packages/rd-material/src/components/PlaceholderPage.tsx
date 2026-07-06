import React from 'react';
import { Box, Button, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

interface Props {
  title: string;
  itemType: string;
}

const PlaceholderPage: React.FC<Props> = ({ title, itemType }) => (
  <Box>
    <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
      <Box>
        <Typography variant="caption" color="text.secondary">Home › {itemType}</Typography>
        <Typography variant="h5">{title}</Typography>
      </Box>
      <Button variant="contained" startIcon={<AddIcon />}>Add {title}</Button>
    </Box>
    <Box
      sx={{
        height: 300, borderRadius: 2, border: '2px dashed #a5d6a7',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        color: 'text.secondary', bgcolor: '#f9fbe7',
      }}
    >
      <Typography fontSize={40} mb={1}>🚧</Typography>
      <Typography fontWeight={600}>{title} — Coming in next sprint</Typography>
      <Typography fontSize={13} mt={0.5}>Layout sẽ giống Fabric Hanger với Add/Edit/Print Label/Delete</Typography>
    </Box>
  </Box>
);

export default PlaceholderPage;
