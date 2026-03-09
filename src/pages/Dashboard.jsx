import React, { useState, useEffect, useCallback } from 'react';
import { Card, Row, Col, Statistic, Typography, List, Button, Spin, Space, Tag, Table, Radio, Modal, Form, InputNumber, Input, App, Tooltip, Tabs, theme, DatePicker } from 'antd';
import dayjs from 'dayjs';
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
  TransactionOutlined,
  ShoppingCartOutlined,
  LockOutlined // <-- Naya Icon
} from '@ant-design/icons';
import { getPlanLimits } from '../config/subscriptionPlans'; // <-- Control Center Import
import { Area, Pie } from '@ant-design/charts'; 
import { useNavigate } from 'react-router-dom';
import { useMediaQuery } from '../hooks/useMediaQuery'; 
import DataService from '../DataService';
import { db } from '../db';
import { useAuth } from '../context/AuthContext';
import { useStaff } from '../context/StaffContext'; 
import { formatCurrency } from '../utils/currencyFormatter';
import { useTheme } from '../context/ThemeContext';
import PageTour from '../components/PageTour';
import { useRef } from 'react';

const { Title, Text } = Typography;

const Dashboard = () => {
  const { isDarkMode } = useTheme();
  const { can, activeStaff } = useStaff();
  const { user, profile } = useAuth(); // User aur Profile dono shamil kar liye
  const limits = getPlanLimits(profile?.subscription_tier);
  const isMonthLocked = !limits.allow_monthly_reports;
  const isCustomLocked = !limits.allow_custom_date_reports; 
  const isMobile = useMediaQuery('(max-width: 768px)');  
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [staffMembers, setStaffMembers] = useState([]); // <--- NAYA IZAFA
  const[loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('today');
  const [customDates, setCustomDates] = useState([]); // NAYA: Custom dates save karne ke liye
  const [topSellingFilter, setTopSellingFilter] = useState('qty'); 

  const { message, modal } = App.useApp();

  // NAYA: Waqt ke mutabiq Greeting generate karne ka function
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    if (hour < 21) return "Good Evening";
    return "Hello";
  };
  const { token } = theme.useToken();
  const refSales = useRef(null);
  const refCash = useRef(null);
  const refProfit = useRef(null);
  const refQuickActions = useRef(null);
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [isAdjustmentSubmitting, setIsAdjustmentSubmitting] = useState(false);
  const [isClosingSubmitting, setIsClosingSubmitting] = useState(false);
  const [adjustmentForm] = Form.useForm();
  const tourSteps = [
    {
      title: 'Sales Overview',
      description: 'Here you can see your total sales for today, this week, This month or from the selected custom range.',
      target: () => refSales.current,
    },
    {
      title: 'Galla (Cash in Hand)',
      description: 'This is the cash in your drawer. You can also cash in / out from here.',
      target: () => refCash.current,
    },
    {
      title: 'Net Profit',
      description: 'Your real profit will appear here after all expenses are taken out.',
      target: () => refProfit.current,
    },
    {
      title: 'Quick Actions',
      description: 'Use shortcuts to make new sales or add stock, you can also customize shortcuts from app settings',
      target: () => refQuickActions.current,
    },
  ];

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyData, setHistoryData] = useState([]);

  const [isClosingModalOpen, setIsClosingModalOpen] = useState(false);
  const [closingForm] = Form.useForm();

  const [closingHistoryData, setClosingHistoryData] = useState([]);

  const handleOpenHistory = async () => {
    // Dono tables se data uthayein
    const adjustments = await db.cash_adjustments.orderBy('created_at').reverse().toArray();
    const closings = await db.daily_closings.orderBy('created_at').reverse().toArray();
    const staff = await DataService.getStaffMembers(); // <--- NAYA IZAFA
    
    setStaffMembers(staff); // <--- NAYA IZAFA
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
        staff_id: activeStaff?.id, // <--- NAYA IZAFA
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
      const diff = Math.round((actual - expected) * 100) / 100;

      const closingData = {
        id: crypto.randomUUID(),
        local_id: crypto.randomUUID(),
        user_id: user?.id,
        closing_date: new Date().toISOString().split('T')[0], // Aaj ki date
        staff_id: activeStaff?.id, // <--- NAYA IZAFA
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
  
  const navigate = useNavigate();

  const loadDashboard = useCallback(async () => {
    // Agar stats pehle se hain to poora page white na ho, sirf data update ho
    if (!stats) setLoading(true); 
    try {
      // NAYA: customDates bhi pass kar rahe hain
      const dashboardStats = await DataService.getDashboardStats(profile?.low_stock_threshold, timeRange, customDates);
      // NAYA: Ab graph bhi filter ke hisaab se update hoga
      const salesChart = await DataService.getSalesChartData(timeRange, customDates);
      setStats(dashboardStats);
      setChartData(salesChart);
    } catch (error) {
      console.error("Dashboard Load Error:", error);
    } finally {
      setLoading(false);
    }
  }, [profile, timeRange, customDates]); // NAYA: customDates add kiya

  // --- NAYA: SILENT REFRESH LISTENER (Dashboard stats ko chupke se update karne ke liye) ---
  useEffect(() => {
    // Dashboard khulne par pehli dafa data load karein (Initial Call)
    loadDashboard();

    const handleRefresh = () => {
      // Hum sirf loadDashboard ko dobara chalayenge
      // Kyunke loadDashboard mein pehle se check laga hua hai 'if (!stats) setLoading(true)',
      // is liye ye dobara chalne par spinner nahi dikhayega balkeh chupke se stats update kar dega.
      loadDashboard();
    };
    window.addEventListener('local-db-updated', handleRefresh);
    return () => window.removeEventListener('local-db-updated', handleRefresh);
  }, [loadDashboard]);
  
  // --- NAYA IZAFA: Auto-Initialize Categories for New Users ---
  useEffect(() => {
    if (user?.id) {
      DataService.initializeUserCategories(user.id);
    }
  }, [user?.id]);

  if (loading && !stats) return <div style={{ textAlign: 'center', marginTop: 100 }}><Spin size="large" /></div>;

  // --- Helper: Comparison Label ---
  const getComparisonLabel = () => {
      if (timeRange === 'week') return 'vs Last Week';
      if (timeRange === 'month') return 'vs Last Month';
      return 'vs Yesterday';
  };

  // --- Helper: Trend Renderer ---
  const renderTrend = (percent) => {
    // NAYA: Custom range mein trend hide karein (Option A)
    if (timeRange === 'custom') return null;
    
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
  const cardStyle = { borderRadius: 8, border: 'none', color: '#ffffff', height: '100%' };

  // --- Graph Configuration (CONTROL CENTER LINKED) ---
  const config = {
    data: chartData,
    xField: 'date',
    yField: 'amount',
    smooth: true,
    // 1. Theme set karein
    theme: isDarkMode ? 'dark' : 'light',
    
    // 2. Gradient Color (Area Style)
    areaStyle: () => {
      return {
        fill: isDarkMode 
            ? `l(270) 0:#1f1f1f 0.5:${token.colorPrimary} 1:${token.colorPrimary}` 
            : `l(270) 0:#ffffff 0.5:${token.colorBorder} 1:${token.colorPrimary}`,
      };
    },
    
    // 3. Main Line Color (Yeh sab se zaroori hai)
    color: token.colorPrimary,
    
    // 4. X-Axis (Neeche wali dates)
    xAxis: {
        label: {
            style: {
                fill: isDarkMode ? 'rgba(255,255,255,0.85)' : token.colorText,
            }
        },
        grid: {
            line: {
                style: {
                    stroke: isDarkMode ? '#444' : token.colorBorder,
                }
            }
        }
    },

    // 5. Y-Axis (Side wali prices)
    yAxis: {
        label: {
            formatter: (v) => `${v}`,
            style: {
                fill: isDarkMode ? 'rgba(255,255,255,0.85)' : token.colorText,
            }
        },
        grid: {
            line: {
                style: {
                    stroke: isDarkMode ? '#444' : token.colorBorder,
                }
            }
        }
    },

    // 6. Tooltip
    tooltip: {
        formatter: (datum) => {
            return { name: 'Sales', value: formatCurrency(datum.amount, profile?.currency) };
        },
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
    <div style={{ padding: isMobile ? '12px 4px' : '4px' }}>
      <PageTour pageKey="dashboard" steps={tourSteps} />
      
      {/* HEADER WITH FILTERS */}
      <div style={{ display: 'flex', justifyContent: isMobile ? 'space-between' : 'flex-end', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        {isMobile && (
          <Title level={2} style={{ margin: 0, marginLeft: '8px', fontSize: '23px' }}>
            <HomeOutlined /> Dashboard
          </Title>
        )}
        
        {/* Time Filter Buttons (Sirf Owner ke liye) */}
        {can('can_view_reports') && (
          <Space wrap>
            <Radio.Group 
              value={timeRange} 
              onChange={(e) => {
                const val = e.target.value;
                
                // --- PROFESSIONAL MODAL LOCK LOGIC ---
                const showUpgradeModal = (title, feature) => {
                  modal.confirm({
                    title: `${title} Locked`,
                    content: (
                      <div>
                        <p>In Free Plan, <b>{feature}</b> are restricted.</p>
                        <p>To view advanced analytics and history, please upgrade to Growth Plan.</p>
                      </div>
                    ),
                    okText: 'View Plans',
                    cancelText: 'Close', // Yeh naya button add ho gaya
                    onOk: () => navigate('/subscription')
                  });
                };

                if (val === 'month' && isMonthLocked) {
                    showUpgradeModal("Monthly Reports", "Monthly sales insights");
                    return;
                }
                if (val === 'custom' && isCustomLocked) {
                    showUpgradeModal("Custom Reports", "Custom date range filtering");
                    return;
                }
                // --- END LOCK LOGIC ---

                setTimeRange(val);
                if(val !== 'custom') {
                  setCustomDates([]);
                }
              }} 
              buttonStyle="solid"
            >
              <Radio.Button value="today">Today</Radio.Button>
              <Radio.Button value="week">This Week</Radio.Button>
              
              <Radio.Button 
                value="month" 
                style={isMonthLocked ? { color: token.colorTextDisabled, cursor: 'pointer' } : {}}
              >
                This Month {isMonthLocked && <LockOutlined style={{ fontSize: '11px', marginLeft: '4px', color: token.colorTextDisabled }} />}
              </Radio.Button>

              <Radio.Button 
                value="custom" 
                style={isCustomLocked ? { color: token.colorTextDisabled, cursor: 'pointer' } : {}}
              >
                Custom {isCustomLocked && <LockOutlined style={{ fontSize: '11px', marginLeft: '4px', color: token.colorTextDisabled }} />}
              </Radio.Button>
            </Radio.Group>
            
            {/* NAYA: Agar Custom select ho to DatePicker dikhayein */}
            {timeRange === 'custom' && (
              <DatePicker.RangePicker 
                format="DD/MM/YYYY"
                // NAYA: Calendar ko bol rahe hain ke hamesha memory wali dates dikhao
                value={customDates.length === 2 ? [dayjs(customDates[0]), dayjs(customDates[1])] : null}
                onChange={(dates) => {
                  if (dates) {
                    setCustomDates([dates[0].toISOString(), dates[1].toISOString()]);
                  } else {
                    setCustomDates([]);
                  }
                }}
                allowClear={true}
              />
            )}
          </Space>
        )}
      </div>

      {/* --- SECTION 1: STATS CARDS --- */}
      {!can('can_view_reports') ? (
        /* STAFF WELCOME CARD */
        <Col span={24}>
          <Card 
            style={{ 
              borderRadius: 12, 
              background: isDarkMode ? '#1f1f1f' : '#ffffff',
              border: `1px solid ${token.colorBorder}`,
              padding: '20px 10px'
            }}
          >
            <Row align="middle" gutter={[24, 24]}>
              <Col xs={24} md={4} style={{ textAlign: 'center' }}>
                <div style={{ 
                  width: 80, height: 80, borderRadius: '50%', 
                  background: token.colorPrimary, display: 'flex', 
                  alignItems: 'center', justifyContent: 'center', margin: '0 auto' 
                }}>
                  <UserOutlined style={{ fontSize: 40, color: '#fff' }} />
                </div>
              </Col>
              <Col xs={24} md={20}>
                <Title level={2} style={{ margin: 0 }}>{getGreeting()}, {activeStaff?.name || 'Staff'}!</Title>
                <Text type="secondary" style={{ fontSize: '16px' }}>
                  Welcome back to <b>{profile?.shop_name}</b>. Today is {new Date().toLocaleDateString('en-PK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.
                </Text>
                <div style={{ marginTop: 16 }}>
                  <Tag color="blue" icon={<CheckCircleOutlined />}>Shift Active</Tag>
                  <Tag color="cyan">{activeStaff?.role || 'Staff Member'}</Tag>
                </div>

                {/* Salesman ke liye jaldi kaam shuru karne ka button */}
                <div style={{ marginTop: 24 }}>
                  <Button 
                    type="primary" 
                    size="large" 
                    icon={<ShoppingCartOutlined />} 
                    onClick={() => navigate('/pos')}
                    style={{ height: '45px', padding: '0 30px', fontSize: '16px', borderRadius: '8px' }}
                  >
                    Start Selling (POS)
                  </Button>
                </div>
              </Col>
            </Row>
          </Card>
        </Col>
      ) : (
        <Row gutter={[16, 16]} style={{ width: '100%', margin: 0 }}>
        {/* Card 1: Sales */}
        <Col xs={24} sm={12} md={8} lg={{ flex: '1 1 0' }}>
          <Card ref={refSales} style={{ ...cardStyle, backgroundColor: isDarkMode ? '#2C3E50' : token.colorPrimary }}>
            <Statistic
              title={<span style={{ color: 'rgba(255,255,255,0.8)' }}>
                {timeRange === 'today' ? "Today's Sales" : timeRange === 'week' ? "Weekly Sales" : timeRange === 'month' ? "Monthly Sales" : "Custom Range Sales"}
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
          <Card ref={refCash} style={{ ...cardStyle, backgroundColor: isDarkMode ? '#0F7A82' : '#088395' }}>
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
            {/* Standard Ant Design Button */}
            <Button 
              block 
              icon={<CheckCircleOutlined />}
              style={{ marginTop: 12 }}
              onClick={() => setIsClosingModalOpen(true)}
            >
              Day-End Closing
            </Button>
          </Card>
        </Col>

        {/* Card 2: Profit (Updated Layout for Clarity) */}
        <Col xs={24} sm={12} md={8} lg={{ flex: '1 1 0' }}>
          <Card ref={refProfit} style={{ ...cardStyle, backgroundColor: isDarkMode ? '#1E8449' : '#237804' }}>
            <Statistic
              title={<span style={{ color: 'rgba(255,255,255,0.8)' }}>Net Profit</span>}
              value={stats?.netProfit || 0}
              prefix={<RiseOutlined />}
              valueStyle={{ color: 'white', fontWeight: 'bold', fontSize: '22px' }}
              formatter={(val) => formatCurrency(val, profile?.currency)}
            />
            
            {/* Net Profit ki description - Ab yeh upar hai */}
            <div style={{ marginTop: -4, marginBottom: 10, fontSize: '11px', opacity: 0.8 }}>
                {timeRange === 'today' ? "Today's" : timeRange === 'custom' ? "Selected range" : "Total"} profit after expenses
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
          <Card style={{ ...cardStyle, backgroundColor: isDarkMode ? '#BA4A00' : '#d4380d' }}>
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

        {/* Card 4: Receivables & Payables (Money In vs Money Out) */}
        <Col xs={24} sm={12} md={8} lg={{ flex: '1 1 0' }}>
          <Card style={{ ...cardStyle, backgroundColor: isDarkMode ? '#5B2C6F' : '#531dab' }}>
            <Statistic
              title={<span style={{ color: 'rgba(255,255,255,0.8)' }}>Accounts Receivable</span>}
              value={stats?.totalReceivables || 0}
              prefix={<ArrowDownOutlined style={{ fontSize: '16px' }} />}
              valueStyle={{ color: 'white', fontWeight: 'bold', fontSize: '22px' }}
              formatter={(val) => formatCurrency(val, profile?.currency)}
            />
             <div style={{ marginTop: -4, marginBottom: 10, fontSize: '11px', opacity: 0.8 }}>
                Pending from customers
            </div>

            {/* Section: Accounts Payable (Liabilities) */}
            <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.2)' }}>
                <div style={{ fontSize: '11px', opacity: 0.7, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Accounts Payable (To Pay)
                </div>
                
                {/* 1. Supplier Payables */}
                <div style={{ fontSize: '13px', display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,0.85)' }}>
                    <span>Suppliers:</span>
                    <span style={{ fontWeight: 'bold' }}>{formatCurrency(stats?.totalPayables - (stats?.totalCustomerCredits || 0) - (stats?.totalStaffPayables || 0), profile?.currency)}</span>
                </div>

                {/* 2. Staff Salaries (Due) */}
                {stats?.totalStaffPayables > 0 && (
                    <div style={{ fontSize: '13px', display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,0.85)', marginTop: 2 }}>
                        <span>Staff Salaries:</span>
                        <span style={{ fontWeight: 'bold' }}>{formatCurrency(stats.totalStaffPayables, profile?.currency)}</span>
                    </div>
                )}

                {/* 3. Customer Credits (Due to returns) */}
                {stats?.totalCustomerCredits > 0 && (
                    <div style={{ fontSize: '13px', display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,0.85)', marginTop: 2 }}>
                        <span>Customer Credits:</span>
                        <span style={{ fontWeight: 'bold' }}>{formatCurrency(stats.totalCustomerCredits, profile?.currency)}</span>
                    </div>
                )}
            </div>
          </Card>
        </Col>
      </Row>
      )}

      {/* --- SECTION 2: GRAPH & ALERTS --- */}
      <Row gutter={[16, 16]} style={{ marginTop: 10 }}>
        
        {/* Left Side: Sales Graph AND Recent Transactions (Sirf Owner ko nazar aayega) */}
        {can('can_view_reports') && (
        <Col xs={24} lg={16}>
          {/* 1. Graph Card */}
          <Card 
  title={
    timeRange === 'today' ? "Sales Overview (Last 7 Days)" : 
    timeRange === 'week' ? "Sales Overview (This Week)" : 
    timeRange === 'month' ? "Sales Overview (This Month)" : 
    "Sales Overview (Custom Range)"
  } 
  // variant="borderless" hata diya
  style={{ borderRadius: 5, border: isDarkMode ? '1px solid #424242' : '1px solid #d9d9d9' }} // <--- Border add kiya
>
             <div style={{ height: 265 }}>
   {/* Key lagane se chart force-refresh hoga jab theme badlegi */}
   <Area {...config} key={(isDarkMode ? 'dark-chart' : 'light-chart') + token.colorPrimary} />
</div>
          </Card>

          {/* 2. Recent Transactions Table */}
          <Card 
  title="Recent Transactions" 
  // variant="borderless" hata diya
  style={{ borderRadius: 5, marginTop: 15, border: isDarkMode ? '1px solid #424242' : `1px solid ${token.colorBorder}` }}
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
                  // STANDARD: Semantic Colors for Auto Dark/Light Adaptation
                  render: (status) => {
                      let color = 'success'; // Auto-adapts to Dark/Light
                      if (status === 'unpaid') color = 'error';
                      if (status === 'partial') color = 'warning';
                      return <Tag color={color}>{status ? status.toUpperCase() : 'PAID'}</Tag>
                  }
                },
                { 
                  title: 'Amount', 
                  dataIndex: 'amount', 
                  key: 'amount',
                  align: 'right',
                  render: (amount) => <Tag color="processing">{formatCurrency(amount, profile?.currency)}</Tag>
                },
              ]}
            />
          </Card>
        </Col>
        )}

        {/* Right Side: Low Stock & Actions (Sirf Owner ke liye) */}
        {can('can_view_reports') && (
        <Col xs={24} lg={8}>
          <Row gutter={[0, 16]}>
            
            {/* Low Stock Alert */}
            <Col span={24}>
              <Card 
                title={<Space><AlertOutlined style={{ color: token.colorError }} /> Low Stock Alert</Space>} 
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
                        <Tag color="error">Low</Tag>
                      </List.Item>
                    )}
                    locale={{ emptyText: 'All items are well stocked!' }}
                  />
                ) : (
                  <div style={{ textAlign: 'center', padding: '20px', color: token.colorTextSecondary }}>
                    <Text type="secondary">Low Stock Alerts are disabled in Settings.</Text>
                  </div>
                )}
              </Card>
            </Col>

            {/* Top Selling Products */}
            <Col span={24}>
              <Card 
  title={<Space><TrophyOutlined style={{ color: token.colorWarning }} /> {topSellingFilter === 'qty' ? 'Top Selling' : 'Most Profitable'}</Space>} 
  extra={
    <Radio.Group size="small" value={topSellingFilter} onChange={e => setTopSellingFilter(e.target.value)}>
      <Radio.Button value="qty">Qty</Radio.Button>
      <Radio.Button value="profit">Profit</Radio.Button>
    </Radio.Group>
  }
  style={{ borderRadius: 5, border: isDarkMode ? '1px solid #424242' : '1px solid #d9d9d9' }}
  styles={{ body: { padding: '0 12px' } }}
>
                <List
  itemLayout="horizontal"
  dataSource={(stats?.topSellingProducts || [])
    .sort((a, b) => topSellingFilter === 'qty' ? b.totalSold - a.totalSold : b.totalProfit - a.totalProfit)
    .slice(0, 5)
  }
  renderItem={(item, index) => (
    <List.Item>
      <List.Item.Meta
        avatar={<Tag color={token.colorWarning}>#{index + 1}</Tag>}
        title={item.name}
      />
      <Text strong>
        {topSellingFilter === 'qty' 
          ? `${item.totalSold} Sold` 
          : formatCurrency(item.totalProfit, profile?.currency)
        }
      </Text>
    </List.Item>
  )}
  locale={{ emptyText: 'No sales yet!' }}
/>
              </Card>
              <Col span={24} style={{ marginTop: 16 }}>
  <Card 
    title={<Space><ShoppingOutlined style={{ color: token.colorPrimary }} /> Inventory Assets</Space>} 
    style={{ borderRadius: 5, border: isDarkMode ? '1px solid #424242' : `1px solid ${token.colorBorder}` }}
    styles={{ body: { padding: '12px' } }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <Text type="secondary">Total Stock Value:</Text>
      <Text strong style={{ fontSize: '16px' }}>
        {formatCurrency(stats?.totalInventoryValue || 0, profile?.currency)}
      </Text>
    </div>
    <div style={{ marginTop: 8, fontSize: '11px', color: token.colorTextSecondary, fontStyle: 'italic' }}>
      * Based on purchase price of available items.
    </div>
  </Card>
</Col>
            </Col>

          </Row>
        </Col>
        )}
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
                    { 
                      title: 'Staff', 
                      key: 'staff', 
                      render: (_, record) => staffMembers.find(s => s.id === record.staff_id)?.name || 'Owner' 
                    },
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
                      title: 'Staff', 
                      key: 'staff', 
                      render: (_, record) => staffMembers.find(s => s.id === record.staff_id)?.name || 'Owner' 
                    },
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
              const diff = Math.round((actual - expected) * 100) / 100;
              
              if (actual === 0) return null;

              return (
                <div style={{ 
                  marginBottom: '20px', 
                  padding: '10px', 
                  borderRadius: '5px', 
                  backgroundColor: diff === 0 ? token.colorSuccessBg : token.colorErrorBg, 
                  border: `1px solid ${diff === 0 ? token.colorSuccessBorder : token.colorErrorBorder}` 
                }}>
                  <Text strong style={{ color: diff >= 0 ? token.colorSuccess : token.colorError }}>
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