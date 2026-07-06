import re

with open(r'd:\TSI\TestClaudeCode\TraxEco\src\apps\FGS_WH\pages\LabelConfigPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update states
state_repl = """  // Dialog State
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | undefined>(undefined);
  const [poSearch, setPoSearch] = useState('');
  const [poLoading, setPoLoading] = useState(false);
  
  const [commonData, setCommonData] = useState({
    custNo: '', ctnL: '', ctnW: '', ctnH: '', shipDest: '', customer: '', ext1: '', ext2: '', ext3: ''
  });
  
  const [marksData, setMarksData] = useState<any[]>([
    { id: Date.now(), shippingMarkId: 0, area: 'A', sealMethod: 'H', posX: 0, posY: 0 }
  ]);"""

content = re.sub(r'  // Dialog State.*?ext3: \'\'\n  \}\);', state_repl, content, flags=re.DOTALL)

# 2. Update handleOpenDialog
open_repl = """  const handleOpenDialog = (config?: LabelConfig, isCopy: boolean = false) => {
    setPoSearch('');
    if (config) {
      setEditingId(isCopy ? undefined : config.recNo);
      setCommonData({
        custNo: config.custNo || '',
        ctnL: config.ctnL || '',
        ctnW: config.ctnW || '',
        ctnH: config.ctnH || '',
        shipDest: config.shipDest || '',
        customer: config.customer || '',
        ext1: config.ext1 || '',
        ext2: config.ext2 || '',
        ext3: config.ext3 || ''
      });
      setMarksData([{
        id: Date.now(),
        shippingMarkId: config.shippingMarkId || 0,
        area: config.area || 'A',
        sealMethod: config.sealMethod || 'H',
        posX: config.posX || 0,
        posY: config.posY || 0
      }]);
    } else {
      setEditingId(undefined);
      setCommonData({
        custNo: '', ctnL: '', ctnW: '', ctnH: '', shipDest: '', customer: '', ext1: '', ext2: '', ext3: ''
      });
      setMarksData([{
        id: Date.now(), shippingMarkId: 0, area: 'A', sealMethod: 'H', posX: 0, posY: 0
      }]);
    }
    setOpen(true);
  };"""

content = re.sub(r'  const handleOpenDialog = .*?setOpen\(true\);\n  \};', open_repl, content, flags=re.DOTALL)

# 3. Add handleFetchPO
fetch_po_logic = """
  const handleFetchPO = async () => {
    if (!poSearch.trim()) {
      setError('Vui lòng nhập mã PO');
      return;
    }
    setPoLoading(true);
    setError('');
    try {
      // Use standard fetch to the node.js backend we just created
      const res = await fetch(`http://localhost:3001/api/inventory/po-config-info/${encodeURIComponent(poSearch.trim())}`);
      const data = await res.json();
      if (data.success && data.data) {
        setCommonData(prev => ({
          ...prev,
          custNo: data.data.label || prev.custNo,
          shipDest: data.data.shipDest || prev.shipDest,
          ctnL: data.data.ctnL ? parseFloat(data.data.ctnL).toString() : prev.ctnL,
          ctnW: data.data.ctnW ? parseFloat(data.data.ctnW).toString() : prev.ctnW,
          ctnH: data.data.ctnH ? parseFloat(data.data.ctnH).toString() : prev.ctnH
        }));
        
        // Recalculate positions for all current marks
        if (data.data.ctnL || data.data.ctnW || data.data.ctnH) {
          const l = parseFloat(data.data.ctnL) || parseFloat(commonData.ctnL) || 0;
          const w = parseFloat(data.data.ctnW) || parseFloat(commonData.ctnW) || 0;
          const h = parseFloat(data.data.ctnH) || parseFloat(commonData.ctnH) || 0;
          
          setMarksData(prev => prev.map(m => {
            let px = m.posX;
            let py = m.posY;
            // A/B usually uses Length and Height
            if (m.area === 'A' || m.area === 'B') {
              if (l > 0) px = parseFloat(((l - 200) / 2).toFixed(2));
              if (h > 0) py = parseFloat(((h - 160) / 2).toFixed(2));
            } else if (m.area === 'C' || m.area === 'D') {
              // C/D usually uses Width and Height
              if (w > 0) px = parseFloat(((w - 200) / 2).toFixed(2));
              if (h > 0) py = parseFloat(((h - 160) / 2).toFixed(2));
            }
            return { ...m, posX: px, posY: py };
          }));
        }
      } else {
        setError('Không tìm thấy thông tin PO này trong DB');
      }
    } catch (err: any) {
      setError('Lỗi kết nối khi kéo dữ liệu PO');
    } finally {
      setPoLoading(false);
    }
  };

  const handleDimensionChange = (field: 'ctnL' | 'ctnW' | 'ctnH', value: string) => {
    setCommonData(prev => ({ ...prev, [field]: value }));
    const l = parseFloat(field === 'ctnL' ? value : commonData.ctnL) || 0;
    const w = parseFloat(field === 'ctnW' ? value : commonData.ctnW) || 0;
    const h = parseFloat(field === 'ctnH' ? value : commonData.ctnH) || 0;
    
    setMarksData(prev => prev.map(m => {
      let px = m.posX;
      let py = m.posY;
      if (m.area === 'A' || m.area === 'B') {
        if (l > 0) px = parseFloat(((l - 200) / 2).toFixed(2));
        if (h > 0) py = parseFloat(((h - 160) / 2).toFixed(2));
      } else if (m.area === 'C' || m.area === 'D') {
        if (w > 0) px = parseFloat(((w - 200) / 2).toFixed(2));
        if (h > 0) py = parseFloat(((h - 160) / 2).toFixed(2));
      }
      return { ...m, posX: px, posY: py };
    }));
  };

  const handleMarkChange = (id: number, field: string, value: any) => {
    setMarksData(prev => prev.map(m => {
      if (m.id !== id) return m;
      const updated = { ...m, [field]: value };
      
      // Auto recalc position if area changes
      if (field === 'area') {
        const l = parseFloat(commonData.ctnL) || 0;
        const w = parseFloat(commonData.ctnW) || 0;
        const h = parseFloat(commonData.ctnH) || 0;
        if (value === 'A' || value === 'B') {
          if (l > 0) updated.posX = parseFloat(((l - 200) / 2).toFixed(2));
          if (h > 0) updated.posY = parseFloat(((h - 160) / 2).toFixed(2));
        } else if (value === 'C' || value === 'D') {
          if (w > 0) updated.posX = parseFloat(((w - 200) / 2).toFixed(2));
          if (h > 0) updated.posY = parseFloat(((h - 160) / 2).toFixed(2));
        }
      }
      return updated;
    }));
  };
"""

content = re.sub(r'  const handleDimensionChange = .*?setFormData\(newFormData\);\n  \};', fetch_po_logic, content, flags=re.DOTALL)

# 4. Update handleSave
save_repl = """  const handleSave = async () => {
    if (!commonData.ctnL || !commonData.ctnW || !commonData.ctnH) {
      setError('Vui lòng nhập đầy đủ kích thước Dài, Rộng, Cao');
      return;
    }
    if (!commonData.custNo || !commonData.customer || !commonData.shipDest) {
      setError('Vui lòng nhập đầy đủ Mã KH, Khách Hàng, Nơi Đóng Hàng');
      return;
    }
    if (marksData.length === 0) {
      setError('Vui lòng thêm ít nhất 1 Tem (Shipping Mark)');
      return;
    }
    
    try {
      setLoading(true);
      
      // Execute all saves concurrently
      const promises = marksData.map(mark => {
        const payload = {
          recNo: editingId, // If editing, we overwrite the same record (bulk add disables editingId)
          custNo: commonData.custNo,
          customer: commonData.customer,
          shipDest: commonData.shipDest,
          ctnL: commonData.ctnL,
          ctnW: commonData.ctnW,
          ctnH: commonData.ctnH,
          ext1: commonData.ext1,
          ext2: commonData.ext2,
          ext3: commonData.ext3,
          shippingMarkId: mark.shippingMarkId,
          area: mark.area,
          sealMethod: mark.sealMethod,
          posX: mark.posX,
          posY: mark.posY
        };
        return authFetch(`/v2/label-config`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).then(res => res.json());
      });
      
      const results = await Promise.all(promises);
      const failed = results.filter(r => r.code !== 200);
      
      if (failed.length === 0) {
        handleCloseDialog();
        fetchConfigs();
      } else {
        setError(`Có ${failed.length} tem lưu thất bại! Lỗi: ` + failed[0].msg);
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };"""

content = re.sub(r'  const handleSave = async \(\) => \{.*?finally \{\n      setLoading\(false\);\n    \}\n  \};', save_repl, content, flags=re.DOTALL)


# 5. Update Dialog UI
dialog_ui = """      <Dialog open={open} onClose={handleCloseDialog} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {editingId ? 'Sửa Cấu Hình' : 'Thêm Cấu Hình Hàng Loạt'}
          
          {/* PO Search Section */}
          <Box display="flex" gap={1} alignItems="center">
            <TextField 
              size="small" 
              placeholder="Nhập PO Puma (VD: 4602900114)" 
              value={poSearch} 
              onChange={e => setPoSearch(e.target.value)}
              sx={{ width: 250, bgcolor: 'white' }}
            />
            <Button 
              variant="contained" 
              color="secondary" 
              disabled={poLoading}
              onClick={handleFetchPO}
            >
              {poLoading ? <CircularProgress size={24} color="inherit" /> : 'Kéo dữ liệu PO'}
            </Button>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          
          <Box display="grid" gap={3} gridTemplateColumns="repeat(2, 1fr)" sx={{ mb: 3 }}>
            {/* Cột 1: Thông Tin Khách Hàng (Bắt buộc) */}
            <Box display="flex" flexDirection="column" gap={2} p={2} border="1px solid #e0e0e0" borderRadius={2} bgcolor="#f8fafc">
              <Typography variant="subtitle2" color="primary" sx={{ mb: -1 }}>THÔNG TIN CHUNG</Typography>
              <TextField label="Mã KH/Label (CustNo)" value={commonData.custNo} onChange={e => setCommonData({ ...commonData, custNo: e.target.value })} size="small" fullWidth required />
              <TextField label="Khách Hàng (Customer)" value={commonData.customer} onChange={e => setCommonData({ ...commonData, customer: e.target.value })} size="small" fullWidth required />
              <TextField label="Nơi Đóng Hàng (ShipDest)" value={commonData.shipDest} onChange={e => setCommonData({ ...commonData, shipDest: e.target.value })} size="small" fullWidth required />
              
              <Typography variant="subtitle2" color="secondary" sx={{ mb: -1, mt: 1 }}>Trường Tùy Chọn</Typography>
              <Box display="flex" gap={1}>
                <TextField label="Mở rộng 1" value={commonData.ext1} onChange={e => setCommonData({ ...commonData, ext1: e.target.value })} size="small" fullWidth />
                <TextField label="Mở rộng 2" value={commonData.ext2} onChange={e => setCommonData({ ...commonData, ext2: e.target.value })} size="small" fullWidth />
                <TextField label="Mở rộng 3" value={commonData.ext3} onChange={e => setCommonData({ ...commonData, ext3: e.target.value })} size="small" fullWidth />
              </Box>
            </Box>

            {/* Cột 2: Thông số Carton (Bắt buộc) */}
            <Box display="flex" flexDirection="column" gap={2} p={2} border="1px solid #e0e0e0" borderRadius={2} bgcolor="#f8fafc">
              <Typography variant="subtitle2" color="primary" sx={{ mb: -1 }}>KÍCH THƯỚC THÙNG (Chung)</Typography>
              <TextField label="Chiều Dài (CTNL)" value={commonData.ctnL} onChange={e => handleDimensionChange('ctnL', e.target.value)} size="small" fullWidth required />
              <TextField label="Chiều Rộng (CTNW)" value={commonData.ctnW} onChange={e => handleDimensionChange('ctnW', e.target.value)} size="small" fullWidth required />
              <TextField label="Chiều Cao (CTNH)" value={commonData.ctnH} onChange={e => handleDimensionChange('ctnH', e.target.value)} size="small" fullWidth required />
            </Box>
          </Box>
          
          {/* Danh Sách Động: Tem và Mặt In */}
          <Box p={2} border="1px solid #bbdefb" borderRadius={2} bgcolor="#e3f2fd">
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="subtitle1" fontWeight="bold" color="primary">DANH SÁCH TEM & MẶT IN (Mỗi Tem 1 dòng)</Typography>
              {!editingId && (
                <Button 
                  variant="outlined" 
                  startIcon={<AddIcon />} 
                  onClick={() => setMarksData(p => [...p, { id: Date.now(), shippingMarkId: 0, area: 'A', sealMethod: 'H', posX: 0, posY: 0 }])}
                >
                  Thêm Tem
                </Button>
              )}
            </Box>
            
            <Stack spacing={2}>
              {marksData.map((mark, index) => (
                <Box key={mark.id} display="flex" gap={2} alignItems="center" bgcolor="white" p={1.5} borderRadius={1} boxShadow="0 1px 3px rgba(0,0,0,0.1)">
                  <Typography variant="body2" fontWeight="bold" color="text.secondary" sx={{ width: 20 }}>{index + 1}.</Typography>
                  <Autocomplete
                    options={[{ shippingMarkId: 0, shippingMarkPicture: '-- Chọn Mã Tem --' }, ...shippingMarks]}
                    getOptionLabel={(option) => option.shippingMarkId === 0 ? option.shippingMarkPicture : `${option.shippingMarkId} - ${option.shippingMarkPicture}`}
                    value={
                      (mark.shippingMarkId === 0) 
                        ? { shippingMarkId: 0, shippingMarkPicture: '-- Chọn Mã Tem --' }
                        : shippingMarks.find(sm => sm.shippingMarkId === mark.shippingMarkId) || { shippingMarkId: 0, shippingMarkPicture: '-- Chọn Mã Tem --' }
                    }
                    onChange={(e, v) => handleMarkChange(mark.id, 'shippingMarkId', v ? v.shippingMarkId : 0)}
                    isOptionEqualToValue={(o, v) => o.shippingMarkId === v.shippingMarkId}
                    renderInput={(params) => <TextField {...params} label="ShippingMark ID" size="small" sx={{ minWidth: 250 }} />}
                    disableClearable
                  />
                  <TextField select label="Mặt In (Area)" value={mark.area} onChange={e => handleMarkChange(mark.id, 'area', e.target.value)} size="small" sx={{ width: 120 }}>
                    <MenuItem value="A">Mặt A</MenuItem>
                    <MenuItem value="B">Mặt B</MenuItem>
                    <MenuItem value="C">Mặt C</MenuItem>
                    <MenuItem value="D">Mặt D</MenuItem>
                    <MenuItem value="E">Mặt E</MenuItem>
                    <MenuItem value="F">Mặt F</MenuItem>
                  </TextField>
                  <TextField select label="Kiểu dán" value={mark.sealMethod} onChange={e => handleMarkChange(mark.id, 'sealMethod', e.target.value)} size="small" sx={{ width: 150 }}>
                    <MenuItem value="H">Chữ H (H)</MenuItem>
                    <MenuItem value="I">Chữ I (I)</MenuItem>
                    <MenuItem value="U">Chữ U (U)</MenuItem>
                  </TextField>
                  <TextField label="PosX (Auto)" type="number" value={mark.posX} onChange={e => handleMarkChange(mark.id, 'posX', parseFloat(e.target.value) || 0)} size="small" sx={{ width: 100 }} />
                  <TextField label="PosY (Auto)" type="number" value={mark.posY} onChange={e => handleMarkChange(mark.id, 'posY', parseFloat(e.target.value) || 0)} size="small" sx={{ width: 100 }} />
                  
                  {!editingId && marksData.length > 1 && (
                    <IconButton color="error" onClick={() => setMarksData(p => p.filter(m => m.id !== mark.id))}>
                      <DeleteIcon />
                    </IconButton>
                  )}
                </Box>
              ))}
            </Stack>
          </Box>
        </DialogContent>"""

content = re.sub(r'      <Dialog open=\{open\}.*?        </DialogContent>', dialog_ui, content, flags=re.DOTALL)

with open(r'd:\TSI\TestClaudeCode\TraxEco\src\apps\FGS_WH\pages\LabelConfigPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
