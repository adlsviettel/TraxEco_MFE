import React, { useEffect, useState, useRef, useMemo } from 'react';
import { 
  Box, Typography, Grid, Card, CardContent, CircularProgress, 
  useTheme, Paper, Divider, IconButton, Tooltip as MuiTooltip,
  LinearProgress, Chip, FormControl, InputLabel, Select, MenuItem,
  Menu, ListItemIcon, ListItemText
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, LabelList, Legend
} from 'recharts';
import { 
  Assignment as AssignmentIcon, 
  CheckCircle as CheckCircleIcon, 
  Autorenew as AutorenewIcon, 
  Speed as SpeedIcon,
  Refresh as RefreshIcon,
  TrendingUp as TrendingUpIcon,
  HourglassEmpty as HourglassIcon,
  Print as PrintIcon,
  FileDownload as FileDownloadIcon,
  TableChart as ExcelIcon
} from '@mui/icons-material';
import { Client } from '@stomp/stompjs';
import { AppButton } from '@traxeco/shared';
import { tccService, type TccAnalytics, type TccRequest } from '../services/tccService';
import { DatePicker } from '@mui/x-date-pickers';
import { format } from 'date-fns';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

// Excel theme-based colors for customer distribution
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

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Work in Progress': return '#0284c7';
    case 'Completed': return '#16a34a';
    case 'Remake': return '#ea580c';
    case 'Cancelled': return '#64748b';
    case 'Deleted': return '#ef4444';
    case 'Not Started':
    default: return '#94a3b8';
  }
};

const getStatusChipStyle = (status: string) => {
  switch (status) {
    case 'Work in Progress':
      return { bgcolor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', fontWeight: 700 };
    case 'Completed':
      return { bgcolor: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', fontWeight: 700 };
    case 'Remake':
      return { bgcolor: '#fffbeb', color: '#b45309', border: '1px solid #fde68a', fontWeight: 700 };
    case 'Cancelled':
      return { bgcolor: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0', fontWeight: 700 };
    default:
      return { bgcolor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', fontWeight: 700 };
  }
};

export default function DashboardPage() {
  const { t } = useTranslation();
  const theme = useTheme();
  
  const [data, setData] = useState<TccAnalytics | null>(null);
  const [requests, setRequests] = useState<TccRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [exportAnchorEl, setExportAnchorEl] = useState<null | HTMLElement>(null);
  const isExportOpen = Boolean(exportAnchorEl);

  const handleExportClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setExportAnchorEl(event.currentTarget);
  };
  
  const handleExportClose = () => {
    setExportAnchorEl(null);
  };

  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [preset, setPreset] = useState<string>('All Time');

  const handlePresetChange = (selectedPreset: string) => {
    setPreset(selectedPreset);
    if (selectedPreset === 'All Time') {
      setFromDate('');
      setToDate('');
      return;
    }
    
    const now = new Date();
    let start: Date;
    let end: Date = now;
    
    if (selectedPreset === 'This Week') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      start = new Date(now.setDate(diff));
      start.setHours(0, 0, 0, 0);
      end = new Date();
    } else if (selectedPreset === 'This Month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date();
    } else if (selectedPreset === 'This Year') {
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date();
    } else {
      return;
    }

    const p = (n: number) => n.toString().padStart(2, '0');
    setFromDate(`${start.getFullYear()}-${p(start.getMonth() + 1)}-${p(start.getDate())}`);
    setToDate(`${end.getFullYear()}-${p(end.getMonth() + 1)}-${p(end.getDate())}`);
  };

  const filteredRequests = useMemo(() => {
    if (!requests || requests.length === 0) return [];
    return requests.filter(req => {
      if (!req.createdAt) return false;
      try {
        const reqDate = new Date(req.createdAt);
        if (isNaN(reqDate.getTime())) return false;
        
        const reqDateOnly = new Date(reqDate.getFullYear(), reqDate.getMonth(), reqDate.getDate());
        
        if (fromDate) {
          const parts = fromDate.split('-');
          const from = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
          if (reqDateOnly < from) return false;
        }
        
        if (toDate) {
          const parts = toDate.split('-');
          const to = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
          if (reqDateOnly > to) return false;
        }
        
        return true;
      } catch {
        return false;
      }
    });
  }, [requests, fromDate, toDate]);

  const fetchData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      else setRefreshing(true);
      
      const [analytics, allRequests] = await Promise.all([
        tccService.getAnalytics(),
        tccService.getRequests()
      ]);
      setData(analytics);
      setRequests(allRequests);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch analytics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchDataRef = useRef(fetchData);
  useEffect(() => {
    fetchDataRef.current = fetchData;
  }, [fetchData]);

  useEffect(() => {
    fetchData();

    // WebSocket / STOMP Client for real-time triggers
    const getWsUrl = () => {
      const apiBase = (import.meta as any).env.VITE_API_BASE_URL || '/api';
      if (apiBase.startsWith('https://')) {
        const wsBase = apiBase.replace(/^https/, 'wss');
        return wsBase.replace(/\/api\/?$/, '') + '/ws-qc';
      } else if (apiBase.startsWith('http://')) {
        const wsBase = apiBase.replace(/^http/, 'ws');
        return wsBase.replace(/\/api\/?$/, '') + '/ws-qc';
      } else {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsPath = apiBase.replace(/\/api\/?$/, '');
        return `${protocol}//${window.location.host}${wsPath}/ws-qc`;
      }
    };

    const client = new Client({
      brokerURL: getWsUrl(),
      onConnect: () => {
        client.subscribe('/topic/tcc-updates', () => {
          fetchDataRef.current(true); // Silent reload
        });
      },
      onDisconnect: () => {}
    });
    client.activate();

    return () => {
      client.deactivate();
    };
  }, []);

  // Compute all 6 charts dynamically from the requests list
  const chartsData = useMemo(() => {
    if (!filteredRequests || filteredRequests.length === 0) {
      return {
        byMonth: [],
        byCustomer: [],
        byProductType: [],
        inProgressByFactory: [],
        outputByFactory: [],
        avgWorkingDaysByFactory: []
      };
    }

    const monthMap: Record<string, number> = {};
    const customerMap: Record<string, number> = {};
    const productTypeMap: Record<string, number> = {};
    const inProgressFactoryMap: Record<string, number> = {};
    const outputQtyFactoryMap: Record<string, number> = {};
    const workingDaysFactoryMap: Record<string, { totalDays: number; count: number }> = {};

    filteredRequests.forEach(req => {
      // 1. Monthly Input (Monthly volume)
      if (req.createdAt) {
        try {
          const date = new Date(req.createdAt);
          if (!isNaN(date.getTime())) {
            const monthName = date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
            monthMap[monthName] = (monthMap[monthName] || 0) + 1;
          }
        } catch {
          const monthYear = req.monthYear;
          if (monthYear && monthYear !== 'Unknown') {
            monthMap[monthYear] = (monthMap[monthYear] || 0) + 1;
          }
        }
      }

      // 2. Customer distribution
      if (req.customer) {
        const cust = req.customer;
        customerMap[cust] = (customerMap[cust] || 0) + 1;
      }

      // 3. Product Type Breakdown
      if (req.productType) {
        const pType = req.productType;
        productTypeMap[pType] = (productTypeMap[pType] || 0) + 1;
      }

      // 4. In Progress by Factory (Status = 'Work in Progress')
      if (req.status === 'Work in Progress' && req.factory) {
        const fact = req.factory;
        inProgressFactoryMap[fact] = (inProgressFactoryMap[fact] || 0) + 1;
      }

      // 5. Output by Factory (Sum of templateQty for Completed/Released requests)
      if ((req.status === 'Completed' || req.releasedDate) && req.factory) {
        const fact = req.factory;
        const qty = Number(req.templateQty) || 0;
        outputQtyFactoryMap[fact] = (outputQtyFactoryMap[fact] || 0) + qty;
      }

      // 6. Avg Working Days by Factory (finishedDate vs startDate)
      if (req.startDate && req.finishedDate && req.factory) {
        try {
          const start = new Date(req.startDate);
          const end = new Date(req.finishedDate);
          if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
            const diffTime = end.getTime() - start.getTime();
            const diffDays = diffTime / (1000 * 60 * 60 * 24);
            if (diffDays >= 0) {
              const fact = req.factory;
              if (!workingDaysFactoryMap[fact]) {
                workingDaysFactoryMap[fact] = { totalDays: 0, count: 0 };
              }
              workingDaysFactoryMap[fact].totalDays += diffDays;
              workingDaysFactoryMap[fact].count += 1;
            }
          }
        } catch {}
      }
    });

    const byMonth = Object.entries(monthMap).map(([month, count]) => ({ month, count }));
    const byCustomer = Object.entries(customerMap).map(([customer, count]) => ({ customer, count }));
    const byProductType = Object.entries(productTypeMap).map(([productType, count]) => ({ productType, count }));
    const inProgressByFactory = Object.entries(inProgressFactoryMap).map(([factory, count]) => ({ factory, count }));
    const outputByFactory = Object.entries(outputQtyFactoryMap).map(([factory, count]) => ({ factory, count }));
    const avgWorkingDaysByFactory = Object.entries(workingDaysFactoryMap).map(([factory, val]) => ({
      factory,
      avgDays: Number((val.totalDays / val.count).toFixed(2))
    }));

    return {
      byMonth,
      byCustomer,
      byProductType,
      inProgressByFactory,
      outputByFactory,
      avgWorkingDaysByFactory
    };
  }, [filteredRequests]);

  const totalCustomerCount = useMemo(() => {
    return chartsData.byCustomer.reduce((sum, item) => sum + (item.count || 0), 0);
  }, [chartsData]);

  const sortedCustomers = useMemo(() => {
    return [...chartsData.byCustomer].sort((a, b) => (b.count || 0) - (a.count || 0));
  }, [chartsData]);

  const remakeCount = useMemo(() => {
    return filteredRequests.filter(r => r.status === 'Remake').length;
  }, [filteredRequests]);

  const todayRequestCount = useMemo(() => {
    const todayStr = new Date().toDateString();
    return requests.filter(req => {
      if (!req.createdAt) return false;
      try {
        const date = new Date(req.createdAt);
        return !isNaN(date.getTime()) && date.toDateString() === todayStr;
      } catch {
        return false;
      }
    }).length;
  }, [requests]);

  const dynamicKpis = useMemo(() => {
    const totalInput = filteredRequests.length;
    const totalOutput = filteredRequests.filter(r => r.status && r.status.toLowerCase() === 'completed').length;
    const inProcess = filteredRequests.filter(r => r.status && r.status.toLowerCase() === 'work in progress').length;
    const notStarted = filteredRequests.filter(r => r.status && r.status.toLowerCase() === 'not started').length;
    const remake = filteredRequests.filter(r => r.status && r.status.toLowerCase() === 'remake').length;
    
    const completionRate = totalInput === 0 ? 0 : totalOutput / totalInput;

    let totalDays = 0;
    let countWithDates = 0;
    let totalDelivery = 0;

    filteredRequests.forEach(r => {
      if (r.status && r.status.toLowerCase() === 'completed') {
        if (r.startDate && r.finishedDate) {
          try {
            const start = new Date(r.startDate);
            const finished = new Date(r.finishedDate);
            if (!isNaN(start.getTime()) && !isNaN(finished.getTime())) {
              const diffTime = finished.getTime() - start.getTime();
              const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
              totalDays += Math.max(0, diffDays);
              countWithDates++;
            }
          } catch {}
        }
        if (r.templateQty !== null && r.templateQty !== undefined) {
          totalDelivery += Number(r.templateQty);
        }
      }
    });

    const avgWorkingDays = countWithDates === 0 ? 0 : totalDays / countWithDates;

    return {
      totalInput,
      totalOutput,
      inProcess,
      notStarted,
      remake,
      completionRate,
      avgWorkingDays,
      totalDelivery
    };
  }, [filteredRequests]);

  const kpis = useMemo(() => {
    const rawRate = dynamicKpis.completionRate * 100;
    const formattedCompletionRate = `${rawRate.toFixed(2)}%`;
    const formattedAvgWorkingDays = dynamicKpis.avgWorkingDays.toFixed(2);

    return [
      { 
        title: t('tcc.dashboard.totalInput', 'Total Input'), 
        value: dynamicKpis.totalInput, 
        icon: <AssignmentIcon sx={{ color: '#1b5e20', fontSize: 24 }} />,
        gradient: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)'
      },
      { 
        title: t('tcc.dashboard.todayInput', "Today's Requests"), 
        value: todayRequestCount, 
        icon: <AssignmentIcon sx={{ color: '#0d9488', fontSize: 24 }} />,
        gradient: 'linear-gradient(135deg, #ccfbf1 0%, #99f6e4 100%)'
      },
      { 
        title: t('tcc.dashboard.totalOutput', 'Total Output'), 
        value: dynamicKpis.totalOutput, 
        icon: <CheckCircleIcon sx={{ color: '#2e7d32', fontSize: 24 }} />,
        gradient: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)'
      },
      { 
        title: t('tcc.dashboard.inProcess', 'In Process'), 
        value: dynamicKpis.inProcess, 
        icon: <AutorenewIcon sx={{ color: '#0284c7', fontSize: 24 }} />,
        gradient: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)'
      },
      { 
        title: t('tcc.dashboard.notStarted', 'Not Started'), 
        value: dynamicKpis.notStarted, 
        icon: <HourglassIcon sx={{ color: '#475569', fontSize: 24 }} />,
        gradient: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)'
      },
      { 
        title: t('tcc.dashboard.remake', 'Remake'), 
        value: dynamicKpis.remake, 
        icon: <RefreshIcon sx={{ color: '#ea580c', fontSize: 24 }} />,
        gradient: 'linear-gradient(135deg, #fffbeb 0%, #fde68a 100%)'
      },
      { 
        title: t('tcc.dashboard.completionRate', 'Completion Rate'), 
        value: formattedCompletionRate, 
        icon: <TrendingUpIcon sx={{ color: '#004d40', fontSize: 24 }} />,
        gradient: 'linear-gradient(135deg, #e0f2f1 0%, #b2dfdb 100%)'
      },
      { 
        title: t('tcc.dashboard.avgWorkingDays', 'Avg Working Day'), 
        value: formattedAvgWorkingDays, 
        icon: <SpeedIcon sx={{ color: '#d97706', fontSize: 24 }} />,
        gradient: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)'
      },
      { 
        title: t('tcc.dashboard.totalDelivery', 'Total Delivery'), 
        value: dynamicKpis.totalDelivery, 
        icon: <AssignmentIcon sx={{ color: '#4a148c', fontSize: 24 }} />,
        gradient: 'linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%)'
      }
    ];
  }, [dynamicKpis, todayRequestCount, t]);

  const getSvgPngBase64 = async (svgElement: SVGSVGElement): Promise<string> => {
    return new Promise((resolve, reject) => {
      try {
        const svgClone = svgElement.cloneNode(true) as SVGSVGElement;
        const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
        style.innerHTML = 'text { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important; }';
        svgClone.insertBefore(style, svgClone.firstChild);

        const svgString = new XMLSerializer().serializeToString(svgClone);
        const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const urlUtility = (window.URL || window.webkitURL || window) as any;
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

  const handleExportExcel = async () => {
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

  if (loading) {
    return (
      <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', bgcolor: '#f8fafc' }}>
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress sx={{ color: '#2e7d32', mb: 2 }} />
          <Typography variant="body2" color="text.secondary" fontWeight={500}>
            {t('tcc.dashboard.loading', 'Loading TCC Analytics...')}
          </Typography>
        </Box>
      </Box>
    );
  }

  if (error || !data) {
    return (
      <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', bgcolor: '#f8fafc', p: 3 }}>
        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 1, maxWidth: 400, border: '1px solid #fee2e2' }}>
          <Typography color="error" variant="h6" gutterBottom>{t('tcc.dashboard.error', 'Failed to Load Data')}</Typography>
          <Typography color="text.secondary" variant="body2" sx={{ mb: 3 }}>{error || 'No analytics data available.'}</Typography>
          <AppButton variant="contained" customVariant="primary" onClick={() => fetchData()}>
            {t('tcc.dashboard.retry', 'Retry')}
          </AppButton>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', bgcolor: '#f8fafc', overflow: 'hidden', width: '100%' }}>
      <Box sx={{ flex: 1, overflowY: 'auto', p: { xs: 2, md: 3 }, width: '100%' }}>
        <style>{`
          @media print {
            .MuiAppBar-root,
            .MuiDrawer-root,
            .no-print,
            header,
            footer,
            nav,
            aside,
            button,
            .MuiButtonBase-root {
              display: none !important;
            }
            
            body, html, #root {
              background-color: #ffffff !important;
              margin: 0 !important;
              padding: 0 !important;
              height: auto !important;
              overflow: visible !important;
            }
            
            .MuiBox-root {
              overflow: visible !important;
              height: auto !important;
              max-height: none !important;
            }

            .MuiGrid-container {
              width: 100% !important;
              margin: 0 !important;
            }
            
            .MuiCard-root, .MuiPaper-root {
              page-break-inside: avoid !important;
              box-shadow: none !important;
              border: 1px solid #cbd5e1 !important;
            }
            
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }
        `}</style>
        
        {/* Header - Slimline Layout */}
        <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 2.5 }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#15803d', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              {t('tcc.dashboard.title', 'TCC Performance & Analytics Dashboard')}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '12px' }}>
              {t('tcc.dashboard.subtitle', 'Real-time metrics, status breakdowns, and factory outputs')}
            </Typography>
          </Box>
          <Box className="no-print" display="flex" alignItems="center" gap={1}>
            {refreshing && (
              <CircularProgress size={16} sx={{ color: '#15803d' }} />
            )}
            <MuiTooltip title={t('tcc.dashboard.export', 'Xuất dữ liệu')} arrow>
              <IconButton 
                onClick={handleExportClick} 
                size="small"
                sx={{ 
                  bgcolor: '#ffffff', 
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                  '&:hover': { bgcolor: '#f8fafc' }
                }}
              >
                <FileDownloadIcon fontSize="small" sx={{ color: '#15803d' }} />
              </IconButton>
            </MuiTooltip>
            <MuiTooltip title={t('tcc.dashboard.refresh', 'Refresh Data')} arrow>
              <IconButton 
                onClick={() => fetchData(true)} 
                disabled={refreshing}
                size="small"
                sx={{ 
                  bgcolor: '#ffffff', 
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                  '&:hover': { bgcolor: '#f8fafc' }
                }}
              >
                <RefreshIcon fontSize="small" sx={{ color: '#15803d', animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
              </IconButton>
            </MuiTooltip>
          </Box>
        </Box>

        {/* Date Filters Bar */}
        <Paper 
          className="no-print"
          elevation={0} 
          sx={{ 
            p: 2, 
            mb: 3, 
            display: 'flex', 
            alignItems: 'center', 
            gap: 2, 
            flexWrap: 'wrap', 
            borderRadius: '8px', 
            border: '1px solid #e2e8f0',
            bgcolor: '#ffffff'
          }}
        >
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel sx={{ fontSize: 13 }}>{t('common.presetRange', 'Preset Range')}</InputLabel>
            <Select
              value={preset}
              label={t('common.presetRange', 'Preset Range')}
              onChange={(e) => handlePresetChange(e.target.value)}
              sx={{ 
                borderRadius: '8px', 
                height: 40, 
                fontSize: 13,
                bgcolor: '#fff',
                '& fieldset': { borderColor: '#bfc9c4' },
                '&:hover fieldset': { borderColor: '#2e7d32' },
                '&.Mui-focused fieldset': { borderColor: '#2e7d32' }
              }}
            >
              <MenuItem value="All Time">{t('common.allTime', 'All Time')}</MenuItem>
              <MenuItem value="This Week">{t('common.thisWeek', 'This Week')}</MenuItem>
              <MenuItem value="This Month">{t('common.thisMonth', 'This Month')}</MenuItem>
              <MenuItem value="This Year">{t('common.thisYear', 'This Year')}</MenuItem>
              <MenuItem value="Custom">{t('common.customRange', 'Custom Range')}</MenuItem>
            </Select>
          </FormControl>

          <DatePicker format="dd/MM/yyyy"
            label={t('common.fromDate', 'From Date')}
            value={fromDate ? new Date(fromDate) : null}
            onChange={(val) => {
              setPreset('Custom');
              setFromDate(val ? format(val, 'yyyy-MM-dd') : '');
            }}
            slotProps={{
              textField: {
                size: 'small',
                sx: {
                  '& .MuiOutlinedInput-root': { 
                    borderRadius: '8px', 
                    height: 40, 
                    fontSize: 13,
                    bgcolor: '#fff',
                    '& fieldset': { borderColor: '#bfc9c4' },
                    '&:hover fieldset': { borderColor: '#2e7d32' },
                    '&.Mui-focused fieldset': { borderColor: '#2e7d32' }
                  },
                  '& .MuiInputLabel-root': { fontSize: 13 }
                }
              }
            }}
          />

          <DatePicker format="dd/MM/yyyy"
            label={t('common.toDate', 'To Date')}
            value={toDate ? new Date(toDate) : null}
            onChange={(val) => {
              setPreset('Custom');
              setToDate(val ? format(val, 'yyyy-MM-dd') : '');
            }}
            slotProps={{
              textField: {
                size: 'small',
                sx: {
                  '& .MuiOutlinedInput-root': { 
                    borderRadius: '8px', 
                    height: 40, 
                    fontSize: 13,
                    bgcolor: '#fff',
                    '& fieldset': { borderColor: '#bfc9c4' },
                    '&:hover fieldset': { borderColor: '#2e7d32' },
                    '&.Mui-focused fieldset': { borderColor: '#2e7d32' }
                  },
                  '& .MuiInputLabel-root': { fontSize: 13 }
                }
              }
            }}
          />

          {(fromDate || toDate) && (
            <AppButton
              variant="outlined"
              customVariant="secondary"
              onClick={() => {
                setPreset('All Time');
                setFromDate('');
                setToDate('');
              }}
              sx={{ height: 40, borderRadius: '8px', fontSize: 13, textTransform: 'none' }}
            >
              {t('common.clearFilters', 'Clear Filters')}
            </AppButton>
          )}
        </Paper>
        {/* Top Row: Compact but Highly Readable KPI Cards */}
        <Box 
          sx={{ 
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(3, 1fr)' },
            gap: 2.5, 
            mb: 3 
          }}
        >
          {kpis.map((kpi, index) => (
            <Card 
              key={index}
              elevation={0}
              sx={{ 
                borderRadius: '8px', 
                border: '1px solid #e2e8f0', 
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 8px 16px -4px rgba(0,0,0,0.06)',
                  borderColor: '#cbd5e1'
                }
              }}
            >
              <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: '0.01em', fontSize: '13px' }}>
                    {kpi.title}
                  </Typography>
                  <Box 
                    sx={{ 
                      p: 1, 
                      background: kpi.gradient, 
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {kpi.icon}
                  </Box>
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em', fontSize: '26px' }}>
                  {kpi.value}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Box>

        {/* 6-Charts Layout Grid (Symmetric 3 columns on Desktop, 2 on Tablet, 1 on Mobile) */}
        <Box 
          sx={{ 
            display: 'grid', 
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr', lg: '1fr 1fr 1fr' }, 
            gap: 3, 
            width: '100%' 
          }}
        >
          {/* Chart 1: Monthly Input (Bar Chart) */}
          <Card 
            elevation={0}
            sx={{ 
              borderRadius: '8px', 
              border: '1px solid #e2e8f0', 
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              display: 'flex',
              flexDirection: 'column',
              height: 340
            }}
          >
            <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', flex: 1, '&:last-child': { pb: 3 } }}>
              <Box mb={2} sx={{ minHeight: 48, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a', fontSize: '15px', lineHeight: 1.2 }}>
                  {t('tcc.dashboard.monthlyInput', 'Monthly Input')}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, lineHeight: 1.2 }}>
                  {t('tcc.dashboard.monthlyInputDesc', 'Volume trends of registered requests over time')}
                </Typography>
              </Box>
              
              <Box id="chart-monthly" sx={{ flex: 1, minHeight: 0, width: '100%' }}>
                {chartsData.byMonth.length === 0 ? (
                  <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                    <Typography variant="caption" color="text.disabled">{t('tcc.dashboard.noData', 'No data available')}</Typography>
                  </Box>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartsData.byMonth} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="month" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }} 
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }} 
                      />
                      <Tooltip 
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            return (
                              <Paper elevation={0} sx={{ p: 1.2, border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mb: 0.2 }}>
                                  {label}
                                </Typography>
                                <Typography variant="body2" sx={{ fontWeight: 800, color: '#5B9BD5', fontSize: '13px' }}>
                                  {payload[0].value} {t('tcc.dashboard.requests', 'Requests')}
                                </Typography>
                              </Paper>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="count" fill="#5B9BD5" radius={[4, 4, 0, 0]} barSize={30} isAnimationActive={false}>
                        <LabelList dataKey="count" position="top" style={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Box>
            </CardContent>
          </Card>

          {/* Chart 2: Output by quantity (Bar Chart) */}
          <Card 
            elevation={0}
            sx={{ 
              borderRadius: '8px', 
              border: '1px solid #e2e8f0', 
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              display: 'flex',
              flexDirection: 'column',
              height: 340
            }}
          >
            <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', flex: 1, '&:last-child': { pb: 3 } }}>
              <Box mb={2} sx={{ minHeight: 48, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a', fontSize: '15px', lineHeight: 1.2 }}>
                  {t('tcc.dashboard.outputByQuantity', 'Output by quantity')}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, lineHeight: 1.2 }}>
                  {t('tcc.dashboard.outputByQuantityDesc', 'Total template quantities completed by factory')}
                </Typography>
              </Box>
              
              <Box id="chart-factory-output" sx={{ flex: 1, minHeight: 0, width: '100%' }}>
                {chartsData.outputByFactory.length === 0 ? (
                  <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                    <Typography variant="caption" color="text.disabled">{t('tcc.dashboard.noData', 'No data available')}</Typography>
                  </Box>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      layout="vertical"
                      data={chartsData.outputByFactory} 
                      margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                      <XAxis 
                        type="number"
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }} 
                      />
                      <YAxis 
                        type="category"
                        dataKey="factory" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }} 
                      />
                      <Tooltip 
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            return (
                              <Paper elevation={0} sx={{ p: 1.2, border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mb: 0.2 }}>
                                  {label}
                                </Typography>
                                <Typography variant="body2" sx={{ fontWeight: 800, color: '#70AD47', fontSize: '13px' }}>
                                  {payload[0].value} {t('tcc.dashboard.templates', 'Templates')}
                                </Typography>
                              </Paper>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="count" fill="#70AD47" radius={[0, 4, 4, 0]} barSize={16} isAnimationActive={false}>
                        <LabelList dataKey="count" position="right" style={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Box>
            </CardContent>
          </Card>

          {/* Chart 3: Avg Working day per requestor (Bar Chart) */}
          <Card 
            elevation={0}
            sx={{ 
              borderRadius: '8px', 
              border: '1px solid #e2e8f0', 
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              display: 'flex',
              flexDirection: 'column',
              height: 340
            }}
          >
            <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', flex: 1, '&:last-child': { pb: 3 } }}>
              <Box mb={2} sx={{ minHeight: 48, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a', fontSize: '15px', lineHeight: 1.2 }}>
                  {t('tcc.dashboard.avgWorkingDayPerRequestor', 'Avg Working day per requestor')}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, lineHeight: 1.2 }}>
                  {t('tcc.dashboard.avgWorkingDayPerRequestorDesc', 'Average development days (Finished - Start) by factory')}
                </Typography>
              </Box>
              
              <Box id="chart-avg-working-days" sx={{ flex: 1, minHeight: 0, width: '100%' }}>
                {chartsData.avgWorkingDaysByFactory.length === 0 ? (
                  <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                    <Typography variant="caption" color="text.disabled">{t('tcc.dashboard.noData', 'No data available')}</Typography>
                  </Box>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartsData.avgWorkingDaysByFactory} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="factory" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }} 
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }} 
                      />
                      <Tooltip 
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            return (
                              <Paper elevation={0} sx={{ p: 1.2, border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mb: 0.2 }}>
                                  {label}
                                </Typography>
                                <Typography variant="body2" sx={{ fontWeight: 800, color: '#5B9BD5', fontSize: '13px' }}>
                                  {payload[0].value} {t('tcc.dashboard.days', 'Days')}
                                </Typography>
                              </Paper>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="avgDays" fill="#5B9BD5" radius={[4, 4, 0, 0]} barSize={30} isAnimationActive={false}>
                        <LabelList dataKey="avgDays" position="top" style={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Box>
            </CardContent>
          </Card>

          {/* Chart 4: Product Type Breakdown (Bar Chart) */}
          <Card 
            elevation={0}
            sx={{ 
              borderRadius: '8px', 
              border: '1px solid #e2e8f0', 
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              display: 'flex',
              flexDirection: 'column',
              height: 340
            }}
          >
            <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', flex: 1, '&:last-child': { pb: 3 } }}>
              <Box mb={2} sx={{ minHeight: 48, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a', fontSize: '15px', lineHeight: 1.2 }}>
                  {t('tcc.dashboard.productTypeBreakdown', 'Product Type Breakdown')}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, lineHeight: 1.2 }}>
                  {t('tcc.dashboard.productTypeBreakdownDesc', 'Demand volume categorized by apparel type')}
                </Typography>
              </Box>
              
              <Box id="chart-product-type" sx={{ flex: 1, minHeight: 0, width: '100%' }}>
                {chartsData.byProductType.length === 0 ? (
                  <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                    <Typography variant="caption" color="text.disabled">{t('tcc.dashboard.noData', 'No data available')}</Typography>
                  </Box>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      layout="vertical"
                      data={chartsData.byProductType} 
                      margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                      <XAxis 
                        type="number"
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }} 
                      />
                      <YAxis 
                        type="category"
                        dataKey="productType" 
                        width={110}
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }} 
                      />
                      <Tooltip 
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            return (
                              <Paper elevation={0} sx={{ p: 1.2, border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mb: 0.2 }}>
                                  {label}
                                </Typography>
                                <Typography variant="body2" sx={{ fontWeight: 800, color: '#AFC854', fontSize: '13px' }}>
                                  {payload[0].value} {t('tcc.dashboard.requests', 'Requests')}
                                </Typography>
                              </Paper>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="count" fill="#AFC854" radius={[0, 4, 4, 0]} barSize={16} isAnimationActive={false}>
                        <LabelList dataKey="count" position="right" style={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Box>
            </CardContent>
          </Card>

          {/* Chart 5: Customer distribution (Donut Chart) */}
          <Card 
            elevation={0}
            sx={{ 
              borderRadius: '8px', 
              border: '1px solid #e2e8f0', 
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              display: 'flex',
              flexDirection: 'column',
              height: 340
            }}
          >
            <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', flex: 1, '&:last-child': { pb: 3 } }}>
              <Box mb={2} sx={{ minHeight: 48, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a', fontSize: '15px', lineHeight: 1.2 }}>
                  {t('tcc.dashboard.customerDistributionChart', 'Customer distribution')}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, lineHeight: 1.2 }}>
                  {t('tcc.dashboard.customerDistributionDesc', 'Share of requests across different brands')}
                </Typography>
              </Box>

              <Box display="flex" alignItems="center" justifyContent="space-between" sx={{ flex: 1, minHeight: 0 }}>
                
                {/* Left: Donut Pie */}
                <Box id="chart-customer" sx={{ width: '52%', height: '100%', position: 'relative' }}>
                  {chartsData.byCustomer.length === 0 ? (
                    <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                      <Typography variant="caption" color="text.disabled">{t('tcc.dashboard.noData', 'No data available')}</Typography>
                    </Box>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={sortedCustomers}
                          dataKey="count"
                          nameKey="customer"
                          cx="50%"
                          cy="50%"
                          outerRadius={70}
                          innerRadius={48}
                          paddingAngle={2.5}
                          isAnimationActive={false}
                        >
                          {sortedCustomers.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const item = payload[0];
                              return (
                                <Paper elevation={0} sx={{ p: 1.2, border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mb: 0.2 }}>
                                    {item.name}
                                  </Typography>
                                  <Typography variant="body2" sx={{ fontWeight: 800, color: '#0284c7', fontSize: '13px' }}>
                                    {item.value} {t('tcc.dashboard.requests', 'Requests')} ({totalCustomerCount > 0 ? Math.round((Number(item.value) / totalCustomerCount) * 100) : 0}%)
                                  </Typography>
                                </Paper>
                              );
                            }
                            return null;
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  )}

                  {/* Absolute Center Stats Overlay */}
                  <Box 
                    sx={{ 
                      position: 'absolute', 
                      top: '50%', 
                      left: '50%', 
                      transform: 'translate(-50%, -50%)', 
                      textAlign: 'center',
                      pointerEvents: 'none'
                    }}
                  >
                    <Typography variant="h5" sx={{ fontWeight: 900, color: '#0f172a', letterSpacing: '-0.05em', lineHeight: 1, fontSize: '22px' }}>
                      {totalCustomerCount}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', fontSize: '9px' }}>
                      {t('tcc.dashboard.totalLabel', 'Total')}
                    </Typography>
                  </Box>
                </Box>

                {/* Right: Legend */}
                <Box sx={{ width: '45%', display: 'flex', flexDirection: 'column', gap: 1, pr: 0.5, maxHeight: '180px', overflowY: 'auto' }}>
                  {sortedCustomers.slice(0, 5).map((c, index) => {
                    const pct = totalCustomerCount > 0 ? (c.count / totalCustomerCount) * 100 : 0;
                    return (
                      <Box key={index} display="flex" alignItems="center" justifyContent="space-between">
                        <Box display="flex" alignItems="center" gap={0.8} sx={{ overflow: 'hidden' }}>
                          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: DONUT_COLORS[index % DONUT_COLORS.length], flexShrink: 0 }} />
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              fontWeight: 700, 
                              color: '#475569', 
                              overflow: 'hidden', 
                              textOverflow: 'ellipsis', 
                              whiteSpace: 'nowrap',
                              fontSize: '10.5px'
                            }}
                          >
                            {c.customer}
                          </Typography>
                        </Box>
                        <Typography variant="caption" sx={{ fontWeight: 800, color: '#0f172a', ml: 1, flexShrink: 0, fontSize: '10.5px' }}>
                          {pct.toFixed(0)}%
                        </Typography>
                      </Box>
                    );
                  })}
                  {sortedCustomers.length > 5 && (
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontStyle: 'italic', pl: 1.5, fontSize: '9.5px' }}>
                      + {sortedCustomers.length - 5} {t('tcc.dashboard.more', 'more')}
                    </Typography>
                  )}
                </Box>
                
              </Box>
            </CardContent>
          </Card>

          {/* Chart 6: In progress by requestor (Line Chart) */}
          <Card 
            elevation={0}
            sx={{ 
              borderRadius: '8px', 
              border: '1px solid #e2e8f0', 
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              display: 'flex',
              flexDirection: 'column',
              height: 340
            }}
          >
            <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', flex: 1, '&:last-child': { pb: 3 } }}>
              <Box mb={2} sx={{ minHeight: 48, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a', fontSize: '15px', lineHeight: 1.2 }}>
                  {t('tcc.dashboard.inProgressByRequestor', 'In progress by requestor')}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, lineHeight: 1.2 }}>
                  {t('tcc.dashboard.inProgressByRequestorDesc', 'Count of actively developed samples per factory/requestor')}
                </Typography>
              </Box>
              
              <Box id="chart-factory-inprogress" sx={{ flex: 1, minHeight: 0, width: '100%' }}>
                {chartsData.inProgressByFactory.length === 0 ? (
                  <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                    <Typography variant="caption" color="text.disabled">{t('tcc.dashboard.noData', 'No data available')}</Typography>
                  </Box>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartsData.inProgressByFactory} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="factory" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }} 
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }} 
                      />
                      <Tooltip 
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            return (
                              <Paper elevation={0} sx={{ p: 1.2, border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mb: 0.2 }}>
                                  {label}
                                </Typography>
                                <Typography variant="body2" sx={{ fontWeight: 800, color: '#5B9BD5', fontSize: '13px' }}>
                                  {payload[0].value} {t('tcc.dashboard.requests', 'Requests')}
                                </Typography>
                              </Paper>
                            );
                          }
                          return null;
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="count" 
                        stroke="#5B9BD5" 
                        strokeWidth={3} 
                        dot={{ r: 5, stroke: '#5B9BD5', strokeWidth: 2, fill: '#fff' }}
                        activeDot={{ r: 7 }}
                        isAnimationActive={false}
                      >
                        <LabelList dataKey="count" position="top" style={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} />
                      </Line>
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>

      <Menu
        anchorEl={exportAnchorEl}
        open={isExportOpen}
        onClose={handleExportClose}
        PaperProps={{
          sx: {
            mt: 0.5,
            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
          }
        }}
      >
        <MenuItem 
          onClick={() => {
            handleExportClose();
            window.print();
          }}
          sx={{ py: 1, px: 2 }}
        >
          <ListItemIcon sx={{ minWidth: 32 }}>
            <PrintIcon fontSize="small" sx={{ color: '#15803d' }} />
          </ListItemIcon>
          <ListItemText primary={t('tcc.dashboard.exportPdfOption', 'Xuất báo cáo PDF')} primaryTypographyProps={{ fontSize: 13, fontWeight: 500 }} />
        </MenuItem>
        <MenuItem 
          onClick={() => {
            handleExportClose();
            handleExportExcel();
          }}
          sx={{ py: 1, px: 2 }}
        >
          <ListItemIcon sx={{ minWidth: 32 }}>
            <ExcelIcon fontSize="small" sx={{ color: '#15803d' }} />
          </ListItemIcon>
          <ListItemText primary={t('tcc.dashboard.exportExcelOption', 'Xuất dữ liệu Excel')} primaryTypographyProps={{ fontSize: 13, fontWeight: 500 }} />
        </MenuItem>
      </Menu>
    </Box>
  );
}
