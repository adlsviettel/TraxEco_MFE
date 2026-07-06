import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import { rdItemApi } from '../services/rdMaterialApi';

const YardageRedirectPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const resolveParent = async () => {
      if (!id) return;
      try {
        const item = await rdItemApi.getById(Number(id));
        if (item.parentId) {
          try {
            const parent = await rdItemApi.getById(item.parentId);
            const parentType = parent.itemType?.toLowerCase();
            if (parentType === 'fabric' || parentType === 'accessory' || parentType === 'product') {
              navigate(`/rd-material/${parentType}/${parent.id}`, { replace: true });
              return;
            }
          } catch (parentErr) {
            console.error('Failed to load parent item', parentErr);
          }
        }
        // Fallback to fabric list if no parent found or error loading parent
        navigate('/rd-material/fabric', { replace: true });
      } catch (err) {
        console.error('Failed to load yardage item', err);
        setError('Không thể tìm thấy thông tin cuộn mẫu.');
        setTimeout(() => {
          navigate('/rd-material/fabric', { replace: true });
        }, 2000);
      }
    };

    resolveParent();
  }, [id, navigate]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 2 }}>
      {error ? (
        <Typography color="error" fontWeight={600}>{error}</Typography>
      ) : (
        <>
          <CircularProgress color="primary" />
          <Typography color="text.secondary" variant="body2">Đang chuyển hướng đến chi tiết sản phẩm cha...</Typography>
        </>
      )}
    </Box>
  );
};

export default YardageRedirectPage;
