import React, { useState, useEffect } from 'react';
import { Typography, Tabs, Card, Row, Col, Statistic, Spin, DatePicker, Space, theme, Table, Progress, Divider, Tag, Empty, Button, Dropdown, Menu } from 'antd';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/currencyFormatter';
import DataService from '../DataService';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
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
  ArcElement
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';

// Chart.js ke sabhi zaroori components ko register karein
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
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
  PieChartOutlined
} from '@ant-design/icons';
import * as XLSX from 'xlsx';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const Reports = () => {
  const navigate = useNavigate(); // Naya Hook
  const { token } = theme.useToken();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { profile } = useAuth();
  
  // --- SUBSCRIPTION CHECK ---
  const limits = getPlanLimits(profile?.subscription_tier);
  const isLocked = !limits.allow_reports;
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
  const [activeTab, setActiveTab] = useState('sales');

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

  const handleCurrentTabExport = async () => {
    setLoading(true);
    try {
      const startDate = dateRange[0].format('YYYY-MM-DD');
      const endDate = dateRange[1].format('YYYY-MM-DD');
      const sheets = [];

      if (activeTab === 'overview') {
        const data = await DataService.getReportsOverview(startDate, endDate);
        sheets.push({ name: 'Overview Summary', data: [
          { Metric: 'Total Revenue', Amount: data.totalRevenue },
          { Metric: 'Net Profit', Amount: data.netProfit },
          { Metric: 'Total Expenses', Amount: data.totalExpenses },
          { Metric: 'Current Stock Value', Amount: data.totalInventoryValue },
          { Metric: 'Accounts Receivable', Amount: data.totalReceivables },
          { Metric: 'Accounts Payable', Amount: data.totalPayables },
        ]});
      } else if (activeTab === 'sales') {
        const data = await DataService.getSalesAndRevenueReport(startDate, endDate);
        sheets.push({ name: 'Staff Performance', data: data.staffPerformance });
        sheets.push({ name: 'Top Products (Qty)', data: data.topProductsByQty });
        sheets.push({ name: 'Top Products (Revenue)', data: data.topProductsByRev });
        sheets.push({ name: 'Tax Summary', data: [
          { Description: 'Total Tax Collected', Amount: data.totalTaxCollected },
          { Description: 'Total Tax Refunded', Amount: data.totalTaxRefunded },
          { Description: 'Net Tax Payable', Amount: data.netTax }
        ]});
      } else if (activeTab === 'profit_loss') {
        const data = await DataService.getDetailedProfitLossReport(startDate, endDate);
        sheets.push({ name: 'P&L Statement', data: [
          { Description: 'Total Revenue', Amount: data.totalRevenue },
          { Description: 'Cost of Goods Sold', Amount: data.totalCost },
          { Description: 'Gross Profit', Amount: data.grossProfit },
          { Description: 'Total Expenses', Amount: data.totalExpenses },
          { Description: 'Net Profit', Amount: data.netProfit },
          { Description: 'Profit Margin %', Amount: data.profitMargin }
        ]});
        sheets.push({ name: 'Expense Breakdown', data: data.expenseBreakdown });
      } else if (activeTab === 'inventory') {
        const data = await DataService.getInventoryReport();
        sheets.push({ name: 'Valuation by Category', data: data.categoryValuation });
        sheets.push({ name: 'Low Stock Items', data: data.lowStockItems });
        sheets.push({ name: 'Slow Moving Items', data: data.slowMovingItems });
        sheets.push({ name: 'Damaged Stock Loss', data: [{ Description: 'Total Estimated Loss', Amount: data.totalDamagedLoss }] });
      } else if (activeTab === 'ledgers') {
        const data = await DataService.getLedgerReport();
        sheets.push({ name: 'Customer Balances', data: data.topDebtors });
        sheets.push({ name: 'Supplier Balances', data: data.topCreditors });
        sheets.push({ name: 'Summary', data: [
          { Metric: 'Total Receivables', Amount: data.totalReceivable },
          { Metric: 'Total Payables', Amount: data.totalPayable },
          { Metric: 'Total Customer Credits', Amount: data.totalCustomerCredits }
        ]});
      } else if (activeTab === 'audit') {
        const data = await DataService.getCashAuditReport(startDate, endDate);
        sheets.push({ name: 'Staff Transactions', data: data.staffTransactions });
        sheets.push({ name: 'Closing Audit', data: data.recentClosings });
        sheets.push({ name: 'Manual Flow Summary', data: [
          { Description: 'Total Cash In', Amount: data.totalIn },
          { Description: 'Total Cash Out', Amount: data.totalOut },
          { Description: 'Net Closing Difference', Amount: data.totalDifference }
        ]});
      }

      downloadExcel(sheets, `Report_${activeTab}`);
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
    const doughnutData = {
      labels: salesData.categoryBreakdown?.map(item => item.category) || [],
      datasets: [
        {
          label: 'Revenue',
          data: salesData.categoryBreakdown?.map(item => item.revenue) || [],
          backgroundColor: [
            '#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#13c2c2', '#eb2f96'
          ],
          borderColor: token.colorBgContainer,
          borderWidth: 2,
        },
      ],
    };

    // changes ka backup

    const doughnutOptions = {
      plugins: {
        legend: {
          position: 'left',
          align: 'center',
          labels: { 
            color: token.colorText, 
            font: { size: 12 },
            padding: 15,
            boxWidth: 15
          }
        }
      },
      maintainAspectRatio: false,
      // NAYA IZAFA: Bottom padding taake Line chart ke X-axis ke sath align ho jaye
      layout: {
        padding: {
          bottom: 25 
        }
      }
    };

    // Line Chart (Sales Trend) Data Setup
    const lineData = {
      labels: salesData.salesTrend?.map(item => item.date) || [],
      datasets: [
        {
          fill: true, // Area fill karne ke liye
          label: 'Revenue',
          data: salesData.salesTrend?.map(item => item.amount) || [],
          borderColor: token.colorPrimary,
          backgroundColor: 'rgba(24, 144, 255, 0.2)', // Halka blue fill
          tension: 0.4, // Line ko smooth banane ke liye
          pointRadius: 4,
          pointBackgroundColor: token.colorPrimary,
        },
      ],
    };

    const lineOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { mode: 'index', intersect: false },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { 
            // Light mode mein halka kala, Dark mode mein halka safaid
            color: token.colorTextSecondary 
          }
        },
        y: {
          beginAtZero: true,
          ticks: { 
            color: token.colorTextSecondary 
          },
          grid: { 
            // Grid lines ka rang bhi theme ke mutabiq badlay ga
            color: token.colorBorderSecondary 
          }
        }
      }
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

          {/* Right Side: Category Breakdown */}
          <Col xs={24} lg={10}>
            <Card title={<Text strong style={{ fontSize: '16px' }}>Revenue by Category</Text>} style={cardStyle}>
              <div style={{ height: 300, display: 'flex', justifyContent: 'center' }}>
                {salesData.categoryBreakdown?.length > 0 ? (
                  <Doughnut data={doughnutData} options={doughnutOptions} />
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
          {/* Staff Performance */}
          <Col xs={24} lg={12}>
            <Card title={<Text strong style={{ fontSize: '16px' }}><TeamOutlined /> Staff Performance</Text>} style={cardStyle} styles={{ body: { padding: 0 } }}>
              <Table
                dataSource={salesData.staffPerformance}
                rowKey="name"
                pagination={false}
                scroll={{ x: true }}
                columns={[
                  { title: 'Staff Name', dataIndex: 'name', key: 'name' },
                  { title: 'Invoices', dataIndex: 'sale_count', key: 'sale_count', align: 'center', render: (val) => <Tag>{val}</Tag> },
                  { title: 'Revenue Generated', dataIndex: 'total_sales', key: 'total_sales', align: 'right', render: (val) => <Text strong>{formatCurrency(val, profile?.currency)}</Text> }
                ]}
              />
            </Card>
          </Col>

          {/* Top Selling Products */}
          <Col xs={24} lg={12}>
            <Card title={<Text strong style={{ fontSize: '16px' }}><TrophyOutlined style={{ color: '#faad14' }} /> Top 10 Selling Products</Text>} style={cardStyle} styles={{ body: { padding: 0 } }}>
              <Tabs defaultActiveKey="qty" centered items={[
                {
                  key: 'qty',
                  label: 'By Quantity',
                  children: (
                    <Table
                      dataSource={salesData.topProductsByQty}
                      rowKey="name"
                      pagination={false}
                      size="small"
                      scroll={{ x: true }}
                      columns={[
                        { title: 'Product', dataIndex: 'name', key: 'name' },
                        { title: 'Qty Sold', dataIndex: 'qty', key: 'qty', align: 'center', render: (val) => <Tag color="cyan">{val}</Tag> }
                      ]}
                    />
                  )
                },
                {
                  key: 'rev',
                  label: 'By Revenue',
                  children: (
                    <Table
                      dataSource={salesData.topProductsByRev}
                      rowKey="name"
                      pagination={false}
                      size="small"
                      scroll={{ x: true }}
                      columns={[
                        { title: 'Product', dataIndex: 'name', key: 'name' },
                        { title: 'Revenue', dataIndex: 'revenue', key: 'revenue', align: 'right', render: (val) => <Text strong style={{ color: token.colorSuccess }}>{formatCurrency(val, profile?.currency)}</Text> }
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

  // --- NAYA IZAFA: PROFIT & LOSS TAB UI ---
  const renderProfitLossTab = () => {
    if (loading || !profitLossData) return <div style={{ textAlign: 'center', padding: '50px' }}><Spin size="large" /></div>;

    const summaryData = [
      { label: 'Total Revenue (A)', value: profitLossData.totalRevenue, color: 'inherit' },
      { label: 'Cost of Goods Sold (B)', value: profitLossData.totalCost, color: token.colorError },
      { label: 'Gross Profit (A - B)', value: profitLossData.grossProfit, color: token.colorSuccess, bold: true },
      { label: 'Total Expenses (C)', value: profitLossData.totalExpenses, color: token.colorWarning },
      { label: 'Net Profit (Gross - C)', value: profitLossData.netProfit, color: token.colorSuccess, bold: true, highlight: true },
    ];

    return (
      <div style={{ marginTop: '16px' }}>
        <Row gutter={[16, 16]}>
          {/* Detailed Statement */}
          <Col xs={24} lg={14}>
            <Card title="Profit & Loss Statement" style={{ borderRadius: 8 }}>
              <Table
                dataSource={summaryData}
                pagination={false}
                showHeader={false}
                rowKey="label"
                columns={[
                  { title: 'Description', dataIndex: 'label', key: 'label', render: (text, rec) => <Text strong={rec.bold} style={{ fontSize: rec.highlight ? '16px' : '14px' }}>{text}</Text> },
                  { title: 'Amount', dataIndex: 'value', key: 'value', align: 'right', render: (val, rec) => (
                    <Text strong={rec.bold} style={{ color: rec.color, fontSize: rec.highlight ? '18px' : '14px' }}>
                      {rec.label.includes('Cost') || rec.label.includes('Expenses') ? '-' : ''} {formatCurrency(val, profile?.currency)}
                    </Text>
                  )}
                ]}
              />
              <div style={{ marginTop: 24, textAlign: 'center', padding: '15px', background: token.colorFillAlter, borderRadius: 8 }}>
                <Statistic title="Overall Profit Margin" value={profitLossData.profitMargin} suffix="%" valueStyle={{ color: token.colorSuccess }} />
              </div>
            </Card>
          </Col>

          {/* Expense Breakdown */}
          <Col xs={24} lg={10}>
            <Card title="Expense Breakdown" style={{ borderRadius: 8 }}>
              {profitLossData.expenseBreakdown.length > 0 ? (
                <Table
                  dataSource={profitLossData.expenseBreakdown}
                  rowKey="category"
                  pagination={false}
                  size="small"
                  columns={[
                    { title: 'Category', dataIndex: 'category', key: 'category' },
                    { title: 'Amount', dataIndex: 'amount', key: 'amount', align: 'right', render: (val) => <Text type="danger">{formatCurrency(val, profile?.currency)}</Text> }
                  ]}
                />
              ) : (
                <Empty description="No expenses found for this period" />
              )}
            </Card>
          </Col>
        </Row>
      </div>
    );
  };

  // --- UPDATED: INVENTORY & ASSETS TAB UI (With Slow Moving & Damaged) ---
  const renderInventoryTab = () => {
    if (loading || !inventoryData) return <div style={{ textAlign: 'center', padding: '50px' }}><Spin size="large" /></div>;

    return (
      <div style={{ marginTop: '16px' }}>
        <Row gutter={[16, 16]}>
          {/* Category Valuation */}
          <Col xs={24} lg={12}>
            <Card title="Valuation by Category" style={{ borderRadius: 8 }}>
              <Table
                dataSource={inventoryData.categoryValuation}
                rowKey="name"
                pagination={false}
                size="small"
                columns={[
                  { title: 'Category', dataIndex: 'name', key: 'name' },
                  { title: 'Stock Qty', dataIndex: 'qty', key: 'qty', align: 'center' },
                  { title: 'Asset Value', dataIndex: 'value', key: 'value', align: 'right', render: (val) => <Text strong>{formatCurrency(val, profile?.currency)}</Text> }
                ]}
              />
            </Card>
            {/* Damaged Stock Card */}
            <Card style={{ marginTop: 16, borderRadius: 8, background: isMobile ? 'transparent' : token.colorFillAlter }}>
              <Statistic 
                title={<Text type="danger">Estimated Loss from Damaged Stock</Text>} 
                value={inventoryData.totalDamagedLoss} 
                valueStyle={{ color: token.colorError }}
                formatter={(val) => formatCurrency(val, profile?.currency)} 
              />
            </Card>
          </Col>
          
          {/* Stock Alerts & Slow Moving */}
          <Col xs={24} lg={12}>
            <Tabs defaultActiveKey="low" type="line" items={[
              {
                key: 'low',
                label: <Text type="danger">Low Stock (≤ 5)</Text>,
                children: (
                  <Table
                    dataSource={inventoryData.lowStockItems}
                    rowKey="name"
                    pagination={{ pageSize: 5 }}
                    size="small"
                    columns={[
                      { title: 'Product', key: 'prod', render: (_, rec) => `${rec.brand} ${rec.name}` },
                      { title: 'Qty', dataIndex: 'current_qty', align: 'center', render: (q) => <Tag color="red">{q}</Tag> }
                    ]}
                  />
                )
              },
              {
                key: 'slow',
                label: 'Slow Moving (30 Days)',
                children: (
                  <Table
                    dataSource={inventoryData.slowMovingItems}
                    rowKey="name"
                    pagination={{ pageSize: 5 }}
                    size="small"
                    columns={[
                      { title: 'Product', key: 'prod', render: (_, rec) => `${rec.brand} ${rec.name}` },
                      { title: 'In Stock', dataIndex: 'qty', align: 'center' }
                    ]}
                  />
                )
              }
            ]} />
          </Col>
        </Row>
      </div>
    );
  };

  // --- NAYA IZAFA: KHATA & LEDGERS TAB UI ---
  const renderLedgersTab = () => {
    if (loading || !ledgerData) return <div style={{ textAlign: 'center', padding: '50px' }}><Spin size="large" /></div>;

    return (
      <div style={{ marginTop: '16px' }}>
        <Row gutter={[16, 16]}>
          {/* Receivables Summary */}
          <Col xs={24} md={12}>
            <Card title="Accounts Receivable (Customers)" style={{ borderRadius: 8, borderTop: `4px solid ${token.colorError}` }}>
              <Statistic title="Total Amount to Collect" value={ledgerData.totalReceivable} valueStyle={{ color: token.colorError }} formatter={(val) => formatCurrency(val, profile?.currency)} />
              <Divider style={{ margin: '15px 0' }} />
              <Text strong>Top 5 Pending Customers:</Text>
              <Table
                dataSource={ledgerData.topDebtors}
                rowKey="id"
                pagination={false}
                size="small"
                style={{ marginTop: 10 }}
                columns={[
                  { title: 'Customer', dataIndex: 'name', key: 'name' },
                  { title: 'Amount', dataIndex: 'balance', key: 'bal', align: 'right', render: (v) => <Text type="danger">{formatCurrency(v, profile?.currency)}</Text> }
                ]}
              />
            </Card>
          </Col>

          {/* Payables Summary */}
          <Col xs={24} md={12}>
            <Card title="Accounts Payable (Suppliers)" style={{ borderRadius: 8, borderTop: `4px solid ${token.colorWarning}` }}>
              <Statistic title="Total Amount to Pay" value={ledgerData.totalPayable} valueStyle={{ color: token.colorWarning }} formatter={(val) => formatCurrency(val, profile?.currency)} />
              <Divider style={{ margin: '15px 0' }} />
              <Text strong>Top 5 Outstanding Suppliers:</Text>
              <Table
                dataSource={ledgerData.topCreditors}
                rowKey="id"
                pagination={false}
                size="small"
                style={{ marginTop: 10 }}
                columns={[
                  { title: 'Supplier', dataIndex: 'name', key: 'name' },
                  { title: 'Amount', dataIndex: 'balance_due', key: 'bal', align: 'right', render: (v) => <Text strong>{formatCurrency(v, profile?.currency)}</Text> }
                ]}
              />
            </Card>
          </Col>
        </Row>
      </div>
    );
  };

  // --- NAYA IZAFA: CASH & AUDIT TAB UI ---
  const renderAuditTab = () => {
    if (loading || !auditData) return <div style={{ textAlign: 'center', padding: '50px' }}><Spin size="large" /></div>;

    return (
      <div style={{ marginTop: '16px' }}>
        <Row gutter={[16, 16]}>
          {/* Cash Flow Summary */}
          <Col xs={24} md={8}>
            <Card title="Manual Cash Flow" style={{ borderRadius: 8 }}>
              <Statistic title="Total Cash In" value={auditData.totalIn} valueStyle={{ color: token.colorSuccess }} formatter={(val) => formatCurrency(val, profile?.currency)} />
              <Statistic title="Total Cash Out" value={auditData.totalOut} valueStyle={{ color: token.colorError }} formatter={(val) => formatCurrency(val, profile?.currency)} style={{ marginTop: 16 }} />
            </Card>
          </Col>

          {/* Audit/Closing Summary */}
          <Col xs={24} md={16}>
            <Card title="Closing Audit (Differences)" style={{ borderRadius: 8 }}>
              <Row gutter={16}>
                <Col span={12}>
                  <Statistic 
                    title="Net Closing Difference" 
                    value={auditData.totalDifference} 
                    valueStyle={{ color: auditData.totalDifference >= 0 ? token.colorSuccess : token.colorError }} 
                    formatter={(val) => formatCurrency(val, profile?.currency)} 
                  />
                  <Text type="secondary" style={{ fontSize: '12px' }}>{auditData.totalDifference < 0 ? "Cash is short in drawer" : "Cash is surplus/matching"}</Text>
                </Col>
                <Col span={12}>
                  <Text strong>Recent Closing Issues:</Text>
                  <Table
                    dataSource={auditData.recentClosings}
                    rowKey="id"
                    pagination={false}
                    size="small"
                    columns={[
                      { title: 'Date', dataIndex: 'closing_date', key: 'date', render: d => dayjs(d).format('DD-MMM') },
                      { title: 'Diff', dataIndex: 'difference', key: 'diff', align: 'right', render: v => <Text type={v < 0 ? 'danger' : 'success'}>{v}</Text> }
                    ]}
                  />
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>

        <Card title="Staff Ledger Activity (Last 10)" style={{ borderRadius: 8, marginTop: 16 }} styles={{ body: { padding: 0 } }}>
          <Table
            dataSource={auditData.staffTransactions}
            rowKey="id"
            pagination={false}
            columns={[
              { title: 'Date', dataIndex: 'entry_date', key: 'date', render: d => dayjs(d).format('DD-MMM-YYYY') },
              { title: 'Staff Member', key: 'staff', render: (_, rec) => { const staff = staffList.find(s => s.id === rec.staff_id); return staff ? staff.name : 'Owner / Admin'; } },
              { title: 'Type', dataIndex: 'type', key: 'type', render: t => <Tag color={t === 'Salary' ? 'blue' : 'orange'}>{t}</Tag> },
              { title: 'Amount', dataIndex: 'amount', key: 'amt', align: 'right', render: v => formatCurrency(v, profile?.currency) },
              { title: 'Notes', dataIndex: 'notes', key: 'notes', ellipsis: true }
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
  ];

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
          {/* Calendar sirf un tabs par jahan date filter zaroori hai (Overview, Sales, P&L, Audit) */}
          {['overview', 'sales', 'profit_loss', 'audit'].includes(activeTab) && (
            <Space>
              <Text strong>Select Date Range:</Text>
              <RangePicker 
                value={dateRange} 
                onChange={(dates) => {
                  if(dates) setDateRange(dates);
                }} 
                allowClear={false}
              />
            </Space>
          )}
        </Space>
      </div>
      
      <Tabs 
        defaultActiveKey="overview" 
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key)}
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