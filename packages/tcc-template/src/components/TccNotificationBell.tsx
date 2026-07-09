import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  IconButton,
  Badge,
  Popover,
  Typography,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Divider,
  Button,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
} from '@mui/material';
import {
  Notifications as BellIcon,
  Assignment as AssignmentIcon,
  LocalShipping as ShippingIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  NotificationsNone as EmptyIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow } from 'date-fns';
import { vi, enUS, id, th, km } from 'date-fns/locale';
import { Client } from '@stomp/stompjs';
import { tccService, TccRequest } from '../services/tccService';
import { authService } from '@traxeco/shared';

interface Notification {
  id: string;
  requestId: string;
  title: string;
  detail: string;
  timestamp: number;
  icon: React.ReactNode;
  iconBg: string;
  unread: boolean;
}

const parseTime = (dateStr: string | null | undefined): number => {
  if (!dateStr) return 0;
  
  // Try direct parse (works for ISO, MM/DD/YYYY, etc.)
  const time = new Date(dateStr).getTime();
  if (!isNaN(time)) return time;
  
  // Fallback for DD/MM/YYYY or DD/MM/YYYY HH:mm:ss
  const parts = dateStr.split(/[\\s/:-]+/);
  if (parts.length >= 3 && parts[0].length <= 2) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    let year = parseInt(parts[2], 10);
    if (year < 100) year += 2000;
    
    const h = parts[3] ? parseInt(parts[3], 10) : 0;
    const m = parts[4] ? parseInt(parts[4], 10) : 0;
    const s = parts[5] ? parseInt(parts[5], 10) : 0;
    
    const fallbackTime = new Date(year, month, day, h, m, s).getTime();
    if (!isNaN(fallbackTime)) return fallbackTime;
  }
  
  return 0;
};

export default function TccNotificationBell() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [requests, setRequests] = useState<TccRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [selectedNotificationReq, setSelectedNotificationReq] = useState<TccRequest | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  const userInfo = useMemo(() => authService.getUserInfo() || { employeeCode: '', employeeName: '' }, []);
  const username = userInfo.employeeCode.trim().toLowerCase();

  // Auto request permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      try {
        Notification.requestPermission();
      } catch (e) {
        console.error('Failed to request notification permission automatically', e);
      }
    }
  }, []);

  const fetchRequests = useCallback(async () => {
    if (!username) return;
    setLoading(true);
    try {
      const [data, dbReadIds] = await Promise.all([
        tccService.getRequests({}),
        tccService.getReadNotifications()
      ]);
      setRequests(data);
      setReadIds(new Set(dbReadIds));
    } catch (error) {
      console.error('Failed to fetch requests or notification read states', error);
    } finally {
      setLoading(false);
    }
  }, [username]);

  // Load once + poll every 60s + WebSocket live updates
  useEffect(() => {
    fetchRequests();

    const getWsUrl = () => {
      const apiBase = (import.meta as any).env.VITE_API_BASE_URL || '/api';
      if (apiBase.startsWith('https://')) {
        const wsBase = apiBase.replace(/^https/, 'wss');
        return wsBase.replace(/\/api\/?$/, '') + '/ws-qc';
      } else if (apiBase.startsWith('http://')) {
        const wsBase = apiBase.replace(/^http/, 'ws');
        return wsBase.replace(/\/api\/?$/, '') + '/ws-qc';
      } else {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsPath = apiBase.replace(/\/api\/?$/, '');
        return `${protocol}//${window.location.host}${wsPath}/ws-qc`;
      }
    };

    const client = new Client({
      brokerURL: getWsUrl(),
      onConnect: () => {
        client.subscribe('/topic/tcc-updates', () => {
          fetchRequests();
        });
      },
      onDisconnect: () => {}
    });

    client.activate();

    const interval = setInterval(fetchRequests, 60000);

    const handleFocus = () => {
      fetchRequests();
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      client.deactivate();
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchRequests]);

  const isAdminOrSupervisor = useMemo(() => {
    return authService.isSuperAdmin() || 
           authService.isAdmin() || 
           authService.getRoleLevel() <= 2 || 
           authService.hasPageAccess('tcc_admin_status');
  }, []);

  // Convert raw requests into dynamic notification items
  const notifications = useMemo<Array<Notification>>(() => {
    const items: Notification[] = [];
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

    requests.forEach((req) => {
      const isMyReq =
        (req.requesterName || '').trim().toLowerCase() === username ||
        (req.requesterName || '').trim().toLowerCase() === userInfo.employeeName.trim().toLowerCase() ||
        (req.requesterName || '').trim().toLowerCase().startsWith(username + ' -');

      const createdTime = parseTime(req.createdAt) || Date.now();

      // Case A: My request -> Notify me when others update status or material
      if (isMyReq) {
        // 1. Status Update
        if (req.status && req.status !== 'Not Started') {
          const updateTime = req.updatedAt ? parseTime(req.updatedAt) : createdTime;
          const updatedByUser = (req.updatedBy || '').trim().toLowerCase();
          
          if (updateTime > sevenDaysAgo && updatedByUser !== username) {
            let icon = <AssignmentIcon sx={{ fontSize: 18, color: '#f59e0b' }} />;
            let iconBg = '#fffbeb';
            let title = t('tcc.notification.statusTitle', 'Status: {{status}}', { status: req.status });
            let detail = t('tcc.notification.statusDetail', 'Your request #{{id}} has been changed to "{{status}}" by {{by}}.', { id: req.requestId, status: req.status, by: req.updatedBy || t('tcc.user', 'user') });

            if (req.status === 'Cancelled') {
              icon = <CancelIcon sx={{ fontSize: 18, color: '#ef4444' }} />;
              iconBg = '#fef2f2';
              title = t('tcc.notification.cancelledTitle', 'Request Cancelled');
              detail = t('tcc.notification.cancelledDetail', 'Your request #{{id}} has been cancelled by {{by}}.', { id: req.requestId, by: req.updatedBy || t('tcc.user', 'user') });
            } else if (req.status === 'Finished') {
              icon = <CheckIcon sx={{ fontSize: 18, color: '#22c55e' }} />;
              iconBg = '#f0fdf4';
              title = t('tcc.notification.finishedTitle', 'Request Finished');
              detail = t('tcc.notification.finishedDetail', 'Your request #{{id}} is finished and ready to deliver.', { id: req.requestId });
            }

            const id = `status-${req.requestId}-${req.status}`;
            items.push({
              id,
              requestId: req.requestId,
              title,
              detail,
              timestamp: updateTime,
              icon,
              iconBg,
              unread: !readIds.has(id),
            });
          }
        }

        // 2. Material Sent
        if (req.materialSentDate) {
          const sentTime = req.updatedAt ? parseTime(req.updatedAt) : createdTime;
          const updatedByUser = (req.updatedBy || '').trim().toLowerCase();

          if (sentTime > sevenDaysAgo && updatedByUser !== username) {
            const id = `material-${req.requestId}`;
            items.push({
              id,
              requestId: req.requestId,
              title: t('tcc.notification.materialTitle', 'Material Sent'),
              detail: t('tcc.notification.materialDetail', 'Your request #{{id}} has been confirmed as material sent on {{date}}.', { id: req.requestId, date: req.materialSentDate }),
              timestamp: sentTime,
              icon: <ShippingIcon sx={{ fontSize: 18, color: '#8b5cf6' }} />,
              iconBg: '#f5f3ff',
              unread: !readIds.has(id),
            });
          }
        }
      }
      // Case B: Not my request, but I am Admin/Supervisor -> Notify me when others create requests or send material
      else if (isAdminOrSupervisor) {
        const createdByUser = (req.createdBy || req.requesterName || '').trim().toLowerCase();
        if (createdTime > sevenDaysAgo && createdByUser !== username) {
          const id = `create-${req.requestId}`;
          items.push({
            id,
            requestId: req.requestId,
            title: t('tcc.notification.newTitle', 'New Request'),
            detail: t('tcc.notification.newDetail', 'New request #{{id}} has been created by {{by}}.', { id: req.requestId, by: req.requesterName || t('tcc.user', 'user') }),
            timestamp: createdTime,
            icon: <AssignmentIcon sx={{ fontSize: 18, color: '#0284c7' }} />,
            iconBg: '#f0f9ff',
            unread: !readIds.has(id),
          });
        }

        if (req.materialSentDate) {
          const sentTime = req.updatedAt ? parseTime(req.updatedAt) : createdTime;
          const updatedByUser = (req.updatedBy || '').trim().toLowerCase();

          if (sentTime > sevenDaysAgo && updatedByUser !== username) {
            const id = `material-admin-${req.requestId}`;
            items.push({
              id,
              requestId: req.requestId,
              title: t('tcc.notification.materialTitle', 'Material Sent'),
              detail: t('tcc.notification.materialAdminDetail', 'Request #{{id}} has been confirmed as material sent by {{by}}.', { id: req.requestId, by: req.requesterName || t('tcc.user', 'user') }),
              timestamp: sentTime,
              icon: <ShippingIcon sx={{ fontSize: 18, color: '#8b5cf6' }} />,
              iconBg: '#f5f3ff',
              unread: !readIds.has(id),
            });
          }
        }
      }
      // 3. Comment / General Update Notification
      if (req.updatedAt) {
        const updateTime = parseTime(req.updatedAt);
        const updatedByUser = (req.updatedBy || '').trim().toLowerCase();

        if (updateTime > sevenDaysAgo && updatedByUser !== username) {
          if (isMyReq) {
            const id = `comment-${req.requestId}-${req.updatedAt}`;
            items.push({
              id,
              requestId: req.requestId,
              title: t('tcc.notification.commentTitle', 'Discussion & New Update'),
              detail: t('tcc.notification.commentDetail', 'Your request #{{id}} has a new comment or edit by {{by}}.', { id: req.requestId, by: req.updatedBy || t('tcc.user', 'user') }),
              timestamp: updateTime,
              icon: <AssignmentIcon sx={{ fontSize: 18, color: '#10b981' }} />,
              iconBg: '#ecfdf5',
              unread: !readIds.has(id),
            });
          } else if (isAdminOrSupervisor) {
            const id = `comment-admin-${req.requestId}-${req.updatedAt}`;
            items.push({
              id,
              requestId: req.requestId,
              title: t('tcc.notification.commentAdminTitle', 'Update on #{{id}}', { id: req.requestId }),
              detail: t('tcc.notification.commentAdminDetail', 'Request #{{id}} has a new activity or comment from {{by}}.', { id: req.requestId, by: req.updatedBy || t('tcc.user', 'user') }),
              timestamp: updateTime,
              icon: <AssignmentIcon sx={{ fontSize: 18, color: '#10b981' }} />,
              iconBg: '#ecfdf5',
              unread: !readIds.has(id),
            });
          }
        }
      }
    });

    // Separate read and unread items to ensure unread notifications are never hidden
    const unreadItems = items.filter((item) => item.unread);
    const readItems = items.filter((item) => !item.unread);

    // Keep all unread items, and limit read items to the latest 15
    const slicedReadItems = readItems.sort((a, b) => b.timestamp - a.timestamp).slice(0, 15);

    // Combine and sort chronologically (newest first)
    return [...unreadItems, ...slicedReadItems].sort((a, b) => b.timestamp - a.timestamp);
  }, [requests, username, userInfo.employeeName, readIds, isAdminOrSupervisor]);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => n.unread).length;
  }, [notifications]);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);

  const markAsRead = async (id: string) => {
    // Optimistic UI update
    setReadIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });

    try {
      await tccService.markNotificationAsRead(id);
    } catch (error) {
      console.error('Failed to mark notification as read in DB', error);
    }
  };

  const markAllRead = async () => {
    const unreadIds = notifications.filter((n) => n.unread).map((n) => n.id);
    if (unreadIds.length === 0) return;

    // Optimistic UI update
    setReadIds((prev) => {
      const next = new Set(prev);
      unreadIds.forEach((id) => next.add(id));
      return next;
    });

    try {
      await tccService.markAllNotificationsAsRead(unreadIds);
    } catch (error) {
      console.error('Failed to mark all notifications as read in DB', error);
    }
  };

  const resetUnread = async () => {
    // Optimistic UI update
    setReadIds(new Set());

    try {
      await tccService.resetNotifications();
      fetchRequests();
    } catch (error) {
      console.error('Failed to reset notifications in DB', error);
    }
  };

  const handleTestPush = async () => {
    try {
      const requestPermissionSafe = (): Promise<NotificationPermission> => {
        return new Promise((resolve) => {
          try {
            const permissionResult = Notification.requestPermission(resolve);
            if (permissionResult && typeof permissionResult.then === 'function') {
              permissionResult.then(resolve);
            }
          } catch (e) {
            resolve(Notification.permission);
          }
        });
      };

      const permission = await requestPermissionSafe();
      if (permission !== 'granted') {
        alert(`Vui lòng cấp quyền thông báo (Notification permission) để test Web Push! (Trạng thái hiện tại: ${permission})`);
        return;
      }

      if (!('serviceWorker' in navigator)) {
        alert('Trình duyệt của bạn không hỗ trợ Service Worker!');
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      
      const vapidPublicKey = 'BEdW-EMhpE-om6JwybNS41ELB0SsWOJgjLWxESWZagi0CpbrKouTaLP7a8ukCyfJGmDel25jGWhVh0TdciE7ZIQ';
      
      const urlBase64ToUint8Array = (base64String: string) => {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
          .replace(/\-/g, '+')
          .replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
          outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
      };

      const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey
      });

      const subscriptionStr = JSON.stringify(subscription, null, 2);
      await navigator.clipboard.writeText(subscriptionStr);
      
      console.log('--- PushSubscription JSON ---');
      console.log(subscriptionStr);
      console.log('------------------------------');
      
      alert('Đăng ký thành công! Đã tự động copy mã PushSubscription JSON vào Clipboard. Hãy dán mã này vào file scratch/trigger_push.js để test!');
    } catch (err: any) {
      console.error('Push subscription failed:', err);
      alert(`Đăng ký Web Push thất bại: ${err?.message || err}`);
    }
  };

  const getRelativeTime = (timestamp: number) => {
    try {
      const currentLang = i18n.language || 'vi';
      let activeLocale = vi;
      if (currentLang === 'en') activeLocale = enUS;
      else if (currentLang === 'id') activeLocale = id;
      else if (currentLang === 'th') activeLocale = th;
      else if (currentLang === 'km') activeLocale = km;

      return formatDistanceToNow(new Date(timestamp), { addSuffix: true, locale: activeLocale });
    } catch {
      const currentLang = i18n.language || 'vi';
      if (currentLang === 'en') return 'Just now';
      if (currentLang === 'id') return 'Baru saja';
      if (currentLang === 'th') return 'เมื่อกี้';
      if (currentLang === 'km') return 'ទើបតែឥឡូវនេះ';
      return t('tcc.justNow', 'Just now');
    }
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', mr: 1.5 }}>
      <IconButton
        color="inherit"
        onClick={handleClick}
        sx={{
          border: '1px solid #e2e8f0',
          borderRadius: '6px',
          padding: '8px',
          bgcolor: open ? 'rgba(0,0,0,0.03)' : 'transparent',
          '&:hover': {
            bgcolor: 'rgba(0,0,0,0.03)',
          },
        }}
      >
        <Badge badgeContent={unreadCount} color="error" sx={{ '& .MuiBadge-badge': { fontSize: 10, height: 16, minWidth: 16 } }}>
          <BellIcon sx={{ color: '#475569', fontSize: 20 }} />
        </Badge>
      </IconButton>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: {
            mt: 1,
            width: 360,
            maxHeight: 480,
            borderRadius: '12px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            border: '1px solid #f1f5f9',
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        {/* Header */}
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9' }}>
          <Typography sx={{ fontWeight: 800, fontSize: '0.95rem', color: '#1e293b' }}>
            {t('tcc.notification.bellHeader', 'TCC Notifications')}
          </Typography>
          {unreadCount > 0 && (
            <Button
              size="small"
              onClick={markAllRead}
              sx={{
                textTransform: 'none',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#2e7d32',
                p: 0,
                minWidth: 0,
                '&:hover': { bgcolor: 'transparent', textDecoration: 'underline' }
              }}
            >
              {t('tcc.notification.markAllRead', 'Mark all as read')}
            </Button>
          )}
        </Box>

        {/* List Content */}
        <Box sx={{ flex: 1, overflowY: 'auto', bgcolor: '#f8fafc' }}>
          {loading && notifications.length === 0 ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress size={24} sx={{ color: '#2e7d32' }} />
            </Box>
          ) : notifications.length === 0 ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8, px: 2, textAlign: 'center' }}>
              <EmptyIcon sx={{ fontSize: 40, color: '#94a3b8', mb: 1.5 }} />
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#64748b' }}>
                {t('tcc.notification.emptyTitle', 'No new notifications')}
              </Typography>
              <Typography sx={{ fontSize: 11, color: '#94a3b8', mt: 0.5 }}>
                {t('tcc.notification.emptyDesc', 'Pattern status notifications will appear here')}
              </Typography>
            </Box>
          ) : (
            <List sx={{ p: 0 }}>
              {notifications.map((item, index) => (
                <React.Fragment key={item.id}>
                  {index > 0 && <Divider sx={{ borderColor: '#f1f5f9' }} />}
                  <ListItem
                    alignItems="flex-start"
                    onClick={() => {
                      if (item.unread) {
                        markAsRead(item.id);
                      }
                      handleClose();
                      const match = requests.find(r => r.requestId === item.requestId);
                      if (match) {
                        setSelectedNotificationReq(match);
                        setDetailDialogOpen(true);
                      }
                    }}
                    sx={{
                      py: 1.5,
                      px: 2,
                      cursor: 'pointer',
                      bgcolor: item.unread ? '#f0fdf4' : 'transparent',
                      transition: 'background-color 0.2s',
                      '&:hover': {
                        bgcolor: item.unread ? '#e8f7ec' : '#f1f5f9',
                      },
                    }}
                  >
                    <ListItemAvatar sx={{ minWidth: 42 }}>
                      <Avatar sx={{ bgcolor: item.iconBg, width: 32, height: 32 }}>
                        {item.icon}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Typography sx={{ fontSize: 13, fontWeight: item.unread ? 800 : 700, color: '#1e293b' }}>
                          {item.title}
                        </Typography>
                      }
                      secondaryTypographyProps={{ component: 'div' }}
                      secondary={
                        <Box sx={{ mt: 0.3 }}>
                          <Typography component="div" sx={{ fontSize: 12, color: '#475569', lineHeight: 1.4 }}>
                            {item.detail}
                          </Typography>
                          <Typography component="span" sx={{ fontSize: 10, color: '#94a3b8', mt: 0.5, fontWeight: 500, display: 'block' }}>
                            {getRelativeTime(item.timestamp)}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                </React.Fragment>
              ))}
            </List>
          )}
        </Box>

        {/* Footer */}
        <Box sx={{ p: 1.2, borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', px: 2 }}>
          <Button
            size="small"
            onClick={resetUnread}
            sx={{
              textTransform: 'none',
              fontSize: '0.75rem',
              fontWeight: 700,
              color: '#ef4444',
              '&:hover': { bgcolor: '#fef2f2' },
            }}
          >
            {t('tcc.notification.resetUnread', 'Reset chưa đọc')}
          </Button>
          <Button
            size="small"
            onClick={fetchRequests}
            disabled={loading}
            sx={{
              textTransform: 'none',
              fontSize: '0.75rem',
              fontWeight: 700,
              color: '#475569',
              '&:hover': { bgcolor: '#f1f5f9' },
            }}
          >
            {t('tcc.notification.refresh', 'Làm mới danh sách')}
          </Button>
        </Box>
      </Popover>

      {/* Read-only Request Details Dialog */}
      <Dialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '16px',
            p: 1,
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          }
        }}
      >
        <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography component="span" variant="subtitle1" sx={{ fontWeight: 800, color: '#1e293b', fontSize: '1.1rem' }}>
            {t('tcc.notification.dialogTitle', 'Chi tiết yêu cầu #{{id}}', { id: selectedNotificationReq?.requestId })}
          </Typography>
          <IconButton onClick={() => setDetailDialogOpen(false)} sx={{ color: '#94a3b8' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ borderColor: '#f1f5f9', py: 2.5 }}>
          {selectedNotificationReq && (
            <Grid container spacing={2.5}>
              {/* Section: Request Details */}
              <Grid size={{ xs: 12 }}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: '#0284c7', mb: 1.5, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {t('tcc.requestDetailsHeader', 'Request Details (Read-only)')}
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>{t('tcc.requesterName', 'NameOfRequester')}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#334155' }}>{selectedNotificationReq.requesterName}</Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>{t('tcc.customer', 'Customer')}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#334155' }}>{selectedNotificationReq.customer}</Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>{t('tcc.season', 'Season')} / {t('tcc.styleNumber', 'Style number')}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#334155' }}>{selectedNotificationReq.season} / {selectedNotificationReq.styleNumber}</Typography>
                  </Grid>
                  
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>{t('tcc.productType', 'Product type')}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#334155' }}>{selectedNotificationReq.productType}</Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>{t('tcc.sampleStage', 'Sample stage')}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#334155' }}>{selectedNotificationReq.sampleStage}</Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>{t('tcc.factory', 'Factory')}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#334155' }}>{selectedNotificationReq.factory}</Typography>
                  </Grid>

                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>{t('tcc.processType', 'Light / Full process')}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#334155' }}>
                      {selectedNotificationReq.processType === 'Light Process' ? t('tcc.processLight', 'Light Process') : t('tcc.processFull', 'Full Process')}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>{t('tcc.machineType', 'Machine type')} / {t('tcc.machineDimension', 'Machine dimension')}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#334155' }}>
                      {selectedNotificationReq.machineType || '(N/A)'} {selectedNotificationReq.machineDimension ? `/ ${selectedNotificationReq.machineDimension}` : ''}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>{t('tcc.lineQuantity', 'Line Quantity')} / {t('tcc.sizesRequired', 'Sample size')}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#334155' }}>
                      {selectedNotificationReq.lineQuantity || '0'} / {selectedNotificationReq.sizesRequired || '(N/A)'}
                    </Typography>
                  </Grid>

                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>{t('tcc.materialSentDate', 'Material sent date')}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#334155' }}>{selectedNotificationReq.materialSentDate || t('common.notSent', 'Chưa gửi')}</Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>{t('tcc.expectedDeliveryDate', 'Request Delivery Date')}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#334155' }}>{selectedNotificationReq.expectedDeliveryDate || '(N/A)'}</Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>{t('tcc.priority', 'Priority request')}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: selectedNotificationReq.isPriority ? '#ef4444' : '#334155' }}>
                      {selectedNotificationReq.isPriority ? `${t('tcc.isPriority', 'Yêu cầu ưu tiên')} (${selectedNotificationReq.priorityReason})` : t('common.normal', 'Thông thường')}
                    </Typography>
                  </Grid>

                  <Grid size={{ xs: 12 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>{t('tcc.operationDescription', 'Operation Description')}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500, color: '#475569', bgcolor: '#f8fafc', p: 1.5, borderRadius: '8px', border: '1px solid #f1f5f9', whiteSpace: 'pre-wrap' }}>
                      {selectedNotificationReq.operationDescription || `(${t('common.none', 'Không có')})`}
                    </Typography>
                  </Grid>
                </Grid>
              </Grid>

              <Grid size={{ xs: 12 }}>
                <Divider sx={{ borderColor: '#f1f5f9', my: 0.5 }} />
              </Grid>

              {/* Section: Status / Update Info */}
              <Grid size={{ xs: 12 }}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: '#16a34a', mb: 1.5, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {t('tcc.notification.progressHeader', 'Tiến độ & Cập nhật từ TCC')}
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>{t('tcc.status', 'Status')}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 800, color: '#16a34a' }}>
                      {selectedNotificationReq.status}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>{t('tcc.developerName', 'In-charge Person')}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#334155' }}>{selectedNotificationReq.developerName || t('common.notAssigned', 'Chưa phân công')}</Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>{t('tcc.templateQty', 'Template Qty')}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#334155' }}>{selectedNotificationReq.templateQty ?? `(${t('common.notUpdated', 'Chưa cập nhật')})`}</Typography>
                  </Grid>

                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>{t('tcc.materialReceivedDate', 'Material received date')}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#334155' }}>{selectedNotificationReq.materialReceivedDate || `(${t('common.notReceived', 'Chưa nhận')})`}</Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>{t('tcc.startDate', 'Start Date')}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#334155' }}>{selectedNotificationReq.startDate || `(${t('common.notStarted', 'Chưa bắt đầu')})`}</Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>{t('tcc.finishedDate', 'Finished Date')}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#334155' }}>{selectedNotificationReq.finishedDate || `(${t('common.notFinished', 'Chưa hoàn thành')})`}</Typography>
                  </Grid>

                  <Grid size={{ xs: 12 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>{t('tcc.delayRemakeReason', 'reason for remake/ Delay')}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500, color: '#ef4444', bgcolor: '#fef2f2', p: 1.5, borderRadius: '8px', border: '1px solid #fee2e2' }}>
                      {selectedNotificationReq.delayRemakeReason || t('common.none', 'Không có')}
                    </Typography>
                  </Grid>

                  <Grid size={{ xs: 12 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>{t('tcc.remarks', 'Remarks')} / {t('tcc.comments', 'Comments')}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500, color: '#475569', bgcolor: '#f8fafc', p: 1.5, borderRadius: '8px', border: '1px solid #f1f5f9', whiteSpace: 'pre-wrap' }}>
                      {selectedNotificationReq.remarks || selectedNotificationReq.comments || `(${t('common.none', 'Không có')})`}
                    </Typography>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDetailDialogOpen(false)} variant="contained" sx={{ bgcolor: '#475569', '&:hover': { bgcolor: '#334155' }, textTransform: 'none', px: 3, borderRadius: '8px' }}>
            {t('common.close', 'Đóng')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
