const ExcelJS = require('exceljs');
const path = require('path');

async function createTemplate() {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Report', {
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 1, margins: {left:0.25, right:0.25, top:0.25, bottom:0.25, header:0, footer:0} }
  });

  const cols = [
    { width: 4.5 },   // A: vertical text group
    { width: 36 }     // B: Field Label
  ];
  for (let i = 0; i < 15; i++) cols.push({ width: 6.5 }); // C-Q: 15 Rolls
  ws.columns = cols;

  const thin = {style:'thin'}; const noborder = undefined;
  const gridBorder = { top: thin, left: thin, bottom: thin, right: thin };

  const setCell = (r, c, val, align='left', bold=false, sz=10) => {
    const cell = ws.getCell(r, c);
    cell.value = val;
    cell.alignment = { vertical: 'middle', horizontal: align, wrapText: true };
    cell.font = { name: 'Times New Roman', size: sz, bold };
    return cell;
  };

  // Header rows
  ws.getRow(1).height = 25;
  ws.mergeCells('A1:Q1');
  setCell(1, 1, 'FABRIC QUALITY TEST REPORT INSSUED FOR ALLIANCE ONE GARMENT (STORE QA)', 'center', true, 14);

  ws.getRow(2).height = 20;
  ws.mergeCells('A2:L2');
  setCell(2, 1, 'FOUR POINT SYSTEM ( 100 yards / 20 points) ( Hệ Thống 4 điểm)', 'center', true, 11);
  ws.mergeCells('M2:Q2');
  setCell(2, 13, 'DATE ( ngày ): …………………………', 'right', false, 11);

  ws.getRow(3).height = 25;
  try{ ws.mergeCells('A3:C3'); }catch(e){}
  setCell(3, 1, 'P/O (đơn hàng ):', 'left', true, 10);
  try{ ws.mergeCells('D3:H3'); }catch(e){}
  setCell(3, 4, 'STYLE ( mã hàng ):', 'left', true, 10);
  try{ ws.mergeCells('I3:L3'); }catch(e){}
  setCell(3, 9, 'ITEM:', 'left', true, 10);
  try{ ws.mergeCells('M3:Q3'); }catch(e){}
  setCell(3, 13, 'COLOR (màu):', 'left', true, 10);

  ws.getRow(4).height = 25;
  try{ ws.mergeCells('A4:D4'); }catch(e){}
  setCell(4, 1, 'CUSTOMER: ADIDAS', 'left', true, 10);
  try{ ws.mergeCells('E4:H4'); }catch(e){}
  setCell(4, 5, 'Vendor (nhà cung cấp):', 'left', true, 10);
  try{ ws.mergeCells('I4:P4'); }catch(e){}
  setCell(4, 9, '[  ] Shell     [  ] Lining     [  ] Trimming', 'center', true, 10);

  // Table Starts
  let r = 5;
  ws.getRow(r).height = 25;
  try{ ws.mergeCells(`A${r}:B${r}`); }catch(e){}
  setCell(r, 1, 'CAUSES OF DEFECTS ( tính lỗi )', 'left', true, 11).border = gridBorder;
  ws.getCell(r, 2).border = gridBorder;
  for(let i=0; i<15; i++) {
    setCell(r, 3+i, '').border = gridBorder;
  }
  r++;

  const writeRows = (items, height=20) => {
    const startR = r;
    for(let it of items) {
      ws.getRow(r).height = height;
      const cell = setCell(r, 2, it, 'left', true, 9);
      cell.border = gridBorder;
      for(let i=0; i<15; i++) setCell(r, 3+i, '').border = gridBorder;
      r++;
    }
    return [startR, r-1];
  };

  const def1 = [
    'From Woven Fabric (từ vải woven)', 'From Dyed Fabric (từ vải nhuộm)', 'From Bake/Decorated Fabric (từ mẻ nhuộm / vải trang trí)',
    'Barred, Needle Lines, Pilling (sọc ngang lỗ kim)', 'Color Match, Shading W/N Roll, Wrinkled (gần giống màu, khác màu trong cây, nhăn)',
    'Hand Feel, Bowing/Biased/Torque, Poor Coating, Wavy/Tight (độ mềm, độ xéo, độ co, xếp nếp, nhăn, rút)',
    'Center Line, Thick & Thin (sọc giữa, dày mỏng)', 'Registration, Uneven Dye, Dye Streaks,Water Mark (nhuộm không đều , gấp nếp)',
    'Poor Selvage, Uneven Face Side (vaỉ bị tưa, bề mặt không đều)'
  ];
  let [s1, e1] = writeRows(def1, 24);
  ws.mergeCells(s1, 1, e1, 1);
  const c1 = setCell(s1, 1, 'Defects Without Points (lỗi không tính điểm)', 'center', true, 9);
  c1.alignment.textRotation = 90; c1.border = gridBorder;

  const def2 = [
    'UNEVEN YARNS (sợi không đều)', 'DOUBLE YARNS (2 lớp sợi)', 'HOLES (lủng lỗ)', 'KNOTS/SLUB (gút)', 'BROKEN YARNS (đứt sợi dệt)',
    'BROKEN NEEDLES (lỗ kim)', 'EXTRANEOUS FIBRE (sợi lạ)', 'STAINED: Oil, Bateria, Etc. ( dầu dơ)', 'JOINT PLACE (có mối nối)', 'ABRASION/SNAG (xước)'
  ];
  let [s2, e2] = writeRows(def2, 20);
  ws.mergeCells(s2, 1, e2, 1);
  const c2 = setCell(s2, 1, 'Defects With Points (lỗi tính điểm)', 'center', true, 9);
  c2.alignment.textRotation = 90; c2.border = gridBorder;

  const fields = [
    'ROLL NO. OF VENDOR (số cuộn của nhà cung cấp)', 'ROLL NO. OF INSPECTION (số cuộn nhà máy kiểm tra)', 'BATCH NO. ( số BATCH )',
    'ORDERED WIDTH-INCH (khổ vải nhà máy đặt)', 'USEABLE WIDTH(Hole-Hole) (khổ vải có thể sử dụng)', 'Width after Stream Relax(Hole-Hole) (khổ vải sau khi xả-- (lổ đến lổ))',
    'Actual Width Face Side ( Edge-Edge) (khổ vải thực tế --(mép đến mép))', 'TICKETED YARDS (số ya trên phiếu)', 'ACTUAL YARDS (số ya thực tế)',
    'TICKETED WEIGHT (cân nặng trên phiếu) (net weight)', 'ACTUAL WEIGHT (trọng lượng thực tế)', 'SCORED RE-INSPECTION ( Số điểm kiểm lại)',
    'INSPECTION RESULT (kết quả kiềm)', 'COLOR TONE GROUP (nhóm màu)', 'SHADING LEFT/RIGHT ……… Inch (khác màu bên trái/ phải)',
    'Point 1 (point 1/4 ) (1 điểm)', 'Point 2 (point 2/4 ) (2 điểm)', 'Point 3 (point 3/4) (3 điểm)', 'Point 4 ( point 4/4 ) (4 điểm)',
    'Horizontal Streak Line Per Roll (khổ ngang của vải)', 'Length of Streaked Line( L/R)…………Inch (khổ dọc của vải)',
    'TOTAL POINTS (tổng số điểm)', 'POINT AVERAGE 100 YDS/20 POINT (điểm trung bình 100yds/20 điểm)', 'DEFECTED LENGTH ( YARDS) (chiều dài lỗi)'
  ];

  let [s3, e3] = writeRows(fields, 18);
  ws.mergeCells(s3, 1, e3, 1);
  ws.getCell(s3, 1).border = gridBorder;

  // Helper to draw borders over a range
  const addBorders = (startR, startC, endR, endC) => {
    for (let i = startR; i <= endR; i++) {
        for (let j = startC; j <= endC; j++) {
            ws.getCell(i, j).border = gridBorder;
        }
    }
  };

  // Bottom sections
  r++;
  ws.getRow(r).height = 20;
  try{ ws.mergeCells(r, 1, r, 5); }catch(e){}
  setCell(r, 1, 'RANDOM INSPECTION % (% kiểm ngẫu nhiên)', 'left', true, 10);
  try{ ws.mergeCells(r, 6, r+1, 9); }catch(e){}
  setCell(r, 6, 'ROLL (cuộn)', 'center', true, 10);
  try{ ws.mergeCells(r, 10, r+1, 13); }catch(e){}
  setCell(r, 10, 'YDS (yds)', 'center', true, 10);
  try{ ws.mergeCells(r, 14, r+3, 17); }catch(e){}
  setCell(r, 14, 'EXAMPLE FABRIC (vải mẫu)', 'center', true, 10);
  addBorders(r, 1, r, 17);

  r++;
  ws.getRow(r).height = 20;
  try{ ws.mergeCells(r, 1, r, 5); }catch(e){}
  setCell(r, 1, 'INSPECTION MACHINE NO. (máy kiểm vải số)', 'left', true, 10);
  addBorders(r, 1, r, 17);

  r++;
  ws.getRow(r).height = 20;
  try{ ws.mergeCells(r, 1, r, 5); }catch(e){}
  setCell(r, 1, 'INSPECTOR (người kiểm)', 'left', true, 10);
  try{ ws.mergeCells(r, 6, r, 13); }catch(e){}
  setCell(r, 6, 'INSPECTION RESULT (kết quả kiểm vải)', 'center', true, 10);
  addBorders(r, 1, r, 17);

  r++;
  ws.getRow(r).height = 20;
  try{ ws.mergeCells(r, 1, r, 5); }catch(e){}
  setCell(r, 1, 'REMARK (ghi chú)', 'left', true, 10);
  try{ ws.mergeCells(r, 6, r, 9); }catch(e){}
  setCell(r, 6, 'FAIL (không đạt)', 'center', true, 10);
  try{ ws.mergeCells(r, 10, r, 11); }catch(e){}
  setCell(r, 10, 'USE', 'center', true, 10);
  try{ ws.mergeCells(r, 12, r, 13); }catch(e){}
  setCell(r, 12, 'DISUSE', 'center', true, 10);
  addBorders(r, 1, r, 17);

  r++;
  ws.getRow(r).height = 22;
  try{ ws.mergeCells(r, 1, r, 17); }catch(e){}
  setCell(r, 1, 'LOT NO (số đợt vải về) :', 'left', true, 10);
  addBorders(r, 1, r, 17);

  r++;
  ws.getRow(r).height = 25;
  try{ ws.mergeCells(r, 1, r, 17); }catch(e){}
  setCell(r, 1, 'FOUR POINT STYSTEM NIKE / OTHER CUSTOMERS   100 YDS / 20 POINTS  FP-QA-01-02-01', 'center', true, 10);
  addBorders(r, 1, r, 17);
  
  r++;
  ws.getRow(r).height = 20;
  try{ ws.mergeCells(r, 1, r, 17); }catch(e){}
  setCell(r, 1, ' ( Points of Inspection Roll % × Inspection Roll (yds) = Point Average (%điểm kiểm trên cây x tổng số yds kiểm trên cây = điểm trung bình)', 'center', false, 10);

  const outPath = 'D:/Downloads/mau_chung_tu.xlsx';
  await wb.xlsx.writeFile(outPath);
  console.log('Template completely recreated exactly at: ' + outPath);
}

createTemplate().catch(console.error);
