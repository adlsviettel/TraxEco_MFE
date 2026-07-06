import { useRef, useEffect } from 'react';

export const useDragScroll = () => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let isDown = false;
    let startX: number;
    let startY: number;
    let scrollLeft: number;

    const isClickOnTextCharacter = (e: MouseEvent): boolean => {
      // 1. If the target is an interactive element, it is not dragging
      const target = e.target as HTMLElement;
      if (
        target.closest('button') ||
        target.closest('a') ||
        target.closest('input') ||
        target.closest('select') ||
        target.closest('.MuiSelect-select') ||
        target.closest('.action-buttons') ||
        target.closest('[role="button"]') ||
        target.closest('.MuiCheckbox-root')
      ) {
        return true;
      }

      // 2. Use document.caretRangeFromPoint to detect if coordinates are directly over text characters
      if (document.caretRangeFromPoint) {
        const range = document.caretRangeFromPoint(e.clientX, e.clientY);
        if (range && range.startContainer.nodeType === Node.TEXT_NODE) {
          const rects = range.getClientRects();
          for (let i = 0; i < rects.length; i++) {
            const r = rects[i];
            // Add a small 4px horizontal & 2px vertical tolerance for a natural selection feel
            if (
              e.clientX >= r.left - 4 &&
              e.clientX <= r.right + 4 &&
              e.clientY >= r.top - 2 &&
              e.clientY <= r.bottom + 2
            ) {
              return true;
            }
          }
        }
      }
      return false;
    };

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;

      // Check if user clicked directly on text characters or interactive elements
      if (isClickOnTextCharacter(e)) {
        return;
      }

      isDown = true;
      startX = e.pageX - el.offsetLeft;
      startY = e.pageY - el.offsetTop;
      scrollLeft = el.scrollLeft;
    };

    const onMouseLeave = () => {
      if (!isDown) return;
      isDown = false;
      el.style.cursor = 'grab';
      el.style.removeProperty('user-select');
    };

    const onMouseUp = () => {
      if (!isDown) return;
      isDown = false;
      el.style.cursor = 'grab';
      el.style.removeProperty('user-select');
    };

    const onMouseMove = (e: MouseEvent) => {
      if (isDown) {
        e.preventDefault();
        const x = e.pageX - el.offsetLeft;
        const walkX = x - startX;
        el.style.cursor = 'grabbing';
        el.style.userSelect = 'none';
        el.scrollLeft = scrollLeft - walkX * 1.5;
      } else {
        // Dynamically change cursor based on whether mouse is directly over text
        if (isClickOnTextCharacter(e)) {
          el.style.cursor = 'text'; // standard text selection cursor
        } else {
          el.style.cursor = 'grab';
        }
      }
    };

    el.addEventListener('mousedown', onMouseDown);
    el.addEventListener('mouseleave', onMouseLeave);
    el.addEventListener('mouseup', onMouseUp);
    el.addEventListener('mousemove', onMouseMove);

    return () => {
      el.removeEventListener('mousedown', onMouseDown);
      el.removeEventListener('mouseleave', onMouseLeave);
      el.removeEventListener('mouseup', onMouseUp);
      el.removeEventListener('mousemove', onMouseMove);
    };
  }, []);

  return ref;
};
