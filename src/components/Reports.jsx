import React, { useState, useEffect } from 'react';
import { Typography, Table, Card, App as AntApp, Row, Col, Statistic, Spin, DatePicker, Space, Button, Tooltip } from 'antd';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/currencyFormatter';
import DataService from '../DataService';
import dayjs from 'dayjs';
import { QuestionCircleOutlined } from '@ant-design/icons';
import { Line, Pie } from '@ant-design/charts';

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
  const [chartData, setChartData] = useState([]);
  const [expenseChartData, setExpenseChartData] = useState([]);

  // === NAYA EFFECT #1: Sirf ek baar chalta hai, un reports ke liye jin par date ka asar nahi hota ===
  useEffect(() => {
    const getStaticReports = async () => {
      // Stock Data fetch karna
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

      // Accounts Payable fetch karna
      getPayableData();
    };
    
    if (user) {
      getStaticReports();
    }
  }, [user, message]); // Yeh sirf user change hone par chalega

  // === NAYA EFFECT #2: Sirf date range tabdeel hone par chalta hai ===
  useEffect(() => {
    const getDatedReports = async () => {
      if (!dateRange || dateRange.length !== 2) return;
      
      const startDate = dateRange[0].startOf('day').toISOString();
      const endDate = dateRange[1].endOf('day').toISOString();

      // Summary, Charts, aur Supplier data fetch karna
      getSummaryData(startDate, endDate);
      getSupplierReportData(); // Iske andar pehle se hi dateRange istemal ho raha hai
      getChartData(startDate, endDate);
      getExpenseChartData(startDate, endDate);
    };

    if (user) {
      getDatedReports();
    }
  }, [dateRange, user, message]); // Yeh sirf dateRange ya user change hone par chalega

  const getSummaryData = async (startDate, endDate) => {
    try {
      setSummaryLoading(true);
      let { data: salesData, error: salesError } = await supabase.from('sales').select('total_amount').eq('user_id', user.id).gte('created_at', startDate).lte('created_at', endDate);
      if (salesError) throw salesError;
      const totalRevenue = salesData.reduce((sum, sale) => sum + (sale.total_amount || 0), 0);
      
      let { data: saleItems, error: itemsError } = await supabase.from('sale_items').select('quantity, inventory(purchase_price)').eq('user_id', user.id).gte('created_at', startDate).lte('created_at', endDate);
      if (itemsError) throw itemsError;
      let totalCost = 0;
      for (const item of saleItems) {
        if (item.inventory) {
          totalCost += item.quantity * (item.inventory.purchase_price || 0);
        }
      }
      
      let { data: expensesData, error: expensesError } = await supabase.from('expenses').select('amount').eq('user_id', user.id).gte('expense_date', startDate).lte('expense_date', endDate);
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

  const getChartData = async (startDate, endDate) => {
    try {
      let { data, error } = await supabase.rpc('get_daily_profit_summary', {
        start_date: startDate,
        end_date: endDate,
      });

      if (error) throw error;
      
      // Data ko chart ke format mein transform karna
      const formattedData = data.flatMap(d => [
        { date: dayjs(d.report_date).format('MMM D'), value: d.total_revenue, category: 'Revenue' },
        { date: dayjs(d.report_date).format('MMM D'), value: d.net_profit, category: 'Net Profit' }
      ]);
      
      setChartData(formattedData);

    } catch (error) {
      message.error('Error fetching chart data: ' + error.message);
    }
  };

  const getExpenseChartData = async (startDate, endDate) => {
    try {
      let { data, error } = await supabase.rpc('get_expense_summary_by_category', {
        start_date: startDate,
        end_date: endDate,
      });

      if (error) throw error;
      setExpenseChartData(data);

    } catch (error) {
      message.error('Error fetching expense chart data: ' + error.message);
    }
  };

  const stockColumns = [
    { title: 'Product Name', dataIndex: 'name', key: 'name', width: 200 },
    { title: 'Brand', dataIndex: 'brand', key: 'brand', width: 150 },
    { title: 'Stock Quantity', dataIndex: 'quantity', key: 'quantity', align: 'right', width: 120 },
    { title: 'Purchase Price', dataIndex: 'avg_purchase_price', key: 'purchase_price', align: 'right', render: (price) => formatCurrency(price, profile?.currency), width: 150 },
    { title: 'Total Value', key: 'total_value', align: 'right', render: (text, record) => { const totalValue = (record.quantity || 0) * (record.avg_purchase_price || 0); return <Text strong>{formatCurrency(totalValue, profile?.currency)}</Text>; }, width: 150 }
  ];

  const totalStockValue = products.reduce((sum, product) => sum + ((product.quantity || 0) * (product.avg_purchase_price || 0)), 0);

  return (
    <>
      <Title level={2} style={{ marginBottom: '24px' }}>Reports</Title>
      <Space style={{ marginBottom: '16px' }}>
          <DatePicker.RangePicker
            value={dateRange}
            onChange={setDateRange}
          />
        </Space>
      
      <Card style={{ marginBottom: '24px' }}>
        <Title level={4}>Profit & Loss Summary</Title>
        {summaryLoading ? <div style={{ textAlign: 'center', padding: '48px' }}><Spin size="large" /></div> : (
          <>
          <Row gutter={[16, 24]}>
            <Col xs={24} sm={12} md={6}>
              <Statistic 
                title={<>Total Revenue <Tooltip title="Total income from sales before any costs are deducted."><QuestionCircleOutlined /></Tooltip></>} 
                value={summaryData.totalRevenue} 
                formatter={() => formatCurrency(summaryData.totalRevenue, profile?.currency)} 
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Statistic 
                title={<>Cost of Goods <Tooltip title="The direct cost of the products that were sold in the selected period."><QuestionCircleOutlined /></Tooltip></>} 
                value={summaryData.totalCost} 
                formatter={() => formatCurrency(summaryData.totalCost, profile?.currency)} 
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Statistic 
                title={<>Gross Profit <Tooltip title="The profit after deducting the cost of goods. (Revenue - Cost of Goods)"><QuestionCircleOutlined /></Tooltip></>} 
                value={summaryData.grossProfit} 
                formatter={() => formatCurrency(summaryData.grossProfit, profile?.currency)} 
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Statistic 
                title={<>Total Expenses <Tooltip title="All other business expenses recorded in the selected period (e.g., rent, bills)."><QuestionCircleOutlined /></Tooltip></>} 
                value={summaryData.totalExpenses} 
                valueStyle={{ color: '#cf1322' }} 
                formatter={() => formatCurrency(summaryData.totalExpenses, profile?.currency)} 
              />
              {expenseChartData.length > 0 && (
                // --- YEH NAYA CONTAINER HAI ---
                <div style={{ position: 'relative', height: 150, marginTop: '16px' }}>
                  <Pie
                    data={expenseChartData}
                    angleField='amount'
                    colorField='category'
                    radius={0.9}
                    innerRadius={0.7}
                    label={false}
                    legend={false}
                    height={150}
                    // Humne yahan se statistic prop mukammal tor par hata diya hai
                    tooltip={{
                      formatter: (datum) => {
                        // 'datum' chart ki slice ka data object hai
                        const categoryName = datum.category;
                        const amountValue = datum.amount;
                        const formattedValue = formatCurrency(amountValue, profile?.currency);
                        
                        // Hum library ko batate hain ke naam kya dikhana hai aur value kya
                        return { name: categoryName, value: formattedValue };
                      },
                    }}
                  />
                  {/* --- YEH TEXT WALA NAYA DIV HAI --- */}
                  <div 
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: '12px', color: '#8c8c8c' }}>Total</div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
                      {formatCurrency(summaryData.totalExpenses, profile?.currency)}
                    </div>
                  </div>
                </div>
              )}
            </Col>
            
            <Col xs={24}>
              <Card>
                <Statistic 
                  title={<Title level={4}>Net Profit <Tooltip title="The final 'take-home' profit after all costs and expenses are deducted. (Gross Profit - Total Expenses)"><QuestionCircleOutlined /></Tooltip></Title>} 
                  value={summaryData.netProfit} 
                  formatter={() => formatCurrency(summaryData.netProfit, profile?.currency)} 
                  valueStyle={{ color: summaryData.netProfit >= 0 ? '#3f8600' : '#cf1322', fontSize: '2.5rem' }} 
                />
              </Card>
            </Col>
          </Row>
          <Line
            data={chartData}
            xField="date"
            yField="value"
            seriesField="category"
            yAxis={{
              label: {
                formatter: (v) => `${profile?.currency || '$'}${v}`,
              },
            }}
            legend={{ position: 'top' }}
            smooth={true}
            height={250}
            style={{ marginTop: '24px' }}
          />
          </>
        )}
      </Card>

      <Card>
        <Title level={4}>Current Stock Report</Title>
        <Table columns={stockColumns} dataSource={products} loading={stockLoading} rowKey="id" pagination={false} scroll={{ y: '40vh', x: 'max-content' }} summary={() => (<Table.Summary.Row><Table.Summary.Cell index={0} colSpan={4}><Text strong style={{ float: 'right' }}>Grand Total Stock Value</Text></Table.Summary.Cell><Table.Summary.Cell index={1} align="right"><Title level={5}>{formatCurrency(totalStockValue, profile?.currency)}</Title></Table.Summary.Cell></Table.Summary.Row>)} />
      </Card>

      <Card style={{ marginTop: '24px' }}>
        <Title level={4}>
          Accounts Payable <Tooltip title="The total amount of money you currently owe to all your suppliers."><QuestionCircleOutlined /></Tooltip>
        </Title>
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