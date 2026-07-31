import React, { useState, useEffect, useRef } from 'react';
import { 
    Box, Paper, Typography, Button, TextField, Select, MenuItem, 
    FormControl, InputLabel, Chip, Alert, IconButton, Divider, 
    Tooltip, Grid, Card, CardContent, Tabs, Tab 
} from '@mui/material';
import { 
    Usb as UsbIcon, 
    Stop as StopIcon, 
    DeleteSweep as ClearIcon, 
    Send as SendIcon, 
    ContentCopy as CopyIcon, 
    SettingsInputComponent as PortIcon,
    CheckCircle as CheckIcon, 
    ErrorOutline as ErrorIcon,
    LanOutlined as LanIcon,
    RefreshOutlined as RefreshIcon
} from '@mui/icons-material';
import { authFetch } from '@traxeco/shared';

interface LogEntry {
    id: number;
    timestamp: string;
    type: 'rx' | 'tx' | 'sys' | 'err';
    text: string;
}

export const SerialPortPage = () => {
    const [modeTab, setModeTab] = useState(0); // 0: LAN TCP/IP, 1: Serial COM
    const [scaleIp, setScaleIp] = useState('192.168.1.150');
    const [scalePort, setScalePort] = useState(8100);
    const [lanLoading, setLanLoading] = useState(false);
    const [lanAutoPoll, setLanAutoPoll] = useState(false);
    const lanPollTimerRef = useRef<any>(null);

    const [isConnected, setIsConnected] = useState(false);
    const [baudRate, setBaudRate] = useState<number>(9600);
    const [dataBits, setDataBits] = useState<number>(8);
    const [stopBits, setStopBits] = useState<number>(1);
    const [parity, setParity] = useState<string>('none');

    const [portInfo, setPortInfo] = useState<string>('');
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [latestValue, setLatestValue] = useState<string>('--');
    const [sendText, setSendText] = useState<string>('');
    const [autoScroll] = useState<boolean>(true);
    const [statusMsg, setStatusMsg] = useState<{ type: 'info' | 'success' | 'error', text: string } | null>(null);

    const portRef = useRef<any>(null);
    const readerRef = useRef<any>(null);
    const logContainerRef = useRef<HTMLDivElement>(null);
    const isReadingRef = useRef<boolean>(false);

    const isSupported = typeof navigator !== 'undefined' && 'serial' in navigator;

    const addLog = (type: 'rx' | 'tx' | 'sys' | 'err', text: string) => {
        const timeStr = new Date().toLocaleTimeString('vi-VN', { hour12: false });
        setLogs(prev => [...prev.slice(-499), {
            id: Date.now() + Math.random(),
            timestamp: timeStr,
            type,
            text
        }]);
    };

    useEffect(() => {
        if (autoScroll && logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
    }, [logs, autoScroll]);

    const handleReadLan = async () => {
        setLanLoading(true);
        try {
            const res = await authFetch(`/api/coo/scale/read-lan?scaleIp=${encodeURIComponent(scaleIp)}&port=${scalePort}`);
            const data = await res.json();
            if (data.status === 'success') {
                setLatestValue(data.weight);
                addLog('rx', `[LAN ${scaleIp}] Số cân: ${data.weight} (RAW: ${data.raw})`);
                setStatusMsg({ type: 'success', text: `Đã đọc số cân qua LAN thành công: ${data.weight} (${data.timeMs}ms)` });
            } else {
                addLog('err', `[LAN ${scaleIp}] Lỗi: ${data.message || data.error}`);
                setStatusMsg({ type: 'error', text: data.message || data.error || 'Không kết nối được Cân Mạng LAN' });
            }
        } catch (err: any) {
            addLog('err', `Lỗi mạng LAN: ${err.message || err}`);
            setStatusMsg({ type: 'error', text: `Lỗi kết nối mạng LAN: ${err.message || err}` });
        } finally {
            setLanLoading(false);
        }
    };

    const toggleLanAutoPoll = () => {
        if (lanAutoPoll) {
            setLanAutoPoll(false);
            if (lanPollTimerRef.current) {
                clearInterval(lanPollTimerRef.current);
                lanPollTimerRef.current = null;
            }
            addLog('sys', 'Đã tắt Tự Động Đọc Cân Mạng LAN.');
        } else {
            setLanAutoPoll(true);
            addLog('sys', `Đã BẬT Tự Động Đọc Cân Mạng LAN (${scaleIp}:${scalePort}) 1 giây/lần...`);
            handleReadLan();
            lanPollTimerRef.current = setInterval(() => {
                handleReadLan();
            }, 1000);
        }
    };

    useEffect(() => {
        return () => {
            if (lanPollTimerRef.current) clearInterval(lanPollTimerRef.current);
        };
    }, []);

    const handleConnect = async () => {
        if (!isSupported) {
            setStatusMsg({ type: 'error', text: 'Trình duyệt không hỗ trợ Web Serial API. Vui lòng dùng Google Chrome hoặc Microsoft Edge!' });
            return;
        }

        try {
            // Request user to select COM port
            const port = await (navigator as any).serial.requestPort();
            await port.open({
                baudRate: Number(baudRate),
                dataBits: Number(dataBits),
                stopBits: Number(stopBits),
                parity: parity
            });

            // Force activate DTR & RTS signals required by many RS232 converters/scales
            try {
                await port.setSignals({ dataTerminalReady: true, requestToSend: true });
            } catch (sigErr) {
                console.log('Signal activation warning:', sigErr);
            }

            portRef.current = port;
            setIsConnected(true);

            const info = port.getInfo();
            const portLabel = info.usbVendorId ? `USB Serial (VID:${info.usbVendorId.toString(16)}, PID:${info.usbProductId.toString(16)})` : 'COM Port';
            setPortInfo(portLabel);
            setStatusMsg({ type: 'success', text: `Đã kết nối thành công cổng COM (${baudRate} bps)!` });
            addLog('sys', `Cổng COM đã kết nối & Kích hoạt DTR/RTS: ${portLabel} | Baud: ${baudRate}`);

            // Start reading loop
            startReading(port);
        } catch (err: any) {
            console.error(err);
            if (err.name !== 'NotFoundError') {
                let errorText = `Lỗi kết nối: ${err.message || err}`;
                if (err.message && (err.message.includes('Failed to open serial port') || err.name === 'InvalidStateError')) {
                    errorText = '⚠️ Cổng COM này đang bị ĐANG MỞ (chiếm dụng) bởi phần mềm khác trên máy (ví dụ: PuTTY, TeraTerm, RealTerm, Hercules, Arduino IDE, hoặc 1 Tab trình duyệt khác). Vui lòng TẮT phần mềm đang chiếm cổng COM đó rồi kết nối lại!';
                }
                setStatusMsg({ type: 'error', text: errorText });
                addLog('err', errorText);
            }
        }
    };

    const sendPresetCommand = async (cmd: string) => {
        if (!portRef.current || !isConnected) return;
        try {
            const encoder = new TextEncoder();
            const writer = portRef.current.writable.getWriter();
            const dataWithEnding = cmd + '\r\n';
            await writer.write(encoder.encode(dataWithEnding));
            writer.releaseLock();
            addLog('tx', `Gửi lệnh: ${cmd}`);
        } catch (err: any) {
            addLog('err', `Lỗi gửi lệnh: ${err.message || err}`);
        }
    };

    const sendRawBytes = async (bytes: number[], label: string) => {
        if (!portRef.current || !isConnected) return;
        try {
            const writer = portRef.current.writable.getWriter();
            await writer.write(new Uint8Array(bytes));
            writer.releaseLock();
            addLog('tx', `Gửi byte CAS [${label}]: ${bytes.map(b => '0x' + b.toString(16).padStart(2, '0').toUpperCase()).join(' ')}`);
        } catch (err: any) {
            addLog('err', `Lỗi gửi byte: ${err.message || err}`);
        }
    };

    const [isScanning, setIsScanning] = useState(false);
    const [isAutoPolling, setIsAutoPolling] = useState(false);
    const autoPollTimerRef = useRef<any>(null);

    const toggleAutoPoll = () => {
        if (isAutoPolling) {
            setIsAutoPolling(false);
            if (autoPollTimerRef.current) {
                clearInterval(autoPollTimerRef.current);
                autoPollTimerRef.current = null;
            }
            addLog('sys', 'Đã tắt tự động hỏi số cân.');
        } else {
            if (!isConnected || !portRef.current) return;
            setIsAutoPolling(true);
            addLog('sys', 'Đã BẬT tự động hỏi số cân (Auto-Poll 500ms cho Sendmode = 3)...');
            autoPollTimerRef.current = setInterval(() => {
                sendRawBytes([0x02, 0x30, 0x31, 0x57, 0x03], 'Auto-Poll');
            }, 500);
        }
    };

    useEffect(() => {
        return () => {
            if (autoPollTimerRef.current) clearInterval(autoPollTimerRef.current);
        };
    }, []);

    const toggleSignals = async () => {
        if (!portRef.current || !isConnected) return;
        try {
            await portRef.current.setSignals({ dataTerminalReady: true, requestToSend: true });
            addLog('sys', 'Đã kích hoạt lại tín hiệu DTR/RTS (Bật nguồn phần cứng RS232)');
            setStatusMsg({ type: 'success', text: 'Đã phát tín hiệu DTR/RTS bật phần cứng!' });
        } catch (err: any) {
            addLog('err', `Lỗi kích hoạt DTR/RTS: ${err.message || err}`);
        }
    };

    const handleAutoScan = async () => {
        if (!isSupported) return;
        setIsScanning(true);
        addLog('sys', '🔍 Bắt đầu Quét Tự Động tất cả Baud Rate & Lệnh Cân CAS...');
        setStatusMsg({ type: 'info', text: 'Đang tự động thử các Tốc độ truyền (2400 -> 115200 bps)...' });

        const baudRatesToTest = [9600, 4800, 2400, 19200, 115200];
        let foundData = false;

        try {
            if (isConnected) {
                await handleDisconnect();
            }

            const port = await (navigator as any).serial.requestPort();

            for (const bRate of baudRatesToTest) {
                if (foundData) break;
                addLog('sys', `--- Đang thử nghiệm Baud Rate: ${bRate} bps ---`);
                setBaudRate(bRate);

                try {
                    await port.open({ baudRate: bRate, dataBits: 8, stopBits: 1, parity: 'none' });
                    try { await port.setSignals({ dataTerminalReady: true, requestToSend: true }); } catch(e){}

                    portRef.current = port;
                    setIsConnected(true);

                    // Send test commands
                    const writer = port.writable.getWriter();
                    await writer.write(new Uint8Array([0x05])); // CAS ENQ
                    await writer.write(new Uint8Array([0x50, 0x0D, 0x0A])); // P\r\n
                    writer.releaseLock();

                    // Listen for 1 second
                    const reader = port.readable.getReader();
                    const timeoutPromise = new Promise((res) => setTimeout(() => res('timeout'), 1000));
                    const readPromise = reader.read();

                    const result: any = await Promise.race([readPromise, timeoutPromise]);
                    reader.releaseLock();

                    if (result !== 'timeout' && result.value && result.value.length > 0) {
                        const latinDecoder = new TextDecoder('latin1');
                        const receivedStr = latinDecoder.decode(result.value).trim();
                        addLog('rx', `🎉 THÀNH CÔNG! BẮT ĐƯỢC TÍN HIỆU CÂN Ở BAUD ${bRate} BPS: ${receivedStr}`);
                        setLatestValue(receivedStr);
                        setStatusMsg({ type: 'success', text: `TÌM THẤY TÍN HIỆU CÂN! Đang chạy ở tốc độ ${bRate} bps` });
                        foundData = true;
                        startReading(port);
                        break;
                    } else {
                        await port.close();
                        portRef.current = null;
                        setIsConnected(false);
                    }
                } catch (e: any) {
                    try { await port.close(); } catch(err){}
                }
            }

            if (!foundData) {
                addLog('err', '❌ Đã thử tất cả Baud Rate (2400, 4800, 9600, 19200) nhưng Cân chưa trả tín hiệu.');
                setStatusMsg({ type: 'error', text: 'Quét xong: Chưa nhận được số cân. Vui lòng kiểm tra cáp RS232 hoặc nút PRINT trên Cân.' });
            }
        } catch (err: any) {
            addLog('err', `Lỗi khi quét: ${err.message || err}`);
        } finally {
            setIsScanning(false);
        }
    };

    const startReading = async (port: any) => {
        isReadingRef.current = true;
        const reader = port.readable.getReader();
        readerRef.current = reader;

        const latinDecoder = new TextDecoder('latin1');
        let textBuffer = '';

        try {
            while (isReadingRef.current) {
                const { value, done } = await reader.read();
                if (done) break;
                if (value && value.length > 0) {
                    const chunkStr = latinDecoder.decode(value);
                    textBuffer += chunkStr;

                    if (textBuffer.includes('\n') || textBuffer.includes('\r')) {
                        const lines = textBuffer.split(/[\r\n]+/);
                        textBuffer = lines.pop() || '';
                        for (const line of lines) {
                            const trimmed = line.trim();
                            if (trimmed) {
                                addLog('rx', trimmed);
                                setLatestValue(trimmed);
                            }
                        }
                    } else if (textBuffer.length > 0) {
                        const trimmed = textBuffer.trim();
                        if (trimmed) {
                            addLog('rx', trimmed);
                            setLatestValue(trimmed);
                        }
                    }
                }
            }
        } catch (err: any) {
            if (isReadingRef.current) {
                console.error('Read error:', err);
                addLog('err', `Lỗi đọc dữ liệu: ${err.message || err}`);
            }
        } finally {
            try { reader.releaseLock(); } catch(e) {}
        }
    };

    const handleDisconnect = async () => {
        isReadingRef.current = false;
        try {
            if (readerRef.current) {
                await readerRef.current.cancel();
                readerRef.current = null;
            }
            if (portRef.current) {
                await portRef.current.close();
                portRef.current = null;
            }
        } catch (err: any) {
            console.error('Error closing port:', err);
        }
        setIsConnected(false);
        setPortInfo('');
        setStatusMsg({ type: 'info', text: 'Đã ngắt kết nối cổng COM.' });
        addLog('sys', 'Đã ngắt kết nối cổng COM.');
    };

    const handleSend = async () => {
        if (!portRef.current || !isConnected) return;
        if (!sendText.trim()) return;

        try {
            const encoder = new TextEncoder();
            const writer = portRef.current.writable.getWriter();
            const dataWithEnding = sendText + '\r\n';
            await writer.write(encoder.encode(dataWithEnding));
            writer.releaseLock();

            addLog('tx', sendText);
            setSendText('');
        } catch (err: any) {
            console.error('Send error:', err);
            addLog('err', `Lỗi gửi dữ liệu: ${err.message || err}`);
        }
    };

    const handleClearLog = () => {
        setLogs([]);
        setLatestValue('--');
    };

    const handleCopyLog = () => {
        const text = logs.map(l => `[${l.timestamp}] [${l.type.toUpperCase()}] ${l.text}`).join('\n');
        navigator.clipboard.writeText(text);
        setStatusMsg({ type: 'success', text: 'Đã sao chép toàn bộ log!' });
    };

    return (
        <Box sx={{ p: 3, bgcolor: '#f8fafc', minHeight: '100%', display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {/* Header */}
            <Paper elevation={0} sx={{ p: 2.5, borderRadius: 2.5, border: '1px solid #e2e8f0', bgcolor: '#fff' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <PortIcon sx={{ color: '#15803d', fontSize: 32 }} />
                        <Box>
                            <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f172a' }}>
                                Đọc Cổng COM / Serial Port Reader
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Kết nối & nhận dữ liệu realtime từ Cân điện tử, Đầu đọc mã vạch, Cảm biến, Cổng RS232 / USB Serial
                            </Typography>
                        </Box>
                    </Box>

                    <Chip 
                        icon={isConnected ? <CheckIcon /> : <ErrorIcon />}
                        label={isConnected ? `Đã kết nối (${portInfo || 'COM'})` : 'Chưa kết nối'}
                        color={isConnected ? 'success' : 'default'}
                        variant={isConnected ? 'filled' : 'outlined'}
                        sx={{ fontWeight: 600, px: 1 }}
                    />
                </Box>
            </Paper>

            {!isSupported && (
                <Alert severity="warning" sx={{ borderRadius: 2.5, border: '1px solid #fde68a' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5, color: '#92400e' }}>
                        ⚠️ Web Serial API chưa được kích hoạt cho Địa Chỉ HTTP Hiện Tại!
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1, color: '#b45309' }}>
                        Do bạn đang mở ứng dụng qua giao thức HTTP dạng IP (<code>{typeof window !== 'undefined' ? window.location.origin : 'http://...'}</code>), trình duyệt <b>Microsoft Edge / Google Chrome</b> tạm thời khóa quyền truy cập phần cứng cổng COM theo tiêu chuẩn an toàn W3C.
                    </Typography>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 1, color: '#92400e' }}>
                        💡 2 Cách bật ngay tính năng Đọc Cổng COM trên Edge:
                    </Typography>
                    <Box component="ol" sx={{ pl: 2.5, my: 0.5, fontSize: '13px', color: '#78350f', lineHeight: 1.7 }}>
                        <li><b>Cách 1 (Nhanh nhất):</b> Mở thẻ mới trên Edge dán <code>edge://flags/#unsafely-treat-insecure-origin-as-secure</code> &rarr; Nhập <code>{typeof window !== 'undefined' ? window.location.origin : ''}</code> &rarr; Chọn <b>Enabled</b> &rarr; Bấm <b>Relaunch</b>.</li>
                        <li><b>Cách 2:</b> Mở trang web bằng địa chỉ <code>http://localhost:3000</code> ngay trên máy tính này (Browser tự động bật Web Serial cho localhost).</li>
                    </Box>
                </Alert>
            )}

            {statusMsg && (
                <Alert severity={statusMsg.type} onClose={() => setStatusMsg(null)}>
                    {statusMsg.text}
                </Alert>
            )}

            <Grid container spacing={3}>
                {/* Connection Settings Panel */}
                <Grid item xs={12} md={4}>
                    <Paper elevation={0} sx={{ p: 2.5, borderRadius: 2.5, border: '1px solid #e2e8f0', bgcolor: '#fff', display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Tabs 
                            value={modeTab} 
                            onChange={(_, val) => setModeTab(val)} 
                            variant="fullWidth" 
                            sx={{ borderBottom: 1, borderColor: 'divider', mb: 1, '& .MuiTab-root': { textTransform: 'none', fontWeight: 700 } }}
                        >
                            <Tab icon={<LanIcon />} iconPosition="start" label="Mạng LAN (TCP/IP)" />
                            <Tab icon={<PortIcon />} iconPosition="start" label="Cổng COM (Serial)" />
                        </Tabs>

                        {modeTab === 0 ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#15803d' }}>
                                    🌐 Cấu Hình Kết Nối Cân Mạng LAN (Ethernet)
                                </Typography>
                                <TextField
                                    label="Địa chỉ IP Cân (Scale IP)"
                                    size="small"
                                    value={scaleIp}
                                    onChange={(e) => setScaleIp(e.target.value)}
                                    placeholder="192.168.1.150"
                                    fullWidth
                                />
                                <TextField
                                    label="Cổng TCP Port (Mặc định 8100)"
                                    size="small"
                                    type="number"
                                    value={scalePort}
                                    onChange={(e) => setScalePort(Number(e.target.value))}
                                    fullWidth
                                />

                                <Button
                                    fullWidth
                                    variant="contained"
                                    color="success"
                                    startIcon={lanLoading ? <RefreshIcon sx={{ animation: 'spin 1s linear infinite' }} /> : <LanIcon />}
                                    onClick={handleReadLan}
                                    disabled={lanLoading}
                                    sx={{ bgcolor: '#15803d', '&:hover': { bgcolor: '#166534' }, textTransform: 'none', fontWeight: 700, py: 1 }}
                                >
                                    Đọc Số Cân Trực Tiếp Qua Mạng LAN
                                </Button>

                                <Button
                                    fullWidth
                                    variant={lanAutoPoll ? "contained" : "outlined"}
                                    color={lanAutoPoll ? "error" : "info"}
                                    onClick={toggleLanAutoPoll}
                                    sx={{ textTransform: 'none', fontWeight: 700, py: 0.75 }}
                                >
                                    {lanAutoPoll ? '🛑 Tắt Tự Động Đọc Cân Mạng LAN' : '🔄 Bật Tự Động Đọc Realtime (1s/lần)'}
                                </Button>
                            </Box>
                        ) : (
                            <>
                                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1e293b' }}>
                                    Cấu Hình Cổng COM / RS232
                                </Typography>

                                <FormControl fullWidth size="small">
                                    <InputLabel>Baud Rate (Tốc độ)</InputLabel>
                                    <Select
                                        value={baudRate}
                                        label="Baud Rate (Tốc độ)"
                                        onChange={(e) => setBaudRate(Number(e.target.value))}
                                        disabled={isConnected}
                                    >
                                        <MenuItem value={4800}>4800 bps</MenuItem>
                                        <MenuItem value={9600}>9600 bps (Tiêu chuẩn)</MenuItem>
                                        <MenuItem value={19200}>19200 bps</MenuItem>
                                        <MenuItem value={38400}>38400 bps</MenuItem>
                                        <MenuItem value={57600}>57600 bps</MenuItem>
                                        <MenuItem value={115200}>115200 bps</MenuItem>
                                    </Select>
                                </FormControl>

                                <Grid container spacing={1.5}>
                                    <Grid item xs={4}>
                                        <FormControl fullWidth size="small">
                                            <InputLabel>Data Bits</InputLabel>
                                            <Select
                                                value={dataBits}
                                                label="Data Bits"
                                                onChange={(e) => setDataBits(Number(e.target.value))}
                                                disabled={isConnected}
                                            >
                                                <MenuItem value={7}>7 bits</MenuItem>
                                                <MenuItem value={8}>8 bits</MenuItem>
                                            </Select>
                                        </FormControl>
                                    </Grid>
                                    <Grid item xs={4}>
                                        <FormControl fullWidth size="small">
                                            <InputLabel>Stop Bits</InputLabel>
                                            <Select
                                                value={stopBits}
                                                label="Stop Bits"
                                                onChange={(e) => setStopBits(Number(e.target.value))}
                                                disabled={isConnected}
                                            >
                                                <MenuItem value={1}>1 bit</MenuItem>
                                                <MenuItem value={2}>2 bits</MenuItem>
                                            </Select>
                                        </FormControl>
                                    </Grid>
                                    <Grid item xs={4}>
                                        <FormControl fullWidth size="small">
                                            <InputLabel>Parity</InputLabel>
                                            <Select
                                                value={parity}
                                                label="Parity"
                                                onChange={(e) => setParity(e.target.value as any)}
                                                disabled={isConnected}
                                            >
                                                <MenuItem value="none">None</MenuItem>
                                                <MenuItem value="even">Even</MenuItem>
                                                <MenuItem value="odd">Odd</MenuItem>
                                            </Select>
                                        </FormControl>
                                    </Grid>
                                </Grid>
                            </>
                        )}

                        <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                            {!isConnected ? (
                                <>
                                    <Button
                                        fullWidth
                                        variant="contained"
                                        startIcon={<UsbIcon />}
                                        onClick={handleConnect}
                                        disabled={!isSupported || isScanning}
                                        sx={{ bgcolor: '#15803d', '&:hover': { bgcolor: '#166534' }, textTransform: 'none', fontWeight: 600, py: 1 }}
                                    >
                                        Chọn Cổng COM & Kết Nối
                                    </Button>

                                    <Button
                                        fullWidth
                                        variant="outlined"
                                        color="secondary"
                                        onClick={handleAutoScan}
                                        disabled={!isSupported || isScanning}
                                        sx={{ textTransform: 'none', fontWeight: 700, py: 0.75 }}
                                    >
                                        {isScanning ? 'Đang tự động quét Baud Rate...' : '🔍 Quét Tự Động Tất Cả Tốc Độ Baud Rate'}
                                    </Button>
                                </>
                            ) : (
                                <Button
                                    fullWidth
                                    variant="contained"
                                    color="error"
                                    startIcon={<StopIcon />}
                                    onClick={handleDisconnect}
                                    sx={{ textTransform: 'none', fontWeight: 600, py: 1 }}
                                >
                                    Ngắt Kết Nối
                                </Button>
                            )}
                        </Box>

                        <Divider sx={{ my: 1 }} />

                        {/* Display Card for Latest Value */}
                        <Card elevation={0} sx={{ bgcolor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 2 }}>
                            <CardContent sx={{ textAlign: 'center', p: 2 }}>
                                <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, color: '#64748b' }}>
                                    Giá Trị Đọc Nhận Mới Nhất
                                </Typography>
                                <Typography variant="h3" sx={{ fontWeight: 800, color: isConnected ? '#15803d' : '#94a3b8', mt: 1, fontFamily: 'monospace' }}>
                                    {latestValue}
                                </Typography>
                            </CardContent>
                        </Card>

                        {isConnected && (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                <Typography variant="caption" sx={{ fontWeight: 700, color: '#475569' }}>
                                    ⚡ Lệnh phát số cân cơ bản:
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                    <Button size="small" variant="outlined" color="success" onClick={() => sendPresetCommand('P')}>Lệnh 'P'</Button>
                                    <Button size="small" variant="outlined" color="success" onClick={() => sendPresetCommand('W')}>Lệnh 'W'</Button>
                                    <Button size="small" variant="outlined" color="success" onClick={() => sendPresetCommand('READ')}>Lệnh 'READ'</Button>
                                    <Button size="small" variant="outlined" color="success" onClick={() => sendPresetCommand('PRINT')}>Lệnh 'PRINT'</Button>
                                </Box>

                                <Typography variant="caption" sx={{ fontWeight: 700, color: '#15803d', mt: 0.5 }}>
                                    ⚖️ Lệnh Chuẩn Cho Cân CAS CL5200-30P:
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                    <Button size="small" variant="contained" color="success" onClick={() => sendRawBytes([0x02, 0x30, 0x31, 0x57, 0x03], 'CL5200 STX-01W-ETX')}>
                                        CL5200 Lệnh W (&lt;STX&gt;01W&lt;ETX&gt;)
                                    </Button>
                                    <Button size="small" variant="contained" color="success" onClick={() => sendRawBytes([0x05], 'ENQ')}>
                                        CAS Lệnh ENQ (0x05)
                                    </Button>
                                    <Button size="small" variant="contained" color="success" onClick={() => sendRawBytes([0x11], 'DC1')}>
                                        CAS Lệnh DC1 (0x11)
                                    </Button>
                                    <Button size="small" variant="contained" color="success" onClick={() => sendRawBytes([0x57, 0x0D, 0x0A], 'W+CRLF')}>
                                        CL5200 Lệnh W+CRLF
                                    </Button>
                                </Box>

                                 <Button 
                                    size="small" 
                                    variant="contained" 
                                    color={isAutoPolling ? "error" : "info"} 
                                    onClick={toggleAutoPoll} 
                                    sx={{ textTransform: 'none', mt: 0.5, fontWeight: 700 }}
                                >
                                    {isAutoPolling ? '🛑 Tắt Tự Động Hỏi Số Cân' : '🔄 Bật Tự Động Hỏi Số Cân (Phù hợp Sendmode = 3)'}
                                </Button>

                                <Button size="small" variant="contained" color="warning" onClick={toggleSignals} sx={{ textTransform: 'none', mt: 0.5, fontWeight: 600 }}>
                                    Kích Hoạt Tín Hiệu DTR/RTS (Bật Nguồn RS232)
                                </Button>
                            </Box>
                        )}
                    </Paper>
                </Grid>

                {/* Live Terminal & Logs */}
                <Grid item xs={12} md={8}>
                    <Paper elevation={0} sx={{ p: 2.5, borderRadius: 2.5, border: '1px solid #e2e8f0', bgcolor: '#fff', display: 'flex', flexDirection: 'column', height: '100%', minHeight: 580 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1e293b' }}>
                                Luồng Dữ Liệu Realtime (Terminal Log)
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                <Tooltip title="Xóa log">
                                    <IconButton size="small" onClick={handleClearLog}>
                                        <ClearIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title="Sao chép log">
                                    <IconButton size="small" onClick={handleCopyLog}>
                                        <CopyIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            </Box>
                        </Box>

                        {/* Terminal Box */}
                        <Box 
                            ref={logContainerRef}
                            sx={{ 
                                flexGrow: 1, 
                                minHeight: 420,
                                bgcolor: '#0f172a', 
                                color: '#e2e8f0', 
                                p: 2, 
                                borderRadius: 2, 
                                fontFamily: 'Consolas, Monaco, "Courier New", monospace', 
                                fontSize: '13px',
                                overflowY: 'auto',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 0.75
                            }}
                        >
                            {logs.length === 0 ? (
                                <Typography variant="body2" sx={{ color: '#64748b', fontStyle: 'italic', textAlign: 'center', my: 'auto' }}>
                                    Chưa có dữ liệu. Bấm "Chọn Cổng COM & Kết Nối" để bắt đầu nhận dữ liệu...
                                </Typography>
                            ) : (
                                logs.map((log) => (
                                    <Box key={log.id} sx={{ display: 'flex', gap: 1.5, lineHeight: 1.4 }}>
                                        <Typography component="span" sx={{ color: '#64748b', fontSize: '12px', userSelect: 'none' }}>
                                            [{log.timestamp}]
                                        </Typography>
                                        <Typography 
                                            component="span" 
                                            sx={{ 
                                                fontWeight: 700, 
                                                fontSize: '11px', 
                                                px: 0.75, 
                                                py: 0.1, 
                                                borderRadius: 0.5,
                                                bgcolor: 
                                                    log.type === 'rx' ? '#065f46' : 
                                                    log.type === 'tx' ? '#1e40af' : 
                                                    log.type === 'err' ? '#991b1b' : '#374151',
                                                color: '#fff',
                                                userSelect: 'none'
                                            }}
                                        >
                                            {log.type.toUpperCase()}
                                        </Typography>
                                        <Typography 
                                            component="span" 
                                            sx={{ 
                                                color: 
                                                    log.type === 'rx' ? '#4ade80' : 
                                                    log.type === 'tx' ? '#60a5fa' : 
                                                    log.type === 'err' ? '#f87171' : '#cbd5e1',
                                                wordBreak: 'break-all'
                                            }}
                                        >
                                            {log.text}
                                        </Typography>
                                    </Box>
                                ))
                            )}
                        </Box>

                        {/* TX Input Box */}
                        <Box sx={{ mt: 2, display: 'flex', gap: 1.5 }}>
                            <TextField
                                fullWidth
                                size="small"
                                placeholder="Nhập lệnh gửi tới thiết bị (TX)..."
                                value={sendText}
                                onChange={(e) => setSendText(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                                disabled={!isConnected}
                            />
                            <Button
                                variant="contained"
                                startIcon={<SendIcon />}
                                onClick={handleSend}
                                disabled={!isConnected || !sendText.trim()}
                                sx={{ bgcolor: '#15803d', '&:hover': { bgcolor: '#166534' }, textTransform: 'none', px: 3 }}
                            >
                                Gửi (TX)
                            </Button>
                        </Box>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
};
