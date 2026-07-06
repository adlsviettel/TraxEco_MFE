import JsBarcode from 'jsbarcode';
import type { PackingListItem, PackingDetailItem } from './packingPlanService';

export interface LabelData {
  poNo: string;
  cartonNo: number;
  totalCartons: number;
  qty: number;
  workingNumber: string;
  jobNo: string;
  ctnSeriNo: string;
  sizes: { size: string; qty: number }[];
}

/**
 * Build label data from packing list item + detail
 */
export function buildLabelData(
  item: PackingListItem,
  packingDetail: PackingDetailItem[],
  totalCartons: number
): LabelData {
  // Filter detail by this carton
  const cartonSizes = packingDetail.filter(
    (d) =>
      d.PKInsNo === item.PKInsNo &&
      d.PONo === item.PONo &&
      d.JobNo === item.JobNo &&
      d.CartonNo === item.CartonNo
  );

  return {
    poNo: item.PONo,
    cartonNo: item.CartonNo,
    totalCartons,
    qty: item.PackedQty,
    workingNumber: item.WorkingNumber,
    jobNo: item.JobNo || '',
    ctnSeriNo: item.CTNSeriNo,
    sizes: cartonSizes.map((s) => ({ size: s.Sizx, qty: s.CartonQty })),
  };
}

/**
 * Generate barcode as SVG string
 */
function generateBarcodeSVG(value: string): string {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  JsBarcode(svg, value, {
    format: 'CODE128',
    width: 1.5,
    height: 40,
    displayValue: true,
    fontSize: 11,
    font: 'monospace',
    textMargin: 2,
    margin: 0,
  });
  return new XMLSerializer().serializeToString(svg);
}

/**
 * Print label(s) — opens a print window with 7.5x7.5cm label layout
 */
export function printLabels(labels: LabelData[]): void {
  const labelsHTML = labels
    .map((label) => {
      const barcodeSVG = generateBarcodeSVG(label.ctnSeriNo);

      // Build size breakdown string
      const sizeText = label.sizes.map((s) => `${s.size}: ${s.qty}`).join('<br>');

      return `
        <div class="label">
          <table class="info-table">
            <tr>
              <td class="info-cell">
                <div class="info-header">PO</div>
                <div class="info-value">${label.poNo}</div>
              </td>
              <td class="info-cell">
                <div class="info-header">Carton No.</div>
                <div class="info-value">${label.cartonNo}/${label.totalCartons}</div>
              </td>
              <td class="info-cell">
                <div class="info-header">Qty</div>
                <div class="info-value">${label.qty}</div>
              </td>
            </tr>
          </table>

          <div class="detail-row">
            <div class="left-info">
              <div class="working-no">${label.workingNumber}</div>
              <div class="job-no">SO: ${label.jobNo}</div>
            </div>
            <div class="size-breakdown">${sizeText}</div>
          </div>

          <div class="barcode-area">
            ${barcodeSVG}
          </div>
        </div>
      `;
    })
    .join('');

  // Use hidden iframe instead of popup — faster, no new window flash
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:none;';
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) {
    alert('Cannot create print frame.');
    document.body.removeChild(iframe);
    return;
  }

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Print Label</title>
      <style>
        @page {
          size: 75mm 75mm;
          margin: 0;
        }

        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        body {
          font-family: Arial, Helvetica, sans-serif;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .label {
          width: 75mm;
          height: 75mm;
          padding: 3mm;
          display: flex;
          flex-direction: column;
          page-break-after: always;
          border: 1px solid #000;
        }

        .label:last-child {
          page-break-after: auto;
        }

        .info-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
        }

        .info-cell {
          border: 1px solid #000;
          text-align: center;
          padding: 2mm 1mm;
          vertical-align: top;
        }

        .info-header {
          font-size: 9pt;
          font-weight: normal;
          margin-bottom: 1mm;
        }

        .info-value {
          font-size: 11pt;
          font-weight: bold;
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 3mm 2mm;
          flex-grow: 1;
        }

        .working-no {
          font-size: 10pt;
          font-weight: bold;
        }

        .job-no {
          font-size: 9pt;
          font-weight: bold;
          margin-top: 1mm;
        }

        .size-breakdown {
          font-size: 10pt;
          font-weight: bold;
          text-align: right;
          line-height: 1.4;
        }

        .barcode-area {
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 1mm 2mm 2mm;
        }

        .barcode-area svg {
          width: 60mm;
          height: auto;
        }
      </style>
    </head>
    <body>
      ${labelsHTML}
    </body>
    </html>
  `);
  doc.close();

  // Guard to prevent double print trigger
  let printed = false;
  const doPrint = () => {
    if (printed) return;
    printed = true;
    setTimeout(() => {
      iframe.contentWindow?.print();
      // Clean up iframe after printing
      setTimeout(() => {
        if (iframe.parentNode) document.body.removeChild(iframe);
      }, 2000);
    }, 300);
  };

  // Wait for content to render, then print
  iframe.onload = doPrint;

  // Trigger for browsers that don't fire onload for doc.write
  if (doc.readyState === 'complete') {
    doPrint();
  }
}
