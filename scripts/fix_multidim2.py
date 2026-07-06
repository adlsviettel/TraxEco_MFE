import re

with open(r'd:\TSI\TestClaudeCode\TraxEco\src\apps\FGS_WH\pages\LabelConfigPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace CTNL, CTNW, CTNH
pattern_dims = re.compile(
    r'<TextField\s+label="Chiều Dài \(CTNL\) - mm"[\s\S]*?onChange=\{e => \{\s*setFetchedDimensions\(\[\]\);\s*handleDimensionChange\(\'ctnH\', e\.target\.value\);\s*\}\}\s*size="small"\s+fullWidth\s+required\s+/>'
)

if pattern_dims.search(content):
    replacement_dims = """{fetchedDimensions.length <= 1 && (
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
    content = pattern_dims.sub(replacement_dims, content)

# Now check PosX and PosY
pattern_posx = re.compile(
    r'<TextField\s*label="PosX\s*\(Auto\)"\s*type="number"\s*value=\{mark\.posX\}\s*onChange=\{e => handleMarkChange\(mark\.id,\s*\'posX\',\s*parseFloat\(e\.target\.value\) \|\| 0\)\}\s*size="small"\s*sx=\{\{\s*width:\s*80\s*\}\}\s*/>'
)

if pattern_posx.search(content):
    replacement_posx = """{fetchedDimensions.length > 1 ? (
                    <Box sx={{ width: 80, display: 'flex', alignItems: 'center' }}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>Tự động</Typography>
                    </Box>
                  ) : (
                    <TextField 
                      label="PosX (Auto)"
                      type="number"
                      value={mark.posX} 
                      onChange={e => handleMarkChange(mark.id, 'posX', parseFloat(e.target.value) || 0)} 
                      size="small" 
                      sx={{ width: 80 }}
                    />
                  )}"""
    content = pattern_posx.sub(replacement_posx, content)

pattern_posy = re.compile(
    r'<TextField\s*label="PosY\s*\(Auto\)"\s*type="number"\s*value=\{mark\.posY\}\s*onChange=\{e => handleMarkChange\(mark\.id,\s*\'posY\',\s*parseFloat\(e\.target\.value\) \|\| 0\)\}\s*size="small"\s*sx=\{\{\s*width:\s*80\s*\}\}\s*/>'
)

if pattern_posy.search(content):
    replacement_posy = """{fetchedDimensions.length > 1 ? (
                    <Box sx={{ width: 80, display: 'flex', alignItems: 'center' }}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>Tự động</Typography>
                    </Box>
                  ) : (
                    <TextField 
                      label="PosY (Auto)"
                      type="number"
                      value={mark.posY} 
                      onChange={e => handleMarkChange(mark.id, 'posY', parseFloat(e.target.value) || 0)} 
                      size="small" 
                      sx={{ width: 80 }}
                    />
                  )}"""
    content = pattern_posy.sub(replacement_posy, content)


with open(r'd:\TSI\TestClaudeCode\TraxEco\src\apps\FGS_WH\pages\LabelConfigPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
