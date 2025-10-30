import React, { useState, useEffect } from 'react';
import { Card, Table, Typography, Tag, App, Button, Tooltip } from 'antd';
import { PrinterOutlined } from '@ant-design/icons';
import { supabase } from '../supabaseClient';
import { generateSaleReceipt } from '../utils/receiptGenerator';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/currencyFormatter';

const { Title } = Typography;

const SalesHistory = () => {
  const { profile } = useAuth();
  const { message } = App.useApp();
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isPrinting, setIsPrinting] = useState(null);

  useEffect(() => {
    const fetchSalesHistory = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('sales_history_view')
          .select('*');

        if (error) throw error;
        setSales(data);
      } catch (error) {
        message.error('Error fetching sales history: ' + error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSalesHistory();
  }, [message]);

  const handleReprint = async (saleId) => {
    setIsPrinting(saleId); 
  
    try {
      const { data, error } = await supabase.rpc('get_sale_details', {
        p_sale_id: saleId
      });
  
      if (error) {
        throw error;
      }
            
      generateSaleReceipt(data, profile?.currency);
  
    } catch (error) {
      message.error('Could not print receipt: ' + error.message);
    } finally {
      setIsPrinting(null);
    }
  };

  const columns = [
    {
      title: '#',
      dataIndex: 'sale_id',
      key: 'sale_id',
      fixed: 'left',
      width: 60,
      align: 'center',
    },
    {
      title: (
        <div>
          <div>Date</div>
          <div>Time</div>
        </div>
      ),
      dataIndex: 'created_at',
      key: 'created_at',
      width: 120,
      render: (text) => {
        const d = new Date(text);
        const date = d.toLocaleDateString();
        const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return (
          <div>
            <div>{date}</div>
            <div>{time}</div>
          </div>
        );
      },
    },
    {
      title: 'Customer',
      dataIndex: 'customer_name',
      key: 'customer_name',
      width: 220,
    },
    {
      title: 'Total Items',
      dataIndex: 'total_items',
      key: 'total_items',
      align: 'center',
      width: 120,
    },
    {
  title: 'Total Amount',
  dataIndex: 'total_amount',
  key: 'total_amount',
  render: (amount) => formatCurrency(amount, profile?.currency),
  align: 'right',
  width: 150,
},
    {
      title: 'Payment Status',
      dataIndex: 'payment_status',
      key: 'payment_status',
      render: (status) => (
        <Tag color={status === 'Paid' ? 'green' : 'volcano'}>
          {status.toUpperCase()}
        </Tag>
      ),
      align: 'center',
      width: 150,
    },
    {
      title: 'Salesperson',
      dataIndex: 'salesperson_name',
      key: 'salesperson_name',
      width: 220,
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      width: 80,
      align: 'center',
      render: (_, record) => (
        <Tooltip title="Reprint Receipt">
          <Button 
            icon={<PrinterOutlined />} 
            onClick={() => handleReprint(record.sale_id)}
            loading={isPrinting === record.sale_id}
          />
        </Tooltip>
      ),
    },
  ];

  return (
    <>
      <Title level={2} style={{ marginBottom: '24px' }}>Sales History</Title>
      <Card>
        {/* TABLE COMPONENT KO IS SE BADAL DEIN */}
        <Table
          columns={columns}
          dataSource={sales}
          loading={loading}
          rowKey="sale_id"
          pagination={{ pageSize: 10 }}
          scroll={{ x: 1300 }}
        />
      </Card>
    </>
  );
};

export default SalesHistory;