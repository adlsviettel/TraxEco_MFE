/**
 * Shared file storage — persist imported PDF data in localStorage
 * so InswPush page can access files imported from Inbound page.
 */

import type { FileEntry } from '../types/index.ts';

const STORAGE_KEY = 'imported_files';

export function getImportedFiles(): FileEntry[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored) as FileEntry[];
  } catch {
    // ignore parse errors
  }
  return [];
}

export function saveImportedFiles(files: FileEntry[]): void {
  // Only save successfully parsed files (no pending/parsing), strip _file
  const toSave = files
    .filter(f => f.status === 'processed' || f.status === 'failed')
    .map(({ _file, ...rest }) => rest);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
}

export function removeImportedFile(id: number): void {
  const files = getImportedFiles().filter(f => f.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
}
