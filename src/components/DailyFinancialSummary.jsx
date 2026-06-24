import React, { useState, useEffect, useCallback } from 'react';
import { Card, Table, Typography, Spin, ConfigProvider, theme, Modal, Tag, Button, Space, App, Form, Radio, Checkbox, Row, Col, DatePicker, Select } from 'antd'; // <--- UPDATED (Select Added)
import { PrinterOutlined, FileExcelOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import DataService from '../DataService';
import DataExport from './DataExport'; // <--- NAYA IZAFA: Smart Export System
import VoucherSearchModal from './VoucherSearchModal'; // <--- NAYA IZAFA
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/currencyFormatter';
import dayjs from 'dayjs';

const { Text, Title } = Typography;

const DailyFinancialSummary = ({ timeRange, customDates }) => {
  const { token } = theme.useToken();
  const { profile } = useAuth();
  const { message } = App.useApp();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Pop-up (Modal) ke states
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalData, setModalData] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalTitle, setModalTitle] = useState('');

  // --- NAYA IZAFA: Voucher Search Modal States ---
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const [voucherToSearch, setVoucherToSearch] = useState('');

  // --- NAYA IZAFA: Export Wizard States ---
  const [isExportWizardOpen, setIsExportWizardOpen] = useState(false);
  const [exportDateRangeType, setExportDateRangeType] = useState('current');
  const [exportCustomDates, setExportCustomDates] = useState([]);
  const [selectedColumns, setSelectedColumns] = useState(['sale', 'purchase', 'receipt', 'payment', 'net']); // <--- NAYA IZAFA: 'net' added
  const [exportData, setExportData] = useState([]);
  const [exportLoading, setExportLoading] = useState(false);

  // Jab user wizard mein date badle to back-end se data on-the-fly fetch ho
  const handleExportRangeChange = async (type, dates) => {
    setExportLoading(true);
    try {
      let targetRange = timeRange;
      let targetDates = customDates;
      
      if (type === 'today') {
        targetRange = 'today';
        targetDates = [];
      } else if (type === 'yesterday') {
        targetRange = 'custom';
        const yesterdayStr = dayjs().subtract(1, 'day').startOf('day').toISOString();
        const yesterdayEndStr = dayjs().subtract(1, 'day').endOf('day').toISOString();
        targetDates = [yesterdayStr, yesterdayEndStr];
      } else if (type === 'week') {
        targetRange = 'week';
        targetDates = [];
      } else if (type === 'month') {
        targetRange = 'month';
        targetDates = [];
      } else if (type === 'year') {
        // Year ke liye smart range: 1st Jan se aaj ke din tak
        targetRange = 'custom';
        const startOfYear = dayjs().startOf('year').toISOString();
        const endOfToday = dayjs().endOf('day').toISOString();
        targetDates = [startOfYear, endOfToday];
      } else if (type === 'custom' && dates && dates.length === 2) {
        targetRange = 'custom';
        targetDates = [dates[0].toISOString(), dates[1].toISOString()];
      } else if (type === 'current') {
        targetRange = timeRange;
        targetDates = customDates;
      }
      
      const summaryData = await DataService.getDailyFinancialSummary(targetRange, targetDates);
      setExportData(summaryData);
    } catch (error) {
      console.error("Export range fetch error:", error);
    } finally {
      setExportLoading(false);
    }
  };

  // Checkboxes ke mutabiq dynamic columns banana
  const dynamicExportColumns = [
    { title: 'Date', dataIndex: 'formattedDate' },
    ...(selectedColumns.includes('sale') ? [{ title: 'Daily Sale', dataIndex: 'sale' }] : []),
    ...(selectedColumns.includes('purchase') ? [{ title: 'Daily Purchase', dataIndex: 'purchase' }] : []),
    ...(selectedColumns.includes('receipt') ? [{ title: 'Daily Receipt', dataIndex: 'receipt' }] : []),
    ...(selectedColumns.includes('payment') ? [{ title: 'Daily Payment', dataIndex: 'payment' }] : []),
    ...(selectedColumns.includes('net') ? [{ title: 'Daily Net', dataIndex: 'net_flow' }] : []), // <--- NAYA IZAFA: 'net' is now conditionally exported
  ];

  const loadData = useCallback(async () => {
    if (data.length === 0) setLoading(true);
    try {
      // FIX: Dashboard ke top filter se aazaad kar ke hamesha pichle 7 din ('last_7_days') ka data load karein
      const summaryData = await DataService.getDailyFinancialSummary('last_7_days');
      setData(summaryData);
    } catch (error) {
      console.error("Error loading daily financial summary:", error);
    } finally {
      setLoading(false);
    }
  }, [data.length]);

  useEffect(() => {
    loadData();
    const handleRefresh = () => loadData();
    window.addEventListener('local-db-updated', handleRefresh);
    return () => window.removeEventListener('local-db-updated', handleRefresh);
  }, [loadData]);

  const handleCellClick = async (dateStr, type) => {
    setIsModalVisible(true);
    setModalLoading(true);
    
    const formattedDate = dayjs(dateStr).format('DD-MMM-YYYY');
    const typeNames = { sale: 'Daily Sale', purchase: 'Daily Purchase', receipt: 'Daily Receipt', payment: 'Daily Payment' };
    setModalTitle(`${typeNames[type]} Breakdown - ${formattedDate}`);

    try {
      const details = await DataService.getDrillDownData(dateStr, type);
      setModalData(details);
    } catch (error) {
      console.error("Error loading drill down data:", error);
    } finally {
      setModalLoading(false);
    }
  };

  // --- NAYA IZAFA: Smart Export Columns ---
  const summaryExportColumns = [
    { title: 'Date', dataIndex: 'formattedDate' },
    { title: 'Daily Sale', dataIndex: 'sale' },
    { title: 'Daily Purchase', dataIndex: 'purchase' },
    { title: 'Daily Receipt', dataIndex: 'receipt' },
    { title: 'Daily Payment', dataIndex: 'payment' }
  ];

  const modalExportColumns = [
    { title: 'Ref No.', dataIndex: 'ref_no' },
    { title: 'Party / Category', dataIndex: 'party_name' },
    { title: 'Description', dataIndex: 'description' },
    { title: 'Mode', dataIndex: 'payment_mode' },
    { title: 'Amount', dataIndex: 'amount' }
  ];

  const columns = [
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: (text) => <Text strong>{dayjs(text).format('DD-MMM-YYYY')}</Text>,
    },
    {
      title: 'Daily Sale',
      dataIndex: 'sale',
      key: 'sale',
      align: 'right',
      render: (val, record) => (
        <a onClick={() => handleCellClick(record.date, 'sale')} style={{ fontWeight: val > 0 ? 'bold' : 'normal' }}>
          {formatCurrency(val, profile?.currency)}
        </a>
      ),
    },
    {
      title: 'Daily Purchase',
      dataIndex: 'purchase',
      key: 'purchase',
      align: 'right',
      render: (val, record) => (
        <a onClick={() => handleCellClick(record.date, 'purchase')} style={{ fontWeight: val > 0 ? 'bold' : 'normal' }}>
          {formatCurrency(val, profile?.currency)}
        </a>
      ),
    },
    {
      title: 'Daily Receipt',
      dataIndex: 'receipt',
      key: 'receipt',
      align: 'right',
      render: (val, record) => (
        <a onClick={() => handleCellClick(record.date, 'receipt')} style={{ fontWeight: val > 0 ? 'bold' : 'normal' }}>
          {formatCurrency(val, profile?.currency)}
        </a>
      ),
    },
    {
      title: 'Daily Payment',
      dataIndex: 'payment',
      key: 'payment',
      align: 'right',
      render: (val, record) => (
        <a onClick={() => handleCellClick(record.date, 'payment')} style={{ fontWeight: val > 0 ? 'bold' : 'normal' }}>
          {formatCurrency(val, profile?.currency)}
        </a>
      ),
    },
    {
      title: 'Daily Net',
      key: 'net_balance',
      align: 'right',
      render: (_, record) => {
        const net = (record.receipt || 0) - (record.payment || 0);
        return (
          <Text strong style={{ color: net >= 0 ? token.colorSuccess : token.colorError }}>
            {net >= 0 ? '+' : ''}{formatCurrency(net, profile?.currency)}
          </Text>
        );
      }
    },
  ];

  const modalColumns = [
    { 
      title: 'Ref No.', 
      dataIndex: 'ref_no', 
      key: 'ref_no', 
      width: 130, // FIX: Width set ki
      render: (text) => (
        <Text 
          code 
          style={{ color: token.colorPrimary, cursor: 'pointer' }}
          onClick={() => {
            setVoucherToSearch(text);
            setIsVoucherModalOpen(true);
          }}
        >
          {text}
        </Text>
      )
    },
    { title: 'Party / Category', dataIndex: 'party_name', key: 'party_name', width: 180, render: (text) => <Text strong>{text}</Text> }, // FIX: Width set ki
    { 
      title: 'Description', 
      dataIndex: 'description', 
      key: 'description', 
      width: 200, // FIX: Width set ki
      render: (text) => <Tag color="blue">{text}</Tag> 
    },
    { 
      title: 'Mode', 
      dataIndex: 'payment_mode', 
      key: 'payment_mode', 
      width: 100, // FIX: Width set ki
      render: (text) => text ? (
        <Tag color={text === 'Cash' ? 'green' : 'cyan'}>
          {text}
        </Tag>
      ) : '-'
    },
    { title: 'Amount', dataIndex: 'amount', key: 'amount', align: 'right', width: 140, render: (val) => <Text strong>{formatCurrency(val, profile?.currency)}</Text> }, // FIX: Width set ki
  ];

  const reportCardStyle = {
    borderRadius: 8,
    border: `1px solid ${token.colorPrimary}33`, 
    boxShadow: `0 4px 12px ${token.colorPrimary}15`, 
    transition: 'all 0.3s ease',
    backgroundColor: token.colorCardBg || token.colorBgContainer
  };

  return (
    <ConfigProvider theme={{ components: { Table: { colorBgContainer: token.colorTableBg, headerBg: token.colorTableHeaderBg } } }}>
      <Card 
        title={<Text strong style={{ fontSize: '16px' }}>Daily Financial Summary (Day Book)</Text>} 
        extra={
          <Button 
            type="primary" 
            ghost 
            size="small" 
            icon={<FileExcelOutlined />} 
            onClick={() => {
              setIsExportWizardOpen(true);
              setExportData(data); // Shuruat mein current loaded data select ho
            }}
          >
            Export Options
          </Button>
        }
        style={{ ...reportCardStyle, marginTop: 16 }}
        styles={{ body: { padding: 0 } }}
      >
        {loading && data.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px' }}><Spin /></div>
        ) : (
          <Table
            columns={columns}
            dataSource={data}
            rowKey="date"
            pagination={{ pageSize: 7 }}
            size="small"
            scroll={{ x: true }}
          />
        )}
      </Card>

      <Modal
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingRight: '24px' }}>
            <Title level={4} style={{ margin: 0, color: token.colorPrimary }}>{modalTitle}</Title>
            <DataExport 
              data={modalData.map(item => ({
                ...item,
                payment_mode: item.payment_mode || 'Cash'
              }))} 
              exportColumns={modalExportColumns} 
              fileName={modalTitle.replace(/[^a-zA-Z0-9]/g, '_')} 
              reportTitle={modalTitle} 
            />
          </div>
        }
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        width={900} // FIX: Width barha kar 900 kar di
        centered
      >
        {modalLoading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}><Spin size="large" /></div>
        ) : (
          <Table
            columns={modalColumns}
            dataSource={modalData}
            rowKey="id"
            pagination={false}
            size="small"
            scroll={{ x: 750, y: 400 }} // FIX: Horizontal scroll (x: 750) add kiya
            summary={(pageData) => {
              let totalAmount = 0;
              pageData.forEach(({ amount }) => { totalAmount += amount; });
              return (
                <Table.Summary.Row style={{ background: token.colorFillAlter }}>
                  <Table.Summary.Cell index={0} colSpan={4}><Text strong>Total</Text></Table.Summary.Cell>
                  <Table.Summary.Cell index={1} align="right"><Text strong style={{ fontSize: '16px', color: token.colorPrimary }}>{formatCurrency(totalAmount, profile?.currency)}</Text></Table.Summary.Cell>
                </Table.Summary.Row>
              );
            }}
          />
        )}
      </Modal>

      {/* --- NAYA IZAFA: Voucher Search Modal --- */}
      <VoucherSearchModal 
        open={isVoucherModalOpen} 
        onClose={() => {
          setIsVoucherModalOpen(false);
          setVoucherToSearch('');
        }} 
        autoSearchQuery={voucherToSearch}
      />

      {/* --- NAYA IZAFA: Export & Print Wizard Modal --- */}
          <Modal
            title="Export & Print Wizard (Day Book)"
            open={isExportWizardOpen}
            onCancel={() => {
              setIsExportWizardOpen(false);
              setExportDateRangeType('current');
              setExportCustomDates([]);
              setSelectedColumns(['sale', 'purchase', 'receipt', 'payment', 'net']); // <--- Reset adjusted
            }}
            footer={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text type="secondary" style={{ fontSize: '11px' }}>
                  {exportLoading ? 'Loading data...' : `${exportData.length} Days Selected`}
                </Text>
                <Space>
                  {exportData.length > 0 && !exportLoading && (
                    <DataExport
                      data={exportData.map(item => ({
                        ...item,
                        formattedDate: dayjs(item.date).format('DD-MMM-YYYY'),
                        net_flow: (item.receipt || 0) - (item.payment || 0) // <--- NAYA IZAFA: Calculate net cash flow for export
                      }))}
                      exportColumns={dynamicExportColumns} // <--- Dynamic columns automatically apply
                      fileName="Daily_Financial_Summary"
                      reportTitle="Daily Financial Summary (Day Book)"
                    />
                  )}
                  <Button onClick={() => {
                    setIsExportWizardOpen(false);
                    setExportDateRangeType('current');
                    setExportCustomDates([]);
                    setSelectedColumns(['sale', 'purchase', 'receipt', 'payment', 'net']); // <--- Reset adjusted
                  }}>Close</Button>
                </Space>
              </div>
            }
        centered
        width="65%" // <--- NAYA IZAFA: Pop-up width is set to 65% of screen
      >
        <Form layout="vertical" style={{ marginTop: '16px' }}>
          {/* 1. Date Range Configuration (Dynamic Dropdown Layout) */}
          <Form.Item label={<Text strong>1. Select Date Range</Text>}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', width: '100%', flexWrap: 'wrap' }}>
              {/* Button 1: Active Filter */}
              <Button 
                type={exportDateRangeType === 'current' ? 'primary' : 'default'} 
                onClick={() => {
                  setExportDateRangeType('current');
                  handleExportRangeChange('current');
                }}
                style={{ flex: 1, minWidth: '110px' }}
              >
                Active Filter
              </Button>
              
              {/* Dropdown: Presets */}
              <Select
                value={['today', 'yesterday', 'week', 'month', 'year'].includes(exportDateRangeType) ? exportDateRangeType : undefined}
                onChange={(val) => {
                  setExportDateRangeType(val);
                  handleExportRangeChange(val);
                }}
                style={{ flex: 1.5, minWidth: '160px' }}
                placeholder="Choose Preset Range"
                styles={{ popup: { root: { zIndex: 2000 } } }} // FIX: Deprecated dropdownStyle replaced with styles.popup.root
                allowClear={false}
              >
                <Select.Option value="today">Today Only</Select.Option>
                <Select.Option value="yesterday">Yesterday</Select.Option>
                <Select.Option value="week">This Week</Select.Option>
                <Select.Option value="month">This Month</Select.Option>
                <Select.Option value="year">This Year</Select.Option>
              </Select>

              {/* Button 2: Custom Range Calendar */}
              <Button 
                type={exportDateRangeType === 'custom' ? 'primary' : 'default'} 
                onClick={() => {
                  setExportDateRangeType('custom');
                  handleExportRangeChange('custom', exportCustomDates);
                }}
                style={{ flex: 1, minWidth: '110px' }}
              >
                Custom Range
              </Button>
            </div>
          </Form.Item>

          {/* Custom Date Range Datepicker */}
          {exportDateRangeType === 'custom' && (
            <Form.Item label="Select Custom Range" required>
              <DatePicker.RangePicker
                format="DD/MM/YYYY"
                value={exportCustomDates.length === 2 ? [dayjs(exportCustomDates[0]), dayjs(exportCustomDates[1])] : null}
                onChange={(dates) => {
                  if (dates) {
                    const formatted = [dates[0].toISOString(), dates[1].toISOString()];
                    setExportCustomDates(formatted);
                    handleExportRangeChange('custom', dates);
                  } else {
                    setExportCustomDates([]);
                  }
                }}
                style={{ width: '100%' }}
              />
            </Form.Item>
          )}

          {/* 2. Columns Selection */}
          <Form.Item label={<Text strong>2. Select Columns to Include</Text>}>
                <Checkbox.Group
                  value={selectedColumns}
                  onChange={(vals) => {
                    if (vals.length > 0) {
                      setSelectedColumns(vals);
                    } else {
                      message.warning('At least one column must be selected.');
                    }
                  }}
                  style={{ width: '100%' }}
                >
                  <Row gutter={[16, 8]}>
                    <Col span={12}><Checkbox value="sale">Daily Sale</Checkbox></Col>
                    <Col span={12}><Checkbox value="purchase">Daily Purchase</Checkbox></Col>
                    <Col span={12}><Checkbox value="receipt">Daily Receipt</Checkbox></Col>
                    <Col span={12}><Checkbox value="payment">Daily Payment</Checkbox></Col>
                    <Col span={12}><Checkbox value="net">Daily Net</Checkbox></Col> {/* <--- NAYA CHECKBOX */}
                  </Row>
                </Checkbox.Group>
              </Form.Item>
        </Form>
      </Modal>
    </ConfigProvider>
  );
};

export default DailyFinancialSummary;