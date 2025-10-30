import React, { useState, useEffect } from 'react';
import { Typography, Table, Card, App as AntApp, Row, Col, Statistic, Spin, DatePicker, Space, Button } from 'antd';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/currencyFormatter';
import DataService from '../DataService';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const Reports = () => {
  const { message } = AntApp.useApp();
  const { user, profile } = useAuth();
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
  const [payableData, setPayableData] = useState([]);
  const [payableLoading, setPayableLoading] = useState(true);
  const [supplierReportData, setSupplierReportData] = useState([]);
  const [supplierReportLoading, setSupplierReportLoading] = useState(false);
  const [dateRange, setDateRange] = useState([dayjs().subtract(30, 'day'), dayjs()]);

  useEffect(() => {
    if (user) {
      const getStockData = async () => {
        try {
          setStockLoading(true);
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
      getPayableData();
    }
  }, [user, message, dateRange]);

  const getPayableData = async () => {
        try {
          setPayableLoading(true);
          const data = await DataService.getAccountsPayable();
          setPayableData(data || []);
        } catch (error) {
          message.error('Error fetching accounts payable: ' + error.message);
        } finally {
          setPayableLoading(false);
        }
      };

  const getSupplierReportData = async () => {
    if (!dateRange || dateRange.length !== 2) {
      message.warning('Please select a valid date range.');
      return;
    }
    try {
      setSupplierReportLoading(true);
      const startDate = dateRange[0].format('YYYY-MM-DD');
      const endDate = dateRange[1].format('YYYY-MM-DD');
      const data = await DataService.getSupplierPurchaseReport(startDate, endDate);
      setSupplierReportData(data || []);
    } catch (error) {
      message.error('Error fetching supplier purchase report: ' + error.message);
    } finally {
      setSupplierReportLoading(false);
    }
  };

  const stockColumns = [
    { title: 'Product Name', dataIndex: 'name', key: 'name' },
    { title: 'Brand', dataIndex: 'brand', key: 'brand' },
    { title: 'Stock Quantity', dataIndex: 'quantity', key: 'quantity', align: 'right' },
    { title: 'Purchase Price', dataIndex: 'default_purchase_price', key: 'purchase_price', align: 'right', render: (price) => formatCurrency(price, profile?.currency) },
    { title: 'Total Value', key: 'total_value', align: 'right', render: (text, record) => { const totalValue = (record.quantity || 0) * (record.default_purchase_price || 0); return <Text strong>{formatCurrency(totalValue, profile?.currency)}</Text>; }}
  ];

  const totalStockValue = products.reduce((sum, product) => sum + ((product.quantity || 0) * (product.default_purchase_price || 0)), 0);

  return (
    <>
      <Title level={2} style={{ marginBottom: '24px' }}>Reports</Title>
      
      <Card style={{ marginBottom: '24px' }}>
        <Title level={4}>Profit & Loss Summary</Title>
        {summaryLoading ? <div style={{ textAlign: 'center', padding: '48px' }}><Spin size="large" /></div> : (
          <Row gutter={[16, 24]}>
            <Col xs={24} sm={12} md={6}><Statistic title="Total Revenue (Aamdani)" value={summaryData.totalRevenue} formatter={() => formatCurrency(summaryData.totalRevenue, profile?.currency)} /></Col>
            <Col xs={24} sm={12} md={6}><Statistic title="Cost of Goods (Laagat)" value={summaryData.totalCost} formatter={() => formatCurrency(summaryData.totalCost, profile?.currency)} /></Col>
            <Col xs={24} sm={12} md={6}><Statistic title="Gross Profit (Aamdani - Laagat)" value={summaryData.grossProfit} formatter={() => formatCurrency(summaryData.grossProfit, profile?.currency)} /></Col>
            <Col xs={24} sm={12} md={6}><Statistic title="Total Expenses (Kul Akhrajaat)" value={summaryData.totalExpenses} valueStyle={{ color: '#cf1322' }} formatter={() => formatCurrency(summaryData.totalExpenses, profile?.currency)} /></Col>
            
            <Col xs={24}>
              <Card>
                <Statistic title={<Title level={4}>Net Profit (Asal Munafa)</Title>} value={summaryData.netProfit} formatter={() => formatCurrency(summaryData.netProfit, profile?.currency)} 
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
        <Table columns={stockColumns} dataSource={products} loading={stockLoading} rowKey="id" pagination={false} scroll={{ y: '40vh' }} summary={() => (<Table.Summary.Row><Table.Summary.Cell index={0} colSpan={4}><Text strong style={{ float: 'right' }}>Grand Total Stock Value</Text></Table.Summary.Cell><Table.Summary.Cell index={1} align="right"><Title level={5}>{formatCurrency(totalStockValue, profile?.currency)}</Title></Table.Summary.Cell></Table.Summary.Row>)} />
      </Card>

      <Card style={{ marginTop: '24px' }}>
        <Title level={4}>Accounts Payable (Suppliers ko Baqaya Jaat)</Title>
        <Table
          columns={[
            { title: 'Supplier Name', dataIndex: 'name', key: 'name' },
            { title: 'Contact Person', dataIndex: 'contact_person', key: 'contact_person' },
            { title: 'Phone', dataIndex: 'phone', key: 'phone' },
            {
              title: 'Balance Due',
              dataIndex: 'balance_due',
              key: 'balance_due',
              align: 'right',
              render: (amount) => ( <Text type="danger" strong>{formatCurrency(amount, profile?.currency)}</Text> ),
            },
          ]}
          dataSource={payableData}
          loading={payableLoading}
          rowKey="name"
          pagination={false}
          summary={(data) => {
            const totalPayable = data.reduce((sum, item) => sum + item.balance_due, 0);
            return (
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={3}>
                  <Text strong style={{ float: 'right' }}>
                    Total Amount Payable
                  </Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={1} align="right">
                  <Title level={5} type="danger">{formatCurrency(totalPayable, profile?.currency)}</Title>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            );
          }}
        />
      </Card>

      <Card style={{ marginTop: '24px' }}>
        <Title level={4}>Supplier Wise Purchase Report</Title>
        <Space style={{ marginBottom: '16px' }}>
          <DatePicker.RangePicker
            value={dateRange}
            onChange={setDateRange}
          />
          <Button type="primary" onClick={getSupplierReportData} loading={supplierReportLoading}>
            Generate Report
          </Button>
        </Space>
        <Table
          columns={[
            { title: 'Supplier Name', dataIndex: 'supplier_name', key: 'supplier_name' },
            { title: 'Total Purchases', dataIndex: 'purchase_count', key: 'purchase_count', align: 'right' },
            {
              title: 'Total Amount',
              dataIndex: 'total_purchase_amount',
              key: 'total_purchase_amount',
              align: 'right',
              render: (amount) => ( <Text strong>{formatCurrency(amount, profile?.currency)}</Text> ),
            },
          ]}
          dataSource={supplierReportData}
          loading={supplierReportLoading}
          rowKey="supplier_name"
          pagination={false}
        />
      </Card>
    </>
  );
};

export default Reports;