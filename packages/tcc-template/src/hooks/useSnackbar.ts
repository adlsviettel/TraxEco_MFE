import { useState, useCallback } from 'react';

export function useSnackbar() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState<'success' | 'info' | 'warning' | 'error'>('success');

  const showSnackbar = useCallback((msg: string, sev: 'success' | 'info' | 'warning' | 'error' = 'success') => {
    setMessage(msg);
    setSeverity(sev);
    setOpen(true);
  }, []);

  const hideSnackbar = useCallback(() => {
    setOpen(false);
  }, []);

  return {
    open,
    message,
    severity,
    showSnackbar,
    hideSnackbar
  };
}
