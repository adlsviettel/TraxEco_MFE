import React from 'react';
import { Box, Typography } from '@mui/material';
import type { Item } from '../types';
import { rdItemApi } from '../services/rdMaterialApi';

export interface EnrichedBomItem {
  usage: string;
  itemId: number;
  itemCode: string;
  name: string;
  color: string;
  supplierName?: string;
  composition?: string;
  weightGsm?: number;
  cuttableWidth?: number;
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
            height: '210mm', // Fit whatever the landscape page size is
            padding: '10mm 15mm',
            boxSizing: 'border-box',
            backgroundColor: '#f5f5f5', // light gray background as in the picture
            display: 'flex',
            flexDirection: 'column',
            pageBreakAfter: 'always',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-start', mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
              {/* Trax Group Logo placeholder */}
              <Box sx={{ width: 24, height: 24, bgcolor: '#000', mr: 1 }} />
              <Typography sx={{ fontWeight: 800, fontSize: '14pt', color: '#000' }}>Trax Group</Typography>
            </Box>
          </Box>

          {/* Grid of 4 items - 2 columns, 2 rows */}
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: '8mm', flexGrow: 1 }}>
            {pageData.map((itemData, idx) => {
              const { product, enrichedBom } = itemData;
              const imgUrls = product.mainImage ? product.mainImage.split(',') : [];
              
              return (
                <Box key={idx} sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                  {/* Left: Image (Stacked vertically if multiple) */}
                  <Box sx={{ width: '35%', height: '100%', mr: 2, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 1 }}>
                    {imgUrls.length > 0 ? (
                      <img crossOrigin="anonymous" src={rdItemApi.getImageUrl(imgUrls[0])} alt={product.itemCode} style={{ maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto', display: 'block', margin: '0 auto' }} />
                    ) : (
                      <Box sx={{ width: '100%', height: '100px', bgcolor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Typography variant="caption" color="text.secondary">No Image</Typography>
                      </Box>
                    )}
                  </Box>

                  {/* Right: Info */}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 800, fontSize: '12pt', color: '#000', mb: 0.2 }}>
                      {product.itemCode || 'N/A'}
                    </Typography>
                    <Typography sx={{ fontSize: '11pt', color: '#000', mb: 0.2 }}>
                      {product.product?.styleName || product.name || '—'}
                    </Typography>
                    
                    {product.remark && (
                      <Typography sx={{ fontSize: '11pt', color: '#000', mb: 0.5 }}>
                        (~{product.remark}/ garment)
                      </Typography>
                    )}

                    <Box sx={{ mt: 1 }}>
                      {enrichedBom.map((bom, bIdx) => {
                        const supp = bom.supplierName || 'Supplier name';
                        const code = bom.itemCode || 'Item code';
                        const color = bom.color || 'Color';
                        const comp = bom.composition || 'Composition';
                        const w = bom.weightGsm ? `${bom.weightGsm}` : 'Weight';
                        const width = bom.cuttableWidth ? `${bom.cuttableWidth}` : 'Width';
                        
                        return (
                          <Typography key={bIdx} sx={{ fontSize: '11pt', color: '#000', mb: 0.2, lineHeight: 1.3 }}>
                            {bom.usage}: {supp}/ {code}/ {color}/ {comp}, {w}, {width}
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
