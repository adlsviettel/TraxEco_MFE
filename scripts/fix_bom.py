import re

with open(r'D:\TSI\TestClaudeCode\TraxEco\src\apps\RD_MATERIAL\pages\ProductFormDrawer.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Imports
content = content.replace(
    "Table, TableBody, TableCell, TableContainer, Drawer,",
    "Drawer, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,"
)
if "Table," not in content:
    content = content.replace(
        "Drawer, DialogContent,",
        "Drawer, DialogContent, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,"
    )

# 2. Add DeleteIcon
if "import DeleteIcon" not in content:
    content = content.replace(
        "import CloseIcon from '@mui/icons-material/Close';",
        "import CloseIcon from '@mui/icons-material/Close';\nimport DeleteIcon from '@mui/icons-material/Delete';"
    )

# 3. Add states for materials and bom
state_code = """  // Dynamic Options
  const [garmentCategoryOpts, setGarmentCategoryOpts] = useState<string[]>(['Tops', 'Pants', 'Jackets', 'Polo', 'Shorts', 'Dress']);
  const [sportCategoryOpts, setSportCategoryOpts] = useState<string[]>(['Golf', 'Running', 'Training', 'Yoga', 'Lifestyle']);
  const [sampleStageOpts, setSampleStageOpts] = useState<string[]>(['Mock up', '1st proto', '2nd proto', 'Sales sample']);
  const [allocationOpts, setAllocationOpts] = useState<string[]>(['Puma SR', 'Adidas SR', 'R&D', 'Nike SR']);

  // Fabrics & Accessories for Lookups
  const [materials, setMaterials] = useState<Item[]>([]);
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [bomList, setBomList] = useState<any[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState<Item | null>(null);
  const [selectedUsage, setSelectedUsage] = useState<string>('Main Fabric');
"""

content = re.sub(
    r"// Dynamic Options.*?const \[loadingFabrics, setLoadingFabrics\] = useState\(false\);",
    state_code,
    content,
    flags=re.DOTALL
)

# 4. Load materials
load_materials_old = """      if (fabrics.length === 0) {
        setLoadingFabrics(true);
        rdItemApi.getAll({ itemType: 'FABRIC', size: 500 }).then(res => {
          setFabrics(res.content || []);
        }).finally(() => setLoadingFabrics(false));
      }"""
load_materials_new = """      if (materials.length === 0) {
        setLoadingMaterials(true);
        Promise.all([
          rdItemApi.getAll({ itemType: 'FABRIC', size: 500 }),
          rdItemApi.getAll({ itemType: 'ACCESSORY', size: 500 })
        ]).then(([fRes, aRes]) => {
          setMaterials([...(fRes.content || []), ...(aRes.content || [])]);
        }).finally(() => setLoadingMaterials(false));
      }"""
content = content.replace(load_materials_old, load_materials_new)

# 5. Parse BOM on item change
useEffect_item = """  React.useEffect(() => {
    if (item) {"""
useEffect_item_new = """  React.useEffect(() => {
    if (item) {
      let parsedBom = [];
      try {
        if (item.product?.mainComposition && item.product.mainComposition.startsWith('[')) {
          parsedBom = JSON.parse(item.product.mainComposition);
        }
      } catch (e) {}
      setBomList(parsedBom);"""
content = content.replace(useEffect_item, useEffect_item_new)

useEffect_item_else = """    } else {
      setForm({"""
useEffect_item_else_new = """    } else {
      setBomList([]);
      setForm({"""
content = content.replace(useEffect_item_else, useEffect_item_else_new)

# 6. Save BOM
payload_old = """          allocation: form.allocation || undefined,
          mainComposition: form.mainComposition || undefined,
          liningComposition: form.liningComposition || undefined,"""
payload_new = """          allocation: form.allocation || undefined,
          mainComposition: JSON.stringify(bomList),
          liningComposition: undefined,"""
content = content.replace(payload_old, payload_new)

# 7. UI Replacement
ui_old = """                    {/* Fabric Composition (Accessories Information) */}
                    <Box p={4}>
                      <Typography variant="subtitle2" sx={{ color: '#0f172a', textTransform: 'uppercase', letterSpacing: 1 }} fontWeight={800} mb={3}>Fabric Composition (Accessories Information)</Typography>
                      <Box display="grid" gridTemplateColumns={{ xs: '1fr' }} gap={2.5}>
                        <Autocomplete
                          options={fabrics}
                          getOptionLabel={(opt) => `[${opt.itemCode || 'No Code'}] ${opt.name} - ${opt.fabric?.colorName || ''}`}
                          loading={loadingFabrics}
                          value={fabrics.find(f => `[${f.itemCode || 'No Code'}] ${f.name} - ${f.fabric?.colorName || ''}` === form.mainComposition) || null}
                          onChange={(_, val) => {
                            if (val) set('mainComposition', `[${val.itemCode || 'No Code'}] ${val.name} - ${val.fabric?.colorName || ''}`);
                            else set('mainComposition', '');
                          }}
                          freeSolo
                          onInputChange={(_, val, reason) => { if(reason === 'input') set('mainComposition', val) }}
                          inputValue={form.mainComposition || ''}
                          renderInput={(params) => <TextField {...params} label="Main Fabric" size="small" placeholder="Choose from library or type custom..." sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc', borderRadius: 1, '&:hover':{bgcolor:'#f1f5f9'}, '&.Mui-focused':{bgcolor:'#fff'} } }} />}
                        />
                        <Autocomplete
                          options={fabrics}
                          getOptionLabel={(opt) => `[${opt.itemCode || 'No Code'}] ${opt.name} - ${opt.fabric?.colorName || ''}`}
                          loading={loadingFabrics}
                          value={fabrics.find(f => `[${f.itemCode || 'No Code'}] ${f.name} - ${f.fabric?.colorName || ''}` === form.liningComposition) || null}
                          onChange={(_, val) => {
                            if (val) set('liningComposition', `[${val.itemCode || 'No Code'}] ${val.name} - ${val.fabric?.colorName || ''}`);
                            else set('liningComposition', '');
                          }}
                          freeSolo
                          onInputChange={(_, val, reason) => { if(reason === 'input') set('liningComposition', val) }}
                          inputValue={form.liningComposition || ''}
                          renderInput={(params) => <TextField {...params} label="Lining Fabric" size="small" placeholder="Choose from library or type custom..." sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc', borderRadius: 1, '&:hover':{bgcolor:'#f1f5f9'}, '&.Mui-focused':{bgcolor:'#fff'} } }} />}
                        />
                      </Box>
                    </Box>"""

ui_new = """                    {/* Fabric Composition (Accessories Information) */}
                    <Box p={4}>
                      <Typography variant="subtitle2" sx={{ color: '#0f172a', textTransform: 'uppercase', letterSpacing: 1 }} fontWeight={800} mb={3}>Fabric Composition (Accessories Information)</Typography>
                      <Stack spacing={2}>
                        <Box display="flex" gap={2} alignItems="flex-start">
                          <TextField
                            select
                            label="Usage"
                            size="small"
                            value={selectedUsage}
                            onChange={(e) => setSelectedUsage(e.target.value)}
                            sx={{ width: 180, '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc', borderRadius: 1 } }}
                            SelectProps={{ native: true }}
                          >
                            <option value="Main Fabric">Main Fabric</option>
                            <option value="Lining Fabric">Lining Fabric</option>
                            <option value="Accessory">Accessory</option>
                          </TextField>
                          <Autocomplete
                            options={materials}
                            getOptionLabel={(opt) => `[${opt.itemCode || 'No Code'}] ${opt.name} - ${opt.fabric?.colorName || opt.accessory?.color || ''}`}
                            loading={loadingMaterials}
                            value={selectedMaterial}
                            onChange={(_, val) => setSelectedMaterial(val)}
                            renderInput={(params) => <TextField {...params} label="Search Material/Accessory" size="small" placeholder="Choose from library..." sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc', borderRadius: 1 } }} />}
                            sx={{ flex: 1 }}
                          />
                          <Button 
                            variant="contained" 
                            color="primary"
                            onClick={() => {
                              if (!selectedMaterial) return;
                              const newBom = [...bomList, {
                                id: Math.random().toString(36).substring(7),
                                usage: selectedUsage,
                                itemCode: selectedMaterial.itemCode,
                                name: selectedMaterial.name,
                                color: selectedMaterial.fabric?.colorName || selectedMaterial.accessory?.color || '',
                                itemId: selectedMaterial.id
                              }];
                              setBomList(newBom);
                              setSelectedMaterial(null);
                            }}
                            sx={{ height: 40, borderRadius: 1, fontWeight: 700 }}
                          >
                            Add
                          </Button>
                        </Box>
                        
                        {bomList.length > 0 && (
                          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1 }}>
                            <Table size="small">
                              <TableHead sx={{ bgcolor: '#f8fafc' }}>
                                <TableRow>
                                  <TableCell sx={{ fontWeight: 700, width: 150 }}>Usage</TableCell>
                                  <TableCell sx={{ fontWeight: 700, width: 120 }}>Item Code</TableCell>
                                  <TableCell sx={{ fontWeight: 700 }}>Item Name</TableCell>
                                  <TableCell sx={{ fontWeight: 700 }}>Color</TableCell>
                                  <TableCell align="right" sx={{ fontWeight: 700, width: 80 }}>Action</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {bomList.map((row, idx) => (
                                  <TableRow key={row.id || idx}>
                                    <TableCell>{row.usage}</TableCell>
                                    <TableCell sx={{ fontWeight: 600, color: '#3ba55c' }}>{row.itemCode}</TableCell>
                                    <TableCell>{row.name}</TableCell>
                                    <TableCell>{row.color}</TableCell>
                                    <TableCell align="right">
                                      <IconButton size="small" color="error" onClick={() => setBomList(bomList.filter(b => b.id !== row.id))}>
                                        <DeleteIcon fontSize="small" />
                                      </IconButton>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        )}
                      </Stack>
                    </Box>"""

content = content.replace(ui_old, ui_new)

with open(r'D:\TSI\TestClaudeCode\TraxEco\src\apps\RD_MATERIAL\pages\ProductFormDrawer.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
