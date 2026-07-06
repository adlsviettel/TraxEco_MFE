import * as pdfjsLib from 'pdfjs-dist';

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
pdfjsLib.GlobalWorkerOptions.workerSrc = `${basePath}/pdf.worker.min.mjs`;

export interface PackingPlanRow {
  planRefNo: string;
  poNo: string;
  buyerItem: string;
  custSize: string;
  manuSize: string;
  gpsSize: string;
  ctnNo: number;
  ctnSeriNo: string;
  packedQty: number;
  factory: string;
  grssW: number | null;
  netW: number | null;
  ctnL: number | null;
  ctnW: number | null;
  ctnH: number | null;
  orderNo: string;
  custNo: string;
  lineAggerator: string;
}

const getBetween = (text: string, start: string, end: string) => {
  const s = text.indexOf(start);
  if (s === -1) return '';
  const e = text.indexOf(end, s + start.length);
  if (e === -1) return '';
  return text.substring(s + start.length, e);
};

const getMidtoEnd = (text: string, start: string) => {
  const s = text.indexOf(start);
  if (s === -1) return '';
  return text.substring(s + start.length);
};

async function extractTextLikeCSharp(file: File): Promise<string> {
  const ab = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: ab }).promise;
  let fullText = '';
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const items = content.items as Array<{ str: string, transform: number[] }>;
    
    // Group by Y to form lines
    const lines: {y: number, items: any[]}[] = [];
    for (const item of items) {
      if (!item.str || !item.str.trim()) continue;
      const line = lines.find(l => Math.abs(l.y - item.transform[5]) < 5);
      if (line) line.items.push(item);
      else lines.push({ y: item.transform[5], items: [item] });
    }
    
    lines.sort((a, b) => b.y - a.y); // top to bottom
    for (const line of lines) {
      line.items.sort((a, b) => a.x - b.x); // left to right
      fullText += line.items.map(i => i.str).join(' ') + '\n';
    }
  }
  return fullText;
}

export async function parsePackingPlanPdf(file: File, brand: 'Adidas' | 'Puma', factory: string): Promise<PackingPlanRow[]> {
  const rawText = await extractTextLikeCSharp(file);
  if (brand === 'Adidas') return parseAdidas(rawText, factory);
  if (brand === 'Puma') return parsePuma(rawText, factory);
  return [];
}

function parseAdidas(mytext: string, factory: string): PackingPlanRow[] {
  // Adidas logic placeholder
  return [];
}

function parsePuma(rawText: string, factory: string): PackingPlanRow[] {
  const results: PackingPlanRow[] = [];
  
  // Replicating WinForm Flow Exactly
  let fmtext = "";
  const fmFile = rawText.split('\n');
  for (const str of fmFile) {
    const strChk = str.split(' ').filter(x => x);
    if (strChk.length < 10 && (strChk[0] ? strChk[0].length < 10 : true)) {
      fmtext += " " + str;
    } else {
      fmtext += '\n' + str;
    }
  }
  fmtext = fmtext.replace(/WELLCO/g, "\nWELLCO");
  const mytext = fmtext;

  const strText = "Unit Vol Unit";
  const fnshText = "Totals";
  const cutPO = getBetween(mytext, strText, fnshText).split(' ').filter(x => x)[0] || '';
  const poNo = cutPO.replace(/\n/g, "").substring(0, 10);
  if (!poNo) return [];

  const mytextLines = mytext.split('\n');
  console.log("TOP LINES:", mytextLines.slice(0, 10));
  const myCodeDrw = mytextLines.length > 3 ? (mytextLines[3].split(' ').filter(x => x)[0] || '') : '';

  const read = getMidtoEnd(mytext, "Unit L W H Unit");
  const arr_chuoi = read.split('\n');
  let s_chuoi = " \n";

  // Replicate the exact string manipulation from WinForms
  for (const str of arr_chuoi) {
    if (str.trim() !== "") {
      if (str.includes("MR")) {
        const firstSpace = str.indexOf(" ");
        if (firstSpace > -1 && str.substring(0, firstSpace).length === 4 && !isNaN(Number(str.substring(0, firstSpace)))) {
          s_chuoi += str + "\n";
        } else if (firstSpace > 0) {
          const st = str.substring(0, firstSpace - 1) + str.substring(firstSpace + 1);
          s_chuoi += st + "\n";
        }
      } else {
        if (str.includes(" ")) {
          const firstSpace = str.indexOf(" ");
          if (firstSpace > -1 && str.substring(0, firstSpace).length === 4 && !isNaN(Number(str.substring(0, firstSpace)))) {
            s_chuoi += str;
          } else {
            s_chuoi += str + "\n";
          }
        } else {
          s_chuoi += str;
        }
      }
    }
  }

  const pltAfRead = s_chuoi.split('\n');

  // WinForms logic loops through pltAfRead
  for (let it = 0; it < pltAfRead.length; it++) {
    const line = pltAfRead[it];
    if (line.includes(poNo) && line.includes("MR")) {
      const arr = line.split(' ').filter(x => x);
      if (arr.length > 0 && arr[0].length === 4) {
        try {
          const stRctn = parseInt(arr[1].replace(/,/g, '').replace(/\./g, ''), 10);
          const frsSeriNo = parseInt(arr[3].replace(/,/g, ''), 10);
          const lstSeriNo = parseInt(arr[4].replace(/,/g, ''), 10);

          if (!isNaN(frsSeriNo) && !isNaN(lstSeriNo)) {
            for (let ctnno = frsSeriNo; ctnno <= lstSeriNo; ctnno++) {
              const lstHalf = getBetween(line, poNo, "MR").trim();
              const lstHalfArr = lstHalf.split(' ').filter(x => x);

              const poIdx = arr.indexOf(poNo);
              const buyerItem = (poIdx > 0 && arr[poIdx - 1].includes("-")) ? arr[poIdx - 1] : (poIdx > 1 ? arr[poIdx - 2] : '');

              let modelNo = '';
              try {
                modelNo = getBetween(mytext, strText, fnshText).split('\n')[3].split(' ').filter(x => x)[0];
              } catch (e) {
                modelNo = lstHalfArr.length > 1 ? lstHalfArr[1] : '';
              }

              const custSize = lstHalfArr.length > 3 ? lstHalfArr[3] : '';
              const ctnNoCalc = stRctn + ctnno - frsSeriNo;
              
              let ctnSeriNoStr = ctnno.toString();
              if (ctnSeriNoStr.length === 1) ctnSeriNoStr = "00000" + ctnSeriNoStr;
              else if (ctnSeriNoStr.length === 2) ctnSeriNoStr = "0000" + ctnSeriNoStr;
              else if (ctnSeriNoStr.length === 6) ctnSeriNoStr = "000" + ctnSeriNoStr;
              else if (ctnSeriNoStr.length === 7) ctnSeriNoStr = "00" + ctnSeriNoStr;
              else if (ctnSeriNoStr.length === 8) ctnSeriNoStr = "0" + ctnSeriNoStr;

              // Extract Quantity
              let packedQtyStr = "0";
              if (lstHalf.includes('"')) {
                const sub = getBetween(lstHalf, '"', '"').trim();
                const subArr = sub.split(' ').filter(x => x);
                packedQtyStr = subArr.length > 5 ? subArr[5] : "0";
              } else {
                packedQtyStr = lstHalfArr.length > 6 ? lstHalfArr[6] : "0";
              }
              const packedQty = parseInt(packedQtyStr.replace(/,/g, ''), 10) || 0;

              // Extract Weights
              let netW = null;
              let grssW = null;
              const weightStr = getBetween(lstHalf, ".", "KG").trim();
              const wArr = weightStr.split(' ').filter(x => x);
              for (let i = 0; i < wArr.length; i++) {
                if (!isNaN(parseFloat(wArr[i])) && wArr[i].includes(".")) {
                  netW = parseFloat(wArr[i]);
                  if (wArr[i+1] && !isNaN(parseFloat(wArr[i+1])) && wArr[i+1].includes(".")) {
                    grssW = parseFloat(wArr[i+1]);
                    break;
                  }
                }
              }

              // Extract Dims
              const dimsStr = getMidtoEnd(lstHalf, "KG").trim();
              const dimsArr = dimsStr.split(' ').filter(x => x);
              const ctnL = parseFloat(dimsArr[0]) || null;
              const ctnW = parseFloat(dimsArr[1]) || null;
              const ctnH = parseFloat(dimsArr[2]) || null;

              results.push({
                planRefNo: myCodeDrw,
                poNo: poNo,
                buyerItem: buyerItem || '',
                custSize: custSize,
                manuSize: '',
                gpsSize: '',
                ctnNo: ctnNoCalc,
                ctnSeriNo: ctnSeriNoStr,
                packedQty: packedQty,
                factory: factory,
                grssW: grssW,
                netW: netW,
                ctnL: ctnL,
                ctnW: ctnW,
                ctnH: ctnH,
                orderNo: '', custNo: '', lineAggerator: ''
              });
            }
          }
        } catch (err) {
          console.error("Error parsing row in Puma:", err);
        }
      }
    }
  }

  return results;
}
