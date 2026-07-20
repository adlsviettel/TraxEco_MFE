import React, { useState, useEffect, useRef } from 'react';
import { Box, Typography, Button, TextField, CircularProgress, Snackbar, Alert, Paper, IconButton, Tooltip } from '@mui/material';
import { useTranslation } from 'react-i18next';
import SaveIcon from '@mui/icons-material/Save';
import { tccService } from '../services/tccService';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

const PRIMARY_COLOR = '#2e7d32';

const PLACEHOLDERS = [
  { label: 'Request ID', value: '<RequestID>' },
  { label: 'Customer', value: '<Customer>' },
  { label: 'Factory', value: '<Factory>' },
  { label: 'Sample Stage', value: '<SampleStage>' },
  { label: 'Machine Type', value: '<MachineType>' },
  { label: 'Season', value: '<Season>' },
  { label: 'Style', value: '<Style>' },
  { label: 'Item', value: '<Item>' },
  { label: 'Process', value: '<Process>' },
  { label: 'Operation', value: '<Operation>' },
  { label: 'Template Designer', value: '<TemplateDesigner>' },
  { label: 'Expected Delivery Date', value: '<ExpectedDeliveryDate>' },
  { label: 'Requester Name', value: '<RequesterName>' },
  { label: 'Status', value: '<Status>' },
  { label: 'Updated By', value: '<UpdatedBy>' },
];

const QUILL_MODULES = {
  toolbar: [
    [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
    [{ 'font': [] }],
    ['bold', 'italic', 'underline', 'strike', 'blockquote'],
    [{ 'list': 'ordered' }, { 'list': 'bullet' }, { 'indent': '-1' }, { 'indent': '+1' }],
    [{ 'color': [] }, { 'background': [] }],
    [{ 'align': [] }],
    ['link', 'image'],
    ['clean']
  ],
};

export const EmailTemplateConfig: React.FC = () => {
  const { t } = useTranslation();
  const [template, setTemplate] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });
  const quillRef = useRef<ReactQuill>(null);

  useEffect(() => {
    fetchTemplate();
  }, []);

  const fetchTemplate = async () => {
    setLoading(true);
    try {
      const config = await tccService.getConfig('EMAIL_TEMPLATE_COMPLETED');
      if (config && config.configValue) {
        setTemplate(config.configValue);
      } else {
        setTemplate('<p>Thông báo đến bạn Request <strong><RequestID></strong> đã được hoàn thành.</p>');
      }
    } catch (e) {
      console.error(e);
      setSnackbar({ open: true, message: t('tcc.settings.errLoad', 'Lỗi khi tải dữ liệu cài đặt'), severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await tccService.updateConfig('EMAIL_TEMPLATE_COMPLETED', template);
      setSnackbar({ open: true, message: t('tcc.settings.successUpdate', 'Đã cập nhật thành công'), severity: 'success' });
    } catch (e) {
      setSnackbar({ open: true, message: t('tcc.settings.errSave', 'Lỗi khi lưu'), severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const insertPlaceholder = (placeholder: string) => {
    const editor = quillRef.current?.getEditor();
    if (editor) {
      const range = editor.getSelection();
      const cursorPosition = range ? range.index : editor.getLength();
      editor.insertText(cursorPosition, placeholder);
      editor.setSelection(cursorPosition + placeholder.length, 0);
      setTemplate(editor.root.innerHTML); // Update state manually if needed, or rely on onChange
    } else {
      setTemplate(prev => prev + placeholder);
    }
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress sx={{ color: PRIMARY_COLOR }} /></Box>;
  }

  return (
    <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2, overflow: 'hidden', p: 3 }}>
      <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600, color: '#334155', mb: 2 }}>
        {t('tcc.settings.emailTemplate', 'Cấu Hình Email Template (Completed)')}
      </Typography>
      
      <Box sx={{ mb: 3 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {t('tcc.settings.clickToInsert', 'Nhấp vào các biến dưới đây để chèn vào vị trí con trỏ chuột trong nội dung Email:')}
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {PLACEHOLDERS.map((p) => (
            <Tooltip key={p.value} title={`Insert ${p.value}`}>
              <Button 
                variant="outlined" 
                size="small" 
                onClick={() => insertPlaceholder(p.value)}
                sx={{ 
                  textTransform: 'none', 
                  borderRadius: 2,
                  borderColor: '#cbd5e1',
                  color: '#475569',
                  '&:hover': { borderColor: PRIMARY_COLOR, color: PRIMARY_COLOR, bgcolor: '#f0fdf4' }
                }}
              >
                {p.label}
              </Button>
            </Tooltip>
          ))}
        </Box>
      </Box>

      <Box sx={{ mb: 3, '& .ql-container': { minHeight: '300px', fontSize: '15px' }, '& .ql-editor': { minHeight: '300px' } }}>
        <ReactQuill
          ref={quillRef}
          theme="snow"
          value={template}
          onChange={setTemplate}
          placeholder="Nhập nội dung email (Hỗ trợ định dạng văn bản)..."
          modules={QUILL_MODULES}
        />
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button 
          variant="contained" 
          startIcon={<SaveIcon />} 
          onClick={handleSave} 
          disabled={saving}
          sx={{ bgcolor: PRIMARY_COLOR, '&:hover': { bgcolor: '#1b5e20' } }}
        >
          {saving ? <CircularProgress size={24} color="inherit" /> : t('tcc.settings.save', 'Lưu')}
        </Button>
      </Box>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snackbar.severity} sx={{ width: '100%', fontWeight: 600 }}>{snackbar.message}</Alert>
      </Snackbar>
    </Paper>
  );
};
