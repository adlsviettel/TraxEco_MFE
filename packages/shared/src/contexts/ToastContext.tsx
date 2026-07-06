import React, { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import { Snackbar, Alert } from '@mui/material';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastContextProps {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextProps | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toast, setToast] = useState<{ message: string; type: ToastType; key: number } | null>(null);
  const [open, setOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    clearTimer();
    setToast({ message, type, key: Date.now() });
    setOpen(true);
  }, []);

  // Manual auto-close timer — more reliable than MUI's autoHideDuration
  useEffect(() => {
    if (open) {
      clearTimer();
      timerRef.current = setTimeout(() => {
        setOpen(false);
      }, 4000);
    }
    return () => clearTimer();
  }, [open, toast?.key]);

  const handleClose = useCallback((_event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') return;
    clearTimer();
    setOpen(false);
  }, []);

  const contextValue = React.useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <Snackbar 
        key={toast?.key}
        open={open} 
        onClose={handleClose} 
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        sx={{ zIndex: 9999 }}
      >
        <Alert 
          onClose={handleClose} 
          severity={toast?.type || 'info'} 
          variant="filled" 
          sx={{ width: '100%', fontWeight: 600, boxShadow: 3, borderRadius: 2 }}
        >
          {toast?.message}
        </Alert>
      </Snackbar>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextProps => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
