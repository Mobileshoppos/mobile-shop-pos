import React, { useState, useEffect } from 'react';
import { Card, Table, Typography, Tag, App, Button, Tooltip, Space } from 'antd';
import { PrinterOutlined, ReloadOutlined, HistoryOutlined } from '@ant-design/icons';
import { supabase } from '../supabaseClient';
import { generateSaleReceipt } from '../utils/receiptGenerator';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/currencyFormatter';
import { db } from '../db';
import { printThermalReceipt } from '../utils/thermalPrinter';
import { useSync } from '../context/SyncContext';

const { Title, Text } = Typography;

const SalesHistory = () => {
  const { profile } = useAuth();
  const { message } = App.useApp();
  const { processSyncQueue } = useSync();
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isPrinting, setIsPrinting] = useState(null);

  useEffect(() => {
    const fetchSalesHistory = async () => {
      try {
        setLoading(true);

        // 1. SAFE FETCH: Saara data le aao (Index issue se bachne ke liye)
        const allRawSales = await db.sales.toArray();

        // 2. JS SORT: Memory mein sort aur limit karein (Guaranteed Data)
        const localSales = allRawSales
            .sort((a, b) => new Date(b.created_at || b.sale_date) - new Date(a.created_at || a.sale_date))
            .slice(0, 50); // Sirf top 50 uthayen
        
        // 3. Sync Queue layein
        const queueItems = await db.sync_queue.where('table_name').equals('sales').toArray();

        // 4. BATCH FETCHING (Optimization - Fast Data Loading)
        const customerIds = localSales.map(s => s.customer_id).filter(id => id);
        const saleIds = localSales.map(s => s.id);

        const [allCustomers, allSaleItems] = await Promise.all([
            db.customers.where('id').anyOf(customerIds).toArray(),
            db.sale_items.where('sale_id').anyOf(saleIds).toArray()
        ]);

        // 5. MAPPING (Data Jorna)
        const customerMap = {};
        allCustomers.forEach(c => { customerMap[c.id] = c; });

        const itemsMap = {};
        allSaleItems.forEach(item => {
            if (!itemsMap[item.sale_id]) itemsMap[item.sale_id] = [];
            itemsMap[item.sale_id].push(item);
        });
        
        // 6. FINAL FORMATTING
        const formattedSales = localSales.map((sale) => {
            const customer = customerMap[sale.customer_id];
            const items = itemsMap[sale.id] || [];
            const totalItems = items.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);

            const queueItem = queueItems.find(q => 
                (q.data?.sale?.id === sale.id) || (q.data?.sale?.local_id === sale.id)
            );
            let status = 'synced';
            let errorMsg = null;

            if (queueItem) {
                status = queueItem.status === 'error' ? 'error' : 'pending';
                errorMsg = queueItem.last_error;
            }

            return {
                sale_id: sale.id,
                invoice_id: sale.invoice_id, 
                created_at: sale.created_at || sale.sale_date,
                customer_name: customer ? customer.name : 'Walk-in Customer',
                total_items: totalItems,
                total_amount: sale.total_amount,
                payment_status: sale.payment_status,
                salesperson_name: 'Admin',
                payment_method: sale.payment_method || 'Cash',
                sync_status: status,
                sync_error: errorMsg
            };
        });
        
        setSales(formattedSales);
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
      const sale = await db.sales.get(saleId);
      if (!sale) throw new Error("Sale not found locally");

      const customer = await db.customers.get(sale.customer_id);
      const saleItems = await db.sale_items.where('sale_id').equals(saleId).toArray();
      
      // 1. Data Fetching
      const rawItems = await Promise.all(saleItems.map(async (item) => {
          const product = await db.products.get(item.product_id);
          const inventoryItem = await db.inventory.get(item.inventory_id);
          const displayName = item.product_name_snapshot || (product ? product.name : 'Unknown Item');

          return {
              name: displayName, 
              quantity: item.quantity,
              price_at_sale: item.price_at_sale,
              total: item.quantity * item.price_at_sale,
              imei: inventoryItem ? inventoryItem.imei : null,
              warranty_expiry: item.warranty_expiry,
              item_attributes: inventoryItem ? inventoryItem.item_attributes : {} 
          };
      }));

      // 2. Grouping Logic
      const groupedHistoryItemsMap = {};

      rawItems.forEach(item => {
          const key = `${item.name}-${item.price_at_sale}`;

          // Attributes Format
          const attrValues = item.item_attributes 
            ? Object.entries(item.item_attributes)
                .filter(([k, v]) => !k.toLowerCase().includes('imei') && !k.toLowerCase().includes('serial'))
                .map(([k, v]) => v)
                .join(', ')
            : '';

          if (!groupedHistoryItemsMap[key]) {
              groupedHistoryItemsMap[key] = {
                  name: item.name,
                  quantity: 0,
                  price_at_sale: item.price_at_sale,
                  total: 0,
                  imeis: [],
                  attributes: attrValues,
                  warranty_expiry: item.warranty_expiry
              };
          }

          groupedHistoryItemsMap[key].quantity += (item.quantity || 1);
          groupedHistoryItemsMap[key].total += (item.quantity || 1) * item.price_at_sale;

          if (item.imei) {
              groupedHistoryItemsMap[key].imeis.push(item.imei);
          }
      });

      const finalReceiptItems = Object.values(groupedHistoryItemsMap);

      // 3. Receipt Data
      const receiptData = {
          shopName: profile?.shop_name || 'My Shop',
          shopAddress: profile?.address || '',
          shopPhone: profile?.phone_number || '',
          saleId: sale.id,
          invoice_id: sale.invoice_id,
          saleDate: sale.created_at || sale.sale_date,
          customerName: customer ? customer.name : 'Walk-in Customer',
          items: finalReceiptItems, 
          subtotal: sale.subtotal,
          discount: sale.discount,
          grandTotal: sale.total_amount,
          amountPaid: sale.amount_paid_at_sale,
          paymentStatus: sale.payment_status,
          payment_method: sale.payment_method || 'Cash',
          footerMessage: profile?.warranty_policy,
          showQrCode: profile?.qr_code_enabled ?? true
      };
            
      if (profile?.receipt_format === 'thermal') {
          printThermalReceipt(receiptData, profile?.currency);
      } else {
          generateSaleReceipt(receiptData, profile?.currency);
      }
  
    } catch (error) {
      console.error(error);
      message.error('Could not print receipt: ' + error.message);
    } finally {
      setIsPrinting(null);
    }
  };

  const handleManualRetry = async () => {
    message.info('Retrying sync...');
    await processSyncQueue();
    // Refresh the list after retry
    window.location.reload(); 
  };

  const columns = [
    {
      title: 'Inv: #',
      dataIndex: 'invoice_id', // <--- Change: sale_id se invoice_id
      key: 'invoice_id',
      width: 110,
      align: 'center',
      render: (text, record) => <Text code strong>{text || record.sale_id.slice(0, 8)}</Text>
    },
    {
      title: 'Sync',
      dataIndex: 'sync_status',
      key: 'sync_status',
      width: 100,
      align: 'center',
      render: (status, record) => {
        if (status === 'synced') return <Tag color="green">Synced</Tag>;
        if (status === 'pending') return <Tag color="orange">Pending</Tag>;
        return (
          <Tooltip title={record.sync_error || "Sync failed"}>
            <Tag color="red" style={{ cursor: 'help' }}>Error</Tag>
          </Tooltip>
        );
      }
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
  title: 'Method',
  dataIndex: 'payment_method',
  key: 'payment_method',
  render: (method) => <Tag color={method === 'Bank' ? 'blue' : 'default'}>{method || 'Cash'}</Tag>,
  width: 100,
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
      width: 120, // Is ki width thori barha di taake buttons sahi nazar aayein
      align: 'center',
      render: (_, record) => (
        <Space>
          {/* Agar sync fail hai ya pending hai, to Retry button dikhao */}
          {(record.sync_status === 'error' || record.sync_status === 'pending') && (
            <Tooltip title="Retry Sync">
              <Button 
                type="primary"
                danger={record.sync_status === 'error'}
                icon={<ReloadOutlined />} 
                size="small"
                onClick={handleManualRetry}
              />
            </Tooltip>
          )}
          
          <Tooltip title="Reprint Receipt">
            <Button 
              icon={<PrinterOutlined />} 
              onClick={() => handleReprint(record.sale_id)}
              loading={isPrinting === record.sale_id}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2} style={{ marginBottom: '24px', marginLeft: '48px', fontSize: '23px' }}>
        <HistoryOutlined /> Sales History
      </Title>
      <Card>
        {/* TABLE COMPONENT KO IS SE BADAL DEIN */}
        <Table
          columns={columns}
          dataSource={sales}
          loading={loading}
          rowKey="sale_id"
          pagination={{ pageSize: 10 }}
          scroll={{ x: 'max-content' }}
        />
      </Card>
    </div>
  );
};

export default SalesHistory;