import { useState, useEffect, useMemo, useCallback, useRef, memo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box, Typography, Paper, CircularProgress, Alert, Button, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, InputAdornment, Checkbox, Select, MenuItem
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { authFetch } from '@traxeco/shared';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8100/api';

// ─── Huawei Tablet Safe Canvas Limits ───
// Nhiều Huawei tablet (MatePad, MediaPad) giới hạn canvas ở ~16M pixels.
// Vượt qua → canvas trắng hoặc cực kỳ lag.
const MAX_CANVAS_PIXELS = 8_000_000; // 8 triệu pixel = an toàn cho mọi tablet
const IS_TOUCH_DEVICE = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

interface MapCell {
  ShNm: string;
  ShLevl: string;
  ShSeq: string;
  DmW: number;
  DmH: number;
  MgnL: number;
  MgnT: number;
  ShSeqId: number;
  cartonCount?: number;
  highlighted?: boolean;
}

interface MapLabel {
  ShNm: string;
  MgnL: number;
  MgnT: number;
  MTextColor: number;
  MTextSize: number;
}

// ─── Helper: vẽ hình chữ nhật bo góc trên Canvas ───
function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

// ─── Tính màu sắc theo mức đầy kệ ───
function getCapacityStyles(cell: MapCell) {
  if (cell.highlighted) return { bg: '#fef08a', text: '#854d0e', border: '#eab308' };
  const count = cell.cartonCount;
  if (count === undefined || count === 0) {
    return { bg: '#f1f5f9', text: '#64748b', border: '#cbd5e1' };
  }
  const maxCapacity = 48;
  const p = Math.min(1, count / maxCapacity);
  const hue = Math.round(120 * (1 - p));
  const saturation = Math.round(75 + 15 * p);
  const lightness = Math.round(75 - 30 * p);
  const textLightness = Math.round(35 - 20 * p);
  const borderLightness = Math.round(60 - 25 * p);
  return {
    bg: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
    text: `hsl(${hue}, ${saturation + 10}%, ${textLightness}%)`,
    border: `hsl(${hue}, ${saturation}%, ${borderLightness}%)`
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Spatial lookup grid — O(1) hit-test thay vì quét toàn bộ mảng cells
// ─────────────────────────────────────────────────────────────────────────────
const GRID_SIZE = 64; // pixel mỗi ô lưới

interface SpatialGrid {
  buckets: Map<string, MapCell[]>;
  gridSize: number;
}

function buildSpatialGrid(cells: MapCell[]): SpatialGrid {
  const buckets = new Map<string, MapCell[]>();
  for (const cell of cells) {
    if (cell.ShSeqId == null || cell.DmW <= 0) continue;
    const x0 = Math.floor(cell.MgnL / GRID_SIZE);
    const x1 = Math.floor((cell.MgnL + cell.DmW) / GRID_SIZE);
    const y0 = Math.floor(cell.MgnT / GRID_SIZE);
    const y1 = Math.floor((cell.MgnT + cell.DmH) / GRID_SIZE);
    for (let gx = x0; gx <= x1; gx++) {
      for (let gy = y0; gy <= y1; gy++) {
        const key = `${gx},${gy}`;
        let bucket = buckets.get(key);
        if (!bucket) { bucket = []; buckets.set(key, bucket); }
        bucket.push(cell);
      }
    }
  }
  return { buckets, gridSize: GRID_SIZE };
}

function hitTestGrid(grid: SpatialGrid, x: number, y: number): MapCell | undefined {
  const gx = Math.floor(x / grid.gridSize);
  const gy = Math.floor(y / grid.gridSize);
  const bucket = grid.buckets.get(`${gx},${gy}`);
  if (!bucket) return undefined;
  return bucket.find(cell =>
    x >= cell.MgnL && x <= cell.MgnL + cell.DmW &&
    y >= cell.MgnT && y <= cell.MgnT + cell.DmH
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function WarehouseMapPage() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [cells, setCells] = useState<MapCell[]>([]);
  const [labels, setLabels] = useState<MapLabel[]>([]);
  const [mapWidth, setMapWidth] = useState(0);
  const [mapHeight, setMapHeight] = useState(0);

  const [selectedCell, setSelectedCell] = useState<MapCell | null>(null);
  const [cellCartons, setCellCartons] = useState<any[]>([]);
  const [loadingCartons, setLoadingCartons] = useState(false);

  const [searchPO, setSearchPO] = useState('');
  const [scale, setScale] = useState(1.0);

  // Visual tap ripple feedback cho tablet
  const [tapRipple, setTapRipple] = useState<{ x: number; y: number; key: number } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  // Ref giữ searchPO mới nhất để fetchMapData luôn đọc đúng giá trị
  const searchPORef = useRef(searchPO);
  searchPORef.current = searchPO;

  // Ref lưu scale hiện tại để touch/click handler luôn đọc giá trị mới nhất
  const scaleRef = useRef(scale);
  scaleRef.current = scale;

  // Debounce: ngăn tap nhanh liên tục bắn nhiều lần
  const lastTapTimeRef = useRef(0);

  // ─── Spatial grid cho hit-testing nhanh ───
  const spatialGrid = useMemo(() => buildSpatialGrid(cells), [cells]);

  // ─── Fetch dữ liệu bản đồ từ BE ───
  const fetchMapData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const activeFac = localStorage.getItem('factory') || 'F2';
      let url = `${API_BASE_URL}/location/shelves?factory=${encodeURIComponent(activeFac)}`;
      const currentPO = searchPORef.current.trim();
      if (currentPO) {
        url += `&poNo=${encodeURIComponent(currentPO)}`;
      }
      const res = await authFetch(url);
      if (res.ok) {
        const data = await res.json();
        const mapCells: MapCell[] = data.mapCells || [];
        const mapLabels: MapLabel[] = data.mapLabels || [];

        let maxX = 0;
        let maxY = 0;
        mapCells.forEach((c) => {
          if (c.MgnL + c.DmW > maxX) maxX = c.MgnL + c.DmW;
          if (c.MgnT + c.DmH > maxY) maxY = c.MgnT + c.DmH;
        });

        setMapWidth(maxX + 50);
        setMapHeight(maxY + 50);
        setCells(mapCells);
        setLabels(mapLabels);
      } else {
        setError('Failed to fetch map data');
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi kết nối');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMapData(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Click vào 1 ô kệ → mở popup chi tiết ───
  const handleCellClick = useCallback(async (cell: MapCell) => {
    setSelectedCell(cell);
    setCellCartons([]);
    setLoadingCartons(true);
    try {
      const activeFac = localStorage.getItem('factory') || 'F2';
      const loc = `${cell.ShNm.trim()}.${cell.ShLevl.trim()}.${cell.ShSeq.trim()}`;
      const res = await authFetch(`${API_BASE_URL}/location/cartons?location=${loc}&factory=${encodeURIComponent(activeFac)}`);
      if (res.ok) {
        setCellCartons(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingCartons(false);
    }
  }, []);

  const handleCloseDialog = useCallback(() => { setSelectedCell(null); }, []);
  const handleLocationChanged = useCallback(() => { setSelectedCell(null); fetchMapData(); }, [fetchMapData]);

  // ═══════════════════════════════════════════════════════════════════════════
  // CANVAS: VẼ TOÀN BỘ BẢN ĐỒ BẰNG 1 THẺ <canvas> DUY NHẤT
  // Thay vì tạo hàng ngàn thẻ DOM → cực kỳ nhẹ cho Tablet
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || cells.length === 0 || mapWidth === 0 || mapHeight === 0) return;

    // ── Tính DPR an toàn cho Huawei tablet ──
    let dpr = IS_TOUCH_DEVICE ? 1 : Math.min(window.devicePixelRatio || 1, 2);
    
    const rawPixels = mapWidth * dpr * mapHeight * dpr;
    if (rawPixels > MAX_CANVAS_PIXELS) {
      dpr = 1;
    }

    const ctx = canvas.getContext('2d', { 
      // willReadFrequently = false → cho phép GPU tăng tốc compositing
      willReadFrequently: false 
    });
    if (!ctx) return;

    canvas.width = Math.round(mapWidth * dpr);
    canvas.height = Math.round(mapHeight * dpr);
    canvas.style.width = `${mapWidth}px`;
    canvas.style.height = `${mapHeight}px`;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, mapWidth, mapHeight);

    // ── 1. Vẽ tất cả các ô kệ ──
    // Gom theo màu, batch vẽ giảm context switch (tăng FPS trên GPU yếu)
    const visibleCells = cells.filter(c => c.ShSeqId != null && c.DmW > 0);
    
    // Vẽ nền + viền tất cả ô trước
    for (const cell of visibleCells) {
      const styles = getCapacityStyles(cell);
      const x = cell.MgnL;
      const y = cell.MgnT;
      const cw = cell.DmW - 2;
      const ch = cell.DmH - 2;

      roundedRect(ctx, x, y, cw, ch, 3);
      ctx.fillStyle = styles.bg;
      ctx.fill();
      ctx.strokeStyle = styles.border;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Sau đó vẽ text tất cả ô (giảm font switch)
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const cell of visibleCells) {
      const styles = getCapacityStyles(cell);
      const x = cell.MgnL;
      const y = cell.MgnT;
      const cw = cell.DmW - 2;
      const ch = cell.DmH - 2;
      ctx.fillStyle = styles.text;
      ctx.fillText(`${cell.ShLevl}.${cell.ShSeq}`, x + cw / 2, y + ch / 2);
    }

    // ── 2. Vẽ nhãn tên dãy kệ ──
    const visibleShelfNames = new Set(visibleCells.map(c => c.ShNm));
    for (const lbl of labels) {
      if (!visibleShelfNames.has(lbl.ShNm)) continue;

      const fontSize = lbl.MTextSize > 0 ? lbl.MTextSize * 1.5 : 22;
      ctx.font = `800 ${fontSize}px sans-serif`;
      const text = lbl.ShNm.toUpperCase();
      const metrics = ctx.measureText(text);
      const padX = 16, padY = 6;
      const bgW = metrics.width + padX * 2;
      const bgH = fontSize + padY * 2;

      roundedRect(ctx, lbl.MgnL, lbl.MgnT, bgW, bgH, 14);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
      ctx.fill();
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#334155';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(text, lbl.MgnL + padX, lbl.MgnT + padY + 2);
    }
  }, [cells, labels, mapWidth, mapHeight]);
  // ^^ KHÔNG phụ thuộc vào `scale` → zoom chỉ thay đổi CSS transform, KHÔNG vẽ lại canvas

  // ─── CHUNG: Từ tọa độ pixel trên canvas (chưa scale) → tìm cell ───
  const resolveCellFromCanvasCoord = useCallback((canvasX: number, canvasY: number): MapCell | undefined => {
    return hitTestGrid(spatialGrid, canvasX, canvasY);
  }, [spatialGrid]);

  // ─── Quy đổi tọa độ screen → canvas (KHÔNG dùng getBoundingClientRect) ───
  // Huawei EMUI WebView đôi khi trả getBoundingClientRect() sai sau CSS transform.
  // Thay vào đó, tự tính offset thủ công từ canvas element → scroll container.
  const screenToCanvasCoord = useCallback((clientX: number, clientY: number): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    const scrollContainer = scrollContainerRef.current;
    if (!canvas || !scrollContainer) return null;

    // Lấy vị trí scroll container trên screen (chính xác, vì nó KHÔNG bị transform)
    const containerRect = scrollContainer.getBoundingClientRect();

    // Tọa độ bên trong scroll container (tính cả scroll offset)
    const inContainerX = clientX - containerRect.left + scrollContainer.scrollLeft;
    const inContainerY = clientY - containerRect.top + scrollContainer.scrollTop;

    // Trừ padding của scroll container (p: 2 = 16px)
    const PADDING = 16;
    const afterPadX = inContainerX - PADDING;
    const afterPadY = inContainerY - PADDING;

    // Tính offset margin auto (canvas được center bằng margin: 0 auto)
    const containerInnerW = scrollContainer.scrollWidth - PADDING * 2;
    const scaledMapW = mapWidth * scaleRef.current;
    const marginLeft = containerInnerW > scaledMapW ? (containerInnerW - scaledMapW) / 2 : 0;

    // Tọa độ trong scaled canvas space
    const scaledX = afterPadX - marginLeft;
    const scaledY = afterPadY;

    // Unscale → tọa độ canvas thực (map coordinates)
    const x = scaledX / scaleRef.current;
    const y = scaledY / scaleRef.current;

    // Bounds check
    if (x < 0 || y < 0 || x > mapWidth || y > mapHeight) return null;
    return { x, y };
  }, [mapWidth, mapHeight]);

  // ─── Hiệu ứng ripple visual khi tap (để user biết đã bấm) ───
  const showTapRipple = useCallback((clientX: number, clientY: number) => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;
    const containerRect = scrollContainer.getBoundingClientRect();
    setTapRipple({ 
      x: clientX - containerRect.left + scrollContainer.scrollLeft, 
      y: clientY - containerRect.top + scrollContainer.scrollTop, 
      key: Date.now() 
    });
    setTimeout(() => setTapRipple(null), 400);
  }, []);

  // ─── XỬ LÝ CLICK TRÊN CANVAS (desktop / mouse) ───
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    // Trên touch device, bỏ qua click (dùng touch handler thay thế)
    if (IS_TOUCH_DEVICE) return;

    const coord = screenToCanvasCoord(e.clientX, e.clientY);
    if (!coord) return;

    const clicked = resolveCellFromCanvasCoord(coord.x, coord.y);
    if (clicked) handleCellClick(clicked);
  }, [screenToCanvasCoord, resolveCellFromCanvasCoord, handleCellClick]);

  // ─── XỬ LÝ TOUCH TRÊN CANVAS (tablet / mobile) ───
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
    }
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    const start = touchStartRef.current;
    if (!start || e.changedTouches.length < 1) return;
    const touch = e.changedTouches[0];

    const dx = Math.abs(touch.clientX - start.x);
    const dy = Math.abs(touch.clientY - start.y);
    const dt = Date.now() - start.time;
    touchStartRef.current = null;

    if (dx > 15 || dy > 15 || dt > 800) return;

    // Debounce
    const now = Date.now();
    if (now - lastTapTimeRef.current < 250) return;
    lastTapTimeRef.current = now;

    e.preventDefault();

    // ═══ PHƯƠNG PHÁP ĐƠN GIẢN NHẤT: getBoundingClientRect trực tiếp trên canvas ═══
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = (touch.clientX - rect.left) * (mapWidth / rect.width);
    const y = (touch.clientY - rect.top) * (mapHeight / rect.height);

    // Visual feedback
    showTapRipple(touch.clientX, touch.clientY);

    const clicked = resolveCellFromCanvasCoord(x, y);
    if (clicked) handleCellClick(clicked);
  }, [mapWidth, mapHeight, resolveCellFromCanvasCoord, handleCellClick, showTapRipple]);

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <Paper elevation={0} sx={{ p: { xs: 0.5, md: 1 }, bgcolor: 'transparent', flexGrow: 1, display: 'flex', flexDirection: 'column', minHeight: 0, position: 'relative' }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1, minHeight: 0, borderRadius: 2.5, overflow: 'hidden', border: '1px solid #e2e8f0', bgcolor: '#fff' }}>

        {/* ── HEADER BẢN ĐỒ ── */}
        <Box sx={{ p: { xs: 1.5, md: 2 }, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, gap: 2, bgcolor: '#ffffff', borderBottom: '1px solid #e2e8f0', flexShrink: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ width: 36, height: 36, borderRadius: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', color: '#fff' }}>
              <SearchIcon sx={{ fontSize: 20 }} />
            </Box>
            <Typography variant="h6" fontWeight="800" color="#1e293b" sx={{ lineHeight: 1.2 }}>
              {t('nav.warehouseMap', 'Bản Đồ Kho FGS')}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}>

            {/* Zoom */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Button variant="outlined" size="small"
                onClick={() => setScale(s => Math.max(0.5, +(s - 0.2).toFixed(1)))}
                sx={{ minWidth: 30, px: 1, borderRadius: 2 }}
              >-</Button>
              <Typography fontWeight="bold" color="text.secondary" sx={{ minWidth: 40, textAlign: 'center' }}>
                {scale.toFixed(1)}x
              </Typography>
              <Button variant="outlined" size="small"
                onClick={() => setScale(s => Math.min(3, +(s + 0.2).toFixed(1)))}
                sx={{ minWidth: 30, px: 1, borderRadius: 2 }}
              >+</Button>
            </Box>

            {/* Tìm PO */}
            <TextField
              size="small"
              placeholder="Tìm kiếm PO..."
              value={searchPO}
              onChange={(e) => setSearchPO(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); fetchMapData(); } }}
              sx={{ width: 240, bgcolor: '#f8fafc', '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
              InputProps={{
                startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" sx={{ color: '#94a3b8' }} /></InputAdornment>,
                endAdornment: searchPO ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => {
                      setSearchPO('');
                      setTimeout(() => {
                        const activeFac = localStorage.getItem('factory') || 'F2';
                        authFetch(`${API_BASE_URL}/location/shelves?factory=${encodeURIComponent(activeFac)}`)
                          .then(res => res.json())
                          .then(data => { setCells(data.mapCells || []); setLabels(data.mapLabels || []); })
                          .catch(console.error);
                      }, 0);
                    }}>
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ) : null
              }}
            />
            <Button variant="contained"
              sx={{ fontWeight: 700, borderRadius: '8px', bgcolor: '#2563eb', boxShadow: 'none', '&:hover': { bgcolor: '#1d4ed8' } }}
              startIcon={<RefreshIcon />}
              onClick={() => fetchMapData()}
            >
              {t('common.findEmpty', 'Cập nhật bản đồ')}
            </Button>
          </Box>
        </Box>

        {/* ── CHÚ GIẢI MÀU SẮC ── */}
        <Box sx={{ px: { xs: 1.5, md: 3 }, py: 1.5, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', flexShrink: 0 }}>
          <Typography fontSize={13} fontWeight="800" color="#64748b" sx={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Chú Giải Thể Tích:
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 16, height: 16, borderRadius: '4px', bgcolor: '#f1f5f9', border: '1px solid #cbd5e1' }} />
            <Typography fontSize={12} fontWeight="600" color="text.secondary">Trống</Typography>
          </Box>
          <Box sx={{ mx: 2, width: '1px', height: 16, bgcolor: '#cbd5e1' }} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography fontSize={12} fontWeight="600" color="text.secondary">Vài Thùng</Typography>
            <Box sx={{
              width: 200, height: 12, borderRadius: 6,
              background: 'linear-gradient(to right, hsl(120, 75%, 75%), hsl(60, 82%, 60%), hsl(30, 85%, 55%), hsl(0, 90%, 45%))',
              border: '1px solid rgba(0,0,0,0.1)'
            }} />
            <Typography fontSize={12} fontWeight="600" color="text.secondary">Đầy Kệ (Max 48 Thùng)</Typography>
          </Box>
        </Box>

        {/* ── ERROR & LOADING ── */}
        {error && <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>}
        {loading && <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}><CircularProgress color="primary" /></Box>}

        {/* ═══════════════════════════════════════════════════════════════════
            BẢN ĐỒ KHO — CHỈ 1 THẺ <canvas> DUY NHẤT
            Scroll area chứa canvas đã scale bằng CSS transform
            ════════════════════════════════════════════════════════════════ */}
        <Box 
          ref={scrollContainerRef}
          sx={{
            flex: 1,
            overflow: 'auto',
            WebkitOverflowScrolling: 'touch', // Smooth scroll trên iOS/Android WebView
            bgcolor: '#f8fafc',
            p: 2,
            minHeight: 0,
            position: 'relative', // Để ripple position absolute bên trong
            // Tắt overscroll bounce gây giật trên một số tablet
            overscrollBehavior: 'contain'
          }}
        >
          {!loading && cells.length > 0 && mapWidth > 0 && (
            <Box sx={{
              position: 'relative',
              width: mapWidth > 0 ? mapWidth * scale : '100%',
              height: mapHeight > 0 ? mapHeight * scale : '100%',
              minWidth: 800 * scale,
              minHeight: 600 * scale,
              margin: '0 auto'
            }}>
              <canvas
                ref={canvasRef}
                onClick={handleCanvasClick}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                style={{
                  display: 'block',
                  transformOrigin: '0 0',
                  transform: `scale(${scale})`,
                  cursor: 'pointer',
                  touchAction: 'manipulation', // Loại bỏ delay 300ms khi tap trên Tablet
                  // GPU layer promotion — tránh repaint toàn bộ khi scroll
                  willChange: 'transform'
                }}
              />
            </Box>
          )}

          {/* ── Tap Ripple Feedback ── */}
          {tapRipple && (
            <Box
              key={tapRipple.key}
              sx={{
                position: 'absolute',
                left: tapRipple.x - 20,
                top: tapRipple.y - 20,
                width: 40,
                height: 40,
                borderRadius: '50%',
                bgcolor: 'rgba(37, 99, 235, 0.35)',
                pointerEvents: 'none',
                animation: 'tapRipple 0.4s ease-out forwards',
                '@keyframes tapRipple': {
                  '0%': { transform: 'scale(0.5)', opacity: 1 },
                  '100%': { transform: 'scale(2.5)', opacity: 0 }
                }
              }}
            />
          )}
        </Box>
      </Box>

      {/* ═══════════════════════════════════════════════════════════════════
          POPUP CHI TIẾT — RENDER Ở GỐC COMPONENT (NGOÀI overflow:hidden)
          MUI Dialog tự động portal lên <body>, đảm bảo luôn hiện trên cùng
          ════════════════════════════════════════════════════════════════ */}
      <CartonDetailDialog
        selectedCell={selectedCell}
        loadingCartons={loadingCartons}
        cellCartons={cellCartons}
        cells={cells}
        onClose={handleCloseDialog}
        onLocationChanged={handleLocationChanged}
      />
    </Paper>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TÁCH DIALOG RIÊNG ĐỂ KHÔNG RE-RENDER MAP KHI BỎCHECKBOX
// ─────────────────────────────────────────────────────────────────────────────
const CartonDetailDialog = memo(function CartonDetailDialog({
  selectedCell, loadingCartons, cellCartons, cells, onClose, onLocationChanged
}: {
  selectedCell: MapCell | null;
  loadingCartons: boolean;
  cellCartons: any[];
  cells: MapCell[];
  onClose: () => void;
  onLocationChanged: () => void;
}) {
  const [selectedBarcodes, setSelectedBarcodes] = useState<string[]>([]);
  const [targetZone, setTargetZone] = useState('');
  const [targetLevel, setTargetLevel] = useState('');
  const [targetSeq, setTargetSeq] = useState('');
  const [submittingChange, setSubmittingChange] = useState(false);

  // Reset khi mở dialog mới
  useEffect(() => {
    if (selectedCell) {
      setSelectedBarcodes([]);
      setTargetZone('');
      setTargetLevel('');
      setTargetSeq('');
    }
  }, [selectedCell]);

  const selectedSet = useMemo(() => new Set(selectedBarcodes), [selectedBarcodes]);

  // Tính danh sách lựa chọn Dãy / Tầng / Ô (lazy, mỗi cái chỉ chạy khi cần)
  const zoneOptions = useMemo(() =>
    Array.from(new Set(cells.filter(c => c.ShSeqId != null && c.ShNm).map(c => String(c.ShNm)))).sort()
  , [cells]);

  const levelOptions = useMemo(() =>
    targetZone
      ? Array.from(new Set(cells.filter(c => c.ShSeqId != null && c.ShLevl && c.ShNm === targetZone).map(c => String(c.ShLevl)))).sort()
      : []
  , [cells, targetZone]);

  const seqOptions = useMemo(() => {
    if (!targetZone || !targetLevel) return [];
    return Array.from(new Set(
      cells.filter(c => c.ShSeqId != null && c.ShSeq && c.ShNm === targetZone && c.ShLevl === targetLevel)
        .map(c => String(c.ShSeq))
    )).sort((a, b) => {
      const na = parseInt(a); const nb = parseInt(b);
      if (!isNaN(na) && !isNaN(nb)) return na - nb;
      return a.localeCompare(b);
    });
  }, [cells, targetZone, targetLevel]);

  const toggleBarcode = useCallback((barcode: string) => {
    setSelectedBarcodes(prev => {
      const set = new Set(prev);
      if (set.has(barcode)) set.delete(barcode);
      else set.add(barcode);
      return Array.from(set);
    });
  }, []);

  const handleChangeLocationSubmit = async () => {
    if (!targetZone || !targetLevel || !targetSeq || selectedBarcodes.length === 0) return;
    const tl = `${targetZone}.${targetLevel}.${targetSeq}`;

    if (!window.confirm(`Bạn có chắc chắn muốn di dời ${selectedBarcodes.length} thùng sang vị trí mới [${tl}] không?`)) {
      return;
    }

    try {
      setSubmittingChange(true);
      const items = selectedBarcodes.map(b => ({
        barCode: b,
        locationCode: tl,
        palletNm: '',
        factory: localStorage.getItem('factory') || 'F2'
      }));
      await authFetch(`${API_BASE_URL}/location/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(items)
      });
      alert(`Đã di chuyển thành công ${selectedBarcodes.length} thùng sang vị trí ${tl}!`);
      onLocationChanged();
    } catch (err: any) {
      alert("Lỗi khi di dời: " + err.message);
    } finally {
      setSubmittingChange(false);
    }
  };

  return (
    <Dialog
      open={Boolean(selectedCell)}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      // Các prop chống lỗi trên Android WebView / Huawei tablet
      disableRestoreFocus
      disableEnforceFocus
      sx={{ zIndex: 1400 }} // Đẩy z-index cao hơn bình thường (1300) để chắc chắn nổi trên mọi thứ
    >
      <DialogTitle sx={{ bgcolor: '#f5f5f5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" component="span" fontWeight="bold">
          Chi tiết Vị Trí: {selectedCell?.ShNm}.{selectedCell?.ShLevl}.{selectedCell?.ShSeq}
        </Typography>
        <IconButton onClick={onClose}><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ p: 0 }}>
        {loadingCartons ? (
          <Box sx={{ minHeight: 200, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <CircularProgress size={32} />
          </Box>
        ) : cellCartons.length === 0 ? (
          <Box sx={{ minHeight: 200, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <Typography color="text.secondary">Vị trí này hiện đang trống.</Typography>
          </Box>
        ) : (
          <TableContainer sx={{ maxHeight: 400, overflowY: 'auto' }}>
            <Table stickyHeader size="small" sx={{ '& .MuiTableCell-root': { py: 0.5, px: 1, fontSize: '0.8rem' } }}>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox" sx={{ bgcolor: '#f8fafc' }}>
                    <Checkbox
                      size="small"
                      checked={cellCartons.length > 0 && selectedBarcodes.length === cellCartons.length}
                      indeterminate={selectedBarcodes.length > 0 && selectedBarcodes.length < cellCartons.length}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedBarcodes(cellCartons.map(c => c.barcode));
                        else setSelectedBarcodes([]);
                      }}
                      sx={{ py: 0 }}
                    />
                  </TableCell>
                  <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f8fafc' }}>Barcode</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f8fafc' }}>PO Number</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f8fafc', textAlign: 'center' }}>Thùng</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f8fafc', textAlign: 'center' }}>Seri</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f8fafc', textAlign: 'right' }}>Thời gian quét</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {cellCartons.map((row, idx) => {
                  const rowBarcode = row.barcode || `unknown-${idx}`;
                  const isSelected = selectedSet.has(rowBarcode);
                  return (
                    <TableRow
                      key={idx}
                      hover
                      selected={isSelected}
                      onClick={() => toggleBarcode(rowBarcode)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell padding="checkbox"><Checkbox size="small" checked={isSelected} sx={{ p: '2px' }} disableRipple tabIndex={-1} /></TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{row.barcode || '-'}</TableCell>
                      <TableCell sx={{ fontWeight: '600', color: '#334155' }}>{row.po || '-'}</TableCell>
                      <TableCell sx={{ textAlign: 'center', fontWeight: 'bold', color: '#16a34a' }}>{row.ctnNo || '-'}</TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>{row.seriNo || '-'}</TableCell>
                      <TableCell sx={{ textAlign: 'right', color: '#64748b', fontSize: '0.75rem' }}>{row.scanDate ? row.scanDate.substring(0, 16) : '-'}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2, display: 'flex', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', '& > *:not(:last-child)': { mr: 1 }, flex: 1, flexWrap: 'wrap' }}>
          {selectedBarcodes.length > 0 && (
            <>
              <Typography fontSize={13} fontWeight="bold" color="primary" sx={{ mr: 1 }}>Đã chọn {selectedBarcodes.length} thùng.</Typography>
              <Select size="small" value={targetZone} displayEmpty
                onChange={(e) => { setTargetZone(e.target.value); setTargetLevel(''); setTargetSeq(''); }}
                sx={{ width: 90, fontSize: '13px' }}>
                <MenuItem value="" disabled>Dãy</MenuItem>
                {zoneOptions.map(z => <MenuItem key={z} value={z}>{z}</MenuItem>)}
              </Select>
              <Select size="small" value={targetLevel} displayEmpty disabled={!targetZone}
                onChange={(e) => { setTargetLevel(e.target.value); setTargetSeq(''); }}
                sx={{ width: 90, fontSize: '13px' }}>
                <MenuItem value="" disabled>Tầng</MenuItem>
                {levelOptions.map(l => <MenuItem key={l} value={l}>{l}</MenuItem>)}
              </Select>
              <Select size="small" value={targetSeq} displayEmpty disabled={!targetLevel}
                onChange={(e) => setTargetSeq(e.target.value)}
                sx={{ width: 90, fontSize: '13px' }}>
                <MenuItem value="" disabled>Ô</MenuItem>
                {seqOptions.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </Select>
              <Button
                variant="contained" color="warning"
                disabled={!targetZone || !targetLevel || !targetSeq || submittingChange}
                onClick={handleChangeLocationSubmit}
                sx={{ boxShadow: 'none', ml: 1, minWidth: 120 }}>
                {submittingChange ? <CircularProgress size={20} /> : 'Di dời vị trí'}
              </Button>
            </>
          )}
        </Box>
        <Button variant="outlined" onClick={onClose}>Đóng</Button>
      </DialogActions>
    </Dialog>
  );
});
