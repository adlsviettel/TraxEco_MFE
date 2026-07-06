import re

with open(r'd:\TSI\TestClaudeCode\TraxEco\src\apps\FGS_WH\pages\LabelConfigPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add duplicateWarning state
state_repl = """  const [poLoading, setPoLoading] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState(false);"""

content = content.replace("  const [poLoading, setPoLoading] = useState(false);", state_repl)

# 2. Reset duplicateWarning on open dialog
open_repl = """  const handleOpenDialog = (config?: LabelConfig, isCopy: boolean = false) => {
    setPoSearch('');
    setDuplicateWarning(false);"""

content = content.replace("  const handleOpenDialog = (config?: LabelConfig, isCopy: boolean = false) => {\n    setPoSearch('');", open_repl)

# 3. Update handleFetchPO to check for duplicates
fetch_po_repl = """      if (data.success && data.data) {
        const newCustNo = data.data.label || commonData.custNo;
        const newShipDest = data.data.shipDest || commonData.shipDest;
        
        // Check for existing configs
        if (newCustNo && newShipDest) {
          const isExist = configs.some(c => c.custNo === newCustNo && c.shipDest === newShipDest);
          setDuplicateWarning(isExist);
        } else {
          setDuplicateWarning(false);
        }

        setCommonData(prev => ({
          ...prev,"""

content = content.replace("""      if (data.success && data.data) {
        setCommonData(prev => ({
          ...prev,""", fetch_po_repl)

# 4. Update UI to show the warning
ui_repl = """        <DialogContent dividers>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {duplicateWarning && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              <b>Cảnh báo:</b> Cấu hình cho Mã KH/Label này và Nơi đến này <b>đã tồn tại</b> trong hệ thống. Việc lưu thêm có thể tạo ra dữ liệu trùng lặp! Hãy kiểm tra lại danh sách bên ngoài trước khi tiếp tục.
            </Alert>
          )}"""

content = content.replace("""        <DialogContent dividers>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}""", ui_repl)

# 5. Add confirm dialog block on Save if duplicateWarning is true
# Wait, handleSave is an async function. If we want to use the ConfirmDialog, it takes a callback.
# But it's easier to just let the user save if they read the Alert warning, or we can use the ConfirmDialog.
# Let's intercept handleSave:
save_repl = """  const executeSave = async () => {
    try {
      setLoading(true);
      const promises = marksData.map(mark => {
        const payload = {
          recNo: editingId,
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
  };

  const handleSave = async () => {
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
    
    if (duplicateWarning && !editingId) {
      setConfirmDialog({
        open: true,
        title: 'Cảnh báo Trùng Lặp',
        message: 'Hệ thống phát hiện đã có cấu hình cho Label và Nơi đến này. Bạn có CHẮC CHẮN muốn tạo thêm một cấu hình mới đè lên không?',
        variant: 'warning',
        onConfirm: () => {
          setConfirmDialog(p => ({ ...p, open: false }));
          executeSave();
        }
      });
      return;
    }
    
    executeSave();
  };"""

# We need to replace the existing handleSave with this new structure.
content = re.sub(r'  const handleSave = async \(\) => \{.*?finally \{\n      setLoading\(false\);\n    \}\n  \};', save_repl, content, flags=re.DOTALL)


with open(r'd:\TSI\TestClaudeCode\TraxEco\src\apps\FGS_WH\pages\LabelConfigPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
