import React from 'react';
import { Fab } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

interface DraggableFabProps {
  onClick: () => void;
}

export function DraggableFab({ onClick }: DraggableFabProps) {
  const fabRef = React.useRef<HTMLButtonElement>(null);
  
  const getViewport = () => {
    const parent = fabRef.current?.parentElement;
    return {
      width: parent ? parent.clientWidth : (window.innerWidth || 375),
      height: parent ? parent.clientHeight : (window.innerHeight || 600)
    };
  };

  const [position, setPosition] = React.useState({ 
    x: (window.innerWidth || 375) - 76, 
    y: (window.innerHeight || 600) - 200 
  });
  const [isDragging, setIsDragging] = React.useState(false);

  // Initialize position once parent ref is available
  React.useEffect(() => {
    const viewport = getViewport();
    setPosition({
      x: viewport.width - 72,
      y: viewport.height - 100
    });
  }, []);

  // Keep position within parent boundaries on resize
  React.useEffect(() => {
    const handleResize = () => {
      setPosition(pos => {
        const viewport = getViewport();
        const maxX = viewport.width - 72;
        const maxY = viewport.height - 72;
        return {
          x: Math.max(16, Math.min(pos.x, maxX)),
          y: Math.max(16, Math.min(pos.y, maxY))
        };
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    
    setIsDragging(false);
    const startX = e.clientX;
    const startY = e.clientY;
    const initialX = position.x;
    const initialY = position.y;
    let currentX = position.x;
    let currentY = position.y;
    let hasMoved = false;

    const onPointerMove = (moveEvent: PointerEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;

      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        hasMoved = true;
        setIsDragging(true);

        const newX = initialX + dx;
        const newY = initialY + dy;

        const viewport = getViewport();
        const maxX = viewport.width - 72; // FAB is 56px, leaves 16px margin
        const maxY = viewport.height - 72; // FAB is 56px, leaves 16px margin

        currentX = Math.max(16, Math.min(newX, maxX));
        currentY = Math.max(16, Math.min(newY, maxY));
        
        setPosition({
          x: currentX,
          y: currentY
        });
      }
    };

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);

      if (!hasMoved) {
        onClick();
      } else {
        // Snap to nearest horizontal edge
        const viewport = getViewport();
        const midX = viewport.width / 2;
        const snapX = currentX < midX ? 16 : viewport.width - 72;
        setPosition(pos => ({
          x: snapX,
          y: pos.y
        }));
      }
      setIsDragging(false);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  };

  return (
    <Fab
      ref={fabRef}
      color="primary"
      aria-label="add"
      onPointerDown={handlePointerDown}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
      sx={{
        position: 'absolute',
        bgcolor: '#2e7d32',
        color: '#fff',
        zIndex: 1250,
        boxShadow: '0 4px 14px rgba(46,125,50,0.4)',
        transition: isDragging ? 'none' : 'left 0.3s cubic-bezier(0.25, 0.8, 0.25, 1), top 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
        '&:hover': {
          bgcolor: '#1b5e20',
        },
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none'
      }}
    >
      <AddIcon />
    </Fab>
  );
}
