import React, { useRef, useEffect } from 'react';
import { Fab } from '@mui/material';
import type { FabProps } from '@mui/material';

interface DraggableFabProps extends FabProps {
  initialBottom?: number;
  initialRight?: number;
}

export const DraggableFab: React.FC<DraggableFabProps> = ({ 
  children, 
  initialBottom = 80, 
  initialRight = 16, 
  sx, 
  onClick, 
  ...props 
}) => {
  const fabRef = useRef<HTMLButtonElement>(null);
  const isDragging = useRef(false);
  const position = useRef({ x: 0, y: 0 });
  const startPos = useRef({ x: 0, y: 0 });
  const hasMoved = useRef(false);

  useEffect(() => {
    // Load saved position on mount
    const savedPos = sessionStorage.getItem('draggable_fab_pos');
    if (savedPos && fabRef.current) {
      try {
        const parsed = JSON.parse(savedPos);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          position.current = parsed;
          fabRef.current.style.transition = 'none'; // Disable transition for initial snap
          fabRef.current.style.transform = `translate(${parsed.x}px, ${parsed.y}px)`;
        }
      } catch (e) {
        // Ignore parse error
      }
    }

    const handleMove = (e: TouchEvent | MouseEvent) => {
      if (!isDragging.current || !fabRef.current) return;
      
      let clientX, clientY;
      if ('touches' in e) {
        clientX = (e as TouchEvent).touches[0].clientX;
        clientY = (e as TouchEvent).touches[0].clientY;
      } else {
        clientX = (e as MouseEvent).clientX;
        clientY = (e as MouseEvent).clientY;
      }

      const dx = clientX - startPos.current.x;
      const dy = clientY - startPos.current.y;

      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        hasMoved.current = true;
      }

      position.current.x += dx;
      position.current.y += dy;
      
      startPos.current = { x: clientX, y: clientY };
      
      fabRef.current.style.transform = `translate(${position.current.x}px, ${position.current.y}px)`;
    };

    const handleUp = () => {
      isDragging.current = false;
      
      if (fabRef.current && hasMoved.current) {
        const rect = fabRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const screenWidth = window.innerWidth;
        
        let targetX = position.current.x;
        // Snap to left or right
        if (centerX < screenWidth / 2) {
          targetX = position.current.x + 16 - rect.left;
        } else {
          targetX = position.current.x + (screenWidth - 16) - rect.right;
        }

        let targetY = position.current.y;
        const screenHeight = window.innerHeight;
        const safeTop = 80; // Below AppBar
        const safeBottom = screenHeight - 96; // Above BottomNav

        if (rect.top < safeTop) {
          targetY = position.current.y + safeTop - rect.top;
        } else if (rect.bottom > safeBottom) {
          targetY = position.current.y + safeBottom - rect.bottom;
        }

        position.current.x = targetX;
        position.current.y = targetY;
        
        fabRef.current.style.transition = 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
        fabRef.current.style.transform = `translate(${targetX}px, ${targetY}px)`;
        
        // Save to sessionStorage
        sessionStorage.setItem('draggable_fab_pos', JSON.stringify({ x: targetX, y: targetY }));
      }

      // Slight delay before allowing click to process
      setTimeout(() => {
        if (!isDragging.current) {
          // Keep hasMoved as true for a tick so click handler can catch it
        }
      }, 50);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleUp);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleUp);
    };
  }, []);

  const handleDown = (e: React.MouseEvent | React.TouchEvent) => {
    isDragging.current = true;
    hasMoved.current = false;
    if (fabRef.current) {
      fabRef.current.style.transition = 'none';
    }
    if ('touches' in e) {
      startPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else {
      startPos.current = { x: (e as React.MouseEvent).clientX, y: (e as React.MouseEvent).clientY };
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (hasMoved.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <Fab
      ref={fabRef}
      onMouseDown={handleDown}
      onTouchStart={handleDown}
      onClick={handleClick}
      sx={{
        ...sx,
        position: 'fixed',
        bottom: initialBottom,
        right: initialRight,
        zIndex: 1300,
        touchAction: 'none' // Prevent scrolling while dragging
      }}
      {...props}
    >
      {children}
    </Fab>
  );
};
