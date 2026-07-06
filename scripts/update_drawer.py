import os
import re

path = 'src/apps/RD_MATERIAL/pages/AccessoryFormDrawer.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update the static options
top_options = """const CATEGORY_OPTS = ['Elastic', 'Zipper', 'Elastic Zipper', 'Button', 'Label', 'Hook & Eye', 'Snap', 'Velcro', 'Thread', 'Pocket Bag', 'Other'];
const COMPOSITION_OPTS = ['PU', 'Metal', 'Plastic', 'Nylon', '100% POLYESTER', '30% POLYESTER 50% NYLON 20% SPANDEX', 'Other'];
"""
content = content.replace("const BASE = '/rd-material';", f"const BASE = '/rd-material';\n{top_options}")

# 2. Update form state initialization (useEffect for item)
init_old = """      setForm({
        ...item,
        structure: item.accessory?.structure,
        accessoryName: item.accessory?.accessoryName,
        composition: item.accessory?.composition,
        compositionDetail: item.accessory?.compositionDetail,
        function: item.accessory?.function,
        weightGsm: item.accessory?.weightGsm,
        cuttableWidth: item.accessory?.cuttableWidth,
        colorName: item.accessory?.colorName,
        hasSy: item.accessory?.hasSy,
        currency: item.currency || 'USD',
      });"""
init_new = """      setForm({
        ...item,
        specification: item.accessory?.category || item.accessory?.specification,
        composition: item.accessory?.composition,
        description: item.accessory?.description,
        weightGsm: item.accessory?.weightGsm,
        size: item.accessory?.size,
        color: item.accessory?.color,
        currency: item.currency || 'USD',
      });"""
content = content.replace(init_old, init_new)

default_old = """      setForm({
        currency: 'USD',
        quantity: 0,
        itemCode: 'DUMMY-' + Math.floor(Math.random() * 10000),
        accessoryName: 'Test Accessory ' + Math.floor(Math.random() * 100),
        structure: 'Knit',
        composition: '100% Cotton',
        function: 'Wicking',
        weightGsm: 150,
        cuttableWidth: 60,
        price: 2.5,
        supplierName: 'Trax Supplier',
        origin: 'Vietnam',
        location: 'WH-A',
        hasSy: true
      } as any);"""
default_new = """      setForm({
        currency: 'USD',
        quantity: 0,
        itemCode: 'ACC-' + Math.floor(Math.random() * 10000),
        name: 'Test Accessory ' + Math.floor(Math.random() * 100),
        specification: 'Button',
        composition: 'Plastic',
        description: '4 holes button',
        weightGsm: 10,
        size: '18L',
        color: 'Black',
        price: 0.1,
        supplierName: 'Trax Supplier',
        origin: 'Vietnam',
        location: 'WH-A',
      } as any);"""
content = content.replace(default_old, default_new)

# 3. Update the handleSave validation and payload
validation_old = """    const isMissing = !form.itemCode || 
                      !(form as any).accessoryName || 
                      !(form as any).structure || 
                      !(form as any).function || 
                      !(form as any).weightGsm || 
                      !(form as any).cuttableWidth;"""
validation_new = """    const isMissing = !form.itemCode || 
                      !form.name || 
                      !(form as any).specification;"""
content = content.replace(validation_old, validation_new)

payload_old = """        accessory: {
          structure: (form as any).structure || undefined,
          accessoryName: (form as any).accessoryName || undefined,
          composition: (form as any).composition || undefined,
          compositionDetail: (form as any).compositionDetail || undefined,
          function: (form as any).function || undefined,
          weightGsm: toNum((form as any).weightGsm),
          cuttableWidth: toNum((form as any).cuttableWidth),
          colorName: (form as any).colorName || undefined,
          hasSy: (form as any).hasSy,
        },"""
payload_new = """        accessory: {
          specification: (form as any).specification || undefined,
          composition: (form as any).composition || undefined,
          description: (form as any).description || undefined,
          size: (form as any).size || undefined,
          color: (form as any).color || undefined,
          weightGsm: toNum((form as any).weightGsm),
        },"""
content = content.replace(payload_old, payload_new)

# Fix name in payload
content = content.replace("name: (form as any).accessoryName || form.name || 'Untitled Accessory',", "name: form.name || 'Untitled Accessory',")

# 4. Update the JSX inputs block
jsx_old = """                      <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr' }} gap={2.5}>
                        <Autocomplete componentsProps={{ popper: { style: { zIndex: 10000 } } }} forcePopupIcon options={structureOpts} freeSolo size="small" value={(form as any).structure ?? ''} onChange={(_, val) => set('structure', val)} onInputChange={(_, val, reason) => { if (reason === 'input' || reason === 'clear') set('structure', val); }} renderInput={(params) => <TextField {...params} label="Structure" required sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc', borderRadius: 1, '&:hover':{bgcolor:'#f1f5f9'}, '&.Mui-focused':{bgcolor:'#fff'} }, '& .MuiFormLabel-asterisk': { color: '#ef4444' } }} />} />
                        <TextField label="Accessory Name" size="small" required value={(form as any).accessoryName ?? ''} onChange={(e) => set('accessoryName', e.target.value)} sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc', borderRadius: 1, '&:hover':{bgcolor:'#f1f5f9'}, '&.Mui-focused':{bgcolor:'#fff'} }, '& .MuiFormLabel-asterisk': { color: '#ef4444' } }} />
                        <TextField label="Composition" size="small" value={(form as any).composition ?? ''} onChange={(e) => set('composition', e.target.value)} sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc', borderRadius: 1, '&:hover':{bgcolor:'#f1f5f9'}, '&.Mui-focused':{bgcolor:'#fff'} } }} />
                        <TextField label="Function" size="small" required value={(form as any).function ?? ''} onChange={(e) => set('function', e.target.value)} sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc', borderRadius: 1, '&:hover':{bgcolor:'#f1f5f9'}, '&.Mui-focused':{bgcolor:'#fff'} }, '& .MuiFormLabel-asterisk': { color: '#ef4444' } }} />
                        <TextField label="Weight (GSM)" size="small" type="number" required value={(form as any).weightGsm ?? ''} onChange={(e) => set('weightGsm', e.target.value)} sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc', borderRadius: 1, '&:hover':{bgcolor:'#f1f5f9'}, '&.Mui-focused':{bgcolor:'#fff'} }, '& .MuiFormLabel-asterisk': { color: '#ef4444' } }} />
                        <TextField label="Cuttable width (inch)" size="small" type="number" required value={(form as any).cuttableWidth ?? ''} onChange={(e) => set('cuttableWidth', e.target.value)} sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc', borderRadius: 1, '&:hover':{bgcolor:'#f1f5f9'}, '&.Mui-focused':{bgcolor:'#fff'} }, '& .MuiFormLabel-asterisk': { color: '#ef4444' } }} />
                      </Box>"""
jsx_new = """                      <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr' }} gap={2.5}>
                        <Autocomplete componentsProps={{ popper: { style: { zIndex: 10000 } } }} forcePopupIcon options={CATEGORY_OPTS} freeSolo size="small" value={(form as any).specification ?? ''} onChange={(_, val) => set('specification', val)} onInputChange={(_, val, reason) => { if (reason === 'input' || reason === 'clear') set('specification', val); }} renderInput={(params) => <TextField {...params} label="Category" required sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc', borderRadius: 1, '&:hover':{bgcolor:'#f1f5f9'}, '&.Mui-focused':{bgcolor:'#fff'} }, '& .MuiFormLabel-asterisk': { color: '#ef4444' } }} />} />
                        <Autocomplete componentsProps={{ popper: { style: { zIndex: 10000 } } }} forcePopupIcon options={COMPOSITION_OPTS} freeSolo size="small" value={(form as any).composition ?? ''} onChange={(_, val) => set('composition', val)} onInputChange={(_, val, reason) => { if (reason === 'input' || reason === 'clear') set('composition', val); }} renderInput={(params) => <TextField {...params} label="Composition" sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc', borderRadius: 1, '&:hover':{bgcolor:'#f1f5f9'}, '&.Mui-focused':{bgcolor:'#fff'} } }} />} />
                        <TextField label="Description" size="small" multiline rows={1} value={(form as any).description ?? ''} onChange={(e) => set('description', e.target.value)} sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc', borderRadius: 1, '&:hover':{bgcolor:'#f1f5f9'}, '&.Mui-focused':{bgcolor:'#fff'} } }} />
                        <TextField label="Weight (GSM)" size="small" type="number" value={(form as any).weightGsm ?? ''} onChange={(e) => set('weightGsm', e.target.value)} sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc', borderRadius: 1, '&:hover':{bgcolor:'#f1f5f9'}, '&.Mui-focused':{bgcolor:'#fff'} } }} />
                        <TextField label="Size" size="small" value={(form as any).size ?? ''} onChange={(e) => set('size', e.target.value)} sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc', borderRadius: 1, '&:hover':{bgcolor:'#f1f5f9'}, '&.Mui-focused':{bgcolor:'#fff'} } }} />
                        <TextField label="Color" size="small" value={(form as any).color ?? ''} onChange={(e) => set('color', e.target.value)} sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc', borderRadius: 1, '&:hover':{bgcolor:'#f1f5f9'}, '&.Mui-focused':{bgcolor:'#fff'} } }} />
                      </Box>"""
content = content.replace(jsx_old, jsx_new)

# 5. Remove Sample Yardage checkbox at the end of the form
sy_old = """                        <Box sx={{ gridColumn: '1/-1', bgcolor: '#f0fdf4', p: 1.5, borderRadius: 1, border: '1px solid #bbf7d0', display: 'inline-flex', width: 'fit-content' }}>
                          <FormControlLabel
                            control={<Checkbox size="small" checked={!!(form as any).hasSy} onChange={(e) => set('hasSy', e.target.checked)} sx={{ color: '#22c55e', '&.Mui-checked': { color: '#16a34a' } }} />}
                            label={<Typography variant="body2" fontWeight={700} color="#166534">Sample Yardage</Typography>}
                            sx={{ m: 0 }}
                          />
                        </Box>"""
content = content.replace(sy_old, "")

# 6. Change Edit Accessory Hanger -> Edit Accessory
content = content.replace("Edit Vải Hanger", "Edit Accessory")
content = content.replace("Thêm Vải Hanger", "Add Accessory")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
