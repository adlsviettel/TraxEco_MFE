import React, { useEffect, useRef, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { Html5Qrcode } from 'html5-qrcode';
import { useTranslation } from 'react-i18next';

interface QRScannerDialogProps {
  open: boolean;
  onClose: () => void;
  onScan: (decodedText: string) => void;
}

const QRScannerDialog: React.FC<QRScannerDialogProps> = ({ open, onClose, onScan }) => {
  const { t } = useTranslation();
  const [error, setError] = useState<string>('');
  const scannerRef = useRef<Html5Qrcode | null>(null);

  // Store callbacks in refs to prevent restarting the camera loop when parent re-renders
  const onScanRef = useRef(onScan);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (open) {
      setError('');
      let isStopped = false;
      
      // Small delay to ensure the DOM element "reader" is mounted
      const timer = setTimeout(() => {
        try {
          const html5QrCode = new Html5Qrcode("reader");
          scannerRef.current = html5QrCode;
          
          html5QrCode.start(
            { facingMode: "environment" },
            {
              fps: 10,
              qrbox: { width: 250, height: 250 },
              aspectRatio: 1.0,
            },
            (decodedText) => {
              // Success
              if (!isStopped) {
                isStopped = true;
                html5QrCode.stop().then(() => {
                  onScanRef.current(decodedText);
                }).catch(() => {
                  onScanRef.current(decodedText);
                });
              }
            },
            (errorMessage) => {
              // Ignore standard scan failures
            }
          ).catch((err) => {
            console.error("Camera start error", err);
            setError(t('rdMaterial.camera_error', 'Cannot access camera. Please ensure camera permissions are granted.'));
          });
        } catch (e) {
          console.error("Scanner init error", e);
          setError(t('rdMaterial.camera_error', 'Cannot access camera. Please ensure camera permissions are granted.'));
        }
      }, 100);

      return () => {
        isStopped = true;
        clearTimeout(timer);
        if (scannerRef.current) {
          const qr = scannerRef.current;
          scannerRef.current = null;
          if (qr.isScanning) {
            qr.stop().catch(console.error);
          }
        }
      };
    }
  }, [open, t]);

  return (
    <Dialog open={open} onClose={() => onCloseRef.current()} maxWidth="sm" fullWidth>
      <DialogTitle component="div" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1, fontWeight: 700, fontSize: '1.25rem' }}>
        {t('rdMaterial.scan_qr_code', 'Scan QR Code')}
        <IconButton onClick={() => onCloseRef.current()} size="small"><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent>
        {error ? (
          <Typography color="error" textAlign="center" my={4} fontWeight={500}>{error}</Typography>
        ) : (
          <Box id="reader" sx={{ width: '100%', minHeight: 300, overflow: 'hidden', borderRadius: 2 }} />
        )}
      </DialogContent>
      <DialogActions sx={{ pt: 0 }}>
        <Button onClick={() => onCloseRef.current()} sx={{ fontWeight: 600 }}>{t('common.cancel', 'Cancel')}</Button>
      </DialogActions>
    </Dialog>
  );
};

export default QRScannerDialog;
