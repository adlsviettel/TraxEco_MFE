import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  IconButton,
  Typography,
  Tooltip,
  Dialog,
  Chip,
  Fade,
  Slider,
  Stack,
} from '@mui/material';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import RotateRightIcon from '@mui/icons-material/RotateRight';
import CloseIcon from '@mui/icons-material/Close';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import FitScreenIcon from '@mui/icons-material/FitScreen';
import { rdItemApi } from '../services/rdMaterialApi';

export interface ImageZoomModalProps {
  open: boolean;
  onClose: () => void;
  images: string | string[];
  initialIndex?: number;
  title?: string;
}

export const ImageZoomModal: React.FC<ImageZoomModalProps> = ({
  open,
  onClose,
  images,
  initialIndex = 0,
  title,
}) => {
  const imageList: string[] = React.useMemo(() => {
    if (!images) return [];
    const arr = Array.isArray(images) ? images : [images];
    return arr
      .map(img => (typeof img === 'string' ? img.replace(/^"|"$/g, '').trim() : ''))
      .filter(img => img && img !== 'null' && img !== 'undefined');
  }, [images]);

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState<number>(1);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [rotation, setRotation] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Keep fresh values in refs for native event listeners without stale closure
  const scaleRef = useRef(scale);
  scaleRef.current = scale;
  const positionRef = useRef(position);
  positionRef.current = position;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; posX: number; posY: number; hasMoved: boolean }>({
    mouseX: 0,
    mouseY: 0,
    posX: 0,
    posY: 0,
    hasMoved: false,
  });

  const touchStartRef = useRef<{
    touches: number;
    dist: number;
    posX: number;
    posY: number;
    clientX: number;
    clientY: number;
  }>({ touches: 0, dist: 0, posX: 0, posY: 0, clientX: 0, clientY: 0 });

  // Reset transform state when switching images or opening
  const resetTransform = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setRotation(0);
  }, []);

  useEffect(() => {
    if (open) {
      setCurrentIndex(Math.min(Math.max(0, initialIndex), Math.max(0, imageList.length - 1)));
      resetTransform();
    }
  }, [open, initialIndex, imageList.length, resetTransform]);

  const handleNext = useCallback(() => {
    if (imageList.length <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % imageList.length);
    resetTransform();
  }, [imageList.length, resetTransform]);

  const handlePrev = useCallback(() => {
    if (imageList.length <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + imageList.length) % imageList.length);
    resetTransform();
  }, [imageList.length, resetTransform]);

  const handleZoomIn = useCallback(() => {
    setScale((prev) => Math.min(prev * 1.3, 8));
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale((prev) => {
      const next = Math.max(prev / 1.3, 0.5);
      if (next <= 1) {
        setPosition({ x: 0, y: 0 });
      }
      return next;
    });
  }, []);

  const handleRotate = useCallback(() => {
    setRotation((prev) => (prev + 90) % 360);
  }, []);

  // Keyboard navigation & controls
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === '+' || e.key === '=') {
        handleZoomIn();
      } else if (e.key === '-' || e.key === '_') {
        handleZoomOut();
      } else if (e.key === '0' || e.key === 'r' || e.key === 'R') {
        resetTransform();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose, handleNext, handlePrev, handleZoomIn, handleZoomOut, resetTransform]);

  // Non-passive wheel handler that calculates cursor-centered zoom
  const handleNativeWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const currentScale = scaleRef.current;
    const currentPos = positionRef.current;

    const factor = e.deltaY < 0 ? 1.25 : 0.8;
    const targetScale = Math.min(Math.max(currentScale * factor, 0.5), 10);
    if (Math.abs(targetScale - currentScale) < 0.001) return;

    const effectiveFactor = targetScale / currentScale;
    const mouseX = e.clientX - rect.left - rect.width / 2;
    const mouseY = e.clientY - rect.top - rect.height / 2;

    const newX = mouseX - (mouseX - currentPos.x) * effectiveFactor;
    const newY = mouseY - (mouseY - currentPos.y) * effectiveFactor;

    // Immediately update refs synchronously so rapid wheel ticks accumulate properly
    scaleRef.current = targetScale;
    positionRef.current = targetScale <= 1 ? { x: 0, y: 0 } : { x: newX, y: newY };

    setScale(targetScale);
    setPosition(targetScale <= 1 ? { x: 0, y: 0 } : { x: newX, y: newY });
  }, []);

  // Attach non-passive wheel listener on window while modal is open
  useEffect(() => {
    if (!open) return;
    const wheelListener = (e: WheelEvent) => {
      handleNativeWheel(e);
    };
    window.addEventListener('wheel', wheelListener, { passive: false });
    return () => window.removeEventListener('wheel', wheelListener);
  }, [open, handleNativeWheel]);

  // Callback ref for container
  const setContainerRef = useCallback(
    (node: HTMLDivElement | null) => {
      containerRef.current = node;
    },
    []
  );

  // Mouse drag handlers with window-level listeners
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only primary click
    setIsDragging(true);
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      posX: position.x,
      posY: position.y,
      hasMoved: false,
    };
  };

  useEffect(() => {
    if (!isDragging) return;
    const onMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - dragStartRef.current.mouseX;
      const dy = e.clientY - dragStartRef.current.mouseY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        dragStartRef.current.hasMoved = true;
      }
      const newPos = {
        x: dragStartRef.current.posX + dx,
        y: dragStartRef.current.posY + dy,
      };
      positionRef.current = newPos;
      setPosition(newPos);
    };
    const onMouseUp = () => {
      setIsDragging(false);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isDragging]);

  // Click on viewport: step zoom in (or reset if zoomed far)
  const handleViewportClick = (e: React.MouseEvent) => {
    if (dragStartRef.current.hasMoved) return; // Ignore drag release
    
    const rect = containerRef.current?.getBoundingClientRect();
    if (scale >= 4.5) {
      resetTransform();
    } else {
      const targetScale = scale < 1.4 ? 2 : (scale < 2.8 ? 3.5 : 5);
      if (rect) {
        const mouseX = e.clientX - rect.left - rect.width / 2;
        const mouseY = e.clientY - rect.top - rect.height / 2;
        const factor = targetScale / scale;
        const newX = mouseX - (mouseX - position.x) * factor;
        const newY = mouseY - (mouseY - position.y) * factor;
        scaleRef.current = targetScale;
        positionRef.current = { x: newX, y: newY };
        setScale(targetScale);
        setPosition({ x: newX, y: newY });
      } else {
        scaleRef.current = targetScale;
        setScale(targetScale);
      }
    }
  };

  // Double click to toggle 1x and 2.5x zoom
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (scale > 1.2) {
      resetTransform();
    } else {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const mouseX = e.clientX - rect.left - rect.width / 2;
        const mouseY = e.clientY - rect.top - rect.height / 2;
        const targetScale = 2.5;
        const factor = targetScale / scale;
        setPosition({
          x: mouseX - (mouseX - position.x) * factor,
          y: mouseY - (mouseY - position.y) * factor,
        });
        setScale(targetScale);
      } else {
        setScale(2.5);
      }
    }
  };

  // Touch handlers for mobile / tablet
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartRef.current = {
        touches: 1,
        dist: 0,
        posX: position.x,
        posY: position.y,
        clientX: e.touches[0].clientX,
        clientY: e.touches[0].clientY,
      };
      setIsDragging(true);
    } else if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchStartRef.current = {
        touches: 2,
        dist,
        posX: position.x,
        posY: position.y,
        clientX: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        clientY: (e.touches[0].clientY + e.touches[1].clientY) / 2,
      };
      setIsDragging(false);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && touchStartRef.current.touches === 1) {
      const dx = e.touches[0].clientX - touchStartRef.current.clientX;
      const dy = e.touches[0].clientY - touchStartRef.current.clientY;
      setPosition({
        x: touchStartRef.current.posX + dx,
        y: touchStartRef.current.posY + dy,
      });
    } else if (e.touches.length === 2 && touchStartRef.current.touches === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      if (touchStartRef.current.dist > 0) {
        const factor = dist / touchStartRef.current.dist;
        setScale((prev) => Math.min(Math.max(prev * factor, 0.5), 8));
        touchStartRef.current.dist = dist;
      }
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    touchStartRef.current.touches = 0;
  };

  if (!open || imageList.length === 0) return null;

  const currentRaw = imageList[currentIndex];
  const fullUrl = rdItemApi.getImageUrl(currentRaw);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen
      TransitionComponent={Fade}
      transitionDuration={150}
      PaperProps={{
        sx: {
          bgcolor: 'rgba(8, 12, 18, 0.96)',
          backdropFilter: 'blur(12px)',
          m: 0,
          width: '100vw',
          height: '100vh',
          maxWidth: 'none',
          maxHeight: 'none',
          borderRadius: 0,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 999999,
        },
      }}
      sx={{ zIndex: 999999 }}
    >
      {/* ── Top Bar Header ── */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 40,
          height: 64,
          px: { xs: 2, sm: 3 },
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0) 100%)',
          pointerEvents: 'none',
        }}
      >
        {/* Left: Info / Title / Counter */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pointerEvents: 'auto' }}>
          {imageList.length > 1 && (
            <Chip
              size="small"
              label={`${currentIndex + 1} / ${imageList.length}`}
              sx={{
                bgcolor: 'rgba(255,255,255,0.18)',
                color: '#fff',
                fontWeight: 700,
                fontSize: 12.5,
                backdropFilter: 'blur(6px)',
                border: '1px solid rgba(255,255,255,0.15)',
              }}
            />
          )}
          {title && (
            <Typography
              sx={{
                color: 'rgba(255,255,255,0.95)',
                fontSize: 15,
                fontWeight: 600,
                display: { xs: 'none', sm: 'block' },
                maxWidth: 400,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {title}
            </Typography>
          )}
        </Box>

        {/* Right: Actions (Open original & Close) */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pointerEvents: 'auto' }}>
          <Tooltip title="Mở ảnh gốc trong tab mới">
            <IconButton
              size="small"
              onClick={() => window.open(fullUrl, '_blank')}
              sx={{
                color: '#fff',
                bgcolor: 'rgba(255,255,255,0.12)',
                border: '1px solid rgba(255,255,255,0.15)',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' },
              }}
            >
              <OpenInNewIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <Tooltip title="Đóng (Esc)">
            <IconButton
              onClick={onClose}
              sx={{
                color: '#fff',
                bgcolor: 'rgba(239, 68, 68, 0.25)',
                border: '1px solid rgba(239, 68, 68, 0.5)',
                '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.85)', borderColor: 'rgba(239, 68, 68, 1)' },
              }}
            >
              <CloseIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* ── Main Viewport Container ── */}
      <Box
        ref={setContainerRef}
        onMouseDown={handleMouseDown}
        onClick={handleViewportClick}
        onDoubleClick={handleDoubleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        sx={{
          flex: 1,
          width: '100%',
          height: '100%',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in',
          userSelect: 'none',
        }}
      >
        <Box
          component="img"
          src={fullUrl}
          alt={title || `Image ${currentIndex + 1}`}
          draggable={false}
          sx={{
            maxWidth: '92vw',
            maxHeight: imageList.length > 1 ? 'calc(80vh - 80px)' : '82vh',
            objectFit: 'contain',
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
            transformOrigin: 'center center',
            transition: isDragging ? 'none' : 'transform 0.12s ease-out',
            willChange: 'transform',
            pointerEvents: 'none',
            filter: 'drop-shadow(0 15px 35px rgba(0,0,0,0.6))',
          }}
        />

        {/* Previous Image Arrow */}
        {imageList.length > 1 && (
          <IconButton
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            sx={{
              position: 'absolute',
              left: { xs: 8, sm: 24 },
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 30,
              bgcolor: 'rgba(15, 20, 30, 0.75)',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.15)',
              p: { xs: 1, sm: 1.5 },
              backdropFilter: 'blur(8px)',
              '&:hover': { bgcolor: 'rgba(34, 197, 94, 0.85)', borderColor: '#22c55e' },
            }}
          >
            <NavigateBeforeIcon sx={{ fontSize: { xs: 28, sm: 36 } }} />
          </IconButton>
        )}

        {/* Next Image Arrow */}
        {imageList.length > 1 && (
          <IconButton
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            sx={{
              position: 'absolute',
              right: { xs: 8, sm: 24 },
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 30,
              bgcolor: 'rgba(15, 20, 30, 0.75)',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.15)',
              p: { xs: 1, sm: 1.5 },
              backdropFilter: 'blur(8px)',
              '&:hover': { bgcolor: 'rgba(34, 197, 94, 0.85)', borderColor: '#22c55e' },
            }}
          >
            <NavigateNextIcon sx={{ fontSize: { xs: 28, sm: 36 } }} />
          </IconButton>
        )}
      </Box>

      {/* ── Floating Interactive Zoom Toolbar (Center Bottom) ── */}
      <Box
        sx={{
          position: 'absolute',
          bottom: imageList.length > 1 ? 92 : 28,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 40,
          bgcolor: 'rgba(15, 20, 30, 0.88)',
          border: '1px solid rgba(255,255,255,0.16)',
          borderRadius: 4,
          px: 2,
          py: 0.75,
          backdropFilter: 'blur(16px)',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          gap: { xs: 1, sm: 1.5 },
        }}
      >
        <Tooltip title="Thu nhỏ (-)">
          <span>
            <IconButton
              size="small"
              onClick={handleZoomOut}
              disabled={scale <= 0.5}
              sx={{ color: '#fff', '&:disabled': { color: 'rgba(255,255,255,0.25)' } }}
            >
              <ZoomOutIcon />
            </IconButton>
          </span>
        </Tooltip>

        {/* Zoom Slider */}
        <Box sx={{ width: { xs: 90, sm: 140 }, mx: 0.5 }}>
          <Slider
            size="small"
            value={Math.round(scale * 100)}
            min={50}
            max={600}
            step={10}
            onChange={(_, val) => {
              const targetScale = (val as number) / 100;
              setScale(targetScale);
              if (targetScale <= 1) setPosition({ x: 0, y: 0 });
            }}
            sx={{
              color: '#22c55e',
              '& .MuiSlider-thumb': {
                width: 14,
                height: 14,
                bgcolor: '#fff',
                '&:hover, &.Mui-focusVisible': { boxShadow: '0 0 0 6px rgba(34, 197, 94, 0.3)' },
              },
            }}
          />
        </Box>

        <Tooltip title="Phóng to (+)">
          <span>
            <IconButton
              size="small"
              onClick={handleZoomIn}
              disabled={scale >= 8}
              sx={{ color: '#fff', '&:disabled': { color: 'rgba(255,255,255,0.25)' } }}
            >
              <ZoomInIcon />
            </IconButton>
          </span>
        </Tooltip>

        {/* Percentage badge */}
        <Tooltip title="Đặt lại 100% (Nhấp để reset)">
          <Chip
            size="small"
            label={`${Math.round(scale * 100)}%`}
            onClick={resetTransform}
            sx={{
              bgcolor: scale === 1 ? 'rgba(255,255,255,0.12)' : 'rgba(34, 197, 94, 0.25)',
              color: scale === 1 ? 'rgba(255,255,255,0.9)' : '#4ade80',
              fontWeight: 700,
              fontSize: 12,
              height: 26,
              cursor: 'pointer',
              border: scale === 1 ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(74, 222, 128, 0.45)',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.22)' },
            }}
          />
        </Tooltip>

        <Box sx={{ width: '1px', height: 20, bgcolor: 'rgba(255,255,255,0.18)', mx: 0.5 }} />

        <Tooltip title="Xoay 90°">
          <IconButton size="small" onClick={handleRotate} sx={{ color: '#fff' }}>
            <RotateRightIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Tooltip title="Vừa màn hình (Fit 100%)">
          <IconButton size="small" onClick={resetTransform} sx={{ color: '#fff' }}>
            <FitScreenIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* ── Bottom Thumbnails Carousel (If > 1 image) ── */}
      {imageList.length > 1 && (
        <Box
          sx={{
            height: 76,
            flexShrink: 0,
            bgcolor: 'rgba(12, 16, 24, 0.95)',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1.5,
            px: 2,
            overflowX: 'auto',
            zIndex: 40,
            '&::-webkit-scrollbar': { height: 4 },
            '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(255,255,255,0.2)', borderRadius: 2 },
          }}
        >
          {imageList.map((img, idx) => {
            const thumbUrl = rdItemApi.getImageUrl(img);
            const isActive = idx === currentIndex;
            return (
              <Box
                key={idx}
                onClick={() => {
                  setCurrentIndex(idx);
                  resetTransform();
                }}
                sx={{
                  width: 52,
                  height: 52,
                  flexShrink: 0,
                  borderRadius: 1.5,
                  overflow: 'hidden',
                  cursor: 'pointer',
                  border: isActive ? '2px solid #22c55e' : '1px solid rgba(255,255,255,0.15)',
                  boxShadow: isActive ? '0 0 10px rgba(34, 197, 94, 0.5)' : 'none',
                  opacity: isActive ? 1 : 0.5,
                  transform: isActive ? 'scale(1.05)' : 'scale(1)',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  bgcolor: '#1a1f2c',
                  '&:hover': {
                    opacity: 1,
                    borderColor: isActive ? '#22c55e' : 'rgba(255,255,255,0.4)',
                  },
                }}
              >
                <img
                  src={thumbUrl}
                  alt={`Thumbnail ${idx + 1}`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </Box>
            );
          })}
        </Box>
      )}
    </Dialog>
  );
};

export default ImageZoomModal;
