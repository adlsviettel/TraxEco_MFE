import React, { useState, useRef } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography,
  IconButton, CircularProgress, TextField, Alert, Card, CardContent
} from '@mui/material';
import Grid from '@mui/material/Grid';
import CloseIcon from '@mui/icons-material/Close';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { rdItemApi } from '../services/rdMaterialApi';

interface Props {
  open: boolean;
  onClose: () => void;
  onApply: (data: any) => void;
  itemType: 'FABRIC' | 'ACCESSORY';
}

export const AiScanDialog: React.FC<Props> = ({ open, onClose, onApply, itemType }) => {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<any>(null);
  
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.size > 5 * 1024 * 1024) {
        setError("File size too large (>5MB). Please upload a smaller image.");
        return;
      }
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
      setError(null);
      setExtractedData(null);
    }
  };

  const handleClear = () => {
    setFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setExtractedData(null);
    setError(null);
  };

  React.useEffect(() => {
    if (!open) {
      handleClear();
    }
  }, [open]);

  React.useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (!open || loading) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      
      let hasImage = false;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const pastedFile = items[i].getAsFile();
          if (pastedFile) {
            if (pastedFile.size > 5 * 1024 * 1024) {
              setError("File size too large (>5MB). Please upload a smaller image.");
              return;
            }
            setFile(pastedFile);
            setPreviewUrl(URL.createObjectURL(pastedFile));
            setError(null);
            setExtractedData(null);
            hasImage = true;
            break;
          }
        }
      }

      if (hasImage) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
      }
    };

    window.addEventListener('paste', handlePaste, true); // Capture phase to intercept before parent Drawer
    return () => {
      window.removeEventListener('paste', handlePaste, true);
    };
  }, [open, loading]);

  const handleAnalyze = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const result = await rdItemApi.extractSticker(file, itemType);
      setExtractedData(result);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to analyze sticker. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (field: string, value: string) => {
    setExtractedData((prev: any) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleApplyClick = () => {
    if (extractedData) {
      onApply(extractedData);
      handleClear();
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="md" fullWidth sx={{ zIndex: 99999 }}>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AutoAwesomeIcon sx={{ color: '#a855f7' }} />
          <Typography variant="h6" fontWeight="bold">AI Smart Sticker Scan ({itemType})</Typography>
        </Box>
        <IconButton onClick={onClose} disabled={loading}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Left Panel: Image Capture / Upload / Preview */}
          <Grid item xs={12} md={extractedData ? 5 : 12}>
            <Box
              sx={{
                border: '2px dashed #cbd5e1',
                borderRadius: 2,
                p: 3,
                textAlign: 'center',
                backgroundColor: '#f8fafc',
                minHeight: 250,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {previewUrl ? (
                <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <img
                    src={previewUrl}
                    alt="Sticker Preview"
                    style={{ maxWidth: '100%', maxHeight: 220, borderRadius: 8, objectFit: 'contain' }}
                  />
                  {!loading && (
                    <Button variant="outlined" color="error" size="small" onClick={handleClear} sx={{ mt: 1.5 }}>
                      {extractedData ? "Scan Another Image" : "Remove Photo"}
                    </Button>
                  )}
                </Box>
              ) : (
                <Box>
                  <Typography variant="body1" color="textSecondary" sx={{ mb: 2 }}>
                    Take a photo, upload or press <b>Ctrl + V</b> to paste an image
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                    <Button
                      variant="contained"
                      startIcon={<PhotoCameraIcon />}
                      onClick={() => cameraInputRef.current?.click()}
                      sx={{ background: 'linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)', color: 'white' }}
                    >
                      Camera
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<CloudUploadIcon />}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Upload File
                    </Button>
                  </Box>
                </Box>
              )}

              {/* Hidden Inputs */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                style={{ display: 'none' }}
              />
              <input
                type="file"
                ref={cameraInputRef}
                onChange={handleFileChange}
                accept="image/*"
                capture="environment"
                style={{ display: 'none' }}
              />

              {loading && (
                <Box
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: 1.5
                  }}
                >
                  <CircularProgress color="secondary" />
                  <Typography variant="subtitle2" fontWeight="bold" color="secondary">
                    AI is analyzing sticker...
                  </Typography>
                </Box>
              )}
            </Box>

            {file && !loading && !extractedData && (
              <Button
                variant="contained"
                fullWidth
                size="large"
                startIcon={<AutoAwesomeIcon />}
                onClick={handleAnalyze}
                sx={{ mt: 2, background: 'linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)', color: 'white' }}
              >
                Start AI Analysis
              </Button>
            )}
          </Grid>

          {/* Right Panel: Extracted Fields Review */}
          {extractedData && (
            <Grid item xs={12} md={7}>
              <Card variant="outlined" sx={{ borderColor: '#e2e8f0', borderRadius: 2 }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Typography variant="subtitle1" fontWeight="bold" color="secondary" sx={{ mb: 2 }}>
                    Review Extracted Information
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Item Code"
                        fullWidth
                        size="small"
                        value={extractedData.itemCode || ''}
                        onChange={(e) => handleFieldChange('itemCode', e.target.value)}
                        helperText="Article / Code"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Supplier Name"
                        fullWidth
                        size="small"
                        value={extractedData.supplierName || ''}
                        onChange={(e) => handleFieldChange('supplierName', e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Origin"
                        fullWidth
                        size="small"
                        value={extractedData.origin || ''}
                        onChange={(e) => handleFieldChange('origin', e.target.value)}
                      />
                    </Grid>

                    {itemType === 'FABRIC' ? (
                      <>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            label="Composition (Synthetic/Natural/Natural blend)"
                            fullWidth
                            size="small"
                            value={extractedData.composition || ''}
                            onChange={(e) => handleFieldChange('composition', e.target.value)}
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <TextField
                            label="Composition Detail"
                            fullWidth
                            size="small"
                            value={extractedData.compositionDetail || ''}
                            onChange={(e) => handleFieldChange('compositionDetail', e.target.value)}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            label="Weight (GSM)"
                            fullWidth
                            size="small"
                            value={extractedData.weightGsm || ''}
                            onChange={(e) => handleFieldChange('weightGsm', e.target.value)}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            label="Cuttable Width"
                            fullWidth
                            size="small"
                            value={extractedData.cuttableWidth || ''}
                            onChange={(e) => handleFieldChange('cuttableWidth', e.target.value)}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            label="Structure"
                            fullWidth
                            size="small"
                            value={extractedData.structure || ''}
                            onChange={(e) => handleFieldChange('structure', e.target.value)}
                            helperText="Knit / Woven"
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            label="Fabric Name"
                            fullWidth
                            size="small"
                            value={extractedData.fabricName || ''}
                            onChange={(e) => handleFieldChange('fabricName', e.target.value)}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            label="Function"
                            fullWidth
                            size="small"
                            value={extractedData.function || ''}
                            onChange={(e) => handleFieldChange('function', e.target.value)}
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <TextField
                            label="Description"
                            fullWidth
                            size="small"
                            multiline
                            rows={2}
                            value={extractedData.description || ''}
                            onChange={(e) => handleFieldChange('description', e.target.value)}
                          />
                        </Grid>
                      </>
                    ) : (
                      <>
                        <Grid item xs={12}>
                          <TextField
                            label="Specification"
                            fullWidth
                            size="small"
                            value={extractedData.specification || ''}
                            onChange={(e) => handleFieldChange('specification', e.target.value)}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            label="Size"
                            fullWidth
                            size="small"
                            value={extractedData.size || ''}
                            onChange={(e) => handleFieldChange('size', e.target.value)}
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <TextField
                            label="Description"
                            fullWidth
                            size="small"
                            multiline
                            rows={2}
                            value={extractedData.description || ''}
                            onChange={(e) => handleFieldChange('description', e.target.value)}
                          />
                        </Grid>
                      </>
                    )}

                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Color Name"
                        fullWidth
                        size="small"
                        value={extractedData.colorName || ''}
                        onChange={(e) => handleFieldChange('colorName', e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        label="Remark / AI Notes"
                        fullWidth
                        size="small"
                        value={extractedData.remark || ''}
                        onChange={(e) => handleFieldChange('remark', e.target.value)}
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        {extractedData && (
          <Button
            variant="contained"
            onClick={handleApplyClick}
            sx={{ background: 'linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)', color: 'white' }}
          >
            Apply to Form
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};
