import React, { useState, useEffect } from 'react';
import { Card, Table, Typography, Tag, App, Button, Tooltip } from 'antd';
import { PrinterOutlined } from '@ant-design/icons';
import { supabase } from '../supabaseClient';
import { generateSaleReceipt } from '../utils/receiptGenerator';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/currencyFormatter';
import { db } from '../db';
import { printThermalReceipt } from '../utils/thermalPrinter';

const { Title, Text } = Typography;

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
        
        // 1. Saari Sales Local DB se layein
        const localSales = await db.sales.toArray();
        
        // 2. Har Sale ke liye Customer ka naam aur Items ki ginti karein
        const formattedSales = await Promise.all(localSales.map(async (sale) => {
            const customer = await db.customers.get(sale.customer_id);
            
            // Items ginnay ke liye
            const items = await db.sale_items.where('sale_id').equals(sale.id).toArray();
            const totalItems = items.reduce((sum, i) => sum + (i.quantity || 0), 0);

            return {
                sale_id: sale.id, // UUID
                created_at: sale.created_at || sale.sale_date,
                customer_name: customer ? customer.name : 'Walk-in Customer',
                total_items: totalItems,
                total_amount: sale.total_amount,
                payment_status: sale.payment_status,
                salesperson_name: 'Admin',
                payment_method: sale.payment_method || 'Cash'
            };
        }));

        // 3. Date ke hisaab se sort karein (Newest first)
        formattedSales.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

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
              item_attributes: inventoryItem ? inventoryItem.item_attributes : {} // Attributes laye
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
                  attributes: attrValues // Attributes save kiye
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
          shopPhone: profile?.phone || '',
          saleId: sale.id,
          saleDate: sale.created_at || sale.sale_date,
          customerName: customer ? customer.name : 'Walk-in Customer',
          items: finalReceiptItems, 
          subtotal: sale.subtotal,
          discount: sale.discount,
          grandTotal: sale.total_amount,
          amountPaid: sale.amount_paid_at_sale,
          paymentStatus: sale.payment_status,
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

  const columns = [
    {
      title: '#',
      dataIndex: 'sale_id',
      key: 'sale_id',
      fixed: 'left',
      width: 90, // Thora chora karein
      align: 'center',
      // Ab ID Number hai (e.g., 1732336800123), to hum slice nahi karenge
      render: (text) => <Text code>{text}</Text>
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