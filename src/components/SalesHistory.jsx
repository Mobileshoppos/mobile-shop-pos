// src/components/SalesHistory.jsx (FINAL UPDATED CODE)

import React, { useState, useEffect } from 'react';
import { Card, Table, Typography, Tag, App, Button, Tooltip } from 'antd';
import { PrinterOutlined } from '@ant-design/icons';
import { supabase } from '../supabaseClient';
// STEP 1: Apne receipt generator ko import karein
import { generateSaleReceipt } from '../utils/receiptGenerator';

const { Title } = Typography;

const SalesHistory = () => {
  const { message } = App.useApp();
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  // STEP 2: Button ki loading state ke liye state banayein
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

  // STEP 3: handleReprint function ko mukammal tor par update karein
  const handleReprint = async (saleId) => {
    // Loading indicator show karein
    setIsPrinting(saleId); 
  
    try {
      // Database function 'get_sale_details' ko call karein
      const { data, error } = await supabase.rpc('get_sale_details', {
        p_sale_id: saleId
      });
  
      // Agar data laane mein error aaye to foran ruk jao
      if (error) {
        throw error;
      }
            
      generateSaleReceipt(data);
  
    } catch (error) {
      // Agar upar kahin bhi masla ho to user ko error message dikhayein
      message.error('Could not print receipt: ' + error.message);
    } finally {
      // Aakhir mein, loading indicator hata dein, chahe kaamiyab ho ya na ho
      setIsPrinting(null);
    }
  };

  const columns = [
    {
      title: 'Sale ID',
      dataIndex: 'sale_id',
      key: 'sale_id',
    },
    {
      title: 'Date',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text) => new Date(text).toLocaleString(),
    },
    {
      title: 'Customer',
      dataIndex: 'customer_name',
      key: 'customer_name',
    },
    {
      title: 'Total Items',
      dataIndex: 'total_items',
      key: 'total_items',
      align: 'center',
    },
    {
      title: 'Total Amount',
      dataIndex: 'total_amount',
      key: 'total_amount',
      render: (amount) => `Rs. ${amount.toFixed(2)}`,
      align: 'right',
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
    },
    {
      title: 'Salesperson',
      dataIndex: 'salesperson_name',
      key: 'salesperson_name',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Tooltip title="Reprint Receipt">
          {/* STEP 4: Button mein 'loading' prop add karein */}
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
        <Table
          columns={columns}
          dataSource={sales}
          loading={loading}
          rowKey="sale_id"
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </>
  );
};

export default SalesHistory;