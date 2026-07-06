import { useState, useEffect, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

export function useQrScanner(elementId: string) {
  const [isScanning, setIsScanning] = useState(false);
  const [html5QrCode, setHtml5QrCode] = useState<Html5Qrcode | null>(null);

  const startScanning = useCallback(async (onScanSuccess: (decodedText: string) => void, onScanError?: (errorMessage: string) => void) => {
    if (isScanning || html5QrCode) return;

    try {
      const qrCode = new Html5Qrcode(elementId, { formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE, Html5QrcodeSupportedFormats.CODE_128] });
      setHtml5QrCode(qrCode);
      
      await qrCode.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          qrCode.stop().then(() => {
            setIsScanning(false);
            setHtml5QrCode(null);
            onScanSuccess(decodedText);
          });
        },
        onScanError
      );
      setIsScanning(true);
    } catch (err) {
      console.error('Error starting QR scanner:', err);
      setIsScanning(false);
      setHtml5QrCode(null);
    }
  }, [elementId, isScanning, html5QrCode]);

  const stopScanning = useCallback(async () => {
    if (html5QrCode && isScanning) {
      try {
        await html5QrCode.stop();
        setIsScanning(false);
        setHtml5QrCode(null);
      } catch (err) {
        console.error('Error stopping QR scanner:', err);
      }
    }
  }, [html5QrCode, isScanning]);

  useEffect(() => {
    return () => {
      if (html5QrCode && isScanning) {
        html5QrCode.stop().catch(console.error);
      }
    };
  }, [html5QrCode, isScanning]);

  return { isScanning, startScanning, stopScanning };
}
