import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

// t is optional — if not provided, fallback to English default
type TFunc = (key: string, fallback: string) => string;

export const generateQCSummaryExcel = async (detailData: any, selectedRow: any, t?: TFunc) => {
  const workbook = new ExcelJS.Workbook();
  const headerObj = detailData.header?.[0] || selectedRow;
  const perInsObj = detailData.percentInspected?.[0] || {};
  const allRolls: any[] = detailData.rolls || [];
  const _t = t || ((_k: string, fb: string) => fb);

  const PAGE_SIZE = 15;
  const numPages = Math.ceil(allRolls.length / PAGE_SIZE) || 1;

  for (let page = 0; page < numPages; page++) {
    const ws = workbook.addWorksheet(`Page ${page + 1}`, {
      pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 1,
        margins: { left: 0.2, right: 0.2, top: 0.2, bottom: 0.2, header: 0, footer: 0 } }
    });

    ws.getColumn(1).width = 5;
    ws.getColumn(2).width = 32;
    for (let i = 3; i <= 17; i++) ws.getColumn(i).width = 6.5;

    const TB: Partial<ExcelJS.Borders> = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

    function borders(r1: number, c1: number, r2: number, c2: number) {
      for (let r = r1; r <= r2; r++)
        for (let c = c1; c <= c2; c++)
          ws.getCell(r, c).border = TB as ExcelJS.Borders;
    }

    function outerThick(r1: number, c1: number, r2: number, c2: number) {
      for (let c = c1; c <= c2; c++) {
        const tp = ws.getCell(r1, c); tp.border = { ...tp.border, top: { style: 'medium' } };
        const bt = ws.getCell(r2, c); bt.border = { ...bt.border, bottom: { style: 'medium' } };
      }
      for (let r = r1; r <= r2; r++) {
        const l = ws.getCell(r, c1); l.border = { ...l.border, left: { style: 'medium' } };
        const ri = ws.getCell(r, c2); ri.border = { ...ri.border, right: { style: 'medium' } };
      }
    }

    function sc(r: number, c: number, v: any, ha?: string, bold?: boolean, sz?: number) {
      const cell = ws.getCell(r, c);
      cell.value = v;
      cell.font = { name: 'Times New Roman', size: sz || 10, bold: !!bold };
      cell.alignment = { vertical: 'middle', horizontal: (ha || 'left') as any, wrapText: true };
      return cell;
    }

    function merge(r1: number, c1: number, r2: number, c2: number) { try { ws.mergeCells(r1, c1, r2, c2); } catch (_e) { } }

    const pageRolls = allRolls.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

    // ===== ROW 1: Title =====
    ws.getRow(1).height = 22;
    merge(1, 1, 1, 17);
    sc(1, 1, 'FABRIC QUALITY TEST REPORT INSSUED FOR ALLIANCE ONE GARMENT (STORE QA)', 'center', true, 12);
    borders(1, 1, 1, 17); outerThick(1, 1, 1, 17);

    // ===== ROW 2 =====
    ws.getRow(2).height = 18;
    merge(2, 1, 2, 12);
    sc(2, 1, `   FOUR POINT SYSTEM ( 100 yards / 20 points) ( ${_t('qcReport.fourPointSystem', 'Hệ Thống 4 điểm')})`, 'center', true, 10);
    merge(2, 13, 2, 17);
    sc(2, 13, `DATE ( ${_t('qcReport.date', 'ngày')} ): ${headerObj.RecoredDate || ''}`, 'right', false, 10);
    borders(2, 1, 2, 17);

    // ===== ROW 3 =====
    ws.getRow(3).height = 18;
    merge(3, 1, 3, 3); sc(3, 1, `P/O (${_t('qcReport.po', 'đơn hàng')}): ${headerObj.OrderNumber || ''}`, 'left', true, 10);
    merge(3, 4, 3, 6); sc(3, 4, `STYLE (${_t('qcReport.style', 'mã hàng')}): ${perInsObj.ProductName || ''}`, 'left', true, 10);
    merge(3, 7, 3, 9); sc(3, 7, `ITEM: ${headerObj.RollItem || ''}`, 'left', true, 10);
    merge(3, 10, 3, 14); sc(3, 10, `COLOR (${_t('qcReport.color', 'màu')}): ${headerObj.Color || ''}`, 'left', true, 10);
    merge(3, 15, 3, 17); sc(3, 15, 'CUSTOMER:ADIDAS', 'left', true, 10);
    borders(3, 1, 3, 17);

    // ===== ROW 4 =====
    ws.getRow(4).height = 18;
    merge(4, 1, 4, 3); sc(4, 1, `Vendor (${_t('qcReport.vendor', 'nhà cung cấp')}): ${headerObj.SupCode || ''}`, 'left', true, 10);
    merge(4, 4, 4, 6); sc(4, 4, '☐  Shell', 'center', true, 10);
    merge(4, 7, 4, 9); sc(4, 7, '☐  Lining', 'center', true, 10);
    merge(4, 10, 4, 12); sc(4, 10, '☐  Trimming', 'center', true, 10);
    merge(4, 13, 4, 17); sc(4, 13, `4 POINT SYSTEM (${_t('qcReport.fourPointShort', 'hệ thống 4 điểm')})`, 'center', true, 10);
    borders(4, 1, 4, 17); outerThick(3, 1, 4, 17);

    // ===== ROW 5: Header =====
    ws.getRow(5).height = 18;
    merge(5, 2, 5, 17);
    sc(5, 2, `CAUSES OF DEFECTS ( ${_t('qcReport.causeOfDefects', 'tính lỗi')} )`, 'left', true, 10);
    borders(5, 1, 5, 17);

    // ===== DEFECTS WITHOUT POINTS =====
    const defWithout = [
      `From Woven Fabric\n(${_t('qcReport.df.woven', 'từ vải woven')})`,
      `From Dyed Fabric\n(${_t('qcReport.df.dyed', 'từ vải nhuộm')})`,
      `From Bake/Decorated Fabric\n(${_t('qcReport.df.decorated', 'từ mẻ nhuộm / vải trang trí')})`,
      `Barred, Needle Lines, Pilling\n(${_t('qcReport.df.barred', 'sọc ngang lỗ kim')})`,
      `Color Match, Shading W/N Roll, Wrinkled\n(${_t('qcReport.df.colorMatch', 'gần giống màu, khác màu trong cây, nhăn')})`,
      `Hand Feel, Bowing/Biased/Torque, Poor Coating, Wavy/Tight\n(${_t('qcReport.df.handFeel', 'độ mềm, độ xéo, độ co, xếp nếp, nhăn, rút')})`,
      `Center Line, Thick & Thin\n(${_t('qcReport.df.centerLine', 'sọc giữa, dày mỏng')})`,
      `Registration, Uneven Dye, Dye Streaks,Water Mark\n(${_t('qcReport.df.unevenDye', 'nhuộm không đều, gấp nếp')})`,
      `Poor Selvage, Uneven Face Side\n(${_t('qcReport.df.poorSelvage', 'vaỉ bị tưa, bề mặt không đều')})`
    ];
    let r = 6;
    const dwpS = r;
    for (const d of defWithout) { ws.getRow(r).height = 24; sc(r, 2, d, 'left', true, 9); r++; }
    const dwpE = r - 1;
    borders(dwpS, 1, dwpE, 17);
    merge(dwpS, 1, dwpE, 1);
    const vt1 = sc(dwpS, 1, `Defects Without Points\n(${_t('qcReport.defWithoutPoints', 'lỗi không tính điểm')})`, 'center', true, 9);
    vt1.alignment = { textRotation: 90, horizontal: 'center', vertical: 'middle', wrapText: true };
    outerThick(5, 1, dwpE, 17);

    // ===== DEFECTS WITH POINTS =====
    const defWith = [
      `UNEVEN YARNS\n(${_t('qcReport.dp.unevenYarns', 'sợi không đều')})`,
      `HOLES\n(${_t('qcReport.dp.holes', 'lủng lỗ')})`,
      `STOP MARK/WRINKLES\n(${_t('qcReport.dp.stopMark', 'nhăn không thể ủi thẳng')})`,
      `DOUBLE YARNS\n(${_t('qcReport.dp.doubleYarns', '2 lớp sợi')})`,
      `KNOTS/SLUB\n(${_t('qcReport.dp.knots', 'gút')})`,
      `BROKEN YARNS\n(${_t('qcReport.dp.brokenYarns', 'đứt sợi dệt')})`,
      `BROKEN NEEDLES\n(${_t('qcReport.dp.brokenNeedles', 'lỗ kim')})`,
      `EXTRANEOUS FIBRE\n(${_t('qcReport.dp.fibre', 'sợi lạ')})`,
      `STAINED:Oil, Bateria, Etc.\n(${_t('qcReport.dp.stained', 'dầu dơ')})`,
      `JOINT PLACE\n(${_t('qcReport.dp.joint', 'có mối nối')})`,
      `ABRASION/SNAG\n(${_t('qcReport.dp.abrasion', 'xước')})`
    ];
    const dwS = r;
    for (const d of defWith) { ws.getRow(r).height = 24; sc(r, 2, d, 'left', true, 9); r++; }
    const dwE = r - 1;
    borders(dwS, 1, dwE, 17);
    merge(dwS, 1, dwE, 1);
    const vt2 = sc(dwS, 1, `Defects With Points\n(${_t('qcReport.defWithPoints', 'lỗi tính điểm')})`, 'center', true, 9);
    vt2.alignment = { textRotation: 90, horizontal: 'center', vertical: 'middle', wrapText: true };
    outerThick(dwS, 1, dwE, 17);

    // ===== ROLL/MEASUREMENT FIELDS =====
    const rollFields = [
      `ROLL NO. OF VENDOR\n(${_t('qcReport.rf.rollVendor', 'số cuộn của nhà cung cấp')})`,
      `ROLL NO. OF INSPECTION\n(${_t('qcReport.rf.rollInspt', 'số cuộn nhà máy kiểm tra')})`,
      `BATCH NO.\n(${_t('qcReport.rf.batch', 'số BATCH')}):`,
      `ODERED WIDTH-INCH\n(${_t('qcReport.rf.orderedWidth', 'khổ vải nhà máy đặt')})`,
      `USEABLE WIDTH(Hole-Hole)\n(${_t('qcReport.rf.useableWidth', 'khổ vải có thể sử dụng')})`,
      `Width after Stream Relax(Hole-Hole)\n(${_t('qcReport.rf.relaxWidth', 'khổ vải sau khi xả-- (lổ đến lổ)')})`,
      `Actual Width Face Side ( Edge-Edge)\n(${_t('qcReport.rf.actualWidth', 'khổ vải thực tế --(mép đến mép)')})`,
      `TICKETED YARDS\n(${_t('qcReport.rf.ticketedYds', 'số ya trên phiếu')})`,
      `ACTUAL YARDS\n(${_t('qcReport.rf.actualYds', 'số ya thực tế')})`,
      `TICKETED WEIGHT\n(${_t('qcReport.rf.ticketedWt', 'cân nặng trên phiếu')}) (net weight)`,
      `ACTUAL WEIGHT\n(${_t('qcReport.rf.actualWt', 'trọng lượng thực tế')})`,
      `SCORED RE-INSPECTION\n(${_t('qcReport.rf.scored', 'Số điểm kiểm lại')})`,
      `INSPECTION RESULT\n(${_t('qcReport.rf.result', 'kết quả kiềm')})`,
      `COLOR TONE GROUP\n(${_t('qcReport.rf.colorTone', 'nhóm màu')})`,
      `SHADING LEFT/RIGHT ……… Inch\n(${_t('qcReport.rf.shading', 'khác màu bên trái/ phải')})`
    ];
    const rfS = r;
    for (const f of rollFields) { ws.getRow(r).height = 24; merge(r, 1, r, 2); sc(r, 1, f, 'left', true, 9); r++; }
    const rfE = r - 1;
    borders(rfS, 1, rfE, 17); outerThick(rfS, 1, rfE, 17);

    const ROW_ROLL_VENDOR = rfS;
    const ROW_ROLL_INSPT  = rfS + 1;
    const ROW_BATCH       = rfS + 2;
    const ROW_ORD_WIDTH   = rfS + 3;
    const ROW_USE_WIDTH   = rfS + 4;
    const ROW_RELAX_WIDTH = rfS + 5;
    const ROW_ACTUAL_W    = rfS + 6;
    const ROW_TICK_YDS    = rfS + 7;
    const ROW_ACT_YDS     = rfS + 8;
    const ROW_TICK_WEIGHT = rfS + 9;
    const ROW_ACT_WEIGHT  = rfS + 10;
    const ROW_SCORED      = rfS + 11;
    const ROW_RESULT      = rfS + 12;
    const ROW_COLOR_TONE  = rfS + 13;

    // ===== POINTS SECTION =====
    const pointFields = [
      `Point 1 (point 1/4) (${_t('qcReport.pt.p1', '1 điểm')})`,
      `Point 2 (point 2/4) (${_t('qcReport.pt.p2', '2 điểm')})`,
      `Point 3 (point 3/4) (${_t('qcReport.pt.p3', '3 điểm')})`,
      `Point 4 (point 4/4) (${_t('qcReport.pt.p4', '4 điểm')})`,
      `Horizontal Streak Line Per Roll\n(${_t('qcReport.pt.horizontal', 'khổ ngang của vải')})`,
      `Length of Streaked Line\n( L/R)…………Inch (${_t('qcReport.pt.length', 'khổ dọc của vải')})`,
      `TOTAL POINTS\n(${_t('qcReport.pt.total', 'tổng số điểm')})`,
      `POINT AVERAGE 100 YDS/20 POINT\n(${_t('qcReport.pt.average', 'điểm trung bình 100yds/20 điểm')})`,
      `DEFECTED LENGTH ( YARDS)\n(${_t('qcReport.pt.defectedLen', 'chiều dài lỗi')})`
    ];
    const pfS = r;
    for (const p of pointFields) { ws.getRow(r).height = 22; merge(r, 1, r, 2); sc(r, 1, p, 'left', true, 9); r++; }
    const pfE = r - 1;
    borders(pfS, 1, pfE, 17); outerThick(pfS, 1, pfE, 17);

    // ===== FOOTER =====
    const fsS = r;

    ws.getRow(r).height = 20;
    merge(r, 1, r, 5); sc(r, 1, `RANDOM INSPECTION %\n(${_t('qcReport.ft.randomInspt', '% kiểm ngẫu nhiên')})`, 'left', true, 9);
    merge(r, 6, r, 9); sc(r, 6, `ROLL (${_t('qcReport.ft.roll', 'cuộn')})`, 'center', true, 9);
    merge(r, 10, r, 13); sc(r, 10, 'YDS (yds)', 'center', true, 9);
    merge(r, 14, r + 1, 17); sc(r, 14, `EXAMPLE FABRIC\n(${_t('qcReport.ft.exampleFabric', 'vải mẫu')})`, 'center', true, 9);
    borders(r, 1, r, 17); r++;

    ws.getRow(r).height = 20;
    merge(r, 1, r, 5); sc(r, 1, `INSPECTION MACHINE NO.\n(${_t('qcReport.ft.machineNo', 'máy kiểm vải số')})`, 'left', true, 9);
    merge(r, 6, r, 13); sc(r, 6, `INSPECTION RESULT (${_t('qcReport.ft.insptResult', 'kết quả kiểm vải')})`, 'center', true, 9);
    borders(r, 1, r, 17); r++;

    ws.getRow(r).height = 20;
    merge(r, 1, r, 5); sc(r, 1, `INSPECTOR\n(${_t('qcReport.ft.inspector', 'người kiểm')})`, 'left', true, 9);
    merge(r, 6, r, 9); sc(r, 6, `FAIL (${_t('qcReport.ft.fail', 'không đạt')})`, 'center', true, 9);
    merge(r, 10, r, 13); sc(r, 10, `USE (${_t('qcReport.ft.use', 'sử dụng')})`, 'center', true, 9);
    borders(r, 1, r, 17); r++;

    ws.getRow(r).height = 20;
    merge(r, 1, r, 5); sc(r, 1, `REMARK\n(${_t('qcReport.ft.remark', 'ghi chú')})`, 'left', true, 9);
    merge(r, 6, r, 9);
    merge(r, 10, r, 13); sc(r, 10, `DISUSE\n(${_t('qcReport.ft.disuse', 'không sử dụng')})`, 'center', true, 9);
    borders(r, 1, r, 17); r++;

    ws.getRow(r).height = 18;
    merge(r, 1, r, 17); sc(r, 1, `LOT NO  (${_t('qcReport.ft.lotNo', 'số đợt vải về')}) :`, 'left', true, 9);
    borders(r, 1, r, 17); r++;

    ws.getRow(r).height = 18;
    merge(r, 1, r, 17); sc(r, 1, 'FOUR POINT STYSTEM NIKE / OTHER CUSTOMERS   100 YDS / 20 POINTS', 'center', true, 9);
    borders(r, 1, r, 17); r++;

    ws.getRow(r).height = 20;
    merge(r, 1, r, 17);
    sc(r, 1, 'FP-QA-01-02-01  ( Points of Inspection Roll % × Inspection Roll (yds) = Point Average)', 'center', false, 8);
    borders(r, 1, r, 17); r++;

    ws.getRow(r).height = 16;
    merge(r, 1, r, 17); sc(r, 1, `PAGE: ${page + 1}`, 'right', true, 9);
    borders(r, 1, r, 17);
    outerThick(fsS, 1, r, 17);

    // ===== FILL DATA =====
    const DEFECT_MAP: Record<string, number> = {
      'DF001': 0, 'DF002': 1, 'DF003': 2, 'DF004': 3, 'DF005': 4,
      'DF006': 5, 'DF007': 6, 'DF008': 7, 'DF009': 8, 'DF010': 9, 'DF011': 10,
    };

    const allDefects: any[] = detailData.defects || [];
    const defectsByRoll: Record<string, any[]> = {};
    for (const df of allDefects) {
      const key = df.RollNameID || '';
      if (!defectsByRoll[key]) defectsByRoll[key] = [];
      defectsByRoll[key].push(df);
    }

    pageRolls.forEach((roll: any, i: number) => {
      const c = 3 + i;

      sc(ROW_ROLL_VENDOR, c, roll.RollNo || roll.QrCode || '', 'center', false, 9);
      const wasInspected = roll.InsptReslt || roll.InsptLenght || roll.InsptReltPer;
      sc(ROW_ROLL_INSPT, c, wasInspected ? (roll.RollNo || roll.QrCode || '') : '', 'center', false, 9);
      sc(ROW_BATCH, c, roll.BatchNo || '', 'center', false, 9);
      sc(ROW_ORD_WIDTH, c, roll.Width || '', 'center', false, 9);
      sc(ROW_USE_WIDTH, c, roll.InsptWidthB || '', 'center', false, 9);
      sc(ROW_RELAX_WIDTH, c, '', 'center', false, 9);
      sc(ROW_ACTUAL_W, c, roll.InsptWidthM || '', 'center', false, 9);
      sc(ROW_TICK_YDS, c, roll.ShipLength || '', 'center', false, 9);
      sc(ROW_ACT_YDS, c, roll.InsptLenght || '', 'center', false, 9);
      sc(ROW_TICK_WEIGHT, c, roll.GW || '', 'center', false, 9);
      sc(ROW_ACT_WEIGHT, c, roll.InsptWeight || '', 'center', false, 9);
      sc(ROW_SCORED, c, roll.InsptReltPer || '', 'center', false, 9);
      sc(ROW_RESULT, c, roll.InsptReslt || '', 'center', true, 9);
      sc(ROW_COLOR_TONE, c, '', 'center', false, 9);

      // Defects
      const qrCode = roll.QrCode || '';
      const rollDefects = defectsByRoll[qrCode] || [];
      for (const df of rollDefects) {
        const code = (df.DefectCode || '').trim().toUpperCase();
        if (DEFECT_MAP[code] !== undefined) {
          const targetRow = dwS + DEFECT_MAP[code];
          const point = df.DefectPoint ?? '';
          const qty = df.QtyDefect ?? '';
          sc(targetRow, c, `${point}/${qty}`, 'center', false, 9);
        }
      }

      // Point 1-4
      const pointCounts = [0, 0, 0, 0];
      let totalPoints = 0;
      for (const df of rollDefects) {
        const pt = Number(df.DefectPoint) || 0;
        const qty = Number(df.QtyDefect) || 0;
        if (pt >= 1 && pt <= 4) pointCounts[pt - 1] += qty;
        totalPoints += pt * qty;
      }
      for (let p = 0; p < 4; p++) sc(pfS + p, c, pointCounts[p] || '', 'center', false, 9);
      sc(pfS + 6, c, totalPoints || '', 'center', true, 9);
      sc(pfS + 7, c, roll.InsptReltPer || '', 'center', false, 9);
      sc(pfS + 4, c, roll.CicleHorizontal || '', 'center', false, 9);
      sc(pfS + 5, c, roll.CicleVertical || '', 'center', false, 9);
    });

    // Footer data
    const pi = detailData.percentInspected?.[0];
    if (pi) {
      sc(fsS, 1, `RANDOM INSPECTION %\n(${_t('qcReport.ft.randomInspt', '% kiểm ngẫu nhiên')}): ${pi.PerIns || ''}%`, 'left', true, 9);
      sc(fsS, 6, pi.RollIns || '', 'center', true, 9);
      sc(fsS, 10, pi.LIns || '', 'center', true, 9);
    }
    if (headerObj.CreatedBy) sc(fsS + 2, 6, headerObj.CreatedBy, 'center', false, 9);
    const summaryObj = detailData.summary?.[0];
    if (summaryObj) sc(fsS + 4, 1, `LOT NO  (${_t('qcReport.ft.lotNo', 'số đợt vải về')}) : ${summaryObj.BatchNo || ''}`, 'left', true, 9);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const fname = `QCReport_${headerObj.InvoiceNo || 'Report'}_${Date.now()}.xlsx`;
  saveAs(new Blob([buffer]), fname);
};
