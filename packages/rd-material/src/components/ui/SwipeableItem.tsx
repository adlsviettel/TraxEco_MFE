import React, { useState, useRef, useEffect } from 'react';
import { Box, Typography } from '@mui/material';

export interface SwipeAction {
  label: string;
  icon: React.ReactNode;
  color: string;
  onClick: () => void;
}

export interface SwipeableItemProps {
  children: React.ReactNode;
  rightActions?: SwipeAction[];
  onSwipeRight?: () => void;
  swipeRightLabel?: string;
  swipeRightIcon?: React.ReactNode;
  swipeRightColor?: string;
}

const SwipeableItem: React.FC<SwipeableItemProps> = ({ 
  children, 
  rightActions = [], 
  onSwipeRight,
  swipeRightLabel = 'Open Details',
  swipeRightIcon,
  swipeRightColor = '#3b82f6'
}) => {
  const [translateX, setTranslateX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const startXRef = useRef<number | null>(null);
  const startYRef = useRef<number | null>(null);
  const currentXRef = useRef<number>(0);
  const isHorizontalSwipeRef = useRef<boolean | null>(null);

  const ACTIONS_WIDTH = rightActions.length * 70; // 70px per action
  const SWIPE_THRESHOLD = 60;

  const handleTouchStart = (e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    startYRef.current = e.touches[0].clientY;
    setIsSwiping(true);
    isHorizontalSwipeRef.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startXRef.current === null || startYRef.current === null) return;

    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = currentX - startXRef.current;
    const diffY = currentY - startYRef.current;

    if (isHorizontalSwipeRef.current === null) {
      if (Math.abs(diffX) > Math.abs(diffY)) {
        isHorizontalSwipeRef.current = true;
      } else {
        isHorizontalSwipeRef.current = false;
      }
    }

    if (isHorizontalSwipeRef.current) {
      let newTranslateX = currentXRef.current + diffX;

      // Limit swiping right (left-to-right) if no onSwipeRight action
      if (!onSwipeRight && newTranslateX > 0) newTranslateX = 0;
      
      // Limit left swipe to actions width + a bit of resistance padding
      if (newTranslateX < -ACTIONS_WIDTH - 20) {
        newTranslateX = -ACTIONS_WIDTH - 20;
      }

      setTranslateX(newTranslateX);
    }
  };

  const handleTouchEnd = () => {
    setIsSwiping(false);
    startXRef.current = null;
    startYRef.current = null;
    isHorizontalSwipeRef.current = null;

    if (translateX < -SWIPE_THRESHOLD && rightActions.length > 0) {
      // Snap to open right actions
      setTranslateX(-ACTIONS_WIDTH);
      currentXRef.current = -ACTIONS_WIDTH;
    } else if (translateX > SWIPE_THRESHOLD && onSwipeRight) {
      // Trigger left-to-right action
      onSwipeRight();
      // Snap back
      setTranslateX(0);
      currentXRef.current = 0;
    } else {
      // Snap back to 0
      setTranslateX(0);
      currentXRef.current = 0;
    }
  };

  // Close when tapping outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (currentXRef.current < 0) {
        setTranslateX(0);
        currentXRef.current = 0;
      }
    };
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <Box 
      sx={{ 
        position: 'relative', 
        width: '100%', 
        flexShrink: 0,
        overflow: 'hidden',
        borderRadius: 2,
        bgcolor: translateX > 0 ? swipeRightColor : '#f8fafc',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        touchAction: 'pan-y'
      }}
    >
      {/* Background Underneath: Right Actions (Swipe Left) */}
      <Box 
        sx={{ 
          position: 'absolute', 
          top: 0, bottom: 0, right: 0, 
          display: 'flex', 
          alignItems: 'stretch',
          opacity: translateX < 0 ? 1 : 0,
          zIndex: 0,
        }}
      >
        {rightActions.map((action, idx) => (
          <Box
            key={idx}
            onClick={(e) => { 
              e.stopPropagation(); 
              action.onClick(); 
              setTranslateX(0); 
              currentXRef.current = 0; 
            }}
            sx={{
              width: 70,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: action.color,
              color: '#fff',
              cursor: 'pointer',
              '&:active': { filter: 'brightness(0.9)' }
            }}
          >
            {action.icon}
            <Typography variant="caption" sx={{ fontSize: 10, fontWeight: 700, mt: 0.5, textTransform: 'uppercase' }}>
              {action.label}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* Background Underneath: Left Action (Swipe Right) */}
      {onSwipeRight && (
        <Box 
          sx={{ 
            position: 'absolute', 
            top: 0, bottom: 0, left: 0, 
            display: 'flex', 
            alignItems: 'center',
            px: 3,
            color: '#fff',
            opacity: translateX > 0 ? 1 : 0,
            zIndex: 0,
          }}
        >
          {swipeRightIcon}
          <Typography variant="button" sx={{ ml: 1, fontWeight: 700 }}>
            {swipeRightLabel}
          </Typography>
        </Box>
      )}

      {/* Foreground Content */}
      <Box
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={(e) => {
          if (translateX < 0) {
            e.stopPropagation();
            setTranslateX(0);
            currentXRef.current = 0;
          }
        }}
        sx={{
          transform: `translateX(${translateX}px)`,
          transition: isSwiping ? 'none' : 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          bgcolor: '#fff',
          position: 'relative',
          zIndex: 1,
          height: '100%',
          border: '1px solid rgba(0,0,0,0.06)',
          borderRadius: 2,
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default SwipeableItem;
