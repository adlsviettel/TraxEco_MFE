export const saveFileWithPicker = async (
  blob: Blob,
  suggestedName: string,
  mimeType: string,
  extension: string
): Promise<boolean> => {
  if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName,
        types: [
          {
            description: `${extension.toUpperCase()} File (*.${extension})`,
            accept: {
              [mimeType]: [`.${extension}`],
            },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return true;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // User cancelled the save dialog intentionally
        return true;
      }
      console.warn('showSaveFilePicker failed or unsupported, fallback to standard download', err);
    }
  }
  return false;
};
