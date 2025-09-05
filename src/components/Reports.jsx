import React, { useState, useEffect } from 'react';
import { Typography, Table, Card, App as AntApp, Row, Col, Statistic, Spin } from 'antd';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';

const { Title, Text } = Typography;

const Reports = () => {
  const { message } = AntApp.useApp();
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [stockLoading, setStockLoading] = useState(true);
  
  // Hum ne is state ko update kiya hai
  const [summaryData, setSummaryData] = useState({
    totalRevenue: 0,
    totalCost: 0,
    grossProfit: 0,
    totalExpenses: 0, // Nayi state
    netProfit: 0,      // Nayi state
  });
  const [summaryLoading, setSummaryLoading] = useState(true);

  useEffect(() => {
    if (user) {
      const getStockData = async () => {
        try {
          setStockLoading(true);
          let { data, error } = await supabase.from('products').select('*').order('name', { ascending: true });
          if (error) throw error;
          setProducts(data);
        } catch (error) {
          message.error('Error fetching stock data: ' + error.message);
        } finally {
          setStockLoading(false);
        }
      };

      // Yeh function P&L ka saara data fetch karega
      const getSummaryData = async () => {
        try {
          setSummaryLoading(true);
          
          // 1. Total Revenue (Aamdani) fetch karein
          let { data: salesData, error: salesError } = await supabase.from('sales').select('total_amount');
          if (salesError) throw salesError;
          const totalRevenue = salesData.reduce((sum, sale) => sum + (sale.total_amount || 0), 0);

          // 2. Total Cost of Goods (Laagat) fetch karein
          let { data: saleItems, error: itemsError } = await supabase.from('sale_items').select('quantity, products(purchase_price)');
          if (itemsError) throw itemsError;
          let totalCost = 0;
          for (const item of saleItems) {
            if (item.products) {
              totalCost += item.quantity * item.products.purchase_price;
            }
          }
          
          // 3. NAYA STEP: Total Expenses (Akhrajaat) fetch karein
          let { data: expensesData, error: expensesError } = await supabase.from('expenses').select('amount');
          if (expensesError) throw expensesError;
          const totalExpenses = expensesData.reduce((sum, expense) => sum + (expense.amount || 0), 0);

          // 4. Sab kuch calculate karein
          const grossProfit = totalRevenue - totalCost;
          const netProfit = grossProfit - totalExpenses;
          
          setSummaryData({
            totalRevenue,
            totalCost,
            grossProfit,
            totalExpenses,
            netProfit,
          });

        } catch (error) {
          message.error('Error fetching summary data: ' + error.message);
        } finally {
          setSummaryLoading(false);
        }
      };

      getStockData();
      getSummaryData();
    }
  }, [user, message]);

  const stockColumns = [
    { title: 'Product Name', dataIndex: 'name', key: 'name' },
    { title: 'Brand', dataIndex: 'brand', key: 'brand' },
    { title: 'Stock Quantity', dataIndex: 'quantity', key: 'quantity', align: 'right' },
    { title: 'Purchase Price', dataIndex: 'purchase_price', key: 'purchase_price', align: 'right', render: (price) => `Rs. ${price ? price.toFixed(2) : '0.00'}` },
    { title: 'Total Value', key: 'total_value', align: 'right', render: (text, record) => { const totalValue = record.quantity * record.purchase_price; return <Text strong>Rs. {totalValue ? totalValue.toFixed(2) : '0.00'}</Text>; }}
  ];

  const totalStockValue = products.reduce((sum, product) => sum + (product.quantity * product.purchase_price), 0);

  return (
    <>
      <Title level={2} style={{ color: 'white', marginBottom: '24px' }}>Reports</Title>
      
      <Card style={{ marginBottom: '24px' }}>
        <Title level={4}>Profit & Loss Summary</Title>
        {summaryLoading ? <div style={{ textAlign: 'center', padding: '48px' }}><Spin size="large" /></div> : (
          <Row gutter={[16, 24]}>
            <Col xs={24} sm={12} md={6}>
              <Statistic title="Total Revenue (Aamdani)" value={summaryData.totalRevenue} precision={2} prefix="Rs." />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Statistic title="Cost of Goods (Laagat)" value={summaryData.totalCost} precision={2} prefix="Rs." />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Statistic title="Gross Profit (Aamdani - Laagat)" value={summaryData.grossProfit} precision={2} prefix="Rs." />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Statistic title="Total Expenses (Kul Akhrajaat)" value={summaryData.totalExpenses} precision={2} prefix="Rs." valueStyle={{ color: '#cf1322' }} />
            </Col>
            <Col xs={24}>
              <Card style={{ background: '#2c2c2c' }}>
                <Statistic 
                  title={<Title level={4}>Net Profit (Asal Munafa)</Title>} 
                  value={summaryData.netProfit} 
                  precision={2} 
                  prefix="Rs. " 
                  valueStyle={{ color: summaryData.netProfit >= 0 ? '#3f8600' : '#cf1322', fontSize: '2.5rem' }} 
                />
              </Card>
            </Col>
          </Row>
        )}
      </Card>

      <Card>
        <Title level={4}>Current Stock Report</Title>
        <Table columns={stockColumns} dataSource={products} loading={stockLoading} rowKey="id" pagination={false} scroll={{ y: '40vh' }} summary={() => (<Table.Summary.Row><Table.Summary.Cell index={0} colSpan={4}><Text strong style={{ float: 'right' }}>Grand Total Stock Value</Text></Table.Summary.Cell><Table.Summary.Cell index={1} align="right"><Title level={5}>Rs. {totalStockValue.toFixed(2)}</Title></Table.Summary.Cell></Table.Summary.Row>)} />
      </Card>
    </>
  );
};

export default Reports;