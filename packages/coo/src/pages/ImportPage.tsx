import React, { useState } from 'react';
import { 
    Box, Card, CardContent, Typography, Button, CircularProgress, 
    Alert, Tabs, Tab, Paper, Fade
} from '@mui/material';
import { 
    CloudUploadOutlined as CloudUploadIcon,
    DownloadOutlined as DownloadIcon,
    SecurityOutlined as SecurityIcon,
    FilterAltOutlined as FilterIcon
} from '@mui/icons-material';
import { authFetch } from '@traxeco/shared';

export const ImportPage = () => {
    const [tabIndex, setTabIndex] = useState(0);
    
    // states for custom COO import
    const [cooFiles, setCooFiles] = useState<File[]>([]);
    const [cooLoading, setCooLoading] = useState(false);
    const [cooMessage, setCooMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

    // states for main fabric import
    const [fabricFiles, setFabricFiles] = useState<File[]>([]);
    const [fabricLoading, setFabricLoading] = useState(false);
    const [fabricMessage, setFabricMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

    const handleUploadCoo = async () => {
        if (cooFiles.length === 0) return;
        setCooLoading(true); setCooMessage(null);
        try {
            const formData = new FormData();
            cooFiles.forEach(file => formData.append('file', file));
            const res = await authFetch('coo/import/customs', {
                method: 'POST',
                body: formData
            });
            if (!res.ok) {
                let errMessage = 'API Error (Status: ' + res.status + ')';
                try {
                    const errBody = await res.json();
                    if (errBody.message) errMessage = errBody.message;
                    else if (errBody.error) errMessage = errBody.error;
                } catch(e) {
                    // Ignore json parse error, keep the default errMessage
                }
                throw new Error(errMessage);
            }
            setCooMessage({ type: 'success', text: `Đã map thành công dữ liệu Tờ Khai từ ${cooFiles.length} file.` });
            setCooFiles([]);
        } catch (error: any) {
            setCooMessage({ type: 'error', text: error.message || 'Lỗi khi import file' });
        } finally {
            setCooLoading(false);
        }
    };

    const handleUploadFabric = async () => {
        if (fabricFiles.length === 0) return;
        setFabricLoading(true); setFabricMessage(null);
        try {
            const formData = new FormData();
            fabricFiles.forEach(file => formData.append('file', file));
            const res = await authFetch('coo/import/consumption', {
                method: 'POST',
                body: formData
            });
            if (!res.ok) {
                let errMessage = 'API Error (Status: ' + res.status + ')';
                try {
                    const errBody = await res.json();
                    if (errBody.message) errMessage = errBody.message;
                    else if (errBody.error) errMessage = errBody.error;
                } catch(e) {
                    // Ignore json parse error, keep the default errMessage
                }
                throw new Error(errMessage);
            }
            setFabricMessage({ type: 'success', text: `Đã cập nhật Vải Chính từ ${fabricFiles.length} file.` });
            setFabricFiles([]);
        } catch (error: any) {
            setFabricMessage({ type: 'error', text: error.message || 'Lỗi khi import file' });
        } finally {
            setFabricLoading(false);
        }
    };

    return (
        <Box sx={{ p: { xs: 2, md: 4 }, minHeight: '100%', bgcolor: '#f8fafc', display: 'flex', justifyContent: 'center' }}>
            <Box sx={{ width: '100%', maxWidth: 700 }}>
                {/* Header */}
                <Box sx={{ mb: 4, textAlign: 'center' }}>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: '#15803d', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                        DATA SYNCHRONIZATION
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        Đồng bộ dữ liệu Hải Quan và Định mức với hệ thống ERP
                    </Typography>
                </Box>

                <Paper elevation={0} sx={{ borderRadius: 3, overflow: 'hidden', border: '1px solid #e2e8f0', bgcolor: '#fff' }}>
                    {/* Sleek Tabs */}
                    <Tabs 
                        value={tabIndex} 
                        onChange={(_, v) => setTabIndex(v)} 
                        variant="fullWidth"
                        sx={{ 
                            borderBottom: '1px solid #e2e8f0',
                            '& .MuiTab-root': { py: 2.5, fontWeight: 600, color: '#64748b', transition: 'all 0.2s' },
                            '& .Mui-selected': { color: '#0f172a' },
                            '& .MuiTabs-indicator': { height: 3, borderTopLeftRadius: 3, borderTopRightRadius: 3, bgcolor: '#3ba55c' }
                        }}
                    >
                        <Tab icon={<SecurityIcon sx={{ mb: 0.5 }} />} iconPosition="start" label="HẢI QUAN (COO)" />
                        <Tab icon={<FilterIcon sx={{ mb: 0.5 }} />} iconPosition="start" label="VẢI CHÍNH" />
                    </Tabs>

                    <CardContent sx={{ p: 4, minHeight: 320 }}>
                        {/* TAB 1: COO CUSTOMS */}
                        {tabIndex === 0 && (
                            <Fade in={tabIndex === 0}>
                                <Box>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#334155' }}>
                                            Import file CombineWeekly.xlsx
                                        </Typography>
                                        <Button size="small" startIcon={<DownloadIcon />} sx={{ color: '#3ba55c', textTransform: 'none' }}>
                                            Tải mẫu
                                        </Button>
                                    </Box>

                                    {/* Upload Area */}
                                    <Box sx={{ 
                                        border: '1.5px dashed #cbd5e1', borderRadius: 2, p: 4, 
                                        textAlign: 'center', bgcolor: cooFiles.length > 0 ? '#f0fdf4' : '#f8fafc',
                                        transition: 'all 0.3s ease', cursor: 'pointer',
                                        '&:hover': { borderColor: '#3ba55c', bgcolor: '#f0fdf4' }
                                    }}>
                                        <input 
                                            type="file" id="coo-file" hidden accept=".xlsx, .xls" multiple
                                            onChange={(e) => setCooFiles(Array.from(e.target.files || []))} 
                                        />
                                        <label htmlFor="coo-file" style={{ cursor: 'pointer', display: 'block' }}>
                                            <CloudUploadIcon sx={{ fontSize: 48, color: cooFiles.length > 0 ? '#22c55e' : '#94a3b8', mb: 1, transition: 'color 0.3s' }} />
                                            {cooFiles.length > 0 ? (
                                                <Typography variant="body2" sx={{ fontWeight: 600, color: '#166534' }}>
                                                    Đã chọn {cooFiles.length} file
                                                </Typography>
                                            ) : (
                                                <Typography variant="body2" color="text.secondary">
                                                    Nhấn để chọn file Excel hoặc kéo thả vào đây (hỗ trợ nhiều file)
                                                </Typography>
                                            )}
                                        </label>
                                    </Box>

                                    <Button 
                                        variant="contained" 
                                        fullWidth 
                                        disabled={cooFiles.length === 0 || cooLoading} 
                                        onClick={handleUploadCoo}
                                        sx={{ 
                                            mt: 3, py: 1.5, borderRadius: 2, fontWeight: 700,
                                            bgcolor: '#3ba55c', '&:hover': { bgcolor: '#2e8b4a' },
                                            boxShadow: 'none', textTransform: 'none', fontSize: '1rem'
                                        }}
                                    >
                                        {cooLoading ? <CircularProgress size={24} color="inherit" /> : 'Đồng bộ Dữ liệu'}
                                    </Button>

                                    {cooMessage && (
                                        <Alert severity={cooMessage.type} sx={{ mt: 2, borderRadius: 2 }}>{cooMessage.text}</Alert>
                                    )}
                                </Box>
                            </Fade>
                        )}

                        {/* TAB 2: MAIN FABRIC */}
                        {tabIndex === 1 && (
                            <Fade in={tabIndex === 1}>
                                <Box>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#334155' }}>
                                            Import file Material code list Adidas production PO
                                        </Typography>
                                        <Button size="small" startIcon={<DownloadIcon />} sx={{ color: '#3ba55c', textTransform: 'none' }}>
                                            Tải mẫu
                                        </Button>
                                    </Box>

                                    {/* Upload Area */}
                                    <Box sx={{ 
                                        border: '1.5px dashed #cbd5e1', borderRadius: 2, p: 4, 
                                        textAlign: 'center', bgcolor: fabricFiles.length > 0 ? '#eff6ff' : '#f8fafc',
                                        transition: 'all 0.3s ease', cursor: 'pointer',
                                        '&:hover': { borderColor: '#3b82f6', bgcolor: '#eff6ff' }
                                    }}>
                                        <input 
                                            type="file" id="fabric-file" hidden accept=".xlsx, .xls" multiple
                                            onChange={(e) => setFabricFiles(Array.from(e.target.files || []))} 
                                        />
                                        <label htmlFor="fabric-file" style={{ cursor: 'pointer', display: 'block' }}>
                                            <CloudUploadIcon sx={{ fontSize: 48, color: fabricFiles.length > 0 ? '#3b82f6' : '#94a3b8', mb: 1, transition: 'color 0.3s' }} />
                                            {fabricFiles.length > 0 ? (
                                                <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e40af' }}>
                                                    Đã chọn {fabricFiles.length} file
                                                </Typography>
                                            ) : (
                                                <Typography variant="body2" color="text.secondary">
                                                    Nhấn để chọn file Excel hoặc kéo thả vào đây (hỗ trợ nhiều file)
                                                </Typography>
                                            )}
                                        </label>
                                    </Box>

                                    <Button 
                                        variant="contained" 
                                        fullWidth 
                                        disabled={fabricFiles.length === 0 || fabricLoading} 
                                        onClick={handleUploadFabric}
                                        sx={{ 
                                            mt: 3, py: 1.5, borderRadius: 2, fontWeight: 700,
                                            bgcolor: '#3b82f6', '&:hover': { bgcolor: '#2563eb' },
                                            boxShadow: 'none', textTransform: 'none', fontSize: '1rem'
                                        }}
                                    >
                                        {fabricLoading ? <CircularProgress size={24} color="inherit" /> : 'Đồng bộ Dữ liệu'}
                                    </Button>

                                    {fabricMessage && (
                                        <Alert severity={fabricMessage.type} sx={{ mt: 2, borderRadius: 2 }}>{fabricMessage.text}</Alert>
                                    )}
                                </Box>
                            </Fade>
                        )}
                    </CardContent>
                </Paper>
            </Box>
        </Box>
    );
};
