import React, { useState } from 'react';
import { Box, Typography } from '@mui/material';
import ImageIcon from '@mui/icons-material/Image';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import { rdItemApi } from '../services/rdMaterialApi';
import ImageZoomModal from './ImageZoomModal';

export interface ImageGalleryProps {
  images?: string | string[] | null;
  title?: string;
  aspectRatio?: string;
}

export const ImageGallery: React.FC<ImageGalleryProps> = ({
  images,
  title,
  aspectRatio = '4/5',
}) => {
  const [activeIdx, setActiveIdx] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);

  const validImages = React.useMemo(() => {
    if (!images) return [];
    const arr = Array.isArray(images)
      ? images
      : typeof images === 'string'
        ? images.split(',')
        : [];
    return arr
      .map(img => (typeof img === 'string' ? img.replace(/^['"]+|['"]+$/g, '').trim() : ''))
      .filter(img => img && img !== 'null' && img !== 'undefined' && img !== '""' && img !== "''");
  }, [images]);

  if (validImages.length === 0) {
    return (
      <Box
        sx={{
          width: '100%',
          aspectRatio,
          bgcolor: '#f3f4f6',
          borderRadius: 3,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#9ca3af',
          border: '1px dashed #e5e7eb',
        }}
      >
        <ImageIcon sx={{ fontSize: 48, mb: 1, opacity: 0.5 }} />
        <Typography variant="caption" fontWeight={500}>
          No Image
        </Typography>
      </Box>
    );
  }

  const safeIdx = Math.max(0, Math.min(activeIdx, validImages.length - 1));
  const currentImg = validImages[safeIdx];
  const currentUrl = rdItemApi.getImageUrl(currentImg);

  return (
    <Box>
      {/* ── Main Preview Image Card ── */}
      <Box
        sx={{
          width: '100%',
          aspectRatio,
          bgcolor: '#f8fafc',
          borderRadius: 3,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          cursor: 'zoom-in',
          position: 'relative',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
          '&:hover .overlay': { opacity: 1 },
          '&:hover img': { transform: 'scale(1.04)' },
        }}
        onClick={() => setZoomOpen(true)}
      >
        <img
          src={currentUrl}
          alt={title || `Image preview ${safeIdx + 1}`}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transition: 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />

        {/* Floating Zoom overlay badge */}
        <Box
          className="overlay"
          sx={{
            position: 'absolute',
            inset: 0,
            bgcolor: 'rgba(15, 23, 42, 0.25)',
            backdropFilter: 'blur(2px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 0,
            transition: 'all 0.2s ease',
          }}
        >
          <Box
            sx={{
              px: 2,
              py: 1,
              borderRadius: 5,
              bgcolor: 'rgba(255, 255, 255, 0.95)',
              color: '#0f172a',
              boxShadow: '0 8px 20px rgba(0, 0, 0, 0.15)',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            <ZoomInIcon fontSize="small" sx={{ color: '#16a34a' }} />
            <span>Click to zoom & inspect</span>
          </Box>
        </Box>
      </Box>

      {/* ── Thumbnails Row (if multiple images) ── */}
      {validImages.length > 1 && (
        <Box
          sx={{
            display: 'flex',
            gap: 1.5,
            pt: 2,
            overflowX: 'auto',
            '&::-webkit-scrollbar': { height: 4 },
            '&::-webkit-scrollbar-thumb': { bgcolor: '#cbd5e1', borderRadius: 2 },
          }}
        >
          {validImages.map((img, idx) => (
            <Box
              key={idx}
              onClick={() => setActiveIdx(idx)}
              sx={{
                width: 64,
                height: 64,
                flexShrink: 0,
                borderRadius: 2,
                overflow: 'hidden',
                cursor: 'pointer',
                border: safeIdx === idx ? '2px solid #22c55e' : '1px solid #e2e8f0',
                boxShadow: safeIdx === idx ? '0 0 8px rgba(34, 197, 94, 0.35)' : 'none',
                opacity: safeIdx === idx ? 1 : 0.65,
                transform: safeIdx === idx ? 'scale(1.02)' : 'scale(1)',
                transition: 'all 0.2s ease',
                bgcolor: '#f1f5f9',
                '&:hover': { opacity: 1, borderColor: safeIdx === idx ? '#22c55e' : '#94a3b8' },
              }}
            >
              <img
                src={rdItemApi.getImageUrl(img)}
                alt={`Thumb ${idx + 1}`}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </Box>
          ))}
        </Box>
      )}

      {/* ── Rich Zoom & Pan Lightbox Modal ── */}
      <ImageZoomModal
        open={zoomOpen}
        onClose={() => setZoomOpen(false)}
        images={validImages}
        initialIndex={safeIdx}
        title={title}
      />
    </Box>
  );
};

export default ImageGallery;
