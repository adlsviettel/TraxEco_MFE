import React from 'react';
import { Box, Typography } from '@mui/material';
import { QRCodeSVG } from 'qrcode.react';
import { useTranslation } from 'react-i18next';
import type { Item, GarmentSampleTagConfig } from '../types';
import GarmentSampleTag from './GarmentSampleTag';

interface A4StickerSheetProps {
  items: Item[];
  showCutLines?: boolean;
  garmentConfigs?: Record<number, GarmentSampleTagConfig>;
  activeGarmentId?: number | null;
  onSelectGarment?: (id: number) => void;
}

export const getItemQrValue = (item: Item): string => {
  let prefix = 'IT';
  if (item.itemType === 'FABRIC') prefix = 'FB';
  else if (item.itemType === 'ACCESSORY') prefix = 'AC';
  else if (item.itemType === 'YARDAGE') prefix = 'YD';
  else if (item.itemType === 'PRODUCT') {
    prefix = (item as any).category?.toUpperCase() === 'MOCKUP' ? 'MK' : 'GM';
  } else if (item.itemType) {
    prefix = item.itemType.substring(0, 2).toUpperCase();
  }
  return `${prefix}-${item.id}`;
};

/**
 * Fabric Hanger Sticker (matches Excel specification)
 */
const FabricHangerSticker: React.FC<{ item: Item; qrValue: string; showCutLines?: boolean }> = ({ item, qrValue, showCutLines }) => {
  const gsm = item.fabric?.weightGsm ? `${item.fabric.weightGsm} GSM` : '';
  const width = item.fabric?.cuttableWidth ? `${item.fabric.cuttableWidth}"` : '';
  const spec = [gsm, width].filter(Boolean).join(' - ') || '—';
  const composition = item.fabric?.compositionDetail || item.fabric?.composition || item.fabric?.content || item.specification || '—';
  const fabricName = item.fabric?.fabricName || item.name || '—';

  return (
    <Box
      className="sticker-card"
      sx={{
        width: '95mm',
        height: '53mm',
        boxSizing: 'border-box',
        p: '2.5mm 3.5mm',
        border: showCutLines ? '1px dashed #bbb' : '1px solid #333',
        borderRadius: 0,
        bgcolor: '#ffffff',
        display: 'flex',
        gap: '3mm',
        alignItems: 'stretch',
        position: 'relative',
        overflow: 'hidden',
        pageBreakInside: 'avoid',
        fontFamily: '"Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}
    >
      {/* Left: QR Code */}
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '22mm', flexShrink: 0 }}>
        <QRCodeSVG value={qrValue} size={68} level="M" />
        <Typography sx={{ fontSize: '7pt', fontFamily: 'monospace', fontWeight: 700, color: '#333', mt: 0.5, textAlign: 'center' }}>
          {qrValue}
        </Typography>
      </Box>

      {/* Right: Info Fields matching Excel layout */}
      <Box sx={{ flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '0.8mm' }}>
          {/* 1. ITEM CODE */}
          <Typography sx={{ fontSize: '9.5pt', fontWeight: 800, color: '#d32f2f', lineHeight: 1.15, textTransform: 'uppercase' }}>
            {item.itemCode || '—'}
          </Typography>

          {/* 2. SUPPLIER */}
          <Typography sx={{ fontSize: '8.5pt', fontWeight: 700, color: '#d32f2f', lineHeight: 1.15, textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {item.supplierName || '—'}
          </Typography>

          {/* 3. FABRIC NAME */}
          <Typography sx={{ fontSize: '8.5pt', fontWeight: 800, color: '#111', lineHeight: 1.2, textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>
            {fabricName}
          </Typography>

          {/* 4. COMPOSITION */}
          <Typography sx={{ fontSize: '7.5pt', fontWeight: 600, color: '#333', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {composition}
          </Typography>

          {/* 5. WEIGHT (GSM) - CUTTABLE WIDTH (INCH) */}
          <Typography sx={{ fontSize: '8pt', fontWeight: 700, color: '#222', lineHeight: 1.15 }}>
            {spec}
          </Typography>
        </Box>

        {/* 6. Footer */}
        <Typography sx={{ fontSize: '6.5pt', fontWeight: 700, color: '#444', textTransform: 'uppercase', pt: '0.8mm', borderTop: '0.5px solid #ddd', mt: 'auto', letterSpacing: '0.2px' }}>
          TRAX Group., Alliance One Apparel Co., Ltd
        </Typography>
      </Box>
    </Box>
  );
};

/**
 * Sample Yardage Sticker (matches Excel specification)
 */
const SampleYardageSticker: React.FC<{ item: Item; qrValue: string; showCutLines?: boolean }> = ({ item, qrValue, showCutLines }) => {
  const gsm = item.fabric?.weightGsm ? `${item.fabric.weightGsm} GSM` : '';
  const width = item.fabric?.cuttableWidth ? `${item.fabric.cuttableWidth}"` : '';
  const spec = [gsm, width].filter(Boolean).join(' - ') || '—';
  const fabricName = item.fabric?.fabricName || item.name || '—';
  const color = item.color || item.fabric?.colorName || '';
  const qty = item.quantity !== undefined && item.quantity !== null ? `${item.quantity} ${item.quantityUnit || 'Yds'}` : '';
  const colorQty = [color, qty].filter(Boolean).join(' - ') || '—';

  return (
    <Box
      className="sticker-card"
      sx={{
        width: '95mm',
        height: '53mm',
        boxSizing: 'border-box',
        p: '2.5mm 3.5mm',
        border: showCutLines ? '1px dashed #bbb' : '1px solid #333',
        borderRadius: 0,
        bgcolor: '#ffffff',
        display: 'flex',
        gap: '3mm',
        alignItems: 'stretch',
        position: 'relative',
        overflow: 'hidden',
        pageBreakInside: 'avoid',
        fontFamily: '"Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}
    >
      {/* Left: QR Code */}
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '22mm', flexShrink: 0 }}>
        <QRCodeSVG value={qrValue} size={68} level="M" />
        <Typography sx={{ fontSize: '7pt', fontFamily: 'monospace', fontWeight: 700, color: '#333', mt: 0.5, textAlign: 'center' }}>
          {qrValue}
        </Typography>
      </Box>

      {/* Right: Info Fields matching Excel layout */}
      <Box sx={{ flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '0.6mm' }}>
          {/* 1. ITEM CODE */}
          <Typography sx={{ fontSize: '9.5pt', fontWeight: 800, color: '#d32f2f', lineHeight: 1.15, textTransform: 'uppercase' }}>
            {item.itemCode || '—'}
          </Typography>

          {/* 2. SUPPLIER */}
          <Typography sx={{ fontSize: '8.5pt', fontWeight: 700, color: '#d32f2f', lineHeight: 1.15, textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {item.supplierName || '—'}
          </Typography>

          {/* 3. FABRIC NAME */}
          <Typography sx={{ fontSize: '8.5pt', fontWeight: 800, color: '#111', lineHeight: 1.2, textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>
            {fabricName}
          </Typography>

          {/* 4. WEIGHT (GSM) - CUTTABLE WIDTH (INCH) */}
          <Typography sx={{ fontSize: '8pt', fontWeight: 700, color: '#222', lineHeight: 1.15 }}>
            {spec}
          </Typography>

          {/* 5. LOCATION */}
          <Typography sx={{ fontSize: '7.5pt', fontWeight: 700, color: '#0284c7', lineHeight: 1.15 }}>
            {item.location ? `LOC: ${item.location}` : '—'}
          </Typography>

          {/* 6. COLOR - QUANTITY */}
          <Typography sx={{ fontSize: '8pt', fontWeight: 700, color: '#16a34a', lineHeight: 1.15 }}>
            {colorQty}
          </Typography>
        </Box>

        {/* 7. Footer */}
        <Typography sx={{ fontSize: '6.5pt', fontWeight: 700, color: '#444', textTransform: 'uppercase', pt: '0.6mm', borderTop: '0.5px solid #ddd', mt: 'auto', letterSpacing: '0.2px' }}>
          TRAX Group., Alliance One Apparel Co., Ltd
        </Typography>
      </Box>
    </Box>
  );
};

/**
 * Trims & Accessories Sticker (matches Excel specification)
 */
const AccessorySticker: React.FC<{ item: Item; qrValue: string; showCutLines?: boolean }> = ({ item, qrValue, showCutLines }) => {
  const category = item.accessory?.specification || item.category || '—';
  const desc = item.description || item.accessory?.description || item.name || '—';
  const color = item.accessory?.color || item.color || '';
  const qty = item.quantity !== undefined && item.quantity !== null ? `${item.quantity} ${item.quantityUnit || 'Pcs'}` : '';
  const colorQty = [color, qty].filter(Boolean).join(' - ') || '—';

  return (
    <Box
      className="sticker-card"
      sx={{
        width: '95mm',
        height: '53mm',
        boxSizing: 'border-box',
        p: '2.5mm 3.5mm',
        border: showCutLines ? '1px dashed #bbb' : '1px solid #333',
        borderRadius: 0,
        bgcolor: '#ffffff',
        display: 'flex',
        gap: '3mm',
        alignItems: 'stretch',
        position: 'relative',
        overflow: 'hidden',
        pageBreakInside: 'avoid',
        fontFamily: '"Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}
    >
      {/* Left: QR Code */}
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '22mm', flexShrink: 0 }}>
        <QRCodeSVG value={qrValue} size={68} level="M" />
        <Typography sx={{ fontSize: '7pt', fontFamily: 'monospace', fontWeight: 700, color: '#333', mt: 0.5, textAlign: 'center' }}>
          {qrValue}
        </Typography>
      </Box>

      {/* Right: Info Fields matching Excel layout */}
      <Box sx={{ flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '0.6mm' }}>
          {/* 1. ITEM CODE */}
          <Typography sx={{ fontSize: '9.5pt', fontWeight: 800, color: '#d32f2f', lineHeight: 1.15, textTransform: 'uppercase' }}>
            {item.itemCode || '—'}
          </Typography>

          {/* 2. SUPPLIER */}
          <Typography sx={{ fontSize: '8.5pt', fontWeight: 700, color: '#d32f2f', lineHeight: 1.15, textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {item.supplierName || '—'}
          </Typography>

          {/* 3. CATEGORY */}
          <Typography sx={{ fontSize: '8.5pt', fontWeight: 800, color: '#111', lineHeight: 1.2, textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {category}
          </Typography>

          {/* 4. DESCRIPTION */}
          <Typography sx={{ fontSize: '7.5pt', fontWeight: 600, color: '#333', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', wordBreak: 'break-word' }}>
            {desc}
          </Typography>

          {/* 5. LOCATION */}
          <Typography sx={{ fontSize: '7.5pt', fontWeight: 700, color: '#0284c7', lineHeight: 1.15 }}>
            {item.location ? `LOC: ${item.location}` : '—'}
          </Typography>

          {/* 6. COLOR - QUANTITY */}
          <Typography sx={{ fontSize: '8pt', fontWeight: 700, color: '#16a34a', lineHeight: 1.15 }}>
            {colorQty}
          </Typography>
        </Box>

        {/* 7. Footer */}
        <Typography sx={{ fontSize: '6.5pt', fontWeight: 700, color: '#444', textTransform: 'uppercase', pt: '0.6mm', borderTop: '0.5px solid #ddd', mt: 'auto', letterSpacing: '0.2px' }}>
          TRAX Group., Alliance One Apparel Co., Ltd
        </Typography>
      </Box>
    </Box>
  );
};

export const renderSticker = (
  item: Item,
  showCutLines?: boolean,
  config?: GarmentSampleTagConfig,
  isActive?: boolean,
  onClick?: () => void
) => {
  const qrValue = getItemQrValue(item);
  if (item.itemType === 'PRODUCT') {
    return (
      <GarmentSampleTag
        item={item}
        config={config}
        qrValue={qrValue}
        showCutLines={showCutLines}
        isActive={isActive}
        onClick={onClick}
      />
    );
  }
  if (item.itemType === 'FABRIC') {
    return <FabricHangerSticker item={item} qrValue={qrValue} showCutLines={showCutLines} />;
  }
  if (item.itemType === 'YARDAGE') {
    return <SampleYardageSticker item={item} qrValue={qrValue} showCutLines={showCutLines} />;
  }
  if (item.itemType === 'ACCESSORY') {
    return <AccessorySticker item={item} qrValue={qrValue} showCutLines={showCutLines} />;
  }
  // Default fallback
  return <FabricHangerSticker item={item} qrValue={qrValue} showCutLines={showCutLines} />;
};

/**
 * SVG Overlay rendering precise cutting guide lines (đường kẻ cắt)
 * across the A4 sheet between columns and rows.
 */
const CutLinesOverlay: React.FC<{ isGarment: boolean }> = ({ isGarment }) => {
  if (isGarment) {
    // Garment / Mockup: 4 tags (2 cols x 2 rows, center x=105mm, center y=148.5mm)
    return (
      <svg
        className="a4-cut-lines-overlay"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '210mm',
          height: '297mm',
          pointerEvents: 'none',
          zIndex: 10,
        }}
      >
        {/* Center Vertical Cut Line */}
        <line
          x1="105mm"
          y1="2mm"
          x2="105mm"
          y2="295mm"
          stroke="#94a3b8"
          strokeWidth="0.8"
          strokeDasharray="6 3"
        />
        <text x="105mm" y="5.5mm" textAnchor="middle" fontSize="10px" fill="#64748b">✂</text>
        <text x="105mm" y="294.5mm" textAnchor="middle" fontSize="10px" fill="#64748b">✂</text>

        {/* Center Horizontal Cut Line */}
        <line
          x1="2mm"
          y1="148.5mm"
          x2="208mm"
          y2="148.5mm"
          stroke="#94a3b8"
          strokeWidth="0.8"
          strokeDasharray="6 3"
        />
        <text x="5.5mm" y="147.5mm" textAnchor="middle" fontSize="10px" fill="#64748b">✂</text>
        <text x="204.5mm" y="147.5mm" textAnchor="middle" fontSize="10px" fill="#64748b">✂</text>
      </svg>
    );
  }

  // Standard Stickers: 10 per page (2 cols x 5 rows)
  // Col center: 105mm
  // Row gaps center: 62.75mm, 119.25mm, 175.75mm, 232.25mm
  return (
    <svg
      className="a4-cut-lines-overlay"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '210mm',
        height: '297mm',
        pointerEvents: 'none',
        zIndex: 10,
      }}
    >
      {/* Center Vertical Cut Line */}
      <line
        x1="105mm"
        y1="2mm"
        x2="105mm"
        y2="295mm"
        stroke="#94a3b8"
        strokeWidth="0.8"
        strokeDasharray="6 3"
      />
      <text x="105mm" y="5.5mm" textAnchor="middle" fontSize="10px" fill="#64748b">✂</text>
      <text x="105mm" y="294.5mm" textAnchor="middle" fontSize="10px" fill="#64748b">✂</text>

      {/* Row 1-2 Cut Line */}
      <line
        x1="2mm"
        y1="62.75mm"
        x2="208mm"
        y2="62.75mm"
        stroke="#94a3b8"
        strokeWidth="0.8"
        strokeDasharray="6 3"
      />
      <text x="5.5mm" y="61.5mm" textAnchor="middle" fontSize="9px" fill="#64748b">✂</text>
      <text x="204.5mm" y="61.5mm" textAnchor="middle" fontSize="9px" fill="#64748b">✂</text>

      {/* Row 2-3 Cut Line */}
      <line
        x1="2mm"
        y1="119.25mm"
        x2="208mm"
        y2="119.25mm"
        stroke="#94a3b8"
        strokeWidth="0.8"
        strokeDasharray="6 3"
      />
      <text x="5.5mm" y="118mm" textAnchor="middle" fontSize="9px" fill="#64748b">✂</text>
      <text x="204.5mm" y="118mm" textAnchor="middle" fontSize="9px" fill="#64748b">✂</text>

      {/* Row 3-4 Cut Line */}
      <line
        x1="2mm"
        y1="175.75mm"
        x2="208mm"
        y2="175.75mm"
        stroke="#94a3b8"
        strokeWidth="0.8"
        strokeDasharray="6 3"
      />
      <text x="5.5mm" y="174.5mm" textAnchor="middle" fontSize="9px" fill="#64748b">✂</text>
      <text x="204.5mm" y="174.5mm" textAnchor="middle" fontSize="9px" fill="#64748b">✂</text>

      {/* Row 4-5 Cut Line */}
      <line
        x1="2mm"
        y1="232.25mm"
        x2="208mm"
        y2="232.25mm"
        stroke="#94a3b8"
        strokeWidth="0.8"
        strokeDasharray="6 3"
      />
      <text x="5.5mm" y="231mm" textAnchor="middle" fontSize="9px" fill="#64748b">✂</text>
      <text x="204.5mm" y="231mm" textAnchor="middle" fontSize="9px" fill="#64748b">✂</text>
    </svg>
  );
};

/**
 * A4 Sheet component rendering:
 * - For PRODUCT (Garment/Mockup Sample Tag): 4 tags per page (2 columns x 2 rows)
 * - For others (Fabric, Yardage, Accessory): 10 stickers per page (2 columns x 5 rows)
 */
export const A4StickerSheet: React.FC<A4StickerSheetProps> = React.memo(({
  items,
  showCutLines = true,
  garmentConfigs = {},
  activeGarmentId,
  onSelectGarment,
}) => {
  const { t } = useTranslation();
  const isGarment = items.length > 0 && items[0].itemType === 'PRODUCT';
  const chunkSize = isGarment ? 4 : 10;

  const pages: Item[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    pages.push(items.slice(i, i + chunkSize));
  }

  return (
    <Box className="a4-sheets-container">
      {pages.map((pageItems, pageIdx) => (
        <Box
          key={pageIdx}
          className="a4-page"
          sx={{
            width: '210mm',
            minHeight: '297mm',
            height: '297mm',
            boxSizing: 'border-box',
            bgcolor: '#ffffff',
            position: 'relative',
            display: 'grid',
            ...(isGarment
              ? {
                  // Garment / Mockup: 4 tags (2 cols x 2 rows, 96mm x 140mm)
                  p: '6mm 6mm',
                  gridTemplateColumns: 'repeat(2, 96mm)',
                  gridTemplateRows: 'repeat(2, 140mm)',
                  columnGap: '6mm',
                  rowGap: '4mm',
                  justifyContent: 'center',
                  alignContent: 'center',
                }
              : {
                  // Standard stickers: 10 per page (2 cols x 5 rows, 95mm x 53mm)
                  p: '8mm 7mm',
                  gridTemplateColumns: 'repeat(2, 95mm)',
                  gridTemplateRows: 'repeat(5, 53mm)',
                  columnGap: '6mm',
                  rowGap: '3.5mm',
                  justifyContent: 'center',
                  alignContent: 'start',
                }),
            pageBreakAfter: 'always',
            pageBreakInside: 'avoid',
            mb: 4,
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            '@media print': {
              boxShadow: 'none',
              mb: 0,
              width: '210mm',
              height: '297mm',
              p: isGarment ? '6mm 6mm' : '8mm 7mm',
              pageBreakAfter: 'always',
            },
          }}
        >
          {/* Cut lines overlay when enabled */}
          {showCutLines && <CutLinesOverlay isGarment={isGarment} />}

          {pageItems.map((item, idx) => {
            const isActive = isGarment && activeGarmentId === item.id;
            return (
              <Box
                key={`${item.id}-${idx}`}
                id={isActive ? `garment-tag-${item.id}` : undefined}
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  position: 'relative',
                }}
              >
                {/* Active indicator badge for on-screen preview */}
                {isActive && (
                  <Box
                    className="active-tag-banner"
                    sx={{
                      position: 'absolute',
                      top: -11,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      bgcolor: '#16a34a',
                      color: '#ffffff',
                      fontSize: '10.5px',
                      fontWeight: 800,
                      px: 1.5,
                      py: 0.25,
                      borderRadius: '12px',
                      boxShadow: '0 2px 8px rgba(22, 163, 74, 0.4)',
                      zIndex: 20,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.75,
                      whiteSpace: 'nowrap',
                      letterSpacing: '0.3px',
                      pointerEvents: 'none',
                      '@media print': {
                        display: 'none !important',
                      }
                    }}
                  >
                    <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#ffffff' }} />
                    {t('rdMaterial.labelPrint.currently_configuring', 'ĐANG CẤU HÌNH THẺ NÀY')}
                  </Box>
                )}
                {renderSticker(
                  item,
                  showCutLines,
                  garmentConfigs[item.id],
                  isActive,
                  onSelectGarment ? () => onSelectGarment(item.id) : undefined
                )}
              </Box>
            );
          })}
        </Box>
      ))}
    </Box>
  );
});

A4StickerSheet.displayName = 'A4StickerSheet';

export default A4StickerSheet;
