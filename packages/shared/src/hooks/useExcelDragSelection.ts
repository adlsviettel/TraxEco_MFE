import { useRef, useEffect, useCallback, useState } from 'react';

/**
 * High-performance Excel-like drag selection for numeric table cells.
 * 
 * KEY DESIGN: Selection highlighting is done via DOM class toggling (zero React re-renders).
 * Only the summary footer triggers a React state update (once on mouseup, not during drag).
 */

interface SelectionSummary {
  sum: number;
  count: number;
}

interface UseExcelDragSelectionProps<T> {
  data: T[];
}

const SELECTED_CLASS = 'exc-sel';
const CELL_ATTR = 'data-cellid';

// Inject CSS once globally
let cssInjected = false;
function injectCSS() {
  if (cssInjected) return;
  cssInjected = true;
  const style = document.createElement('style');
  style.textContent = `
    .${SELECTED_CLASS} {
      background-color: rgba(25, 118, 210, 0.12) !important;
      outline: 1.5px solid rgba(25, 118, 210, 0.5);
      outline-offset: -1px;
    }
  `;
  document.head.appendChild(style);
}

export function useExcelDragSelection<T>({ data }: UseExcelDragSelectionProps<T>) {
  const [summary, setSummary] = useState<SelectionSummary | null>(null);

  // All mutable state lives in refs — no React re-renders during drag
  const selectedSet = useRef(new Set<string>());
  const dragSnapshot = useRef(new Set<string>());
  const dragState = useRef<{ colKey: string; startIdx: number } | null>(null);
  const isDragging = useRef(false);
  const dataRef = useRef(data);
  dataRef.current = data;

  useEffect(() => { injectCSS(); }, []);

  // --- DOM helpers (no React involved) ---
  const addHighlight = useCallback((cellId: string) => {
    const el = document.querySelector(`[${CELL_ATTR}="${cellId}"]`);
    if (el) el.classList.add(SELECTED_CLASS);
  }, []);

  const removeHighlight = useCallback((cellId: string) => {
    const el = document.querySelector(`[${CELL_ATTR}="${cellId}"]`);
    if (el) el.classList.remove(SELECTED_CLASS);
  }, []);

  const clearAllHighlights = useCallback(() => {
    document.querySelectorAll(`.${SELECTED_CLASS}`).forEach(el => el.classList.remove(SELECTED_CLASS));
  }, []);

  // --- Compute summary from current selection (only called on mouseup / click) ---
  const computeSummary = useCallback(() => {
    const set = selectedSet.current;
    if (set.size === 0) {
      setSummary(null);
      return;
    }
    let sum = 0;
    let count = 0;
    set.forEach(cellId => {
      const sepIdx = cellId.indexOf(':');
      const rowIdx = Number(cellId.substring(0, sepIdx));
      const colKey = cellId.substring(sepIdx + 1);
      const rowData = dataRef.current[rowIdx];
      if (rowData) {
        const val = Number((rowData as any)[colKey]);
        if (!isNaN(val)) {
          sum += val;
          count++;
        }
      }
    });
    setSummary({ sum: Math.round(sum * 100) / 100, count });
  }, []);

  // --- Clear everything ---
  const clearSelection = useCallback(() => {
    selectedSet.current.clear();
    clearAllHighlights();
    setSummary(null);
  }, [clearAllHighlights]);

  // --- Global listeners ---
  useEffect(() => {
    const handleMouseUp = () => {
      if (isDragging.current) {
        isDragging.current = false;
        dragState.current = null;
        document.body.style.userSelect = '';
        // NOW compute summary (single state update)
        computeSummary();
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // If clicking outside numeric cells and the footer, clear
      if (!target.closest('.numeric-cell') && !target.closest('.sum-footer')) {
        if (selectedSet.current.size > 0) {
          clearSelection();
        }
      }
    };

    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mousedown', handleMouseDown);
    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousedown', handleMouseDown);
    };
  }, [computeSummary, clearSelection]);

  // --- Cell event handlers (these NEVER change reference) ---
  const handleCellMouseDown = useCallback((colKey: string, rowIndex: number, e: React.MouseEvent) => {
    isDragging.current = true;
    document.body.style.userSelect = 'none';
    const isCtrl = e.ctrlKey || e.metaKey;
    dragState.current = { colKey, startIdx: rowIndex };

    if (!isCtrl) {
      // Clear previous
      clearAllHighlights();
      selectedSet.current.clear();
    }
    dragSnapshot.current = new Set(selectedSet.current);

    const cellId = `${rowIndex}:${colKey}`;
    if (isCtrl && selectedSet.current.has(cellId)) {
      selectedSet.current.delete(cellId);
      dragSnapshot.current.delete(cellId);
      removeHighlight(cellId);
    } else {
      selectedSet.current.add(cellId);
      addHighlight(cellId);
    } // Live update summary
    computeSummary();
  }, [clearAllHighlights, removeHighlight, addHighlight, computeSummary]);

  const handleCellMouseEnter = useCallback((colKey: string, rowIndex: number) => {
    if (!isDragging.current || !dragState.current) return;
    const { colKey: startCol, startIdx } = dragState.current;
    if (startCol !== colKey) return; // only same column

    // Rebuild from snapshot
    const newSet = new Set(dragSnapshot.current);
    const minIdx = Math.min(startIdx, rowIndex);
    const maxIdx = Math.max(startIdx, rowIndex);
    for (let i = minIdx; i <= maxIdx; i++) {
      newSet.add(`${i}:${colKey}`);
    }

    // Diff: remove highlights no longer in set, add new ones
    selectedSet.current.forEach(id => {
      if (!newSet.has(id)) removeHighlight(id);
    });
    newSet.forEach(id => {
      if (!selectedSet.current.has(id)) addHighlight(id);
    });

    selectedSet.current = newSet;
    
    // Live update summary
    computeSummary();
  }, [removeHighlight, addHighlight, computeSummary]);

  // --- Returns stable functions that attach data-attributes + event handlers ---
  // getCellProps is now ULTRA lightweight — no dependency on selectedCells state
  const getCellProps = useCallback((colKey: string, rowIndex: number, isNumeric: boolean) => {
    if (!isNumeric) return {};
    const cellId = `${rowIndex}:${colKey}`;
    return {
      className: 'numeric-cell',
      [CELL_ATTR]: cellId,
      onMouseDown: (e: React.MouseEvent) => handleCellMouseDown(colKey, rowIndex, e),
      onMouseEnter: () => handleCellMouseEnter(colKey, rowIndex),
      style: { userSelect: 'none' as const, cursor: 'cell' }
    };
  }, [handleCellMouseDown, handleCellMouseEnter]);

  return {
    selectionSummary: summary,
    removeCellSelection: clearSelection,
    getCellProps
  };
}
