import React, { useEffect, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button, CircularProgress, LinearProgress, Box, Typography } from '@mui/material';
import { App as CapacitorApp } from '@capacitor/app';
import { registerPlugin, Capacitor } from '@capacitor/core';
import SystemUpdateAltIcon from '@mui/icons-material/SystemUpdateAlt';

const AppUpdatePlugin = registerPlugin<any>('AppUpdatePlugin');

interface UpdateInfo {
  versionCode: number;
  versionName: string;
  apkUrl: string;
  releaseNotes: string;
}

export default function ApkUpdatePrompt() {
  const [open, setOpen] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);

  useEffect(() => {
    checkUpdate();
  }, []);

  const checkUpdate = async () => {
    try {
      if (!Capacitor.isNativePlatform()) return;
      const info = await CapacitorApp.getInfo();
      const currentVersionCode = parseInt(info.build, 10);
      if (isNaN(currentVersionCode)) return;

      const response = await fetch(`http://192.168.14.10:8083/trax-eco/apk-version.json?t=${new Date().getTime()}`);
      if (!response.ok) return;

      const data: UpdateInfo = await response.json();

      if (data.versionCode > currentVersionCode) {
        setUpdateInfo(data);
        setOpen(true);
      }
    } catch (err) {
      console.warn("Failed to check APK update:", err);
    }
  };

  const handleUpdate = async () => {
    if (!updateInfo) return;
    setLoading(true);
    setDownloadProgress(0);

    try {
      // Listen to the native Java stream
      const pluginToUse = (window as any).Capacitor?.PluginHeaders ? AppUpdatePlugin : ((window as any).AppUpdatePluginWeb || AppUpdatePlugin);
      await pluginToUse.addListener('downloadProgress', (info: any) => {
        if (info.percent !== undefined) {
          setDownloadProgress(info.percent);
        }
        if (info.status === 'error') {
          alert('Lỗi tải xuống: ' + info.message);
          setLoading(false);
          setDownloadProgress(null);
        }
        if (info.status === 'complete') {
          setTimeout(() => {
            setLoading(false);
            setDownloadProgress(null);
            setOpen(false); // Close dialog because install intent triggered natively
          }, 1000);
        }
      });

      // Start the download
      if ((window as any).Capacitor?.PluginHeaders) {
        await AppUpdatePlugin.startDownload({ apkUrl: updateInfo.apkUrl });
      } else if ((window as any).androidBridge) {
        await new Promise((resolve, reject) => {
          const callbackId = 'update_' + Date.now();
          (window as any).Capacitor.Callbacks[callbackId] = { resolve, reject };
          (window as any).androidBridge.postMessage(JSON.stringify({
            type: 'message',
            callbackId: callbackId,
            pluginId: 'AppUpdatePlugin',
            methodName: 'startDownload',
            options: { apkUrl: updateInfo.apkUrl }
          }));
        });
      } else {
        throw new Error("No native bridge");
      }
    } catch (e) {
      console.error("AppUpdatePlugin error, fallback to legacy", e);
      const a = document.createElement('a');
      a.href = updateInfo.apkUrl;
      a.download = "TraxEco_Update.apk";
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      setTimeout(() => {
        setLoading(false);
        setDownloadProgress(null);
      }, 3000);
    }
  };

  const copyToClipboard = () => {
    if (updateInfo) {
      navigator.clipboard.writeText(updateInfo.apkUrl);
      alert("Đã Copy Link! Hãy thoắt App, mở trình duyệt Chrome dán vào để tải!");
    }
  };

  return (
    <Dialog 
      open={open} 
      disableEscapeKeyDown
      PaperProps={{
        sx: {
          borderRadius: 2,
          padding: 1,
          maxWidth: '400px'
        }
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#d32f2f', fontWeight: 'bold' }}>
        <SystemUpdateAltIcon /> Bắt Buộc Cập Nhật
      </DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ color: '#1e293b', mb: 2, fontWeight: 500 }}>
          Đã có phiên bản ứng dụng mới ({updateInfo?.versionName}) cần được cài đặt để tiếp tục làm việc.
        </DialogContentText>
        <DialogContentText sx={{ color: '#475569', fontSize: '0.9rem', fontStyle: 'italic', backgroundColor: '#f1f5f9', p: 1.5, borderRadius: 1 }}>
          Chi tiết: {updateInfo?.releaseNotes}
        </DialogContentText>
        
        {downloadProgress !== null && (
          <Box sx={{ mt: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" color="primary" fontWeight="bold">
                Đang tải dữ liệu cài đặt...
              </Typography>
              <Typography variant="body2" color="primary" fontWeight="bold">
                {downloadProgress}%
              </Typography>
            </Box>
            <LinearProgress variant="determinate" value={downloadProgress} sx={{ height: 10, borderRadius: 5 }} />
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, flexDirection: 'column', gap: 1 }}>
        <Button 
          variant="contained" 
          color="error" 
          fullWidth
          disabled={loading}
          onClick={handleUpdate}
          sx={{ fontWeight: 'bold', textTransform: 'none', py: 1.5, m: 0 }}
        >
          {loading && downloadProgress === null ? <CircularProgress size={24} color="inherit" /> : 
           downloadProgress !== null ? 'Hệ Thống Đang Xử Lý...' : 'Tải Bản Cập Nhật Mới Nhất'}
        </Button>
        <Button 
          variant="outlined" 
          fullWidth
          onClick={copyToClipboard}
          sx={{ fontWeight: 'bold', textTransform: 'none', py: 1, m: '0 !important' }}
        >
          Copy Link Cài Đặt (Dùng khi lỗi)
        </Button>
      </DialogActions>
    </Dialog>
  );
}
