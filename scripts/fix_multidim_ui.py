import re

with open(r'd:\TSI\TestClaudeCode\TraxEco\src\apps\FGS_WH\pages\LabelConfigPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Hide the CTNL/W/H inputs if multiple dimensions exist
target_inputs = """              <TextField 
                label="Chiều Dài (CTNL) - mm" 
                value={commonData.ctnL} 
                onChange={e => handleDimensionChange('ctnL', e.target.value)} 
                size="small" 
                fullWidth 
                required 
              />
              <TextField 
                label="Chiều Rộng (CTNW) - mm" 
                value={commonData.ctnW} 
                onChange={e => handleDimensionChange('ctnW', e.target.value)} 
                size="small" 
                fullWidth 
                required 
              />
              <TextField 
                label="Chiều Cao (CTNH) - mm" 
                value={commonData.ctnH} 
                onChange={e => handleDimensionChange('ctnH', e.target.value)} 
                size="small" 
                fullWidth 
                required 
              />"""

replacement_inputs = """              {fetchedDimensions.length <= 1 && (
                <>
                  <TextField 
                    label="Chiều Dài (CTNL) - mm" 
                    value={commonData.ctnL} 
                    onChange={e => handleDimensionChange('ctnL', e.target.value)} 
                    size="small" 
                    fullWidth 
                    required 
                  />
                  <TextField 
                    label="Chiều Rộng (CTNW) - mm" 
                    value={commonData.ctnW} 
                    onChange={e => handleDimensionChange('ctnW', e.target.value)} 
                    size="small" 
                    fullWidth 
                    required 
                  />
                  <TextField 
                    label="Chiều Cao (CTNH) - mm" 
                    value={commonData.ctnH} 
                    onChange={e => handleDimensionChange('ctnH', e.target.value)} 
                    size="small" 
                    fullWidth 
                    required 
                  />
                </>
              )}"""

content = content.replace(target_inputs, replacement_inputs)

# 2. Hide PosX and PosY inputs in the table if multiple dimensions exist
# Look for the PosX TextField
target_posx = """                  <TextField 
                    type="number"
                    value={mark.posX} 
                    onChange={e => handleMarkChange(mark.id, 'posX', parseFloat(e.target.value) || 0)} 
                    size="small" 
                    sx={{ width: 80 }}
                  />"""

replacement_posx = """                  {fetchedDimensions.length > 1 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', pl: 1 }}>Tự động</Typography>
                  ) : (
                    <TextField 
                      type="number"
                      value={mark.posX} 
                      onChange={e => handleMarkChange(mark.id, 'posX', parseFloat(e.target.value) || 0)} 
                      size="small" 
                      sx={{ width: 80 }}
                    />
                  )}"""

content = content.replace(target_posx, replacement_posx)

# Look for the PosY TextField
target_posy = """                  <TextField 
                    type="number"
                    value={mark.posY} 
                    onChange={e => handleMarkChange(mark.id, 'posY', parseFloat(e.target.value) || 0)} 
                    size="small" 
                    sx={{ width: 80 }}
                  />"""

replacement_posy = """                  {fetchedDimensions.length > 1 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', pl: 1 }}>Tự động</Typography>
                  ) : (
                    <TextField 
                      type="number"
                      value={mark.posY} 
                      onChange={e => handleMarkChange(mark.id, 'posY', parseFloat(e.target.value) || 0)} 
                      size="small" 
                      sx={{ width: 80 }}
                    />
                  )}"""

content = content.replace(target_posy, replacement_posy)

with open(r'd:\TSI\TestClaudeCode\TraxEco\src\apps\FGS_WH\pages\LabelConfigPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
