import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Typography, List, Button, Spin, Space, Tag, Table } from 'antd';
import {
  ShoppingOutlined,
  RiseOutlined,
  FallOutlined,
  AlertOutlined,
  PlusOutlined,
  WalletOutlined,
  TeamOutlined,
  DollarCircleOutlined,
  TrophyOutlined
} from '@ant-design/icons';
// CHANGE: Recharts hata kar Ant Design Charts lagaya hai
import { Area } from '@ant-design/charts'; 
import { useNavigate } from 'react-router-dom';
import DataService from '../DataService';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/currencyFormatter';

const { Title, Text } = Typography;

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const dashboardStats = await DataService.getDashboardStats(profile?.low_stock_threshold);
        const salesChart = await DataService.getLast7DaysSales();
        setStats(dashboardStats);
        setChartData(salesChart);
      } catch (error) {
        console.error("Dashboard Load Error:", error);
      } finally {
        setLoading(false);
      }
    };
    loadDashboard();
  }, []);

  if (loading) return <div style={{ textAlign: 'center', marginTop: 100 }}><Spin size="large" /></div>;

  // --- Custom Styles for Cards (Gradients) ---
  const cardStyle = { borderRadius: 12, border: 'none', color: 'white', height: '100%' };

  // --- Graph Configuration (Ant Design Charts) ---
  const config = {
    data: chartData,
    xField: 'date',
    yField: 'amount',
    smooth: true, // Line ko golai (curve) deta hai
    areaStyle: () => {
      return {
        fill: 'l(270) 0:#ffffff 0.5:#7ec2f3 1:#1890ff', // Khoobsurat Gradient
      };
    },
    color: '#1890ff',
    yAxis: {
        label: {
            formatter: (v) => `${v}`, // Yahan currency symbol hata diya taake saaf dikhe
        },
    },
    tooltip: {
        formatter: (datum) => {
            return { name: 'Sales', value: formatCurrency(datum.amount, profile?.currency) };
        },
    },
    autoFit: true,
    height: 245,
  };

  return (
    <div style={{ padding: '0 8px' }}>
      <Title level={2} style={{ marginBottom: 24 }}>Dashboard</Title>

      {/* --- SECTION 1: TODAY'S SNAPSHOT (Top Cards) --- */}
      <Row gutter={[16, 16]}>
        {/* Card 1: Today's Sales */}
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ ...cardStyle, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            <Statistic
              title={<span style={{ color: 'rgba(255,255,255,0.8)' }}>Today's Sales</span>}
              value={stats?.totalSalesToday || 0}
              prefix={<ShoppingOutlined />}
              valueStyle={{ color: 'white', fontWeight: 'bold' }}
              formatter={(val) => formatCurrency(val, profile?.currency)}
            />
          </Card>
        </Col>

        {/* Card 2: Today's Profit */}
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ ...cardStyle, background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' }}>
            <Statistic
              title={<span style={{ color: 'rgba(255,255,255,0.8)' }}>Net Profit (Today)</span>}
              value={stats?.netProfitToday || 0}
              prefix={<RiseOutlined />}
              valueStyle={{ color: 'white', fontWeight: 'bold' }}
              formatter={(val) => formatCurrency(val, profile?.currency)}
            />
          </Card>
        </Col>

        {/* Card 3: Expenses */}
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ ...cardStyle, background: 'linear-gradient(135deg, #ff9966 0%, #ff5e62 100%)' }}>
            <Statistic
              title={<span style={{ color: 'rgba(255,255,255,0.8)' }}>Today's Expenses</span>}
              value={stats?.totalExpensesToday || 0}
              prefix={<FallOutlined />}
              valueStyle={{ color: 'white', fontWeight: 'bold' }}
              formatter={(val) => formatCurrency(val, profile?.currency)}
            />
          </Card>
        </Col>

        {/* Card 4: Receivables */}
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ ...cardStyle, background: 'linear-gradient(135deg, #3a6073 0%, #3a7bd5 100%)' }}>
            <Statistic
              title={<span style={{ color: 'rgba(255,255,255,0.8)' }}>Total Receivables</span>}
              value={stats?.totalReceivables || 0}
              prefix={<WalletOutlined />}
              valueStyle={{ color: 'white', fontWeight: 'bold' }}
              formatter={(val) => formatCurrency(val, profile?.currency)}
            />
          </Card>
        </Col>
      </Row>

      {/* --- SECTION 1.5: QUICK ACTIONS (Moved Here) --- */}
      <Row gutter={[16, 16]} style={{ marginTop: 5 }}>
        <Col span={24}>
          <Card variant="borderless" style={{ borderRadius: 12 }}>
            {/* Hum ne yahan 'flex' lagaya hai taake Title aur Buttons aamne-samne ayen */}
            {/* 'space-between' ki jagah 'center' kiya, aur gap 16 se 24 kar diya */}
<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', gap: '24px' }}>
              
              {/* Title (Margin khatam kar diya taake center mein aye) */}
              <Title level={5} style={{ margin: 0 }}>Quick Actions</Title>
              
              {/* Buttons */}
              <Space wrap>
                <Button type="primary" icon={<ShoppingOutlined />} onClick={() => navigate('/pos')}>
                  New Sale
                </Button>
                <Button icon={<PlusOutlined />} onClick={() => navigate('/purchases')}>
                  Purchase
                </Button>
                <Button icon={<TeamOutlined />} onClick={() => navigate('/suppliers')}>
                  Suppliers
                </Button>
                <Button icon={<DollarCircleOutlined />} onClick={() => navigate('/expenses')}>
                  Expenses
                </Button>
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
          <Card title="Sales Overview (Last 7 Days)" variant="borderless" style={{ borderRadius: 12 }}>
             <div style={{ height: 300 }}>
                <Area {...config} />
             </div>
          </Card>

          {/* 2. Recent Transactions Table (Ab yeh isi Column ke andar hai) */}
          <Card title="Recent Transactions" variant="borderless" style={{ borderRadius: 12, marginTop: 5 }}>
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
                  title: 'Amount', 
                  dataIndex: 'amount', 
                  key: 'amount',
                  align: 'right',
                  render: (amount) => <Tag color="green">{formatCurrency(amount, profile?.currency)}</Tag>
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
                variant="borderless" 
                style={{ borderRadius: 12 }}
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
                variant="borderless" 
                style={{ borderRadius: 12 }}
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
            </Col>

          </Row>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;