import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Box, 
  Grid, 
  Autocomplete, 
  TextField, 
  Button, 
  Typography,
  Card,
  CardActionArea,
  IconButton,
  Chip,
  InputAdornment,
  Tooltip,
  List,
  ListItem,
  ListItemText,
  Divider
} from '@mui/material';
import { 
  Search as SearchIcon,
  AddCircleOutline as PlusCircleIcon,
  Close as CloseIcon,
  Delete as DeleteIcon,
  Queue as QueueIcon,
  CheckCircle as CheckIcon,
  LocalPharmacy as PharmacyIcon,
  InfoOutlined as InfoIcon,
  ShoppingBagOutlined as BagIcon,
  Send as SendIcon
} from '@mui/icons-material';

import { WarehouseStock } from '../../types/warehouse';

interface SendToFactoryFormProps {
  warehouseStock: WarehouseStock[];
  onSendToFactory: (data: any) => void;
}

const MOCK_FACTORIES = ['Xưởng F1', 'Xưởng F2', 'Xưởng F3', 'Xưởng F4'];

export default function SendToFactoryForm({ warehouseStock, onSendToFactory }: SendToFactoryFormProps) {
  const { t } = useTranslation();

  // Active form inputs (for the current lot being configured)
  const [selectedStock, setSelectedStock] = useState<WarehouseStock | null>(null);
  const [factory, setFactory] = useState<string | null>(null);
  const [qty, setQty] = useState<number>(10);

  // Search filter for available warehouse lots
  const [searchQuery, setSearchQuery] = useState('');

  // Queued Transfers List State
  const [queuedTransfers, setQueuedTransfers] = useState<any[]>([]);

  // Filter available warehouse stock based on search and positive remaining quantity
  const filteredStock = useMemo(() => {
    // Subtract quantities already in queue to prevent double-allocation warnings
    return warehouseStock
      .filter(item => {
        const queuedQty = queuedTransfers
          .filter(q => q.sourceNo === item.no)
          .reduce((sum, q) => sum + q.qty, 0);
        return item.qtyIssue - queuedQty > 0;
      })
      .filter(item => {
        const matchSearch = item.nameMed.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            item.no.toString().includes(searchQuery);
        return matchSearch;
      });
  }, [searchQuery, warehouseStock, queuedTransfers]);

  // Handle adding configured transfer to queue
  const handleAddToQueue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStock || !factory || qty <= 0) return;

    // Get max available quantity factoring in what's already queued for this lot
    const queuedQtyForThisLot = queuedTransfers
      .filter(q => q.sourceNo === selectedStock.no)
      .reduce((sum, q) => sum + q.qty, 0);
    const maxAvailable = selectedStock.qtyIssue - queuedQtyForThisLot;

    const finalQty = Math.min(qty, maxAvailable);
    if (finalQty <= 0) return;

    const newTransfer = {
      idKey: Date.now() + Math.random().toString(),
      sourceNo: selectedStock.no,
      idMed: selectedStock.idMed,
      nameMed: selectedStock.nameMed,
      qty: finalQty,
      factory: factory
    };

    setQueuedTransfers(prev => [...prev, newTransfer]);

    // Reset current configuration inputs
    setSelectedStock(null);
    setFactory(null);
    setQty(10);
  };

  // Submit all queued transfers
  const handleConfirmAllTransfers = () => {
    if (queuedTransfers.length === 0) return;
    onSendToFactory(queuedTransfers);
    setQueuedTransfers([]);
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%', 
      overflow: 'hidden',
      fontFamily: "'Be Vietnam Pro', sans-serif !important",
      '& *': { fontFamily: "'Be Vietnam Pro', sans-serif !important" }
    }}>
      <Grid container spacing={2.5} sx={{ height: '100%', minHeight: 0 }}>
        
        {/* CỘT 1: CHỌN LÔ THUỐC NGUỒN TRONG KHO TỔNG */}
        <Grid size={{ xs: 12, md: 4.25 }} sx={{ display: 'flex', flexDirection: 'column', height: '100%', borderRight: '1px solid #f1f5f9', pr: 2 }}>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ fontWeight: 800, textTransform: 'uppercase', fontSize: 11, letterSpacing: '0.5px', mb: 1.5 }}>
            1. Chọn Lô Thuốc Nguồn
          </Typography>

          {/* Ô tìm kiếm nhanh lô */}
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1.5 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Tìm theo tên thuốc hoặc số lô..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: 'text.secondary', fontSize: 18 }} />
                  </InputAdornment>
                ),
                sx: { borderRadius: '8px' }
              }}
            />
          </Box>

          {/* Danh sách lô thuốc nguồn cuộn dọc */}
          <Box sx={{ flexGrow: 1, overflowY: 'auto', pr: 0.5, mb: 1 }}>
            <Grid container spacing={1}>
              {filteredStock.map(item => {
                const isSelected = selectedStock?.no === item.no;
                // Calculate actual remaining quantity after subtracting what's in the queue
                const queuedQty = queuedTransfers
                  .filter(q => q.sourceNo === item.no)
                  .reduce((sum, q) => sum + q.qty, 0);
                const actualRemaining = item.qtyIssue - queuedQty;

                return (
                  <Grid size={12} key={item.no}>
                    <Card
                      variant="outlined"
                      sx={{
                        borderRadius: '8px',
                        borderWidth: isSelected ? '2px' : '1px',
                        borderColor: isSelected ? '#15803d' : '#e2e8f0',
                        boxShadow: isSelected ? '0 4px 10px rgba(27,94,32,0.05)' : 'none',
                        bgcolor: isSelected ? 'rgba(27,94,32,0.01)' : '#ffffff',
                        transition: 'all 0.15s ease',
                        '&:hover': {
                          borderColor: isSelected ? '#15803d' : '#cbd5e1',
                          bgcolor: isSelected ? 'rgba(27,94,32,0.02)' : '#f8fafc'
                        }
                      }}
                    >
                      <CardActionArea onClick={() => { setSelectedStock(item); setQty(actualRemaining); }} sx={{ p: 1.25, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: '6px', bgcolor: isSelected ? '#15803d' : '#f1f5f9', color: isSelected ? '#fff' : '#475569' }}>
                            <PharmacyIcon sx={{ fontSize: 18 }} />
                          </Box>
                          <Box>
                            <Typography sx={{ fontWeight: 800, color: '#0f172a', fontSize: 12.5, textTransform: 'uppercase' }}>
                              {item.nameMed}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                              Lô #{item.no} • HSD: {item.expDate}
                            </Typography>
                          </Box>
                        </Box>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Chip
                            label={`Khả dụng: ${actualRemaining}`}
                            size="small"
                            sx={{
                              height: 18,
                              fontSize: 10,
                              fontWeight: 700,
                              bgcolor: isSelected ? '#e8f5e9' : '#f1f5f9',
                              color: isSelected ? '#15803d' : '#475569',
                              borderRadius: '4px'
                            }}
                          />
                          <PlusCircleIcon sx={{ fontSize: 18, color: isSelected ? '#15803d' : '#94a3b8' }} />
                        </Box>
                      </CardActionArea>
                    </Card>
                  </Grid>
                );
              })}
              {filteredStock.length === 0 && (
                <Grid size={12}>
                  <Box sx={{ textAlign: 'center', py: 6 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                      Không có lô thuốc nào khả dụng
                    </Typography>
                  </Box>
                </Grid>
              )}
            </Grid>
          </Box>
        </Grid>

        {/* CỘT 2: ĐIỀN THÔNG TIN ĐIỀU CHUYỂN */}
        <Grid size={{ xs: 12, md: 3.75 }} sx={{ display: 'flex', flexDirection: 'column', height: '100%', borderRight: '1px solid #f1f5f9', pr: 2 }}>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ fontWeight: 800, textTransform: 'uppercase', fontSize: 11, letterSpacing: '0.5px', mb: 1.5 }}>
            2. Điền Thông Tin Chuyển
          </Typography>

          <Box component="form" onSubmit={handleAddToQueue} sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.25, flexGrow: 1 }}>
              {/* Lô thuốc nguồn đã chọn */}
              {selectedStock ? (
                <Box sx={{ p: 1.5, borderRadius: '8px', bgcolor: 'rgba(27,94,32,0.06)', border: '1px solid #15803d', display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CheckIcon sx={{ color: '#15803d', fontSize: 18 }} />
                  <Box>
                    <Typography variant="caption" sx={{ color: '#15803d', fontWeight: 800, display: 'block', lineHeight: 1 }}>LÔ NGUỒN ĐÃ CHỌN</Typography>
                    <Typography sx={{ fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', fontSize: 13, mt: 0.25 }}>
                      Lô #{selectedStock.no} - {selectedStock.nameMed}
                    </Typography>
                  </Box>
                </Box>
              ) : (
                <Box sx={{ p: 2, borderRadius: '8px', bgcolor: '#f8fafc', border: '1px dashed #cbd5e1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1, py: 3 }}>
                  <InfoIcon sx={{ color: '#94a3b8', fontSize: 24 }} />
                  <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', textAlign: 'center', fontSize: 12, lineHeight: 1.4 }}>
                    Chưa chọn lô nguồn.<br />Vui lòng click vào một thẻ lô ở Cột 1.
                  </Typography>
                </Box>
              )}

              {/* Xưởng nhận */}
              <Autocomplete
                options={MOCK_FACTORIES}
                getOptionLabel={(option) => option}
                value={factory}
                onChange={(_, newValue) => setFactory(newValue)}
                renderInput={(params) => (
                  <TextField {...params} size="small" label="Nhà máy / Xưởng nhận" required sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }} />
                )}
              />

              {/* Số lượng chuyển + Nút Max */}
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label="Số lượng chuyển"
                  value={qty}
                  onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 0))}
                  required
                  disabled={!selectedStock}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
                />
                {selectedStock && (
                  <Button
                    variant="outlined"
                    onClick={() => {
                      const queuedQty = queuedTransfers
                        .filter(q => q.sourceNo === selectedStock.no)
                        .reduce((sum, q) => sum + q.qty, 0);
                      setQty(selectedStock.qtyIssue - queuedQty);
                    }}
                    sx={{
                      height: 40,
                      borderColor: '#15803d',
                      color: '#15803d',
                      textTransform: 'none',
                      fontWeight: 800,
                      fontSize: 12.5,
                      borderRadius: '8px',
                      '&:hover': {
                        borderColor: '#166534',
                        bgcolor: 'rgba(27,94,32,0.04)'
                      }
                    }}
                  >
                    Max
                  </Button>
                )}
              </Box>

            </Box>

            {/* Nút thêm vào hàng chờ */}
            <Button
              variant="contained"
              type="submit"
              fullWidth
              startIcon={<QueueIcon />}
              disabled={!selectedStock || !factory || qty <= 0}
              sx={{
                bgcolor: '#15803d',
                borderRadius: '8px',
                textTransform: 'none',
                fontWeight: 800,
                fontSize: 13.5,
                py: 1.25,
                mt: 2,
                boxShadow: '0 4px 12px rgba(27,94,32,0.15)',
                '&:hover': { bgcolor: '#166534' },
                '&.Mui-disabled': { bgcolor: '#e2e8f0', color: '#94a3b8', boxShadow: 'none' }
              }}
            >
              Thêm vào danh sách chờ
            </Button>
          </Box>
        </Grid>

        {/* CỘT 3: TỔNG HỢP DANH SÁCH CHỜ ĐIỀU CHUYỂN */}
        <Grid size={{ xs: 12, md: 4 }} sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, textTransform: 'uppercase', fontSize: 11, letterSpacing: '0.5px' }}>
              3. Hàng Chờ Chuyển ({queuedTransfers.length})
            </Typography>
            {queuedTransfers.length > 0 && (
              <Button 
                onClick={() => setQueuedTransfers([])} 
                size="small" 
                color="error" 
                sx={{ textTransform: 'none', fontSize: 11, fontWeight: 700 }}
              >
                Xóa hết
              </Button>
            )}
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1, height: '100%', overflow: 'hidden' }}>
            {/* Hàng chờ hiển thị danh sách */}
            <Box sx={{ flexGrow: 1, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', bgcolor: '#f8fafc', p: 1.5 }}>
              {queuedTransfers.length === 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', py: 8, gap: 1.5 }}>
                  <BagIcon sx={{ color: '#cbd5e1', fontSize: 40 }} />
                  <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', textAlign: 'center', fontSize: 12.5, px: 2, lineHeight: 1.4 }}>
                    Hàng chờ trống.<br />Thêm các yêu cầu chuyển xưởng vào đây trước khi nhấn Xác nhận.
                  </Typography>
                </Box>
              ) : (
                <List disablePadding>
                  {queuedTransfers.map((item, index) => (
                    <React.Fragment key={item.idKey}>
                      <ListItem
                        secondaryAction={
                          <IconButton edge="end" size="small" onClick={() => setQueuedTransfers(prev => prev.filter(q => q.idKey !== item.idKey))} sx={{ color: '#ef4444' }}>
                            <DeleteIcon sx={{ fontSize: 18 }} />
                          </IconButton>
                        }
                        sx={{ px: 0.5, py: 1 }}
                      >
                        <ListItemText
                          primary={
                            <Typography sx={{ fontWeight: 800, fontSize: 12.5, color: '#0f172a', textTransform: 'uppercase' }}>
                              {item.nameMed}
                            </Typography>
                          }
                          secondary={
                            <Typography variant="caption" component="span" color="text.secondary" sx={{ display: 'block', mt: 0.25, fontSize: 11, lineHeight: 1.4 }}>
                              SL Chuyển: <b>{item.qty}</b> • Lô nguồn: <b>#{item.sourceNo}</b> <br />
                              Đích nhận: <b>{item.factory}</b>
                            </Typography>
                          }
                        />
                      </ListItem>
                      {index < queuedTransfers.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              )}
            </Box>

            {/* Nút gửi bulk transfer */}
            <Button
              variant="contained"
              onClick={handleConfirmAllTransfers}
              disabled={queuedTransfers.length === 0}
              startIcon={<SendIcon />}
              fullWidth
              sx={{
                bgcolor: '#15803d',
                borderRadius: '8px',
                textTransform: 'none',
                fontWeight: 800,
                fontSize: 14,
                py: 1.25,
                mt: 2,
                boxShadow: '0 4px 12px rgba(27,94,32,0.15)',
                '&:hover': { bgcolor: '#166534' },
                '&.Mui-disabled': { bgcolor: '#e2e8f0', color: '#94a3b8', boxShadow: 'none' }
              }}
            >
              Xác nhận chuyển xưởng ({queuedTransfers.length} lô)
            </Button>
          </Box>
        </Grid>

      </Grid>
    </Box>
  );
}
