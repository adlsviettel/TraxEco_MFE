import { useState, useEffect, useRef } from 'react';
import { qcfbInspectionService } from '../services/qcfbInspectionService';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export function useAutoSave(qrCode: string, field: string, initialValue: string, delay: number = 800) {
  const [value, setValue] = useState(initialValue);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const isFirstRender = useRef(true);

  // Update internal value if initialValue changes (e.g. roll loaded)
  useEffect(() => {
    setValue(initialValue);
    setSaveStatus('idle');
  }, [initialValue]);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (!qrCode || value === initialValue) {
       return;
    }

    setSaveStatus('saving');
    const handler = setTimeout(async () => {
      try {
        const res = await qcfbInspectionService.updateField(qrCode, field, value);
        if (res.ok) {
          setSaveStatus('saved');
        } else {
          setSaveStatus('error');
        }
      } catch (error) {
        console.error('AutoSave Error:', error);
        setSaveStatus('error');
      }
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, qrCode, field, delay, initialValue]);

  return { value, setValue, saveStatus };
}
