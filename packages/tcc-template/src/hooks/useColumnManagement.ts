import { useState, useRef, useCallback } from 'react';

export function useColumnManagement(
  storageKey: string,
  initialVisibility: Record<string, boolean>
) {
  const [columnVisibilityModel, setColumnVisibilityModel] = useState<Record<string, boolean>>(initialVisibility);
  
  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem(storageKey);
    return saved ? JSON.parse(saved) : [];
  });
  
  const [reorderOpen, setReorderOpen] = useState(false);
  const [localFields, setLocalFields] = useState<string[]>([]);
  const draggedFieldRef = useRef<string | null>(null);

  const saveColumnOrder = useCallback((newOrder: string[]) => {
    setColumnOrder(newOrder);
    localStorage.setItem(storageKey, JSON.stringify(newOrder));
  }, [storageKey]);

  return {
    columnVisibilityModel,
    setColumnVisibilityModel,
    columnOrder,
    setColumnOrder: saveColumnOrder,
    reorderOpen,
    setReorderOpen,
    localFields,
    setLocalFields,
    draggedFieldRef
  };
}
