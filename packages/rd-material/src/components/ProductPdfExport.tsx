import React from 'react';
import { Box, Typography } from '@mui/material';
import type { Item } from '../types';
import { rdItemApi } from '../services/rdMaterialApi';

export interface EnrichedBomItem {
  usage: string;
  itemId?: number;
  itemCode: string;
  name?: string;
  color?: string;
  supplierName?: string;
  structure?: string;
  composition?: string;
  technology?: string;
  function?: string;
  weightGsm?: number | string;
  cuttableWidth?: number | string;
}

export interface PdfProductData {
  product: Item;
  enrichedBom: EnrichedBomItem[];
}

interface ProductPdfExportProps {
  data: PdfProductData[];
}

const ProductPdfExport: React.FC<ProductPdfExportProps> = ({ data }) => {
  if (!data || data.length === 0) return null;

  // Group into pages of 4 items each
  const pages = [];
  for (let i = 0; i < data.length; i += 4) {
    pages.push(data.slice(i, i + 4));
  }

  return (
    <Box className="pdf-export-container" sx={{ 
      fontFamily: 'Arial, sans-serif',
      width: '100%',
      // FORCE background colors and images to print!
      '@media print': {
        '*': {
          WebkitPrintColorAdjust: 'exact !important',
          printColorAdjust: 'exact !important',
        }
      }
    }}>
      {pages.map((pageData, pageIdx) => (
        <Box 
          key={pageIdx} 
          className="pdf-page"
          sx={{
            width: '297mm',
            height: '210mm',
            maxHeight: '210mm',
            padding: '8mm 12mm',
            boxSizing: 'border-box',
            backgroundColor: '#f5f5f5',
            display: 'flex',
            flexDirection: 'column',
            pageBreakAfter: 'always',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', mb: 1.5, height: '12mm', flexShrink: 0 }}>
            <img 
              src={`${import.meta.env.BASE_URL}export_logo.png`} 
              alt="Trax Group" 
              style={{ height: '26px', width: 'auto', objectFit: 'contain' }} 
            />
          </Box>

          {/* Grid of 4 items - STRICT 2x2 layout fitting A4 page height */}
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', 
            gridTemplateRows: 'repeat(2, minmax(0, 1fr))', 
            gap: '6mm', 
            height: 'calc(210mm - 28mm)',
            maxHeight: 'calc(210mm - 28mm)',
            overflow: 'hidden',
            flexGrow: 1
          }}>
            {pageData.map((itemData, idx) => {
              const { product, enrichedBom } = itemData;
              const imgUrls = product.mainImage ? product.mainImage.split(',') : [];
              
              return (
                <Box key={idx} sx={{ 
                  display: 'flex', 
                  alignItems: 'flex-start', 
                  height: '100%', 
                  maxHeight: '86mm', 
                  bgcolor: '#ffffff',
                  borderRadius: '8px',
                  p: '10px 12px',
                  border: '1px solid #e2e8f0',
                  boxSizing: 'border-box', 
                  overflow: 'hidden' 
                }}>
                  {/* Left: Image (Display up to first 2 images, strictly bounded) */}
                  <Box sx={{ width: '38%', height: '100%', maxHeight: '78mm', mr: 1.5, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'center', gap: '4px', flexShrink: 0, overflow: 'hidden' }}>
                    {imgUrls.length > 0 ? (
                      imgUrls.slice(0, 2).map((url, imgIdx) => (
                        <img 
                          key={imgIdx}
                          crossOrigin="anonymous" 
                          src={rdItemApi.getImageUrl(url)} 
                          alt={`${product.itemCode}-${imgIdx}`} 
                          style={{ 
                            maxWidth: '100%', 
                            maxHeight: imgUrls.length > 1 ? '36mm' : '74mm', 
                            width: 'auto', 
                            height: 'auto', 
                            objectFit: 'contain',
                            display: 'block', 
                            margin: '0 auto' 
                          }} 
                        />
                      ))
                    ) : (
                      <Box sx={{ width: '100%', height: '74mm', bgcolor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 1 }}>
                        <Typography variant="caption" color="text.secondary">No Image</Typography>
                      </Box>
                    )}
                  </Box>

                  {/* Right: Info */}
                  <Box sx={{ flex: 1, minWidth: 0, height: '100%', maxHeight: '78mm', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <Typography sx={{ fontWeight: 800, fontSize: '10.5pt', color: '#000', mb: 0.1, lineHeight: 1.2 }}>
                      {product.itemCode || 'N/A'}
                    </Typography>
                    <Typography sx={{ fontSize: '9.5pt', color: '#1e293b', mb: 0.1, lineHeight: 1.2 }}>
                      {product.product?.styleName || product.name || '—'}
                    </Typography>

                    {product.remark && (
                      <Typography sx={{ fontSize: '9pt', color: '#1e293b', mb: 0.1, lineHeight: 1.2 }}>
                        (~{product.remark}/ garment)
                      </Typography>
                    )}

                    <Box sx={{ mt: 0.5, overflowY: 'auto' }}>
                      {enrichedBom.map((bom, bIdx) => {
                        const usageStr = (bom.usage || '').trim();
                        const supp = (bom.supplierName || '').trim();
                        const code = (bom.itemCode || '').trim();
                        const color = (bom.color || '').trim();
                        const comp = (bom.composition || '').trim();
                        const weight = (bom.weightGsm !== undefined && bom.weightGsm !== null && bom.weightGsm !== '') ? String(bom.weightGsm).trim() : '';
                        const width = (bom.cuttableWidth !== undefined && bom.cuttableWidth !== null && bom.cuttableWidth !== '') ? String(bom.cuttableWidth).trim() : '';

                        // Format: [Usage]: [Supplier]/ [Item Code]/ [Color]/ [Composition], [Weight], [Width]
                        const part3 = [comp, weight, width].filter(Boolean).join(', ');
                        const lineDetail = [supp, code, color, part3].filter(Boolean).join('/ ');
                        const lineText = usageStr ? `${usageStr}: ${lineDetail}` : lineDetail;

                        return (
                          <Typography key={bIdx} sx={{ fontSize: '8.5pt', color: '#000', mb: 0.3, lineHeight: 1.25, wordBreak: 'break-word' }}>
                            {lineText}
                          </Typography>
                        );
                      })}
                    </Box>
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Box>
      ))}
    </Box>
  );
};

export default ProductPdfExport;
