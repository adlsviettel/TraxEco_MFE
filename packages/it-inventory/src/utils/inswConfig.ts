/**
 * INSW Config — read/write API authentication headers from localStorage
 */

import type { InswConfig } from '../types/index.ts';

const STORAGE_KEY = 'insw_config';

export const DEFAULT_INSW_CONFIG: InswConfig = {
  xInswKey: 'RqT40lH7Hy202uUybBLkFhtNnfAvxrlp',
  xUniqueKey: '70f7f264e0646b2092c6fd1cd3c3c3366d9e1717fcc55ff81ce51c8c5a514c82',
};

export async function getInswConfig(): Promise<InswConfig> {
  const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  try {
    const res = await fetch(`${BASE_URL}/insw/config`, { headers });
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        return {
          xInswKey: json.data['x-inswkey'] || DEFAULT_INSW_CONFIG.xInswKey,
          xUniqueKey: json.data['x-unique-key'] || DEFAULT_INSW_CONFIG.xUniqueKey,
        };
      }
    }
  } catch (e) {
    console.warn("Failed to fetch insw config from API", e);
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<InswConfig>;
      return {
        xInswKey: parsed.xInswKey || DEFAULT_INSW_CONFIG.xInswKey,
        xUniqueKey: parsed.xUniqueKey || DEFAULT_INSW_CONFIG.xUniqueKey,
      };
    }
  } catch {
    // ignore parse errors
  }
  return { ...DEFAULT_INSW_CONFIG };
}

export function saveInswConfig(config: InswConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function resetInswConfig(): void {
  localStorage.removeItem(STORAGE_KEY);
}
