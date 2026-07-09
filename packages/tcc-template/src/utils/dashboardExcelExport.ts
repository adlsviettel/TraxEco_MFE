import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';

const DONUT_COLORS = [
  '#5B9BD5', // Soft Blue (accent1)
  '#ED7D31', // Orange (accent2)
  '#A5A5A5', // Medium Gray (accent3)
  '#FFC000', // Yellow/Gold (accent4)
  '#4472C4', // Royal Blue (accent5)
  '#70AD47', // Olive Green (accent6)
  '#ea580c', // Fallback Orange
  '#475569'  // Fallback Slate
];

export const getSvgPngBase64 = async (svgElement: SVGSVGElement): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      const svgClone = svgElement.cloneNode(true) as SVGSVGElement;
      const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
      style.innerHTML = 'text { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important; }';
      svgClone.insertBefore(style, svgClone.firstChild);

      const svgString = new XMLSerializer().serializeToString(svgClone);
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const urlUtility = (window.URL || (window as any).webkitURL || window) as any;
      const blobURL = urlUtility.createObjectURL(svgBlob);
      
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = 2;
        canvas.width = (svgElement.clientWidth || 500) * scale;
        canvas.height = (svgElement.clientHeight || 300) * scale;
        
        const context = canvas.getContext('2d');
        if (context) {
          context.fillStyle = '#ffffff';
          context.fillRect(0, 0, canvas.width, canvas.height);
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          
          const pngData = canvas.toDataURL('image/png');
          resolve(pngData.replace(/^data:image\/png;base64,/, ''));
        } else {
          reject(new Error('Canvas context not available'));
        }
        urlUtility.revokeObjectURL(blobURL);
      };
      image.onerror = (err) => {
        reject(err);
        urlUtility.revokeObjectURL(blobURL);
      };
      image.src = blobURL;
    } catch (err) {
      reject(err);
    }
  });
};

interface ExportParams {
  kpis: { title: string; value: string | number }[];
  chartsData: {
    byMonth: { month: string; count: number }[];
    byCustomer: { customer: string; count: number }[];
    byProductType: { productType: string; count: number }[];
    inProgressByFactory: { factory: string; count: number }[];
    outputByFactory: { factory: string; count: number }[];
    avgWorkingDaysByFactory: { factory: string; avgDays: number }[];
  };
  sortedCustomers: { customer: string; count: number }[];
  totalCustomerCount: number;
}

export const handleExportExcel = async ({ kpis, chartsData, sortedCustomers, totalCustomerCount }: ExportParams) => {
  try {
    const workbook = new ExcelJS.Workbook();
    
    // 1. KPI Summary Sheet
    const kpiSheet = workbook.addWorksheet('KPI Summary');
    
    // Hide gridlines to make the dashboard look modern and web-like
    kpiSheet.views = [{ showGridLines: false }];

    // Adjust columns for the KPI table on the left
    kpiSheet.columns = [
      { key: 'metric', width: 35 },
      { key: 'value', width: 18 }
    ];
    // Column C is a blank spacer column between the KPI table and the charts
    kpiSheet.getColumn(3).width = 4;

    // ─── Draw Banner Title (A2:R3) ───
    kpiSheet.mergeCells('A2:R3');
    const titleCell = kpiSheet.getCell('A2');
    titleCell.value = 'TCC PERFORMANCE & ANALYTICS DASHBOARD (BÁO CÁO HIỆU SUẤT & PHÂN TÍCH TCC)';
    titleCell.font = { bold: true, size: 14, color: { argb: 'FFFFFF' } };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '15803D' } // Excel Green
    };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    
    kpiSheet.getRow(2).height = 22;
    kpiSheet.getRow(3).height = 22;

    // ─── Style and populate the KPI Summary Table (A5:B14) ───
    // Table Header (Row 5)
    kpiSheet.getCell('A5').value = 'Chỉ số hoạt động (KPI Metric)';
    kpiSheet.getCell('B5').value = 'Giá trị (Value)';
    
    const kpiHeaderRow = kpiSheet.getRow(5);
    kpiHeaderRow.height = 26;
    kpiHeaderRow.font = { bold: true, size: 10, color: { argb: 'FFFFFF' } };
    kpiHeaderRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '2E7D32' } // Darker Green for table header
    };
    
    kpiSheet.getCell('A5').alignment = { vertical: 'middle', horizontal: 'center' };
    kpiSheet.getCell('B5').alignment = { vertical: 'middle', horizontal: 'center' };

    const thinBorder: any = {
      top: { style: 'thin', color: { argb: 'CBD5E1' } },
      bottom: { style: 'thin', color: { argb: 'CBD5E1' } },
      left: { style: 'thin', color: { argb: 'CBD5E1' } },
      right: { style: 'thin', color: { argb: 'CBD5E1' } }
    };

    kpis.forEach((kpi, index) => {
      const rowNumber = 6 + index;
      const row = kpiSheet.getRow(rowNumber);
      row.height = 24;
      
      const cellA = kpiSheet.getCell(`A${rowNumber}`);
      const cellB = kpiSheet.getCell(`B${rowNumber}`);
      
      cellA.value = kpi.title;
      cellB.value = kpi.value;
      
      // Font & border
      cellA.font = { size: 10, color: { argb: '1E293B' }, bold: index === 6 }; // Bold the Completion Rate
      cellB.font = { size: 10, color: { argb: '1E293B' }, bold: true };
      
      cellA.border = thinBorder;
      cellB.border = thinBorder;
      
      // Alternating background (Zebra stripes)
      const bgColor = index % 2 === 0 ? 'FFFFFF' : 'F8FAFC';
      cellA.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
      cellB.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
      
      cellA.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
      cellB.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    // ─── Draw beautiful visual cards for the charts ───
    const drawCard = (
      startCol: number, // 1-indexed column number, e.g. 4 for D
      startRow: number, // 1-indexed row number, e.g. 5
      endCol: number,
      endRow: number,
      title: string
    ) => {
      // Merge title cells
      kpiSheet.mergeCells(startRow, startCol, startRow, endCol);
      const titleCell = kpiSheet.getCell(startRow, startCol);
      titleCell.value = title;
      titleCell.font = { bold: true, size: 10, color: { argb: '15803D' } }; // Excel Green text
      titleCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'F8FAFC' } // light slate blue background for card header
      };
      titleCell.alignment = { vertical: 'middle', indent: 1 };

      kpiSheet.getRow(startRow).height = 24;

      // Apply background and border styles to all cells in the card box
      for (let r = startRow; r <= endRow; r++) {
        for (let c = startCol; c <= endCol; c++) {
          const cell = kpiSheet.getCell(r, c);
          const border: any = {};
          
          // Set outer boundary borders
          if (r === startRow) border.top = { style: 'medium', color: { argb: 'CBD5E1' } };
          if (r === endRow) border.bottom = { style: 'medium', color: { argb: 'CBD5E1' } };
          if (c === startCol) border.left = { style: 'medium', color: { argb: 'CBD5E1' } };
          if (c === endCol) border.right = { style: 'medium', color: { argb: 'CBD5E1' } };
          
          // Card header bottom divider
          if (r === startRow) {
            border.bottom = { style: 'thin', color: { argb: 'E2E8F0' } };
          }
          
          cell.border = border;
          
          // Set background color of card body to white
          if (r > startRow) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFFFFF' }
            };
          }
        }
      }
    };

    const getSvgForId = (id: string): SVGSVGElement | null => {
      const container = document.getElementById(id);
      if (!container) return null;
      return container.querySelector('svg');
    };

    // Define visual cards boundaries and headers
    // Columns: D (4) to J (10) for left column, L (12) to R (18) for right column.
    const chartConfigs = [
      { id: 'chart-monthly', col: 4, row: 5, endCol: 10, endRow: 18, title: ' 1. Số lượng Yêu cầu theo Tháng (Monthly Volume)' },
      { id: 'chart-factory-output', col: 12, row: 5, endCol: 18, endRow: 18, title: ' 2. Sản lượng theo Nhà máy (Output by Factory)' },
      { id: 'chart-avg-working-days', col: 4, row: 20, endCol: 10, endRow: 33, title: ' 3. Số ngày xử lý trung bình (Avg Working Days by Factory)' },
      { id: 'chart-product-type', col: 12, row: 20, endCol: 18, endRow: 33, title: ' 4. Phân loại theo Sản phẩm (Product Type Breakdown)' },
      { id: 'chart-customer', col: 4, row: 35, endCol: 10, endRow: 48, title: ' 5. Cơ cấu theo Khách hàng (Customer Distribution)' },
      { id: 'chart-factory-inprogress', col: 12, row: 35, endCol: 18, endRow: 48, title: ' 6. Đang thực hiện theo Nhà máy (In Progress by Factory)' }
    ];

    // Draw all card templates first
    chartConfigs.forEach(config => {
      drawCard(config.col, config.row, config.endCol, config.endRow, config.title);
    });

    // Render and insert each chart specifically by ID into its correct Card
    for (const config of chartConfigs) {
      const svg = getSvgForId(config.id);
      if (svg) {
        try {
          const pngBase64 = await getSvgPngBase64(svg);
          const imageId = workbook.addImage({
            base64: pngBase64,
            extension: 'png',
          });

          const svgWidth = svg.clientWidth || 500;
          const svgHeight = svg.clientHeight || 300;
          const aspectRatio = svgWidth / svgHeight;

          // Define card body dimensions (in pixels)
          // For customer distribution, we keep the donut on the left and write cells on the right
          const isCustomerChart = config.id === 'chart-customer';
          const maxExcelWidth = isCustomerChart ? 240 : 470;
          const maxExcelHeight = 240;

          let excelWidth = maxExcelWidth;
          let excelHeight = excelWidth / aspectRatio;

          // If height overflows the card bounds, scale down based on height
          if (excelHeight > maxExcelHeight) {
            excelHeight = maxExcelHeight;
            excelWidth = excelHeight * aspectRatio;
          }

          // Calculate offsets to center the image inside the card body (or left align for customer chart)
          const leftOffset = isCustomerChart ? 20 : Math.max(0, (maxExcelWidth - excelWidth) / 2);
          const topOffset = Math.max(0, (maxExcelHeight - excelHeight) / 2);

          kpiSheet.addImage(imageId, {
            tl: { 
              col: config.col - 1, // Convert 1-indexed to 0-indexed column
              row: config.row,     // Row index
              colOff: Math.floor(leftOffset * 9525),
              rowOff: Math.floor(topOffset * 9525)
            },
            ext: { width: excelWidth, height: excelHeight }
          } as any);

          // Write Legend cells next to the Pie chart
          if (isCustomerChart) {
            const legendStartRow = 37;
            
            // Set narrow width for Column G (7) for the color legend indicator
            kpiSheet.getColumn(7).width = 4;
            kpiSheet.getColumn(8).width = 20; // Column H (8) for Brand name
            kpiSheet.getColumn(9).width = 16; // Column I (9) for Value

            // Merge G37 and H37 for the Brand header
            kpiSheet.mergeCells(legendStartRow, 7, legendStartRow, 8);
            const legHeaderName = kpiSheet.getCell(legendStartRow, 7);
            const legHeaderVal = kpiSheet.getCell(legendStartRow, 9);
            legHeaderName.value = 'Khách hàng (Brand)';
            legHeaderVal.value = 'Số lượng (%)';
            
            // Style headers
            [legHeaderName, kpiSheet.getCell(legendStartRow, 8), legHeaderVal].forEach(cell => {
              cell.font = { bold: true, size: 9, color: { argb: '475569' } };
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F1F5F9' } };
              cell.alignment = { vertical: 'middle', horizontal: 'center' };
              cell.border = thinBorder;
            });

            sortedCustomers.slice(0, 5).forEach((c, idx) => {
              const rNum = legendStartRow + 1 + idx;
              const cellIndicator = kpiSheet.getCell(rNum, 7); // Column G (7)
              const cellName = kpiSheet.getCell(rNum, 8);      // Column H (8)
              const cellVal = kpiSheet.getCell(rNum, 9);       // Column I (9)
              
              const pct = totalCustomerCount > 0 ? (c.count / totalCustomerCount) * 100 : 0;
              
              // Set color block fill
              const colorHex = DONUT_COLORS[idx % DONUT_COLORS.length].replace('#', '');
              cellIndicator.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF' + colorHex }
              };
              
              cellName.value = c.customer;
              cellVal.value = `${c.count} (${pct.toFixed(0)}%)`;
              
              // Styling cells
              [cellIndicator, cellName, cellVal].forEach(cell => {
                cell.border = thinBorder;
              });

              [cellName, cellVal].forEach(cell => {
                cell.font = { size: 9, color: { argb: '1E293B' } };
                const bgColor = idx % 2 === 0 ? 'FFFFFF' : 'F8FAFC';
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
              });
              
              cellName.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
              cellVal.alignment = { vertical: 'middle', horizontal: 'center' };
            });
          }

        } catch (err) {
          console.error(`Failed to convert chart ${config.id} to image`, err);
        }
      }
    }

    // 2. Breakdowns & Raw Data Sheet (Sheet 2)
    const breakSheet = workbook.addWorksheet('Chi tiết Biểu đồ');
    
    // Title Block style
    const sectionTitleStyle = { font: { bold: true, size: 12, color: { argb: '15803D' } } };
    const tableHeaderStyle: any = { font: { bold: true }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F1F5F9' } } };
    
    // Helper function to format rows
    const addSectionHeader = (title: string, headers: string[]) => {
      const titleRow = breakSheet.addRow([title]);
      titleRow.font = sectionTitleStyle.font;
      const hRow = breakSheet.addRow(headers);
      hRow.font = tableHeaderStyle.font;
      hRow.fill = tableHeaderStyle.fill;
    };

    // A. Monthly Input Volume
    addSectionHeader('1. Số lượng Yêu cầu theo Tháng (Monthly Volume)', ['Tháng (Month)', 'Số lượng (Requests Count)']);
    chartsData.byMonth.forEach(row => {
      breakSheet.addRow([row.month, row.count]);
    });
    breakSheet.addRow([]);

    // B. Customer Distribution
    addSectionHeader('2. Cơ cấu theo Khách hàng (Customer Distribution)', ['Khách hàng (Customer)', 'Số lượng (Requests Count)']);
    chartsData.byCustomer.forEach(row => {
      breakSheet.addRow([row.customer, row.count]);
    });
    breakSheet.addRow([]);

    // C. Product Type Breakdown
    addSectionHeader('3. Phân loại theo Sản phẩm (Product Type Breakdown)', ['Loại sản phẩm (Product Type)', 'Số lượng (Requests Count)']);
    chartsData.byProductType.forEach(row => {
      breakSheet.addRow([row.productType, row.count]);
    });
    breakSheet.addRow([]);

    // D. In Progress by Factory
    addSectionHeader('4. Đang thực hiện theo Nhà máy (In Progress by Factory)', ['Nhà máy (Factory)', 'Yêu cầu đang làm (Active)']);
    chartsData.inProgressByFactory.forEach(row => {
      breakSheet.addRow([row.factory, row.count]);
    });
    breakSheet.addRow([]);

    // E. Output by Factory
    addSectionHeader('5. Sản lượng theo Nhà máy (Output by Factory)', ['Nhà máy (Factory)', 'Tổng số dưỡng cắt (Template Qty)']);
    chartsData.outputByFactory.forEach(row => {
      breakSheet.addRow([row.factory, row.count]);
    });
    breakSheet.addRow([]);

    // F. Avg Working Days by Factory
    addSectionHeader('6. Số ngày xử lý trung bình (Avg Working Days by Factory)', ['Nhà máy (Factory)', 'Số ngày TB (Avg Days)']);
    chartsData.avgWorkingDaysByFactory.forEach(row => {
      breakSheet.addRow([row.factory, row.avgDays]);
    });

    // Autowidth columns for Sheet 2
    breakSheet.columns = [
      { width: 45 },
      { width: 30 }
    ];

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `TCC_Dashboard_Export_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`);
  } catch (err) {
    console.error('Failed to export to Excel', err);
  }
};
