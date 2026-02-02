import React, { useState, useEffect, useCallback } from 'react';
import { Card, Row, Col, Statistic, Typography, List, Button, Spin, Space, Tag, Table, Radio, Modal, Form, InputNumber, Input, App, Tooltip, Tabs } from 'antd';
import {
  HomeOutlined,
  ShoppingOutlined,
  RiseOutlined,
  FallOutlined,
  AlertOutlined,
  PlusOutlined,
  WalletOutlined,
  TeamOutlined,
  DollarCircleOutlined,
  TrophyOutlined,
  ArrowUpOutlined,
  SafetyCertificateOutlined,
  ArrowDownOutlined,
  HistoryOutlined,
  CheckCircleOutlined,
  UserOutlined, 
  TransactionOutlined
} from '@ant-design/icons';
import { Area, Pie } from '@ant-design/charts'; 
import { useNavigate } from 'react-router-dom';
import DataService from '../DataService';
import { db } from '../db';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/currencyFormatter';
import { useTheme } from '../context/ThemeContext';

const { Title, Text } = Typography;

const Dashboard = () => {
  const { isDarkMode } = useTheme(); 
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('today');

  const { message } = App.useApp();
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [isAdjustmentSubmitting, setIsAdjustmentSubmitting] = useState(false);
  const [isClosingSubmitting, setIsClosingSubmitting] = useState(false);
  const [adjustmentForm] = Form.useForm();

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyData, setHistoryData] = useState([]);

  const [isClosingModalOpen, setIsClosingModalOpen] = useState(false);
  const [closingForm] = Form.useForm();

  const [closingHistoryData, setClosingHistoryData] = useState([]);

  const handleOpenHistory = async () => {
    // Dono tables se data uthayein
    const adjustments = await db.cash_adjustments.orderBy('created_at').reverse().toArray();
    const closings = await db.daily_closings.orderBy('created_at').reverse().toArray();
    
    setHistoryData(adjustments);
    setClosingHistoryData(closings);
    setIsHistoryModalOpen(true);
  };

  // Cash Adjustment Save karne ka function
  const handleAdjustmentSubmit = async (values) => {
    try {
      setIsAdjustmentSubmitting(true);
      const adjustmentData = {
        id: crypto.randomUUID(),
        local_id: crypto.randomUUID(),
        user_id: user?.id, 
        amount: values.amount,
        type: values.type,
        payment_method: values.payment_method,
        transfer_to: values.type === 'Transfer' ? values.transfer_to : null,
        notes: values.notes || '',
        created_at: new Date().toISOString()
      };

      // 1. Local DB mein save karein (Corrected: DataService.db ki jagah sirf db)
      await db.cash_adjustments.add(adjustmentData);

      // 2. Sync Queue mein dalein
      await db.sync_queue.add({
        table_name: 'cash_adjustments',
        action: 'create',
        data: adjustmentData
      });

      message.success('Galla adjusted successfully!');
      setIsAdjustmentModalOpen(false);
      adjustmentForm.resetFields();
      
      // Stats update karein baghair reload ke
      loadDashboard(); 

    } catch (error) {
      message.error('Adjustment failed: ' + error.message);
      } finally {
      setIsAdjustmentSubmitting(false);
    }
  };

  // Day-End Closing Save karne ka function
  const handleClosingSubmit = async (values) => {
    try {
      setIsClosingSubmitting(true);
      const expected = stats?.cashInHand || 0;
      const actual = values.actual_cash;
      const diff = actual - expected;

      const closingData = {
        id: crypto.randomUUID(),
        local_id: crypto.randomUUID(),
        user_id: user?.id,
        closing_date: new Date().toISOString().split('T')[0], // Aaj ki date
        expected_cash: expected,
        actual_cash: actual,
        difference: diff,
        notes: values.notes || '',
        created_at: new Date().toISOString()
      };

      // 1. Local DB mein save karein
      await db.daily_closings.add(closingData);

      // 2. Sync Queue mein dalein
      await db.sync_queue.add({
        table_name: 'daily_closings',
        action: 'create',
        data: closingData
      });

      message.success('Galla closed and recorded successfully!');
      setIsClosingModalOpen(false);
      closingForm.resetFields();
      loadDashboard();

    } catch (error) {
      message.error('Closing failed: ' + error.message);
      } finally {
      setIsClosingSubmitting(false);
    }
  };
  
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const loadDashboard = useCallback(async () => {
    // Agar stats pehle se hain to poora page white na ho, sirf data update ho
    if (!stats) setLoading(true); 
    try {
      const dashboardStats = await DataService.getDashboardStats(profile?.low_stock_threshold, timeRange);
      const salesChart = await DataService.getLast7DaysSales();
      setStats(dashboardStats);
      setChartData(salesChart);
    } catch (error) {
      console.error("Dashboard Load Error:", error);
    } finally {
      setLoading(false);
    }
  }, [profile, timeRange, stats]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  if (loading && !stats) return <div style={{ textAlign: 'center', marginTop: 100 }}><Spin size="large" /></div>;

  // --- Helper: Comparison Label ---
  const getComparisonLabel = () => {
      if (timeRange === 'week') return 'vs Last Week';
      if (timeRange === 'month') return 'vs Last Month';
      return 'vs Yesterday';
  };

  // --- Helper: Trend Renderer ---
  const renderTrend = (percent) => {
    if (percent === undefined || percent === null) return null;
    const isPositive = percent >= 0;
    
    if (percent === 0) return <span style={{ fontSize: '12px', opacity: 0.8 }}>No change {getComparisonLabel()}</span>;

    return (
      <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', fontSize: '13px' }}>
        {isPositive ? <ArrowUpOutlined style={{ color: '#fff' }} /> : <ArrowDownOutlined style={{ color: '#fff' }} />}
        <span style={{ marginLeft: 4, fontWeight: 'bold' }}>
          {Math.abs(percent).toFixed(1)}%
        </span>
        <span style={{ marginLeft: 4, opacity: 0.8 }}>{getComparisonLabel()}</span>
      </div>
    );
  };

  // --- Custom Styles for Cards ---
  const cardStyle = { borderRadius: 8, border: 'none', color: 'white', height: '100%', };

  // --- Graph Configuration (UPDATED FOR DARK MODE) ---
  const config = {
    data: chartData,
    xField: 'date',
    yField: 'amount',
    smooth: true,
    // 1. Theme set karein
    theme: isDarkMode ? 'dark' : 'light',
    
    // 2. Gradient Color (Dark mode mein thora dark, Light mein bright)
    areaStyle: () => {
      return {
        fill: isDarkMode 
            ? 'l(270) 0:#1f1f1f 0.5:#1890ff 1:#1890ff' 
            : 'l(270) 0:#ffffff 0.5:#7ec2f3 1:#1890ff',
      };
    },
    color: '#1890ff',
    
    // 3. X-Axis (Neeche wali dates)
    xAxis: {
        label: {
            style: {
                // Agar Dark mode hai to White text, warna Black
                fill: isDarkMode ? 'rgba(255,255,255,0.85)' : '#000000',
            }
        },
        grid: {
            line: {
                style: {
                    stroke: isDarkMode ? '#444' : '#eee',
                }
            }
        }
    },

    // 4. Y-Axis (Side wali prices)
    yAxis: {
        label: {
            formatter: (v) => `${v}`,
            style: {
                // Agar Dark mode hai to White text, warna Black
                fill: isDarkMode ? 'rgba(255,255,255,0.85)' : '#000000',
            }
        },
        grid: {
            line: {
                style: {
                    stroke: isDarkMode ? '#444' : '#eee',
                }
            }
        }
    },

    // 5. Tooltip (Jab mouse upar layein)
    tooltip: {
        formatter: (datum) => {
            return { name: 'Sales', value: formatCurrency(datum.amount, profile?.currency) };
        },
        // Tooltip ka background aur text color set karein
        domStyles: isDarkMode ? {
            'g2-tooltip': { backgroundColor: '#333', color: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' },
            'g2-tooltip-title': { color: '#fff' },
            'g2-tooltip-list-item': { color: '#fff' }
        } : undefined
    },
    autoFit: true,
    height: 300,
  };

  return (
    <div style={{ padding: '24px' }}>
      
      {/* HEADER WITH FILTERS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 10 }}>
        <Title level={2} style={{ margin: 0, marginLeft: '48px',fontSize: '23px' }}>
          <HomeOutlined /> Dashboard
        </Title>
        
        {/* Time Filter Buttons */}
        <Radio.Group value={timeRange} onChange={(e) => setTimeRange(e.target.value)} buttonStyle="solid">
          <Radio.Button value="today">Today</Radio.Button>
          <Radio.Button value="week">This Week</Radio.Button>
          <Radio.Button value="month">This Month</Radio.Button>
        </Radio.Group>
      </div>

      {/* --- SECTION 1: STATS CARDS --- */}
      <Row gutter={[16, 16]}>
        {/* Card 1: Sales */}
        <Col xs={24} sm={12} md={8} lg={{ flex: '1 1 0' }}>
          <Card style={{ ...cardStyle, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            <Statistic
              title={<span style={{ color: 'rgba(255,255,255,0.8)' }}>
                {timeRange === 'today' ? "Today's Sales" : timeRange === 'week' ? "Weekly Sales" : "Monthly Sales"}
              </span>}
              value={stats?.totalSales || 0}
              prefix={<ShoppingOutlined />}
              valueStyle={{ color: 'white', fontWeight: 'bold', fontSize: '22px' }}
              formatter={(val) => formatCurrency(val, profile?.currency)}
            />
            {renderTrend(stats?.salesGrowth)}
            {stats?.totalReturnFees > 0 && (
              <div style={{ marginTop: 8, fontSize: '12px', opacity: 0.8, borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: 4 }}>
                Incl. {formatCurrency(stats.totalReturnFees, profile?.currency)} Return Fees
              </div>
            )}
          </Card>
        </Col>

        {/* Card: Cash in Hand (Galla) - Fixed Alignment */}
        <Col xs={24} sm={12} md={8} lg={{ flex: '1 1 0' }}>
          <Card 
            style={{ ...cardStyle, background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}
          >
            {/* Floating Buttons - Ab yeh alignment kharab nahi karenge */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Statistic
              title={<span style={{ color: 'rgba(255,255,255,0.8)' }}>Cash in Hand</span>}
              value={stats?.cashInHand || 0}
              prefix={<WalletOutlined />}
              valueStyle={{ color: 'white', fontWeight: 'bold', fontSize: '21px' }}
              formatter={(val) => formatCurrency(val, profile?.currency)}
            />
              <Space size="small">
                <Tooltip title="Cash History">
                  <Button 
                    type="text" 
                    size="small"
                    icon={<HistoryOutlined style={{ color: 'white', fontSize: '18px' }} />} 
                    onClick={handleOpenHistory} 
                  />
                </Tooltip>
                <Tooltip title="Cash Adjustment (In/Out)">
                  <Button 
                    type="text" 
                    size="small"
                    icon={<TransactionOutlined style={{ color: 'white', fontSize: '18px' }} />} 
                    onClick={() => setIsAdjustmentModalOpen(true)} 
                  />
                </Tooltip>
              </Space>
            </div>
            <div style={{ marginTop: 8, paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.2)', fontSize: '12px', display: 'flex', justifyContent: 'space-between' }}>
                <span>Bank Balance:</span>
                <span>{formatCurrency(stats?.bankBalance || 0, profile?.currency)}</span>
            </div>
          </Card>
        </Col>

        {/* Card 2: Profit (Updated Layout for Clarity) */}
        <Col xs={24} sm={12} md={8} lg={{ flex: '1 1 0' }}>
          <Card style={{ ...cardStyle, background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' }}>
            <Statistic
              title={<span style={{ color: 'rgba(255,255,255,0.8)' }}>Net Profit</span>}
              value={stats?.netProfit || 0}
              prefix={<RiseOutlined />}
              valueStyle={{ color: 'white', fontWeight: 'bold', fontSize: '22px' }}
              formatter={(val) => formatCurrency(val, profile?.currency)}
            />
            
            {/* Net Profit ki description - Ab yeh upar hai */}
            <div style={{ marginTop: -4, marginBottom: 10, fontSize: '11px', opacity: 0.8 }}>
                {timeRange === 'today' ? "Today's" : "Total"} profit after expenses
            </div>
            <div style={{ marginTop: 3 }}>
              <Tag 
                style={{ 
                  fontSize: '11px', 
                  borderRadius: '4px',
                  backgroundColor: 'rgba(255, 255, 255, 0.2)', // Halka transparent background
                  color: 'white', // Text hamesha safaid rahega
                  border: 'none' 
                }}
              >
                Margin: {stats?.profitMargin?.toFixed(1)}%
              </Tag>
              {stats?.totalReturnFees > 0 && (
                <Tag style={{ fontSize: '11px', borderRadius: '4px', backgroundColor: 'rgba(255, 255, 255, 0.2)', color: 'white', border: 'none', marginLeft: 4 }}>
                  Fees: {formatCurrency(stats.totalReturnFees, profile?.currency)}
                </Tag>
              )}
            </div>

            {/* Divider aur Gross Profit - Yeh ab alag nazar aayega */}
            <div style={{ paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.2)', fontSize: '12px', display: 'flex', justifyContent: 'space-between' }}>
                <span>Gross Profit (Before Exp):</span>
                <span style={{ fontWeight: 'bold' }}>{formatCurrency(stats?.grossProfit || 0, profile?.currency)}</span>
            </div>
          </Card>
        </Col>

        {/* Card 3: Expenses */}
        <Col xs={24} sm={12} md={8} lg={{ flex: '1 1 0' }}>
          <Card style={{ ...cardStyle, background: 'linear-gradient(135deg, #ff9966 0%, #ff5e62 100%)' }}>
            <Statistic
              title={<span style={{ color: 'rgba(255,255,255,0.8)' }}>Total Expenses</span>}
              value={stats?.totalExpenses || 0}
              prefix={<FallOutlined />}
              valueStyle={{ color: 'white', fontWeight: 'bold', fontSize: '22px' }}
              formatter={(val) => formatCurrency(val, profile?.currency)}
            />
            {renderTrend(stats?.expensesGrowth)}
             <div style={{ 
  marginTop: 12, 
  paddingTop: 8, 
  borderTop: '1px solid rgba(255,255,255,0.2)',
  height: '75px', // Card ki lambai hamesha itni hi rahegi
  overflowY: 'auto', // Agar list lambi ho jaye to scrollbar aa jayega
  scrollbarWidth: 'none', // Firefox mein scrollbar chhupane ke liye
  msOverflowStyle: 'none' // IE/Edge mein scrollbar chhupane ke liye
}}>
  {/* CSS for Chrome/Safari scrollbar hiding */}
  <style>{`
    div::-webkit-scrollbar { display: none; }
  `}</style>

  {stats?.expenseBreakdown?.length > 0 ? (
    stats.expenseBreakdown.map((item, index) => (
      <div key={index} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: 6 }}>
        <span style={{ opacity: 0.8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px' }}>
          {item.type}:
        </span>
        <span style={{ fontWeight: 'bold' }}>{formatCurrency(item.value, profile?.currency)}</span>
      </div>
    ))
  ) : (
    <div style={{ textAlign: 'center', paddingTop: 20, fontSize: '11px', opacity: 0.6 }}>
      No expenses recorded
    </div>
  )}
</div>
          </Card>
        </Col>

        {/* Card 4: Receivables, Customer Credits & Supplier Payables */}
        <Col xs={24} sm={12} md={8} lg={{ flex: '1 1 0' }}>
          <Card style={{ ...cardStyle, background: 'linear-gradient(135deg, #3a6073 0%, #3a7bd5 100%)' }}>
            <Statistic
              title={<span style={{ color: 'rgba(255,255,255,0.8)' }}>Total Receivables</span>}
              value={stats?.totalReceivables || 0}
              prefix={<UserOutlined />}
              valueStyle={{ color: 'white', fontWeight: 'bold', fontSize: '22px' }}
              formatter={(val) => formatCurrency(val, profile?.currency)}
            />
             <div style={{ marginTop: 8, fontSize: '12px', opacity: 0.8 }}>
                Pending from Customers
            </div>

            {/* Section: Paise jo wapis karne hain (Liabilities) */}
            <div style={{ marginTop: 8, paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.2)' }}>
                
                {/* 1. Customer Returns (Agar hain) */}
                {stats?.totalCustomerCredits > 0 && (
                    <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#ffccc7', display: 'flex', justifyContent: 'space-between' }}>
                        <span>To Customers:</span>
                        <span>- {formatCurrency(stats.totalCustomerCredits, profile?.currency)}</span>
                    </div>
                )}

                {/* 2. Supplier Payables (Agar hain) */}
                {/* Logic: Total Payables mein se Customer Credits nikaal dein to baqi Supplier ka bachega */}
                {(stats?.totalPayables - (stats?.totalCustomerCredits || 0)) > 0 && (
                    <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#ffccc7', display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                        <span>To Suppliers:</span>
                        <span>- {formatCurrency(stats.totalPayables - (stats.totalCustomerCredits || 0), profile?.currency)}</span>
                    </div>
                )}

            </div>

          </Card>
        </Col>
      </Row>

      {/* --- SECTION 1.5: QUICK ACTIONS --- */}
      <Row gutter={[16, 16]} style={{ marginTop: 5 }}>
        <Col span={24}>
          <Card variant="borderless" style={{ borderRadius: 5 }}>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', gap: '24px' }}>
              <Title level={5} style={{ margin: 0 }}>Quick Actions</Title>
              <Space wrap size="middle">
                <Tooltip title="New Sale">
                  <Button type="primary" icon={<ShoppingOutlined />} onClick={() => navigate('/pos')} />
                </Tooltip>
                <Tooltip title="Add Stock (Inventory)">
                  <Button icon={<PlusOutlined />} onClick={() => navigate('/inventory')} />
                </Tooltip>
                <Tooltip title="Warranty & Claims">
                  <Button icon={<SafetyCertificateOutlined />} onClick={() => navigate('/warranty')} />
                </Tooltip>
                <Tooltip title="Suppliers">
                  <Button icon={<TeamOutlined />} onClick={() => navigate('/suppliers')} />
                </Tooltip>
                <Tooltip title="Expenses">
                  <Button icon={<DollarCircleOutlined />} onClick={() => navigate('/expenses')} />
                </Tooltip>
                <Tooltip title="Close Register">
                  <Button 
                    icon={<CheckCircleOutlined />} 
                    style={{ backgroundColor: '#52c41a', color: 'white', border: 'none' }}
                    onClick={() => setIsClosingModalOpen(true)} 
                  />
                </Tooltip>
              </Space>
            </div>
          </Card>
        </Col>
      </Row>

      {/* --- SECTION 2: GRAPH & ALERTS --- */}
      <Row gutter={[16, 16]} style={{ marginTop: 5 }}>
        
        {/* Left Side: Sales Graph AND Recent Transactions */}
        <Col xs={24} lg={16}>
          {/* 1. Graph Card */}
          <Card 
  title="Sales Overview (Last 7 Days)" 
  // variant="borderless" hata diya
  style={{ borderRadius: 5, border: isDarkMode ? '1px solid #424242' : '1px solid #d9d9d9' }} // <--- Border add kiya
>
             <div style={{ height: 265 }}>
   {/* Key lagane se chart force-refresh hoga jab theme badlegi */}
   <Area {...config} key={isDarkMode ? 'dark-chart' : 'light-chart'} />
</div>
          </Card>

          {/* 2. Recent Transactions Table */}
          <Card 
  title="Recent Transactions" 
  // variant="borderless" hata diya
  style={{ borderRadius: 5, marginTop: 15, border: isDarkMode ? '1px solid #424242' : '1px solid #d9d9d9' }} // <--- Border add kiya
>
            <Table
              dataSource={stats?.recentSales || []}
              pagination={false}
              size="small"
              rowKey="id"
              columns={[
                { 
                  title: 'Customer', 
                  dataIndex: 'customer', 
                  key: 'customer',
                  render: (text) => <Text strong>{text}</Text>
                },
                { 
                  title: 'Date', 
                  dataIndex: 'date', 
                  key: 'date',
                  render: (date) => <Text type="secondary" style={{fontSize: 12}}>{new Date(date).toLocaleDateString()}</Text>
                },
                { 
                  title: 'Status', 
                  dataIndex: 'payment_status', 
                  key: 'payment_status',
                  // NAYA: Status Color Logic
                  render: (status) => {
                      let color = 'green';
                      if (status === 'unpaid') color = 'volcano';
                      if (status === 'partial') color = 'orange';
                      return <Tag color={color}>{status ? status.toUpperCase() : 'PAID'}</Tag>
                  }
                },
                { 
                  title: 'Amount', 
                  dataIndex: 'amount', 
                  key: 'amount',
                  align: 'right',
                  render: (amount) => <Tag color="blue">{formatCurrency(amount, profile?.currency)}</Tag>
                },
              ]}
            />
          </Card>
        </Col>

        {/* Right Side: Low Stock & Actions */}
        <Col xs={24} lg={8}>
          <Row gutter={[0, 16]}>
            
            {/* Low Stock Alert */}
            <Col span={24}>
              <Card 
                title={<Space><AlertOutlined style={{ color: '#ff4d4f' }} /> Low Stock Alert</Space>} 
                style={{ borderRadius: 5, border: isDarkMode ? '1px solid #424242' : '1px solid #d9d9d9' }}
                styles={{ body: { padding: '0 12px' } }}
                extra={<Button type="link" onClick={() => navigate('/inventory?low_stock=true')}>View All</Button>}
              >
                {profile?.low_stock_alerts_enabled !== false ? (
                  <List
                    itemLayout="horizontal"
                    dataSource={stats?.lowStockItems || []}
                    renderItem={(item) => (
                      <List.Item>
                        <List.Item.Meta
                          title={item.name}
                          description={<Text type="secondary">Only {item.quantity} left</Text>}
                        />
                        <Tag color="red">Low</Tag>
                      </List.Item>
                    )}
                    locale={{ emptyText: 'All items are well stocked!' }}
                  />
                ) : (
                  <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
                    <Text type="secondary">Low Stock Alerts are disabled in Settings.</Text>
                  </div>
                )}
              </Card>
            </Col>

            {/* Top Selling Products */}
            <Col span={24}>
              <Card 
                title={<Space><TrophyOutlined style={{ color: '#faad14' }} /> Top Selling Products</Space>} 
                style={{ borderRadius: 5, border: isDarkMode ? '1px solid #424242' : '1px solid #d9d9d9' }}
                styles={{ body: { padding: '0 12px' } }}
              >
                <List
                  itemLayout="horizontal"
                  dataSource={stats?.topSellingProducts || []}
                  renderItem={(item, index) => (
                    <List.Item>
                      <List.Item.Meta
                        avatar={<Tag color="gold">#{index + 1}</Tag>}
                        title={item.name}
                      />
                      <Text strong>{item.totalSold} Sold</Text>
                    </List.Item>
                  )}
                  locale={{ emptyText: 'No sales yet!' }}
                />
              </Card>
              <Col span={24} style={{ marginTop: 16 }}>
  <Card 
    title={<Space><ShoppingOutlined style={{ color: '#1890ff' }} /> Inventory Assets</Space>} 
    style={{ borderRadius: 5, border: isDarkMode ? '1px solid #424242' : '1px solid #d9d9d9' }}
    styles={{ body: { padding: '12px' } }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <Text type="secondary">Total Stock Value:</Text>
      <Text strong style={{ fontSize: '16px' }}>
        {formatCurrency(stats?.totalInventoryValue || 0, profile?.currency)}
      </Text>
    </div>
    <div style={{ marginTop: 8, fontSize: '11px', color: '#8c8c8c', fontStyle: 'italic' }}>
      * Based on purchase price of available items.
    </div>
  </Card>
</Col>
            </Col>

          </Row>
        </Col>
      </Row>
      {/* CASH ADJUSTMENT MODAL */}
      <Modal
        title="Cash Adjustment"
        open={isAdjustmentModalOpen}
        onCancel={() => setIsAdjustmentModalOpen(false)}
        onOk={() => adjustmentForm.submit()}
        okText="Save Adjustment"
        confirmLoading={isAdjustmentSubmitting}
      >
        <Form 
  form={adjustmentForm} 
  layout="vertical" 
  onFinish={handleAdjustmentSubmit} 
  initialValues={{ type: 'In', payment_method: 'Cash' }}
  onValuesChange={(changedValues, allValues) => {
    // Agar "Where" badla jaye aur Type "Transfer" ho
    if (changedValues.payment_method && allValues.type === 'Transfer') {
      const newTransferTo = changedValues.payment_method === 'Cash' ? 'Bank' : 'Cash';
      adjustmentForm.setFieldsValue({ transfer_to: newTransferTo });
    }
    // Agar Type "Transfer" par switch kiya jaye
    if (changedValues.type === 'Transfer') {
      const newTransferTo = allValues.payment_method === 'Cash' ? 'Bank' : 'Cash';
      adjustmentForm.setFieldsValue({ transfer_to: newTransferTo });
    }
  }}
>
          <Form.Item name="type" label="Adjustment Type" rules={[{ required: true }]}>
            <Radio.Group buttonStyle="solid">
              <Radio.Button value="In">Cash In</Radio.Button>
              <Radio.Button value="Out">Cash Out</Radio.Button>
              <Radio.Button value="Transfer">Transfer</Radio.Button>
            </Radio.Group>
          </Form.Item>

          <Form.Item name="payment_method" label="Where?" rules={[{ required: true }]}>
            <Radio.Group buttonStyle="solid">
              <Radio.Button value="Cash">Cash</Radio.Button>
              <Radio.Button value="Bank">Bank / Online</Radio.Button>
            </Radio.Group>
          </Form.Item>

          {/* Agar Transfer select ho to poocho kahan bhejna hai */}
          <Form.Item shouldUpdate={(prev, curr) => prev.type !== curr.type || prev.payment_method !== curr.payment_method} noStyle>
            {({ getFieldValue }) => 
              getFieldValue('type') === 'Transfer' ? (
                <Form.Item name="transfer_to" label="Transfer To" rules={[{ required: true }]}>
                  <Radio.Group buttonStyle="solid">
                    <Radio.Button value={getFieldValue('payment_method') === 'Cash' ? 'Bank' : 'Cash'}>
                      {getFieldValue('payment_method') === 'Cash' ? 'Bank' : 'Cash'}
                    </Radio.Button>
                  </Radio.Group>
                </Form.Item>
              ) : null
            }
          </Form.Item>

          <Form.Item name="amount" label="Amount" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} prefix={profile?.currency} min={1} />
          </Form.Item>

          <Form.Item name="notes" label="Notes (e.g. Opening Balance)">
            <Input.TextArea placeholder="Why are you adjusting cash?" />
          </Form.Item>
        </Form>
      </Modal>
      {/* UPGRADED HISTORY MODAL (FIXED DEPRECATION WARNING) */}
      <Modal
        title="Cash & Closing Reports"
        open={isHistoryModalOpen}
        onCancel={() => setIsHistoryModalOpen(false)}
        footer={null}
        width={850}
      >
        <Tabs 
          defaultActiveKey="1" 
          items={[
            {
              key: '1',
              label: 'Cash Adjustments (In/Out)',
              children: (
                <Table
                  dataSource={historyData}
                  rowKey="id"
                  pagination={{ pageSize: 5 }}
                  size="small"
                  columns={[
                    { title: 'Date', dataIndex: 'created_at', render: (date) => new Date(date).toLocaleString() },
                    { title: 'Type', dataIndex: 'type', render: (type) => <Tag color={type === 'In' ? 'green' : type === 'Out' ? 'red' : 'blue'}>{type.toUpperCase()}</Tag> },
                    { title: 'Method', dataIndex: 'payment_method', render: (m) => <Tag>{m}</Tag> },
                    { title: 'Amount', dataIndex: 'amount', align: 'right', render: (val) => <Text strong>{formatCurrency(val, profile?.currency)}</Text> },
                    { title: 'Notes', dataIndex: 'notes', ellipsis: true }
                  ]}
                />
              ),
            },
            {
              key: '2',
              label: 'Daily Closing Reports',
              children: (
                <Table
                  dataSource={closingHistoryData}
                  rowKey="id"
                  pagination={{ pageSize: 5 }}
                  size="small"
                  columns={[
                    { title: 'Date', dataIndex: 'closing_date', render: (date) => new Date(date).toLocaleDateString() },
                    { title: 'Expected', dataIndex: 'expected_cash', align: 'right', render: (val) => formatCurrency(val, profile?.currency) },
                    { title: 'Actual', dataIndex: 'actual_cash', align: 'right', render: (val) => formatCurrency(val, profile?.currency) },
                    { 
                      title: 'Difference', 
                      dataIndex: 'difference', 
                      align: 'right', 
                      render: (diff) => (
                        <Text strong style={{ color: diff === 0 ? '#52c41a' : '#f5222d' }}>
                          {formatCurrency(diff, profile?.currency)}
                        </Text>
                      ) 
                    },
                    { title: 'Remarks', dataIndex: 'notes', render: (text) => <Text type="secondary" style={{ fontStyle: 'italic' }}>{text || 'No notes'}</Text> }
                  ]}
                />
              ),
            },
          ]}
        />
      </Modal>
      {/* DAY-END CLOSING MODAL */}
      <Modal
        title="Daily Cash Closing"
        open={isClosingModalOpen}
        onCancel={() => setIsClosingModalOpen(false)}
        onOk={() => closingForm.submit()}
        okText="Confirm & Close Register"
        confirmLoading={isClosingSubmitting}
        width={500}
      >
        <div style={{ textAlign: 'center', marginBottom: '20px', padding: '15px', background: isDarkMode ? '#1f1f1f' : '#f5f5f5', borderRadius: '8px' }}>
          <Text type="secondary">Expected Cash in Drawer:</Text>
          <Title level={3} style={{ margin: 0, color: '#1890ff' }}>
            {formatCurrency(stats?.cashInHand || 0, profile?.currency)}
          </Title>
        </div>

        <Form form={closingForm} layout="vertical" onFinish={handleClosingSubmit}>
          <Form.Item 
            name="actual_cash" 
            label="Actual Cash Counted:" 
            rules={[{ required: true, message: 'Please enter actual cash amount' }]}
          >
            <InputNumber 
              style={{ width: '100%' }} 
              size="large"
              prefix={profile?.currency} 
              placeholder="Enter counted cash"
            />
          </Form.Item>

          {/* Live Difference Display */}
          <Form.Item shouldUpdate={(prev, curr) => prev.actual_cash !== curr.actual_cash} noStyle>
            {({ getFieldValue }) => {
              const actual = getFieldValue('actual_cash') || 0;
              const expected = stats?.cashInHand || 0;
              const diff = actual - expected;
              
              if (actual === 0) return null;

              return (
                <div style={{ marginBottom: '20px', padding: '10px', borderRadius: '5px', backgroundColor: diff === 0 ? '#f6ffed' : '#fff1f0', border: diff === 0 ? '1px solid #b7eb8f' : '1px solid #ffa39e' }}>
                  <Text strong style={{ color: diff >= 0 ? '#52c41a' : '#f5222d' }}>
                    Difference: {formatCurrency(diff, profile?.currency)}
                  </Text>
                  <br />
                  <Text size="small" type="secondary">
                    {diff === 0 ? "Perfect! Cash matches the record." : diff > 0 ? "Cash is over (Surplus)." : "Cash is short (Deficit)!"}
                  </Text>
                </div>
              );
            }}
          </Form.Item>

          <Form.Item 
  noStyle
  shouldUpdate={(prev, curr) => prev.actual_cash !== curr.actual_cash}
>
  {({ getFieldValue }) => {
    const actual = getFieldValue('actual_cash') || 0;
    const expected = stats?.cashInHand || 0;
    const isDifferent = actual !== expected && actual !== 0;

    return (
      <Form.Item 
        name="notes" 
        label="Remarks / Notes:" 
        rules={[{ 
          required: isDifferent, 
          message: 'Please explain the reason for the cash difference.' 
        }]}
      >
        <Input.TextArea 
          placeholder={isDifferent ? "Explain why there is a difference..." : "Optional notes..."} 
        />
      </Form.Item>
    );
  }}
</Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Dashboard;