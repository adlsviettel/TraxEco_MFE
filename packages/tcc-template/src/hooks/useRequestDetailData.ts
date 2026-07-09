import { useState, useEffect, useRef, useCallback } from 'react';
import { tccService, type TccRequest } from '../services/tccService';
import { authService } from '@traxeco/shared';

export function useRequestDetailData(
  request: TccRequest | null,
  open: boolean,
  showToast: (msg: string, severity: 'success' | 'info' | 'warning' | 'error') => void
) {
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsExpanded, setLogsExpanded] = useState(true);

  const [comments, setComments] = useState<any[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');
  const [commentsExpanded, setCommentsExpanded] = useState(true);
  const [submittingComment, setSubmittingComment] = useState(false);

  const userInfo = authService.getUserInfo();

  const triggerWindowsNotification = useCallback((title: string, body: string) => {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/favicon.ico'
      });
    }
  }, []);

  useEffect(() => {
    if (!open || !request) return;

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    setLogsLoading(true);
    setCommentsLoading(true);
    
    tccService.getAuditLogs(request.requestId)
      .then(data => setAuditLogs(Array.isArray(data) ? data : []))
      .catch(() => setAuditLogs([]))
      .finally(() => setLogsLoading(false));

    tccService.getComments(request.requestId)
      .then(data => setComments(Array.isArray(data) ? data : []))
      .catch(() => setComments([]))
      .finally(() => setCommentsLoading(false));

    const pollUpdatesSilently = () => {
      tccService.getComments(request.requestId)
        .then(data => {
          if (Array.isArray(data)) {
            setComments(prev => {
              const prevIds = new Set(prev.map(c => c.id));
              const newComment = data.find(c => !prevIds.has(c.id));
              if (newComment) {
                const authorCodeLower = (newComment.authorCode || '').trim().toLowerCase();
                const authorNameLower = (newComment.authorName || '').trim().toLowerCase();
                const myCodeLower = (userInfo.employeeCode || '').trim().toLowerCase();
                const myNameLower = (userInfo.employeeName || '').trim().toLowerCase();
                const isMe = authorCodeLower === myCodeLower || authorNameLower === myNameLower;
                
                if (!isMe) {
                  showToast(`💬 ${newComment.authorName}: ${newComment.content}`, 'info');
                  triggerWindowsNotification(
                    `💬 Bình luận mới tại #${request.requestId}`,
                    `${newComment.authorName}: ${newComment.content}`
                  );
                }
              }
              return data;
            });
          }
        })
        .catch(() => {});

      tccService.getAuditLogs(request.requestId)
        .then(data => {
          if (Array.isArray(data)) {
            setAuditLogs(prev => {
              if (prev.length > 0 && data.length > prev.length) {
                showToast('📜 Nhật ký thay đổi đã được cập nhật!', 'info');
                const latestLog = data[data.length - 1];
                triggerWindowsNotification(
                  `📜 Cập nhật yêu cầu #${request.requestId}`,
                  `${latestLog?.userName || 'Hệ thống'}: ${latestLog?.details || 'Có thay đổi mới'}`
                );
              }
              return data;
            });
          }
        })
        .catch(() => {});
    };

    const interval = setInterval(pollUpdatesSilently, 3000);

    return () => {
      clearInterval(interval);
    };
  }, [open, request, userInfo.employeeCode, userInfo.employeeName, showToast, triggerWindowsNotification]);

  const handleSendComment = useCallback(() => {
    if (!newCommentText.trim() || !request) return;
    setSubmittingComment(true);
    tccService.addComment(request.requestId, newCommentText.trim())
      .then((c) => {
        setNewCommentText('');
        setComments(prev => [...prev, c]);
        showToast('Gửi ý kiến thành công!', 'success');
      })
      .catch((err) => {
        console.error(err);
        showToast('Lỗi khi gửi bình luận!', 'error');
      })
      .finally(() => setSubmittingComment(false));
  }, [newCommentText, request, showToast]);

  const handleDeleteComment = useCallback((commentId: number) => {
    tccService.deleteComment(commentId)
      .then(() => {
        setComments(prev => prev.filter(c => c.id !== commentId));
        showToast('Đã xóa bình luận!', 'success');
      })
      .catch((err) => {
        console.error(err);
        showToast('Lỗi khi xóa bình luận!', 'error');
      });
  }, [showToast]);

  const handleTogglePin = useCallback((commentId: number, currentlyPinned: boolean) => {
    tccService.togglePinComment(commentId, !currentlyPinned)
      .then(() => {
        setComments(prev => prev.map(c => c.id === commentId ? { ...c, isPinned: !currentlyPinned } : c)
          .sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0)));
      })
      .catch(console.error);
  }, []);

  return {
    auditLogs,
    logsLoading,
    logsExpanded,
    setLogsExpanded,
    comments,
    commentsLoading,
    commentsExpanded,
    setCommentsExpanded,
    newCommentText,
    setNewCommentText,
    submittingComment,
    handleSendComment,
    handleDeleteComment,
    handleTogglePin
  };
}
