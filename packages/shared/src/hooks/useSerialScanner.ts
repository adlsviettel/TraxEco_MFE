import { useState, useCallback, useRef, useEffect } from 'react';

// Extend Navigator type for Web Serial API
declare global {
  interface Navigator {
    serial: {
      requestPort(options?: { filters?: { usbVendorId: number }[] }): Promise<SerialPort>;
      getPorts(): Promise<SerialPort[]>;
      addEventListener(type: string, listener: EventListener): void;
      removeEventListener(type: string, listener: EventListener): void;
    };
  }

  interface SerialPort {
    open(options: { baudRate: number; dataBits?: number; stopBits?: number; parity?: string }): Promise<void>;
    close(): Promise<void>;
    readable: ReadableStream<Uint8Array> | null;
    writable: WritableStream<Uint8Array> | null;
    getInfo(): { usbVendorId?: number; usbProductId?: number };
    addEventListener(type: string, listener: EventListener): void;
    removeEventListener(type: string, listener: EventListener): void;
  }
}

export type SerialStatus = 'disconnected' | 'connecting' | 'connected' | 'error' | 'unsupported';

interface UseSerialScannerOptions {
  baudRate?: number;
  onBarcode: (barcode: string) => void;
}

export function useSerialScanner({ baudRate = 9600, onBarcode }: UseSerialScannerOptions) {
  const [status, setStatus] = useState<SerialStatus>('disconnected');
  const [portName, setPortName] = useState('');
  const portRef = useRef<SerialPort | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const onBarcodeRef = useRef(onBarcode);

  // Keep callback ref up to date
  useEffect(() => {
    onBarcodeRef.current = onBarcode;
  }, [onBarcode]);

  // Check if Web Serial API is supported
  const isSupported = typeof navigator !== 'undefined' && 'serial' in navigator;

  // Read loop — runs in background, fires onBarcode for each line
  const startReading = useCallback(async (port: SerialPort) => {
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (port.readable) {
        const reader = port.readable.getReader();
        readerRef.current = reader;
        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            // Split by newline/carriage return (scanner sends \r\n or \r or \n after barcode)
            const lines = buffer.split(/[\r\n]+/);
            buffer = lines.pop() || ''; // keep incomplete line in buffer

            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed.length > 0) {
                onBarcodeRef.current(trimmed);
              }
            }
          }
        } finally {
          reader.releaseLock();
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      // Ignore abort errors (expected when disconnecting)
      if (!message.includes('abort') && !message.includes('cancel')) {
        console.error('Serial read error:', err);
        setStatus('error');
      }
    }
  }, []);

  // Connect to a COM port
  const connect = useCallback(async () => {
    if (!isSupported) {
      setStatus('unsupported');
      return;
    }

    try {
      setStatus('connecting');

      // First try to reconnect to previously paired port
      let port: SerialPort | null = null;
      const knownPorts = await navigator.serial.getPorts();
      if (knownPorts.length > 0) {
        port = knownPorts[0]; // Auto-pick first known port
      }

      // If no known port, ask user to select
      if (!port) {
        port = await navigator.serial.requestPort();
      }

      // Open with config
      await port.open({
        baudRate,
        dataBits: 8,
        stopBits: 1,
        parity: 'none',
      });

      portRef.current = port;
      const info = port.getInfo();
      setPortName(info.usbVendorId ? `USB ${info.usbVendorId}:${info.usbProductId}` : 'COM Port');
      setStatus('connected');

      // Start reading in background
      startReading(port);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      // User cancelled the port selection dialog
      if (message.includes('No port selected') || message.includes('user')) {
        setStatus('disconnected');
      } else {
        console.error('Serial connect error:', err);
        setStatus('error');
      }
    }
  }, [isSupported, baudRate, startReading]);

  // Disconnect
  const disconnect = useCallback(async () => {
    try {
      // Cancel reader
      if (readerRef.current) {
        await readerRef.current.cancel();
        readerRef.current = null;
      }
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
      // Close port
      if (portRef.current) {
        await portRef.current.close();
        portRef.current = null;
      }
    } catch (err) {
      console.error('Serial disconnect error:', err);
    } finally {
      setStatus('disconnected');
      setPortName('');
    }
  }, []);

  // Auto-reconnect on mount (if previously paired)
  useEffect(() => {
    if (!isSupported) {
      setStatus('unsupported');
      return;
    }

    // Try to auto-connect to previously paired port
    (async () => {
      try {
        const knownPorts = await navigator.serial.getPorts();
        if (knownPorts.length > 0) {
          const port = knownPorts[0];
          setStatus('connecting');
          await port.open({
            baudRate,
            dataBits: 8,
            stopBits: 1,
            parity: 'none',
          });
          portRef.current = port;
          const info = port.getInfo();
          setPortName(info.usbVendorId ? `USB ${info.usbVendorId}:${info.usbProductId}` : 'COM Port');
          setStatus('connected');
          startReading(port);
        }
      } catch {
        // Port might be in use or unavailable, silently ignore
        setStatus('disconnected');
      }
    })();

    return () => {
      // Cleanup on unmount
      if (readerRef.current) {
        readerRef.current.cancel().catch(() => {});
      }
      if (portRef.current) {
        portRef.current.close().catch(() => {});
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    status,
    portName,
    isSupported,
    connect,
    disconnect,
  };
}
