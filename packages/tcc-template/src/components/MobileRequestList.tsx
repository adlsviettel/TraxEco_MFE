import React from 'react';
import { Box, Typography, CircularProgress, IconButton } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { type TccRequest } from '../services/tccService';
import { authService } from '@traxeco/shared';

interface MobileRequestListProps {
  requests: TccRequest[];
  loading: boolean;
  filters: any;
  canEditTracking: boolean;
  setEditingRow: (row: TccRequest) => void;
  setNewDate: (d: Date | null) => void;
  getStatusLabel: (s: string) => string;
  getStatusStyle: (s: string) => any;
  formatDate: (v: any) => string;
  setSelectedDetailId: (id: string) => void;
  setDetailOpen: (open: boolean) => void;
  t: any;
}

export function MobileRequestList({
  requests,
  loading,
  filters,
  canEditTracking,
  setEditingRow,
  setNewDate,
  getStatusLabel,
  getStatusStyle,
  formatDate,
  setSelectedDetailId,
  setDetailOpen,
  t
}: MobileRequestListProps) {
  const [mobilePage, setMobilePage] = React.useState(0);
  const MOBILE_PAGE_SIZE = 20;

  const filteredRows = React.useMemo(() => {
    return requests.filter(r => {
      const q = (filters.customer ?? '').toLowerCase().trim();
      if (q && !(
        (r.customer ?? '').toLowerCase().includes(q) ||
        (r.styleNumber ?? '').toLowerCase().includes(q) ||
        String(r.requestId ?? '').toLowerCase().includes(q)
      )) return false;
      if (filters.status && (r.status ?? '').toLowerCase() !== filters.status.toLowerCase()) return false;
      if (filters.factory && (r.factory ?? '').toLowerCase() !== filters.factory.toLowerCase()) return false;
      if (filters.season && (r.season ?? '').toLowerCase() !== filters.season.toLowerCase()) return false;
      return true;
    });
  }, [requests, filters.customer, filters.status, filters.factory, filters.season]);

  const totalPages = Math.ceil(filteredRows.length / MOBILE_PAGE_SIZE);
  const pageRows = filteredRows.slice(mobilePage * MOBILE_PAGE_SIZE, (mobilePage + 1) * MOBILE_PAGE_SIZE);

  const userInfo = authService.getUserInfo();
  const codeLower = userInfo?.employeeCode?.trim().toLowerCase() || '';
  const nameLower = userInfo?.employeeName?.trim().toLowerCase() || '';
  const isAdminOrSuper = authService.isSuperAdmin() || authService.isAdmin();

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {/* Card list */}
      <Box sx={{ flex: 1, overflowY: 'auto', px: 1.5, pb: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}>
            <CircularProgress size={36} sx={{ color: '#2e7d32' }} />
          </Box>
        ) : pageRows.length === 0 ? (
          <Box sx={{ textAlign: 'center', pt: 8 }}>
            <Typography variant="body2" sx={{ color: '#94a3b8' }}>{t('tcc.noDataFound', 'No data found')}</Typography>
          </Box>
        ) : pageRows.map((row) => {
          const displayStatus = row.releasedDate ? 'Released' : (row.status || 'Not Started');
          const isCancelled = row.status === 'Cancelled';
          const isLate = (() => {
            if (!row.confirmDeliveryDate || !row.expectedDeliveryDate) return false;
            const rq = new Date(row.expectedDeliveryDate); rq.setHours(0,0,0,0);
            const cf = new Date(row.confirmDeliveryDate); cf.setHours(0,0,0,0);
            return cf > rq;
          })();

          return (
            <Box
              key={row.requestId}
              onClick={() => {
                setSelectedDetailId(row.requestId);
                setDetailOpen(true);
              }}
              sx={{
                position: 'relative',
                flexShrink: 0,
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                overflow: 'hidden',
                opacity: isCancelled ? 0.6 : 1,
                bgcolor: '#ffffff',
                boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
                display: 'flex',
                flexDirection: 'column',
                cursor: 'pointer',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                '&:hover': {
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                },
                '&:active': {
                  transform: 'scale(0.98)'
                }
              }}
            >
              {/* Header */}
              <Box sx={{
                position: 'relative',
                pl: row.isPriority ? 4.5 : 2, pr: 2, py: 1.3,
                background: 'linear-gradient(135deg,#f8fafc 0%,#f1f5f9 100%)',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1,
              }}>
                {row.isPriority && (
                  <Box sx={{
                    position: 'absolute',
                    top: 0, left: 0, width: 0, height: 0,
                    borderStyle: 'solid',
                    borderWidth: '32px 32px 0 0',
                    borderColor: '#dc2626 transparent transparent transparent',
                    zIndex: 10,
                  }}>
                    <Box sx={{
                      position: 'absolute',
                      top: -29, left: 4, color: '#ffffff', fontSize: 9, fontWeight: 'bold',
                    }}>
                      ★
                    </Box>
                  </Box>
                )}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Typography sx={{ fontWeight: 800, color: '#1e293b', fontSize: 14 }}>
                    #{row.requestId}
                  </Typography>
                  <Typography sx={{ color: '#94a3b8', fontSize: 11, whiteSpace: 'nowrap' }}>{formatDate(row.createdAt)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box sx={{ 
                    ...getStatusStyle(displayStatus), 
                    fontSize: 10, fontWeight: 700, px: 1.2, py: 0.4, borderRadius: '6px',
                    whiteSpace: 'nowrap'
                  }}>
                    {getStatusLabel(displayStatus)}
                  </Box>
                </Box>
              </Box>

              {/* Body */}
              <Box sx={{ px: 2, py: 1.5, display: 'flex', flexDirection: 'column', gap: 1.2 }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                  <Box>
                    <Typography sx={{ color: '#94a3b8', fontSize: 10, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em' }}>{t('tcc.customer', 'Customer')}</Typography>
                    <Typography sx={{ fontWeight: 700, color: '#334155', fontSize: 13 }}>{row.customer || '—'}</Typography>
                  </Box>
                  <Box>
                    <Typography sx={{ color: '#94a3b8', fontSize: 10, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em' }}>{t('tcc.season', 'Season')}</Typography>
                    <Typography sx={{ fontWeight: 600, color: '#334155', fontSize: 13 }}>{row.season || '—'}</Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 1.5 }}>
                  <Box>
                    <Typography sx={{ color: '#94a3b8', fontSize: 10, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em' }}>{t('tcc.styleNumber', 'Style')}</Typography>
                    <Typography sx={{ fontWeight: 600, color: '#334155', fontSize: 13 }}>{row.styleNumber || '—'}</Typography>
                  </Box>
                  <Box>
                    <Typography sx={{ color: '#94a3b8', fontSize: 10, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em' }}>{t('tcc.factory', 'Factory')}</Typography>
                    <Typography sx={{ fontWeight: 600, color: '#334155', fontSize: 13 }}>{row.factory || '—'}</Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                  <Box>
                    <Typography sx={{ color: '#94a3b8', fontSize: 10, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em' }}>{t('tcc.sampleStage', 'Sample Stage')}</Typography>
                    <Typography sx={{ fontWeight: 500, color: '#475569', fontSize: 12 }}>{row.sampleStage || '—'}</Typography>
                  </Box>
                  <Box>
                    <Typography sx={{ color: '#94a3b8', fontSize: 10, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em' }}>{t('tcc.productType', 'Product Type')}</Typography>
                    <Typography sx={{ fontWeight: 500, color: '#475569', fontSize: 12 }}>{row.productType || '—'}</Typography>
                  </Box>
                </Box>

                {/* Dates */}
                <Box sx={{ borderTop: '1px dashed #e2e8f0', pt: 1, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1 }}>
                  <Box 
                    onClick={(e) => {
                      const reqLower = (row.requesterName || '').trim().toLowerCase();
                      const isMyRequest = reqLower === codeLower || reqLower === nameLower || reqLower.startsWith(codeLower + ' -');
                      const canEditThisRow = isAdminOrSuper || (isMyRequest && canEditTracking);

                      if (canEditThisRow && !isCancelled) {
                        e.stopPropagation();
                        setEditingRow(row);
                        setNewDate(row.materialSentDate ? new Date(row.materialSentDate) : null);
                      }
                    }}
                    sx={{ 
                      cursor: (() => {
                        const reqLower = (row.requesterName || '').trim().toLowerCase();
                        const isMyRequest = reqLower === codeLower || reqLower === nameLower || reqLower.startsWith(codeLower + ' -');
                        const canEditThisRow = isAdminOrSuper || (isMyRequest && canEditTracking);
                        return (canEditThisRow && !isCancelled) ? 'pointer' : 'default';
                      })(),
                      borderRadius: '6px',
                      p: 0.5,
                      ml: -0.5,
                      '&:hover': {
                        bgcolor: (() => {
                          const reqLower = (row.requesterName || '').trim().toLowerCase();
                          const isMyRequest = reqLower === codeLower || reqLower === nameLower || reqLower.startsWith(codeLower + ' -');
                          const canEditThisRow = isAdminOrSuper || (isMyRequest && canEditTracking);
                          return (canEditThisRow && !isCancelled) ? 'rgba(46,125,50,0.08)' : 'transparent';
                        })(),
                      }
                    }}
                  >
                    <Typography sx={{ color: '#94a3b8', fontSize: 10, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 0.3 }}>
                      {t('tcc.matSent', 'Mat. Sent')}
                      {(() => {
                        const reqLower = (row.requesterName || '').trim().toLowerCase();
                        const isMyRequest = reqLower === codeLower || reqLower === nameLower || reqLower.startsWith(codeLower + ' -');
                        const canEditThisRow = isAdminOrSuper || (isMyRequest && canEditTracking);
                        return canEditThisRow && !isCancelled;
                      })() && (
                        <EditIcon sx={{ fontSize: 11, color: '#2e7d32' }} />
                      )}
                    </Typography>
                    <Typography sx={{ fontWeight: 600, color: '#334155', fontSize: 12, whiteSpace: 'nowrap' }}>
                      {formatDate(row.materialSentDate) || '—'}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography sx={{ color: '#94a3b8', fontSize: 10, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em' }}>{t('tcc.reqDel', 'Req. Del.')}</Typography>
                    <Typography sx={{ fontWeight: 600, color: '#334155', fontSize: 12, whiteSpace: 'nowrap' }}>{formatDate(row.expectedDeliveryDate) || '—'}</Typography>
                  </Box>
                  <Box>
                    <Typography sx={{ color: '#94a3b8', fontSize: 10, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      {t('tcc.confDel', 'Conf. Del.')}
                      {isLate && <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#dc2626' }} />}
                    </Typography>
                    <Typography sx={{ fontWeight: 700, color: isLate ? '#dc2626' : '#334155', fontSize: 12, whiteSpace: 'nowrap' }}>{formatDate(row.confirmDeliveryDate) || '—'}</Typography>
                  </Box>
                </Box>

                {row.remarks && (
                  <Box sx={{ bgcolor: '#f8fafc', borderRadius: '8px', px: 1.5, py: 0.8, borderLeft: '3px solid #e2e8f0' }}>
                    <Typography sx={{ color: '#64748b', fontSize: 11, fontStyle: 'italic' }} noWrap>{row.remarks}</Typography>
                  </Box>
                )}
              </Box>
            </Box>
          );
        })}
      </Box>

      {/* Pagination */}
      {totalPages > 1 && (() => {
        const current = mobilePage + 1;
        const pages: (number | 'dots')[] = [];
        const addPage = (p: number) => { if (!pages.includes(p) && p >= 1 && p <= totalPages) pages.push(p); };
        
        addPage(1);
        addPage(current - 1);
        addPage(current);
        addPage(current + 1);
        addPage(totalPages);
        
        const withDots: (number | 'dots')[] = [];
        let prev = 0;
        for (const p of pages) {
          if (typeof p === 'number') {
            if (prev && p - prev > 1) withDots.push('dots');
            withDots.push(p);
            prev = p;
          }
        }

        return (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, py: 1.5, borderTop: '1px solid #e2e8f0', bgcolor: '#fff', flexShrink: 0 }}>
            <IconButton size="small" disabled={mobilePage === 0} onClick={() => setMobilePage(p => p - 1)}
              sx={{ width: 30, height: 30, fontSize: 14, color: '#475569' }}>
              <ChevronLeftIcon fontSize="small" />
            </IconButton>
            
            {withDots.map((item, idx) => 
              item === 'dots' ? (
                <Typography key={`dots-${idx}`} sx={{ width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#94a3b8' }}>…</Typography>
              ) : (
                <Box key={item} onClick={() => setMobilePage(item - 1)}
                  sx={{
                    width: 30, height: 30, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                    ...(item === current
                      ? { bgcolor: '#1b5e20', color: '#fff' }
                      : { color: '#475569', '&:hover': { bgcolor: '#f1f5f9' } }
                    )
                  }}
                >
                  {item}
                </Box>
              )
            )}
            
            <IconButton size="small" disabled={mobilePage >= totalPages - 1} onClick={() => setMobilePage(p => p + 1)}
              sx={{ width: 30, height: 30, fontSize: 14, color: '#475569' }}>
              <ChevronRightIcon fontSize="small" />
            </IconButton>
          </Box>
        );
      })()}
    </Box>
  );
}
