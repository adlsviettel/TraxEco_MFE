import React, { useEffect, useRef, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Box,
  Typography, IconButton, Stack, Select, MenuItem, FormControl, InputLabel, CircularProgress
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import RefreshIcon from '@mui/icons-material/Refresh';
import SwitchCameraIcon from '@mui/icons-material/SwitchCamera';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { useTranslation } from 'react-i18next';

interface CameraCaptureDialogProps {
  open: boolean;
  onClose: () => void;
  onCapture: (file: File, dataUrl: string) => void;
}

const CameraCaptureDialog: React.FC<CameraCaptureDialogProps> = ({ open, onClose, onCapture }) => {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string>('');
  const [cameraLoading, setCameraLoading] = useState(false);

  // Get list of video devices
  const getDevices = async () => {
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = allDevices.filter(d => d.kind === 'videoinput');
      setDevices(videoDevices);
      if (videoDevices.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(videoDevices[0].deviceId);
      }
    } catch (e) {
      console.warn("Could not enumerate devices", e);
    }
  };

  const startStream = async (deviceId: string) => {
    stopStream();
    setCameraLoading(true);
    setError('');
    
    try {
      const constraints: MediaStreamConstraints = {
        video: deviceId ? { deviceId: { exact: deviceId } } : { facingMode: 'user' }
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(err => console.error("Play error", err));
      }
    } catch (err) {
      console.error("Camera access error", err);
      setError(t('rdMaterial.camera_error', 'Cannot access camera. Please check permissions or upload from file.'));
    } finally {
      setCameraLoading(false);
    }
  };

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  useEffect(() => {
    if (open) {
      setCapturedUrl(null);
      setError('');
      getDevices().then(() => {
        startStream(selectedDeviceId);
      });
    } else {
      stopStream();
    }
    return () => {
      stopStream();
    };
  }, [open]);

  // Handle device change
  const handleDeviceChange = (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    startStream(deviceId);
  };

  // Capture current frame
  const handleCapture = () => {
    if (!videoRef.current) return;
    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Draw video frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setCapturedUrl(dataUrl);
        stopStream();
      }
    } catch (e) {
      console.error("Failed to capture frame", e);
      setError("Failed to capture image");
    }
  };

  // Convert dataURL to File and call onCapture
  const handleSave = () => {
    if (!capturedUrl) return;
    try {
      const byteString = atob(capturedUrl.split(',')[1]);
      const mimeString = capturedUrl.split(',')[0].split(':')[1].split(';')[0];
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([ab], { type: mimeString });
      const file = new File([blob], `evidence_${Date.now()}.jpg`, { type: mimeString });
      onCapture(file, capturedUrl);
      onClose();
    } catch (e) {
      console.error("Failed to save captured photo", e);
    }
  };

  // Handle local file fallback (uploading photo)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          onCapture(file, reader.result);
          onClose();
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRetake = () => {
    setCapturedUrl(null);
    startStream(selectedDeviceId);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <Typography component="span" variant="h6" fontWeight={800}>
          {capturedUrl ? t('rdMaterial.preview_photo', 'Preview Photo') : t('rdMaterial.take_photo', 'Take Photo')}
        </Typography>
        <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
      </DialogTitle>
      
      <DialogContent>
        {/* Error message */}
        {error && (
          <Typography color="error" variant="body2" textAlign="center" sx={{ mb: 2, fontWeight: 600 }}>
            ⚠️ {error}
          </Typography>
        )}

        {/* Viewport Box */}
        <Box sx={{ width: '100%', aspectRatio: '1.33', bgcolor: '#0f172a', borderRadius: 3, overflow: 'hidden', position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', border: '1px solid #334155' }}>
          {capturedUrl ? (
            <img src={capturedUrl} alt="Captured" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          ) : (
            <video 
              ref={videoRef} 
              playsInline 
              muted 
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: error ? 'none' : 'block' }} 
            />
          )}
          
          {cameraLoading && (
            <CircularProgress color="success" sx={{ position: 'absolute' }} />
          )}
        </Box>

        {/* Device Switcher (if multiple cameras are found) */}
        {!capturedUrl && devices.length > 1 && (
          <FormControl fullWidth size="small" sx={{ mt: 2 }}>
            <InputLabel id="camera-select-label">{t('rdMaterial.select_camera', 'Select Camera')}</InputLabel>
            <Select
              labelId="camera-select-label"
              value={selectedDeviceId}
              label={t('rdMaterial.select_camera', 'Select Camera')}
              onChange={(e) => handleDeviceChange(e.target.value)}
              sx={{ borderRadius: 2 }}
            >
              {devices.map((device, idx) => (
                <MenuItem key={device.deviceId} value={device.deviceId}>
                  {device.label || `Camera ${idx + 1}`}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        {/* Local File fallback upload button */}
        {!capturedUrl && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <Button
              component="label"
              variant="text"
              startIcon={<UploadFileIcon />}
              sx={{ textTransform: 'none', fontWeight: 600, color: '#64748b' }}
            >
              {t('rdMaterial.upload_from_device', 'Or upload from device / Take phone photo')}
              <input 
                type="file" 
                accept="image/*" 
                capture="user" 
                hidden 
                onChange={handleFileChange} 
              />
            </Button>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, pt: 1, justifyContent: 'center' }}>
        {capturedUrl ? (
          <Stack direction="row" spacing={2} sx={{ width: '100%' }}>
            <Button 
              fullWidth 
              variant="outlined" 
              onClick={handleRetake} 
              startIcon={<RefreshIcon />}
              sx={{ borderRadius: 2, py: 1.25, fontWeight: 700, borderColor: '#cbd5e1', color: '#475569' }}
            >
              {t('rdMaterial.retake', 'Retake')}
            </Button>
            <Button 
              fullWidth 
              variant="contained" 
              onClick={handleSave} 
              sx={{ borderRadius: 2, py: 1.25, fontWeight: 700, bgcolor: '#16a34a', '&:hover': { bgcolor: '#15803d' } }}
            >
              {t('rdMaterial.save_photo', 'Save Photo')}
            </Button>
          </Stack>
        ) : (
          <Button 
            disabled={!!error || cameraLoading} 
            variant="contained" 
            onClick={handleCapture}
            startIcon={<CameraAltIcon />}
            sx={{ borderRadius: 2, px: 5, py: 1.5, fontWeight: 700, bgcolor: '#0f172a', '&:hover': { bgcolor: '#1e293b' } }}
          >
            {t('rdMaterial.capture', 'Capture')}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default CameraCaptureDialog;
