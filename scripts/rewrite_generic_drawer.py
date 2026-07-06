import re

with open(r"D:\TSI\TestClaudeCode\TraxEco\src\apps\RD_MATERIAL\components\GenericItemFormDrawer.tsx", "r", encoding="utf-8") as f:
    content = f.read()

new_return = """  return (
    <Drawer open={open} anchor="right" onClose={(event, reason) => { if (reason === 'backdropClick') return; onClose(); }} sx={{ zIndex: 9999 }} PaperProps={{ sx: { width: { xs: '100%', md: '85vw', xl: 1400 }, maxWidth: '100%', borderRadius: 0, display: 'flex', flexDirection: 'column' } }}>
      {/* Header */}
      <Box sx={{ px: 3, py: 2.5, background: 'linear-gradient(135deg, #2e7d32 0%, #3ba55c 100%)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography fontWeight={800} fontSize={18} color="#fff" sx={{ textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>{title}</Typography>
        <IconButton size="small" onClick={onClose} sx={{ color: '#fff', bgcolor: 'rgba(255,255,255,0.2)', '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' } }}><CloseIcon /></IconButton>
      </Box>

      {/* Body */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: { xs: 2, md: 4 }, bgcolor: '#f8fafc', display: 'flex', justifyContent: 'center' }}>
        <Box sx={{ width: '100%', maxWidth: 1440 }}>
          <Grid container spacing={4}>
            
            {/* LEFT COLUMN */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Stack spacing={4}>
                {/* MASTER ITEM BLOCK */}
                <Card elevation={0} sx={{ borderRadius: 0, boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.04)' }}>
                  <CardHeader 
                    title="Master Item" 
                    titleTypographyProps={{ variant: 'overline', fontWeight: 800, sx: { letterSpacing: 1, fontSize: 13, color: '#0f172a' } }}
                    sx={{ bgcolor: '#fff', py: 2, borderBottom: '1px solid rgba(0,0,0,0.04)', borderLeft: '4px solid #2e7d32' }}
                  />
                  <CardContent sx={{ p: 3 }}>
                    <Stack spacing={2.5}>
                      {fields.some(f => f.name === 'name') && <TextField label="Name" size="small" required value={formData.name || ''} onChange={(e) => handleChange('name', e.target.value)} sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc', borderRadius: 1, '&:hover': { bgcolor: '#f1f5f9' }, '&.Mui-focused': { bgcolor: '#fff' } } }} />}
                      {cfg.showDescription && <TextField label="Description" size="small" value={formData.description || ''} onChange={(e) => handleChange('description', e.target.value)} sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc', borderRadius: 1, '&:hover': { bgcolor: '#f1f5f9' }, '&.Mui-focused': { bgcolor: '#fff' } } }} />}
                    </Stack>
                  </CardContent>
                </Card>

                {/* PICTURE BLOCK */}
                {cfg.showImage && (
                  <Card elevation={0} sx={{ borderRadius: 0, boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.04)' }}>
                    <CardHeader 
                      title="1. Picture" 
                      titleTypographyProps={{ variant: 'overline', fontWeight: 800, sx: { letterSpacing: 1, fontSize: 13, color: '#0f172a' } }}
                      sx={{ bgcolor: '#fff', py: 2, borderBottom: '1px solid rgba(0,0,0,0.04)', borderLeft: '4px solid #3ba55c' }}
                    />
                    <CardContent sx={{ p: 3 }}>
                      <Box>
                        <Box display="flex" gap={1}>
                          <Box sx={{ flex: 1 }}>
                            <input type="file" id="main-file-upload" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleImageCapture(e, 'mainImage')} />
                            <label htmlFor="main-file-upload">
                              <Box sx={{ border: '1px dashed #cbd5e1', borderRadius: 1, bgcolor: '#f8fafc', p: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s', '&:hover': { bgcolor: '#f1f5f9', borderColor: '#3ba55c' } }}>
                                <UploadFileIcon sx={{ color: '#94a3b8', fontSize: 20, mr: 1 }} />
                                <Typography variant="caption" fontWeight={600}>Thư viện</Typography>
                              </Box>
                            </label>
                          </Box>
                          <Box sx={{ flex: 1 }}>
                            <input type="file" id="main-cam-upload" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={(e) => handleImageCapture(e, 'mainImage')} />
                            <label htmlFor="main-cam-upload">
                              <Box sx={{ border: '1px dashed #6ee7b7', borderRadius: 1, bgcolor: '#f0fdf4', p: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s', '&:hover': { bgcolor: '#dcfce7', borderColor: '#2e7d32' } }}>
                                <PhotoCameraIcon sx={{ color: '#2e7d32', fontSize: 20, mr: 1 }} />
                                <Typography variant="caption" fontWeight={600} color="#2e7d32">Máy ảnh</Typography>
                              </Box>
                            </label>
                          </Box>
                        </Box>
                        {(formData.mainImage || uploading) && (
                          <Box mt={1.5} sx={{ position: 'relative', width: '100%', aspectRatio: '1/1', borderRadius: 1, overflow: 'hidden', border: formData.mainImage ? '1px solid #e2e8f0' : 'none', bgcolor: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                            {uploading && !formData.mainImage
                              ? <Box sx={{ inset: 0, position: 'absolute', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(255,255,255,0.8)' }}><CircularProgress size={24} /></Box>
                              : <img src={formData.mainImage} alt="Main" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => (e.currentTarget.style.display = 'none')} />
                            }
                            {formData.mainImage && (
                              <IconButton size="small" sx={{ position: 'absolute', top: 4, right: 4, bgcolor: 'rgba(255,255,255,0.8)', p: 0.5, backdropFilter: 'blur(4px)', '&:hover': { bgcolor: '#ef4444', color: 'white' } }} onClick={() => handleChange('mainImage', '')}>
                                <CloseIcon sx={{ fontSize: 16 }} />
                              </IconButton>
                            )}
                          </Box>
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                )}
              </Stack>
            </Grid>

            {/* RIGHT COLUMN: ITEM DETAILS */}
            <Grid size={{ xs: 12, md: 8 }}>
              <Card elevation={0} sx={{ borderRadius: 0, boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.04)', height: '100%' }}>
                <CardHeader 
                  title="ItemNo (Item Code)" 
                  titleTypographyProps={{ variant: 'overline', fontWeight: 800, sx: { letterSpacing: 1, fontSize: 13, color: '#0f172a' } }}
                  sx={{ bgcolor: '#fff', py: 2, borderBottom: '1px solid rgba(0,0,0,0.04)', borderLeft: '4px solid #2e7d32' }}
                />
                <CardContent sx={{ p: 0 }}>
                  
                  {/* ITEM CODE HIGHLIGHT */}
                  <Box p={4} pb={2}>
                    {fields.some(f => f.name === 'itemCode') && (
                      <TextField 
                        placeholder="Enter Item Code / Item No..." 
                        variant="standard" 
                        required 
                        fullWidth 
                        value={formData.itemCode || ''} 
                        onChange={(e) => handleChange('itemCode', e.target.value)} 
                        InputProps={{ disableUnderline: true, sx: { fontSize: { xs: 24, md: 32 }, fontWeight: 800, color: '#0f172a', '& input::placeholder': { color: '#cbd5e1', opacity: 1 } } }} 
                        sx={{ bgcolor: '#f8fafc', p: 2, borderRadius: 1, border: '1px dashed #cbd5e1', transition: 'all 0.2s', '&:hover': { borderColor: '#94a3b8', bgcolor: '#f1f5f9' }, '&:focus-within': { borderColor: '#2563eb', bgcolor: '#fff', boxShadow: '0 0 0 4px rgba(37,99,235,0.1)' } }} 
                      />
                    )}
                  </Box>

                  <Stack spacing={0} divider={<Divider sx={{ borderStyle: 'dashed', borderColor: '#e2e8f0', mx: 4 }} />}>
                    
                    {/* SPECIFICATION */}
                    {(cfg.showCategory || fields.some(f => f.block === 'specs')) && (
                      <Box p={4}>
                        <Typography variant="subtitle2" sx={{ color: '#0f172a', textTransform: 'uppercase', letterSpacing: 1 }} fontWeight={800} mb={3}>2. Specification</Typography>
                        <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr' }} gap={2.5}>
                          {cfg.showCategory && <TextField label={cfg.categoryLabel || "Category"} size="small" value={formData.category || ''} onChange={(e) => handleChange('category', e.target.value)} sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc', borderRadius: 1, '&:hover':{bgcolor:'#f1f5f9'}, '&.Mui-focused':{bgcolor:'#fff'} } }} />}
                          {renderFields('specs')}
                        </Box>
                      </Box>
                    )}

                    {/* SUPPLIER */}
                    {cfg.showSupplier && (
                      <Box p={4}>
                        <Typography variant="subtitle2" sx={{ color: '#0f172a', textTransform: 'uppercase', letterSpacing: 1 }} fontWeight={800} mb={3}>3. Supplier</Typography>
                        <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr' }} gap={2.5}>
                          <TextField label="Supplier Name" size="small" value={formData.supplierName || ''} onChange={(e) => handleChange('supplierName', e.target.value)} sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc', borderRadius: 1, '&:hover':{bgcolor:'#f1f5f9'}, '&.Mui-focused':{bgcolor:'#fff'} } }} />
                          <TextField label="Origin" size="small" value={formData.origin || ''} onChange={(e) => handleChange('origin', e.target.value)} sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc', borderRadius: 1, '&:hover':{bgcolor:'#f1f5f9'}, '&.Mui-focused':{bgcolor:'#fff'} } }} />
                        </Box>
                      </Box>
                    )}

                    {/* COST */}
                    {(cfg.showCost || fields.some(f => f.block === 'finance')) && (
                      <Box p={4}>
                        <Typography variant="subtitle2" sx={{ color: '#0f172a', textTransform: 'uppercase', letterSpacing: 1 }} fontWeight={800} mb={3}>4. Cost</Typography>
                        <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr' }} gap={2.5}>
                          {cfg.showCost && (
                            <>
                              <TextField 
                                label="Price" size="small" type="number" 
                                value={formData.price ?? ''} onChange={(e) => handleChange('price', e.target.value)} 
                                sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc', borderRadius: 1, '&:hover':{bgcolor:'#f1f5f9'}, '&.Mui-focused':{bgcolor:'#fff'}, pr: 0.5 } }}
                                InputProps={{
                                  endAdornment: (
                                    <InputAdornment position="end">
                                      <Autocomplete options={['USD', 'VND', 'RMB', 'EUR', 'GBP', 'JPY', 'KRW', 'THB']} value={formData.currency || 'USD'} onChange={(_, newVal) => handleChange('currency', newVal || 'USD')} disableClearable size="small" sx={{ width: 80, '& .MuiInputBase-root': { py: 0, pl: 0.5, pr: '24px !important', fontSize: 13, color: 'text.secondary', fontWeight: 600 } }} renderInput={(params) => <TextField {...params} variant="standard" InputProps={{ ...params.InputProps, disableUnderline: true }} />} />
                                      <Box component="span" sx={{ fontSize: 16, mx: 0.5, color: 'text.disabled' }}>/</Box>
                                      <Autocomplete options={['yd', 'm', 'pcs', 'set', 'kg', 'roll']} freeSolo size="small" value={formData.priceUnit || ''} onChange={(_, v) => handleChange('priceUnit', v || '')} onInputChange={(_, v) => handleChange('priceUnit', v)} sx={{ width: 65, '& .MuiInputBase-root': { py: 0, pl: 0.5, pr: '24px !important', fontSize: 13, color: 'primary.main', fontWeight: 700, bgcolor: '#e2e8f0', borderRadius: 1, '&:hover':{bgcolor:'#cbd5e1'} } }} renderInput={(params) => <TextField {...params} placeholder="Unit" variant="standard" InputProps={{ ...params.InputProps, disableUnderline: true }} />} />
                                    </InputAdornment>
                                  ),
                                }}
                              />
                              <TextField label="MOQ/MCQ" fullWidth size="small" 
                                sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc', borderRadius: 1, '&:hover':{bgcolor:'#f1f5f9'}, '&.Mui-focused':{bgcolor:'#fff'}, pr: 0.5 } }}
                                InputProps={{
                                  endAdornment: (
                                    <InputAdornment position="end">
                                      <Box component="span" sx={{ fontSize: 13, mx: 0.5, color: 'text.disabled', fontWeight: 600 }}>Unit:</Box>
                                      <Autocomplete options={['yd/yd', 'm/m', 'pcs/pcs', 'set/set']} freeSolo size="small" value={formData.moqMcqUnit || ''} onChange={(_, v) => handleChange('moqMcqUnit', v || '')} onInputChange={(_, v) => handleChange('moqMcqUnit', v)} sx={{ width: 75, '& .MuiInputBase-root': { py: 0, pl: 0.5, pr: '24px !important', fontSize: 13, color: 'primary.main', fontWeight: 700, bgcolor: '#e2e8f0', borderRadius: 1, '&:hover':{bgcolor:'#cbd5e1'} } }} renderInput={(params) => <TextField {...params} placeholder="yd/yd" variant="standard" InputProps={{ ...params.InputProps, disableUnderline: true }} />} />
                                    </InputAdornment>
                                  )
                                }}
                                value={formData.moqMcq || ''} onChange={(e) => handleChange('moqMcq', e.target.value)} />
                              <TextField label="MCQ Surcharge ($)" size="small" type="number" value={formData.mcqSurcharge ?? ''} onChange={(e) => handleChange('mcqSurcharge', e.target.value)} sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc', borderRadius: 1, '&:hover':{bgcolor:'#f1f5f9'}, '&.Mui-focused':{bgcolor:'#fff'} } }} />
                              <TextField label="MOQ Surcharge ($)" size="small" type="number" value={formData.moqSurcharge ?? ''} onChange={(e) => handleChange('moqSurcharge', e.target.value)} sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc', borderRadius: 1, '&:hover':{bgcolor:'#f1f5f9'}, '&.Mui-focused':{bgcolor:'#fff'} } }} />
                            </>
                          )}
                          {renderFields('finance')}
                        </Box>
                      </Box>
                    )}

                    {/* OTHER INFO */}
                    {(cfg.showQuantity || cfg.showLocation || cfg.showHolder || cfg.showRemark || fields.some(f => f.block === 'main')) && (
                      <Box p={4}>
                        <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr' }} gap={2.5}>
                          {cfg.showQuantity && <TextField label={cfg.quantityLabel || 'Quantity'} size="small" type="number" value={formData.quantity ?? ''} onChange={(e) => handleChange('quantity', e.target.value)} sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc', borderRadius: 1, '&:hover':{bgcolor:'#f1f5f9'}, '&.Mui-focused':{bgcolor:'#fff'} } }} />}
                          {cfg.showLocation && <TextField label={cfg.locationLabel || 'Location'} size="small" value={formData.location ?? ''} onChange={(e) => handleChange('location', e.target.value)} sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc', borderRadius: 1, '&:hover':{bgcolor:'#f1f5f9'}, '&.Mui-focused':{bgcolor:'#fff'} } }} />}
                          {cfg.showHolder && <TextField label="Holder" size="small" value={formData.holder ?? ''} onChange={(e) => handleChange('holder', e.target.value)} sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc', borderRadius: 1, '&:hover':{bgcolor:'#f1f5f9'}, '&.Mui-focused':{bgcolor:'#fff'} } }} />}
                          {renderFields('main')}
                          {cfg.showRemark && <TextField label="Remark" size="small" multiline rows={3} value={formData.remark ?? ''} onChange={(e) => handleChange('remark', e.target.value)} sx={{ gridColumn: '1/-1', '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc', borderRadius: 1, '&:hover':{bgcolor:'#f1f5f9'}, '&.Mui-focused':{bgcolor:'#fff'} } }} />}
                        </Box>
                      </Box>
                    )}

                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      </Box>

      {/* Footer */}
      <Box sx={{ px: 3, py: 2.5, borderTop: '1px solid #f1f5f9', bgcolor: '#fff', display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
        <Button onClick={onClose} variant="outlined" sx={{ borderRadius: 1, px: 3, fontWeight: 700, borderColor: '#cbd5e1', color: '#64748b', '&:hover': { borderColor: '#94a3b8', bgcolor: '#f8fafc' } }}>
          Hủy
        </Button>
        <Button variant="contained" onClick={handleSave} disabled={loading}
          sx={{ borderRadius: 1, px: 4, fontWeight: 700, bgcolor: '#2e7d32', '&:hover': { bgcolor: '#1b5e20' }, boxShadow: '0 4px 14px 0 rgba(46, 125, 50, 0.39)' }}
        >
          {loading ? 'Đang lưu' : 'Lưu lại'}
        </Button>
      </Box>

      <Snackbar open={snackbar.open} autoHideDuration={2000} onClose={() => setSnackbar(s => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={snackbar.severity as any} sx={{ width: '100%', borderRadius: 2 }}>{snackbar.message}</Alert>
      </Snackbar>
    </Drawer>
  );"""

start_idx = content.find("  return (\n    <Dialog")
end_idx = content.rfind(");") + 2
if start_idx != -1 and end_idx != -1:
    new_content = content[:start_idx] + new_return + content[end_idx:]
    
    # Import Card etc if missing
    import_line = "import { Card, CardHeader, CardContent } from '@mui/material';"
    if "CardHeader" not in new_content:
        new_content = new_content.replace("import {", "import { Card, CardHeader, CardContent, \n", 1)
        
    with open(r"D:\TSI\TestClaudeCode\TraxEco\src\apps\RD_MATERIAL\components\GenericItemFormDrawer.tsx", "w", encoding="utf-8") as f:
        f.write(new_content)
    print("Rewritten successfully.")
else:
    print("Could not find return statement to replace")
