import { Html5Qrcode } from 'html5-qrcode';
import { useEffect, useRef, useState } from 'react';
import { Capacitor, registerPlugin } from '@capacitor/core';

// Register our custom native plugin
interface ZXingScannerPlugin {
    scan(): Promise<{ hasContent: boolean; content: string; format?: string; cancelled?: boolean }>;
}
const ZXingScanner = registerPlugin<ZXingScannerPlugin>('ZXingScanner');

const qrcodeRegionId = "html5qr-code-full-region";

export interface Html5QrcodePluginProps {
    fps?: number;
    qrbox?: number | { width: number; height: number };
    aspectRatio?: number;
    disableFlip?: boolean;
    qrCodeSuccessCallback: (decodedText: string, decodedResult: any) => void;
    qrCodeErrorCallback?: (errorMessage: string, error: any) => void;
    onClose?: () => void;
}

const Html5QrcodePlugin = (props: Html5QrcodePluginProps) => {
    const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
    const latestSuccessCb = useRef(props.qrCodeSuccessCallback);
    const latestErrorCb = useRef(props.qrCodeErrorCallback);
    const latestOnClose = useRef(props.onClose);
    const [useWebFallback] = useState(!Capacitor.isNativePlatform());
    const [nativeError, setNativeError] = useState<string | null>(null);
    const [webError, setWebError] = useState<string | null>(null);
    const [isSecure] = useState(window.isSecureContext === true || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    const [isScanningFile, setIsScanningFile] = useState(false);

    useEffect(() => {
        latestSuccessCb.current = props.qrCodeSuccessCallback;
        latestErrorCb.current = props.qrCodeErrorCallback;
        latestOnClose.current = props.onClose;
    }, [props.qrCodeSuccessCallback, props.qrCodeErrorCallback, props.onClose]);

// --- BẮT ĐẦU: POLYFILL CHO HOSTED WEB APP ---
if (typeof window !== 'undefined' && !(window as any).Capacitor?.handleWindowMessage) {
    (window as any).Capacitor = (window as any).Capacitor || {};
    (window as any).Capacitor.Callbacks = (window as any).Capacitor.Callbacks || {};
    
    (window as any).Capacitor.fromNative = function(data: any) {
        const cb = (window as any).Capacitor.Callbacks[data.callbackId];
        if (cb) {
            if (data.error) cb.reject(new Error(data.error));
            else cb.resolve(data.data);
            delete (window as any).Capacitor.Callbacks[data.callbackId];
        }
    };
    
    (window as any).Capacitor.handleWindowMessage = function(message: string) {
        try {
            const data = typeof message === 'string' ? JSON.parse(message) : message;
            const cb = (window as any).Capacitor.Callbacks[data.callbackId];
            if (cb) {
                if (data.error) cb.reject(new Error(data.error?.message || data.error));
                else cb.resolve(data.data);
                delete (window as any).Capacitor.Callbacks[data.callbackId];
            }
        } catch (e) {
            console.error("Capacitor handleWindowMessage Error:", e);
        }
    };
    
    (window as any).Capacitor.triggerEvent = function(eventName: string, target: string, data: any) {
        try {
            const event = new CustomEvent('capacitorEvent', { detail: { eventName, target, data } });
            window.dispatchEvent(event);
        } catch (e) {}
    };
    
    // Polyfill addListener cho AppUpdatePlugin nếu thiếu PluginHeaders
    if (!(window as any).Capacitor.PluginHeaders) {
        (window as any).AppUpdatePluginWeb = {
            addListener: (eventName: string, callback: Function) => {
                const listener = (e: any) => {
                    if (e.detail?.eventName === eventName && e.detail?.target === 'AppUpdatePlugin') {
                        callback(e.detail.data);
                    }
                };
                window.addEventListener('capacitorEvent', listener);
                return { remove: () => window.removeEventListener('capacitorEvent', listener) };
            }
        };
    }
}
// --- KẾT THÚC: POLYFILL ---

let activeNativeScan: Promise<any> | null = null;

// Handle Native Scan — launches ZXing Activity (full-screen camera, no WebView tricks)
    useEffect(() => {
        if (!useWebFallback && (Capacitor.isNativePlatform() || (window as any).androidBridge)) {
            let isCurrentEffect = true;

            const runNativeScan = async () => {
                try {
                    if (!activeNativeScan) {
                        if ((window as any).Capacitor?.PluginHeaders) {
                            // Tiêu chuẩn (Bundled App)
                            activeNativeScan = ZXingScanner.scan();
                        } else if ((window as any).androidBridge) {
                            // Gọi trực tiếp Raw Bridge (Dành cho Hosted Web App)
                            activeNativeScan = new Promise((resolve, reject) => {
                                const callbackId = 'scan_' + Date.now();
                                (window as any).Capacitor.Callbacks[callbackId] = { resolve, reject };
                                (window as any).androidBridge.postMessage(JSON.stringify({
                                    type: 'message',
                                    callbackId: callbackId,
                                    pluginId: 'ZXingScanner',
                                    methodName: 'scan',
                                    options: {}
                                }));
                            });
                        } else {
                            throw new Error("No native bridge available.");
                        }
                    }
                    const promiseToWait = activeNativeScan;
                    const result = await promiseToWait;

                    if (!isCurrentEffect) return;
                    activeNativeScan = null; // Reset for next time

                    if (result && result.hasContent && result.content) {
                        if (latestSuccessCb.current) latestSuccessCb.current(result.content, result);
                        if (latestOnClose.current) latestOnClose.current();
                    } else {
                        // User cancelled the scan
                        if (latestOnClose.current) latestOnClose.current();
                    }
                } catch (err: any) {
                    if (!isCurrentEffect) return;
                    activeNativeScan = null; // Reset for next time
                    console.error("Native ZXing scanner failed:", err);
                    setNativeError(String(err));
                    // Xóa tự động đóng nếu lỗi để người dùng xem lỗi
                }
            };
            runNativeScan();

            return () => {
                isCurrentEffect = false;
            };
        }
    }, [useWebFallback]);

    // Handle Web Fallback Scan (only used on desktop browser, not on native app)
    useEffect(() => {
        if (useWebFallback && isSecure) {
            if (!html5QrCodeRef.current) {
                html5QrCodeRef.current = new Html5Qrcode(qrcodeRegionId);
                const config: any = {};
                if (props.fps) config.fps = props.fps;
                if (props.qrbox) config.qrbox = props.qrbox;
                if (props.aspectRatio) config.aspectRatio = props.aspectRatio;
                if (props.disableFlip !== undefined) config.disableFlip = props.disableFlip;

                html5QrCodeRef.current.start(
                    { facingMode: "environment" },
                    config,
                    (text, result) => {
                        if (latestSuccessCb.current) latestSuccessCb.current(text, result);
                    },
                    (err, errResult) => {
                        if (latestErrorCb.current) latestErrorCb.current(err, errResult);
                    }
                ).catch(err => {
                    console.error("Camera start error:", err);
                    setWebError(String(err) || "Lỗi quyền truy cập Camera");
                });
            }

            return () => {
                if (html5QrCodeRef.current) {
                    const scanner = html5QrCodeRef.current;
                    if (scanner.isScanning) {
                        scanner.stop().then(() => {
                            scanner.clear();
                        }).catch(() => { });
                    } else {
                        scanner.clear();
                    }
                    html5QrCodeRef.current = null;
                }
            };
        }
    }, [useWebFallback, isSecure, props.fps, props.qrbox, props.aspectRatio, props.disableFlip]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];
        
        setIsScanningFile(true);
        setWebError(null);
        try {
            if (!html5QrCodeRef.current) {
                html5QrCodeRef.current = new Html5Qrcode(qrcodeRegionId);
            }
            // false: don't render image to avoid memory bloat
            const decodedText = await html5QrCodeRef.current.scanFile(file, false);
            if (latestSuccessCb.current) latestSuccessCb.current(decodedText, { result: decodedText });
            if (latestOnClose.current) latestOnClose.current();
        } catch (err: any) {
            console.error(err);
            setWebError("❌ Không tìm thấy mã QR/Barcode trong ảnh. Xin hãy chụp thật rõ nét (không bị lóa, không bị mờ).");
        } finally {
            setIsScanningFile(false);
            if (e.target) e.target.value = ''; // allow picking same file again
        }
    };

    // Native platform: show a simple "opening camera" message while ZXing Activity launches
    if (!useWebFallback && Capacitor.isNativePlatform()) {
        return (
            <div style={{
                width: '100%', height: '200px', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                backgroundColor: nativeError ? '#fef2f2' : '#f0fdf4', 
                borderRadius: '12px', 
                border: nativeError ? '2px solid #ef4444' : '2px solid #86efac',
                padding: '16px', textAlign: 'center'
            }}>
                {nativeError ? (
                    <p style={{ fontWeight: 600, color: '#dc2626' }}>❌ Lỗi mở Camera App:<br/><br/>{nativeError}</p>
                ) : (
                    <>
                        <div style={{
                            width: '48px', height: '48px', border: '4px solid #22c55e',
                            borderTopColor: 'transparent', borderRadius: '50%',
                            animation: 'spin 1s linear infinite'
                        }} />
                        <p style={{ fontWeight: 600, color: '#166534', marginTop: '16px' }}>
                            Đang mở Camera quét mã...
                        </p>
                        <p style={{ fontSize: '12px', color: '#4ade80', marginTop: '4px' }}>
                            Camera sẽ mở toàn màn hình
                        </p>
                        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                    </>
                )}
            </div>
        );
    }

    // Nếu đang chạy trên HTTP thông thường (trình duyệt Tablet, không phải APK)
    if (useWebFallback && (!isSecure || webError)) {
        return (
            <div style={{
                width: '100%', minHeight: '260px', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc',
                borderRadius: '12px', border: '2px dashed #94a3b8', padding: '16px', textAlign: 'center'
            }}>
                <div id={qrcodeRegionId} style={{ display: 'none' }} />
                
                {isScanningFile ? (
                    <>
                        <div style={{
                            width: '40px', height: '40px', border: '3px solid #3b82f6',
                            borderTopColor: 'transparent', borderRadius: '50%',
                            animation: 'spin 1s linear infinite', marginBottom: '16px'
                        }} />
                        <p style={{ fontWeight: 600, color: '#1e40af' }}>Đang phân tích hình ảnh...</p>
                        <p style={{ fontSize: '13px', color: '#64748b' }}>Vui lòng giữ máy trong giây lát</p>
                    </>
                ) : (
                    <>
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 12 }}>
                            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                            <circle cx="12" cy="13" r="4"></circle>
                        </svg>
                        
                        <p style={{ fontWeight: 700, color: '#334155', fontSize: '15px' }}>Chụp ảnh trực tiếp để Quét Mã</p>
                        <p style={{ color: '#64748b', fontSize: '13px', marginTop: '6px', marginBottom: '20px' }}>
                            (Do chạy trên mạng nội bộ HTTP nên phải dùng tính năng chụp ảnh hệ thống)
                        </p>

                        <label style={{
                            backgroundColor: '#2563eb', color: 'white', padding: '12px 24px',
                            borderRadius: '8px', fontWeight: 600, cursor: 'pointer',
                            display: 'inline-flex', alignItems: 'center', gap: '8px',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
                        }}>
                            📸 BẤM ĐỂ MỞ CAMERA
                            <input 
                                type="file" 
                                accept="image/*" 
                                capture="environment" 
                                onChange={handleFileUpload}
                                style={{ display: 'none' }} 
                            />
                        </label>
                        
                        {webError && (
                            <p style={{ color: '#dc2626', fontSize: '13px', marginTop: '16px', fontWeight: 500, backgroundColor: '#fef2f2', padding: '8px', borderRadius: '4px' }}>
                                {webError}
                            </p>
                        )}
                    </>
                )}
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    return <div id={qrcodeRegionId} style={{ width: '100%', height: '100%', minHeight: '300px' }} />;
};

export default Html5QrcodePlugin;
