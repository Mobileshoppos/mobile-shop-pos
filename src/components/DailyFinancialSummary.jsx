import React, { useState, useEffect, useCallback } from 'react';
import { Card, Table, Typography, Spin, ConfigProvider, theme, Modal, Tag, Button, Space, App } from 'antd';
import { PrinterOutlined, FileExcelOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import DataService from '../DataService';
import DataExport from './DataExport'; // <--- NAYA IZAFA: Smart Export System
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

  const loadData = useCallback(async () => {
    if (data.length === 0) setLoading(true);
    try {
      const summaryData = await DataService.getDailyFinancialSummary(timeRange, customDates);
      setData(summaryData);
    } catch (error) {
      console.error("Error loading daily financial summary:", error);
    } finally {
      setLoading(false);
    }
  }, [timeRange, customDates, data.length]);

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
  ];

  const modalColumns = [
    { 
      title: 'Ref No.', 
      dataIndex: 'ref_no', 
      key: 'ref_no', 
      width: 130, // FIX: Width set ki
      render: (text, record) => {
        if (record.link) {
          return (
            <Link to={record.link}>
              <Text code style={{ color: token.colorPrimary, cursor: 'pointer' }}>{text}</Text>
            </Link>
          );
        }
        return <Text code>{text}</Text>;
      } 
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
          <DataExport 
            data={data.map(item => ({
              ...item,
              formattedDate: dayjs(item.date).format('DD-MMM-YYYY')
            }))} 
            exportColumns={summaryExportColumns} 
            fileName="Daily_Financial_Summary" 
            reportTitle="Daily Financial Summary (Day Book)" 
          />
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
    </ConfigProvider>
  );
};

export default DailyFinancialSummary;