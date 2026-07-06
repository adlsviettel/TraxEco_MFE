import type { Item } from '../types';

export const ZEBRA_IP_KEY = 'traxeco_zebra_ip';

export interface LabelSize {
  id: string;
  label: string;
  width: number;
  height: number;
  generateZPL: (item: Item, qrValue: string, copies: number) => string;
}

/**
 * 62mm x 29mm
 * (Assumes ~8 dots/mm printer like 203 DPI -> ~496 x 232 dots)
 */
const generate62x29ZPL = (item: Item, qrValue: string, copies: number): string => {
  // Strip special chars for simple ZPL text to avoid ^FD issues
  const safeName = (item.name || '').replace(/\^/g, '').substring(0, 30);
  const safeCode = (item.itemCode || '').replace(/\^/g, '').substring(0, 20);
  const type = item.itemType || 'IT';
  const qty = item.quantity ?? '-';
  const loc = (item.location || '').replace(/\^/g, '');

  return `
^XA
^PW496
^LL232
^CFA,20
^FO20,20^BQN,2,4^FDQA,${qrValue}^FS
^FO150,20^A0N,28,28^FD${safeName}^FS
^FO150,60^A0N,20,20^FD${safeCode}^FS
^FO150,90^A0N,20,20^FDType: ${type}^FS
^FO150,120^A0N,20,20^FDLoc: ${loc}^FS
^FO150,150^A0N,20,20^FDQty: ${qty}^FS
^PQ${copies}
^XZ
`.trim();
};

/**
 * 100mm x 50mm
 * (Assumes ~8 dots/mm printer -> ~800 x 400 dots)
 */
const generate100x50ZPL = (item: Item, qrValue: string, copies: number): string => {
  const safeName = (item.name || '').replace(/\^/g, '').substring(0, 40);
  const safeCode = (item.itemCode || '').replace(/\^/g, '').substring(0, 30);
  const supplier = (item.supplierName || '').replace(/\^/g, '').substring(0, 30);
  const type = item.itemType || 'IT';
  const qty = item.quantity ?? '-';
  const loc = (item.location || '').replace(/\^/g, '');

  return `
^XA
^PW800
^LL400
^FO40,40^BQN,2,6^FDQA,${qrValue}^FS
^FO250,50^A0N,40,40^FD${safeName}^FS
^FO250,110^A0N,30,30^FDCode: ${safeCode}^FS
^FO250,160^A0N,30,30^FDType: ${type}    Qty: ${qty}^FS
^FO250,210^A0N,30,30^FDLoc: ${loc}^FS
^FO250,260^A0N,30,30^FDSup: ${supplier}^FS
^PQ${copies}
^XZ
`.trim();
};

export const LABEL_SIZES: LabelSize[] = [
  { id: '62x29', label: '62mm × 29mm (Zebra/Dymo)', width: 234, height: 110, generateZPL: generate62x29ZPL },
  { id: '100x50', label: '100mm × 50mm', width: 378, height: 189, generateZPL: generate100x50ZPL },
];

export const printViaZebraIp = async (ipAddress: string, zplCommand: string): Promise<void> => {
  if (!ipAddress) {
    throw new Error('Please specify a Zebra Printer IP address.');
  }

  // We use no-cors because we are posting from an HTTPS or localhost origin to a local IP.
  // The printer typically won't return CORS headers, so we do a blind POST.
  try {
    const response = await fetch(`http://${ipAddress}/pstprnt`, {
      method: 'POST',
      mode: 'no-cors',
      body: zplCommand,
      headers: {
        'Content-Type': 'text/plain',
      },
    });
    
    // With no-cors, response.type is 'opaque', meaning we can't check response.ok or response.status.
    // If fetch didn't throw a network error, we assume the packet was sent successfully over the network.
    console.log('ZPL sent to printer (opaque response):', response);
  } catch (error) {
    console.error('Failed to send ZPL to printer:', error);
    throw new Error('Network error: Could not reach the printer IP. Please ensure you are on the same WiFi network.');
  }
};
