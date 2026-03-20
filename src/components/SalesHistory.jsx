import React, { useState, useEffect, useRef } from 'react';
import { Card, Table, Typography, Tag, App, Button, Tooltip, Space, theme, Input, DatePicker, Select } from 'antd';
import { PrinterOutlined, ReloadOutlined, HistoryOutlined } from '@ant-design/icons';
import { supabase } from '../supabaseClient';
import { generateSaleReceipt } from '../utils/receiptGenerator';
import { useAuth } from '../context/AuthContext';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { formatCurrency } from '../utils/currencyFormatter';
import { db } from '../db';
import { printThermalReceipt } from '../utils/thermalPrinter';
import { useSync } from '../context/SyncContext';

const { Title, Text } = Typography;

const SalesHistory = () => {
  const { token } = theme.useToken(); // Control Center Connection
  const { profile } = useAuth();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { message } = App.useApp();
  const searchInputRef = useRef(null);

  // Auto-focus logic for Desktop
  useEffect(() => {
    if (!isMobile && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isMobile]);
  const { processSyncQueue } = useSync();
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isPrinting, setIsPrinting] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [dateRange, setDateRange] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [staffFilter, setStaffFilter] = useState('all');
  const [staffList, setStaffList] = useState([]);

  useEffect(() => {
    const fetchSalesHistory = async () => {
      try {
        setLoading(true);

        // 1. SAFE FETCH: Saara data aur customers le aao
        const allRawSales = await db.sales.toArray();
        const allCustomersForFilter = await db.customers.toArray();

        // 2. FINAL PROFESSIONAL FILTER LOGIC
        let filteredSales = allRawSales.filter(s => {
          // A. Search Text Filter
          const customer = allCustomersForFilter.find(c => c.id === s.customer_id);
          const customerName = customer ? customer.name.toLowerCase() : 'walk-in customer';
          const invoiceId = (s.invoice_id || '').toLowerCase();
          const matchesSearch = !searchText || 
            invoiceId.includes(searchText.toLowerCase()) || 
            customerName.includes(searchText.toLowerCase());

          // B. Date Range Filter
          let matchesDate = true;
          if (dateRange && dateRange[0] && dateRange[1]) {
            const saleDate = new Date(s.created_at || s.sale_date);
            const startDate = dateRange[0].startOf('day').toDate();
            const endDate = dateRange[1].endOf('day').toDate();
            matchesDate = saleDate >= startDate && saleDate <= endDate;
          }

          // C. Status Filter
          const matchesStatus = statusFilter === 'all' || s.payment_status === statusFilter;

          // D. Staff Filter
          const matchesStaff = staffFilter === 'all' || s.staff_id === staffFilter;

          return matchesSearch && matchesDate && matchesStatus && matchesStaff;
        });

        // 3. JS SORT: Filtered data ko sort aur limit karein
        const localSales = filteredSales
            .sort((a, b) => new Date(b.created_at || b.sale_date) - new Date(a.created_at || a.sale_date))
            .slice(0, 50);
        
        // 3. Sync Queue layein
        const queueItems = await db.sync_queue.where('table_name').equals('sales').toArray();

        // 4. BATCH FETCHING (Optimization - Fast Data Loading)
        const customerIds = localSales.map(s => s.customer_id).filter(id => id);
        const saleIds = localSales.map(s => s.id);

        const [allCustomers, allSaleItems, allStaff] = await Promise.all([
            db.customers.where('id').anyOf(customerIds).toArray(),
            db.sale_items.where('sale_id').anyOf(saleIds).toArray(),
            db.staff_members.toArray() // <--- NAYA IZAFA (AUDIT TRAIL)
        ]);
        setStaffList(allStaff);

        // 5. MAPPING (Data Jorna)
        const customerMap = {};
        allCustomers.forEach(c => { customerMap[c.id] = c; });

        const staffMap = {};
        allStaff.forEach(s => { staffMap[s.id] = s.name; }); // <--- NAYA IZAFA (AUDIT TRAIL)

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
                // Agar staff_id hai toh uska naam dikhao, warna 'Owner'
                salesperson_name: staffMap[sale.staff_id] || 'Owner', 
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
  }, [message, searchText, dateRange, statusFilter, staffFilter]);

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
          
          // --- NAYA IZAFA: Tax on Reprint ---
          taxAmount: sale.tax_amount || 0,
          taxName: profile?.tax_name || 'Tax',
          taxRate: sale.tax_rate_applied || 0,
          // ----------------------------------

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
        if (status === 'synced') return <Tag color="success">Synced</Tag>;
        if (status === 'pending') return <Tag color="warning">Pending</Tag>;
        return (
          <Tooltip title={record.sync_error || "Sync failed"}>
            <Tag color="error" style={{ cursor: 'help' }}>Error</Tag>
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
      title: (
        <div style={{ lineHeight: '1.2' }}>
          <div>Total</div>
          <div>Items</div>
        </div>
      ),
      dataIndex: 'total_items',
      key: 'total_items',
      align: 'center',
      width: 80,
    },
    {
  title: 'Method',
  dataIndex: 'payment_method',
  key: 'payment_method',
  render: (method) => <Tag color={method === 'Bank' ? 'cyan' : 'default'}>{method || 'Cash'}</Tag>,
  width: 100,
},
    {
      title: (
        <div style={{ lineHeight: '1.2' }}>
          <div>Total</div>
          <div>Amount</div>
        </div>
      ),
      dataIndex: 'total_amount',
      key: 'total_amount',
      render: (amount) => formatCurrency(amount, profile?.currency),
      align: 'right',
      width: 110,
    },
    {
      title: (
        <div style={{ lineHeight: '1.2' }}>
          <div>Payment</div>
          <div>Status</div>
        </div>
      ),
      dataIndex: 'payment_status',
      key: 'payment_status',
      render: (status) => (
        <Tag color={status === 'Paid' ? 'success' : 'error'}>
          {status.toUpperCase()}
        </Tag>
      ),
      align: 'center',
      width: 100,
    },
    {
      title: 'Salesperson',
      dataIndex: 'salesperson_name',
      key: 'salesperson_name',
      width: 110,
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
    <div style={{ padding: isMobile ? '12px 0' : '4px 0' }}>
      {isMobile && (
        <Title level={2} style={{ marginBottom: '16px', marginLeft: '8px', fontSize: '23px' }}>
          <HistoryOutlined /> Sales History
        </Title>
      )}
      <Card>
        <Space wrap style={{ marginBottom: '24px', width: '100%', justifyContent: 'space-between' }}>
          <Space wrap>
            <Input.Search
              ref={searchInputRef}
              placeholder="Invoice # or Customer..."
              allowClear
              value={searchText}
              onSearch={value => setSearchText(value)}
              onChange={e => setSearchText(e.target.value)}
              style={{ width: 200 }}
            />
            <DatePicker.RangePicker 
              value={dateRange}
              onChange={(values) => setDateRange(values)}
              style={{ width: 260 }}
            />
            <Select 
              value={statusFilter}
              style={{ width: 130 }} 
              onChange={value => setStatusFilter(value)}
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'Paid', label: 'Paid' },
                { value: 'Unpaid', label: 'Unpaid' },
              ]}
            />
            <Select 
              value={staffFilter}
              style={{ width: 150 }} 
              onChange={value => setStaffFilter(value)}
              placeholder="Filter by Staff"
              options={[
                { value: 'all', label: 'All Staff' },
                ...staffList.map(staff => ({ value: staff.id, label: staff.name }))
              ]}
            />
          </Space>
          <Button 
            icon={<ReloadOutlined />} 
            onClick={() => {
              setSearchText('');
              setDateRange(null);
              setStatusFilter('all');
              setStaffFilter('all');
              // window.location.reload() ki zaroorat nahi, states khud reset ho jayengi
            }}
          >
            Reset
          </Button>
        </Space>
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