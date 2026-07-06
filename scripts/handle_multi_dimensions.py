import re

with open(r'd:\TSI\TestClaudeCode\TraxEco\src\apps\FGS_WH\pages\LabelConfigPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add fetchedDimensions state
state_repl = """  const [poLoading, setPoLoading] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState(false);
  const [fetchedDimensions, setFetchedDimensions] = useState<{l: string, w: string, h: string}[]>([]);"""

content = content.replace("  const [poLoading, setPoLoading] = useState(false);\n  const [duplicateWarning, setDuplicateWarning] = useState(false);", state_repl)

# 2. Reset fetchedDimensions on dialog open
open_repl = """  const handleOpenDialog = (config?: LabelConfig, isCopy: boolean = false) => {
    setPoSearch('');
    setDuplicateWarning(false);
    setFetchedDimensions([]);"""

content = content.replace("  const handleOpenDialog = (config?: LabelConfig, isCopy: boolean = false) => {\n    setPoSearch('');\n    setDuplicateWarning(false);", open_repl)

# 3. Update handleFetchPO
fetch_repl = """  const handleFetchPO = async () => {
    if (!poSearch.trim()) {
      setError('Vui lòng nhập mã PO');
      return;
    }
    setPoLoading(true);
    setError('');
    try {
      const res = await fetch(`http://localhost:3001/api/inventory/po-config-info/${encodeURIComponent(poSearch.trim())}`);
      const data = await res.json();
      if (data.success && data.data) {
        let dims = data.data.dimensions || [];
        // Support old API response format if needed
        if (dims.length === 0 && data.data.ctnL) {
          dims = [{ ctnL: data.data.ctnL, ctnW: data.data.ctnW, ctnH: data.data.ctnH }];
        }
        
        const parsedDims = dims.map((d: any) => ({
          l: d.ctnL ? Math.round(parseFloat(d.ctnL) * 1000).toString() : '',
          w: d.ctnW ? Math.round(parseFloat(d.ctnW) * 1000).toString() : '',
          h: d.ctnH ? Math.round(parseFloat(d.ctnH) * 1000).toString() : ''
        })).filter((d: any) => d.l && d.w && d.h);

        setFetchedDimensions(parsedDims);

        const newCustNo = data.data.label || commonData.custNo;
        const newShipDest = data.data.shipDest || commonData.shipDest;
        
        // Show first dimension in commonData
        const firstL = parsedDims.length > 0 ? parsedDims[0].l : commonData.ctnL;
        const firstW = parsedDims.length > 0 ? parsedDims[0].w : commonData.ctnW;
        const firstH = parsedDims.length > 0 ? parsedDims[0].h : commonData.ctnH;

        if (newCustNo && newShipDest && parsedDims.length > 0) {
          // Check if ALL these dimensions already exist
          const allExist = parsedDims.every((dim: any) => 
            configs.some(c => 
              c.custNo === newCustNo && 
              c.shipDest === newShipDest &&
              c.ctnL === dim.l &&
              c.ctnW === dim.w &&
              c.ctnH === dim.h
            )
          );
          setDuplicateWarning(allExist);
        } else {
          setDuplicateWarning(false);
        }

        setCommonData(prev => ({
          ...prev,
          custNo: newCustNo,
          shipDest: newShipDest,
          ctnL: firstL,
          ctnW: firstW,
          ctnH: firstH
        }));
        
        // Recalculate marks UI just for the first dimension for display purposes
        if (parsedDims.length > 0) {
          const l = parseFloat(firstL) || 0;
          const w = parseFloat(firstW) || 0;
          const h = parseFloat(firstH) || 0;
          
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
        }
      } else {
        setError('Không tìm thấy thông tin PO này trong DB');
      }
    } catch (err: any) {
      setError('Lỗi kết nối khi kéo dữ liệu PO');
    } finally {
      setPoLoading(false);
    }
  };"""

content = re.sub(r'  const handleFetchPO = async \(\) => \{.*?finally \{\n      setPoLoading\(false\);\n    \}\n  \};', fetch_repl, content, flags=re.DOTALL)

# 4. Update executeSave to loop over fetchedDimensions
save_repl = """  const executeSave = async () => {
    try {
      setLoading(true);
      
      const promises: any[] = [];
      const dimsToSave = fetchedDimensions.length > 0 
        ? fetchedDimensions 
        : [{ l: commonData.ctnL, w: commonData.ctnW, h: commonData.ctnH }];

      dimsToSave.forEach(dim => {
        marksData.forEach(mark => {
          let px = mark.posX;
          let py = mark.posY;
          
          // Force recalculate coordinates specifically for this dimension size
          const dimL = parseFloat(dim.l) || 0;
          const dimW = parseFloat(dim.w) || 0;
          const dimH = parseFloat(dim.h) || 0;
          
          if (mark.area === 'A' || mark.area === 'B') {
            if (dimL > 0) px = parseFloat(((dimL - 200) / 2).toFixed(2));
            if (dimH > 0) py = parseFloat(((dimH - 160) / 2).toFixed(2));
          } else if (mark.area === 'C' || mark.area === 'D') {
            if (dimW > 0) px = parseFloat(((dimW - 200) / 2).toFixed(2));
            if (dimH > 0) py = parseFloat(((dimH - 160) / 2).toFixed(2));
          }

          const payload = {
            recNo: editingId, // Will only be defined if editing a single config
            custNo: commonData.custNo,
            customer: commonData.customer,
            shipDest: commonData.shipDest,
            ctnL: dim.l,
            ctnW: dim.w,
            ctnH: dim.h,
            ext1: commonData.ext1,
            ext2: commonData.ext2,
            ext3: commonData.ext3,
            shippingMarkId: mark.shippingMarkId,
            area: mark.area,
            sealMethod: mark.sealMethod,
            posX: px,
            posY: py
          };
          
          promises.push(
            authFetch(`/v2/label-config`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            }).then(res => res.json())
          );
        });
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

content = re.sub(r'  const executeSave = async \(\) => \{.*?finally \{\n      setLoading\(false\);\n    \}\n  \};', save_repl, content, flags=re.DOTALL)


# 5. Update UI to display the multiple dimensions
ui_repl = """            {/* Cột 2: Thông số Carton (Bắt buộc) */}
            <Box display="flex" flexDirection="column" gap={2} p={2} border="1px solid #e0e0e0" borderRadius={2} bgcolor="#f8fafc">
              <Typography variant="subtitle2" color="primary" sx={{ mb: -1 }}>KÍCH THƯỚC THÙNG (Chung)</Typography>
              
              {fetchedDimensions.length > 1 ? (
                <Alert severity="info" sx={{ mb: 1 }}>
                  PO này có <b>{fetchedDimensions.length}</b> kích thước thùng:
                  <ul style={{ margin: 0, paddingLeft: 20 }}>
                    {fetchedDimensions.map((d, i) => (
                      <li key={i}>{d.l} x {d.w} x {d.h} mm</li>
                    ))}
                  </ul>
                  Hệ thống sẽ tự động sinh cấu hình cho <b>tất cả</b> các kích thước này khi bạn bấm Lưu.
                </Alert>
              ) : null}

              <TextField 
                label="Chiều Dài (CTNL) - mm" 
                value={commonData.ctnL} 
                onChange={e => {
                  setFetchedDimensions([]); // User manually edits, override bulk dims
                  handleDimensionChange('ctnL', e.target.value);
                }} 
                size="small" fullWidth required 
              />
              <TextField 
                label="Chiều Rộng (CTNW) - mm" 
                value={commonData.ctnW} 
                onChange={e => {
                  setFetchedDimensions([]); 
                  handleDimensionChange('ctnW', e.target.value);
                }} 
                size="small" fullWidth required 
              />
              <TextField 
                label="Chiều Cao (CTNH) - mm" 
                value={commonData.ctnH} 
                onChange={e => {
                  setFetchedDimensions([]); 
                  handleDimensionChange('ctnH', e.target.value);
                }} 
                size="small" fullWidth required 
              />
            </Box>"""

content = re.sub(r'            \{\/\* Cột 2: Thông số Carton \(Bắt buộc\) \*\/.*?<\/Box>', ui_repl, content, flags=re.DOTALL)

with open(r'd:\TSI\TestClaudeCode\TraxEco\src\apps\FGS_WH\pages\LabelConfigPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
