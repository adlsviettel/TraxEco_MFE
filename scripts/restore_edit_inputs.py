import re

with open(r'd:\TSI\TestClaudeCode\TraxEco\src\apps\FGS_WH\pages\LabelConfigPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

target_empty_msg = """              {fetchedDimensions.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', p: 2, textAlign: 'center', bgcolor: '#f1f5f9', borderRadius: 1 }}>
                  Vui lòng kéo dữ liệu PO để lấy danh sách kích thước thùng tự động.
                </Typography>
              ) : null}"""

replacement_inputs = """              {fetchedDimensions.length === 0 && !editingId ? (
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', p: 2, textAlign: 'center', bgcolor: '#f1f5f9', borderRadius: 1 }}>
                  Vui lòng kéo dữ liệu PO để lấy danh sách kích thước thùng tự động.
                </Typography>
              ) : null}

              {(fetchedDimensions.length <= 1 || editingId) && (
                <>
                  <TextField 
                    label="Chiều Dài (CTNL) - mm" 
                    value={commonData.ctnL} 
                    onChange={e => {
                      setFetchedDimensions([]);
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
                </>
              )}"""

if target_empty_msg in content:
    content = content.replace(target_empty_msg, replacement_inputs)

target_pos = """                  <Box sx={{ width: 100, display: 'flex', alignItems: 'center' }}>
                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', pl: 1 }}>Tự động</Typography>
                  </Box>
                  <Box sx={{ width: 100, display: 'flex', alignItems: 'center' }}>
                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', pl: 1 }}>Tự động</Typography>
                  </Box>"""

replacement_pos = """                  {fetchedDimensions.length > 1 && !editingId ? (
                    <Box sx={{ width: 100, display: 'flex', alignItems: 'center' }}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', pl: 1 }}>Tự động</Typography>
                    </Box>
                  ) : (
                    <TextField label="PosX" type="number" value={mark.posX} onChange={e => handleMarkChange(mark.id, 'posX', parseFloat(e.target.value) || 0)} size="small" sx={{ width: 100 }} />
                  )}
                  {fetchedDimensions.length > 1 && !editingId ? (
                    <Box sx={{ width: 100, display: 'flex', alignItems: 'center' }}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', pl: 1 }}>Tự động</Typography>
                    </Box>
                  ) : (
                    <TextField label="PosY" type="number" value={mark.posY} onChange={e => handleMarkChange(mark.id, 'posY', parseFloat(e.target.value) || 0)} size="small" sx={{ width: 100 }} />
                  )}"""

if target_pos in content:
    content = content.replace(target_pos, replacement_pos)

with open(r'd:\TSI\TestClaudeCode\TraxEco\src\apps\FGS_WH\pages\LabelConfigPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
