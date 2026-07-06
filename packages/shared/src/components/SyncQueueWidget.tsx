import React, { useState, useEffect } from 'react';
import { Badge, IconButton, Menu, MenuItem, Typography, Box, Button, CircularProgress, Divider, Tooltip, Chip } from '@mui/material';
import { CloudOff as CloudOffIcon, CloudSync as CloudSyncIcon, Delete as DeleteIcon, CheckCircle as CheckCircleIcon } from '@mui/icons-material';
import { offlineSyncService, type OfflineRequest } from '../services/offlineSyncService';
import { useTranslation } from 'react-i18next';

export default function SyncQueueWidget() {
  const { t } = useTranslation();
  const [queue, setQueue] = useState<OfflineRequest[]>([]);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [syncing, setSyncing] = useState(false);

  const loadQueue = () => {
    setQueue(offlineSyncService.getQueue());
  };

  useEffect(() => {
    loadQueue();
    window.addEventListener('offline_queue_updated', loadQueue);
    window.addEventListener('online', loadQueue);
    window.addEventListener('offline', loadQueue);
    return () => {
      window.removeEventListener('offline_queue_updated', loadQueue);
      window.removeEventListener('online', loadQueue);
      window.removeEventListener('offline', loadQueue);
    };
  }, []);

  const handleSync = async () => {
    if (!navigator.onLine) {
      alert('Vui lòng kết nối mạng để đồng bộ!');
      return;
    }
    setSyncing(true);
    try {
      const res = await offlineSyncService.syncAll();
      if (res.failCount > 0) {
        alert(`Đồng bộ thất bại ${res.failCount} tác vụ. Vui lòng kiểm tra lại data.`);
      } else if (res.successCount > 0) {
        // Success
      }
    } catch (e: any) {
      alert('Lỗi đồng bộ: ' + e.message);
    } finally {
      setSyncing(false);
      loadQueue();
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Bạn có chắc xoá bản ghi chờ rớt mạng này không? Data sẽ bị mất.')) {
      offlineSyncService.dequeue(id);
    }
  };

  if (queue.length === 0 && navigator.onLine) {
    return null; // Ẩn widget nếu có mạng và trống queue
  }

  return (
    <>
      <Tooltip title={`Hàng chờ Offline: ${queue.length}`}>
        <IconButton
          color={!navigator.onLine ? 'error' : (queue.length > 0 ? 'warning' : 'default')}
          onClick={e => setAnchorEl(e.currentTarget)}
          sx={{ ml: 1, backgroundColor: queue.length > 0 ? 'rgba(237, 108, 2, 0.1)' : 'transparent' }}
        >
          <Badge badgeContent={queue.length} color="error">
            {!navigator.onLine ? <CloudOffIcon /> : <CloudSyncIcon />}
          </Badge>
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        PaperProps={{ sx: { width: 320, p: 1 } }}
      >
        <Box sx={{ p: 1, pb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="subtitle1" fontWeight={700}>
            {t('common.offlineQueue', 'Trạng thái Offline')}
          </Typography>
          <Box>
            {!navigator.onLine ? (
              <Chip size="small" color="error" label="Mất nối mạng" />
            ) : (
              <Chip size="small" color="success" label="Đã nối mạng" icon={<CheckCircleIcon />} />
            )}
          </Box>
        </Box>
        <Divider sx={{ mb: 1 }} />
        
        {queue.length === 0 ? (
          <Typography variant="body2" sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
            Không có dữ liệu chờ.
          </Typography>
        ) : (
          <>
            <Box sx={{ maxHeight: 300, overflowY: 'auto' }}>
              {queue.map(req => (
                <Box key={req.id} sx={{ mb: 1, p: 1, border: '1px solid #eee', borderRadius: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                      <Typography variant="body2" fontWeight={600}>{req.metadata.description}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(req.timestamp).toLocaleString()}
                      </Typography>
                    </Box>
                    <IconButton size="small" color="error" onClick={() => handleDelete(req.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
              ))}
            </Box>
            <Divider sx={{ mt: 1, mb: 1 }} />
            <Button
              variant="contained"
              fullWidth
              color="primary"
              disabled={!navigator.onLine || syncing}
              onClick={handleSync}
              startIcon={syncing ? <CircularProgress size={16} /> : <CloudSyncIcon />}
            >
              {syncing ? 'Đang đồng bộ...' : `Đồng bộ ngay (${queue.length})`}
            </Button>
          </>
        )}
      </Menu>
    </>
  );
}
