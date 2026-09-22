import React, { useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import { QRCodeSVG } from 'qrcode.react';
import type { Item, GarmentSampleTagConfig, GarmentTagSpecialPropertyItem } from '../types';
import { getItemQrValue } from './A4StickerSheet';

interface GarmentSampleTagProps {
  item: Item;
  config?: GarmentSampleTagConfig;
  showCutLines?: boolean;
  qrValue?: string;
  isActive?: boolean;
  onClick?: () => void;
}

export const GarmentSampleTag = React.memo<GarmentSampleTagProps>(
  ({
    item,
    config,
    showCutLines = true,
    qrValue,
    isActive = false,
    onClick,
  }) => {
    const qr = qrValue || getItemQrValue(item);
    const prod = item.product || {};

    const qrSvg = useMemo(() => (
      <QRCodeSVG value={qr} size={34} level="M" />
    ), [qr]);

  // 1. Header values
  const styleNo = prod.styleNo || item.itemCode || '—';

  // 2. General Information
  const project = prod.projectName || item.name || '—';
  const currentDateStr = new Date().toISOString().split('T')[0];
  const date = config?.date || currentDateStr;
  const styleName = prod.styleName || item.name || '—';
  const sportCategory = prod.sportCategory || item.category || '—';
  const sampleStage = prod.sampleStage || '—';
  const size = prod.size || '—';

  // 3. Fabrics (only display actively selected / configured slots)
  const activeFabrics = useMemo(() => {
    const list = config?.fabrics && config.fabrics.length > 0
      ? config.fabrics
      : [
          {
            slot: 'A' as const,
            label: 'Fabric A- Body',
            detail: [
              item.supplierName,
              item.itemCode,
              item.color,
              [item.fabric?.structure, item.fabric?.compositionDetail || item.fabric?.composition].filter(Boolean).join(' '),
              item.fabric?.weightGsm ? `${item.fabric.weightGsm}GSM` : '',
              item.fabric?.cuttableWidth ? `${item.fabric.cuttableWidth}"` : '',
            ].filter(Boolean).join('/ ') || '—'
          }
        ];
    return list.filter(f => f.detail && f.detail.trim() !== '');
  }, [config?.fabrics, item]);

  // 4. Special Property (multiple items supported)
  const baseUrl = (import.meta.env.BASE_URL || '/').replace(/\/$/, '') + '/';
  const specialPropertiesList: GarmentTagSpecialPropertyItem[] = useMemo(() => {
    if (config?.specialProperties && Array.isArray(config.specialProperties)) {
      return config.specialProperties;
    }
    if (config?.specialProperty?.name) {
      return [config.specialProperty];
    }
    return [
      {
        id: 'prop-water-repellent',
        name: 'Water repellent',
        iconUrl: `${baseUrl}sample-tag/water_repellency.png`,
      }
    ];
  }, [config?.specialProperties, config?.specialProperty, baseUrl]);

  // Dynamic sizing based on number of selected properties to prevent any overflow
  const spCount = specialPropertiesList.length;
  const spGap = spCount >= 4 ? (spCount > 4 ? '1.2mm' : '1.6mm') : '3.5mm';
  const spIconHeight = spCount > 3 ? '6.8mm' : spCount === 3 ? '7.8mm' : '9.2mm';
  const spFontSize = spCount > 3 ? '4.6pt' : spCount === 3 ? '5.2pt' : '6.0pt';
  const spItemWidth = spCount >= 4 ? undefined : '22mm';
  const spFlex = spCount >= 4 ? 1 : '0 0 22mm';

  // 5. Technology
  const techName = config?.technology?.name || prod.technology || 'TEXTILE TO TEXTILE';
  const techIcon = config?.technology?.iconUrl || `${baseUrl}sample-tag/textile_to_textile.png`;

  // 6. Special Features
  const specialFeatures = config?.specialFeatures !== undefined
    ? config.specialFeatures
    : (item.description || item.remark || 'Innovation Click-TRAK® Magnetic Zipper, enables quick one-handed closure');

  return (
    <Box
      className={`garment-sample-tag ${isActive ? 'active-editing-tag' : ''}`}
      onClick={onClick}
      sx={{
        width: '96mm',
        height: '140mm',
        maxHeight: '140mm',
        boxSizing: 'border-box',
        bgcolor: '#ffffff',
        border: showCutLines ? '1px dashed #64748b' : '1px solid #000000',
        borderRadius: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
        pageBreakInside: 'avoid',
        fontFamily: 'Calibri, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        color: '#000000',
        lineHeight: 1.15,
        backgroundClip: 'padding-box',
        userSelect: 'none',
        outline: isActive ? '3.5px solid #16a34a' : 'none',
        outlineOffset: isActive ? '2px' : '0',
        boxShadow: isActive ? '0 0 0 2px #ffffff, 0 8px 24px rgba(22, 163, 74, 0.25)' : 'none',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'outline 0.12s ease, box-shadow 0.12s ease',
        zIndex: isActive ? 10 : 1,
        '&:hover': onClick && !isActive ? {
          outline: '2px dashed #3b82f6',
          outlineOffset: '1px',
        } : {},
        '@media print': {
          outline: 'none !important',
          boxShadow: 'none !important',
          cursor: 'default',
          zIndex: 'auto',
        }
      }}
    >
      {/* 1. Header (Logo left, Style No + QR code right) -> Divider 1 */}
      <Box
        sx={{
          height: '13mm',
          minHeight: '13mm',
          p: '1mm 2.5mm',
          borderBottom: '1.2px solid #000000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <img
          src={`${baseUrl}sample-tag/alliance_one_logo.png`}
          alt="Alliance One"
          style={{ height: '9.5mm', maxWidth: '42mm', objectFit: 'contain' }}
        />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '1.5mm' }}>
          <Typography sx={{ fontSize: '10.5pt', fontWeight: 800, color: '#000000', textAlign: 'right', letterSpacing: '-0.2px', lineHeight: 1.1 }}>
            {styleNo}
          </Typography>
          <Box sx={{ width: '9mm', height: '9mm', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {qrSvg}
          </Box>
        </Box>
      </Box>

      {/* 2. General Information (Rows 5-13) -> Divider 2 */}
      <Box
        sx={{
          p: '1.2mm 2.5mm',
          borderBottom: '1.2px solid #000000',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.6mm',
        }}
      >
        <Box sx={{ display: 'grid', gridTemplateColumns: '50% 50%' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <Typography sx={{ fontSize: '6.5pt', fontWeight: 800, color: '#000000', lineHeight: 1.1 }}>Project Name</Typography>
            <Typography sx={{ fontSize: '7.2pt', color: '#111111', lineHeight: 1.15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{project}</Typography>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <Typography sx={{ fontSize: '6.5pt', fontWeight: 800, color: '#000000', lineHeight: 1.1 }}>Date</Typography>
            <Typography sx={{ fontSize: '7.2pt', color: '#111111', lineHeight: 1.15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{date}</Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: '50% 50%' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <Typography sx={{ fontSize: '6.5pt', fontWeight: 800, color: '#000000', lineHeight: 1.1 }}>Style Name</Typography>
            <Typography sx={{ fontSize: '7.2pt', color: '#111111', lineHeight: 1.15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{styleName}</Typography>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <Typography sx={{ fontSize: '6.5pt', fontWeight: 800, color: '#000000', lineHeight: 1.1 }}>Sport Category / RBU</Typography>
            <Typography sx={{ fontSize: '7.2pt', color: '#111111', lineHeight: 1.15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sportCategory}</Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: '50% 50%' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <Typography sx={{ fontSize: '6.5pt', fontWeight: 800, color: '#000000', lineHeight: 1.1 }}>Sample Stage</Typography>
            <Typography sx={{ fontSize: '7.2pt', color: '#111111', lineHeight: 1.15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sampleStage}</Typography>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <Typography sx={{ fontSize: '6.5pt', fontWeight: 800, color: '#000000', lineHeight: 1.1 }}>Size</Typography>
            <Typography sx={{ fontSize: '7.2pt', color: '#111111', lineHeight: 1.15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{size}</Typography>
          </Box>
        </Box>
      </Box>

      {/* 3. FABRIC INFORMATION (Rows 15-28) - Only display selected/active fabrics */}
      <Box sx={{ flex: 1, p: '1.2mm 2.5mm', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Typography sx={{ fontSize: '8pt', fontWeight: 900, color: '#000000', letterSpacing: '0.3px', lineHeight: 1.1, mb: '0.5mm' }}>
          FABRIC INFORMATION
        </Typography>

        {activeFabrics.length === 0 ? (
          <Box sx={{ mb: '0.6mm' }}>
            <Typography sx={{ fontSize: '6.8pt', fontWeight: 800, color: '#000000', lineHeight: 1.1 }}>
              Fabric A- Body
            </Typography>
            <Typography sx={{ fontSize: '6.2pt', color: '#111111', lineHeight: 1.15 }}>
              —
            </Typography>
          </Box>
        ) : (
          activeFabrics.map((f, idx) => (
            <Box key={f.slot || idx} sx={{ mb: activeFabrics.length > 2 ? '0.5mm' : '0.8mm' }}>
              <Typography sx={{ fontSize: '6.8pt', fontWeight: 800, color: '#000000', lineHeight: 1.1 }}>
                {f.label}
              </Typography>
              <Typography
                sx={{
                  fontSize: '6.2pt',
                  color: '#111111',
                  lineHeight: 1.15,
                  wordBreak: 'break-word',
                  display: '-webkit-box',
                  WebkitLineClamp: activeFabrics.length === 1 ? 3 : 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {f.detail}
              </Typography>
            </Box>
          ))
        )}
      </Box>

      {/* 4. SPECIAL PROPERTY (Rows 30-33) - Image on top, text below */}
      <Box sx={{ height: '18.5mm', minHeight: '18.5mm', p: '0.8mm 2.5mm', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', overflow: 'hidden' }}>
        <Typography sx={{ fontSize: '8pt', fontWeight: 900, color: '#000000', letterSpacing: '0.3px', lineHeight: 1.1, mb: '0.4mm' }}>
          SPECIAL PROPERTY
        </Typography>
        {specialPropertiesList.length === 0 ? (
          <Typography sx={{ fontSize: '6.5pt', color: '#94a3b8', fontStyle: 'italic', mt: '1mm' }}>
            None
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', width: '100%', alignItems: 'flex-start', justifyContent: 'flex-start', gap: spGap, boxSizing: 'border-box' }}>
            {specialPropertiesList.map((prop, idx) => (
              <Box
                key={prop.id || `prop-${idx}`}
                sx={{
                  flex: spFlex,
                  width: spItemWidth,
                  maxWidth: spItemWidth,
                  minWidth: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  textAlign: 'center',
                  px: '0.3mm',
                  boxSizing: 'border-box',
                }}
              >
                {prop.iconUrl && (
                  <img
                    src={prop.iconUrl}
                    alt={prop.name}
                    style={{
                      height: spIconHeight,
                      width: 'auto',
                      maxHeight: spIconHeight,
                      maxWidth: '100%',
                      objectFit: 'contain',
                      marginBottom: '0.4mm',
                    }}
                  />
                )}
                <Typography
                  sx={{
                    fontSize: spFontSize,
                    fontWeight: 700,
                    color: '#111111',
                    lineHeight: 1.08,
                    textAlign: 'center',
                    wordBreak: 'break-word',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    width: '100%',
                  }}
                >
                  {prop.name}
                </Typography>
              </Box>
            ))}
          </Box>
        )}
      </Box>

      {/* 5. TECHNOLOGY (Rows 34-37) -> Divider 3 (Row 37 bottom) */}
      <Box sx={{ height: '17mm', minHeight: '17mm', p: '1mm 2.5mm', borderBottom: '1.2px solid #000000', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
        <Typography sx={{ fontSize: '8pt', fontWeight: 900, color: '#000000', letterSpacing: '0.3px', lineHeight: 1.1, mb: '0.5mm' }}>
          TECHNOLOGY
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '3mm', mt: '0.5mm' }}>
          {techIcon && (
            <img src={techIcon} alt="Technology Icon" style={{ height: '11.5mm', width: 'auto', objectFit: 'contain', flexShrink: 0 }} />
          )}
          <Typography sx={{ fontSize: '7.2pt', fontWeight: 700, color: '#111111', lineHeight: 1.15 }}>
            {techName}
          </Typography>
        </Box>
      </Box>

      {/* 6. SPECIAL FEATURES (Rows 39-46) -> Divider 4 (Row 47 bottom) */}
      <Box sx={{ height: '15mm', minHeight: '15mm', p: '1.2mm 2.5mm', borderBottom: '1.2px solid #000000', overflow: 'hidden' }}>
        <Typography sx={{ fontSize: '8pt', fontWeight: 900, color: '#000000', letterSpacing: '0.3px', lineHeight: 1.1, mb: '0.5mm' }}>
          SPECIAL FEATURES
        </Typography>
        <Typography sx={{ fontSize: '6.5pt', color: '#111111', lineHeight: 1.2, wordBreak: 'break-word', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {specialFeatures}
        </Typography>
      </Box>

      {/* 7. Footer Banner (Rows 48-49) */}
      <Box sx={{ height: '11mm', minHeight: '11mm', p: '0.5mm 2mm', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <img
          src={`${baseUrl}sample-tag/sample_tag_footer.png`}
          alt="SAMPLE TAG"
          style={{ height: '100%', width: '100%', objectFit: 'contain' }}
        />
      </Box>
    </Box>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.item === nextProps.item &&
    prevProps.config === nextProps.config &&
    prevProps.showCutLines === nextProps.showCutLines &&
    prevProps.qrValue === nextProps.qrValue &&
    prevProps.isActive === nextProps.isActive
  );
});

GarmentSampleTag.displayName = 'GarmentSampleTag';

export default GarmentSampleTag;
