import React, { useState, useEffect, useCallback } from 'react';
import { 
  Card, Row, Col, Typography, Tabs, DatePicker, Statistic, 
  Table, Tag, Space, Button, Empty, Spin, theme, Divider, List
} from 'antd';
import { 
  BarChartOutlined, DownloadOutlined, DollarOutlined, 
  ShoppingCartOutlined, UserOutlined, FileSearchOutlined,
  ArrowUpOutlined, ArrowDownOutlined, CalculatorOutlined,
  HistoryOutlined, InboxOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { Area, Pie } from '@ant-design/charts';
import DataService from '../DataService';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/currencyFormatter';
import { db } from '../db';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const Reports = () => {
  const { token } = theme.useToken();
  const { profile } = useAuth();
  
  // States
  const [loading, setLoading] = useState(true);
  const [dates, setDates] = useState([dayjs().startOf('month'), dayjs().endOf('month')]);
  const [reportData, setReportData] = useState(null);
  const [salesHistory, setSalesHistory] = useState([]);
  const [inventoryValuation, setInventoryValuation] = useState([]);

  // --- PROFESSIONAL AUDIT LOGIC ---
  const loadAuditReports = useCallback(async () => {
    setLoading(true);
    try {
      const start = dates[0].toISOString();
      const end = dates[1].toISOString();

      // 1. Get Profit & Loss (Financial Audit)
      const summary = await DataService.getProfitLossSummary(start, end);
      
      // 2. Get All Sales for this period (Sales Journal)
      const allSales = await db.sales
        .where('created_at')
        .between(start, end)
        .reverse()
        .toArray();
      
      const customers = await db.customers.toArray();
      const custMap = {};
      customers.forEach(c => custMap[c.id] = c.name);

      const formattedSales = allSales.map(s => ({
        ...s,
        customer_name: custMap[s.customer_id] || 'Walk-in Customer',
        key: s.id
      }));

      // 3. Inventory Valuation (Category-wise)
      const { productsData } = await DataService.getInventoryData();
      const catValuation = {};
      productsData.forEach(p => {
        const cat = p.category_name || 'Uncategorized';
        const value = (p.quantity || 0) * (p.avg_purchase_price || 0);
        if (!catValuation[cat]) catValuation[cat] = 0;
        catValuation[cat] += value;
      });

      const valuationArray = Object.keys(catValuation).map(cat => ({
        category: cat,
        value: catValuation[cat]
      }));

      // 4. Charts Data
      const sChart = await DataService.getSalesChartData('custom', [start, end]);

      setReportData(summary);
      setSalesHistory(formattedSales);
      setInventoryValuation(valuationArray);
      setSalesChartData(sChart);

    } catch (error) {
      console.error("Audit Report Error:", error);
    } finally {
      setLoading(false);
    }
  }, [dates]);

  const [salesChartData, setSalesChartData] = useState([]);

  useEffect(() => {
    loadAuditReports();
  }, [loadAuditReports]);

  // Chart Configs
  const salesTrendConfig = {
    data: salesChartData,
    xField: 'date',
    yField: 'amount',
    smooth: true,
    areaStyle: { fill: `l(270) 0:#ffffff 0.5:${token.colorPrimary} 1:${token.colorPrimary}` },
    color: token.colorPrimary,
  };

  const valuationConfig = {
    data: inventoryValuation,
    angleField: 'value',
    colorField: 'category',
    radius: 0.7,
    label: { type: 'inner', offset: '-20%', content: '{percentage}' },
  };

  return (
    <div style={{ padding: '8px' }}>
      {/* PROFESSIONAL HEADER */}
      <Card style={{ marginBottom: 16, borderRadius: 8, border: `1px solid ${token.colorBorder}` }}>
        <Row gutter={[16, 16]} align="middle" justify="space-between">
          <Col>
            <Title level={2} style={{ margin: 0, color: token.colorPrimary }}>
              <FileSearchOutlined /> Audit & Analytics
            </Title>
            <Text type="secondary">Comprehensive business performance and financial auditing</Text>
          </Col>
          <Col>
            <Space wrap>
              <RangePicker 
                value={dates} 
                onChange={(val) => val && setDates(val)}
                format="DD MMM, YYYY"
                style={{ borderRadius: 6 }}
              />
              <Button type="primary" icon={<DownloadOutlined />} onClick={() => window.print()}>Export PDF</Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '100px' }}><Spin size="large" tip="Auditing Records..." /></div>
      ) : (
        <>
          {/* SECTION 1: FINANCIAL P&L SNAPSHOT */}
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col xs={24} md={6}>
              <Card bordered={false} style={{ background: token.colorFillAlter, borderLeft: `4px solid ${token.colorPrimary}` }}>
                <Statistic title="Total Revenue (Net)" value={reportData?.totalRevenue} prefix={<ShoppingCartOutlined />} formatter={(v) => formatCurrency(v, profile?.currency)} />
              </Card>
            </Col>
            <Col xs={24} md={6}>
              <Card bordered={false} style={{ background: token.colorFillAlter, borderLeft: `4px solid ${token.colorError}` }}>
                <Statistic title="Cost of Goods (COGS)" value={reportData?.totalCost} prefix={<InboxOutlined />} formatter={(v) => formatCurrency(v, profile?.currency)} />
              </Card>
            </Col>
            <Col xs={24} md={6}>
              <Card bordered={false} style={{ background: token.colorFillAlter, borderLeft: `4px solid ${token.colorWarning}` }}>
                <Statistic title="Gross Profit" value={reportData?.grossProfit} prefix={<CalculatorOutlined />} formatter={(v) => formatCurrency(v, profile?.currency)} />
              </Card>
            </Col>
            <Col xs={24} md={6}>
              <Card bordered={false} style={{ background: token.colorFillAlter, borderLeft: `4px solid ${token.colorSuccess}` }}>
                <Statistic title="Net Profit (Final)" value={reportData?.netProfit} valueStyle={{ color: token.colorSuccess }} prefix={<ArrowUpOutlined />} formatter={(v) => formatCurrency(v, profile?.currency)} />
              </Card>
            </Col>
          </Row>

          {/* SECTION 2: ANALYTICS CHARTS */}
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col xs={24} lg={16}>
              <Card title={<Space><HistoryOutlined /> Sales & Growth Trend</Space>} style={{ borderRadius: 8 }}>
                <Area {...salesTrendConfig} height={280} />
              </Card>
            </Col>
            <Col xs={24} lg={8}>
              <Card title={<Space><InboxOutlined /> Stock Valuation by Category</Space>} style={{ borderRadius: 8 }}>
                <Pie {...valuationConfig} height={280} />
              </Card>
            </Col>
          </Row>

          {/* SECTION 3: DETAILED AUDIT TABS */}
          <Card styles={{ body: { padding: '0px' } }} style={{ borderRadius: 8, overflow: 'hidden' }}>
            <Tabs 
              defaultActiveKey="1" 
              type="line"
              centered
              items={[
                {
                  key: '1',
                  label: <span style={{ padding: '0 20px' }}><ShoppingCartOutlined /> Sales Journal (Audit)</span>,
                  children: (
                    <Table 
                      dataSource={salesHistory}
                      size="small"
                      columns={[
                        { title: 'Date', dataIndex: 'created_at', render: (d) => dayjs(d).format('DD/MM/YY HH:mm') },
                        { title: 'Invoice ID', dataIndex: 'invoice_id', render: (id, record) => id || record.id.slice(0,8) },
                        { title: 'Customer', dataIndex: 'customer_name' },
                        { title: 'Method', dataIndex: 'payment_method', render: (m) => <Tag>{m}</Tag> },
                        { title: 'Total', dataIndex: 'total_amount', align: 'right', render: (v) => <Text strong>{formatCurrency(v, profile?.currency)}</Text> },
                        { title: 'Status', dataIndex: 'payment_status', render: (s) => <Tag color={s === 'paid' ? 'green' : 'red'}>{s?.toUpperCase()}</Tag> }
                      ]}
                      pagination={{ pageSize: 10 }}
                    />
                  )
                },
                {
                  key: '2',
                  label: <span style={{ padding: '0 20px' }}><InboxOutlined /> Inventory Valuation</span>,
                  children: (
                    <div style={{ padding: '20px' }}>
                      <Title level={4}>Detailed Stock Value</Title>
                      <List
                        grid={{ gutter: 16, column: 3 }}
                        dataSource={inventoryValuation}
                        renderItem={item => (
                          <List.Item>
                            <Card size="small" style={{ background: token.colorBgLayout }}>
                              <Statistic title={item.category} value={item.value} formatter={(v) => formatCurrency(v, profile?.currency)} />
                            </Card>
                          </List.Item>
                        )}
                      />
                    </div>
                  )
                },
                {
                  key: '3',
                  label: <span style={{ padding: '0 20px' }}><CalculatorOutlined /> Profit & Loss Statement</span>,
                  children: (
                    <div style={{ padding: '40px', maxWidth: '600px', margin: '0 auto' }}>
                      <div style={{ textAlign: 'center', marginBottom: 30 }}>
                        <Title level={3}>Profit & Loss Statement</Title>
                        <Text type="secondary">{dates[0].format('DD MMM YYYY')} - {dates[1].format('DD MMM YYYY')}</Text>
                      </div>
                      <Row justify="space-between"><Text size="large">Total Sales Revenue</Text><Text strong>{formatCurrency(reportData?.totalRevenue, profile?.currency)}</Text></Row>
                      <Divider style={{ margin: '12px 0' }} />
                      <Row justify="space-between"><Text type="secondary">Less: Cost of Goods Sold (COGS)</Text><Text type="danger">({formatCurrency(reportData?.totalCost, profile?.currency)})</Text></Row>
                      <Divider />
                      <Row justify="space-between"><Title level={4}>Gross Profit</Title><Title level={4}>{formatCurrency(reportData?.grossProfit, profile?.currency)}</Title></Row>
                      <Row justify="space-between"><Text type="secondary">Less: Operating Expenses</Text><Text type="danger">({formatCurrency(reportData?.totalExpenses, profile?.currency)})</Text></Row>
                      <Divider style={{ borderWidth: 2 }} />
                      <Row justify="space-between"><Title level={3} style={{ color: token.colorSuccess }}>Net Profit</Title><Title level={3} style={{ color: token.colorSuccess }}>{formatCurrency(reportData?.netProfit, profile?.currency)}</Title></Row>
                    </div>
                  )
                }
              ]}
            />
          </Card>
        </>
      )}
    </div>
  );
};

export default Reports;