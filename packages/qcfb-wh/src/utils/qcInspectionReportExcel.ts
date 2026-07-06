import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

type TFunc = (key: string, fallback: string) => string;

/**
 * Export "Fabric Inspection Report Trax Intertrade" sheet
 * Mirrors WinForm Form11 button1_Click logic exactly
 * 14 columns (A-N), document checklist, order allocate, signatures
 */
export const generateInspectionReportExcel = async (detailData: any, selectedRow: any, t?: TFunc) => {
  const workbook = new ExcelJS.Workbook();
  const _t = t || ((_k: string, fb: string) => fb);
  const headerObj = detailData.header?.[0] || selectedRow;
  const perInsObj = detailData.percentInspected?.[0] || {};
  const summaryObj = detailData.summary?.[0] || {};
  const allRolls: any[] = detailData.rolls || [];

  // Group rolls by batch for the document checklist table (ds.Tables[4] equivalent)
  const batchMap: Record<string, { totalL: number; totalRoll: number; invoiceNo: string }> = {};
  for (const roll of allRolls) {
    const batch = roll.BatchNo || 'N/A';
    if (!batchMap[batch]) batchMap[batch] = { totalL: 0, totalRoll: 0, invoiceNo: roll.InvoiceNo || headerObj.InvoiceNo || '' };
    batchMap[batch].totalRoll++;
    batchMap[batch].totalL += parseFloat(roll.ShipLength || '0') || 0;
  }
  const batchRows = Object.entries(batchMap).map(([batch, info]) => ({
    BatchNo: batch, TotalL: Math.round(info.totalL * 100) / 100, TotalRoll: info.totalRoll, InvoiceNo: info.invoiceNo
  }));

  const MAX_ROWS = 10; // WinForm uses 10 batch rows per sheet
  const totalBatchRows = batchRows.length;
  const sheetCount = Math.ceil(totalBatchRows / MAX_ROWS) || 1;

  // Border helpers
  const TH: Partial<ExcelJS.Border> = { style: 'thin' };
  const MD: Partial<ExcelJS.Border> = { style: 'medium' };
  const NO: Partial<ExcelJS.Border> = { style: undefined };

  for (let sheetIndex = 0; sheetIndex < sheetCount; sheetIndex++) {
    const ws = workbook.addWorksheet(`ReportInspection_${sheetIndex + 1}`, {
      pageSetup: {
        paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 1,
        margins: { left: 0.25, right: 0.25, top: 0.25, bottom: 0.25, header: 0, footer: 0 }
      }
    });

    // Column widths (matching WinForm: A=15, B=18, C-F=12, G=2(spacer), H-N=12)
    ws.getColumn(1).width = 15;  // A
    ws.getColumn(2).width = 18;  // B
    for (let c = 3; c <= 14; c++) ws.getColumn(c).width = 12;
    ws.getColumn(7).width = 2;   // G = spacer

    function sc(r: number, c: number, v: any, opts?: { ha?: string; bold?: boolean; sz?: number; wrap?: boolean }) {
      const cell = ws.getCell(r, c);
      cell.value = v;
      cell.font = { name: 'Times New Roman', size: opts?.sz || 12, bold: opts?.bold || false };
      cell.alignment = { vertical: 'middle', horizontal: (opts?.ha || 'left') as any, wrapText: opts?.wrap || false };
      return cell;
    }

    function setBorder(r: number, c: number, top?: Partial<ExcelJS.Border>, bottom?: Partial<ExcelJS.Border>, left?: Partial<ExcelJS.Border>, right?: Partial<ExcelJS.Border>) {
      ws.getCell(r, c).border = { top: top || NO, bottom: bottom || NO, left: left || NO, right: right || NO } as ExcelJS.Borders;
    }

    function merge(r1: number, c1: number, r2: number, c2: number) {
      try { ws.mergeCells(r1, c1, r2, c2); } catch (_e) { /* ignore */ }
    }

    // Black fill helper
    function blackFill(r: number, c: number) {
      ws.getCell(r, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF000000' } };
    }

    // ==========================================
    // ROW 1: Title
    // ==========================================
    merge(1, 1, 1, 8);
    sc(1, 1, 'FABRIC  INSPECTION  REPORT  TRAX  INTERTRADE', { ha: 'center', bold: true, sz: 14 });

    // ROW 2: spacer
    ws.getRow(2).height = 5;

    // ROW 3: CUSTOMER / RECEIVED DATE / INSPECTION DATE
    sc(3, 1, 'CUSTOMER:');
    sc(3, 6, 'RECEIVED DATE : ', { ha: 'right' });
    sc(3, 11, 'INSPECTION DATE : ', { ha: 'right' });
    sc(3, 12, perInsObj.DateIns || '', { ha: 'left' });

    // ROW 4: SEASON / PURCHASE ORDER / SUPPLIER NAME
    sc(4, 1, 'SEASON:');
    sc(4, 6, 'PURCHASE ORDER :', { ha: 'right' });
    sc(4, 8, headerObj.OrderNumber || '');
    sc(4, 11, 'SUPPLIER NAME:', { ha: 'right' });
    sc(4, 12, headerObj.SupCode || '');

    // ROW 5: FABRIC ITEM / COLOR NAME / FABRIC WIDTH
    sc(5, 1, 'FABRIC ITEM : ');
    sc(5, 2, headerObj.RollItem || '');
    sc(5, 6, 'COLOR NAME:', { ha: 'right' });
    sc(5, 8, headerObj.Color || '');
    sc(5, 11, 'FABRIC WIDTH :', { ha: 'right' });
    sc(5, 12, perInsObj.Width || '');

    // ROW 6: DESCRIPTION
    sc(6, 1, 'DESCRIPTION:');
    merge(6, 2, 7, 9);
    sc(6, 2, perInsObj.ProductName || '');
    sc(6, 11, 'LOT:', { ha: 'right' });

    // ROW 7: NO FOC
    sc(7, 12, 'NO FOC', { ha: 'right' });

    // ROW 8: ORDER QTY / INSPECTION QTY / ROLL
    sc(8, 1, 'ORDER QTY  :');
    sc(8, 2, summaryObj.TotalL || '');
    sc(8, 4, 'YDS', { bold: true });
    sc(8, 6, 'INSPECTION QTY(YDS) :');
    sc(8, 9, summaryObj.TotalL || '');
    sc(8, 10, 'YDS', { bold: true });
    sc(8, 12, 'ROLL:');
    sc(8, 13, summaryObj.TotalRoll || '');

    // ROW 9: % INSPECTION / INSPECTION QTY / ROLL
    sc(9, 1, '% INSPECTION :');
    sc(9, 2, `${perInsObj.PerIns || ''}%`);
    sc(9, 6, 'INSPECTION QTY(YDS) :');
    sc(9, 9, perInsObj.LIns || '');
    sc(9, 12, 'ROLL:');
    sc(9, 13, perInsObj.RollIns || '');

    // ROW 10: ACTUAL FABRIC WIDTH
    sc(10, 1, 'ACTUAL FABRIC WIDTH (Inch) :');

    // ROW 11: spacer
    ws.getRow(11).height = 5;

    // ==========================================
    // ROW 12: Document Checklist HEADER
    // ==========================================
    ws.getRow(12).height = 25;
    merge(12, 1, 12, 2);
    sc(12, 1, 'Document list', { bold: false });
    setBorder(12, 1, MD, MD, MD, NO);
    setBorder(12, 2, MD, MD, NO, MD);
    sc(12, 3, 'RECEIVED', { ha: 'center' }); setBorder(12, 3, MD, MD, MD, MD);
    sc(12, 4, 'PENDING', { ha: 'center' }); setBorder(12, 4, MD, MD, MD, MD);
    sc(12, 5, 'ACCEPTED', { ha: 'center' }); setBorder(12, 5, MD, MD, MD, MD);
    sc(12, 6, 'REJECTED', { ha: 'center' }); setBorder(12, 6, MD, MD, MD, MD);
    // Col G = spacer (no content)
    sc(12, 8, 'BATCH', { ha: 'center' }); setBorder(12, 8, MD, MD, MD, MD);
    sc(12, 9, 'YARD', { ha: 'center' }); setBorder(12, 9, MD, MD, MD, MD);
    sc(12, 10, 'ROLL', { ha: 'center' }); setBorder(12, 10, MD, MD, MD, MD);
    sc(12, 11, 'INVOICE', { ha: 'center' }); setBorder(12, 11, MD, MD, MD, MD);
    sc(12, 12, '4 point result', { ha: 'center', wrap: true }); setBorder(12, 12, MD, MD, MD, MD);
    sc(12, 13, 'Defected type', { ha: 'center', wrap: true }); setBorder(12, 13, MD, MD, MD, MD);
    sc(12, 14, 'Color result', { ha: 'center', wrap: true }); setBorder(12, 14, MD, MD, MD, MD);

    // ==========================================
    // ROWS 13-22: Document Checklist (10 items)
    // ==========================================
    const docItems = [
      '1.Supplier packing list',
      '2.Supplier invoice',
      '3.Supplier inspection report',
      '4.Supplier & Internal testing report',
      '5.Supplier continuty card',
      '6.Delta-E report',
      '7.Supplier ID Spec',
      '8.Fabric inspection report',
      '9.Color and Weight report',
      '10.Shade run card'
    ];

    for (let i = 0; i < docItems.length; i++) {
      const r = 13 + i;
      ws.getRow(r).height = 35;

      const isFirst = (r === 13);
      const isLast = (r === 22);
      const topB = isFirst ? MD : TH;
      const botB = isLast ? MD : TH;

      // Doc name (A-B merged)
      merge(r, 1, r, 2);
      sc(r, 1, docItems[i]);
      setBorder(r, 1, topB, botB, MD, NO);
      setBorder(r, 2, topB, botB, NO, MD);

      // RECEIVED column (C) - mark "/" for first 2 items
      sc(r, 3, (r === 13 || r === 14) ? '/' : '', { ha: 'center' });
      setBorder(r, 3, topB, botB, MD, MD);

      // PENDING (D), ACCEPTED (E), REJECTED (F)
      for (let c = 4; c <= 6; c++) {
        sc(r, c, '', { ha: 'center' });
        setBorder(r, c, topB, botB, MD, MD);
      }

      // BATCH (H), YARD (I), ROLL (J), INVOICE (K), 4point (L), Defect (M), Color (N)
      for (let c = 8; c <= 14; c++) {
        sc(r, c, '', { ha: 'center' });
        setBorder(r, c, topB, botB, MD, MD);
      }
    }

    // Black fills (E13, F13, E14, F14, E17, F17, E19, F19, E20, F20)
    blackFill(13, 5); blackFill(13, 6);
    blackFill(14, 5); blackFill(14, 6);
    blackFill(17, 5); blackFill(17, 6);
    blackFill(19, 5); blackFill(19, 6);
    blackFill(20, 5); blackFill(20, 6);

    // Fill batch data into H-K columns
    const startIdx = sheetIndex * MAX_ROWS;
    for (let row = 0; row < MAX_ROWS; row++) {
      const batchIdx = startIdx + row;
      if (batchIdx >= totalBatchRows) break;
      const br = batchRows[batchIdx];
      const r = 13 + row;
      sc(r, 8, br.BatchNo, { ha: 'center' });
      sc(r, 9, br.TotalL, { ha: 'center' });
      sc(r, 10, br.TotalRoll, { ha: 'center' });
      sc(r, 11, br.InvoiceNo, { ha: 'center' });
    }

    // ROW 23: spacer
    ws.getRow(23).height = 5;

    // ==========================================
    // ROWS 24-26: Remark
    // ==========================================
    merge(24, 1, 24, 14);
    sc(24, 1, 'Remark :  - Making garment by one fabric roll with one way direction in one garment');
    setBorder(24, 1, NO, TH, NO, NO);

    merge(25, 1, 25, 14);
    sc(25, 1, '                 - Seperate fabric by each roll ( by paper , fabric , run sticker etc )');
    setBorder(25, 1, NO, TH, NO, NO);

    merge(26, 1, 26, 14);
    sc(26, 1, '                 - Correct identify marker code in one garment ( A,B,C,D etc )');
    setBorder(26, 1, NO, TH, NO, NO);

    // ==========================================
    // ROW 27: Summary Accepted/Rejected Qty
    // ==========================================
    sc(27, 1, 'Summary accepted Qty :');
    merge(27, 3, 27, 5); setBorder(27, 3, NO, TH, NO, NO);
    sc(27, 6, 'Summary rejected Qty :');
    for (let c = 7; c <= 10; c++) setBorder(27, c, NO, TH, NO, NO);
    sc(27, 11, 'Directed claim date :');
    for (let c = 12; c <= 14; c++) setBorder(27, c, NO, TH, NO, NO);

    // ROW 28: Replacement
    merge(28, 1, 28, 14);
    sc(28, 1, 'Replacement calculation :');
    setBorder(28, 1, NO, TH, NO, NO);

    // ROW 29: spacer
    ws.getRow(29).height = 5;

    // ==========================================
    // ROW 30: ORDER ALLOCATE DETAILS
    // ==========================================
    merge(30, 1, 30, 14);
    sc(30, 1, 'ORDER ALLOCATE DETAILS', { bold: true });
    setBorder(30, 1, NO, MD, NO, NO);

    // ROW 31: Allocate headers
    sc(31, 1, 'JOB NO#', { ha: 'center' }); setBorder(31, 1, NO, MD, NO, MD);
    sc(31, 2, 'STYLE', { ha: 'center' }); setBorder(31, 2, NO, MD, NO, MD);
    merge(31, 3, 31, 8);
    sc(31, 3, 'POSITION', { ha: 'center' }); setBorder(31, 3, NO, MD, NO, MD);
    sc(31, 9, 'Cons.', { ha: 'center' }); setBorder(31, 9, NO, MD, NO, MD);
    sc(31, 10, 'Allocate Qty (yds)', { ha: 'center', wrap: true }); setBorder(31, 10, NO, MD, NO, MD);
    sc(31, 11, 'Marker QTY(yds)', { ha: 'center', wrap: true }); setBorder(31, 11, NO, MD, NO, MD);
    merge(31, 12, 31, 13);
    sc(31, 12, 'QA Comment', { ha: 'center' }); setBorder(31, 12, NO, MD, NO, MD);
    sc(31, 14, 'Date', { ha: 'center' }); setBorder(31, 14, NO, MD, NO, MD);

    // ROW 32: Allocate data row (empty)
    ws.getRow(32).height = 40;
    for (const c of [1, 2, 9, 14]) { sc(32, c, '', { ha: 'center' }); setBorder(32, c, NO, TH, NO, MD); }
    merge(32, 3, 32, 8); setBorder(32, 3, NO, TH, NO, MD);
    sc(32, 10, '', { ha: 'center', wrap: true }); setBorder(32, 10, NO, TH, NO, MD);
    sc(32, 11, '', { ha: 'center', wrap: true }); setBorder(32, 11, NO, TH, NO, MD);
    merge(32, 12, 32, 13); setBorder(32, 12, NO, TH, NO, MD);

    // ROW 33: spacer
    ws.getRow(33).height = 5;

    // ==========================================
    // ROW 34: INSPECTION RESULT COMMENT
    // ==========================================
    merge(34, 1, 34, 3);
    sc(34, 1, 'INSPECTION RESULT COMMENT :', { bold: true });
    merge(34, 4, 34, 14);
    setBorder(34, 4, NO, TH, NO, NO);

    // ROWS 35-40: Comment lines (empty)
    for (let r = 35; r <= 40; r++) {
      ws.getRow(r).height = 20;
      merge(r, 1, r, 14);
      setBorder(r, 1, NO, TH, NO, NO);
    }

    // ==========================================
    // ROW 42: Issue report by / Receiver (Store)
    // ==========================================
    sc(42, 1, 'Issue report by :');
    merge(42, 2, 42, 4); setBorder(42, 2, NO, TH, NO, NO);
    sc(42, 5, 'Date:', { ha: 'right' });
    merge(42, 6, 42, 8); setBorder(42, 6, NO, TH, NO, NO);
    merge(42, 9, 42, 10); sc(42, 9, 'Receiver (Store) :', { ha: 'right' });
    merge(42, 11, 42, 12); setBorder(42, 11, NO, TH, NO, NO);
    sc(42, 13, 'Date:', { ha: 'right' });
    setBorder(42, 14, NO, TH, NO, NO);

    // ROW 43: Approved by / Receiver (QC)
    sc(43, 1, 'Approved by :');
    merge(43, 2, 43, 4); setBorder(43, 2, NO, TH, NO, NO);
    sc(43, 5, 'Date:', { ha: 'right' });
    merge(43, 6, 43, 8); setBorder(43, 6, NO, TH, NO, NO);
    merge(43, 9, 43, 10); sc(43, 9, 'Receiver (QC) :', { ha: 'right' });
    merge(43, 11, 43, 12); setBorder(43, 11, NO, TH, NO, NO);
    sc(43, 13, 'Date:', { ha: 'right' });
    setBorder(43, 14, NO, TH, NO, NO);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const fname = `InspectionReport_${headerObj.InvoiceNo || 'Report'}_${Date.now()}.xlsx`;
  saveAs(new Blob([buffer]), fname);
};
