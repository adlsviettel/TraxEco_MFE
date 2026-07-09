import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Grid, 
  Card, 
  CardContent, 
  Typography, 
  Box, 
  Button,
  Avatar,
  Stack 
} from '@mui/material';
import { 
  HotelOutlined as BedEmptyIcon, 
  Hotel as BedFullIcon, 
  Warning as WarningIcon
} from '@mui/icons-material';

export interface Bed {
  idBed: number;
  bedName: string;
  isOccupied: boolean;
  employeeId?: string;
  fullName?: string;
  admitTime?: string; // ISO String or local string
  sickness?: string;
  factory?: string;
}

interface BedStatusGridProps {
  beds: Bed[];
  onAdmitClick: (bed: Bed) => void;
  onDischargeClick: (bed: Bed) => void;
}

// Single Bed Card Component with internal timer
function BedCard({ bed, onAdmitClick, onDischargeClick }: { bed: Bed, onAdmitClick: (bed: Bed) => void, onDischargeClick: (bed: Bed) => void }) {
  const { t } = useTranslation();
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  useEffect(() => {
    if (!bed.isOccupied || !bed.admitTime) {
      setElapsedSeconds(0);
      return;
    }

    const calculateElapsed = () => {
      // Parse dates: handle ISO or local format vi-VN (DD/MM/YYYY HH:MM:SS)
      let parsedTime = Date.parse(bed.admitTime || '');
      if (isNaN(parsedTime) && bed.admitTime) {
        // Try parsing Vietnamese locale string: "03/07/2026 07:15:00"
        const parts = bed.admitTime.match(/(\d+)\/(\d+)\/(\d+)\s+(\d+):(\d+):(\d+)/);
        if (parts) {
          const date = new Date(
            parseInt(parts[3]), // year
            parseInt(parts[2]) - 1, // month (0-indexed)
            parseInt(parts[1]), // day
            parseInt(parts[4]), // hour
            parseInt(parts[5]), // minute
            parseInt(parts[6]) // second
          );
          parsedTime = date.getTime();
        }
      }

      if (isNaN(parsedTime)) return 0;
      return Math.max(0, Math.floor((Date.now() - parsedTime) / 1000));
    };

    setElapsedSeconds(calculateElapsed());

    const interval = setInterval(() => {
      setElapsedSeconds(calculateElapsed());
    }, 1000);

    return () => clearInterval(interval);
  }, [bed.isOccupied, bed.admitTime]);

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isOvertime = elapsedSeconds >= 1800; // 30 minutes = 1800 seconds
  const statusColor = bed.isOccupied ? (isOvertime ? '#ef4444' : '#f59e0b') : '#15803d';
  
  const bgGradient = bed.isOccupied 
    ? (isOvertime 
        ? 'linear-gradient(135deg, #fff5f5 0%, #fee2e2 100%)' 
        : 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)')
    : 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)';

  return (
    <Card 
      elevation={0}
      sx={{ 
        background: bgGradient,
        border: '1px solid',
        borderColor: bed.isOccupied ? (isOvertime ? '#fee2e2' : '#fde68a') : '#dcfce7',
        borderRadius: '12px',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: bed.isOccupied && isOvertime ? '0 0 12px rgba(239, 68, 68, 0.15)' : 'none',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          transform: 'translateY(-3px)',
          boxShadow: bed.isOccupied && isOvertime 
            ? '0 8px 24px rgba(239, 68, 68, 0.25)' 
            : '0 8px 20px rgba(15, 23, 42, 0.06)',
          borderColor: bed.isOccupied ? (isOvertime ? '#fca5a5' : '#fcd34d') : '#bbf7d0',
        }
      }}
    >
      {/* Top Accent Line */}
      <Box sx={{ height: 4, bgcolor: statusColor, width: '100%' }} />

      <CardContent sx={{ p: 2.25 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Avatar 
            sx={{ 
              bgcolor: statusColor,
              width: 36,
              height: 36,
              borderRadius: '10px'
            }}
          >
            {bed.isOccupied ? <BedFullIcon fontSize="small" /> : <BedEmptyIcon fontSize="small" />}
          </Avatar>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a', fontSize: '0.9rem', fontFamily: "'Be Vietnam Pro', sans-serif !important" }}>
              {bed.bedName}
            </Typography>
            <Typography 
              variant="caption" 
              sx={{ 
                fontWeight: 900, 
                color: statusColor, 
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                fontSize: '10px',
                fontFamily: "'Be Vietnam Pro', sans-serif !important"
              }}
            >
              {bed.isOccupied ? t('clinic.bed.status.full', 'ĐANG NẰM') : t('clinic.bed.status.empty', 'GIƯỜNG TRỐNG')}
            </Typography>
          </Box>
        </Box>

        {bed.isOccupied ? (
          <Box sx={{ minHeight: 90, mb: 1.5 }}>
            <Typography variant="body2" sx={{ fontWeight: 800, color: '#0f172a', fontSize: 13.5, mb: 0.5 }}>
              {bed.fullName}
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.25 }}>
              <Typography variant="caption" sx={{ px: 1, py: 0.25, bgcolor: 'rgba(15, 23, 42, 0.05)', borderRadius: '4px', fontWeight: 700, color: '#475569', fontSize: '10px' }}>
                ID: {bed.employeeId}
              </Typography>
            </Stack>
            
            <Typography variant="caption" sx={{ color: '#475569', fontSize: '11.5px', display: 'block', mb: 0.75, lineHeight: 1.4 }}>
              <span style={{ fontWeight: 700, color: '#64748b' }}>Triệu chứng: </span>
              {bed.sickness}
            </Typography>

            {/* Timer and Live warnings */}
            <Box sx={{ mt: 1.5, p: 1, borderRadius: '6px', bgcolor: isOvertime ? 'rgba(239,68,68,0.06)' : 'rgba(245,158,11,0.06)', border: '1px solid', borderColor: isOvertime ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)' }}>
              <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontWeight: 700, color: statusColor, fontSize: '11px' }}>
                Thời gian nằm: <b>{formatTime(elapsedSeconds)}</b> / 30:00
              </Typography>
              {isOvertime && (
                <Typography 
                  variant="caption" 
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 0.5, 
                    fontWeight: 800, 
                    color: '#ef4444', 
                    fontSize: '10.5px',
                    mt: 0.5,
                    animation: 'pulse 1.5s infinite ease-in-out',
                    '@keyframes pulse': {
                      '0%, 100%': { opacity: 0.6 },
                      '50%': { opacity: 1 }
                    }
                  }}
                >
                  <WarningIcon sx={{ fontSize: 13 }} /> Cảnh báo: Quá 30 phút nằm giường!
                </Typography>
              )}
            </Box>
          </Box>
        ) : (
          <Box sx={{ minHeight: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1.5 }}>
            <Typography variant="body2" sx={{ color: '#64748b', fontStyle: 'italic', fontSize: '12px' }}>
              {t('clinic.bed.emptyBed', 'Sẵn sàng tiếp nhận')}
            </Typography>
          </Box>
        )}

        <Box>
          {bed.isOccupied ? (
            <Button
              fullWidth
              variant="contained"
              size="small"
              onClick={() => onDischargeClick(bed)}
              sx={{
                bgcolor: '#ef4444',
                color: '#fff',
                fontWeight: 800,
                fontSize: 12,
                py: 0.75,
                borderRadius: '8px',
                textTransform: 'none',
                boxShadow: '0 2px 8px rgba(239, 68, 68, 0.1)',
                '&:hover': {
                  bgcolor: '#dc2626',
                  boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)',
                }
              }}
            >
              {t('clinic.bed.discharge', 'Hoàn tất & Trả giường')}
            </Button>
          ) : (
            <Button
              fullWidth
              variant="contained"
              size="small"
              onClick={() => onAdmitClick(bed)}
              sx={{
                bgcolor: '#15803d',
                color: '#fff',
                fontWeight: 800,
                fontSize: 12,
                py: 0.75,
                borderRadius: '8px',
                textTransform: 'none',
                boxShadow: '0 2px 8px rgba(21, 128, 61, 0.1)',
                '&:hover': {
                  bgcolor: '#166534',
                  boxShadow: '0 4px 12px rgba(21, 128, 61, 0.2)',
                }
              }}
            >
              {t('clinic.bed.admit', 'Tiếp nhận bệnh nhân')}
            </Button>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}

export default function BedStatusGrid({ beds, onAdmitClick, onDischargeClick }: BedStatusGridProps) {
  return (
    <Grid container spacing={2}>
      {beds.map((bed) => (
        <Grid item xs={12} sm={6} md={4} key={bed.idBed}>
          <BedCard 
            bed={bed}
            onAdmitClick={onAdmitClick}
            onDischargeClick={onDischargeClick}
          />
        </Grid>
      ))}
    </Grid>
  );
}
