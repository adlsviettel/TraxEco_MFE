import React from 'react';
import { Box, Typography, CircularProgress, IconButton } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { type TccRequest } from '../services/tccService';

interface MobileAdminRequestListProps {
  requests: TccRequest[];
  loading: boolean;
  filters: any;
  canEdit: boolean;
  setSelectedRow: (row: TccRequest) => void;
  setDrawerOpen: (open: boolean) => void;
  getStatusLabel: (s: string, t: any) => string;
  getStatusStyle: (s: string) => any;
  formatDate: (v: any) => string;
  t: any;
}

export function MobileAdminRequestList({
  requests,
  loading,
  filters,
  canEdit,
  setSelectedRow,
  setDrawerOpen,
  getStatusLabel,
  getStatusStyle,
  formatDate,
  t
}: MobileAdminRequestListProps) {
  const [mobilePage, setMobilePage] = React.useState(0);
  const MOBILE_PAGE_SIZE = 20;

  const filteredRows = React.useMemo(() => {
    const q = (filters.customer ?? '').toLowerCase().trim();
    if (!q) return requests;
    return requests.filter(r =>
      (r.customer ?? '').toLowerCase().includes(q) ||
      (r.styleNumber ?? '').toLowerCase().includes(q) ||
      (r.developerName ?? '').toLowerCase().includes(q) ||
      String(r.requestId ?? '').toLowerCase().includes(q)
    );
  }, [requests, filters.customer]);

  const totalPages = Math.ceil(filteredRows.length / MOBILE_PAGE_SIZE);
  const pageRows = filteredRows.slice(mobilePage * MOBILE_PAGE_SIZE, (mobilePage + 1) * MOBILE_PAGE_SIZE);

  const InfoRow = ({ label, value, color }: { label: string; value: string; color?: string }) => (
    <Box>
      <Typography sx={{ color: '#94a3b8', fontSize: 10, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em', lineHeight: 1.2 }}>
        {label}
      </Typography>
      <Typography sx={{ fontWeight: 600, color: color ?? '#334155', fontSize: 13, lineHeight: 1.3 }}>
        {value || '\u2014'}
      </Typography>
    </Box>
  );

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, mt: 1 }}>
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
          const isReleased = !!row.releasedDate;
          const isCancelled = row.status === 'Cancelled';
          const canEditRow = !isReleased && row.status !== 'Deleted' && !isCancelled;
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
                setSelectedRow(row);
                setDrawerOpen(true);
              }}
              sx={{
                position: 'relative',
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                overflow: 'hidden',
                opacity: isCancelled ? 0.6 : 1,
                bgcolor: '#fff',
                boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
                cursor: 'pointer',
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column'
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
                    {getStatusLabel(displayStatus, t)}
                  </Box>
                  {canEdit && canEditRow ? (
                    <IconButton size="small" sx={{ color: '#2e7d32', p: 0.5 }}>
                      <EditIcon sx={{ fontSize: 17 }} />
                    </IconButton>
                  ) : (
                    <IconButton size="small" sx={{ color: '#64748b', p: 0.5 }}>
                      <VisibilityIcon sx={{ fontSize: 17 }} />
                    </IconButton>
                  )}
                </Box>
              </Box>

              {/* Body */}
              <Box sx={{ px: 2, py: 1.5, display: 'flex', flexDirection: 'column', gap: 1.2 }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                  <InfoRow label={t('tcc.customer', 'Customer')} value={row.customer || ''} />
                  <InfoRow label={t('tcc.season', 'Season')} value={row.season || ''} />
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 1.5 }}>
                  <InfoRow label={t('tcc.styleNumber', 'Style')} value={row.styleNumber || ''} />
                  <InfoRow label={t('tcc.factory', 'Factory')} value={row.factory || ''} />
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                  <InfoRow label={t('tcc.inChargePerson', 'In-charge Person')} value={row.developerName || ''} color={row.developerName ? '#1e293b' : '#94a3b8'} />
                  <InfoRow label={t('tcc.sampleStage', 'Sample Stage')} value={row.sampleStage || ''} />
                </Box>

                {/* Dates */}
                <Box sx={{ borderTop: '1px dashed #e2e8f0', pt: 1, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1 }}>
                  <Box>
                    <Typography sx={{ color: '#94a3b8', fontSize: 10, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em' }}>{t('tcc.matSent', 'Mat. Sent')}</Typography>
                    <Typography sx={{ fontWeight: 600, color: '#334155', fontSize: 12, whiteSpace: 'nowrap' }}>{formatDate(row.materialSentDate) || '—'}</Typography>
                  </Box>
                  <Box>
                    <Typography sx={{ color: '#94a3b8', fontSize: 10, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em' }}>{t('tcc.reqDel', 'Req. Del.')}</Typography>
                    <Typography sx={{ fontWeight: 600, color: '#334155', fontSize: 12, whiteSpace: 'nowrap' }}>{formatDate(row.expectedDeliveryDate) || '—'}</Typography>
                  </Box>
                  <Box>
                    <Typography sx={{ color: '#94a3b8', fontSize: 10, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em' }}>{t('tcc.confDel', 'Conf. Del.')}</Typography>
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
