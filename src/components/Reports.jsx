import React, { useState, useEffect } from 'react';
import { Typography, Tabs, Card, Row, Col, Statistic, Spin, DatePicker, Space, theme, Table, Progress, Divider, Tag, Empty, Button, Dropdown, Menu, Radio, Badge, Tooltip, App } from 'antd';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/currencyFormatter';
import DataService from '../DataService';
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
  HistoryOutlined
} from '@ant-design/icons';
import * as XLSX from 'xlsx';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const Reports = () => {
  const { message } = App.useApp(); // <--- NAYA IZAFA: Theme wala message
  const navigate = useNavigate(); 
  const[searchParams, setSearchParams] = useSearchParams(); // Naya: URL parameters ke liye
  const { token } = theme.useToken();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { profile } = useAuth();
  
  // --- SUBSCRIPTION CHECK ---
  const limits = getPlanLimits(profile?.subscription_tier);
  // Hum check kar rahe hain ke profile mojood hai tabhi lock apply ho
  const isLocked = profile ? !limits.allow_reports : false;
  // --- UPDATED: Universal Glow Style (Light & Dark Compatible) ---
  const cardStyle = {
    borderRadius: 8,
    // Border ko thora aur wazeh kiya (33 means ~20% opacity)
    border: `1px solid ${token.colorPrimary}33`, 
    // Shadow ko thora "Soft" aur "Deep" kiya taake Light mode mein bhi nazar aaye
    boxShadow: `0 4px 12px ${token.colorPrimary}15`, 
    height: '100%',
    transition: 'all 0.3s ease', // Theme badalte waqt smooth transition
    backgroundColor: token.colorBgContainer // Card ka apna background theme ke mutabiq
  };
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'sales');

  // --- STATES ---
  const [loading, setLoading] = useState(false);
  const[overviewData, setOverviewData] = useState(null);
  const [salesData, setSalesData] = useState(null); // NAYI STATE: Sales Data ke liye
  const [profitLossData, setProfitLossData] = useState(null); // NAYI STATE: P&L Data ke liye
  const [inventoryData, setInventoryData] = useState(null); // NAYI STATE: Inventory Data
  const [ledgerData, setLedgerData] = useState(null); // NAYI STATE: Ledger Data
  const [auditData, setAuditData] = useState(null); // NAYI STATE: Audit Data
  const [staffList, setStaffList] = useState([]); // NAYI STATE: Staff Names ke liye
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
      ctx.fillStyle = token.colorText;
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
          // NAYA IZAFA: Profit & Loss Data mangwana
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
      } catch (error) {
        console.error("Failed to fetch report data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchReportData();
  }, [dateRange, activeTab]);

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
            <Card style={{ borderRadius: 8, borderLeft: `4px solid ${token.colorSuccess}` }}>
              <Statistic title="Net Profit" value={overviewData.netProfit} prefix={<RiseOutlined />} valueStyle={{ color: token.colorSuccess }} formatter={(val) => formatCurrency(val, profile?.currency)} />
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
              <Text type="secondary" style={{ fontSize: '11px' }}>*Based on purchase price of available items</Text>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Card style={{ borderRadius: 8, borderLeft: `4px solid ${token.colorError}` }}>
              <Statistic title="Accounts Receivable" value={overviewData.totalReceivables} prefix={<WalletOutlined />} valueStyle={{ color: token.colorError }} formatter={(val) => formatCurrency(val, profile?.currency)} />
              <Text type="secondary" style={{ fontSize: '11px' }}>*Outstanding from Customers & Staff</Text>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Card style={{ borderRadius: 8, borderLeft: `4px solid #faad14` }}>
              <Statistic title="Accounts Payable" value={overviewData.totalPayables} prefix={<WalletOutlined />} formatter={(val) => formatCurrency(val, profile?.currency)} />
              <Text type="secondary" style={{ fontSize: '11px' }}>*Outstanding to Suppliers</Text>
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

        ctx.fillStyle = token.colorText;
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
          borderColor: token.colorSuccess,
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
            <Card title={<Text strong style={{ fontSize: '16px' }}>Sales Trend (Revenue Over Time)</Text>} style={cardStyle}>
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
              title={<Text strong style={{ fontSize: '16px' }}>Category Breakdown</Text>} 
              extra={
                <Space size="small">
                  <Text type="secondary" style={{ fontSize: '12px' }}>View by:</Text>
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
          title={<Text strong style={{ fontSize: '16px' }}><RiseOutlined /> Financial Performance & Tax Summary</Text>}
          size="small"
          style={{ ...cardStyle, marginTop: '16px', height: 'auto' }} 
          styles={{ body: { padding: '16px 24px' } }}
        >
          <Row gutter={[24, 16]} align="top">
            {/* Cash Sales */}
            <Col xs={24} sm={12} md={5}>
              <Statistic 
                title={<Space><WalletOutlined style={{ color: token.colorSuccess }} /> Cash Sales</Space>} 
                value={salesData.cashSales} 
                formatter={(val) => formatCurrency(val, profile?.currency)} 
                valueStyle={{ fontSize: '20px' }}
              />
              <div style={{ height: '20px', marginTop: 4 }}>
                <Progress percent={cashPercent} size="small" strokeColor={token.colorSuccess} showInfo={false} />
                <Text type="secondary" style={{ fontSize: '10px' }}>{cashPercent}% of total</Text>
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
              <div style={{ height: '20px', marginTop: 4 }}>
                <Progress percent={bankPercent} size="small" strokeColor={token.colorInfo} showInfo={false} />
                <Text type="secondary" style={{ fontSize: '10px' }}>{bankPercent}% of total</Text>
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
                valueStyle={{ color: token.colorError, fontSize: '18px' }} 
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
              title={<Text strong style={{ fontSize: '16px' }}><TeamOutlined /> Staff Performance</Text>} 
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
                  { title: 'Profit', dataIndex: 'profit', key: 'profit', align: 'right', render: (val) => <Text strong style={{ color: token.colorSuccess }}>{formatCurrency(val, profile?.currency)}</Text> }
                ]}
              />
            </Card>
          </Col>

          {/* Top Selling Products (Aligned Header & Rich Data) */}
          <Col xs={24} lg={12}>
            <Card 
              title={<Text strong style={{ fontSize: '16px' }}><TrophyOutlined style={{ color: '#faad14' }} /> Top 10 Selling Products</Text>} 
              extra={
                <Space size="small">
                  <Text type="secondary" style={{ fontSize: '12px' }}>Sort by:</Text>
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
                    render: (val) => <Text strong style={{ color: productFilter === 'profit' ? token.colorSuccess : 'inherit', opacity: productFilter === 'profit' ? 1 : 0.6 }}>{formatCurrency(val, profile?.currency)}</Text> 
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
          borderColor: token.colorSuccess,
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
        ctx.fillStyle = token.colorText;
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
      { label: 'Sales Returns & Refunds', value: profitLossData.totalRefunds || 0, color: token.colorError, isNegative: true },
      { label: 'Net Revenue (A)', value: profitLossData.totalRevenue, color: 'inherit', bold: true, borderTop: true },
      { label: 'Cost of Goods Sold (B)', value: profitLossData.totalCost, color: token.colorError, isNegative: true },
      { label: 'Gross Profit (A - B)', value: profitLossData.grossProfit, color: token.colorSuccess, bold: true },
      { label: 'Total Operating Expenses (C)', value: profitLossData.totalExpenses, color: token.colorWarning, isNegative: true },
      { label: 'Damaged Stock Loss (D)', value: profitLossData.damagedLoss || 0, color: '#fa541c', isNegative: true },
      { label: 'NET PROFIT (After all losses)', value: profitLossData.netProfit, color: token.colorSuccess, bold: true, highlight: true },
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
            <Card size="small" style={{ ...cardStyle, borderLeft: `4px solid ${token.colorError}` }}>
              <Statistic title="Total COGS" value={profitLossData.totalCost} formatter={(val) => formatCurrency(val, profile?.currency)} valueStyle={{ fontSize: '18px' }} />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card size="small" style={{ ...cardStyle, borderLeft: `4px solid ${token.colorWarning}` }}>
              <Statistic title="Total Expenses" value={profitLossData.totalExpenses} formatter={(val) => formatCurrency(val, profile?.currency)} valueStyle={{ fontSize: '18px' }} />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card size="small" style={{ ...cardStyle, borderLeft: `4px solid ${token.colorSuccess}` }}>
              <Statistic title="Net Profit" value={profitLossData.netProfit} formatter={(val) => formatCurrency(val, profile?.currency)} valueStyle={{ fontSize: '20px', color: token.colorSuccess, fontWeight: 'bold' }} />
            </Card>
          </Col>
        </Row>

        {/* Row 2: Charts Side-by-Side (Aligned & Consistent) */}
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={14}>
            <Card 
              title={<Text strong style={{ fontSize: '16px' }}><RiseOutlined /> Profit Trend (Daily)</Text>} 
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
              title={<Text strong style={{ fontSize: '16px' }}><PieChartOutlined /> Expense Distribution</Text>} 
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
            <Card title={<Text strong style={{ fontSize: '16px' }}>Detailed P&L Statement</Text>} style={cardStyle}>
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
            <Card title={<Text strong style={{ fontSize: '16px' }}>Profitability Insight</Text>} style={cardStyle}>
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <Statistic 
                  title="Net Profit Margin" 
                  value={profitLossData.profitMargin} 
                  suffix="%" 
                  valueStyle={{ color: token.colorSuccess, fontSize: '32px', fontWeight: 'bold' }} 
                />
                <Progress 
                  type="dashboard" 
                  percent={profitLossData.profitMargin} 
                  strokeColor={token.colorSuccess} 
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
      </div>
    );
  };

  // --- UPDATED: INVENTORY & ASSETS TAB UI (With Slow Moving & Damaged) ---
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
            <Card size="small" style={{ ...cardStyle, borderLeft: `4px solid ${token.colorSuccess}` }}>
              <Statistic title="Potential Profit" value={inventoryData.totalPotentialProfit} formatter={(val) => formatCurrency(val, profile?.currency)} valueStyle={{ fontSize: '20px', color: token.colorSuccess }} />
            </Card>
          </Col>
          <Col xs={12} md={4}>
            <Card size="small" style={{ ...cardStyle, borderLeft: `4px solid ${token.colorError}` }}>
              <Statistic title="Out of Stock" value={inventoryData.outOfStockItems?.length || 0} valueStyle={{ color: token.colorError, fontSize: '18px' }} />
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
              <Text type="secondary" style={{ fontSize: '10px' }}>Total value of unusable items</Text>
            </Card>
          </Col>
        </Row>

        {/* Row 2: Distribution Charts */}
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <Card title={<Text strong style={{ fontSize: '16px' }}>Assets by Category</Text>} style={cardStyle}>
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
            <Card title={<Text strong style={{ fontSize: '16px' }}>Assets by Brand</Text>} style={cardStyle}>
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
            <Card title={<Text strong style={{ fontSize: '16px' }}>Brand-wise Valuation</Text>} style={cardStyle} styles={{ body: { padding: 0 } }}>
              <Table
                dataSource={inventoryData.brandValuation}
                rowKey="name"
                pagination={{ pageSize: 6 }}
                size="small"
                columns={[
                  { title: 'Brand', dataIndex: 'name', key: 'name' },
                  { title: 'Qty', dataIndex: 'qty', key: 'qty', align: 'center' },
                  { title: 'Asset Value', dataIndex: 'value', key: 'value', align: 'right', render: (val) => formatCurrency(val, profile?.currency) },
                  { title: 'Potential Profit', dataIndex: 'profit', key: 'profit', align: 'right', render: (val) => <Text strong style={{ color: token.colorSuccess }}>{formatCurrency(val, profile?.currency)}</Text> }
                ]}
              />
            </Card>
          </Col>
          <Col xs={24} lg={10}>
            <Card title={<Text strong style={{ fontSize: '16px' }}>Inventory Health</Text>} style={cardStyle} styles={{ body: { padding: '0 16px' } }}>
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
          backgroundColor:[token.colorInfo + '88', token.colorError + '88'],
          borderColor: [token.colorInfo, token.colorError],
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
        backgroundColor: [token.colorSuccess, token.colorWarning, token.colorError],
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
        ctx.fillStyle = token.colorText;
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
                <Text type="secondary" style={{ fontSize: '10px' }}>Customers + Staff Advances</Text>
                <Tooltip title="Money owed to customers due to returns/overpayments">
                  <Tag color="blue" style={{ fontSize: '10px', margin: 0, fontWeight: 'bold' }}>
  Credits: {formatCurrency(ledgerData.totalCustomerCredits || 0, profile?.currency)}
</Tag>
                </Tooltip>
              </div>
            </Card>
          </Col>
          <Col xs={12} md={8}>
            <Card size="small" style={{ ...cardStyle, borderLeft: `4px solid ${token.colorError}` }}>
              <Statistic title="Total Payables" value={ledgerData.grandTotalPayable} formatter={(val) => formatCurrency(val, profile?.currency)} valueStyle={{ fontSize: '20px', color: token.colorError }} />
              <Text type="secondary" style={{ fontSize: '10px' }}>Suppliers + Salaries Due</Text>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card size="small" style={{ ...cardStyle, borderLeft: `4px solid ${ledgerData.netPosition >= 0 ? token.colorSuccess : token.colorError}` }}>
              <Statistic title="Net Cash Position" value={ledgerData.netPosition} formatter={(val) => formatCurrency(val, profile?.currency)} valueStyle={{ fontSize: '20px', fontWeight: 'bold' }} />
              <Text type="secondary" style={{ fontSize: '10px' }}>Receivables minus Payables</Text>
            </Card>
          </Col>
        </Row>

        {/* Row 2: Charts Side-by-Side */}
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <Card title={<Text strong style={{ fontSize: '16px' }}>Receivables vs Payables</Text>} style={cardStyle}>
              <div style={{ height: 280 }}>
                <Bar data={comparisonData} options={barOptions} />
              </div>
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card title={<Text strong style={{ fontSize: '16px' }}>Receivables Aging (Days)</Text>} style={cardStyle}>
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
                        { title: 'Amount', dataIndex: 'balance', key: 'bal', align: 'right', render: (v) => <Text strong style={{ color: token.colorSuccess }}>{formatCurrency(v, profile?.currency)}</Text> }
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
                            <Text strong style={{ color: v > 0 ? token.colorSuccess : token.colorError }}>
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

    // 1. Daily Difference Bar Chart Data
    const diffChartData = {
      labels: auditData.dailyDiffTrend?.map(item => item.date) || [],
      datasets: [{
        label: 'Closing Difference',
        data: auditData.dailyDiffTrend?.map(item => item.difference) || [],
        // Agar farq negative hai to Red, positive hai to Green
        backgroundColor: auditData.dailyDiffTrend?.map(item => 
          item.difference < 0 ? token.colorError + 'aa' : token.colorSuccess + 'aa'
        ),
        borderColor: auditData.dailyDiffTrend?.map(item => 
          item.difference < 0 ? token.colorError : token.colorSuccess
        ),
        borderWidth: 1,
      }]
    };

    // 2. Manual Flow Breakdown Data (Doughnut)
    const flowChartData = {
      labels: ['Cash In', 'Cash Out'],
      datasets: [{
        data: [auditData.totalIn, auditData.totalOut],
        backgroundColor: [token.colorSuccess, token.colorError],
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
            <Card size="small" style={{ ...cardStyle, borderLeft: `4px solid ${token.colorSuccess}` }}>
              <Statistic title="Manual Cash In" value={auditData.totalIn} formatter={(val) => formatCurrency(val, profile?.currency)} valueStyle={{ fontSize: '18px', color: token.colorSuccess }} />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card size="small" style={{ ...cardStyle, borderLeft: `4px solid ${token.colorError}` }}>
              <Statistic title="Manual Cash Out" value={auditData.totalOut} formatter={(val) => formatCurrency(val, profile?.currency)} valueStyle={{ fontSize: '18px', color: token.colorError }} />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card size="small" style={{ ...cardStyle, borderLeft: `4px solid ${token.colorWarning}` }}>
              <Statistic title="Total Shortages" value={auditData.totalShortage} formatter={(val) => formatCurrency(val, profile?.currency)} valueStyle={{ fontSize: '18px', color: token.colorError }} />
              <Text type="secondary" style={{ fontSize: '10px' }}>Cash missing at closing</Text>
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card size="small" style={{ ...cardStyle, borderLeft: `4px solid ${token.colorInfo}` }}>
              <Statistic title="Net Audit Difference" value={auditData.netDifference} formatter={(val) => formatCurrency(val, profile?.currency)} valueStyle={{ fontSize: '18px', color: auditData.netDifference >= 0 ? token.colorSuccess : token.colorError }} />
              <Text type="secondary" style={{ fontSize: '10px' }}>Overall surplus/deficit</Text>
            </Card>
          </Col>
        </Row>

        {/* Row 2: Visual Audit Analysis */}
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={14}>
            <Card title={<Text strong style={{ fontSize: '16px' }}><HistoryOutlined /> Daily Closing Discrepancies</Text>} style={cardStyle}>
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
            <Card title={<Text strong style={{ fontSize: '16px' }}><PieChartOutlined /> Manual Adjustment Flow</Text>} style={cardStyle}>
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
          <Col xs={24} lg={14}>
            <Card title={<Text strong style={{ fontSize: '16px' }}>Staff Ledger Activity</Text>} style={cardStyle} styles={{ body: { padding: 0 } }}>
              <Table
                dataSource={auditData.staffTransactions}
                rowKey="id"
                pagination={{ pageSize: 6 }}
                size="small"
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
              { title: 'Remarks', dataIndex: 'notes', key: 'notes', ellipsis: true, render: (text) => <Text type="secondary" style={{ fontSize: '12px' }}>{text || '-'}</Text> }
            ]}
              />
            </Card>
          </Col>
          <Col xs={24} lg={10}>
            <Card title={<Text strong style={{ fontSize: '16px' }}>Recent Closing Audit</Text>} style={cardStyle} styles={{ body: { padding: 0 } }}>
              <Table
                dataSource={auditData.recentClosings}
                rowKey="id"
                pagination={{ pageSize: 6 }}
                size="small"
                columns={[
                  { title: 'Date', dataIndex: 'closing_date', key: 'date', render: d => dayjs(d).format('DD MMM') },
                  { 
                    title: 'Staff', 
                    key: 'staff', 
                    render: (_, rec) => {
                      const staff = staffList.find(s => s.id === rec.staff_id);
                      return <Text strong>{staff ? staff.name : 'Owner / Admin'}</Text>;
                    } 
                  },
                  { title: 'Expected', dataIndex: 'expected_cash', align: 'right', render: v => formatCurrency(v, profile?.currency) },
                  { title: 'Actual', dataIndex: 'actual_cash', align: 'right', render: v => formatCurrency(v, profile?.currency) },
                  { title: 'Diff', dataIndex: 'difference', align: 'right', render: v => (
                    <Text strong style={{ color: v < 0 ? token.colorError : token.colorSuccess }}>
                      {v > 0 ? '+' : ''}{formatCurrency(v, profile?.currency)}
                    </Text>
                  )},
                  { title: 'Remarks', dataIndex: 'notes', key: 'notes', ellipsis: true, render: (text) => <Text type="secondary" style={{ fontSize: '11px' }}>{text || '-'}</Text> }
                ]}
              />
            </Card>
          </Col>
        </Row>
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
            <Title level={3}>Business Intelligence is Locked</Title>
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
                  label: 'Export to PDF (Coming Soon)',
                  disabled: true,
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
    </div> /* Main Container End */
  );
};

export default Reports;