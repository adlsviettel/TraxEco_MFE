import { useState, useEffect } from 'react';
import { authFetch } from '../services/apiInterceptor';

export const useF2SConfig = (
  currentAppCode: string | null,
  t: any,
  setSnackbar: (sb: any) => void
) => {
  const [f2sEditableCols, setF2sEditableCols] = useState('');

  useEffect(() => {
    if (currentAppCode === 'F2S_DELIVERY' || currentAppCode === 'F2S') {
      authFetch('f2s/settings/editable-columns')
        .then(res => res.json())
        .then(json => {
          const data = (json && json.data !== undefined) ? json.data : json;
          if (data && data.columns) setF2sEditableCols(data.columns);
        })
        .catch(err => console.error('Failed to load editable cols setting:', err));
    }
  }, [currentAppCode]);

  const handleSaveF2SEditableCols = async () => {
    try {
      const res = await authFetch('f2s/settings/editable-columns', {
        method: 'POST',
        body: JSON.stringify({ columns: f2sEditableCols })
      });
      if (!res.ok) throw new Error();
      setSnackbar({ open: true, message: t('admin.f2sConfigSaved', 'F2S settings saved successfully'), severity: 'success' });
    } catch {
      setSnackbar({ open: true, message: t('admin.f2sConfigError', 'Failed to save F2S settings'), severity: 'error' });
    }
  };

  return {
    f2sEditableCols,
    setF2sEditableCols,
    handleSaveF2SEditableCols
  };
};
