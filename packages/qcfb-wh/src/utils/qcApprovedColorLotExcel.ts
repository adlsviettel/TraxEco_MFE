import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

type TFunc = (key: string, fallback: string) => string;

/**
 * Export "Approved Color / Batch + Weight" sheet
 * Mirrors WinForm Form11 button2_Click logic
 */
export const generateApprovedColorLotExcel = async (detailData: any, selectedRow: any, t?: TFunc) => {
  const workbook = new ExcelJS.Workbook();
  const _t = t || ((_k: string, fb: string) => fb);
  const headerObj = detailData.header?.[0] || selectedRow;
  const perInsObj = detailData.percentInspected?.[0] || {};
  const summaryObj = detailData.summary?.[0] || {};
  const allRolls: any[] = detailData.rolls || [];

  // Batch grouping from rolls
  const batchMap: Record<string, { totalRoll: number; totalL: number }> = {};
  for (const roll of allRolls) {
    const batch = roll.BatchNo || 'N/A';
    if (!batchMap[batch]) batchMap[batch] = { totalRoll: 0, totalL: 0 };
    batchMap[batch].totalRoll++;
    batchMap[batch].totalL += parseFloat(roll.ShipLength || '0') || 0;
  }
  const batches = Object.entries(batchMap);

  const PAGE_SIZE = 5;
  const numPages = Math.ceil(batches.length / PAGE_SIZE) || 1;

  for (let page = 0; page < numPages; page++) {
    const ws = workbook.addWorksheet(`ApprovedColorLot_${page + 1}`, {
      pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 1,
        margins: { left: 0.2, right: 0.2, top: 0.2, bottom: 0.2, header: 0, footer: 0 } }
    });

    const TB: Partial<ExcelJS.Borders> = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

    function borders(r1: number, c1: number, r2: number, c2: number) {
      for (let r = r1; r <= r2; r++)
        for (let c = c1; c <= c2; c++)
          ws.getCell(r, c).border = TB as ExcelJS.Borders;
    }

    function sc(r: number, c: number, v: any, ha?: string, bold?: boolean, sz?: number) {
      const cell = ws.getCell(r, c);
      cell.value = v;
      cell.font = { name: 'Times New Roman', size: sz || 11, bold: !!bold };
      cell.alignment = { vertical: 'middle', horizontal: (ha || 'left') as any, wrapText: true };
      return cell;
    }

    function merge(r1: number, c1: number, r2: number, c2: number) { try { ws.mergeCells(r1, c1, r2, c2); } catch (_e) { } }

    // Column widths
    ws.getColumn(1).width = 23;
    ws.getColumn(2).width = 17;
    ws.getColumn(3).width = 10;
    ws.getColumn(4).width = 12;
    ws.getColumn(5).width = 18;
    ws.getColumn(6).width = 18;
    ws.getColumn(7).width = 15;
    ws.getColumn(8).width = 6;
    ws.getColumn(9).width = 6;
    ws.getColumn(10).width = 30;
    ws.getColumn(11).width = 26;
    ws.getColumn(12).width = 17;
    ws.getColumn(13).width = 35;
    ws.getColumn(14).width = 16;

    // Row 1: Title
    ws.getRow(1).height = 45;
    merge(1, 1, 1, 14);
    sc(1, 1, 'FABRIC ORDER:  TRAX  INTERTRADE ( STORE QA.  )', 'center', true, 14);
    borders(1, 1, 1, 14);

    // Row 2: Subtitle
    ws.getRow(2).height = 45;
    merge(2, 1, 2, 14);
    sc(2, 1, `${_t('qcApproved.subtitle', 'APPROVED  COLOR / BATCH  +  Weight Report')}`, 'center', true, 12);
    borders(2, 1, 2, 14);

    // Row 3: JOB/PO, STYLE, CUSTOMER, SEASON, APPROVED LOT
    ws.getRow(3).height = 35;
    sc(3, 1, 'JOB/PO:', 'center', true);
    merge(3, 2, 3, 3); sc(3, 2, headerObj.OrderNumber || '', 'center', false);
    sc(3, 4, 'STYLE:', 'center', true);
    sc(3, 5, perInsObj.ProductName || '', 'center', false);
    sc(3, 6, 'CUSTOMER:', 'center', true);
    merge(3, 7, 3, 8);
    sc(3, 9, '', 'center', false);
    sc(3, 10, 'SEASON:', 'center', true);
    sc(3, 11, '', 'center', false);
    sc(3, 12, '', 'center', false);
    sc(3, 13, 'APPROVED LOT:', 'center', true);
    sc(3, 14, '', 'center', false);
    borders(3, 1, 3, 14);

    // Row 4: SUPPLIER, Weight standard
    ws.getRow(4).height = 35;
    sc(4, 1, 'SUPPLIER', 'center', true);
    merge(4, 2, 4, 5); sc(4, 2, headerObj.SupCode || '', 'center', false);
    merge(4, 6, 4, 7); sc(4, 6, `${_t('qcApproved.weightStd', 'Weight Standard')}`, 'center', true);
    merge(4, 8, 4, 9); sc(4, 8, perInsObj.GM2 || '', 'center', false);
    sc(4, 10, 'gm/m²', 'center', true);
    sc(4, 11, 'GM/M2', 'center', true);
    sc(4, 12, '', 'center', false);
    sc(4, 13, `${_t('qcApproved.fabricWidth', 'Fabric Width Standard')}`, 'center', true);
    sc(4, 14, headerObj.Width || perInsObj.Width || '', 'center', false);
    borders(4, 1, 4, 14);

    // Row 5: ITEM
    ws.getRow(5).height = 35;
    sc(5, 1, 'ITEM', 'center', true);
    merge(5, 2, 5, 5); sc(5, 2, headerObj.RollItem || '', 'center', false);
    merge(5, 6, 5, 7); sc(5, 6, `${_t('qcApproved.cutPosition', 'Cut Position')}`, 'center', true);
    merge(5, 8, 5, 10); sc(5, 8, '', 'center', false);
    sc(5, 11, 'GM/2', 'center', true);
    sc(5, 12, 'ROLL', 'center', true);
    sc(5, 13, `${_t('qcApproved.leftCenterRight', 'Left / Center / Right')}`, 'center', true);
    sc(5, 14, '', 'center', false);
    borders(5, 1, 5, 14);

    // Row 6: COLOR
    ws.getRow(6).height = 60;
    sc(6, 1, 'COLOR', 'center', true);
    merge(6, 2, 6, 5); sc(6, 2, headerObj.Color || '', 'center', false);
    merge(6, 6, 6, 7); sc(6, 6, `${_t('qcApproved.weightOrder', 'Weight Order')}`, 'center', true);
    sc(6, 8, 'B.', 'center', true);
    merge(6, 9, 6, 10); sc(6, 9, '', 'center', false);
    sc(6, 11, 'GM', 'center', true);
    sc(6, 12, '', 'center', false);
    sc(6, 13, '', 'center', false);
    sc(6, 14, 'YDS', 'center', true);
    borders(6, 1, 6, 14);

    // Row 7: Description
    ws.getRow(7).height = 60;
    sc(7, 1, 'Description', 'center', true);
    merge(7, 2, 7, 5); sc(7, 2, perInsObj.ProductName || '', 'center', false);
    sc(7, 6, '', 'center', false);
    sc(7, 7, '', 'center', false);
    sc(7, 8, 'B.', 'center', true);
    merge(7, 9, 7, 10); sc(7, 9, '', 'center', false);
    sc(7, 11, 'GM', 'center', true);
    sc(7, 12, '', 'center', false);
    sc(7, 13, '', 'center', false);
    sc(7, 14, 'YDS', 'center', true);
    borders(7, 1, 7, 14);

    // Row 8: Order Qty
    ws.getRow(8).height = 60;
    sc(8, 1, `Order\nQty`, 'center', true);
    merge(8, 2, 8, 5); sc(8, 2, summaryObj.TotalL || '', 'center', false);
    sc(8, 6, 'YDS', 'center', true);
    sc(8, 7, '', 'center', false);
    sc(8, 8, 'B.', 'center', true);
    merge(8, 9, 8, 10); sc(8, 9, '', 'center', false);
    sc(8, 11, 'GM', 'center', true);
    sc(8, 12, '', 'center', false);
    sc(8, 13, '', 'center', false);
    sc(8, 14, 'YDS', 'center', true);
    borders(8, 1, 8, 14);

    // Row 9: Receive date
    ws.getRow(9).height = 60;
    sc(9, 1, `Receive date\n(mm/dd/yyyy)`, 'center', true);
    merge(9, 2, 9, 5); sc(9, 2, headerObj.RecoredDate || '', 'center', false);
    sc(9, 6, '', 'center', false);
    sc(9, 7, '', 'center', false);
    sc(9, 8, 'B.', 'center', true);
    merge(9, 9, 9, 10); sc(9, 9, '', 'center', false);
    sc(9, 11, 'GM', 'center', true);
    sc(9, 12, '', 'center', false);
    sc(9, 13, '', 'center', false);
    sc(9, 14, 'YDS', 'center', true);
    borders(9, 1, 9, 14);

    // Row 10: FOC
    ws.getRow(10).height = 60;
    sc(10, 1, 'FOC', 'center', true);
    merge(10, 2, 10, 5); sc(10, 2, '', 'center', false);
    sc(10, 6, '', 'center', false);
    sc(10, 7, '', 'center', false);
    sc(10, 8, 'B.', 'center', true);
    merge(10, 9, 10, 10); sc(10, 9, '', 'center', false);
    sc(10, 11, 'GM', 'center', true);
    sc(10, 12, '', 'center', false);
    sc(10, 13, '', 'center', false);
    sc(10, 14, 'YDS', 'center', true);
    borders(10, 1, 10, 14);

    // Rows 11-14: .MATCH. rows
    for (let i = 11; i <= 14; i++) {
      ws.getRow(i).height = 35;
      merge(i, 11, i, 14);
      sc(i, 11, '.MATCH.', 'left', true);
      borders(i, 11, i, 14);
    }

    // Fill batch data (rows 6-10, columns 9-10 area)
    const pageBatches = batches.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
    pageBatches.forEach(([batch, info], idx) => {
      const row = 6 + idx;
      if (row <= 10) {
        merge(row, 9, row, 10);
        sc(row, 9, batch, 'center', false);
        sc(row, 12, String(info.totalRoll), 'center', false);
        sc(row, 13, String(Math.round(info.totalL)), 'center', false);
      }
    });

    // Row 45: REMARK
    ws.getRow(45).height = 60;
    sc(45, 1, 'REMARK:', 'center', true);
    merge(45, 2, 45, 14);
    const remarkCell = sc(45, 2, `- Making garment by one fabric roll with one way direction in one garment\n- Seperate fabric by each roll ( by paper , fabric , run sticker etc )\n- Correct identify marker code in one garment ( A,B,C,D  etc)`, 'left', true, 10);
    remarkCell.font = { ...remarkCell.font!, color: { argb: 'FFFF0000' } };
    borders(45, 1, 45, 14);

    // Row 46: Preparer info
    ws.getRow(46).height = 35;
    merge(46, 1, 46, 14);
    sc(46, 1, `${_t('qcApproved.preparer', 'Prepared by ( STORE )')} ___________  ${_t('qcApproved.docDate', 'Document Date')} ________`, 'center', true, 10);
    borders(46, 1, 46, 14);

    // Row 47-48: Weight tolerance
    merge(47, 1, 48, 14);
    sc(47, 1, `${_t('qcApproved.weightTolerance', 'Weight tolerance +/- 5%')}`, 'center', true, 10);
    borders(47, 1, 48, 14);

    // Row 49: APPROVED / REJECTED
    ws.getRow(49).height = 33;
    sc(49, 1, `Q.A Fabric Sup…………`, 'left', true);
    sc(49, 3, '', 'center', false);
    merge(49, 4, 49, 5); sc(49, 4, 'APPROVED', 'center', true);
    sc(49, 6, 'BATCH', 'center', true);
    sc(49, 10, 'REJECTED', 'center', true);
    sc(49, 11, 'BATCH', 'center', true);
    borders(49, 1, 49, 14);

    // Row 50: Q.A.Manager
    ws.getRow(50).height = 33;
    sc(50, 1, `Q.A.Manager…………`, 'left', true);
    sc(50, 3, '', 'center', false);
    merge(50, 4, 50, 5); sc(50, 4, 'APPROVED', 'center', true);
    sc(50, 6, 'BATCH', 'center', true);
    sc(50, 10, 'REJECTED', 'center', true);
    sc(50, 11, 'BATCH', 'center', true);
    borders(50, 1, 50, 14);

    // Row 52: Footer
    ws.getRow(52).height = 23;
    sc(52, 1, 'FW-QFB-08-02-00', 'center', true);
    sc(52, 11, 'UPDATED:', 'right', true);
    sc(52, 13, new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }), 'center', true);
    borders(52, 1, 52, 14);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const fname = `ApprovedColorLot_${headerObj.OrderNumber || 'Export'}_${Date.now()}.xlsx`;
  saveAs(new Blob([buffer]), fname);
};
