/**
 * Global Push Context — keeps push states alive across page navigation.
 * Push operations continue even when the user navigates away from INSW Push page.
 *
 * Uses frontend pushToInsw() with correct kdKegiatan based on fileType:
 *   pemasukan   → 30
 *   pengeluaran → 31
 *   stock_opname→ 32
 *   adjustment  → 33
 */
import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react';
import { getFileDetail, savePushLog, getPushHistory } from '../services/api.ts';
import type { PushLogDto } from '../services/api.ts';
import { pushToInsw } from '../services/inswApi.ts';
import type { ParsedDataSuccess } from '../types/index.ts';
import { DataEvents } from '../utils/dataEvents.ts';

// ─── fileType → kdKegiatan mapping ───────────────────────────
export function getKdKegiatan(fileType?: string): string {
  switch (fileType) {
    case 'pengeluaran': return '31';
    case 'stock_opname': return '32';
    case 'adjustment': return '33';
    default: return '30'; // pemasukan / default
  }
}

// ─── Types ───────────────────────────────────────────────────
export interface PushState {
  status: 'idle' | 'pushing' | 'success' | 'failed';
  response?: PushLogDto;
}

interface PushContextValue {
  pushStates: Record<number, PushState>;
  pushFile: (fileId: number, username: string, fileType?: string) => Promise<void>;
  pushFiles: (fileIds: number[], username: string, fileTypes?: Record<number, string>) => Promise<void>;
  updatePushState: (fileId: number, state: PushState) => void;
  loadHistory: () => Promise<void>;
  historyLoaded: boolean;
}

const PushContext = createContext<PushContextValue | null>(null);

// ─── Provider ────────────────────────────────────────────────
export function PushProvider({ children }: { children: ReactNode }) {
  const [pushStates, setPushStates] = useState<Record<number, PushState>>({});
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const loadingHistory = useRef(false);

  // Load push history from backend (only once)
  const loadHistory = useCallback(async () => {
    if (loadingHistory.current) return;
    loadingHistory.current = true;
    try {
      const res = await getPushHistory();
      if (res.success && res.data) {
        setPushStates(prev => {
          const next = { ...prev };
          for (const log of res.data!) {
            // Don't overwrite active pushing states
            if (next[log.fileId]?.status === 'pushing') continue;
            if (!next[log.fileId]) {
              next[log.fileId] = {
                status: log.status === 'success' ? 'success' : 'failed',
                response: log,
              };
            }
          }
          return next;
        });
      }
      setHistoryLoaded(true);
    } catch (err) {
      console.error('Failed to load push history:', err);
    } finally {
      loadingHistory.current = false;
    }
  }, []);

  // Push single file — uses frontend pushToInsw with correct kdKegiatan
  const pushFile = useCallback(async (fileId: number, username: string, fileType?: string) => {
    setPushStates(prev => ({ ...prev, [fileId]: { status: 'pushing' } }));
    try {
      // Load file detail to get parsed data
      const detailRes = await getFileDetail(fileId);
      if (!detailRes.success || !detailRes.data) throw new Error('Failed to load file detail');
      const d = detailRes.data;

      const parsedData: ParsedDataSuccess = {
        success: true, fileName: d.fileName, parsedAt: d.importedAt,
        header: {
          nomorPengajuan: d.header?.nomorPengajuan || '',
          tanggalPengajuan: d.header?.tanggalPengajuan || '',
          nomorPendaftaran: d.header?.nomorPendaftaran || '',
          tanggalPendaftaran: d.header?.tanggalPendaftaran || '',
        },
        items: (d.items || []).map(item => ({
          no: String(item.itemNo), kodeHS: item.kodeHS || '', uraianBarang: item.uraianBarang || '',
          kodeBarang: item.kodeBarang || '', jumlah: item.jumlah || '', satuan: item.satuan || '',
          harga: item.harga || '', amount: item.amount || '', nilaiPabean: item.nilaiPabean || '', negara: item.negara || '',
        })),
        _debug: { totalPages: 0, totalItems: d.items?.length || 0, totalLines: 0, yTolerance: 0, colRanges: [], rawLines: [] },
      };

      const kdKegiatan = getKdKegiatan(fileType);
      const start = Date.now();
      const result = await pushToInsw(parsedData, kdKegiatan);
      const duration = Date.now() - start;

      const logRes = await savePushLog({
        fileId, status: result.success ? 'success' : 'failed',
        httpStatus: result.status, requestBody: null,
        responseBody: result.data ? JSON.stringify(result.data) : null,
        errorMessage: result.error || null, duration,
      }, username);

      setPushStates(prev => ({
        ...prev,
        [fileId]: {
          status: result.success ? 'success' : 'failed',
          response: logRes.data || undefined,
        },
      }));
      DataEvents.emit(DataEvents.PUSH_COMPLETED);
    } catch (err: any) {
      setPushStates(prev => ({ ...prev, [fileId]: { status: 'failed' } }));
    }
  }, []);

  // Push multiple files — runs in background
  const pushFiles = useCallback(async (fileIds: number[], username: string, fileTypes?: Record<number, string>) => {
    setPushStates(prev => {
      const next = { ...prev };
      for (const id of fileIds) next[id] = { status: 'pushing' };
      return next;
    });

    for (const fileId of fileIds) {
      try {
        const detailRes = await getFileDetail(fileId);
        if (!detailRes.success || !detailRes.data) {
          setPushStates(prev => ({ ...prev, [fileId]: { status: 'failed' } }));
          continue;
        }
        const d = detailRes.data;
        const parsedData: ParsedDataSuccess = {
          success: true, fileName: d.fileName, parsedAt: d.importedAt,
          header: {
            nomorPengajuan: d.header?.nomorPengajuan || '',
            tanggalPengajuan: d.header?.tanggalPengajuan || '',
            nomorPendaftaran: d.header?.nomorPendaftaran || '',
            tanggalPendaftaran: d.header?.tanggalPendaftaran || '',
          },
          items: (d.items || []).map(item => ({
            no: String(item.itemNo), kodeHS: item.kodeHS || '', uraianBarang: item.uraianBarang || '',
            kodeBarang: item.kodeBarang || '', jumlah: item.jumlah || '', satuan: item.satuan || '',
            harga: item.harga || '', amount: item.amount || '', nilaiPabean: item.nilaiPabean || '', negara: item.negara || '',
          })),
          _debug: { totalPages: 0, totalItems: d.items?.length || 0, totalLines: 0, yTolerance: 0, colRanges: [], rawLines: [] },
        };

        const ft = fileTypes?.[fileId];
        const kdKegiatan = getKdKegiatan(ft);
        const start = Date.now();
        const result = await pushToInsw(parsedData, kdKegiatan);
        const duration = Date.now() - start;

        const logRes = await savePushLog({
          fileId, status: result.success ? 'success' : 'failed',
          httpStatus: result.status, requestBody: null,
          responseBody: result.data ? JSON.stringify(result.data) : null,
          errorMessage: result.error || null, duration,
        }, username);

        setPushStates(prev => ({
          ...prev,
          [fileId]: {
            status: result.success ? 'success' : 'failed',
            response: logRes.data || undefined,
          },
        }));
      } catch {
        setPushStates(prev => ({ ...prev, [fileId]: { status: 'failed' } }));
      }
    }
    DataEvents.emit(DataEvents.PUSH_COMPLETED);
  }, []);

  // Allow external callers (Import pages) to update push state
  const updatePushState = useCallback((fileId: number, state: PushState) => {
    setPushStates(prev => ({ ...prev, [fileId]: state }));
  }, []);

  return (
    <PushContext.Provider value={{ pushStates, pushFile, pushFiles, updatePushState, loadHistory, historyLoaded }}>
      {children}
    </PushContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────
export function usePush(): PushContextValue {
  const ctx = useContext(PushContext);
  if (!ctx) throw new Error('usePush must be used within PushProvider');
  return ctx;
}
