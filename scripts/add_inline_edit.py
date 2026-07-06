import re

with open(r'd:\TSI\TestClaudeCode\TraxEco\src\apps\FGS_WH\pages\LabelConfigPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add handleQuickSave inside the component
quick_save_code = """  const handleQuickSave = async (row: LabelConfig, field: 'posX' | 'posY', value: number) => {
    try {
      const payload = { ...row, [field]: value };
      const res = await authFetch(`/v2/label-config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.code === 200) {
        fetchConfigs();
      } else {
        setError('Cập nhật nhanh thất bại: ' + data.msg);
      }
    } catch (err) {
      setError('Lỗi kết nối khi cập nhật nhanh');
    }
  };"""

target_handleDelete = """  const handleDelete = (id: number) => {"""
if "const handleQuickSave" not in content:
    content = content.replace(target_handleDelete, quick_save_code + "\n\n" + target_handleDelete)


# 2. Add InlineEditCell outside the component
inline_edit_code = """const InlineEditCell = ({ value, onSave }: { value: number, onSave: (val: number) => void }) => {
  const [isEditing, setIsEditing] = React.useState(false);
  const [val, setVal] = React.useState(value);

  React.useEffect(() => { setVal(value); }, [value]);

  if (isEditing) {
    return (
      <TextField
        size="small"
        type="number"
        autoFocus
        value={val}
        onChange={e => setVal(parseFloat(e.target.value) || 0)}
        onBlur={() => { setIsEditing(false); if (val !== value) onSave(val); }}
        onKeyDown={e => { if (e.key === 'Enter') { setIsEditing(false); if (val !== value) onSave(val); } }}
        sx={{ width: 60, '& .MuiInputBase-input': { p: '2px 4px', fontSize: '0.85rem', textAlign: 'center' } }}
      />
    );
  }
  return (
    <Box 
      onClick={() => setIsEditing(true)} 
      sx={{ cursor: 'pointer', borderBottom: '1px dashed #2196f3', color: '#1976d2', fontWeight: 600, display: 'inline-block', minWidth: 24, textAlign: 'center' }}
    >
      {value}
    </Box>
  );
};"""

target_export = "export default function LabelConfigPage() {"
if "const InlineEditCell" not in content:
    content = content.replace(target_export, inline_edit_code + "\n\n" + target_export)


# 3. Replace TableCells
target_cells = """                    <TableCell>{row.posX}</TableCell>
                    <TableCell>{row.posY}</TableCell>"""

replacement_cells = """                    <TableCell>
                      <InlineEditCell value={row.posX} onSave={(newVal) => handleQuickSave(row, 'posX', newVal)} />
                    </TableCell>
                    <TableCell>
                      <InlineEditCell value={row.posY} onSave={(newVal) => handleQuickSave(row, 'posY', newVal)} />
                    </TableCell>"""

if target_cells in content:
    content = content.replace(target_cells, replacement_cells)


# 4. Modify executeSave so it doesn't overwrite manually edited PosX/PosY if editingId is set
target_executeSave = """          let px = mark.posX;
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
          }"""

replacement_executeSave = """          let px = mark.posX;
          let py = mark.posY;
          
          // Force recalculate ONLY if NOT editing an existing config manually
          if (!editingId || (px === 0 && py === 0)) {
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
          }"""

if target_executeSave in content:
    content = content.replace(target_executeSave, replacement_executeSave)


with open(r'd:\TSI\TestClaudeCode\TraxEco\src\apps\FGS_WH\pages\LabelConfigPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
