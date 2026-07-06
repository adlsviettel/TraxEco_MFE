import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import type { Item } from '../types';

const getTimestampString = (): string => {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '');
  return `${dateStr}_${timeStr}`;
};

const formatMaterialInfo = (compStr?: string): string => {
  if (!compStr) return '';
  if (typeof compStr !== 'string') return '';
  if (!compStr.startsWith('[')) return compStr;
  try {
    const list = JSON.parse(compStr);
    if (Array.isArray(list)) {
      return list.map((item: any) => {
        const parts = [];
        if (item.usage) parts.push(`[${item.usage}]`);
        if (item.itemCode) parts.push(item.itemCode);
        if (item.name) parts.push(item.name);
        if (item.color) parts.push(`(${item.color})`);
        return parts.join(' ');
      }).join('\n');
    }
  } catch (err) {
    console.warn('Failed to parse material info composition', err);
  }
  return compStr;
};

export const exportRdItemsToExcel = async (
  items: Item[],
  type: 'FABRIC' | 'ACCESSORY' | 'PRODUCT' | 'YARDAGE',
  t: (key: string, defaultText: string) => string
): Promise<void> => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(`${type} List`);

  // Define dynamic columns based on type
  let columns = [];
  if (type === 'PRODUCT') {
    columns = [
      { header: t('rdMaterial.project', 'Project'), key: 'project', width: 25 },
      { header: t('rdMaterial.styleName', 'Style Name'), key: 'styleName', width: 25 },
      { header: t('rdMaterial.itemCode', 'Item Code'), key: 'itemCode', width: 20 },
      { header: t('rdMaterial.garmentCategory', 'Product Category'), key: 'garmentCategory', width: 20 },
      { header: t('rdMaterial.sportCategory', 'Sport Category'), key: 'sportCategory', width: 20 },
      { header: t('rdMaterial.sampleStage', 'Stage'), key: 'sampleStage', width: 15 },
      { header: t('rdMaterial.color', 'Color'), key: 'color', width: 15 },
      { header: t('rdMaterial.size', 'Size'), key: 'size', width: 10 },
      { header: t('rdMaterial.gender', 'Gender'), key: 'gender', width: 12 },
      { header: t('rdMaterial.patternMarker', 'Pattern Marker'), key: 'patternMarker', width: 20 },
      { header: t('rdMaterial.allocation', 'Allocation'), key: 'allocation', width: 15 },
      { header: t('rdMaterial.materialInfo', 'Material Information'), key: 'materialInfo', width: 25 },
      { header: t('rdMaterial.fobPrice', 'FOB Price'), key: 'fobPrice', width: 15 },
      { header: t('rdMaterial.location', 'Location'), key: 'location', width: 15 },
      { header: t('rdMaterial.quantity', 'Quantity'), key: 'quantity', width: 10 },
      { header: t('rdMaterial.createdAt', 'Created At'), key: 'createdAt', width: 20 },
      { header: t('rdMaterial.remark', 'Remark'), key: 'remark', width: 25 },
    ];
  } else if (type === 'ACCESSORY') {
    columns = [
      { header: t('rdMaterial.itemCode', 'Item Code'), key: 'itemCode', width: 20 },
      { header: t('rdMaterial.category', 'Category'), key: 'specification', width: 20 },
      { header: t('rdMaterial.description', 'Description'), key: 'description', width: 35 },
      { header: t('rdMaterial.supplier', 'Supplier'), key: 'supplierName', width: 20 },
      { header: t('rdMaterial.origin', 'Origin'), key: 'origin', width: 15 },
      { header: t('rdMaterial.color', 'Color'), key: 'color', width: 15 },
      { header: t('rdMaterial.size', 'Size'), key: 'size', width: 15 },
      { header: t('rdMaterial.price', 'Price'), key: 'price', width: 15 },
      { header: t('rdMaterial.moqMcq', 'MOQ / MCQ'), key: 'moqMcq', width: 15 },
      { header: t('rdMaterial.surcharge', 'Surcharge'), key: 'surcharge', width: 20 },
      { header: t('rdMaterial.leadTime', 'Leadtime'), key: 'leadTime', width: 15 },
      { header: t('rdMaterial.location', 'Location'), key: 'location', width: 15 },
      { header: t('rdMaterial.holder', 'Holder'), key: 'holder', width: 15 },
      { header: t('rdMaterial.status', 'Status'), key: 'status', width: 15 },
      { header: t('rdMaterial.quantity', 'Quantity'), key: 'quantity', width: 15 },
      { header: t('rdMaterial.updatedAt', 'Updated At'), key: 'updatedAt', width: 20 }
    ];
  } else {
    columns = [
      { header: t('rdMaterial.itemCode', 'Item Code'), key: 'itemCode', width: 20 },
      { header: t('rdMaterial.name', 'Name'), key: 'name', width: 30 },
      { header: t('rdMaterial.supplier', 'Supplier'), key: 'supplierName', width: 20 },
      { header: t('rdMaterial.origin', 'Origin'), key: 'origin', width: 15 },
      { header: t('rdMaterial.color', 'Color'), key: 'color', width: 15 },
    ];

    if (type === 'FABRIC') {
      columns.push(
        { header: t('rdMaterial.content', 'Content'), key: 'content', width: 25 },
        { header: t('rdMaterial.weight_gsm', 'Weight (GSM)'), key: 'gsm', width: 15 },
        { header: t('rdMaterial.width', 'Width'), key: 'width', width: 15 }
      );
    }

    columns.push(
      { header: t('rdMaterial.location', 'Location'), key: 'location', width: 15 },
      { header: t('rdMaterial.holder', 'Holder'), key: 'holder', width: 15 },
      { header: t('rdMaterial.status', 'Status'), key: 'status', width: 15 },
      { header: t('rdMaterial.quantity', 'Quantity'), key: 'quantity', width: 15 },
      { header: t('rdMaterial.updatedAt', 'Updated At'), key: 'updatedAt', width: 20 }
    );
  }

  worksheet.columns = columns;

  // Format Header Row
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF2E7D32' }, // MUI Success Color as base
  };

  worksheet.getRow(1).eachCell((cell) => {
    cell.border = {
      top: { style: 'thin' }, left: { style: 'thin' },
      bottom: { style: 'thin' }, right: { style: 'thin' }
    };
  });

  // Add Data
  items.forEach((item) => {
    let rowData: any = {};

    if (type === 'PRODUCT') {
      rowData = {
        project: item.product?.projectName || item.name || '',
        styleName: item.product?.styleName || '',
        itemCode: item.itemCode || '',
        garmentCategory: item.product?.garmentCategory || '',
        sportCategory: item.product?.sportCategory || '',
        sampleStage: item.product?.sampleStage || '',
        color: item.product?.color || '',
        size: item.product?.size || '',
        gender: item.product?.gender || '',
        patternMarker: item.product?.patternMarker || '',
        allocation: item.product?.allocation || '',
        materialInfo: formatMaterialInfo(item.product?.mainComposition),
        fobPrice: item.product?.fobPrice !== undefined && item.product?.fobPrice !== null ? `$${item.product.fobPrice}` : '',
        location: item.location || '',
        quantity: item.quantity ?? 0,
        createdAt: item.createdAt ? new Date(item.createdAt).toLocaleDateString('vi-VN') : '',
        remark: item.remark || '',
      };
    } else if (type === 'ACCESSORY') {
      rowData = {
        itemCode: item.itemCode,
        specification: item.accessory?.specification || '',
        description: item.accessory?.description || item.description || '',
        supplierName: item.supplierName || '',
        origin: item.origin || '',
        color: item.accessory?.color || '',
        size: item.accessory?.size || '',
        price: item.price ? `${item.price} ${item.currency || 'USD'}` : '',
        moqMcq: item.moqMcq ? `${item.moqMcq} ${item.moqMcqUnit || ''}`.trim() : '',
        surcharge: [item.moqSurcharge ? `MOQ: ${item.moqSurcharge}` : '', item.mcqSurcharge ? `MCQ: ${item.mcqSurcharge}` : ''].filter(Boolean).join(' | '),
        leadTime: item.leadTime || '',
        location: item.location || '',
        holder: item.holder || '',
        status: item.status || '',
        quantity: item.quantity || 0,
        updatedAt: item.updatedAt ? new Date(item.updatedAt).toLocaleString() : '',
      };
    } else {
      rowData = {
        itemCode: item.itemCode,
        name: item.name,
        supplierName: item.supplierName,
        origin: item.origin,
        color: type === 'FABRIC' ? (item.fabric?.colorName || item.color) : (type === 'YARDAGE' ? (item.category || item.color) : item.color),
        location: item.location,
        holder: item.holder,
        status: item.status,
        quantity: item.quantity,
        updatedAt: item.updatedAt ? new Date(item.updatedAt).toLocaleString() : '',
      };

      if (type === 'FABRIC' && item.fabric) {
        rowData.content = item.fabric.compositionDetail || item.fabric.composition || '';
        rowData.gsm = item.fabric.weightGsm;
        rowData.width = item.fabric.cuttableWidth;
      }
    }

    const row = worksheet.addRow(rowData);
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFEEEEEE' } },
        bottom: { style: 'thin', color: { argb: 'FFEEEEEE' } },
      };
      cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    });
  });

  // Generate File
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const filePrefix = type === 'PRODUCT' ? 'Garment_Mockup' : type;
  saveAs(blob, `${filePrefix}_List_${getTimestampString()}.xlsx`);
};

export const exportScanLogsToExcel = async (
  logs: any[],
  t: (key: string, defaultText: string) => string
): Promise<void> => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Scan History');

  worksheet.columns = [
    { header: t('rdMaterial.date', 'Date'), key: 'date', width: 20 },
    { header: t('rdMaterial.itemType', 'Item Type'), key: 'itemType', width: 15 },
    { header: t('rdMaterial.itemCode', 'Item Code'), key: 'itemCode', width: 20 },
    { header: t('rdMaterial.name', 'Name'), key: 'name', width: 30 },
    { header: t('rdMaterial.action', 'Action'), key: 'actionType', width: 15 },
    { header: t('rdMaterial.quantity', 'Qty'), key: 'quantity', width: 15 },
    { header: t('rdMaterial.user', 'User'), key: 'scannedBy', width: 25 },
    { header: t('rdMaterial.borrower', 'Borrower'), key: 'borrowerName', width: 25 },
    { header: t('rdMaterial.note', 'Note'), key: 'note', width: 30 },
  ];

  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF2E7D32' },
  };

  worksheet.getRow(1).eachCell((cell) => {
    cell.border = {
      top: { style: 'thin' }, left: { style: 'thin' },
      bottom: { style: 'thin' }, right: { style: 'thin' }
    };
  });

  logs.forEach((log) => {
    const row = worksheet.addRow({
      date: log.timestamp ? new Date(log.timestamp).toLocaleString() : '',
      itemType: log.itemType || '',
      itemCode: log.itemCode || log.item?.itemCode || '',
      name: log.itemName || log.item?.name || '',
      actionType: log.actionType || '',
      quantity: log.quantity || 0,
      scannedBy: log.scannedBy || '',
      borrowerName: log.borrowerName || '',
      note: log.note || '',
    });
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFEEEEEE' } },
        bottom: { style: 'thin', color: { argb: 'FFEEEEEE' } },
      };
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `ScanHistory_${getTimestampString()}.xlsx`);
};

export const exportFabricSubmissionToExcel = async (
  items: Item[],
  customer: string,
  t: (key: string, defaultText: string) => string
): Promise<void> => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Fabric submission list');

  // Define column widths and keys
  worksheet.columns = [
    { key: 'style', width: 15 },
    { key: 'itemCode', width: 15 },
    { key: 'structure', width: 15 },
    { key: 'fabricName', width: 20 },
    { key: 'composition', width: 25 },
    { key: 'function', width: 15 },
    { key: 'weight', width: 15 },
    { key: 'width', width: 20 },
    { key: 'supplier', width: 20 },
    { key: 'origin', width: 15 },
    { key: 'price', width: 15 },
    { key: 'moqMcq', width: 15 },
    { key: 'surcharge', width: 20 },
    { key: 'leadtimeWithGreige', width: 20 },
    { key: 'leadtimeWithoutGreige', width: 20 }
  ];

  // Company Header
  worksheet.getCell('C1').value = 'TRAX Group., Alliance One Apparel Co., Ltd\nLeading GARMENT TECHNOLOGIST in SPORTSWEAR\n';
  worksheet.getCell('C1').font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF64748B' } };
  worksheet.getCell('C1').alignment = { wrapText: true, vertical: 'middle' };
  worksheet.mergeCells('C1:F1');

  // Title
  worksheet.getCell('A2').value = 'FABRIC SUBMISSION LIST';
  worksheet.getCell('A2').font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FF1B5E20' } };
  worksheet.getCell('A2').alignment = { vertical: 'middle' };
  worksheet.mergeCells('A2:G2');

  // Metadata info
  worksheet.getCell('A3').value = 'Submission date:';
  worksheet.getCell('A3').font = { name: 'Calibri', size: 11, bold: true };
  worksheet.getCell('B3').value = '';
  worksheet.getCell('B3').font = { name: 'Calibri', size: 11 };

  worksheet.getCell('A4').value = 'Customer:';
  worksheet.getCell('A4').font = { name: 'Calibri', size: 11, bold: true };
  worksheet.getCell('B4').value = customer || 'All Customers';
  worksheet.getCell('B4').font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF2E7D32' } };

  worksheet.getCell('A5').value = 'Project:';
  worksheet.getCell('A5').font = { name: 'Calibri', size: 11, bold: true };
  worksheet.getCell('B5').value = '';
  worksheet.getCell('B5').font = { name: 'Calibri', size: 11 };

  // Headers Row (Row 7)
  const headerRow = worksheet.getRow(7);
  headerRow.values = [
    t('rdMaterial.style', 'Style'),
    t('rdMaterial.itemCode', 'Item Code'),
    t('rdMaterial.structure', 'Structure'),
    t('rdMaterial.fabricName', 'Fabric name'),
    t('rdMaterial.composition', 'Composition'),
    t('rdMaterial.function', 'Function'),
    t('rdMaterial.weight_gsm', 'Weight (GSM)'),
    t('rdMaterial.width', 'Cuttable width (inch)'),
    t('rdMaterial.supplier', 'Supplier'),
    t('rdMaterial.origin', 'Origin'),
    t('rdMaterial.price', 'Price') + '($/yd)',
    t('rdMaterial.moqMcq', 'MOQ/MCQ'),
    t('rdMaterial.surcharge', 'Surcharge'),
    t('rdMaterial.leadtimeWithGreige', 'Leadtime with greige'),
    t('rdMaterial.leadtimeWithoutGreige', 'Leadtime without greige')
  ];

  headerRow.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF2E7D32' }
  };
  headerRow.eachCell((cell) => {
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF1B5E20' } },
      left: { style: 'thin', color: { argb: 'FF2E7D32' } },
      bottom: { style: 'medium', color: { argb: 'FF1B5E20' } },
      right: { style: 'thin', color: { argb: 'FF2E7D32' } }
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  });
  headerRow.height = 30;

  // Add Data starting from row 8
  items.forEach((item, idx) => {
    const rowNum = 8 + idx;
    const row = worksheet.getRow(rowNum);

    // Resolve price, moq, surcharge, leadtimes by customer
    let priceValue: number | string = '';
    let moqMcqValue = '';
    let surchargeValue = '';
    let leadtimeWithGreigeValue = '';
    let leadtimeWithoutGreigeValue = '';

    if (customer) {
      let matchedEntry: any = null;
      if (item.priceHistory) {
        try {
          const history = JSON.parse(item.priceHistory);
          if (Array.isArray(history)) {
            matchedEntry = history.find((e: any) => e && String(e.customer).trim().toUpperCase() === customer.trim().toUpperCase());
          }
        } catch (err) {
          console.warn('Failed to parse price history', err);
        }
      }

      if (matchedEntry) {
        priceValue = matchedEntry.price !== undefined && matchedEntry.price !== null ? Number(matchedEntry.price) : '';
        moqMcqValue = matchedEntry.moqMcq || '';
        surchargeValue = matchedEntry.surchargeStr || '';
        leadtimeWithGreigeValue = matchedEntry.leadtimeWithGreige || '';
        leadtimeWithoutGreigeValue = matchedEntry.leadtimeWithoutGreige || '';
      } else if (item.customer && String(item.customer).trim().toUpperCase() === customer.trim().toUpperCase()) {
        priceValue = item.price !== undefined && item.price !== null ? Number(item.price) : '';
        moqMcqValue = item.moqMcq || '';
        surchargeValue = item.surchargeStr || '';
        leadtimeWithGreigeValue = item.leadtimeWithGreige || '';
        leadtimeWithoutGreigeValue = item.leadtimeWithoutGreige || '';
      }
    } else {
      priceValue = item.price !== undefined && item.price !== null ? Number(item.price) : '';
      moqMcqValue = item.moqMcq || '';
      surchargeValue = item.surchargeStr || '';
      leadtimeWithGreigeValue = item.leadtimeWithGreige || '';
      leadtimeWithoutGreigeValue = item.leadtimeWithoutGreige || '';
    }

    row.getCell(1).value = ''; // Style
    row.getCell(2).value = item.itemCode || '';
    row.getCell(3).value = item.fabric?.structure || '';
    row.getCell(4).value = item.fabric?.fabricName || '';
    row.getCell(5).value = item.fabric?.compositionDetail || item.fabric?.composition || '';
    row.getCell(6).value = item.fabric?.function || '';
    row.getCell(7).value = item.fabric?.weightGsm !== undefined ? Number(item.fabric.weightGsm) : '';
    row.getCell(8).value = item.fabric?.cuttableWidth !== undefined ? Number(item.fabric.cuttableWidth) : '';
    row.getCell(9).value = item.supplierName || '';
    row.getCell(10).value = item.origin || '';
    row.getCell(11).value = priceValue;
    row.getCell(12).value = moqMcqValue;
    row.getCell(13).value = surchargeValue;
    row.getCell(14).value = leadtimeWithGreigeValue;
    row.getCell(15).value = leadtimeWithoutGreigeValue;

    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD3D3D3' } },
        left: { style: 'thin', color: { argb: 'FFD3D3D3' } },
        bottom: { style: 'thin', color: { argb: 'FFD3D3D3' } },
        right: { style: 'thin', color: { argb: 'FFD3D3D3' } }
      };
      cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    });
    row.height = 24;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const fileName = customer 
    ? `Fabric_Submission_${customer.replace(/[^a-zA-Z0-9]/g, '_')}_${getTimestampString()}.xlsx`
    : `Fabric_Submission_All_${getTimestampString()}.xlsx`;
  saveAs(blob, fileName);
};

export const exportYardageInventoryToExcel = async (
  items: Item[],
  t: (key: string, defaultText: string) => string
): Promise<void> => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Fabric yardage inventory');

  // Define column widths and keys
  worksheet.columns = [
    { key: 'location', width: 15 },
    { key: 'itemCode', width: 15 },
    { key: 'structure', width: 15 },
    { key: 'fabricName', width: 20 },
    { key: 'composition', width: 25 },
    { key: 'function', width: 15 },
    { key: 'weight', width: 15 },
    { key: 'width', width: 20 },
    { key: 'supplier', width: 20 },
    { key: 'origin', width: 15 },
    { key: 'color', width: 15 },
    { key: 'quantity', width: 15 },
    { key: 'remark', width: 20 },
    { key: 'createdAt', width: 15 }
  ];

  // Metadata Export Date
  worksheet.getCell('A1').value = 'Export date:';
  worksheet.getCell('A1').font = { name: 'Calibri', size: 11, bold: true };
  worksheet.getCell('B1').value = new Date().toLocaleDateString('vi-VN');
  worksheet.getCell('B1').font = { name: 'Calibri', size: 11 };

  // Title
  worksheet.getCell('A2').value = 'R&D FABRIC YARDAGE INVENTORY';
  worksheet.getCell('A2').font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FF1B5E20' } };
  worksheet.getCell('A2').alignment = { vertical: 'middle' };
  worksheet.mergeCells('A2:L2');

  // Headers Row (Row 4)
  const headerRow = worksheet.getRow(4);
  headerRow.values = [
    t('rdMaterial.location', 'Location'),
    t('rdMaterial.itemCode', 'Item Code'),
    t('rdMaterial.structure', 'Structure'),
    t('rdMaterial.fabricName', 'Fabric name'),
    t('rdMaterial.composition', 'Composition'),
    t('rdMaterial.function', 'Function'),
    t('rdMaterial.weight_gsm', 'Weight (GSM)'),
    t('rdMaterial.width', 'Cuttable width (inch)'),
    t('rdMaterial.supplier', 'Supplier'),
    t('rdMaterial.origin', 'Origin'),
    t('rdMaterial.color', 'Color'),
    t('rdMaterial.quantity', 'Quantity'),
    t('rdMaterial.remark', 'Remark'),
    t('rdMaterial.createdAt', 'Created at')
  ];

  headerRow.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF2E7D32' }
  };
  headerRow.eachCell((cell) => {
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF1B5E20' } },
      left: { style: 'thin', color: { argb: 'FF2E7D32' } },
      bottom: { style: 'medium', color: { argb: 'FF1B5E20' } },
      right: { style: 'thin', color: { argb: 'FF2E7D32' } }
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  });
  headerRow.height = 30;

  // Fetch parent fabrics to map parent details
  const { rdItemApi } = await import('../services/rdMaterialApi');
  const fabricData = await rdItemApi.getAll({ itemType: 'FABRIC', page: 0, size: 10000 });
  const fabricList = fabricData.content ?? [];
  const fabricMap = new Map(fabricList.map(f => [f.id, f]));

  // Populate data starting from row 5
  items.forEach((y, idx) => {
    const parentFabric = y.parentId ? fabricMap.get(y.parentId) : null;
    const rowNum = 5 + idx;
    const row = worksheet.getRow(rowNum);

    row.getCell(1).value = y.location || '';
    row.getCell(2).value = y.itemCode || parentFabric?.itemCode || '';
    row.getCell(3).value = parentFabric?.fabric?.structure || y.fabric?.structure || '';
    row.getCell(4).value = parentFabric?.fabric?.fabricName || y.fabric?.fabricName || '';
    row.getCell(5).value = parentFabric?.fabric?.compositionDetail || parentFabric?.fabric?.composition || y.fabric?.compositionDetail || y.fabric?.composition || '';
    row.getCell(6).value = parentFabric?.fabric?.function || y.fabric?.function || '';
    row.getCell(7).value = parentFabric?.fabric?.weightGsm !== undefined ? Number(parentFabric.fabric.weightGsm) : (y.fabric?.weightGsm !== undefined ? Number(y.fabric.weightGsm) : '');
    row.getCell(8).value = parentFabric?.fabric?.cuttableWidth !== undefined ? Number(parentFabric.fabric.cuttableWidth) : (y.fabric?.cuttableWidth !== undefined ? Number(y.fabric.cuttableWidth) : '');
    row.getCell(9).value = y.supplierName || parentFabric?.supplierName || '';
    row.getCell(10).value = y.origin || parentFabric?.origin || '';
    row.getCell(11).value = y.color || y.category || '';
    row.getCell(12).value = y.quantity !== undefined ? Number(y.quantity) : 0;
    row.getCell(13).value = y.remark || '';
    row.getCell(14).value = y.createdAt ? new Date(y.createdAt).toLocaleDateString() : '';

    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD3D3D3' } },
        left: { style: 'thin', color: { argb: 'FFD3D3D3' } },
        bottom: { style: 'thin', color: { argb: 'FFD3D3D3' } },
        right: { style: 'thin', color: { argb: 'FFD3D3D3' } }
      };
      cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    });
    row.height = 24;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `Yardage_Inventory_${getTimestampString()}.xlsx`);
};

