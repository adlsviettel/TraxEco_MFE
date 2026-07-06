const fs = require('fs');

let content = fs.readFileSync('D:/TSI/TestClaudeCode/TraxEco/src/apps/RD_MATERIAL/components/GenericItemFormDrawer.tsx', 'utf-8');

const newReturnStatement = `
  const [showItemDetails, setShowItemDetails] = useState(true);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const PreviewImage = ({ file, className, alt, style }: { file: File, className?: string, alt?: string, style?: React.CSSProperties }) => {
    const [url, setUrl] = React.useState<string>('');
    React.useEffect(() => {
      const objectUrl = URL.createObjectURL(file);
      setUrl(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    }, [file]);
    return url ? <img className={className} src={url} alt={alt} style={style} /> : null;
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    if (!open) return;
    const items = e.clipboardData?.items;
    if (!items) return;

    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) files.push(file);
      }
    }

    if (files.length === 0) return;
    
    if (files.some(f => f.size > 5 * 1024 * 1024)) {
      return setSnackbar({ open: true, message: 'Image size > 5MB', severity: 'warning' });
    }

    if (files.length > 0) {
        setPendingMainImage(files[0]);
    }
  };

  return (
    <Drawer open={open} anchor="right" onPaste={handlePaste} sx={{ zIndex: 9999 }} PaperProps={{ sx: { width: { xs: '100%', md: '85vw', xl: 1400 }, maxWidth: '100%', borderRadius: 0, display: 'flex', flexDirection: 'column' } }}>
      {/* Header */}
      <Box sx={{ px: 3, py: 2.5, background: 'linear-gradient(135deg, #2e7d32 0%, #3ba55c 100%)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography fontWeight={800} fontSize={18} color="#fff" sx={{ textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>{title}</Typography>
        <IconButton size="small" onClick={onClose} sx={{ color: '#fff', bgcolor: 'rgba(255,255,255,0.2)', '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' } }}><CloseIcon /></IconButton>
      </Box>

      {/* Body */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: { xs: 2, md: 4 }, bgcolor: '#f8fafc', display: 'flex', justifyContent: 'center' }}>
        <Box sx={{ width: '100%', maxWidth: 1440 }}>
          <Grid container spacing={4}>
          
          {/* LEFT COLUMN: Picture */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Stack spacing={4}>
              <Card elevation={0} sx={{ borderRadius: 0, boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.04)' }}>
                <CardHeader 
                  title="1. Picture" 
                  titleTypographyProps={{ variant: 'overline', fontWeight: 800, sx: { letterSpacing: 1, fontSize: 13, color: '#0f172a' } }}
                  sx={{ bgcolor: '#fff', py: 2, borderBottom: '1px solid rgba(0,0,0,0.04)', borderLeft: '4px solid #3ba55c' }}
                />
                <CardContent sx={{ p: 3 }}>
                  <Stack spacing={3}>
                    {cfg.showImage && (
                      <>
                        <Box>
                          <Typography variant="caption" color="text.secondary" fontWeight={700} mb={1} display="block">Sticker Image</Typography>
                          <Box display="flex" gap={1}>
                            <Box sx={{ flex: 1 }}>
                              <input type="file" id={\`stk-file-\${itemType}\`} accept="image/*" style={{ display: 'none' }} onChange={(e) => handleImageCapture(e, 'stickerImage')} />
                              <label htmlFor={\`stk-file-\${itemType}\`}>
                                <Box sx={{ border: '1px dashed #cbd5e1', borderRadius: 1, bgcolor: '#f8fafc', p: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s', '&:hover': { bgcolor: '#f1f5f9', borderColor: '#3ba55c' } }}>
                                  <UploadFileIcon sx={{ color: '#94a3b8', fontSize: 20, mr: 1 }} />
                                  <Typography variant="caption" fontWeight={600}>Thư viện</Typography>
                                </Box>
                              </label>
                            </Box>
                            <Box sx={{ flex: 1 }}>
                              <input type="file" id={\`stk-cam-\${itemType}\`} accept="image/*" capture="environment" style={{ display: 'none' }} onChange={(e) => handleImageCapture(e, 'stickerImage')} />
                              <label htmlFor={\`stk-cam-\${itemType}\`}>
                                <Box sx={{ border: '1px dashed #6ee7b7', borderRadius: 1, bgcolor: '#f0fdf4', p: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s', '&:hover': { bgcolor: '#dcfce7', borderColor: '#2e7d32' } }}>
                                  <PhotoCameraIcon sx={{ color: '#2e7d32', fontSize: 20, mr: 1 }} />
                                  <Typography variant="caption" fontWeight={600} color="#2e7d32">Máy ảnh</Typography>
                                </Box>
                              </label>
                            </Box>
                          </Box>
                          {(formData.stickerImage || pendingStickerImage || uploading) && (
                            <Box mt={1.5} display="flex" flexWrap="wrap" gap={1}>
                                <Tooltip 
                                  placement="right" 
                                  title={<Box sx={{ width: 600, height: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(255,255,255,0.95)', borderRadius: 2, overflow: 'hidden' }}><img src={pendingStickerImage ? URL.createObjectURL(pendingStickerImage) : rdItemApi.getImageUrl(formData.stickerImage || '')} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} /></Box>}
                                  componentsProps={{ popper: { sx: { zIndex: 10000 } }, tooltip: { sx: { p: 0, bgcolor: 'transparent', boxShadow: '0 10px 30px rgba(0,0,0,0.3)', maxWidth: 'none', borderRadius: 2 } } }}
                                >
                                  <Box sx={{ position: 'relative', width: '100%', aspectRatio: '1/1', borderRadius: 1, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.05)', bgcolor: '#fff', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }} onClick={() => setLightboxImage(pendingStickerImage ? URL.createObjectURL(pendingStickerImage) : rdItemApi.getImageUrl(formData.stickerImage || ''))}>
                                    <img className="stk-img" src={pendingStickerImage ? URL.createObjectURL(pendingStickerImage) : rdItemApi.getImageUrl(formData.stickerImage || '')} alt="Sticker" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => (e.currentTarget.style.display = 'none')} />
                                    <IconButton size="small" sx={{ position: 'absolute', top: 4, right: 4, bgcolor: 'rgba(255,255,255,0.8)', p: 0.5, backdropFilter: 'blur(4px)', '&:hover': { bgcolor: '#ef4444', color: 'white' } }} onClick={(e) => { e.stopPropagation(); setPendingStickerImage(null); handleChange('stickerImage', ''); }}>
                                      <CloseIcon sx={{ fontSize: 16 }} />
                                    </IconButton>
                                    {pendingStickerImage && (
                                      <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, bgcolor: 'rgba(59, 165, 92, 0.8)', color: '#fff', fontSize: 10, textAlign: 'center', py: 0.5 }}>Chưa lưu</Box>
                                    )}
                                  </Box>
                                </Tooltip>
                            </Box>
                          )}
                        </Box>

                        <Box>
                          <Typography variant="caption" color="text.secondary" fontWeight={700} mb={1} display="block">Main Image</Typography>
                          <Box display="flex" gap={1}>
                            <Box sx={{ flex: 1 }}>
                              <input type="file" id={\`main-file-\${itemType}\`} accept="image/*" style={{ display: 'none' }} onChange={(e) => handleImageCapture(e, 'mainImage')} />
                              <label htmlFor={\`main-file-\${itemType}\`}>
                                <Box sx={{ border: '1px dashed #cbd5e1', borderRadius: 1, bgcolor: '#f8fafc', p: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s', '&:hover': { bgcolor: '#f1f5f9', borderColor: '#3ba55c' } }}>
                                  <UploadFileIcon sx={{ color: '#94a3b8', fontSize: 20, mr: 1 }} />
                                  <Typography variant="caption" fontWeight={600}>Thư viện</Typography>
                                </Box>
                              </label>
                            </Box>
                            <Box sx={{ flex: 1 }}>
                              <input type="file" id={\`main-cam-\${itemType}\`} accept="image/*" capture="environment" style={{ display: 'none' }} onChange={(e) => handleImageCapture(e, 'mainImage')} />
                              <label htmlFor={\`main-cam-\${itemType}\`}>
                                <Box sx={{ border: '1px dashed #6ee7b7', borderRadius: 1, bgcolor: '#f0fdf4', p: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s', '&:hover': { bgcolor: '#dcfce7', borderColor: '#2e7d32' } }}>
                                  <PhotoCameraIcon sx={{ color: '#2e7d32', fontSize: 20, mr: 1 }} />
                                  <Typography variant="caption" fontWeight={600} color="#2e7d32">Máy ảnh</Typography>
                                </Box>
                              </label>
                            </Box>
                          </Box>
                          {(formData.mainImage || pendingMainImage || uploading) && (
                            <Box mt={1.5} display="flex" flexWrap="wrap" gap={1}>
                                <Tooltip 
                                  placement="right" 
                                  title={<Box sx={{ width: 600, height: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(255,255,255,0.95)', borderRadius: 2, overflow: 'hidden' }}><img src={pendingMainImage ? URL.createObjectURL(pendingMainImage) : rdItemApi.getImageUrl(formData.mainImage || '')} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} /></Box>}
                                  componentsProps={{ popper: { sx: { zIndex: 10000 } }, tooltip: { sx: { p: 0, bgcolor: 'transparent', boxShadow: '0 10px 30px rgba(0,0,0,0.3)', maxWidth: 'none', borderRadius: 2 } } }}
                                >
                                  <Box sx={{ position: 'relative', width: '100%', aspectRatio: '1/1', borderRadius: 1, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.05)', bgcolor: '#fff', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }} onClick={() => setLightboxImage(pendingMainImage ? URL.createObjectURL(pendingMainImage) : rdItemApi.getImageUrl(formData.mainImage || ''))}>
                                    <img className="main-img" src={pendingMainImage ? URL.createObjectURL(pendingMainImage) : rdItemApi.getImageUrl(formData.mainImage || '')} alt="Image" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => (e.currentTarget.style.display = 'none')} />
                                    <IconButton size="small" sx={{ position: 'absolute', top: 4, right: 4, bgcolor: 'rgba(255,255,255,0.8)', p: 0.5, backdropFilter: 'blur(4px)', '&:hover': { bgcolor: '#ef4444', color: 'white' } }} onClick={(e) => { e.stopPropagation(); setPendingMainImage(null); handleChange('mainImage', ''); }}>
                                      <CloseIcon sx={{ fontSize: 16 }} />
                                    </IconButton>
                                    {pendingMainImage && (
                                      <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, bgcolor: 'rgba(59, 165, 92, 0.8)', color: '#fff', fontSize: 10, textAlign: 'center', py: 0.5 }}>Chưa lưu</Box>
                                    )}
                                  </Box>
                                </Tooltip>
                            </Box>
                          )}
                        </Box>
                      </>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            </Stack>
          </Grid>

          {/* RIGHT COLUMN: ITEM DETAILS */}
          <Grid size={{ xs: 12, md: 8 }}>
            <Card elevation={0} sx={{ borderRadius: 0, boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.04)', height: '100%' }}>
              <CardHeader 
                title="ItemNo (Item Code)" 
                titleTypographyProps={{ variant: 'overline', fontWeight: 800, sx: { letterSpacing: 1, fontSize: 13, color: '#0f172a' } }}
                sx={{ bgcolor: '#fff', py: 2, borderBottom: '1px solid rgba(0,0,0,0.04)', borderLeft: '4px solid #2e7d32' }}
                action={
                  <IconButton onClick={() => setShowItemDetails(!showItemDetails)} size="small" sx={{ color: '#64748b' }}>
                    {showItemDetails ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                  </IconButton>
                }
              />
              <Collapse in={showItemDetails}>
                <CardContent sx={{ p: 0 }}>
                  
                  {/* ITEM CODE HIGHLIGHT */}
                  <Box p={4} pb={2}>
                    <TextField 
                      placeholder="Enter Item Code / Item No..." 
                      variant="standard" 
                      required 
                      fullWidth 
                      disabled={itemType === 'YARDAGE'}
                      value={formData.itemCode ?? ''} 
                      onChange={(e) => handleChange('itemCode', e.target.value)} 
                      InputProps={{ disableUnderline: true, sx: { fontSize: { xs: 24, md: 32 }, fontWeight: 800, color: '#0f172a', '& input::placeholder': { color: '#cbd5e1', opacity: 1 } } }} 
                      sx={{ bgcolor: '#f8fafc', p: 2, borderRadius: 1, border: '1px dashed #cbd5e1', transition: 'all 0.2s', '&:hover': { borderColor: '#94a3b8', bgcolor: '#f1f5f9' }, '&:focus-within': { borderColor: '#2563eb', bgcolor: '#fff', boxShadow: '0 0 0 4px rgba(37,99,235,0.1)' } }} 
                    />
                  </Box>

                  <Stack spacing={0} divider={<Divider sx={{ borderStyle: 'dashed', borderColor: '#e2e8f0', mx: 4 }} />}>
                    
                    {/* 2. Specification */}
                    <Box p={4}>
                      <Typography variant="subtitle2" sx={{ color: '#0f172a', textTransform: 'uppercase', letterSpacing: 1 }} fontWeight={800} mb={3}>2. Specification</Typography>
                      <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr' }} gap={2.5}>
                        <TextField label="Tên" size="small" required value={formData.name || ''}
                          disabled={itemType === 'YARDAGE'}
                          onChange={(e) => handleChange('name', e.target.value)}
                          sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc', borderRadius: 1, '&:hover':{bgcolor:'#f1f5f9'}, '&.Mui-focused':{bgcolor:'#fff'} }, '& .MuiFormLabel-asterisk': { color: '#ef4444' } }} />
                        
                        {cfg.showCategory && (
                          <TextField label={cfg.categoryLabel || 'Category'} size="small"
                            value={formData.category || ''} onChange={(e) => handleChange('category', e.target.value)}
                            sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc', borderRadius: 1, '&:hover':{bgcolor:'#f1f5f9'}, '&.Mui-focused':{bgcolor:'#fff'} } }} />
                        )}

                        {cfg.showLocation && (
                          <TextField label={cfg.locationLabel || 'Location'} size="small"
                            value={formData.location || ''} onChange={(e) => handleChange('location', e.target.value)}
                            sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc', borderRadius: 1, '&:hover':{bgcolor:'#f1f5f9'}, '&.Mui-focused':{bgcolor:'#fff'} } }} />
                        )}

                        {cfg.showHolder && (
                          <TextField label="Holder" size="small"
                            value={formData.holder || ''} onChange={(e) => handleChange('holder', e.target.value)}
                            sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc', borderRadius: 1, '&:hover':{bgcolor:'#f1f5f9'}, '&.Mui-focused':{bgcolor:'#fff'} } }} />
                        )}

                        {cfg.showDescription && (
                          <TextField label="Description" size="small" multiline rows={3}
                            value={formData.description || ''} onChange={(e) => handleChange('description', e.target.value)}
                            sx={{ gridColumn: '1/-1', '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc', borderRadius: 1, '&:hover':{bgcolor:'#f1f5f9'}, '&.Mui-focused':{bgcolor:'#fff'} } }} />
                        )}

                        {renderFields('main')}
                        {renderFields('specs')}
                      </Box>
                    </Box>

                    {/* 3. Supplier */}
                    {cfg.showSupplier && (
                      <Box p={4}>
                        <Typography variant="subtitle2" sx={{ color: '#0f172a', textTransform: 'uppercase', letterSpacing: 1 }} fontWeight={800} mb={3}>3. Supplier</Typography>
                        <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr' }} gap={2.5}>
                          <TextField label="Supplier Name" size="small" value={formData.supplierName ?? ''} onChange={(e) => handleChange('supplierName', e.target.value)} sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc', borderRadius: 1, '&:hover':{bgcolor:'#f1f5f9'}, '&.Mui-focused':{bgcolor:'#fff'} } }} />
                          <TextField label="Origin" size="small" value={formData.origin ?? ''} onChange={(e) => handleChange('origin', e.target.value)} sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc', borderRadius: 1, '&:hover':{bgcolor:'#f1f5f9'}, '&.Mui-focused':{bgcolor:'#fff'} } }} />
                        </Box>
                      </Box>
                    )}

                    {/* 4. Cost */}
                    {(cfg.showCost || cfg.showQuantity || fields.some(f => f.block === 'finance') || cfg.showRemark) && (
                      <Box p={4}>
                        <Typography variant="subtitle2" sx={{ color: '#0f172a', textTransform: 'uppercase', letterSpacing: 1 }} fontWeight={800} mb={3}>4. Cost & Inventory</Typography>
                        <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr' }} gap={2.5}>
                          {cfg.showCost && (<>
                            <TextField label="Price" fullWidth size="small" type="number"
                              InputProps={{
                                endAdornment: (
                                  <InputAdornment position="end">
                                    <Autocomplete
                                      options={['USD', 'VND', 'RMB', 'EUR', 'GBP', 'JPY', 'KRW', 'THB']}
                                      value={formData.currency || 'USD'}
                                      onChange={(_, v) => handleChange('currency', v || 'USD')}
                                      disableClearable size="small"
                                      sx={{ width: 80, '& .MuiInputBase-root': { py: 0, pl: 0.5, pr: '24px !important', fontSize: 13, color: 'text.secondary', fontWeight: 600 } }}
                                      renderInput={(params) => <TextField {...params} variant="standard" InputProps={{ ...params.InputProps, disableUnderline: true }} />}
                                    />
                                    <Box component="span" sx={{ fontSize: 16, mx: 0.5, color: 'text.disabled' }}>/</Box>
                                    <Autocomplete
                                      options={['yd', 'm', 'pcs', 'set', 'kg', 'roll']} freeSolo size="small"
                                      value={formData.priceUnit || ''} onChange={(_, v) => handleChange('priceUnit', v || '')} onInputChange={(_, v) => handleChange('priceUnit', v)}
                                      sx={{ width: 65, '& .MuiInputBase-root': { py: 0, pl: 0.5, pr: '24px !important', fontSize: 13, color: 'primary.main', fontWeight: 700, bgcolor: '#e2e8f0', borderRadius: 1, '&:hover':{bgcolor:'#cbd5e1'} } }}
                                      renderInput={(params) => <TextField {...params} placeholder="Unit" variant="standard" InputProps={{ ...params.InputProps, disableUnderline: true }} />}
                                    />
                                  </InputAdornment>
                                )
                              }}
                              value={formData.price || ''} onChange={(e) => handleChange('price', Number(e.target.value))} 
                              sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc', borderRadius: 1, '&:hover':{bgcolor:'#f1f5f9'}, '&.Mui-focused':{bgcolor:'#fff'} } }} />

                            <TextField label="MOQ/MCQ" fullWidth size="small"
                              InputProps={{
                                endAdornment: (
                                  <InputAdornment position="end">
                                    <Box component="span" sx={{ fontSize: 13, mx: 0.5, color: 'text.disabled', fontWeight: 600 }}>Unit:</Box>
                                    <Autocomplete
                                      options={['yd/yd', 'm/m', 'pcs/pcs', 'set/set']} freeSolo size="small"
                                      value={formData.moqMcqUnit || ''} onChange={(_, v) => handleChange('moqMcqUnit', v || '')} onInputChange={(_, v) => handleChange('moqMcqUnit', v)}
                                      sx={{ width: 75, '& .MuiInputBase-root': { py: 0, pl: 0.5, pr: '24px !important', fontSize: 13, color: 'primary.main', fontWeight: 700, bgcolor: '#e2e8f0', borderRadius: 1, '&:hover':{bgcolor:'#cbd5e1'} } }}
                                      renderInput={(params) => <TextField {...params} placeholder="yd/yd" variant="standard" InputProps={{ ...params.InputProps, disableUnderline: true }} />}
                                    />
                                  </InputAdornment>
                                )
                              }}
                              value={formData.moqMcq || ''} onChange={(e) => handleChange('moqMcq', e.target.value)} 
                              sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc', borderRadius: 1, '&:hover':{bgcolor:'#f1f5f9'}, '&.Mui-focused':{bgcolor:'#fff'} } }} />

                            <TextField label="MCQ surcharge (unit $)" fullWidth size="small" type="number"
                              value={formData.mcqSurcharge || ''} onChange={(e) => handleChange('mcqSurcharge', Number(e.target.value))}  sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc', borderRadius: 1, '&:hover':{bgcolor:'#f1f5f9'}, '&.Mui-focused':{bgcolor:'#fff'} } }} />
                            
                            <TextField label="MOQ surcharge (unit $)" fullWidth size="small" type="number"
                              value={formData.moqSurcharge || ''} onChange={(e) => handleChange('moqSurcharge', Number(e.target.value))} sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc', borderRadius: 1, '&:hover':{bgcolor:'#f1f5f9'}, '&.Mui-focused':{bgcolor:'#fff'} } }} />
                          </>)}

                          {cfg.showQuantity && (
                            <TextField label={cfg.quantityLabel} fullWidth size="small" type="number"
                              value={formData.quantity || ''} onChange={(e) => handleChange('quantity', Number(e.target.value))} sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc', borderRadius: 1, '&:hover':{bgcolor:'#f1f5f9'}, '&.Mui-focused':{bgcolor:'#fff'} } }} />
                          )}

                          {renderFields('finance')}

                          {cfg.showRemark && (
                            <TextField label="Remark" fullWidth size="small" multiline rows={3}
                              value={formData.remark || ''} onChange={(e) => handleChange('remark', e.target.value)} sx={{ gridColumn: '1/-1', '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc', borderRadius: 1, '&:hover':{bgcolor:'#f1f5f9'}, '&.Mui-focused':{bgcolor:'#fff'} } }} />
                          )}
                        </Box>
                      </Box>
                    )}

                  </Stack>
                </CardContent>
              </Collapse>
            </Card>
          </Grid>
        </Grid>
      </Box>

      </Box>

      {/* Footer */}
      <Box sx={{ position: 'sticky', bottom: 0, zIndex: 10, px: 4, py: 2.5, borderTop: '1px solid rgba(0,0,0,0.05)', bgcolor: '#fff', display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
        <Button onClick={onClose} variant="outlined" sx={{ borderRadius: 1, px: 3, fontWeight: 700, borderColor: '#cbd5e1', color: '#64748b', '&:hover': { borderColor: '#94a3b8', bgcolor: '#f8fafc' } }}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSave} disabled={loading}
          startIcon={loading ? <CircularProgress size={20} sx={{ color: 'white' }} /> : <SaveIcon />}
          sx={{ borderRadius: 1, px: 4, fontWeight: 700, bgcolor: '#2e7d32', '&:hover': { bgcolor: '#1b5e20' }, boxShadow: '0 4px 14px 0 rgba(46, 125, 50, 0.39)' }}
        >
          {loading ? 'Đang lưu' : 'Save'}
        </Button>
      </Box>

      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar(s => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={snackbar.severity as any} sx={{ width: '100%', borderRadius: 2 }}>{snackbar.message}</Alert>
      </Snackbar>
      <Dialog open={!!lightboxImage} onClose={() => setLightboxImage(null)} maxWidth="lg" PaperProps={{ sx: { bgcolor: 'transparent', boxShadow: 'none' } }}>
        <Box position="relative">
          <IconButton onClick={() => setLightboxImage(null)} sx={{ position: 'absolute', right: -20, top: -20, color: 'white', bgcolor: 'rgba(0,0,0,0.5)', '&:hover': { bgcolor: 'red' } }}><CloseIcon /></IconButton>
          <img src={lightboxImage || ''} alt="Full Size" style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain' }} />
        </Box>
      </Dialog>
    </Drawer>
  );
`;

const lines = content.split('\n');
const returnIndex = lines.findIndex((line, i) => line.includes('return (') && lines[i+1]?.includes('<Dialog'));

if (returnIndex === -1) {
    console.error("Return statement not found!");
    process.exit(1);
}

content = lines.slice(0, returnIndex).join('\n') + '\n' + newReturnStatement + '\n};\n\nexport default GenericItemFormDrawer;';

content = content.replace(/import \{([\s\S]*?)\} from '@mui\/material';/, (match, group1) => {
    let imports = group1.split(',').map(s => s.trim());
    if (!imports.includes('Drawer')) imports.push('Drawer');
    if (!imports.includes('Collapse')) imports.push('Collapse');
    return `import { ${imports.join(', ')} } from '@mui/material';`;
});

if (!content.includes('KeyboardArrowDownIcon')) {
    content = content.replace(/import CloseIcon from '@mui\/icons-material\/Close';/, `import CloseIcon from '@mui/icons-material/Close';\nimport KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';\nimport KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';`);
}

// Update renderField helper to use the new border style
content = content.replace(/sxProp = \{ '& \\.MuiOutlinedInput-root': \{ bgcolor: '#fff', borderRadius: 2 \} \};/g, `sxProp = { '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc', borderRadius: 1, '&:hover':{bgcolor:'#f1f5f9'}, '&.Mui-focused':{bgcolor:'#fff'} } };`);

fs.writeFileSync('D:/TSI/TestClaudeCode/TraxEco/src/apps/RD_MATERIAL/components/GenericItemFormDrawer.tsx', content);
console.log('Successfully updated GenericItemFormDrawer.tsx');
