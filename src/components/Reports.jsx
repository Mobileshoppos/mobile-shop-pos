import React, { useState, useEffect } from 'react';
// NAYA IZAFA: Destructuring mein 'Input' ko shamil kiya gaya hai
import { Typography, Tabs, Card, Row, Col, Statistic, Spin, DatePicker, Space, theme, Table, Progress, Divider, Tag, Empty, Button, Dropdown, Menu, Radio, Badge, Tooltip, App, Select, ConfigProvider, Input, Modal, Form, Checkbox } from 'antd';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { formatCurrency } from '../utils/currencyFormatter';
import DataService from '../DataService';
import BalanceSheet from '../components/BalanceSheet'; // <--- NAYA IZAFA
import DataExport from '../components/DataExport'; // <--- NAYA IZAFA: Reusable Export & Print Component
import { db } from '../db';
import dayjs from 'dayjs';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getPlanLimits } from '../config/subscriptionPlans'; // Naya Import
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title as ChartTitle,
  Tooltip as ChartTooltip,
  Legend,
  Filler,
  ArcElement,
  BarElement
} from 'chart.js';
import { Line, Doughnut, Bar } from 'react-chartjs-2';

// Chart.js ke sabhi zaroori components ko register karein
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement, // Naya component
  ChartTitle,
  ChartTooltip,
  Legend,
  Filler,
  ArcElement
);
import {
  DashboardOutlined,
  LineChartOutlined,
  TableOutlined, // <--- NAYA IZAFA
  DollarOutlined,
  InboxOutlined,
  BookOutlined,
  SafetyCertificateOutlined,
  ShoppingOutlined,
  WalletOutlined,
  RiseOutlined,
  ArrowDownOutlined,
  BankOutlined,
  TeamOutlined,
  TrophyOutlined,
  FileExcelOutlined,
  DownOutlined,
  LockOutlined,
  PieChartOutlined,
  HistoryOutlined,
  ShopOutlined,
  UserOutlined,
  PrinterOutlined,
  UndoOutlined,
  SearchOutlined,
  AppstoreOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const Reports = () => {
  const { message } = App.useApp();
  const navigate = useNavigate(); 
  const[searchParams, setSearchParams] = useSearchParams();
  const { token } = theme.useToken();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { profile } = useAuth();
  const { isDarkMode } = useTheme();
  
  // --- SUBSCRIPTION CHECK ---
  const limits = getPlanLimits(profile?.subscription_tier);
  // Hum check kar rahe hain ke profile mojood hai tabhi lock apply ho
  const isLocked = profile ? !limits.allow_reports : false;
  // --- UPDATED: Universal Glow Style (Light & Dark Compatible) ---
  const cardStyle = {
    borderRadius: 8,
    border: `1px solid ${token.colorCardBorder}`, 
    boxShadow: `0 4px 12px ${token.colorCardShadow}`, 
    height: '100%',
    transition: 'all 0.3s ease', 
    backgroundColor: token.colorCardBg || token.colorBgContainer // Ab yeh ThemeConfig se control hoga
  };
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'sales');

  // --- STATES ---
  const [loading, setLoading] = useState(false);
  const[overviewData, setOverviewData] = useState(null);
  const [salesData, setSalesData] = useState(null); // NAYI STATE: Sales Data ke liye
  const [profitLossData, setProfitLossData] = useState(null); // NAYI STATE: P&L Data ke liye
  const [inventoryData, setInventoryData] = useState(null); // NAYI STATE: Inventory Data
  const [ledgerData, setLedgerData] = useState(null); // NAYI STATE: Ledger Data
  const [auditData, setAuditData] = useState(null);
  // --- VAULT LEDGER STATES (NAYA IZAFA) ---
  const [allRegisters, setAllRegisters] = useState([]);
  const [paymentAccounts, setPaymentAccounts] = useState([]); // NAYA IZAFA
  const [selectedRegForLedger, setSelectedRegForLedger] = useState(null);
  const [selectedAccountType, setSelectedAccountType] = useState('counter'); // 'counter' ya 'bank'
  const [registerLedgerData, setRegisterLedgerData] = useState([]);
  const [activeSessionsData, setActiveSessionsData] = useState([]); 
  const [currentCounterCash, setCurrentCounterCash] = useState(0); // NAYA IZAFA
  const [staffList, setStaffList] = useState([]); // NAYI STATE: Staff Names ke liye

  // --- NAYA IZAFA: Account Ledger Filters ---
  const [vaultDateRange, setVaultDateRange] = useState('this_month'); // <--- NAYA IZAFA: Default 'This Month' ho gaya
  const [vaultCustomDates, setVaultCustomDates] = useState([]);
  const [vaultTxType, setVaultTxType] = useState('all');
  const [vaultStaff, setVaultStaff] = useState('all'); // <--- NAYA IZAFA: Handled by filter state
  const [vaultSearchText, setVaultSearchText] = useState(''); // <--- NAYA IZAFA: Search input state
  const [vaultCustomer, setVaultCustomer] = useState('all'); // <--- NAYA IZAFA: Select Customer State
  const [vaultSupplier, setVaultSupplier] = useState('all'); // <--- NAYA IZAFA: Select Supplier State
  const [vaultViewMode, setVaultViewMode] = useState('detailed'); // <--- NAYA IZAFA: View Mode State ('detailed' vs 'grouped')

  // Lists loading states
  const [customerList, setCustomerList] = useState([]); // <--- NAYA IZAFA
  const [supplierList, setSupplierList] = useState([]); // <--- NAYA IZAFA

  // --- NAYA IZAFA: Cash & Audit Filter States ---
  const [auditStaff, setAuditStaff] = useState('all');
  const [auditDiscrepancy, setAuditDiscrepancy] = useState('all'); // 'all', 'discrepancy', 'matched'

  // --- NAYA IZAFA: Daily Profit & Loss Ledger State ---
  const [dailyPLList, setDailyPLList] = useState([]);
  
  // --- NAYA IZAFA: Local Table Filters for P&L ---
  const [plTableDateType, setPlTableDateType] = useState('sync'); // 'sync' means follow the main tab filter
  const [plTableCustomDates, setPlTableCustomDates] = useState([]);
  const [isPLTableLoading, setIsPLTableLoading] = useState(false);

  // --- NAYA IZAFA: P&L Export Wizard States ---
  const [isPLExportWizardOpen, setIsPLExportWizardOpen] = useState(false);
  const [plExportDateRangeType, setPLExportDateRangeType] = useState('current');
  const [plExportCustomDates, setPLExportCustomDates] = useState([]);
  const [plSelectedColumns, setPlSelectedColumns] = useState(['gross_sales', 'returns', 'discounts', 'taxes', 'grand_total', 'cogs', 'expenses', 'damaged_loss', 'net_profit']);
  const [plExportData, setPlExportData] = useState([]);
  const [plExportLoading, setPlExportLoading] = useState(false);

  const [dateRange, setDateRange] = useState([dayjs().startOf('month'), dayjs().endOf('month')]);
const [timeRange, setTimeRange] = useState('month'); 
const [productFilter, setProductFilter] = useState('qty');
// --- NAYA IZAFA: URL tabdeel hone par screen tab badalna (Back/Forward support) ---
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]); 
const [catChartFilter, setCatChartFilter] = useState('revenue'); 
const [profitChartFilter, setProfitChartFilter] = useState('both'); // Naya: Profit chart toggle
// --- NAYA IZAFA: Common Chart Options (Available for all tabs) ---
  const doughnutOptions = {
    plugins: {
      legend: {
        position: 'left',
        align: 'center',
        labels: { color: token.colorText, font: { size: 11 }, boxWidth: 12 }
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const val = context.raw;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percent = ((val / total) * 100).toFixed(1);
            return ` ${context.label}: ${formatCurrency(val, profile?.currency)} (${percent}%)`;
          }
        }
      }
    },
    maintainAspectRatio: false,
    layout: { padding: { bottom: 25 } }
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: 'top', labels: { color: token.colorText, boxWidth: 12 } },
      tooltip: { 
        mode: 'index', 
        intersect: false,
        callbacks: {
          label: (context) => `${context.dataset.label}: ${formatCurrency(context.parsed.y, profile?.currency)}`
        }
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: token.colorTextSecondary }
      },
      y: {
        beginAtZero: true,
        ticks: { 
          color: token.colorTextSecondary,
          callback: (value) => formatCurrency(value, profile?.currency)
        },
        grid: { color: token.colorBorderSecondary }
      }
    }
  };

  // --- NAYA IZAFA: Common Center Text Plugin (For all Doughnut charts) ---
  const invCenterTextPlugin = (label, totalValue) => ({
    id: 'invCenterText',
    beforeDraw: (chart) => {
      const { ctx, chartArea: { left, right, top, bottom } } = chart;
      ctx.save();
      const centerX = (left + right) / 2;
      const centerY = (top + bottom) / 2;
      ctx.fillStyle = token.colorCardHeadingsText;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '11px sans-serif';
      ctx.globalAlpha = 0.6;
      ctx.fillText(label, centerX, centerY - 12);
      ctx.font = 'bold 14px sans-serif';
      ctx.globalAlpha = 1;
      ctx.fillText(formatCurrency(totalValue, profile?.currency), centerX, centerY + 10);
      ctx.restore();
    }
  });

  // --- NAYA IZAFA: EXCEL EXPORT LOGIC ---
  const downloadExcel = (dataSheets, fileName) => {
    const workbook = XLSX.utils.book_new();
    
    dataSheets.forEach(sheet => {
      const worksheet = XLSX.utils.json_to_sheet(sheet.data);
      XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name);
    });

    XLSX.writeFile(workbook, `${fileName}_${dayjs().format('YYYY-MM-DD')}.xlsx`);
    message.success(`${fileName} downloaded successfully!`);
  };

  // --- NAYA IZAFA: Quick Date Filters Logic ---
  const handleRangeChange = (e) => {
    const val = e.target.value;
    setTimeRange(val);

    let start, end;
    if (val === 'today') {
      start = dayjs().startOf('day');
      end = dayjs().endOf('day');
    } else if (val === 'week') {
      start = dayjs().startOf('week');
      end = dayjs().endOf('day');
    } else if (val === 'month') {
      start = dayjs().startOf('month');
      end = dayjs().endOf('day');
    }

    if (val !== 'custom') {
      setDateRange([start, end]);
    }
  };

  // --- NAYA IZAFA: P&L Wizard Data Calculation ---
  const handlePLExportRangeChange = async (type, dates) => {
    if (type === 'current') {
        setPlExportData(dailyPLList);
        return;
    }
    setPlExportLoading(true);
    try {
        let start, end;
        const now = dayjs();
        if (type === 'today') { start = now; end = now; }
        else if (type === 'yesterday') { start = now.subtract(1, 'day'); end = now.subtract(1, 'day'); }
        else if (type === 'week') { start = now.startOf('week'); end = now.endOf('day'); }
        else if (type === 'month') { start = now.startOf('month'); end = now.endOf('month'); }
        else if (type === 'year') { start = now.startOf('year'); end = now.endOf('day'); }
        else if (type === 'custom' && dates && dates.length === 2) { start = dayjs(dates[0]); end = dayjs(dates[1]); }

        if (!start || !end) return;

        const startMs = start.startOf('day').toDate().getTime();
        const endMs = end.endOf('day').toDate().getTime();
        const startDateStr = start.format('YYYY-MM-DD');
        const endDateStr = end.format('YYYY-MM-DD');

        const [allSales, allReturns, allExpenses, allInventory] = await Promise.all([
            db.sales.where('created_at').between(new Date(startMs).toISOString(), new Date(endMs).toISOString()).toArray(),
            db.sale_returns.where('created_at').between(new Date(startMs).toISOString(), new Date(endMs).toISOString()).toArray(),
            db.expenses.where('expense_date').between(startDateStr, endDateStr).toArray(),
            db.inventory.where('updated_at').between(new Date(startMs).toISOString(), new Date(endMs).toISOString()).toArray()
        ]);

        const salesIds = allSales.map(s => s.id);
        const saleItems = await db.sale_items.where('sale_id').anyOf(salesIds).toArray();
        const returnIds = allReturns.map(r => r.id);
        const returnedItems = returnIds.length > 0 ? await db.sale_return_items.where('return_id').anyOf(returnIds).toArray() : [];

        const dailyPL = [];
        let loopDate = new Date(startDateStr);
        let endLimit = new Date(endDateStr);
        const todayDate = new Date(dayjs().format('YYYY-MM-DD'));
        if (endLimit > todayDate) endLimit = todayDate;

        while (loopDate <= endLimit) {
            const dateStr = loopDate.toISOString().split('T')[0];
            const formattedDate = dayjs(dateStr).format('dddd, DD MMM YYYY');

            const daySales = allSales.filter(s => new Date(s.sale_date || s.created_at).toISOString().split('T')[0] === dateStr);
            const grossSales = daySales.reduce((sum, s) => sum + (Number(s.subtotal) || Number(s.total_amount) || 0), 0);
            const discounts = daySales.reduce((sum, s) => sum + (Number(s.discount) || 0), 0);
            const taxes = daySales.reduce((sum, s) => sum + (Number(s.tax_amount) || 0), 0);
            const dayReturns = allReturns.filter(r => new Date(r.created_at).toISOString().split('T')[0] === dateStr);
            const refunds = dayReturns.reduce((sum, r) => sum + ((Number(r.total_refund_amount) || 0) - (Number(r.tax_refunded) || 0)), 0);
            const dayExpenses = allExpenses.filter(e => e.expense_date === dateStr);
            const expensesAmt = dayExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

            const daySaleIds = daySales.map(s => s.id);
            const daySaleItems = saleItems.filter(si => daySaleIds.includes(si.sale_id));
            let cogs = 0;
            daySaleItems.forEach(item => { cogs += (Number(item.purchase_price) || 0) * (item.quantity || 1); });

            const dayReturnIds = dayReturns.map(r => r.id);
            const dayReturnedItems = returnedItems.filter(ri => dayReturnIds.includes(ri.return_id));
            let returnCost = 0;
            for (const rItem of dayReturnedItems) {
                const sItem = saleItems.find(si => si.inventory_id === rItem.inventory_id);
                if (sItem && sItem.purchase_price) returnCost += Number(sItem.purchase_price) * (rItem.quantity || 1);
            }
            const netCogs = Math.max(0, cogs - returnCost);

            const dayDamaged = allInventory.filter(i => {
                const dDate = new Date(i.updated_at).toISOString().split('T')[0];
                return dDate === dateStr && Number(i.damaged_qty || 0) > 0;
            });
            const damagedLoss = dayDamaged.reduce((sum, i) => sum + (Number(i.purchase_price || 0) * Number(i.damaged_qty || 0)), 0);

            const grandTotal = grossSales - refunds - discounts;
            const netProfit = grandTotal - netCogs - expensesAmt - damagedLoss;

            // Sirf wo din jahan koi activity hui ho
            if (grossSales > 0 || refunds > 0 || expensesAmt > 0 || damagedLoss > 0) {
                dailyPL.push({
                    key: dateStr, date: formattedDate, gross_sales: grossSales, returns: refunds, discounts: discounts,
                    taxes: taxes, grand_total: grandTotal, cogs: netCogs, expenses: expensesAmt, damaged_loss: damagedLoss, net_profit: netProfit
                });
            }
            loopDate.setDate(loopDate.getDate() + 1);
        }
        setPlExportData(dailyPL.reverse());
    } catch (error) {
        console.error("Export calculation error:", error);
    } finally {
        setPlExportLoading(false);
    }
  };

  const handleCurrentTabExport = async () => {
    setLoading(true);
    try {
      const startDate = dateRange[0].format('YYYY-MM-DD');
      const endDate = dateRange[1].format('YYYY-MM-DD');
      const curr = profile?.currency || ''; 
      
      const finalData = [
        ["BUSINESS REPORT: " + activeTab.replace('_', ' ').toUpperCase()],
        ["Shop Name:", profile?.shop_name || 'My Shop'],
        ["Date Range:", `${startDate} to ${endDate}`],
        ["Exported On:", dayjs().format('YYYY-MM-DD HH:mm')],
        [], 
      ];

      // --- TAB 1: SALES & REVENUE ---
      if (activeTab === 'sales') {
        const data = await DataService.getSalesAndRevenueReport(startDate, endDate);
        finalData.push(["FINANCIAL SUMMARY"]);
        finalData.push(["Description", "Amount"]);
        finalData.push(["Total Cash Sales", `${curr} ${data.cashSales}`]);
        finalData.push(["Total Bank Sales", `${curr} ${data.bankSales}`]);
        finalData.push(["Total Tax Collected", `${curr} ${data.totalTaxCollected}`]);
        finalData.push(["Total Tax Refunded", `${curr} ${data.totalTaxRefunded}`]);
        finalData.push(["Net Tax Payable", `${curr} ${data.netTax}`]);
        finalData.push([]); 

        finalData.push(["CATEGORY BREAKDOWN"]);
        finalData.push(["Category Name", `Revenue (${curr})`, `Profit (${curr})`]);
        data.categoryBreakdown.forEach(c => finalData.push([c.category, c.revenue, c.profit]));
        finalData.push([]); 

        finalData.push(["STAFF PERFORMANCE"]);
        finalData.push(["Staff Name", "Invoices", "Units Sold", `Revenue (${curr})`, `Profit (${curr})`]);
        data.staffPerformance.forEach(s => finalData.push([s.name, s.sale_count, s.items_sold, s.total_sales, s.profit]));
        finalData.push([]);

        finalData.push(["TOP SELLING PRODUCTS"]);
        finalData.push(["Product Name", "Quantity Sold", `Total Revenue (${curr})`, `Total Profit (${curr})`]);
        data.topProductsByQty.forEach(p => finalData.push([p.name, p.qty, p.revenue, p.profit]));
        finalData.push([]);

        finalData.push(["DAILY SALES TREND"]);
        finalData.push(["Date", `Revenue (${curr})`, `Profit (${curr})`]);
        data.salesTrend.forEach(t => finalData.push([dayjs(t.date).format('DD MMM YYYY'), t.amount, t.profit]));
      } 

      // --- TAB 2: PROFIT & LOSS ---
      else if (activeTab === 'profit_loss') {
        const data = await DataService.getDetailedProfitLossReport(startDate, endDate);
        finalData.push(["PROFIT & LOSS STATEMENT"]);
        finalData.push(["Description", "Amount"]);
        finalData.push(["Gross Sales (Total Invoices)", `${curr} ${data.totalRevenue + (data.totalRefunds || 0)}`]);
        finalData.push(["Returns & Refunds", `- ${curr} ${data.totalRefunds || 0}`]);
        finalData.push(["Net Revenue (A)", `${curr} ${data.totalRevenue}`]);
        finalData.push(["Cost of Goods Sold (B)", `- ${curr} ${data.totalCost}`]);
        finalData.push(["Gross Profit (A - B)", `${curr} ${data.grossProfit}`]);
        finalData.push(["Total Operating Expenses (C)", `- ${curr} ${data.totalExpenses}`]);
        finalData.push(["NET PROFIT", `${curr} ${data.netProfit}`]);
        finalData.push(["Net Profit Margin", `${data.profitMargin}%`]);
        finalData.push([]);

        finalData.push(["OPERATING EXPENSES BREAKDOWN"]);
        finalData.push(["Expense Category", `Total Amount (${curr})`]);
        data.expenseBreakdown.forEach(e => finalData.push([e.category, e.amount]));
      }

      // --- TAB 3: INVENTORY & ASSETS ---
      else if (activeTab === 'inventory') {
        const data = await DataService.getInventoryReport();
        finalData.push(["INVENTORY VALUATION BY CATEGORY"]);
        finalData.push(["Category Name", "Stock Quantity", `Asset Value (${curr})`]);
        data.categoryValuation.forEach(v => finalData.push([v.name, v.qty, v.value]));
        finalData.push([]);

        finalData.push(["LOW STOCK ALERTS (5 UNITS OR LESS)"]);
        finalData.push(["Product Name", "Remaining Stock"]);
        data.lowStockItems.forEach(i => finalData.push([`${i.brand} ${i.name}`, i.current_qty]));
        finalData.push([]);

        finalData.push(["SLOW MOVING ITEMS (NO SALES IN 30 DAYS)"]);
        finalData.push(["Product Name", "Current Stock"]);
        data.slowMovingItems.forEach(i => finalData.push([`${i.brand} ${i.name}`, i.qty]));
        finalData.push([]);

        finalData.push(["DAMAGED STOCK SUMMARY"]);
        finalData.push(["Description", "Amount"]);
        finalData.push(["Total Estimated Loss from Damaged Stock", `${curr} ${data.totalDamagedLoss}`]);
      }

      // --- TAB 4: LEDGERS & ACCOUNTS ---
      else if (activeTab === 'ledgers') {
        const data = await DataService.getLedgerReport();
        finalData.push(["ACCOUNTS RECEIVABLE (CUSTOMERS)"]);
        finalData.push(["Customer Name", `Outstanding Balance (${curr})`]);
        data.topDebtors.forEach(d => finalData.push([d.name, d.balance]));
        finalData.push([]);

        finalData.push(["ACCOUNTS PAYABLE (SUPPLIERS)"]);
        finalData.push(["Supplier Name", `Outstanding Balance (${curr})`]);
        data.topCreditors.forEach(c => finalData.push([c.name, c.balance_due]));
        finalData.push([]);

        finalData.push(["ACCOUNTS SUMMARY"]);
        finalData.push(["Metric", "Amount"]);
        finalData.push(["Total Receivables (To Collect)", `${curr} ${data.totalReceivable}`]);
        finalData.push(["Total Payables (To Pay)", `${curr} ${data.totalPayable}`]);
        finalData.push(["Total Customer Credits (Overpayments/Returns)", `${curr} ${data.totalCustomerCredits}`]);
      }

      // --- TAB 5: CASH & AUDIT ---
      else if (activeTab === 'audit') {
        const data = await DataService.getCashAuditReport(startDate, endDate);
        const staff = await DataService.getStaffMembers();

        finalData.push(["STAFF LEDGER ACTIVITY"]);
        finalData.push(["Date", "Staff Name", "Transaction Type", `Amount (${curr})`, "Notes"]);
        data.staffTransactions.forEach(t => {
          const sName = staff.find(s => s.id === t.staff_id)?.name || 'Owner / Admin';
          finalData.push([dayjs(t.entry_date).format('DD MMM YYYY'), sName, t.type, t.amount, t.notes]);
        });
        finalData.push([]);

        finalData.push(["DAILY CLOSING AUDIT HISTORY"]);
        finalData.push(["Date", `Expected Cash (${curr})`, `Actual Cash (${curr})`, `Difference (${curr})`]);
        data.recentClosings.forEach(c => finalData.push([dayjs(c.closing_date).format('DD MMM YYYY'), c.expected_cash, c.actual_cash, c.difference]));
        finalData.push([]);

        finalData.push(["MANUAL CASH FLOW SUMMARY"]);
        finalData.push(["Description", "Amount"]);
        finalData.push(["Total Manual Cash In", `${curr} ${data.totalIn}`]);
        finalData.push(["Total Manual Cash Out", `${curr} ${data.totalOut}`]);
        finalData.push(["Net Closing Difference (Audit)", `${curr} ${data.totalDifference}`]);
      }

      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.aoa_to_sheet(finalData);
      worksheet['!cols'] = [{wch: 40}, {wch: 20}, {wch: 20}, {wch: 20}, {wch: 30}];
      XLSX.utils.book_append_sheet(workbook, worksheet, "Business Report");
      XLSX.writeFile(workbook, `Business_Report_${activeTab}_${dayjs().format('YYYY-MM-DD')}.xlsx`);
      message.success("Professional Report downloaded!");

    } catch (error) {
      message.error("Export failed: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // --- NAYA IZAFA: PROFESSIONAL PDF EXPORT LOGIC ---
  const handleCurrentTabPdfExport = async () => {
    setLoading(true);
    try {
      const startDate = dateRange[0].format('YYYY-MM-DD');
      const endDate = dateRange[1].format('YYYY-MM-DD');
      const curr = profile?.currency || 'USD'; // <--- NAYA IZAFA: Safe currency fallback ('USD') to prevent crash
      
      const doc = new jsPDF();
      
      // --- Professional Header ---
      doc.setFontSize(22);
      doc.setTextColor(26, 182, 201); // Aap ki Theme ka Primary Color
      doc.text(profile?.shop_name || 'My Shop', 14, 20);
      
      doc.setFontSize(14);
      doc.setTextColor(40, 40, 40);
      doc.text(`Business Report: ${activeTab.replace('_', ' ').toUpperCase()}`, 14, 28);
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Date Range: ${startDate} to ${endDate}`, 14, 34);
      doc.text(`Generated On: ${dayjs().format('DD MMM YYYY, hh:mm A')}`, 14, 40);

      let startY = 50; // Pehla table kahan se shuru hoga

      // Helper function: Table draw karne ke liye taake code chota rahe
      const addTable = (title, head, body) => {
        if (body.length === 0) return;
        
        // Agar page par jagah kam hai to naya page shuru karein
        if (startY > 250) {
            doc.addPage();
            startY = 20;
        }

        doc.setFontSize(11);
        doc.setTextColor(40, 40, 40);
        doc.text(title, 14, startY);
        
        autoTable(doc, {
          startY: startY + 4,
          head: [head],
          body: body,
          theme: 'grid',
          headStyles: { fillColor: [26, 182, 201], fontSize: 10 },
          styles: { fontSize: 9 },
        });
        
        startY = doc.lastAutoTable.finalY + 15; // Agle table ke liye jagah
      };

      // --- TAB 1: SALES & REVENUE ---
      if (activeTab === 'sales') {
        const data = await DataService.getSalesAndRevenueReport(startDate, endDate);
        
        addTable("FINANCIAL SUMMARY", ["Description", "Amount"], [
          ["Total Cash Sales", formatCurrency(data.cashSales, curr)],
          ["Total Bank Sales", formatCurrency(data.bankSales, curr)],
          ["Total Tax Collected", formatCurrency(data.totalTaxCollected, curr)],
          ["Total Tax Refunded", formatCurrency(data.totalTaxRefunded, curr)],
          ["Net Tax Payable", formatCurrency(data.netTax, curr)]
        ]);

        addTable("CATEGORY BREAKDOWN", ["Category Name", "Revenue", "Profit"], 
          data.categoryBreakdown.map(c => [c.category, formatCurrency(c.revenue, curr), formatCurrency(c.profit, curr)])
        );

        addTable("STAFF PERFORMANCE", ["Staff Name", "Invoices", "Units Sold", "Revenue", "Profit"], 
          data.staffPerformance.map(s => [s.name, s.sale_count, s.items_sold, formatCurrency(s.total_sales, curr), formatCurrency(s.profit, curr)])
        );

        addTable("TOP SELLING PRODUCTS", ["Product Name", "Quantity Sold", "Total Revenue", "Total Profit"], 
          data.topProductsByQty.map(p => [p.name, p.qty, formatCurrency(p.revenue, curr), formatCurrency(p.profit, curr)])
        );
      } 
      // --- TAB 2: PROFIT & LOSS ---
      else if (activeTab === 'profit_loss') {
        const data = await DataService.getDetailedProfitLossReport(startDate, endDate);
        
        addTable("PROFIT & LOSS STATEMENT", ["Description", "Amount"], [
          ["Gross Sales (Total Invoices)", formatCurrency(data.totalRevenue + (data.totalRefunds || 0), curr)],
          ["Returns & Refunds", `- ${formatCurrency(data.totalRefunds || 0, curr)}`],
          ["Net Revenue (A)", formatCurrency(data.totalRevenue, curr)],
          ["Cost of Goods Sold (B)", `- ${formatCurrency(data.totalCost, curr)}`],
          ["Gross Profit (A - B)", formatCurrency(data.grossProfit, curr)],
          ["Total Operating Expenses (C)", `- ${formatCurrency(data.totalExpenses, curr)}`],
          ["Damaged Stock Loss (D)", `- ${formatCurrency(data.damagedLoss || 0, curr)}`],
          ["NET PROFIT", formatCurrency(data.netProfit, curr)],
          ["Net Profit Margin", `${data.profitMargin}%`]
        ]);

        addTable("OPERATING EXPENSES BREAKDOWN", ["Expense Category", "Total Amount"], 
          data.expenseBreakdown.map(e => [e.category, formatCurrency(e.amount, curr)])
        );
      }
      // --- TAB 3: INVENTORY & ASSETS ---
      else if (activeTab === 'inventory') {
        const data = await DataService.getInventoryReport();
        
        addTable("INVENTORY SUMMARY", ["Description", "Amount / Quantity"], [
          ["Total Stock Units", `${data.totalUnits}`],
          ["Total Asset Value", formatCurrency(data.totalAssetValue, curr)],
          ["Potential Profit", formatCurrency(data.totalPotentialProfit, curr)],
          ["Damaged Stock Loss", formatCurrency(data.totalDamagedLoss || 0, curr)],
          ["Out of Stock Items", `${data.outOfStockItems?.length || 0}`]
        ]);

        addTable("INVENTORY VALUATION BY CATEGORY", ["Category Name", "Stock Quantity", "Asset Value"], 
          data.categoryValuation.map(v => [v.name, v.qty, formatCurrency(v.value, curr)])
        );

        addTable("BRAND-WISE VALUATION", ["Brand Name", "Stock Quantity", "Asset Value", "Potential Profit"], 
          data.brandValuation.map(v => [v.name, v.qty, formatCurrency(v.value, curr), formatCurrency(v.profit, curr)])
        );

        addTable("LOW STOCK ALERTS", ["Product Name", "Remaining Stock"], 
          data.lowStockItems.map(i => [`${i.brand} ${i.name}`, i.current_qty])
        );

        addTable("SLOW MOVING ITEMS", ["Product Name", "Current Stock"], 
          data.slowMovingItems.map(i => [`${i.brand} ${i.name}`, i.qty])
        );
      }
      // --- TAB 4: LEDGERS & ACCOUNTS ---
      else if (activeTab === 'ledgers') {
        const data = await DataService.getLedgerReport();
        
        addTable("ACCOUNTS SUMMARY", ["Metric", "Amount"], [
          ["Total Receivables (To Collect)", formatCurrency(data.grandTotalReceivable, curr)], // Fixed
          ["Total Payables (To Pay)", formatCurrency(data.grandTotalPayable, curr)], // Fixed
          ["Net Cash Position", formatCurrency(data.netPosition, curr)], // Added
          ["Total Customer Credits", formatCurrency(data.totalCustomerCredits, curr)]
        ]);

        addTable("ACCOUNTS RECEIVABLE (CUSTOMERS)", ["Customer Name", "Outstanding Balance"], 
          data.topDebtors.map(d => [d.name, formatCurrency(d.balance, curr)])
        );

        addTable("CUSTOMER CREDITS", ["Customer Name", "Credit Amount"], 
          data.topCreditCustomers.map(d => [d.name, formatCurrency(d.balance, curr)])
        );

        addTable("ACCOUNTS PAYABLE (SUPPLIERS)", ["Supplier Name", "Outstanding Balance"], 
          data.topCreditors.map(c => [c.name, formatCurrency(c.balance, curr)]) // Fixed: balance_due to balance
        );

        addTable("SUPPLIER CREDITS", ["Supplier Name", "Credit Amount"], 
          data.topSupplierCredits.map(c => [c.name, formatCurrency(c.balance, curr)])
        );

        addTable("STAFF ACCOUNTS", ["Staff Name", "Balance (Advance / Salary Due)"], 
          data.staffBalances.map(s => [s.name, formatCurrency(s.balance, curr)])
        );
      }
      // --- TAB 5: CASH & AUDIT ---
      else if (activeTab === 'audit') {
        const data = await DataService.getCashAuditReport(startDate, endDate);
        const staff = await DataService.getStaffMembers();
        
        addTable("CASH & AUDIT SUMMARY", ["Description", "Amount"], [
          ["Total Manual Cash In", formatCurrency(data.totalIn, curr)],
          ["Total Manual Cash Out", formatCurrency(data.totalOut, curr)],
          ["Total Shortages (Missing Cash)", formatCurrency(data.totalShortage || 0, curr)], // Naya Izafa
          ["Net Audit Difference", formatCurrency(data.netDifference || 0, curr)] // Fixed: totalDifference se netDifference
        ]);

        addTable("STAFF LEDGER ACTIVITY", ["Date", "Staff Name", "Transaction Type", "Amount", "Notes"], 
          data.staffTransactions.map(t => {
            const sName = staff.find(s => s.id === t.staff_id)?.name || 'Owner / Admin';
            return [dayjs(t.entry_date).format('DD MMM YYYY'), sName, t.type, formatCurrency(t.amount, curr), t.notes || '-'];
          })
        );

        // NAYA IZAFA: Recent Closing Audit ka table jo miss ho gaya tha
        addTable("RECENT CLOSING AUDIT", ["Date", "Staff Name", "Expected Cash", "Actual Cash", "Difference", "Remarks"], 
          data.recentClosings.map(c => {
            const sName = staff.find(s => s.id === c.staff_id)?.name || 'Owner / Admin';
            return [
              dayjs(c.closed_at).format('DD MMM, hh:mm A'), 
              sName, 
              formatCurrency(c.expected_closing, curr), 
              formatCurrency(c.actual_closing, curr), 
              formatCurrency(c.difference, curr), 
              c.notes || '-'
            ];
          })
        );
      }
      // --- TAB 6: ACCOUNT LEDGERS (VAULT FLOW) ---
      else if (activeTab === 'vault_flow') {
        const summaryBody = [];
        const allLedgersToPrint = []; // Jin accounts mein transactions hongi, unko yahan save karenge

        // 1. Tamam Counters ka data jama karna
        for (const reg of allRegisters) {
          const bal = await DataService.getRegisterCurrentCash(reg.id);
          summaryBody.push([`${reg.name} (Counter)`, formatCurrency(bal, curr)]);
          
          const ledger = await DataService.getRegisterLedger(reg.id);
          if (ledger && ledger.length > 0) {
            allLedgersToPrint.push({ name: `${reg.name} (Counter)`, data: ledger });
          }
        }

        // 2. Tamam Banks/Wallets ka data jama karna
        for (const acc of paymentAccounts) {
          const ledger = await DataService.getBankAccountLedger(acc.name);
          
          // Bank ka balance nikalna
          const openingBal = Number(acc.opening_balance) || 0;
          let bal = openingBal;
          ledger.forEach(tx => {
              if (tx.type === 'Credit (In)') bal += Number(tx.amount);
              if (tx.type === 'Debit (Out)') bal -= Number(tx.amount);
          });
          
          summaryBody.push([`${acc.name} (Bank/Wallet)`, formatCurrency(bal, curr)]);
          
          if (ledger && ledger.length > 0) {
            allLedgersToPrint.push({ name: `${acc.name} (Bank/Wallet)`, data: ledger });
          }
        }

        // 3. Pehle sab accounts ki 'Master Summary' print karein
        addTable("ALL ACCOUNTS SUMMARY", ["Account Name", "Current Estimated Balance"], summaryBody);

        // 4. Phir har account ka alag alag Ledger print karein
        for (const accLedger of allLedgersToPrint) {
          addTable(`LEDGER: ${accLedger.name.toUpperCase()}`, ["Date & Time", "Source", "Description", "Type", "Amount"], 
            accLedger.data.map(tx => {
              let amountStr = formatCurrency(tx.amount, curr);
              if (tx.type === 'Credit (In)') amountStr = `+ ${amountStr}`;
              else if (tx.type === 'Debit (Out)') amountStr = `- ${amountStr}`;
              
              return [
                dayjs(tx.date).format('DD MMM YYYY, hh:mm A'), 
                tx.source, 
                tx.notes || '-', 
                tx.type, 
                amountStr
              ];
            })
          );
        }
      }

      // Print Dialog open karna
      doc.autoPrint();
      window.open(doc.output('bloburl'), '_blank');
      message.success("Professional PDF Report prepared!");

    } catch (error) {
      message.error("PDF Export failed: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMasterExport = async () => {
    setLoading(true); // Export ke waqt spinner dikhayen
    try {
      const startDate = dateRange[0].format('YYYY-MM-DD');
      const endDate = dateRange[1].format('YYYY-MM-DD');

      // Sab se ahem: Saara data aik saath database se mangwana
      const [ovData, slData, plData, invData, ldData, adData] = await Promise.all([
        DataService.getReportsOverview(startDate, endDate),
        DataService.getSalesAndRevenueReport(startDate, endDate),
        DataService.getDetailedProfitLossReport(startDate, endDate),
        DataService.getInventoryReport(),
        DataService.getLedgerReport(),
        DataService.getCashAuditReport(startDate, endDate)
      ]);

      const sheets = [];

      // 1. Overview Sheet
      sheets.push({
        name: 'Overview',
        data: [
          { Metric: 'Total Revenue', Amount: ovData.totalRevenue },
          { Metric: 'Net Profit', Amount: ovData.netProfit },
          { Metric: 'Total Expenses', Amount: ovData.totalExpenses },
          { Metric: 'Stock Value', Amount: ovData.totalInventoryValue },
          { Metric: 'Receivables (Udhaar)', Amount: ovData.totalReceivables },
          { Metric: 'Payables (Supplier)', Amount: ovData.totalPayables },
        ]
      });

      // 2. Sales & Staff Sheet
      if (slData.staffPerformance.length > 0) {
        sheets.push({ name: 'Staff Performance', data: slData.staffPerformance });
      }

      // 3. Top Products Sheet
      if (slData.topProductsByQty.length > 0) {
        sheets.push({ name: 'Top Selling Products', data: slData.topProductsByQty });
      }

      // 4. Expense Sheet
      if (plData.expenseBreakdown.length > 0) {
        sheets.push({ name: 'Expense Breakdown', data: plData.expenseBreakdown });
      }

      // 5. Inventory Valuation Sheet
      if (invData.categoryValuation.length > 0) {
        sheets.push({ name: 'Inventory Valuation', data: invData.categoryValuation });
      }

      // 6. Low Stock Sheet
      if (invData.lowStockItems.length > 0) {
        sheets.push({ name: 'Low Stock Alerts', data: invData.lowStockItems });
      }

      // 7. Khata Sheet
      if (ldData.topDebtors.length > 0) {
        sheets.push({ name: 'Customer Balances', data: ldData.topDebtors });
      }

      downloadExcel(sheets, 'Full_Business_Report');
    } catch (error) {
      message.error("Export failed: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // --- DATA FETCHING FUNCTION ---
  useEffect(() => {
    const fetchReportData = async () => {
      setLoading(true);
      try {
        const startDate = dateRange[0].format('YYYY-MM-DD');
        const endDate = dateRange[1].format('YYYY-MM-DD');

        if (activeTab === 'overview') {
          const data = await DataService.getReportsOverview(startDate, endDate);
          setOverviewData(data);
        } 
        else if (activeTab === 'sales') {
          // NAYA IZAFA: Sales Data mangwana
          const data = await DataService.getSalesAndRevenueReport(startDate, endDate);
          setSalesData(data);
        }
        else if (activeTab === 'profit_loss') {
          // NAYA IZAFA: Profit & Loss Data mangwana (Sirf Top Cards aur Charts ke liye)
          const data = await DataService.getDetailedProfitLossReport(startDate, endDate);
          setProfitLossData(data);
        }
        else if (activeTab === 'inventory') {
          // NAYA IZAFA: Inventory Data mangwana
          const data = await DataService.getInventoryReport();
          setInventoryData(data);
        }
        else if (activeTab === 'ledgers') {
          // NAYA IZAFA: Ledger Data mangwana
          const data = await DataService.getLedgerReport();
          setLedgerData(data);
        }
        else if (activeTab === 'audit') {
          // NAYA IZAFA: Audit Data mangwana
          const data = await DataService.getCashAuditReport(startDate, endDate);
          const staff = await DataService.getStaffMembers(); // Naya: Staff members layein
          setAuditData(data);
          setStaffList(staff); // Naya: Staff list save karein
        }
        else if (activeTab === 'vault_flow') {
          const regs = await DataService.getRegisters();
          setAllRegisters(regs);
          
          let accounts = [];
          let banks = []; // <--- NAYA IZAFA: Variable ko azaad kar diya gaya hai
          if (DataService.getPaymentAccounts) {
              accounts = await DataService.getPaymentAccounts();
              // Sirf Bank/Wallets filter karein kyunke Cash to Counter hai
              banks = accounts.filter(a => a.type !== 'Cash'); // <--- 'const' hata diya
              setPaymentAccounts(banks);
          }

          // NAYA IZAFA: Staff aur Active Sessions mangwayein taake cards par naam likh sakein
          const staff = await DataService.getStaffMembers();
          setStaffList(staff);
          const sessions = await db.register_sessions.filter(s => !s.closed_at).toArray();
          setActiveSessionsData(sessions);

          // NAYA IZAFA: Customers aur Suppliers ko local database se load karwana
          const custs = await db.customers.toArray();
          setCustomerList(custs.filter(c => c.is_active !== false));
          const sups = await db.suppliers.toArray();
          setSupplierList(sups.filter(s => s.is_active !== false));

          // NAYA IZAFA: Default Selection ab "All Accounts" hogi
          if (!selectedRegForLedger) {
              setSelectedRegForLedger('all');
              setSelectedAccountType('all');
          }

          // NAYA IZAFA: All Accounts (Master Ledger) Logic
          if (selectedRegForLedger === 'all' || !selectedRegForLedger) {
              let combinedLedger = [];
              let totalCombinedCash = 0;

              // 1. Saare Counters ka data aur balance jama karein
              for (const reg of regs) {
                  const ledger = await DataService.getRegisterLedger(reg.id);
                  const cash = await DataService.getRegisterCurrentCash(reg.id);
                  totalCombinedCash += cash;
                  // Har entry ke sath uske account ka naam jod dein
                  combinedLedger.push(...ledger.map(tx => ({ ...tx, account_name: reg.name })));
              }

              // 2. Saare Banks/Wallets ka data aur balance jama karein
              for (const acc of banks) {
                  const ledger = await DataService.getBankAccountLedger(acc.name);
                  const openingBal = Number(acc.opening_balance) || 0;
                  let bal = openingBal;
                  ledger.forEach(tx => {
                      if (tx.type === 'Credit (In)') bal += Number(tx.amount);
                      if (tx.type === 'Debit (Out)') bal -= Number(tx.amount);
                  });
                  totalCombinedCash += bal;
                  combinedLedger.push(...ledger.map(tx => ({ ...tx, account_name: acc.name })));
              }

              // Sab ko waqt ke hisaab se tarteeb dein (Newest first)
              combinedLedger.sort((a, b) => new Date(b.date) - new Date(a.date));
              setRegisterLedgerData(combinedLedger);
              setCurrentCounterCash(totalCombinedCash);

          } else if (selectedAccountType === 'counter') {
              const ledger = await DataService.getRegisterLedger(selectedRegForLedger);
              const regName = regs.find(r => r.id === selectedRegForLedger)?.name || 'Counter';
              setRegisterLedgerData(ledger.map(tx => ({ ...tx, account_name: regName })));
              const trueCash = await DataService.getRegisterCurrentCash(selectedRegForLedger);
              setCurrentCounterCash(trueCash);
          } else {
              const ledger = await DataService.getBankAccountLedger(selectedRegForLedger);
              setRegisterLedgerData(ledger.map(tx => ({ ...tx, account_name: selectedRegForLedger })));
              
              const accDetails = banks.find(a => a.name === selectedRegForLedger);
              const openingBal = accDetails ? Number(accDetails.opening_balance) || 0 : 0;
              let bal = openingBal;
              ledger.forEach(tx => {
                  if (tx.type === 'Credit (In)') bal += Number(tx.amount);
                  if (tx.type === 'Debit (Out)') bal -= Number(tx.amount);
              });
              setCurrentCounterCash(bal);
          }
        }
      } catch (error) {
        console.error("Failed to fetch report data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchReportData();

    // NAYA IZAFA: Background mein data download hone par Reports page ko Live Refresh karna
    window.addEventListener('local-db-updated', fetchReportData);
    return () => window.removeEventListener('local-db-updated', fetchReportData);
  }, [dateRange, activeTab, selectedRegForLedger, selectedAccountType]); // <--- NAYA IZAFA: selectedAccountType add kiya taake state hamesha fresh rahe

  // --- NAYA IZAFA: Independent Daily P&L Table Calculator (Reacts to Local Filters) ---
  useEffect(() => {
    const fetchDailyPLTable = async () => {
      if (activeTab !== 'profit_loss') return;
      setIsPLTableLoading(true);
      try {
        let start, end;
        const now = dayjs();
        
        // Decide which date range to use
        if (plTableDateType === 'sync') {
            start = dateRange[0]; end = dateRange[1];
        } else if (plTableDateType === 'today') {
            start = now.startOf('day'); end = now.endOf('day');
        } else if (plTableDateType === 'this_month') {
            start = now.startOf('month'); end = now.endOf('month');
        } else if (plTableDateType === 'last_month') {
            start = now.subtract(1, 'month').startOf('month'); end = now.subtract(1, 'month').endOf('month');
        } else if (plTableDateType === 'custom' && plTableCustomDates.length === 2) {
            start = dayjs(plTableCustomDates[0]).startOf('day'); end = dayjs(plTableCustomDates[1]).endOf('day');
        }

        if (!start || !end) return;

        const startMs = start.toDate().getTime();
        const endMs = end.toDate().getTime();
        const startDateStr = start.format('YYYY-MM-DD');
        const endDateStr = end.format('YYYY-MM-DD');

        const [allSales, allReturns, allExpenses, allInventory] = await Promise.all([
            db.sales.where('created_at').between(new Date(startMs).toISOString(), new Date(endMs).toISOString()).toArray(),
            db.sale_returns.where('created_at').between(new Date(startMs).toISOString(), new Date(endMs).toISOString()).toArray(),
            db.expenses.where('expense_date').between(startDateStr, endDateStr).toArray(),
            db.inventory.where('updated_at').between(new Date(startMs).toISOString(), new Date(endMs).toISOString()).toArray()
        ]);

        const salesIds = allSales.map(s => s.id);
        const saleItems = await db.sale_items.where('sale_id').anyOf(salesIds).toArray();
        const returnIds = allReturns.map(r => r.id);
        const returnedItems = returnIds.length > 0 ? await db.sale_return_items.where('return_id').anyOf(returnIds).toArray() : [];

        const dailyPL = [];
        let loopDate = new Date(startDateStr);
        let endLimit = new Date(endDateStr);
        
        // Future dates block logic
        const todayDate = new Date(now.format('YYYY-MM-DD'));
        if (endLimit > todayDate) endLimit = todayDate;

        while (loopDate <= endLimit) {
            const dateStr = loopDate.toISOString().split('T')[0];
            const formattedDate = dayjs(dateStr).format('dddd, DD MMM YYYY');

            const daySales = allSales.filter(s => new Date(s.sale_date || s.created_at).toISOString().split('T')[0] === dateStr);
            const grossSales = daySales.reduce((sum, s) => sum + (Number(s.subtotal) || Number(s.total_amount) || 0), 0);
            const discounts = daySales.reduce((sum, s) => sum + (Number(s.discount) || 0), 0);
            const taxes = daySales.reduce((sum, s) => sum + (Number(s.tax_amount) || 0), 0);
            const dayReturns = allReturns.filter(r => new Date(r.created_at).toISOString().split('T')[0] === dateStr);
            const refunds = dayReturns.reduce((sum, r) => sum + ((Number(r.total_refund_amount) || 0) - (Number(r.tax_refunded) || 0)), 0);
            const dayExpenses = allExpenses.filter(e => e.expense_date === dateStr);
            const expensesAmt = dayExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

            const daySaleIds = daySales.map(s => s.id);
            const daySaleItems = saleItems.filter(si => daySaleIds.includes(si.sale_id));
            let cogs = 0;
            daySaleItems.forEach(item => { cogs += (Number(item.purchase_price) || 0) * (item.quantity || 1); });

            const dayReturnIds = dayReturns.map(r => r.id);
            const dayReturnedItems = returnedItems.filter(ri => dayReturnIds.includes(ri.return_id));
            let returnCost = 0;
            for (const rItem of dayReturnedItems) {
                const sItem = saleItems.find(si => si.inventory_id === rItem.inventory_id);
                if (sItem && sItem.purchase_price) returnCost += Number(sItem.purchase_price) * (rItem.quantity || 1);
            }
            const netCogs = Math.max(0, cogs - returnCost);

            const dayDamaged = allInventory.filter(i => {
                const dDate = new Date(i.updated_at).toISOString().split('T')[0];
                return dDate === dateStr && Number(i.damaged_qty || 0) > 0;
            });
            const damagedLoss = dayDamaged.reduce((sum, i) => sum + (Number(i.purchase_price || 0) * Number(i.damaged_qty || 0)), 0);

            const grandTotal = grossSales - refunds - discounts;
            const netProfit = grandTotal - netCogs - expensesAmt - damagedLoss;

            // Sirf wo din jahan koi activity hui ho
            if (grossSales > 0 || refunds > 0 || expensesAmt > 0 || damagedLoss > 0) {
                dailyPL.push({
                    key: dateStr, date: formattedDate, gross_sales: grossSales, returns: refunds, discounts: discounts,
                    taxes: taxes, grand_total: grandTotal, cogs: netCogs, expenses: expensesAmt, damaged_loss: damagedLoss, net_profit: netProfit
                });
            }
            loopDate.setDate(loopDate.getDate() + 1);
        }
        setDailyPLList(dailyPL.reverse());
      } catch (err) {
        console.error("Daily PL Table Error:", err);
      } finally {
        setIsPLTableLoading(false);
      }
    };
    fetchDailyPLTable();
  }, [activeTab, dateRange, plTableDateType, plTableCustomDates]);

  // --- OVERVIEW TAB UI ---
  const renderOverviewTab = () => {
    if (loading || !overviewData) return <div style={{ textAlign: 'center', padding: '50px' }}><Spin size="large" /></div>;

    return (
      <div style={{ marginTop: '16px' }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={8}>
            <Card style={{ ...cardStyle, borderLeft: `4px solid ${token.colorPrimary}` }}>
              <Statistic title="Total Revenue (Sales)" value={overviewData.totalRevenue} prefix={<ShoppingOutlined />} formatter={(val) => formatCurrency(val, profile?.currency)} />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Card style={{ borderRadius: 8, borderLeft: `4px solid ${token.colorAmountPositive}` }}>
              <Statistic title="Net Profit" value={overviewData.netProfit} prefix={<RiseOutlined />} valueStyle={{ color: token.colorAmountPositive }} formatter={(val) => formatCurrency(val, profile?.currency)} />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Card style={{ borderRadius: 8, borderLeft: `4px solid ${token.colorWarning}` }}>
              <Statistic title="Total Expenses" value={overviewData.totalExpenses} prefix={<ArrowDownOutlined />} valueStyle={{ color: token.colorWarning }} formatter={(val) => formatCurrency(val, profile?.currency)} />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Card style={{ borderRadius: 8, borderLeft: `4px solid ${token.colorInfo}` }}>
              <Statistic title="Current Stock Value" value={overviewData.totalInventoryValue} prefix={<InboxOutlined />} formatter={(val) => formatCurrency(val, profile?.currency)} />
              <Text style={{ fontSize: '11px', color: token.colorCardColumnsTitleText }}>*Based on purchase price of available items</Text>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Card style={{ borderRadius: 8, borderLeft: `4px solid ${token.colorAmountNegative}` }}>
              <Statistic title="Accounts Receivable" value={overviewData.totalReceivables} prefix={<WalletOutlined />} valueStyle={{ color: token.colorAmountNegative }} formatter={(val) => formatCurrency(val, profile?.currency)} />
              <Text style={{ fontSize: '11px', color: token.colorCardColumnsTitleText }}>*Outstanding from Customers & Staff</Text>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Card style={{ borderRadius: 8, borderLeft: `4px solid #faad14` }}>
              <Statistic title="Accounts Payable" value={overviewData.totalPayables} prefix={<WalletOutlined />} formatter={(val) => formatCurrency(val, profile?.currency)} />
              <Text style={{ fontSize: '11px', color: token.colorCardColumnsTitleText }}>*Outstanding to Suppliers</Text>
            </Card>
          </Col>
        </Row>
      </div>
    );
  };

  // --- UPDATED: SALES & REVENUE TAB UI (With Trend Graph) ---
  const renderSalesTab = () => {
    if (loading || !salesData) return <div style={{ textAlign: 'center', padding: '50px' }}><Spin size="large" /></div>;

    const totalSales = salesData.cashSales + salesData.bankSales;
    const cashPercent = totalSales > 0 ? Math.round((salesData.cashSales / totalSales) * 100) : 0;
    const bankPercent = totalSales > 0 ? Math.round((salesData.bankSales / totalSales) * 100) : 0;
    // Doughnut Chart Data Setup
    // Doughnut Chart (Revenue vs Profit) Data Setup
    const doughnutData = {
      labels: salesData.categoryBreakdown?.map(item => item.category) || [],
      datasets: [
        {
          data: salesData.categoryBreakdown?.map(item => 
            catChartFilter === 'revenue' ? item.revenue : item.profit
          ) || [],
          backgroundColor: [
            '#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#13c2c2', '#eb2f96'
          ],
          borderColor: token.colorBgContainer,
          borderWidth: 2,
          cutout: '70%', // Beech mein jagah banane ke liye
        },
      ],
    };

    // Custom Plugin: Center mein Total dikhane ke liye
    const centerTextPlugin = {
      id: 'centerText',
      beforeDraw: (chart) => {
        const { ctx, chartArea: { left, right, top, bottom } } = chart;
        ctx.save();
        
        // Doughnut ka asli center nikalna (Legend ko nikaal kar)
        const centerX = (left + right) / 2;
        const centerY = (top + bottom) / 2;

        ctx.fillStyle = token.colorCardHeadingsText;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // 1. Chota Label (Oopar wala text)
        ctx.font = '11px sans-serif';
        ctx.globalAlpha = 0.7; // Thora halka rang
        ctx.fillText(catChartFilter === 'revenue' ? 'Total Revenue' : 'Total Profit', centerX, centerY - 12);
        
        // 2. Bara Number (Niche wali raqam)
        const total = doughnutData.datasets[0].data.reduce((a, b) => a + b, 0);
        ctx.font = 'bold 15px sans-serif';
        ctx.globalAlpha = 1; // Mukammal wazeh
        ctx.fillText(formatCurrency(total, profile?.currency), centerX, centerY + 10);
        
        ctx.restore();
      }
    };

    // Line Chart (Revenue + Profit) Data Setup
    const lineData = {
      labels: salesData.salesTrend?.map(item => dayjs(item.date).format('DD MMM')) || [],
      datasets: [
        {
          fill: true,
          label: 'Revenue',
          data: salesData.salesTrend?.map(item => item.amount) || [],
          borderColor: token.colorPrimary,
          backgroundColor: 'rgba(24, 144, 255, 0.1)',
          tension: 0.4,
          pointRadius: 3,
        },
        {
          fill: true,
          label: 'Profit',
          data: salesData.salesTrend?.map(item => item.profit) || [],
          borderColor: token.colorAmountPositive,
          backgroundColor: 'rgba(82, 196, 26, 0.1)', 
          tension: 0.4,
          pointRadius: 3,
        },
      ],
    };

    return (
      <div style={{ marginTop: '16px' }}>
        {/* Row 1: Dono Charts Side-by-Side */}
        <Row gutter={[16, 16]}>
          {/* Left Side: Sales Trend */}
          <Col xs={24} lg={14}>
            <Card title={<Text strong style={{ fontSize: '16px', color: token.colorCardHeadingsText }}>Sales Trend (Revenue Over Time)</Text>} style={cardStyle}>
              {salesData.salesTrend?.length > 0 ? (
                <div style={{ height: 300 }}>
                  <Line data={lineData} options={lineOptions} />
                </div>
              ) : (
                <Empty description="Not enough data to show trend" />
              )}
            </Card>
          </Col>

          {/* Right Side: Category Breakdown (With Toggle & Label) */}
          <Col xs={24} lg={10}>
            <Card 
              title={<Text strong style={{ fontSize: '16px', color: token.colorCardHeadingsText }}>Category Breakdown</Text>} 
              extra={
                <Space size="small">
                  <Text style={{ fontSize: '12px', color: token.colorCardColumnsTitleText }}>View by:</Text>
                  <Radio.Group 
                    value={catChartFilter} 
                    onChange={(e) => setCatChartFilter(e.target.value)} 
                    size="small"
                    buttonStyle="solid"
                  >
                    <Radio.Button value="revenue">Revenue</Radio.Button>
                    <Radio.Button value="profit">Profit</Radio.Button>
                  </Radio.Group>
                </Space>
              }
              style={cardStyle}
            >
              <div style={{ height: 300, display: 'flex', justifyContent: 'center' }}>
                {salesData.categoryBreakdown?.length > 0 ? (
                  <Doughnut data={doughnutData} options={doughnutOptions} plugins={[centerTextPlugin]} />
                ) : (
                  <Empty description="No category data available" />
                )}
              </div>
            </Card>
          </Col>
        </Row>

        {/* Row 2: Consolidated Financial Summary (Aligned & Perfected) */}
        <Card 
          title={<Text strong style={{ fontSize: '16px', color: token.colorCardHeadingsText }}><RiseOutlined /> Financial Performance & Tax Summary</Text>}
          size="small"
          style={{ ...cardStyle, marginTop: '16px', height: 'auto' }} 
          styles={{ body: { padding: '16px 24px' } }}
        >
          <Row gutter={[24, 16]} align="top">
            {/* Cash Sales */}
            <Col xs={24} sm={12} md={5}>
              <Statistic 
                title={<Space><WalletOutlined style={{ color: token.colorAmountPositive }} /> Cash Sales</Space>} 
                value={salesData.cashSales} 
                formatter={(val) => formatCurrency(val, profile?.currency)} 
                valueStyle={{ fontSize: '20px' }}
              />
              <div style={{ height: '25px', marginTop: 4 }}>
                <Progress percent={cashPercent} size="small" strokeColor={token.colorAmountPositive} showInfo={false} style={{ marginBottom: 2 }} />
                <div style={{ marginTop: '-8px' }}>
                  <Text type="secondary" style={{ fontSize: '13px', fontWeight: 500 }}>{cashPercent}% of total</Text>
                </div>
              </div>
            </Col>

            {/* Bank Sales */}
            <Col xs={24} sm={12} md={5}>
              <Statistic 
                title={<Space><BankOutlined style={{ color: token.colorInfo }} /> Bank / Online</Space>} 
                value={salesData.bankSales} 
                formatter={(val) => formatCurrency(val, profile?.currency)} 
                valueStyle={{ fontSize: '20px' }}
              />
              <div style={{ height: '25px', marginTop: 4 }}>
                <Progress percent={bankPercent} size="small" strokeColor={token.colorInfo} showInfo={false} style={{ marginBottom: 2 }} />
                <div style={{ marginTop: '-8px' }}>
                  <Text type="secondary" style={{ fontSize: '13px', fontWeight: 500 }}>{bankPercent}% of total</Text>
                </div>
              </div>
            </Col>

            {/* Vertical Divider for Desktop */}
            {!isMobile && <Divider type="vertical" style={{ height: '80px', borderLeft: `1px solid ${token.colorBorderSecondary}`, marginTop: '10px' }} />}

            {/* Tax Collected */}
            <Col xs={12} md={4}>
              <Statistic 
                title={<Space><SafetyCertificateOutlined /> Tax Collected</Space>} 
                value={salesData.totalTaxCollected} 
                formatter={(val) => formatCurrency(val, profile?.currency)} 
                valueStyle={{ fontSize: '18px' }}
              />
              <div style={{ height: '20px' }} /> {/* Spacer taake amount seedh mein rahe */}
            </Col>

            {/* Tax Refunded */}
            <Col xs={12} md={4}>
              <Statistic 
                title={<Space><ArrowDownOutlined /> Tax Refunded</Space>} 
                value={salesData.totalTaxRefunded} 
                valueStyle={{ color: token.colorAmountNegative, fontSize: '18px' }} 
                formatter={(val) => formatCurrency(val, profile?.currency)} 
              />
              <div style={{ height: '20px' }} /> {/* Spacer */}
            </Col>

            {/* Net Tax */}
            <Col xs={24} md={4}>
              <Statistic 
                title={<Space><DollarOutlined style={{ color: token.colorWarning }} /> Net Tax Due</Space>} 
                value={salesData.netTax} 
                valueStyle={{ color: token.colorWarning, fontSize: '20px', fontWeight: 'bold' }} 
                formatter={(val) => formatCurrency(val, profile?.currency)} 
              />
              <div style={{ height: '20px' }} /> {/* Spacer */}
            </Col>
          </Row>
        </Card>

        <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
          {/* Staff Performance (Aligned Header) */}
          <Col xs={24} lg={12}>
            <Card 
              title={<Text strong style={{ fontSize: '16px', color: token.colorCardHeadingsText }}><TeamOutlined /> Staff Performance</Text>} 
              extra={<div style={{ height: 24 }} />} 
              style={cardStyle} 
              styles={{ body: { padding: 0 } }}
            >
              <Table
                dataSource={salesData.staffPerformance}
                rowKey="name"
                pagination={false}
                scroll={{ x: true }}
                columns={[
                  { title: 'Staff Name', dataIndex: 'name', key: 'name' },
                  { title: 'Invoices', dataIndex: 'sale_count', key: 'sale_count', align: 'center', render: (val) => <Tag>{val}</Tag> },
                  { title: 'Items Sold', dataIndex: 'items_sold', key: 'items_sold', align: 'center', render: (val) => <Text>{val}</Text> },
                  { title: 'Revenue', dataIndex: 'total_sales', key: 'total_sales', align: 'right', render: (val) => <Text strong>{formatCurrency(val, profile?.currency)}</Text> },
                  { title: 'Profit', dataIndex: 'profit', key: 'profit', align: 'right', render: (val) => <Text strong style={{ color: token.colorAmountPositive }}>{formatCurrency(val, profile?.currency)}</Text> }
                ]}
              />
            </Card>
          </Col>

          {/* Top Selling Products (Aligned Header & Rich Data) */}
          <Col xs={24} lg={12}>
            <Card 
              title={<Text strong style={{ fontSize: '16px', color: token.colorCardHeadingsText }}><TrophyOutlined style={{ color: '#faad14' }} /> Top 10 Selling Products</Text>} 
              extra={
                <Space size="small">
                  <Text style={{ fontSize: '12px', color: token.colorCardColumnsTitleText }}>Sort by:</Text>
                  <Radio.Group 
                    value={productFilter} 
                    onChange={(e) => setProductFilter(e.target.value)} 
                    size="small" 
                    buttonStyle="solid"
                  >
                    <Radio.Button value="qty">Qty</Radio.Button>
                    <Radio.Button value="rev">Revenue</Radio.Button>
                    <Radio.Button value="profit">Profit</Radio.Button>
                  </Radio.Group>
                </Space>
              }
              style={cardStyle} 
              styles={{ body: { padding: 0 } }}
            >
              <Table
                dataSource={
                  productFilter === 'qty' ? salesData.topProductsByQty :
                  productFilter === 'rev' ? salesData.topProductsByRev : 
                  salesData.topProductsByProfit
                }
                rowKey="name"
                pagination={false}
                size="small"
                scroll={{ x: true }}
                columns={[
                  { title: 'Product', dataIndex: 'name', key: 'name' },
                  { 
                    title: 'Qty', 
                    dataIndex: 'qty', 
                    key: 'qty', 
                    align: 'center', 
                    render: (val) => <Tag color={productFilter === 'qty' ? 'blue' : 'default'}>{val}</Tag> 
                  },
                  { 
                    title: 'Revenue', 
                    dataIndex: 'revenue', 
                    key: 'revenue', 
                    align: 'right', 
                    render: (val) => <Text strong style={{ color: productFilter === 'rev' ? token.colorPrimary : 'inherit' }}>{formatCurrency(val, profile?.currency)}</Text> 
                  },
                  { 
                    title: 'Profit', 
                    dataIndex: 'profit', 
                    key: 'profit', 
                    align: 'right', 
                    render: (val) => <Text strong style={{ color: productFilter === 'profit' ? token.colorAmountPositive : 'inherit', opacity: productFilter === 'profit' ? 1 : 0.6 }}>{formatCurrency(val, profile?.currency)}</Text> 
                  }
                ]}
              />
            </Card>
          </Col>
        </Row>
      </div>
    );
  };

  // --- NAYA IZAFA: PROFIT & LOSS TAB UI ---
  // --- UPDATED: PROFESSIONAL PROFIT & LOSS TAB UI ---
  const renderProfitLossTab = () => {
    if (loading || !profitLossData) return <div style={{ textAlign: 'center', padding: '50px' }}><Spin size="large" /></div>;

    // 1. Line Chart Data (Always showing both for consistency)
    const profitTrendData = {
      labels: profitLossData.profitTrend?.map(item => item.date) || [],
      datasets: [
        {
          label: 'Daily Profit',
          data: profitLossData.profitTrend?.map(item => item.profit) || [],
          borderColor: token.colorAmountPositive,
          backgroundColor: 'rgba(82, 196, 26, 0.1)',
          fill: true, tension: 0.4, pointRadius: 3,
        },
        {
          label: 'Daily Expenses',
          data: profitLossData.profitTrend?.map(item => item.expense) || [],
          borderColor: token.colorWarning,
          backgroundColor: 'rgba(250, 173, 20, 0.1)',
          fill: true, tension: 0.4, pointRadius: 3,
        }
      ]
    };

    // 2. Doughnut Chart Data (Simplified - Amount Only)
    const expenseChartData = {
      labels: profitLossData.expenseBreakdown?.map(item => item.category) || [],
      datasets: [{
        data: profitLossData.expenseBreakdown?.map(item => item.amount) || [],
        backgroundColor: ['#f5222d', '#fa8c16', '#fadb14', '#8bc34a', '#13c2c2', '#2f54eb', '#722ed1'],
        hoverOffset: 4,
        borderColor: token.colorBgContainer,
        borderWidth: 2,
        cutout: '70%',
      }]
    };

    // Simplified Expense Center Text (No VOID/Frequency Confusion)
    const expCenterTextPlugin = {
      id: 'expCenterText',
      beforeDraw: (chart) => {
        const { ctx, chartArea: { left, right, top, bottom } } = chart;
        ctx.save();
        const centerX = (left + right) / 2;
        const centerY = (top + bottom) / 2;
        ctx.fillStyle = token.colorCardHeadingsText;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '11px sans-serif';
        ctx.globalAlpha = 0.6;
        ctx.fillText('Total Expenses', centerX, centerY - 12);
        
        const total = expenseChartData.datasets[0].data.reduce((a, b) => a + b, 0);
        ctx.font = 'bold 15px sans-serif';
        ctx.globalAlpha = 1;
        ctx.fillText(formatCurrency(total, profile?.currency), centerX, centerY + 10);
        ctx.restore();
      }
    };

    // 3. Statement Table Data (Damaged Loss shamil kiya gaya)
    const summaryData = [
      { label: 'Gross Sales (Revenue)', value: profitLossData.totalRevenue + (profitLossData.totalRefunds || 0), color: 'inherit' },
      { label: 'Sales Returns & Refunds', value: profitLossData.totalRefunds || 0, color: token.colorAmountNegative, isNegative: true },
      { label: 'Net Revenue (A)', value: profitLossData.totalRevenue, color: 'inherit', bold: true, borderTop: true },
      { label: 'Cost of Goods Sold (B)', value: profitLossData.totalCost, color: token.colorAmountNegative, isNegative: true },
      { label: 'Gross Profit (A - B)', value: profitLossData.grossProfit, color: token.colorAmountPositive, bold: true },
      { label: 'Total Operating Expenses (C)', value: profitLossData.totalExpenses, color: token.colorWarning, isNegative: true },
      { label: 'Damaged Stock Loss (D)', value: profitLossData.damagedLoss || 0, color: '#fa541c', isNegative: true },
      { label: 'NET PROFIT (After all losses)', value: profitLossData.netProfit, color: token.colorAmountPositive, bold: true, highlight: true },
    ];

    return (
      <div style={{ marginTop: '16px' }}>
        {/* Row 1: KPI Cards */}
        <Row gutter={[16, 16]} style={{ marginBottom: '16px' }}>
          <Col xs={12} md={6}>
            <Card size="small" style={{ ...cardStyle, borderLeft: `4px solid ${token.colorPrimary}` }}>
              <Statistic title="Total Revenue" value={profitLossData.totalRevenue} formatter={(val) => formatCurrency(val, profile?.currency)} valueStyle={{ fontSize: '18px' }} />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card size="small" style={{ ...cardStyle, borderLeft: `4px solid ${token.colorAmountNegative}` }}>
              <Statistic title="Total COGS" value={profitLossData.totalCost} formatter={(val) => formatCurrency(val, profile?.currency)} valueStyle={{ fontSize: '18px' }} />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card size="small" style={{ ...cardStyle, borderLeft: `4px solid ${token.colorWarning}` }}>
              <Statistic title="Total Expenses" value={profitLossData.totalExpenses} formatter={(val) => formatCurrency(val, profile?.currency)} valueStyle={{ fontSize: '18px' }} />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card size="small" style={{ ...cardStyle, borderLeft: `4px solid ${token.colorAmountPositive}` }}>
              <Statistic title="Net Profit" value={profitLossData.netProfit} formatter={(val) => formatCurrency(val, profile?.currency)} valueStyle={{ fontSize: '20px', color: token.colorAmountPositive, fontWeight: 'bold' }} />
            </Card>
          </Col>
        </Row>

        {/* Row 2: Charts Side-by-Side (Aligned & Consistent) */}
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={14}>
            <Card 
              title={<Text strong style={{ fontSize: '16px', color: token.colorCardHeadingsText }}><RiseOutlined /> Profit Trend (Daily)</Text>} 
              style={cardStyle}
            >
              <div style={{ height: 280 }}>
                {/* lineOptions ko as-is use kiya taake legend Top par aaye */}
                <Line data={profitTrendData} options={lineOptions} />
              </div>
            </Card>
          </Col>
          <Col xs={24} lg={10}>
            <Card 
              title={<Text strong style={{ fontSize: '16px', color: token.colorCardHeadingsText }}><PieChartOutlined /> Expense Distribution</Text>} 
              style={cardStyle}
            >
              <div style={{ height: 280, display: 'flex', justifyContent: 'center' }}>
                {profitLossData.expenseBreakdown?.length > 0 ? (
                  <Doughnut 
                    data={expenseChartData} 
                    options={doughnutOptions} // doughnutOptions mein legend pehle hi Left par hai
                    plugins={[expCenterTextPlugin]}
                  />
                ) : (
                  <Empty description="No expenses recorded" />
                )}
              </div>
            </Card>
          </Col>
        </Row>

        {/* Row 3: Detailed Statement & Margin */}
        <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
          <Col xs={24} lg={16}>
            <Card title={<Text strong style={{ fontSize: '16px', color: token.colorCardHeadingsText }}>Detailed P&L Statement</Text>} style={cardStyle}>
              <Table
                dataSource={summaryData}
                pagination={false}
                showHeader={false}
                rowKey="label"
                size="middle"
                columns={[
                  { 
                    title: 'Description', 
                    dataIndex: 'label', 
                    render: (text, rec) => (
                      <div style={{ borderTop: rec.borderTop ? `1px solid ${token.colorBorder}` : 'none', paddingTop: rec.borderTop ? '8px' : '0' }}>
                        <Text strong={rec.bold} style={{ fontSize: rec.highlight ? '16px' : '14px' }}>{text}</Text>
                      </div>
                    )
                  },
                  { 
                    title: 'Amount', 
                    dataIndex: 'value', 
                    align: 'right', 
                    render: (val, rec) => (
                      <div style={{ borderTop: rec.borderTop ? `1px solid ${token.colorBorder}` : 'none', paddingTop: rec.borderTop ? '8px' : '0' }}>
                        <Text strong={rec.bold} style={{ color: rec.color, fontSize: rec.highlight ? '18px' : '14px' }}>
                          {rec.isNegative ? '-' : ''} {formatCurrency(val, profile?.currency)}
                        </Text>
                      </div>
                    )
                  }
                ]}
              />
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card title={<Text strong style={{ fontSize: '16px', color: token.colorCardHeadingsText }}>Profitability Insight</Text>} style={cardStyle}>
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <Statistic 
                  title="Net Profit Margin" 
                  value={profitLossData.profitMargin} 
                  suffix="%" 
                  valueStyle={{ color: token.colorAmountPositive, fontSize: '32px', fontWeight: 'bold' }} 
                />
                <Progress 
                  type="dashboard" 
                  percent={profitLossData.profitMargin} 
                  strokeColor={token.colorAmountPositive} 
                  style={{ marginTop: 20 }}
                  format={percent => `${percent}%`}
                />
                <div style={{ marginTop: 20 }}>
                  <Text type="secondary">Your business retains {profitLossData.profitMargin}% of its total revenue as net profit after all costs, operating expenses, and inventory losses.</Text>
                </div>
              </div>
            </Card>
          </Col>
        </Row>

        {/* --- NAYA IZAFA: Daily Profit & Loss Ledger Table --- */}
        <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
          <Col span={24}>
            <Card 
              title={<Text strong style={{ fontSize: '16px', color: token.colorCardHeadingsText }}><BookOutlined /> Daily Profit & Loss Ledger</Text>} 
              extra={
                <Space size="small" wrap>
                    {/* NAYA IZAFA: Local Table Filter */}
                    <Text type="secondary" style={{ fontSize: '12px' }}>Filter Table:</Text>
                    <Select 
                        size="small" 
                        value={plTableDateType} 
                        onChange={(val) => { setPlTableDateType(val); setPlTableCustomDates([]); }} 
                        style={{ width: 140 }} 
                        styles={{ popup: { root: { zIndex: 2000 } } }}
                    >
                        <Select.Option value="sync">Same as Tab Filter</Select.Option>
                        <Select.Option value="today">Today</Select.Option>
                        <Select.Option value="this_month">This Month</Select.Option>
                        <Select.Option value="last_month">Last Month</Select.Option>
                        <Select.Option value="custom">Custom Range</Select.Option>
                    </Select>
                    
                    {plTableDateType === 'custom' && (
                        <DatePicker.RangePicker
                            size="small"
                            format="DD/MM/YYYY"
                            onChange={(dates) => {
                                if (dates) setPlTableCustomDates([dates[0].toISOString(), dates[1].toISOString()]);
                                else setPlTableCustomDates([]);
                            }}
                            style={{ width: 220 }}
                        />
                    )}

                    <Button 
                        type="default" 
                        size="small" 
                        icon={<FileExcelOutlined />} 
                        style={{ color: token.colorText, borderColor: token.colorBorder, marginLeft: '8px' }} 
                        onClick={() => {
                            setIsPLExportWizardOpen(true);
                            setPlExportData(dailyPLList); 
                            setPLExportDateRangeType('current');
                        }}
                    >
                        Export Options
                    </Button>
                </Space>
              }
              style={cardStyle} 
              styles={{ body: { padding: 0 } }}
            >
              <Table
                dataSource={dailyPLList}
                loading={isPLTableLoading}
                rowKey="key"
                pagination={{ pageSize: 7 }}
                size="small"
                scroll={{ x: 'max-content' }}
                // NAYA IZAFA: Grand Total Row at the bottom
                summary={(pageData) => {
                    let tGross = 0, tRet = 0, tDisc = 0, tTax = 0, tNetRev = 0, tCogs = 0, tExp = 0, tDmg = 0, tNet = 0;
                    // Hum filtered list (dailyPLList) ka total kar rahe hain, na ke sirf pageData ka
                    dailyPLList.forEach(r => {
                        tGross += r.gross_sales; tRet += r.returns; tDisc += r.discounts; tTax += r.taxes;
                        tNetRev += r.grand_total; tCogs += r.cogs; tExp += r.expenses; tDmg += r.damaged_loss; tNet += r.net_profit;
                    });
                    return (
                        <Table.Summary.Row style={{ background: token.colorFillAlter }}>
                            <Table.Summary.Cell index={0}><Text strong style={{ color: token.colorCardHeadingsText }}>GRAND TOTAL</Text></Table.Summary.Cell>
                            <Table.Summary.Cell index={1} align="right"><Text strong>{formatCurrency(tGross, profile?.currency)}</Text></Table.Summary.Cell>
                            <Table.Summary.Cell index={2} align="right"><Text strong style={{ color: token.colorAmountNegative }}>{formatCurrency(tRet, profile?.currency)}</Text></Table.Summary.Cell>
                            <Table.Summary.Cell index={3} align="right"><Text strong style={{ color: token.colorWarning }}>{formatCurrency(tDisc, profile?.currency)}</Text></Table.Summary.Cell>
                            <Table.Summary.Cell index={4} align="right"><Text strong>{formatCurrency(tTax, profile?.currency)}</Text></Table.Summary.Cell>
                            <Table.Summary.Cell index={5} align="right"><Text strong style={{ fontSize: '15px' }}>{formatCurrency(tNetRev, profile?.currency)}</Text></Table.Summary.Cell>
                            <Table.Summary.Cell index={6} align="right"><Text strong>{formatCurrency(tCogs, profile?.currency)}</Text></Table.Summary.Cell>
                            <Table.Summary.Cell index={7} align="right"><Text strong style={{ color: token.colorWarning }}>{formatCurrency(tExp, profile?.currency)}</Text></Table.Summary.Cell>
                            <Table.Summary.Cell index={8} align="right"><Text strong style={{ color: '#fa541c' }}>{formatCurrency(tDmg, profile?.currency)}</Text></Table.Summary.Cell>
                            <Table.Summary.Cell index={9} align="right"><Text strong style={{ fontSize: '15px', color: tNet >= 0 ? token.colorAmountPositive : token.colorAmountNegative }}>{formatCurrency(tNet, profile?.currency)}</Text></Table.Summary.Cell>
                        </Table.Summary.Row>
                    );
                }}
                columns={[
                  { title: 'Date', dataIndex: 'date', key: 'date', render: (text) => <Text strong>{text}</Text> },
                  { title: 'Gross Sales', dataIndex: 'gross_sales', key: 'g_sales', align: 'right', render: (val) => formatCurrency(val, profile?.currency) },
                  { title: 'Returns (-)', dataIndex: 'returns', key: 'ret', align: 'right', render: (val) => <Text style={{ color: val > 0 ? token.colorAmountNegative : 'inherit' }}>{val > 0 ? '-' : ''} {formatCurrency(val, profile?.currency)}</Text> },
                  { title: 'Discounts (-)', dataIndex: 'discounts', key: 'disc', align: 'right', render: (val) => <Text style={{ color: val > 0 ? token.colorWarning : 'inherit' }}>{val > 0 ? '-' : ''} {formatCurrency(val, profile?.currency)}</Text> },
                  { title: 'Taxes (+)', dataIndex: 'taxes', key: 'tax', align: 'right', render: (val) => formatCurrency(val, profile?.currency) },
                  { title: 'Net Revenue', dataIndex: 'grand_total', key: 'g_total', align: 'right', render: (val) => <Text strong>{formatCurrency(val, profile?.currency)}</Text> },
                  { title: 'Product Cost (COGS)', dataIndex: 'cogs', key: 'cogs', align: 'right', render: (val) => <Text type="secondary">{formatCurrency(val, profile?.currency)}</Text> },
                  { title: 'Expenses (-)', dataIndex: 'expenses', key: 'exp', align: 'right', render: (val) => <Text style={{ color: val > 0 ? token.colorWarning : 'inherit' }}>{val > 0 ? '-' : ''} {formatCurrency(val, profile?.currency)}</Text> },
                  { title: 'Damaged Loss (-)', dataIndex: 'damaged_loss', key: 'dmg', align: 'right', render: (val) => <Text style={{ color: val > 0 ? '#fa541c' : 'inherit' }}>{val > 0 ? '-' : ''} {formatCurrency(val, profile?.currency)}</Text> },
                  { 
                    title: 'Net Profit / Loss', 
                    dataIndex: 'net_profit', 
                    key: 'n_profit', 
                    align: 'right', 
                    render: (val) => (
                      <Text strong style={{ color: val >= 0 ? token.colorAmountPositive : token.colorAmountNegative }}>
                        {val >= 0 ? '↑' : '↓'} {formatCurrency(val, profile?.currency)}
                      </Text>
                    ) 
                  }
                ]}
              />
            </Card>
          </Col>
        </Row>
      </div>
    );
  };

  // --- UPDATED: PROFESSIONAL INVENTORY & ASSETS TAB UI ---
  const renderInventoryTab = () => {
    if (loading || !inventoryData) return <div style={{ textAlign: 'center', padding: '50px' }}><Spin size="large" /></div>;

    // 1. Doughnut Chart: Assets by Category
    const catChartData = {
      labels: inventoryData.categoryValuation?.map(item => item.name) || [],
      datasets: [{
        data: inventoryData.categoryValuation?.map(item => item.value) || [],
        backgroundColor: ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#13c2c2', '#eb2f96'],
        borderColor: token.colorBgContainer,
        borderWidth: 2,
        cutout: '70%',
      }]
    };

    // 2. Doughnut Chart: Assets by Brand
    const brandChartData = {
      labels: inventoryData.brandValuation?.map(item => item.name) || [],
      datasets: [{
        data: inventoryData.brandValuation?.map(item => item.value) || [],
        backgroundColor: ['#2f54eb', '#722ed1', '#eb2f96', '#fa8c16', '#a0d911', '#13c2c2', '#f5222d'],
        borderColor: token.colorBgContainer,
        borderWidth: 2,
        cutout: '70%',
      }]
    };    

    return (
      <div style={{ marginTop: '16px' }}>
        {/* Row 1: Asset KPI Cards */}
        <Row gutter={[16, 16]} style={{ marginBottom: '16px' }}>
          <Col xs={12} md={6}>
            <Card size="small" style={{ ...cardStyle, borderLeft: `4px solid ${token.colorPrimary}` }}>
              <Statistic title="Total Stock Units" value={inventoryData.totalUnits} prefix={<InboxOutlined />} valueStyle={{ fontSize: '20px' }} />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card size="small" style={{ ...cardStyle, borderLeft: `4px solid ${token.colorInfo}` }}>
              <Statistic title="Total Asset Value" value={inventoryData.totalAssetValue} formatter={(val) => formatCurrency(val, profile?.currency)} valueStyle={{ fontSize: '20px' }} />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card size="small" style={{ ...cardStyle, borderLeft: `4px solid ${token.colorAmountPositive}` }}>
              <Statistic title="Potential Profit" value={inventoryData.totalPotentialProfit} formatter={(val) => formatCurrency(val, profile?.currency)} valueStyle={{ fontSize: '20px', color: token.colorAmountPositive }} />
            </Card>
          </Col>
          <Col xs={12} md={4}>
            <Card size="small" style={{ ...cardStyle, borderLeft: `4px solid ${token.colorAmountNegative}` }}>
              <Statistic title="Out of Stock" value={inventoryData.outOfStockItems?.length || 0} valueStyle={{ color: token.colorAmountNegative, fontSize: '18px' }} />
            </Card>
          </Col>
          <Col xs={24} md={5}>
            <Card size="small" style={{ ...cardStyle, borderLeft: `4px solid #fa541c` }}>
              <Statistic 
                title="Damaged Stock Loss" 
                value={inventoryData.totalDamagedLoss || 0} 
                formatter={(val) => formatCurrency(val, profile?.currency)} 
                valueStyle={{ color: '#fa541c', fontSize: '18px' }} 
              />
              <Text style={{ fontSize: '10px', color: token.colorCardColumnsTitleText }}>Total value of unusable items</Text>
            </Card>
          </Col>
        </Row>

        {/* Row 2: Distribution Charts */}
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <Card title={<Text strong style={{ fontSize: '16px', color: token.colorCardHeadingsText }}>Assets by Category</Text>} style={cardStyle}>
              <div style={{ height: 280, display: 'flex', justifyContent: 'center' }}>
                <Doughnut 
                  data={catChartData} 
                  options={doughnutOptions} 
                  plugins={[invCenterTextPlugin('Total Assets', inventoryData.totalAssetValue)]} 
                />
              </div>
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card title={<Text strong style={{ fontSize: '16px', color: token.colorCardHeadingsText }}>Assets by Brand</Text>} style={cardStyle}>
              <div style={{ height: 280, display: 'flex', justifyContent: 'center' }}>
                <Doughnut 
                  data={brandChartData} 
                  options={doughnutOptions} 
                  plugins={[invCenterTextPlugin('Total Assets', inventoryData.totalAssetValue)]} 
                />
              </div>
            </Card>
          </Col>
        </Row>

        {/* Row 3: Brand Valuation & Health Lists */}
        <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
          <Col xs={24} lg={14}>
            <Card title={<Text strong style={{ fontSize: '16px', color: token.colorCardHeadingsText }}>Brand-wise Valuation</Text>} style={cardStyle} styles={{ body: { padding: 0 } }}>
              <Table
                dataSource={inventoryData.brandValuation}
                rowKey="name"
                pagination={{ pageSize: 6 }}
                size="small"
                columns={[
                  { title: 'Brand', dataIndex: 'name', key: 'name' },
                  { title: 'Qty', dataIndex: 'qty', key: 'qty', align: 'center' },
                  { title: 'Asset Value', dataIndex: 'value', key: 'value', align: 'right', render: (val) => formatCurrency(val, profile?.currency) },
                  { title: 'Potential Profit', dataIndex: 'profit', key: 'profit', align: 'right', render: (val) => <Text strong style={{ color: token.colorAmountPositive }}>{formatCurrency(val, profile?.currency)}</Text> }
                ]}
              />
            </Card>
          </Col>
          <Col xs={24} lg={10}>
            <Card title={<Text strong style={{ fontSize: '16px', color: token.colorCardHeadingsText }}>Inventory Health</Text>} style={cardStyle} styles={{ body: { padding: '0 16px' } }}>
              <Tabs defaultActiveKey="low" size="small" items={[
                {
                  key: 'low',
                  label: <Badge count={inventoryData.lowStockItems?.length} offset={[10, 0]} size="small"><Text type="warning">Low Stock</Text></Badge>,
                  children: (
                    <Table dataSource={inventoryData.lowStockItems} rowKey="name" pagination={{ pageSize: 5 }} size="small" columns={[
                      { title: 'Product', key: 'p', render: (_, r) => `${r.brand} ${r.name}` },
                      { title: 'Qty', dataIndex: 'qty', align: 'right', render: (q) => <Tag color="orange">{q}</Tag> }
                    ]} />
                  )
                },
                {
                  key: 'out',
                  label: <Badge count={inventoryData.outOfStockItems?.length} offset={[10, 0]} size="small"><Text type="danger">Out of Stock</Text></Badge>,
                  children: (
                    <Table dataSource={inventoryData.outOfStockItems} rowKey="name" pagination={{ pageSize: 5 }} size="small" columns={[
                      { title: 'Product', key: 'p', render: (_, r) => `${r.brand} ${r.name}` },
                      { title: 'Status', key: 's', align: 'right', render: () => <Tag color="red">0 Left</Tag> }
                    ]} />
                  )
                },
                {
                  key: 'slow',
                  label: <Text>Slow Moving</Text>,
                  children: (
                    <Table dataSource={inventoryData.slowMovingItems} rowKey="name" pagination={{ pageSize: 5 }} size="small" columns={[
                      { title: 'Product', key: 'p', render: (_, r) => `${r.brand} ${r.name}` },
                      { title: 'In Stock', dataIndex: 'qty', align: 'right' }
                    ]} />
                  )
                },
                {
                  key: 'expiry',
                  label: <Badge count={inventoryData.expiringSoonItems?.filter(i => i.isExpired)?.length} offset={[10, 0]} size="small"><Text type="danger">Expiry</Text></Badge>,
                  children: (
                    <Table dataSource={inventoryData.expiringSoonItems} rowKey="id" pagination={{ pageSize: 5 }} size="small" columns={[
                      { title: 'Product', key: 'p', render: (_, r) => `${r.brand} ${r.name}` },
                      { title: 'Batch', dataIndex: 'batch_number', key: 'b' },
                      { title: 'Exp. Date', key: 'exp', render: (_, r) => (
                        <Text type={r.isExpired ? 'danger' : 'warning'}>
                          {new Date(r.expiry_date).toLocaleDateString()} {r.isExpired ? '(Expired)' : ''}
                        </Text>
                      )},
                      { title: 'Qty', dataIndex: 'qty', align: 'right' },
                      { title: 'Action', key: 'action', align: 'center', render: (_, r) => (
                          <Tooltip title="Return to Supplier">
                              <Button 
                                  type="primary" 
                                  danger 
                                  size="small" 
                                  icon={<RollbackOutlined />} 
                                  onClick={() => navigate(`/purchases?action=return&inventory_id=${r.id}`)}
                              />
                          </Tooltip>
                      )}
                    ]} locale={{ emptyText: 'No items expiring soon!' }} />
                  )
                }
              ]} />
            </Card>
          </Col>
        </Row>
      </div>
    );
  };

  // --- NAYA IZAFA: KHATA & LEDGERS TAB UI ---
  // --- UPDATED: PROFESSIONAL LEDGERS & ACCOUNTS TAB UI ---
  const renderLedgersTab = () => {
    if (loading || !ledgerData) return <div style={{ textAlign: 'center', padding: '50px' }}><Spin size="large" /></div>;

    // 1. Comparison Bar Chart Data
    const comparisonData = {
      labels: ['Total Receivables', 'Total Payables'],
      datasets:[
        {
          label: 'Customers / Suppliers',
          data:[ledgerData.totalCustomerReceivable, ledgerData.totalSupplierPayable],
          backgroundColor:[token.colorInfo + '88', token.colorAmountNegative + '88'],
          borderColor: [token.colorInfo, token.colorAmountNegative],
          borderWidth: 1,
        },
        {
          label: 'Staff (Advances/Salaries)',
          data: [ledgerData.staffReceivable, ledgerData.staffPayable],
          backgroundColor: [token.colorInfo + '88', token.colorInfo + '44'],
          borderColor: [token.colorInfo, token.colorInfo],
          borderWidth: 1,
        }
      ]
    };

    // 2. Aging Chart Data (Doughnut)
    const agingChartData = {
      labels: ['0-30 Days (Current)', '31-60 Days (Overdue)', '60+ Days (Risk)'],
      datasets: [{
        data: [ledgerData.customerAging.current, ledgerData.customerAging.mid, ledgerData.customerAging.old],
        backgroundColor: [token.colorAmountPositive, token.colorWarning, token.colorAmountNegative],
        borderColor: token.colorBgContainer,
        borderWidth: 2,
        cutout: '70%',
      }]
    };

    const barOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { color: token.colorText, boxWidth: 12 } } },
      scales: {
        y: { beginAtZero: true, ticks: { color: token.colorTextSecondary, callback: (v) => formatCurrency(v, profile?.currency) }, grid: { color: token.colorBorderSecondary } },
        x: { ticks: { color: token.colorTextSecondary }, grid: { display: false } }
      }
    };

    const invCenterTextPlugin = (label, totalValue) => ({
      id: 'invCenterText',
      beforeDraw: (chart) => {
        const { ctx, chartArea: { left, right, top, bottom } } = chart;
        ctx.save();
        const centerX = (left + right) / 2;
        const centerY = (top + bottom) / 2;
        ctx.fillStyle = token.colorCardHeadingsText;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '11px sans-serif';
        ctx.globalAlpha = 0.6;
        ctx.fillText(label, centerX, centerY - 12);
        ctx.font = 'bold 14px sans-serif';
        ctx.globalAlpha = 1;
        ctx.fillText(formatCurrency(totalValue, profile?.currency), centerX, centerY + 10);
        ctx.restore();
      }
    });

    return (
      <div style={{ marginTop: '16px' }}>
        {/* Row 1: Ledger KPI Cards */}
        <Row gutter={[16, 16]} style={{ marginBottom: '16px' }}>
          <Col xs={12} md={8}>
            <Card size="small" style={{ ...cardStyle, borderLeft: `4px solid ${token.colorInfo}` }}>
              <Statistic title="Total Receivables" value={ledgerData.grandTotalReceivable} formatter={(val) => formatCurrency(val, profile?.currency)} valueStyle={{ fontSize: '20px', color: token.colorInfo }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                <Text style={{ fontSize: '10px', color: token.colorCardColumnsTitleText }}>Customers + Staff Advances</Text>
                <Tooltip title="Money owed to customers due to returns/overpayments">
                  <Tag color="blue" style={{ fontSize: '10px', margin: 0, fontWeight: 'bold' }}>
  Credits: {formatCurrency(ledgerData.totalCustomerCredits || 0, profile?.currency)}
</Tag>
                </Tooltip>
              </div>
            </Card>
          </Col>
          <Col xs={12} md={8}>
            <Card size="small" style={{ ...cardStyle, borderLeft: `4px solid ${token.colorAmountNegative}` }}>
              <Statistic title="Total Payables" value={ledgerData.grandTotalPayable} formatter={(val) => formatCurrency(val, profile?.currency)} valueStyle={{ fontSize: '20px', color: token.colorAmountNegative }} />
              <Text style={{ fontSize: '10px', color: token.colorCardColumnsTitleText }}>Suppliers + Salaries Due</Text>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card size="small" style={{ ...cardStyle, borderLeft: `4px solid ${ledgerData.netPosition >= 0 ? token.colorAmountPositive : token.colorAmountNegative}` }}>
              <Statistic title="Net Cash Position" value={ledgerData.netPosition} formatter={(val) => formatCurrency(val, profile?.currency)} valueStyle={{ fontSize: '20px', fontWeight: 'bold' }} />
              <Text style={{ fontSize: '10px', color: token.colorCardColumnsTitleText }}>Receivables minus Payables</Text>
            </Card>
          </Col>
        </Row>

        {/* Row 2: Charts Side-by-Side */}
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <Card title={<Text strong style={{ fontSize: '16px', color: token.colorCardHeadingsText }}>Receivables vs Payables</Text>} style={cardStyle}>
              <div style={{ height: 280 }}>
                <Bar data={comparisonData} options={barOptions} />
              </div>
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card title={<Text strong style={{ fontSize: '16px', color: token.colorCardHeadingsText }}>Receivables Aging (Days)</Text>} style={cardStyle}>
              <div style={{ height: 280, display: 'flex', justifyContent: 'center' }}>
                <Doughnut 
                  data={agingChartData} 
                  options={doughnutOptions} 
                  plugins={[invCenterTextPlugin('Total Outstanding', ledgerData.totalCustomerReceivable)]} 
                />
              </div>
            </Card>
          </Col>
        </Row>

        {/* Row 3: Advanced Ledger Lists (Global Professional Terms) */}
        <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
          {/* Customer Side */}
          <Col xs={24} lg={12}>
            <Card style={cardStyle} styles={{ body: { padding: '0 16px 16px 16px' } }}>
              <Tabs defaultActiveKey="debt" size="small" items={[
                {
                  key: 'debt',
                  label: <Text strong>Customer Receivables</Text>,
                  children: (
                    <Table
                      dataSource={ledgerData.topDebtors}
                      rowKey="id" pagination={false} size="small"
                      columns={[
                        { title: 'Customer Name', dataIndex: 'name', key: 'name' },
                        { title: 'Amount', dataIndex: 'balance', key: 'bal', align: 'right', render: (v) => <Text strong type="danger">{formatCurrency(v, profile?.currency)}</Text> }
                      ]}
                    />
                  )
                },
                {
                  key: 'credit',
                  label: <Text strong>Customer Credits</Text>,
                  children: (
                    <Table
                      dataSource={ledgerData.topCreditCustomers}
                      rowKey="id" pagination={false} size="small"
                      columns={[
                        { title: 'Customer Name', dataIndex: 'name', key: 'name' },
                        { title: 'Amount', dataIndex: 'balance', key: 'bal', align: 'right', render: (v) => <Text strong style={{ color: token.colorAmountPositive }}>{formatCurrency(v, profile?.currency)}</Text> }
                      ]}
                    />
                  )
                }
              ]} />
            </Card>
          </Col>

          {/* Supplier & Staff Side */}
          <Col xs={24} lg={12}>
            <Card style={cardStyle} styles={{ body: { padding: '0 16px 16px 16px' } }}>
              <Tabs defaultActiveKey="sup" size="small" items={[
                {
                  key: 'sup',
                  label: <Text strong>Supplier Payables</Text>,
                  children: (
                    <Table
                      dataSource={ledgerData.topCreditors}
                      rowKey="id" pagination={false} size="small"
                      columns={[
                        { title: 'Supplier Name', dataIndex: 'name', key: 'name' },
                        { title: 'Amount', dataIndex: 'balance', key: 'bal', align: 'right', render: (v) => <Text strong style={{ color: token.colorWarning }}>{formatCurrency(v, profile?.currency)}</Text> }
                      ]}
                    />
                  )
                },
                {
                  key: 'sup_credit',
                  label: <Text strong>Supplier Credits</Text>,
                  children: (
                    <Table
                      dataSource={ledgerData.topSupplierCredits}
                      rowKey="id" pagination={false} size="small"
                      columns={[
                        { title: 'Supplier Name', dataIndex: 'name', key: 'name' },
                        { title: 'Amount', dataIndex: 'balance', key: 'bal', align: 'right', render: (v) => <Text strong style={{ color: token.colorInfo }}>{formatCurrency(v, profile?.currency)}</Text> }
                      ]}
                    />
                  )
                },
                {
                  key: 'staff',
                  label: <Text strong>Staff Accounts</Text>,
                  children: (
                    <Table
                      dataSource={ledgerData.staffBalances}
                      rowKey="id" pagination={false} size="small"
                      columns={[
                        { title: 'Staff Name', dataIndex: 'name', key: 'name', render: (t, r) => `${t} (${r.role})` },
                        { 
                          title: 'Balance', dataIndex: 'balance', key: 'bal', align: 'right', 
                          render: (v) => (
                            <Text strong style={{ color: v > 0 ? token.colorAmountPositive : token.colorAmountNegative }}>
                              {v > 0 ? 'Salary Due: ' : 'Advance: '}
                              {formatCurrency(Math.abs(v), profile?.currency)}
                            </Text>
                          ) 
                        }
                      ]}
                    />
                  )
                }
              ]} />
            </Card>
          </Col>
        </Row>
      </div>
    );
  };

  // --- NAYA IZAFA: CASH & AUDIT TAB UI ---
  // --- UPDATED: PROFESSIONAL CASH & AUDIT TAB UI ---
  const renderAuditTab = () => {
    if (loading || !auditData) return <div style={{ textAlign: 'center', padding: '50px' }}><Spin size="large" /></div>;

    // NAYA IZAFA: Shift Closings ko dynamic filter karne ka helper function
    const getFilteredClosings = () => {
        let filtered = [...(auditData?.recentClosings || [])];

        // 1. Staff Filter
        if (auditStaff !== 'all') {
            if (auditStaff === 'owner') {
                filtered = filtered.filter(c => !c.staff_id);
            } else {
                filtered = filtered.filter(c => c.staff_id === auditStaff);
            }
        }

        // 2. Discrepancy (Fark) Filter
        if (auditDiscrepancy !== 'all') {
            if (auditDiscrepancy === 'discrepancy') {
                filtered = filtered.filter(c => (c.difference || 0) !== 0);
            } else if (auditDiscrepancy === 'matched') {
                filtered = filtered.filter(c => (c.difference || 0) === 0);
            }
        }

        return filtered;
    };

    // 1. Daily Difference Bar Chart Data
    const diffChartData = {
      labels: auditData.dailyDiffTrend?.map(item => item.date) || [],
      datasets: [{
        label: 'Closing Difference',
        data: auditData.dailyDiffTrend?.map(item => item.difference) || [],
        // Agar farq negative hai to Red, positive hai to Green
        backgroundColor: auditData.dailyDiffTrend?.map(item => 
          item.difference < 0 ? token.colorAmountNegative + 'aa' : token.colorAmountPositive + 'aa'
        ),
        borderColor: auditData.dailyDiffTrend?.map(item => 
          item.difference < 0 ? token.colorAmountNegative : token.colorAmountPositive
        ),
        borderWidth: 1,
      }]
    };

    // 2. Manual Flow Breakdown Data (Doughnut)
    const flowChartData = {
      labels: ['Cash In', 'Cash Out'],
      datasets: [{
        data: [auditData.totalIn, auditData.totalOut],
        backgroundColor: [token.colorAmountPositive, token.colorAmountNegative],
        borderColor: token.colorBgContainer,
        borderWidth: 2,
        cutout: '70%',
      }]
    };

    return (
      <div style={{ marginTop: '16px' }}>
        {/* Row 1: Audit KPI Cards */}
        <Row gutter={[16, 16]} style={{ marginBottom: '16px' }}>
          <Col xs={12} md={6}>
            <Card size="small" style={{ ...cardStyle, borderLeft: `4px solid ${token.colorAmountPositive}` }}>
              <Statistic title="Manual Cash In" value={auditData.totalIn} formatter={(val) => formatCurrency(val, profile?.currency)} valueStyle={{ fontSize: '18px', color: token.colorAmountPositive }} />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card size="small" style={{ ...cardStyle, borderLeft: `4px solid ${token.colorAmountNegative}` }}>
              <Statistic title="Manual Cash Out" value={auditData.totalOut} formatter={(val) => formatCurrency(val, profile?.currency)} valueStyle={{ fontSize: '18px', color: token.colorAmountNegative }} />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card size="small" style={{ ...cardStyle, borderLeft: `4px solid ${token.colorWarning}` }}>
              <Statistic title="Total Shortages" value={auditData.totalShortage} formatter={(val) => formatCurrency(val, profile?.currency)} valueStyle={{ fontSize: '18px', color: token.colorAmountNegative }} />
              <Text style={{ fontSize: '10px', color: token.colorCardColumnsTitleText }}>Cash missing at closing</Text>
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card size="small" style={{ ...cardStyle, borderLeft: `4px solid ${token.colorInfo}` }}>
              <Statistic title="Net Audit Difference" value={auditData.netDifference} formatter={(val) => formatCurrency(val, profile?.currency)} valueStyle={{ fontSize: '18px', color: auditData.netDifference >= 0 ? token.colorAmountPositive : token.colorAmountNegative }} />
              <Text style={{ fontSize: '10px', color: token.colorCardColumnsTitleText }}>Overall surplus/deficit</Text>
            </Card>
          </Col>
        </Row>

        {/* Row 2: Visual Audit Analysis */}
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={14}>
            <Card title={<Text strong style={{ fontSize: '16px', color: token.colorCardHeadingsText }}><HistoryOutlined /> Daily Closing Discrepancies</Text>} style={cardStyle}>
              <div style={{ height: 280 }}>
                {auditData.dailyDiffTrend?.length > 0 ? (
                  <Bar data={diffChartData} options={lineOptions} />
                ) : (
                  <Empty description="No closing history for this period" />
                )}
              </div>
            </Card>
          </Col>
          <Col xs={24} lg={10}>
            <Card title={<Text strong style={{ fontSize: '16px', color: token.colorCardHeadingsText }}><PieChartOutlined /> Manual Adjustment Flow</Text>} style={cardStyle}>
              <div style={{ height: 280, display: 'flex', justifyContent: 'center' }}>
                <Doughnut 
                  data={flowChartData} 
                  options={doughnutOptions} 
                  plugins={[invCenterTextPlugin('Net Movement', auditData.totalIn - auditData.totalOut)]} 
                />
              </div>
            </Card>
          </Col>
        </Row>

        {/* Row 3: Audit Logs */}
        <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
          <Col xs={24} lg={24}> {/* <--- NAYA IZAFA: lg={14} se lg={24} (Full width) kar diya */}
            <Card title={<Text strong style={{ fontSize: '16px', color: token.colorCardHeadingsText }}>Staff Ledger Activity</Text>} style={cardStyle} styles={{ body: { padding: 0 } }}>
              <Table
                dataSource={auditData.staffTransactions}
                rowKey="id"
                pagination={{ pageSize: 6 }}
                size="small"
                scroll={{ x: 'max-content' }} // <--- NAYA IZAFA: Responsive table scroll
                columns={[
              { title: 'Date', dataIndex: 'entry_date', key: 'date', render: d => dayjs(d).format('DD MMM') },
              { 
                title: 'Staff Name', 
                key: 'staff', 
                render: (_, rec) => {
                  const staff = staffList.find(s => s.id === rec.staff_id);
                  return <Text strong>{staff ? staff.name : 'Owner / Admin'}</Text>;
                } 
              },
              { title: 'Transaction', dataIndex: 'type', key: 'type', render: t => <Tag color={t === 'Salary' ? 'blue' : t === 'Advance' ? 'volcano' : 'orange'}>{t.toUpperCase()}</Tag> },
              { title: 'Amount', dataIndex: 'amount', key: 'amt', align: 'right', render: v => <Text strong>{formatCurrency(v, profile?.currency)}</Text> },
              { title: 'Remarks', dataIndex: 'notes', key: 'notes', ellipsis: true, render: (text) => <Text style={{ fontSize: '12px', color: token.colorCardColumnsTitleText }}>{text || '-'}</Text> }
            ]}
              />
            </Card>
          </Col>
          <Col xs={24} lg={24}> {/* <--- NAYA IZAFA: lg={10} se lg={24} (Full width) kar diya */}
            <Card 
              title={<Text strong style={{ fontSize: '15px', color: token.colorCardHeadingsText }}>Shift Closings & Audit</Text>} 
              extra={
                <Space size="small" wrap>
                  {/* Staff Filter */}
                  <Select 
                    size="small" 
                    value={auditStaff} 
                    onChange={setAuditStaff} 
                    style={{ width: 110 }}
                    styles={{ popup: { root: { zIndex: 2000 } } }}
                  >
                    <Select.Option value="all">All Staff</Select.Option>
                    <Select.Option value="owner">{profile?.role ? (profile.role.charAt(0).toUpperCase() + profile.role.slice(1).toLowerCase()) : 'Owner'}</Select.Option>
                    {staffList.map(s => <Select.Option value={s.id} key={s.id}>{s.name}</Select.Option>)}
                  </Select>

                  {/* Discrepancy Filter */}
                  <Select 
                    size="small" 
                    value={auditDiscrepancy} 
                    onChange={setAuditDiscrepancy} 
                    style={{ width: 130 }}
                    styles={{ popup: { root: { zIndex: 2000 } } }}
                  >
                    <Select.Option value="all">All Shifts</Select.Option>
                    <Select.Option value="discrepancy">With Difference</Select.Option>
                    <Select.Option value="matched">Perfect Match</Select.Option>
                  </Select>
                </Space>
              }
              style={cardStyle} 
              styles={{ body: { padding: 0 } }}
            >
              <Table
                dataSource={getFilteredClosings()} // <--- NAYA IZAFA: Filtered Data Function connect kiya
                rowKey="id"
                pagination={{ pageSize: 6 }}
                size="small"
                scroll={{ x: 'max-content' }} // <--- NAYA IZAFA: Responsive table scroll
                columns={[
                  { title: 'Date', dataIndex: 'closed_at', key: 'date', render: d => dayjs(d).format('DD MMM, hh:mm A') },
                  { 
                    title: 'Staff', 
                    key: 'staff', 
                    render: (_, rec) => {
                      const staff = staffList.find(s => s.id === rec.staff_id);
                      // NAYA IZAFA: 'Owner / Admin' se 'Owner'/'Admin' capitalize logic
                      const displayRole = profile?.role ? (profile.role.charAt(0).toUpperCase() + profile.role.slice(1).toLowerCase()) : 'Owner';
                      return <Text strong>{staff ? staff.name : displayRole}</Text>;
                    } 
                  },
                  { title: 'Expected', dataIndex: 'expected_closing', align: 'right', render: v => formatCurrency(v, profile?.currency) },
                  { title: 'Actual', dataIndex: 'actual_closing', align: 'right', render: v => formatCurrency(v, profile?.currency) },
                  { title: 'Diff', dataIndex: 'difference', align: 'right', render: v => (
                    <Text strong style={{ color: v < 0 ? token.colorAmountNegative : token.colorAmountPositive }}>
                      {v > 0 ? '+' : ''}{formatCurrency(v, profile?.currency)}
                    </Text>
                  )},
                  { title: 'Remarks', dataIndex: 'notes', key: 'notes', ellipsis: true, render: (text) => <Text style={{ fontSize: '11px', color: token.colorCardColumnsTitleText }}>{text || '-'}</Text> }
                ]}
              />
            </Card>
          </Col>
        </Row>
      </div>
    );
  };

  // --- NAYA IZAFA: VAULT & CASH FLOW TAB UI ---
  const renderVaultFlowTab = () => {
    // NAYA IZAFA: Selected account ka asli naam nikalna
    const getSelectedAccountDisplayName = () => {
        if (selectedRegForLedger === 'all') return 'All Accounts (Master Ledger)'; // <--- NAYA IZAFA
        if (selectedAccountType === 'counter') {
            const reg = allRegisters.find(r => r.id === selectedRegForLedger);
            return reg ? reg.name : 'Counter';
        }
        return selectedRegForLedger || 'Bank Account';
    };

    // NAYA IZAFA: 3-Level Collapsible Grouped Summary Report Builder (Odoo/QuickBooks Standard)
    const getGroupedVaultData = () => {
        const rawFiltered = getRawFilteredData();
        const groups = {};

        rawFiltered.forEach(tx => {
            const sourceKey = tx.source || 'Other';
            
            // Party Name dynamically resolve karna
            let partyKey = 'Internal / General';
            if (tx.customer_id) {
                partyKey = customerList.find(c => c.id === tx.customer_id)?.name || 'Walk-in Customer';
            } else if (tx.supplier_id) {
                partyKey = supplierList.find(s => s.id === tx.supplier_id)?.name || 'Supplier';
            } else if (tx.source === 'Expense') {
                partyKey = tx.notes || 'Operating Expense';
            } else if (tx.source === 'Manual Adjustment / Transfer') {
                partyKey = tx.notes || 'Internal Adjustment';
            } else if (tx.notes) {
                partyKey = tx.notes;
            }

            // Level 1: Transaction Source (e.g. Sales, Expenses)
            if (!groups[sourceKey]) {
                groups[sourceKey] = {
                    key: sourceKey,
                    title: sourceKey,
                    type: 'source',
                    credit: 0,
                    debit: 0,
                    children: {}
                };
            }

            const isCredit = tx.type === 'Credit (In)';
            const amt = Number(tx.amount) || 0;

            if (isCredit) {
                groups[sourceKey].credit += amt;
            } else if (tx.type === 'Debit (Out)') {
                groups[sourceKey].debit += amt;
            }

            // Level 2: Party Name / Sub Category (e.g. Walk-in, Specific Supplier)
            if (!groups[sourceKey].children[partyKey]) {
                groups[sourceKey].children[partyKey] = {
                    key: `${sourceKey}-${partyKey}`,
                    title: partyKey,
                    type: 'party',
                    credit: 0,
                    debit: 0,
                    children: []
                };
            }

            if (isCredit) {
                groups[sourceKey].children[partyKey].credit += amt;
            } else if (tx.type === 'Debit (Out)') {
                groups[sourceKey].children[partyKey].debit += amt;
            }

            // Level 3: Leaf Nodes (Asli transactions)
            groups[sourceKey].children[partyKey].children.push({
                key: tx.id,
                date: tx.date,
                type: tx.type,
                amount: tx.amount,
                notes: tx.notes,
                source: tx.source,
                staff_id: tx.staff_id,
                runningBalance: tx.runningBalance,
                account_name: tx.account_name,
                isLeaf: true
            });
        });

        // Object map ko nested array format mein tabdeel karna (Ant Design native tree support)
        return Object.values(groups).map(g => ({
            ...g,
            children: Object.values(g.children).map(p => ({
                ...p,
                children: p.children.sort((a, b) => new Date(b.date) - new Date(a.date))
            }))
        }));
    };

    // NAYA IZAFA: Grouped View ke Table Columns
    const groupedColumns = [
        {
            title: 'Date / Category / Party Name',
            dataIndex: 'title',
            key: 'title',
            render: (text, record) => {
                if (record.isLeaf) {
                    return dayjs(record.date).format('DD MMM YYYY, hh:mm A');
                }
                return <Text strong style={{ color: token.colorCardHeadingsText }}>{text}</Text>;
            }
        },
        {
            title: 'Handled by',
            dataIndex: 'staff_id',
            key: 'handled_by',
            render: (staffId, record) => {
                if (!record.isLeaf) return null;
                const staff = staffList.find(s => s.id === staffId);
                const displayRole = profile?.role ? (profile.role.charAt(0).toUpperCase() + profile.role.slice(1).toLowerCase()) : 'Owner';
                return <Text>{staff ? staff.name : displayRole}</Text>;
            }
        },
        {
            title: 'Description',
            dataIndex: 'notes',
            key: 'description',
            render: (notes, record) => {
                if (!record.isLeaf) return null;
                return notes;
            }
        },
        {
            title: 'Credit (In)',
            dataIndex: 'credit',
            key: 'credit',
            align: 'right',
            render: (val, record) => {
                if (record.isLeaf) {
                    const isCredit = record.type === 'Credit (In)';
                    if (!isCredit) return '-';
                    return <Text strong style={{ color: token.colorAmountPositive }}>+{formatCurrency(record.amount, profile?.currency)}</Text>;
                }
                return val > 0 ? <Text strong style={{ color: token.colorAmountPositive }}>{formatCurrency(val, profile?.currency)}</Text> : '-';
            }
        },
        {
            title: 'Debit (Out)',
            dataIndex: 'debit',
            key: 'debit',
            align: 'right',
            render: (val, record) => {
                if (record.isLeaf) {
                    const isDebit = record.type === 'Debit (Out)';
                    if (!isDebit) return '-';
                    return <Text strong style={{ color: token.colorAmountNegative }}>-{formatCurrency(record.amount, profile?.currency)}</Text>;
                }
                return val > 0 ? <Text strong style={{ color: token.colorAmountNegative }}>{formatCurrency(val, profile?.currency)}</Text> : '-';
            }
        }
    ];

    // NAYA IZAFA: Har transaction ke sath uska automatic Running Balance backtracking se nikalna (PKR 0 Fix)
    const getLedgerWithRunningBalances = () => {
        const rawList = [...registerLedgerData];
        let tempBalance = currentCounterCash; 

        const listWithBalances = rawList.map(item => {
            const amt = Number(item.amount) || 0;
            const isCredit = item.type === 'Credit (In)';
            const numericQty = isCredit ? amt : (item.type === 'Debit (Out)' ? -amt : 0);
            
            const itemWithBalance = {
                ...item,
                numericQty,
                runningBalance: tempBalance
            };
            
            tempBalance -= numericQty; 
            return itemWithBalance;
        });
        return listWithBalances;
    };

    // NAYA IZAFA: Active filters aur Period Metrics ko text format mein print karne ke liye helper
    const getVaultFilterDescription = () => {
        const parts = [];
        const curr = profile?.currency || 'USD'; 
        
        if (vaultStaff !== 'all') {
            if (vaultStaff === 'owner') {
                const displayRole = profile?.role ? (profile.role.charAt(0).toUpperCase() + profile.role.slice(1).toLowerCase()) : 'Owner';
                parts.push(`Staff: ${displayRole}`);
            } else {
                const staff = staffList.find(s => s.id === vaultStaff);
                parts.push(`Staff: ${staff ? staff.name : 'Unknown'}`);
            }
        }
        
        if (vaultTxType !== 'all') {
            const typeLabels = { Sales: 'Sales', 'Credit Settlement': 'Sale Returns / Payouts', Collection: 'Customer Payments', 'Supplier Payment': 'Supplier Payments', Expense: 'Expenses', 'Supplier Refund': 'Supplier Refunds', 'Manual Adjustment / Transfer': 'Adjustments / Transfers' };
            parts.push(`Type: ${typeLabels[vaultTxType] || vaultTxType}`);
        }
        
        if (vaultDateRange !== 'all') {
            if (vaultDateRange === 'custom' && vaultCustomDates.length === 2) { parts.push(`Date: ${dayjs(vaultCustomDates[0]).format('DD/MM/YY')} to ${dayjs(vaultCustomDates[1]).format('DD/MM/YY')}`); } 
            else {
                const rangeLabels = { today: 'Today', this_month: 'This Month', last_month: 'Last Month' };
                parts.push(`Date: ${rangeLabels[vaultDateRange] || vaultDateRange}`);
            }
        }

        if (vaultSearchText) parts.push(`Search: "${vaultSearchText}"`);
        if (vaultCustomer !== 'all') {
            const cust = customerList.find(c => c.id === vaultCustomer);
            parts.push(`Customer: ${cust ? cust.name : 'Unknown'}`);
        }
        if (vaultSupplier !== 'all') {
            const sup = supplierList.find(s => s.id === vaultSupplier);
            parts.push(`Supplier: ${sup ? sup.name : 'Unknown'}`);
        }

        const metrics = getPeriodMetrics();
        parts.push(`Opening: ${formatCurrency(metrics.opening, curr)}`);
        parts.push(`Inflow: +${formatCurrency(metrics.inflow, curr)}`);
        parts.push(`Outflow: -${formatCurrency(metrics.outflow, curr)}`);
        parts.push(`Closing: ${formatCurrency(metrics.closing, curr)}`);
        
        return parts.join('  |  ');
    };

    // NAYA IZAFA: Common raw filtering logic
    const getRawFilteredData = () => {
        let filtered = getLedgerWithRunningBalances(); 
        
        if (vaultDateRange !== 'all') {
            let start, end;
            const now = dayjs();
            if (vaultDateRange === 'today') { start = now.startOf('day'); end = now.endOf('day'); }
            else if (vaultDateRange === 'this_month') { start = now.startOf('month'); end = now.endOf('month'); }
            else if (vaultDateRange === 'last_month') { start = now.subtract(1, 'month').startOf('month'); end = now.subtract(1, 'month').endOf('month'); }
            else if (vaultDateRange === 'custom' && vaultCustomDates.length === 2) {
                start = dayjs(vaultCustomDates[0]).startOf('day'); end = dayjs(vaultCustomDates[1]).endOf('day');
            }
            if (start && end) {
                filtered = filtered.filter(tx => {
                    const txDate = dayjs(tx.date);
                    return txDate.isAfter(start) && txDate.isBefore(end);
                });
            }
        }
        
        if (vaultTxType !== 'all') filtered = filtered.filter(tx => tx.source === vaultTxType);
        if (vaultStaff !== 'all') {
            if (vaultStaff === 'owner') filtered = filtered.filter(tx => !tx.staff_id);
            else filtered = filtered.filter(tx => tx.staff_id === vaultStaff);
        }
        if (vaultCustomer !== 'all') filtered = filtered.filter(tx => tx.customer_id === vaultCustomer);
        if (vaultSupplier !== 'all') filtered = filtered.filter(tx => tx.supplier_id === vaultSupplier);
        if (vaultSearchText) {
            const query = vaultSearchText.toLowerCase().trim();
            filtered = filtered.filter(tx => (tx.notes && tx.notes.toLowerCase().includes(query)) || (tx.source && tx.source.toLowerCase().includes(query)));
        }
        return filtered;
    };

    const getPeriodMetrics = () => {
        const rawAll = getLedgerWithRunningBalances(); 
        const rawFiltered = getRawFilteredData(); 
        const dateOnlyFiltered = (() => {
            let filtered = [...rawAll];
            if (vaultDateRange !== 'all') {
                let start, end;
                const now = dayjs();
                if (vaultDateRange === 'today') { start = now.startOf('day'); end = now.endOf('day'); }
                else if (vaultDateRange === 'this_month') { start = now.startOf('month'); end = now.endOf('month'); }
                else if (vaultDateRange === 'last_month') { start = now.subtract(1, 'month').startOf('month'); end = now.subtract(1, 'month').endOf('month'); }
                else if (vaultDateRange === 'custom' && vaultCustomDates.length === 2) {
                    start = dayjs(vaultCustomDates[0]).startOf('day'); end = dayjs(vaultCustomDates[1]).endOf('day');
                }
                if (start && end) {
                    filtered = filtered.filter(tx => { const txDate = dayjs(tx.date); return txDate.isAfter(start) && txDate.isBefore(end); });
                }
            }
            return filtered;
        })();

        let totalInflow = 0; let totalOutflow = 0;
        rawFiltered.forEach(tx => {
            const amt = Number(tx.amount) || 0;
            if (tx.type === 'Credit (In)') totalInflow += amt;
            else if (tx.type === 'Debit (Out)') totalOutflow += amt;
        });

        let periodOpeningBalance = 0; let periodClosingBalance = 0;
        if (dateOnlyFiltered.length > 0) {
            const newestItem = dateOnlyFiltered[0];
            const oldestItem = dateOnlyFiltered[dateOnlyFiltered.length - 1];
            periodClosingBalance = newestItem.runningBalance || 0;
            periodOpeningBalance = (oldestItem.runningBalance || 0) - (oldestItem.numericQty || 0);
        } else {
            let startOfPeriod;
            const now = dayjs();
            if (vaultDateRange === 'today') startOfPeriod = now.startOf('day');
            else if (vaultDateRange === 'this_month') startOfPeriod = now.startOf('month');
            else if (vaultDateRange === 'last_month') startOfPeriod = now.subtract(1, 'month').startOf('month');
            else if (vaultDateRange === 'custom' && vaultCustomDates.length === 2) startOfPeriod = dayjs(vaultCustomDates[0]).startOf('day');

            if (startOfPeriod) {
                const beforePeriodTx = rawAll.find(tx => dayjs(tx.date).isBefore(startOfPeriod));
                if (beforePeriodTx) {
                    periodOpeningBalance = beforePeriodTx.runningBalance || 0;
                    periodClosingBalance = beforePeriodTx.runningBalance || 0;
                } else {
                    const account = paymentAccounts.find(a => a.name === selectedRegForLedger);
                    periodOpeningBalance = account ? (Number(account.opening_balance) || 0) : 0;
                    periodClosingBalance = periodOpeningBalance;
                }
            } else {
                periodOpeningBalance = currentCounterCash;
                periodClosingBalance = currentCounterCash;
            }
        }
        return { opening: periodOpeningBalance, inflow: totalInflow, outflow: totalOutflow, closing: periodClosingBalance };
    };

    const getVaultExportData = () => {
        const rawFiltered = getRawFilteredData();
        const curr = profile?.currency || 'USD'; 
        const displayRole = profile?.role ? (profile.role.charAt(0).toUpperCase() + profile.role.slice(1).toLowerCase()) : 'Owner';
        
        return rawFiltered.map(tx => {
            const staff = staffList.find(s => s.id === tx.staff_id);
            const isCredit = tx.type === 'Credit (In)';
            const sign = tx.type === 'Info' ? '' : (isCredit ? '+' : '-');
            return {
                ...tx,
                date_formatted: dayjs(tx.date).format('DD MMM YYYY, hh:mm A'),
                handled_by_name: staff ? staff.name : displayRole,
                account_name: tx.account_name || '-', // <--- NAYA IZAFA
                amount_formatted: `${sign} ${formatCurrency(tx.amount, curr)}`
            };
        });
    };

    return (
      <div style={{ marginTop: '4px' }}> 
        <Card style={cardStyle}>
          <div style={{ marginBottom: '20px' }}>
            <Text strong style={{ display: 'block', marginBottom: '12px' }}>Select Account to View Ledger:</Text>
            
            <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px' }} className="hide-scrollbar">
              
              {/* NAYA IZAFA: All Accounts (Master Ledger) Card */}
              <div 
                onClick={() => { setSelectedRegForLedger('all'); setSelectedAccountType('all'); }}
                style={{
                  minWidth: '200px',
                  padding: '12px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  border: `2px solid ${selectedRegForLedger === 'all' ? token.colorPrimary : token.colorBorderSecondary}`,
                  background: selectedRegForLedger === 'all' ? (isDarkMode ? token.colorPrimary + '22' : token.colorPrimary + '11') : 'transparent',
                  transition: 'all 0.2s ease',
                  position: 'relative'
                }}
              >
                <div style={{ position: 'absolute', top: '12px', right: '12px' }}>
                   <AppstoreOutlined style={{ color: token.colorPrimary, fontSize: '16px' }} />
                </div>
                <Text strong style={{ fontSize: '15px', display: 'block', marginBottom: '4px' }}>All Accounts</Text>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Text style={{ fontSize: '12px', color: token.colorCardColumnsTitleText }}>Master Ledger View</Text>
                </div>
              </div>

              {/* 1. Counters Render Karein */}
              {allRegisters.map(reg => {
                const isSelected = selectedRegForLedger === reg.id && selectedAccountType === 'counter';
                const activeSession = activeSessionsData.find(s => s.register_id === reg.id);
                const staffName = activeSession ? (staffList.find(s => s.id === activeSession.staff_id)?.name || 'Owner') : 'Empty';
                
                return (
                  <div 
                    key={reg.id}
                    onClick={() => { setSelectedRegForLedger(reg.id); setSelectedAccountType('counter'); }}
                    style={{
                      minWidth: '200px',
                      padding: '12px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      border: `2px solid ${isSelected ? token.colorPrimary : token.colorBorderSecondary}`,
                      background: isSelected ? (isDarkMode ? token.colorPrimary + '22' : token.colorPrimary + '11') : 'transparent',
                      transition: 'all 0.2s ease',
                      position: 'relative'
                    }}
                  >
                    <div style={{ position: 'absolute', top: '12px', right: '12px', width: '10px', height: '10px', borderRadius: '50%', background: reg.status === 'open' ? token.colorAmountPositive : token.colorTextDisabled }} />
                    <Text strong style={{ fontSize: '15px', display: 'block', marginBottom: '4px' }}>{reg.name}</Text>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <UserOutlined style={{ color: token.colorTextSecondary, fontSize: '12px' }} />
                      <Text style={{ fontSize: '12px', color: token.colorCardColumnsTitleText }}>{reg.status === 'open' ? `In Use: ${staffName}` : 'Closed'}</Text>
                    </div>
                  </div>
                );
              })}

              {/* 2. Banks & Wallets Render Karein */}
              {paymentAccounts.map(acc => {
                const isSelected = selectedRegForLedger === acc.name && selectedAccountType === 'bank';
                
                return (
                  <div 
                    key={acc.id}
                    onClick={() => { setSelectedRegForLedger(acc.name); setSelectedAccountType('bank'); }}
                    style={{
                      minWidth: '200px',
                      padding: '12px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      border: `2px solid ${isSelected ? token.colorInfo : token.colorBorderSecondary}`,
                      background: isSelected ? (isDarkMode ? token.colorInfo + '22' : token.colorInfo + '11') : 'transparent',
                      transition: 'all 0.2s ease',
                      position: 'relative'
                    }}
                  >
                    <div style={{ position: 'absolute', top: '12px', right: '12px' }}>
                       <BankOutlined style={{ color: token.colorInfo }} />
                    </div>
                    <Text strong style={{ fontSize: '15px', display: 'block', marginBottom: '4px' }}>{acc.name}</Text>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Text style={{ fontSize: '12px', color: token.colorCardColumnsTitleText }}>{acc.type}</Text>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* NAYA: Current Balance Summary Card */}
          <Row gutter={16} style={{ marginBottom: '20px' }}>
            <Col span={24}>
              <div style={{ 
                background: isDarkMode ? 'rgba(24, 144, 255, 0.1)' : '#e6f7ff', 
                padding: '15px', 
                borderRadius: '8px', 
                border: `1px solid ${token.colorPrimary}66`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <Text type="secondary">Current Estimated Balance in this Account:</Text>
                  <Title level={4} style={{ margin: 0, color: token.colorPrimary }}>
                    {formatCurrency(currentCounterCash, profile?.currency)}
                  </Title>
                </div>
                {selectedAccountType === 'counter' ? <ShopOutlined style={{ fontSize: '32px', opacity: 0.3 }} /> : <BankOutlined style={{ fontSize: '32px', opacity: 0.3 }} />}
              </div>
            </Col>
          </Row>

          {/* --- NAYA IZAFA: Inline Filters for Ledger --- */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <Text strong style={{ fontSize: '16px', color: token.colorCardHeadingsText }}>Transaction History</Text>
            <Space wrap>
                <Text type="secondary" style={{ fontSize: '12px' }}>Filter:</Text>
                
                {/* 1. Interactive Search Box */}
                <Input 
                    size="small"
                    placeholder="Search description..." 
                    prefix={<SearchOutlined style={{ color: token.colorTextSecondary }} />}
                    value={vaultSearchText}
                    onChange={(e) => setVaultSearchText(e.target.value)}
                    style={{ width: '160px' }}
                    allowClear
                />

                {/* NAYA IZAFA: Customer Search & Select Filter (Only shown for cash/bank) */}
                <Select 
                    showSearch
                    size="small" 
                    placeholder="Select Customer"
                    value={vaultCustomer} 
                    onChange={setVaultCustomer} 
                    style={{ width: 150 }} 
                    styles={{ popup: { root: { zIndex: 2000 } } }}
                    filterOption={(input, option) =>
                      (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                    }
                >
                    <Select.Option value="all">All Customers</Select.Option>
                    {customerList.map(c => (
                        <Select.Option value={c.id} key={c.id}>{c.name}</Select.Option>
                    ))}
                </Select>

                {/* NAYA IZAFA: Supplier Search & Select Filter */}
                <Select 
                    showSearch
                    size="small" 
                    placeholder="Select Supplier"
                    value={vaultSupplier} 
                    onChange={setVaultSupplier} 
                    style={{ width: 150 }} 
                    styles={{ popup: { root: { zIndex: 2000 } } }}
                    filterOption={(input, option) =>
                      (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                    }
                >
                    <Select.Option value="all">All Suppliers</Select.Option>
                    {supplierList.map(s => (
                        <Select.Option value={s.id} key={s.id}>{s.name}</Select.Option>
                    ))}
                </Select>

                {/* 2. Handled by (Staff) Dropdown Filter */}
                <Select 
                    size="small" 
                    value={vaultStaff} 
                    onChange={setVaultStaff} 
                    style={{ width: 140 }} 
                    styles={{ popup: { root: { zIndex: 2000 } } }}
                >
                    <Select.Option value="all">All Handlers</Select.Option>
                    <Select.Option value="owner">{profile?.role ? (profile.role.charAt(0).toUpperCase() + profile.role.slice(1).toLowerCase()) : 'Owner'}</Select.Option>
                    {staffList.map(s => (
                        <Select.Option value={s.id} key={s.id}>{s.name}</Select.Option>
                    ))}
                </Select>

                {/* 3. Transaction Type Filter */}
                <Select size="small" value={vaultTxType} onChange={setVaultTxType} style={{ width: 160 }} styles={{ popup: { root: { zIndex: 2000 } } }}>
                    <Select.Option value="all">All Transactions</Select.Option>
                    <Select.Option value="Sales">Sales</Select.Option>
                    <Select.Option value="Credit Settlement">Sale Returns / Payouts</Select.Option>
                    <Select.Option value="Collection">Customer Payments</Select.Option>
                    <Select.Option value="Supplier Payment">Supplier Payments</Select.Option>
                    <Select.Option value="Expense">Expenses</Select.Option>
                    <Select.Option value="Supplier Refund">Supplier Refunds</Select.Option>
                    <Select.Option value="Manual Adjustment / Transfer">Adjustments / Transfers</Select.Option>
                </Select>

                {/* 4. Date Filter */}
                <Select size="small" value={vaultDateRange} onChange={(val) => { setVaultDateRange(val); setVaultCustomDates([]); }} style={{ width: 120 }} styles={{ popup: { root: { zIndex: 2000 } } }}>
                    <Select.Option value="all">All Time</Select.Option>
                    <Select.Option value="today">Today</Select.Option>
                    <Select.Option value="this_month">This Month</Select.Option>
                    <Select.Option value="last_month">Last Month</Select.Option>
                    <Select.Option value="custom">Custom Range</Select.Option>
                </Select>

                {vaultDateRange === 'custom' && (
                    <DatePicker.RangePicker
                        size="small"
                        format="DD/MM/YYYY"
                        onChange={(dates) => {
                            if (dates) setVaultCustomDates([dates[0].toISOString(), dates[1].toISOString()]);
                            else setVaultCustomDates([]);
                        }}
                        style={{ width: 220 }}
                    />
                )}

                {/* 5. Reset Filters Button */}
                <Tooltip title="Reset Filters">
                    <Button 
                        size="small" 
                        type="text" 
                        icon={<UndoOutlined />} 
                        onClick={() => {
                            setVaultTxType('all');
                            setVaultDateRange('this_month');
                            setVaultStaff('all');
                            setVaultCustomer('all'); // <--- NAYA IZAFA: Customer Reset
                            setVaultSupplier('all'); // <--- NAYA IZAFA: Supplier Reset
                            setVaultSearchText(''); // <--- NAYA IZAFA: Search clear ho jaye
                            setVaultCustomDates([]);
                        }} 
                    />
                </Tooltip>

                {/* NAYA IZAFA: View Mode Switch (Detailed vs Summary) */}
                <Radio.Group 
                    value={vaultViewMode} 
                    onChange={(e) => setVaultViewMode(e.target.value)} 
                    size="small"
                    buttonStyle="solid"
                >
                    <Radio.Button value="detailed">Detailed</Radio.Button>
                    <Radio.Button value="grouped">Summary</Radio.Button>
                </Radio.Group>

                {/* 6. Reusable Export Component (far-right par aligned hai) */}
                <DataExport 
                    data={getVaultExportData()}
                    exportColumns={[
                        { title: 'Date & Time', dataIndex: 'date_formatted' },
                        { title: 'Account', dataIndex: 'account_name' }, // <--- NAYA IZAFA
                        { title: 'Source', dataIndex: 'source' },
                        { title: 'Description', dataIndex: 'notes' },
                        { title: 'Handled by', dataIndex: 'handled_by_name' },
                        { title: 'Type', dataIndex: 'type' },
                        { title: 'Amount', dataIndex: 'amount_formatted' }
                    ]}
                    fileName={`Ledger_${getSelectedAccountDisplayName().replace(/\s+/g, '_')}`}
                    reportTitle={`Account Ledger: ${getSelectedAccountDisplayName()}`}
                    reportSubtitle={getVaultFilterDescription()}
                />
            </Space>
          </div>

          {/* ... (Summary Card Code remains the same) ... */}
          {(() => {
              const metrics = getPeriodMetrics();
              return (
                <Card 
                  size="small" 
                  style={{ 
                      marginBottom: '16px', 
                      background: token.colorFillAlter, 
                      border: `1px dashed ${token.colorBorder}`,
                      position: 'relative' 
                  }}
                  styles={{ body: { padding: '16px' } }} 
                >
                  <div style={{ position: 'absolute', top: '10px', right: '14px', zIndex: 10 }}>
                    <Tooltip 
                      title={
                        <div style={{ padding: '4px' }}>
                          <p style={{ margin: '0 0 6px 0' }}><b>• Opening / Closing Balances:</b> Represent the actual account balances on the first and last day of the selected period.</p>
                          <p style={{ margin: 0 }}><b>• Inflow / Outflow:</b> Show the total funds received and spent matching all your active filters (Search, Handled by, Type).</p>
                        </div>
                      }
                      styles={{ root: { maxWidth: '300px' } }} 
                    >
                      <InfoCircleOutlined style={{ color: token.colorTextSecondary, cursor: 'pointer', fontSize: '14px' }} />
                    </Tooltip>
                  </div>

                  <Row gutter={[16, 8]} align="middle">
                    <Col xs={12} sm={6}>
                      <Statistic title={<Text type="secondary" style={{ fontSize: '11px' }}>Period Opening Balance</Text>} value={metrics.opening} formatter={(val) => formatCurrency(val, profile?.currency)} valueStyle={{ fontSize: '14px', fontWeight: 'bold', color: token.colorText }} />
                    </Col>
                    <Col xs={12} sm={6}>
                      <Statistic title={<Text type="secondary" style={{ fontSize: '11px' }}>Total Inflow (+)</Text>} value={metrics.inflow} formatter={(val) => formatCurrency(val, profile?.currency)} valueStyle={{ fontSize: '14px', fontWeight: 'bold', color: token.colorAmountPositive }} />
                    </Col>
                    <Col xs={12} sm={6}>
                      <Statistic title={<Text type="secondary" style={{ fontSize: '11px' }}>Total Outflow (-)</Text>} value={metrics.outflow} formatter={(val) => formatCurrency(val, profile?.currency)} valueStyle={{ fontSize: '14px', fontWeight: 'bold', color: token.colorAmountNegative }} />
                    </Col>
                    <Col xs={12} sm={6}>
                      <Statistic title={<Text type="secondary" style={{ fontSize: '11px' }}>Period Closing Balance</Text>} value={metrics.closing} formatter={(val) => formatCurrency(val, profile?.currency)} valueStyle={{ fontSize: '15px', fontWeight: 'bold', color: token.colorPrimary }} />
                    </Col>
                  </Row>
                </Card>
              );
          })()}

          <Table 
            dataSource={vaultViewMode === 'grouped' ? getGroupedVaultData() : getRawFilteredData()} // <--- NAYA IZAFA: Conditional Data
            rowKey={(record) => record.key || record.id} // <--- NAYA IZAFA: Dynamic safe RowKey
            pagination={vaultViewMode === 'grouped' ? false : { pageSize: 10 }} // <--- NAYA IZAFA: Grouped view mein pagination off (Accordion design)
            columns={vaultViewMode === 'grouped' ? groupedColumns : [ // <--- NAYA IZAFA: Conditional Columns
              { title: 'Date & Time', dataIndex: 'date', render: d => dayjs(d).format('DD MMM YYYY, hh:mm A') },
              { title: 'Account', dataIndex: 'account_name', render: t => <Text strong>{t || '-'}</Text> }, 
              { title: 'Source', dataIndex: 'source' },
              { title: 'Description', dataIndex: 'notes' },
              
              // NAYA IZAFA: Handled by Column (Responsive & Customized)
              { 
                title: 'Handled by', 
                dataIndex: 'staff_id', 
                render: (staffId) => {
                  const staff = staffList.find(s => s.id === staffId);
                  const displayRole = profile?.role ? (profile.role.charAt(0).toUpperCase() + profile.role.slice(1).toLowerCase()) : 'Owner';
                  return <Text strong style={{ whiteSpace: 'nowrap' }}>{staff ? staff.name : displayRole}</Text>;
                } 
              },

              { 
                title: 'Type', 
                dataIndex: 'type', 
                render: t => {
                  if (t === 'Credit (In)') return <Tag color="green">{t}</Tag>;
                  if (t === 'Debit (Out)') return <Tag color="volcano">{t}</Tag>;
                  return <Tag color="blue">{t}</Tag>; 
                }
              },
              { 
                title: 'Amount', 
                dataIndex: 'amount', 
                align: 'right', 
                width: 140, 
                render: (v, rec) => {
                  if (rec.type === 'Info') return <Text type="secondary" style={{ whiteSpace: 'nowrap' }}>{formatCurrency(v, profile?.currency)}</Text>;
                  const isCredit = rec.type === 'Credit (In)';
                  return (
                    <Text strong style={{ color: isCredit ? token.colorAmountPositive : token.colorAmountNegative, whiteSpace: 'nowrap' }}>
                      {isCredit ? '+' : '-'} {formatCurrency(v, profile?.currency)}
                    </Text>
                  );
                } 
              }
            ]}
          />
        </Card>
      </div>
    );
  };

  const tabItems =[
    {
      key: 'sales',
      label: <span><LineChartOutlined /> Sales & Revenue</span>,
      children: renderSalesTab(), // Yahan humne naya function laga diya hai
    },
    {
      key: 'profit_loss',
      label: <span><DollarOutlined /> Profit & Loss</span>,
      children: renderProfitLossTab(),
    },
    {
      key: 'inventory',
      label: <span><InboxOutlined /> Inventory & Assets</span>,
      children: renderInventoryTab(),
    },
    {
      key: 'ledgers',
      label: <span><BookOutlined /> Ledgers & Accounts</span>,
      children: renderLedgersTab(),
    },
    {
      key: 'audit',
      label: <span><SafetyCertificateOutlined /> Cash & Audit</span>,
      children: renderAuditTab(),
    },
    {
      key: 'vault_flow',
      label: <span><ShopOutlined /> Account Ledgers</span>,
      children: renderVaultFlowTab(),
    },
    {
      key: 'balance_sheet',
      label: <span><TableOutlined /> Balance Sheet</span>,
      children: <BalanceSheet />, // <--- NAYA IZAFA
    },
  ];

  // Agar profile abhi tak load nahi hui, toh flicker se bachne ke liye loading dikhayein
  if (!profile) return (
    <div style={{ textAlign: 'center', padding: '150px' }}>
      <Spin size="large" tip="Verifying Subscription...">
        <div style={{ padding: '50px' }} />
      </Spin>
    </div>
  );

  return (
    <ConfigProvider theme={{ 
      components: { 
        Table: { colorBgContainer: token.colorTableBg, headerBg: token.colorTableHeaderBg, headerColor: token.colorCardColumnsTitleText, colorText: token.colorCardDetailsText },
        Tabs: { itemActiveBg: token.colorCardBg, cardBg: token.colorBgLayout, colorBorderSecondary: token.colorBorder }
      } 
    }}>
    <div style={{ padding: isMobile ? '12px 4px' : '4px', position: 'relative', minHeight: '80vh' }}>
      
      {/* --- LOCK OVERLAY CARD --- */}
      {isLocked && (
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          zIndex: 100,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          paddingTop: '100px',
          background: 'rgba(255, 255, 255, 0.01)', // Halka sa transparent background
        }}>
          <Card 
            style={{ 
              maxWidth: 500, 
              textAlign: 'center', 
              borderRadius: 12, 
              boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
              border: `1px solid ${token.colorBorder}`
            }}
          >
            <PieChartOutlined style={{ fontSize: 60, color: '#bfbfbf', marginBottom: 20 }} />
            <Title level={3}>Business Intelligence</Title>
            <Text type="secondary" style={{ fontSize: 16, display: 'block', marginBottom: 24 }}>
              Unlock advanced sales trends, profit analytics, inventory valuation, and automated tax reports with the Growth or Pro Plans.
            </Text>
            <Button type="primary" size="large" onClick={() => navigate('/subscription')}>
              View Upgrade Plans
            </Button>
          </Card>
        </div>
      )}

      {/* --- ACTUAL CONTENT (Blurred if locked) --- */}
      <div style={{ 
        filter: isLocked ? 'blur(3px)' : 'none', 
        pointerEvents: isLocked ? 'none' : 'auto',
        transition: 'filter 0.3s ease'
      }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        {isMobile ? (
          <Title level={2} style={{ margin: 0, marginLeft: '8px', fontSize: '23px' }}>
            <LineChartOutlined /> Reports & Analytics
          </Title>
        ) : (
          <div /> 
        )}
        
        <Space wrap>
          {/* Quick Filters (Today, Week, Month) */}
          {['sales', 'profit_loss', 'audit'].includes(activeTab) && (
            <Space wrap>
              <Radio.Group value={timeRange} onChange={handleRangeChange} buttonStyle="solid">
                <Radio.Button value="today">Today</Radio.Button>
                <Radio.Button value="week">This Week</Radio.Button>
                <Radio.Button value="month">This Month</Radio.Button>
                <Radio.Button value="custom">Custom Range</Radio.Button>
              </Radio.Group>

              {/* RangePicker sirf tab dikhega jab 'Custom Range' select ho */}
              {timeRange === 'custom' && (
                <RangePicker 
                  value={dateRange} 
                  onChange={(dates) => {
                    if(dates) setDateRange(dates);
                  }} 
                  allowClear={false}
                />
              )}
            </Space>
          )}
        </Space>
      </div>
      
      <Tabs 
        activeKey={activeTab}
        onChange={(key) => {
          setActiveTab(key);
          setSearchParams({ tab: key }); // URL mein ?tab=... update karega
        }}
        items={tabItems} 
        tabPosition="top"
        type="card"
        tabBarExtraContent={!isMobile && (
          <Dropdown
            menu={{
              items: [
                {
                  key: '1',
                  label: 'Export Current Tab (Excel)',
                  icon: <FileExcelOutlined />,
                  onClick: handleCurrentTabExport,
                },
                {
                  key: '2',
                  label: 'Export All Tabs (Master Excel)',
                  icon: <FileExcelOutlined />,
                  onClick: handleMasterExport,
                },
                {
                  type: 'divider',
                },
                {
                  key: '3',
                  label: 'Print Current Tab (PDF)',
                  icon: <PrinterOutlined />,
                  onClick: handleCurrentTabPdfExport,
                },
              ],
            }}
            placement="bottomRight"
          >
            <Button 
              type="primary" 
              style={{ backgroundColor: '#1d6f42', borderColor: '#1d6f42', marginBottom: '8px' }}
            >
              <Space>
                <FileExcelOutlined />
                Export
                <DownOutlined style={{ fontSize: '12px' }} />
              </Space>
            </Button>
          </Dropdown>
        )}
      />
    </div> {/* Content Wrapper End */}

    {/* --- NAYA IZAFA: P&L Export & Print Wizard Modal --- */}
    <Modal
        title="Export & Print Wizard (Profit & Loss Ledger)"
        open={isPLExportWizardOpen}
        onCancel={() => {
            setIsPLExportWizardOpen(false);
            setPLExportDateRangeType('current');
            setPLExportCustomDates([]);
            setPlSelectedColumns(['gross_sales', 'returns', 'discounts', 'taxes', 'grand_total', 'cogs', 'expenses', 'damaged_loss', 'net_profit']);
        }}
        footer={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text type="secondary" style={{ fontSize: '11px' }}>
                {plExportLoading ? 'Calculating data...' : `${plExportData.length} ${plExportData.length === 1 ? 'Day' : 'Days'} with Activity`}
            </Text>
            <Space>
                {plExportData.length > 0 && !plExportLoading && (
                <DataExport
                    data={(() => {
                        const formatted = plExportData.map(item => ({
                            ...item,
                            gross_sales: formatCurrency(item.gross_sales, profile?.currency),
                            returns: formatCurrency(item.returns, profile?.currency),
                            discounts: formatCurrency(item.discounts, profile?.currency),
                            taxes: formatCurrency(item.taxes, profile?.currency),
                            grand_total: formatCurrency(item.grand_total, profile?.currency),
                            cogs: formatCurrency(item.cogs, profile?.currency),
                            expenses: formatCurrency(item.expenses, profile?.currency),
                            damaged_loss: formatCurrency(item.damaged_loss, profile?.currency),
                            net_profit: formatCurrency(item.net_profit, profile?.currency)
                        }));

                        // NAYA IZAFA: Grand Total ki calculation karke uski ek naye row banana
                        let tGross = 0, tRet = 0, tDisc = 0, tTax = 0, tNetRev = 0, tCogs = 0, tExp = 0, tDmg = 0, tNet = 0;
                        plExportData.forEach(r => {
                            tGross += r.gross_sales; tRet += r.returns; tDisc += r.discounts; tTax += r.taxes;
                            tNetRev += r.grand_total; tCogs += r.cogs; tExp += r.expenses; tDmg += r.damaged_loss; tNet += r.net_profit;
                        });
                        
                        // Aakhir mein total wali row ko export data mein shamil kar dena
                        formatted.push({
                            date: 'GRAND TOTAL',
                            gross_sales: formatCurrency(tGross, profile?.currency),
                            returns: formatCurrency(tRet, profile?.currency),
                            discounts: formatCurrency(tDisc, profile?.currency),
                            taxes: formatCurrency(tTax, profile?.currency),
                            grand_total: formatCurrency(tNetRev, profile?.currency),
                            cogs: formatCurrency(tCogs, profile?.currency),
                            expenses: formatCurrency(tExp, profile?.currency),
                            damaged_loss: formatCurrency(tDmg, profile?.currency),
                            net_profit: formatCurrency(tNet, profile?.currency)
                        });

                        return formatted;
                    })()}
                    exportColumns={[
                        { title: 'Date', dataIndex: 'date' },
                        ...(plSelectedColumns.includes('gross_sales') ? [{ title: 'Gross Sales', dataIndex: 'gross_sales' }] : []),
                        ...(plSelectedColumns.includes('returns') ? [{ title: 'Returns', dataIndex: 'returns' }] : []),
                        ...(plSelectedColumns.includes('discounts') ? [{ title: 'Discounts', dataIndex: 'discounts' }] : []),
                        ...(plSelectedColumns.includes('taxes') ? [{ title: 'Taxes', dataIndex: 'taxes' }] : []),
                        ...(plSelectedColumns.includes('grand_total') ? [{ title: 'Net Revenue', dataIndex: 'grand_total' }] : []),
                        ...(plSelectedColumns.includes('cogs') ? [{ title: 'Product Cost (COGS)', dataIndex: 'cogs' }] : []),
                        ...(plSelectedColumns.includes('expenses') ? [{ title: 'Expenses', dataIndex: 'expenses' }] : []),
                        ...(plSelectedColumns.includes('damaged_loss') ? [{ title: 'Damaged Loss', dataIndex: 'damaged_loss' }] : []),
                        ...(plSelectedColumns.includes('net_profit') ? [{ title: 'Net Profit/Loss', dataIndex: 'net_profit' }] : [])
                    ]}
                    fileName="Daily_Profit_Loss_Ledger"
                    reportTitle="Daily Profit & Loss Ledger Statement"
                    reportSubtitle={plExportDateRangeType === 'current' ? `Period: ${dateRange[0].format('DD MMM YY')} to ${dateRange[1].format('DD MMM YY')}` : `Custom Export`}
                />
                )}
                <Button onClick={() => setIsPLExportWizardOpen(false)}>Close</Button>
            </Space>
            </div>
        }
        centered
        width="65%"
    >
        <Form layout="vertical" style={{ marginTop: '16px' }}>
            {/* 1. Date Range Configuration */}
            <Form.Item label={<Text strong>1. Select Date Range</Text>}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', width: '100%', flexWrap: 'wrap' }}>
                    <Select
                        value={['current', 'today', 'yesterday', 'week', 'month', 'year'].includes(plExportDateRangeType) ? plExportDateRangeType : undefined}
                        onChange={(val) => {
                            setPLExportDateRangeType(val);
                            handlePLExportRangeChange(val);
                        }}
                        style={{ flex: 1.5, minWidth: '160px' }}
                        placeholder="Choose Preset Range"
                        styles={{ popup: { root: { zIndex: 2000 } } }}
                        allowClear={false}
                    >
                        <Select.Option value="current">Active Filter (On Screen)</Select.Option>
                        <Select.Option value="today">Today Only</Select.Option>
                        <Select.Option value="yesterday">Yesterday</Select.Option>
                        <Select.Option value="week">This Week</Select.Option>
                        <Select.Option value="month">This Month</Select.Option>
                        <Select.Option value="year">This Year</Select.Option>
                    </Select>

                    <Button 
                        type={plExportDateRangeType === 'custom' ? 'primary' : 'default'} 
                        onClick={() => {
                            setPLExportDateRangeType('custom');
                            handlePLExportRangeChange('custom', plExportCustomDates);
                        }}
                        style={{ flex: 1, minWidth: '110px' }}
                    >
                        Custom Range
                    </Button>
                </div>
            </Form.Item>

            {plExportDateRangeType === 'custom' && (
                <Form.Item label="Select Custom Range" required>
                    <DatePicker.RangePicker
                        format="DD/MM/YYYY"
                        value={plExportCustomDates.length === 2 ? [dayjs(plExportCustomDates[0]), dayjs(plExportCustomDates[1])] : null}
                        onChange={(dates) => {
                            if (dates) {
                                setPLExportCustomDates([dates[0].toISOString(), dates[1].toISOString()]);
                                handlePLExportRangeChange('custom', dates);
                            } else {
                                setPLExportCustomDates([]);
                            }
                        }}
                        style={{ width: '100%' }}
                    />
                </Form.Item>
            )}

            {/* 2. Columns Selection */}
            <Form.Item label={<Text strong>2. Select Columns to Include</Text>}>
                <Checkbox.Group
                    value={plSelectedColumns}
                    onChange={(vals) => {
                        if (vals.length > 0) setPlSelectedColumns(vals);
                        else message.warning('At least one column must be selected.');
                    }}
                    style={{ width: '100%' }}
                >
                    <Row gutter={[16, 8]}>
                        <Col span={8}><Checkbox value="gross_sales">Gross Sales</Checkbox></Col>
                        <Col span={8}><Checkbox value="returns">Returns (-)</Checkbox></Col>
                        <Col span={8}><Checkbox value="discounts">Discounts (-)</Checkbox></Col>
                        <Col span={8}><Checkbox value="taxes">Taxes (+)</Checkbox></Col>
                        <Col span={8}><Checkbox value="grand_total">Net Revenue</Checkbox></Col>
                        <Col span={8}><Checkbox value="cogs">Product Cost (COGS)</Checkbox></Col>
                        <Col span={8}><Checkbox value="expenses">Expenses (-)</Checkbox></Col>
                        <Col span={8}><Checkbox value="damaged_loss">Damaged Loss (-)</Checkbox></Col>
                        <Col span={8}><Checkbox value="net_profit">Net Profit/Loss</Checkbox></Col>
                    </Row>
                </Checkbox.Group>
            </Form.Item>
        </Form>
    </Modal>
    </div>
    </ConfigProvider>
  );
};

export default Reports;