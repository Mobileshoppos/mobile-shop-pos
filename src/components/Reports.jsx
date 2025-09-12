// src/components/Reports.jsx (Mukammal naya aur theek kiya hua code)

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
  
  const [summaryData, setSummaryData] = useState({
    totalRevenue: 0,
    totalCost: 0,
    grossProfit: 0,
    totalExpenses: 0,
    netProfit: 0,
  });
  const [summaryLoading, setSummaryLoading] = useState(true);

  useEffect(() => {
    if (user) {
      const getStockData = async () => {
        try {
          setStockLoading(true);
          // --- SAHI TABDEELI YAHAN HAI ---
          // Hum ab purane view ke bajaye naye, mehfooz 'products_display_view' ka istemal kar rahe hain.
          let { data, error } = await supabase
            .from('products_display_view')
            .select('*')
            .order('name', { ascending: true });

          if (error) throw error;
          setProducts(data);
        } catch (error) {
          message.error('Error fetching stock data: ' + error.message);
        } finally {
          setStockLoading(false);
        }
      };

      const getSummaryData = async () => {
        try {
          setSummaryLoading(true);
          // --- SECURITY FIX: Har query mein user_id ki shart lagayi gayi hai ---
          let { data: salesData, error: salesError } = await supabase.from('sales').select('total_amount').eq('user_id', user.id);
          if (salesError) throw salesError;
          const totalRevenue = salesData.reduce((sum, sale) => sum + (sale.total_amount || 0), 0);
          
          let { data: saleItems, error: itemsError } = await supabase.from('sale_items').select('quantity, products(purchase_price)').eq('user_id', user.id);
          if (itemsError) throw itemsError;
          let totalCost = 0;
          for (const item of saleItems) {
            if (item.products) {
              totalCost += item.quantity * (item.products.purchase_price || 0);
            }
          }
          
          let { data: expensesData, error: expensesError } = await supabase.from('expenses').select('amount').eq('user_id', user.id);
          if (expensesError) throw expensesError;
          const totalExpenses = expensesData.reduce((sum, expense) => sum + (expense.amount || 0), 0);

          const grossProfit = totalRevenue - totalCost;
          const netProfit = grossProfit - totalExpenses;
          
          setSummaryData({ totalRevenue, totalCost, grossProfit, totalExpenses, netProfit });

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
    { title: 'Purchase Price', dataIndex: 'default_purchase_price', key: 'purchase_price', align: 'right', render: (price) => `Rs. ${price ? price.toFixed(2) : '0.00'}` },
    { title: 'Total Value', key: 'total_value', align: 'right', render: (text, record) => { const totalValue = (record.quantity || 0) * (record.default_purchase_price || 0); return <Text strong>Rs. {totalValue.toFixed(2)}</Text>; }}
  ];

  const totalStockValue = products.reduce((sum, product) => sum + ((product.quantity || 0) * (product.default_purchase_price || 0)), 0);

  return (
    <>
      <Title level={2} style={{ marginBottom: '24px' }}>Reports</Title>
      
      <Card style={{ marginBottom: '24px' }}>
        <Title level={4}>Profit & Loss Summary</Title>
        {summaryLoading ? <div style={{ textAlign: 'center', padding: '48px' }}><Spin size="large" /></div> : (
          <Row gutter={[16, 24]}>
            <Col xs={24} sm={12} md={6}><Statistic title="Total Revenue (Aamdani)" value={summaryData.totalRevenue} precision={2} prefix="Rs." /></Col>
            <Col xs={24} sm={12} md={6}><Statistic title="Cost of Goods (Laagat)" value={summaryData.totalCost} precision={2} prefix="Rs." /></Col>
            <Col xs={24} sm={12} md={6}><Statistic title="Gross Profit (Aamdani - Laagat)" value={summaryData.grossProfit} precision={2} prefix="Rs." /></Col>
            <Col xs={24} sm={12} md={6}><Statistic title="Total Expenses (Kul Akhrajaat)" value={summaryData.totalExpenses} precision={2} prefix="Rs." valueStyle={{ color: '#cf1322' }} /></Col>
            
            <Col xs={24}>
              <Card>
                <Statistic 
                  title={<Title level={4}>Net Profit (Asal Munafa)</Title>} 
                  value={summaryData.netProfit} 
                  precision={2} 
                  prefix="Rs. " 
                  valueStyle={{ 
                    color: summaryData.netProfit >= 0 ? '#3f8600' : '#cf1322', 
                    fontSize: '2.5rem' 
                  }} 
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