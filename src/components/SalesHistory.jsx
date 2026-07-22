import React, { useState, useEffect, useRef } from 'react';
import { Card, Table, Typography, Tag, App, Button, Tooltip, Space, theme, Input, DatePicker, Select, Radio, Row, Col, ConfigProvider } from 'antd';
import { PrinterOutlined, ReloadOutlined, HistoryOutlined, FilterOutlined, UndoOutlined, RollbackOutlined } from '@ant-design/icons';
import { supabase } from '../supabaseClient';
import { generateSaleReceipt } from '../utils/receiptGenerator';
import { useAuth } from '../context/AuthContext';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { formatCurrency } from '../utils/currencyFormatter';
import { db } from '../db';
import { printThermalReceipt } from '../utils/thermalPrinter';
import { useSync } from '../context/SyncContext';
import DataExport from '../components/DataExport'; // <--- NAYA IZAFA
import dayjs from 'dayjs'; // <--- NAYA IZAFA: dayjs ko import kiya taake crash hal ho jaye

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
  // NAYA IZAFA: Default Date Range set to current Month to keep page load lightning-fast
  const [dateRange, setDateRange] = useState([dayjs().startOf('month'), dayjs().endOf('month')]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [staffFilter, setStaffFilter] = useState('all');
  const [staffList, setStaffList] = useState([]);

  // --- NAYA IZAFA: Super Sales History States (View Modes & Advanced Filters) ---
  const [historyViewMode, setHistoryViewMode] = useState('invoices'); // 'invoices', 'items', 'returns'
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filterCategory, setFilterCategory] = useState(null);
  const [filterBrand, setFilterBrand] = useState(null);
  const [filterPaymentMethod, setFilterPaymentMethod] = useState('all');
  const [historyDateRangeType, setHistoryDateRangeType] = useState('this_month'); // <--- NAYA IZAFA: Quick Period filter state

  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);

  // Display Lists for Items & Returns
  const [itemsSoldList, setItemsSoldList] = useState([]);
  const [returnsList, setReturnsList] = useState([]);

  // --- NAYA IZAFA: Dynamic Accounts State ---
  const [accountsList, setAccountsList] = useState([]);

  useEffect(() => {
    const fetchSalesHistory = async () => {
      try {
        setLoading(true);

        // 1. High-Performance Indexed Query (Loads ONLY selected dates to prevent lags/crashes over the years)
        let matchedSales = [];
        if (dateRange && dateRange[0] && dateRange[1]) {
            const startStr = dateRange[0].startOf('day').toISOString();
            const endStr = dateRange[1].endOf('day').toISOString();
            // Fast indexed search in Dexie (Loads only current month on boot)
            matchedSales = await db.sales.where('created_at').between(startStr, endStr, true, true).toArray();
        } else {
            // Safety Cap: Capped to 500 records on "All Time" to prevent memory leaks/crashes
            matchedSales = await db.sales.orderBy('created_at').reverse().limit(500).toArray();
        }

        const [allCustomers, allProducts, allCategories, allStaff, allRawSaleItems, allReturns, allReturnItems, allRawAccounts] = await Promise.all([
          db.customers.toArray(),
          db.products.toArray(),
          db.categories.toArray(),
          db.staff_members.toArray(),
          db.sale_items.toArray(),
          db.sale_returns.toArray(),
          db.sale_return_items.toArray(),
          db.payment_accounts.toArray() 
        ]);

        const allRawSales = matchedSales; // Aligned with the rest of the flow

        setCategories(allCategories);
        setStaffList(allStaff);
        setAccountsList(allRawAccounts.filter(a => a.is_active !== false));

        setCategories(allCategories);
        setStaffList(allStaff);
        setAccountsList(allRawAccounts.filter(a => a.is_active !== false)); // <--- NAYA IZAFA

        // Brands list dynamically nikalna
        const uniqueBrands = Array.from(new Set(allProducts.map(p => p.brand).filter(b => b)));
        setBrands(uniqueBrands);

        // Staff & Customer Maps
        const staffMap = {}; allStaff.forEach(s => { staffMap[s.id] = s.name; });
        const customerMap = {}; allCustomers.forEach(c => { customerMap[c.id] = c.name; });
        const productMap = {}; allProducts.forEach(p => { productMap[p.id] = p; });

        // --- IMEI / BARCODE SEARCH DEDUCTION ---
        let searchedSaleIdsFromImei = [];
        if (searchText && searchText.trim().length > 3) {
            const matchedInventory = await db.inventory
                .filter(i => i.imei && i.imei.toLowerCase().includes(searchText.toLowerCase().trim()))
                .toArray();
            const matchedInvIds = matchedInventory.map(i => i.id);
            if (matchedInvIds.length > 0) {
                const matchedSaleItems = allRawSaleItems.filter(si => matchedInvIds.includes(si.inventory_id));
                searchedSaleIdsFromImei = matchedSaleItems.map(si => si.sale_id);
            }
        }

        // ============================================
        // 1. INVOICES VIEW FILTER & FORMAT
        // ============================================
        let filteredSales = allRawSales.filter(s => {
          const custName = customerMap[s.customer_id] || 'Walk-in Customer';
          const invId = s.invoice_id || '';
          
          const matchesSearch = !searchText || 
            invId.toLowerCase().includes(searchText.toLowerCase()) || 
            custName.toLowerCase().includes(searchText.toLowerCase()) ||
            searchedSaleIdsFromImei.includes(s.id);

          let matchesDate = true;
          if (dateRange && dateRange[0] && dateRange[1]) {
            const saleDate = new Date(s.created_at || s.sale_date);
            matchesDate = saleDate >= dateRange[0].startOf('day').toDate() && saleDate <= dateRange[1].endOf('day').toDate();
          }

          const matchesStatus = statusFilter === 'all' || s.payment_status === statusFilter;
          const matchesStaff = staffFilter === 'all' || s.staff_id === staffFilter;
          const matchesMethod = filterPaymentMethod === 'all' || s.payment_method === filterPaymentMethod;

          // Advanced Category & Brand checks
          let matchesAdvanced = true;
          if (filterCategory || filterBrand) {
              const sItems = allRawSaleItems.filter(si => si.sale_id === s.id);
              matchesAdvanced = sItems.some(si => {
                  const prod = productMap[si.product_id];
                  if (!prod) return false;
                  const catMatch = !filterCategory || prod.category_id === filterCategory;
                  const brandMatch = !filterBrand || prod.brand === filterBrand;
                  return catMatch && brandMatch;
              });
          }

          return matchesSearch && matchesDate && matchesStatus && matchesStaff && matchesMethod && matchesAdvanced;
        });

        // Sorted descending (Newest first)
        filteredSales.sort((a, b) => new Date(b.created_at || b.sale_date) - new Date(a.created_at || a.sale_date));

        // Invoices Map for counting total items
        const itemsCountMap = {};
        allRawSaleItems.forEach(item => {
            itemsCountMap[item.sale_id] = (itemsCountMap[item.sale_id] || 0) + (item.quantity || 1);
        });

        const queueItems = await db.sync_queue.where('table_name').equals('sales').toArray();

        const formattedInvoices = filteredSales.map(sale => {
            const status = queueItems.some(q => q.data?.sale?.id === sale.id) ? 'pending' : 'synced';
            return {
                sale_id: sale.id,
                invoice_id: sale.invoice_id,
                created_at: sale.created_at || sale.sale_date,
                customer_name: customerMap[sale.customer_id] || 'Walk-in Customer',
                total_items: itemsCountMap[sale.id] || 0,
                total_amount: sale.total_amount,
                payment_status: sale.payment_status,
                salesperson_name: staffMap[sale.staff_id] || 'Owner',
                payment_method: sale.payment_method || 'Cash',
                notes: sale.notes,
                sync_status: status
            };
        });
        setSales(formattedInvoices);

        // ============================================
        // 2. ITEMS SOLD VIEW FILTER & FORMAT
        // ============================================
        let filteredItems = allRawSaleItems.filter(si => {
            const sale = allRawSales.find(s => s.id === si.sale_id);
            if (!sale) return false;

            const prod = productMap[si.product_id];
            const pName = si.product_name_snapshot || prod?.name || 'Unknown Product';
            const custName = customerMap[sale.customer_id] || 'Walk-in Customer';
            const invId = sale.invoice_id || '';

            const matchesSearch = !searchText || 
                pName.toLowerCase().includes(searchText.toLowerCase()) || 
                custName.toLowerCase().includes(searchText.toLowerCase()) ||
                invId.toLowerCase().includes(searchText.toLowerCase()) ||
                searchedSaleIdsFromImei.includes(sale.id);

            let matchesDate = true;
            if (dateRange && dateRange[0] && dateRange[1]) {
                const saleDate = new Date(sale.created_at || sale.sale_date);
                matchesDate = saleDate >= dateRange[0].startOf('day').toDate() && saleDate <= dateRange[1].endOf('day').toDate();
            }

            const matchesStaff = staffFilter === 'all' || sale.staff_id === staffFilter;
            const matchesMethod = filterPaymentMethod === 'all' || sale.payment_method === filterPaymentMethod;
            const matchesCategory = !filterCategory || prod?.category_id === filterCategory;
            const matchesBrand = !filterBrand || prod?.brand === filterBrand;

            return matchesSearch && matchesDate && matchesStaff && matchesMethod && matchesCategory && matchesBrand;
        });

        filteredItems.sort((a, b) => new Date(b.created_at || a.created_at) - new Date(a.created_at || b.created_at));

        const formattedItemsList = filteredItems.map(item => {
            const sale = allRawSales.find(s => s.id === item.sale_id);
            const prod = productMap[item.product_id];
            return {
                id: item.id,
                date: sale?.created_at || item.created_at,
                invoice_id: sale?.invoice_id || 'N/A',
                product_name: item.product_name_snapshot || prod?.name || 'Unknown Product',
                brand: prod?.brand || '-',
                quantity: item.quantity || 1,
                price: item.price_at_sale,
                customer_name: customerMap[sale?.customer_id] || 'Walk-in Customer',
                salesperson_name: staffMap[sale?.staff_id] || 'Owner',
                batch_number: item.batch_number || '-',
                expiry_date: item.expiry_date || '-'
            };
        });
        setItemsSoldList(formattedItemsList);

        // ============================================
        // 3. SALES RETURNS VIEW FILTER & FORMAT
        // ============================================
        let filteredReturns = allReturnItems.filter(ri => {
            const ret = allReturns.find(r => r.id === ri.return_id);
            if (!ret) return false;

            const sale = allRawSales.find(s => s.id === ret.sale_id);
            const prod = productMap[ri.product_id];
            const pName = prod?.name || 'Unknown Product';
            const custName = customerMap[ret.customer_id] || 'Customer';
            const invId = sale?.invoice_id || '';

            const matchesSearch = !searchText || 
                pName.toLowerCase().includes(searchText.toLowerCase()) || 
                custName.toLowerCase().includes(searchText.toLowerCase()) ||
                invId.toLowerCase().includes(searchText.toLowerCase());

            let matchesDate = true;
            if (dateRange && dateRange[0] && dateRange[1]) {
                const retDate = new Date(ret.created_at);
                matchesDate = retDate >= dateRange[0].startOf('day').toDate() && retDate <= dateRange[1].endOf('day').toDate();
            }

            const matchesStaff = staffFilter === 'all' || ret.staff_id === staffFilter;
            const matchesCategory = !filterCategory || prod?.category_id === filterCategory;
            const matchesBrand = !filterBrand || prod?.brand === filterBrand;

            return matchesSearch && matchesDate && matchesStaff && matchesCategory && matchesBrand;
        });

        filteredReturns.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        const formattedReturnsList = filteredReturns.map(ri => {
            const ret = allReturns.find(r => r.id === ri.return_id);
            const sale = allRawSales.find(s => s.id === ret?.sale_id);
            const prod = productMap[ri.product_id];
            return {
                id: ri.id,
                date: ret?.created_at,
                invoice_id: sale?.invoice_id || 'N/A',
                product_name: prod?.name || 'Unknown Product',
                brand: prod?.brand || '-',
                quantity: ri.quantity || 1,
                refund_amount: ri.price_at_return,
                condition: ri.condition || 'Resellable',
                customer_name: customerMap[ret?.customer_id] || 'Customer',
                salesperson_name: staffMap[ret?.staff_id] || 'Owner',
                reason: ret?.reason || 'No reason provided'
            };
        });
        setReturnsList(formattedReturnsList);

      } catch (error) {
        message.error('Error fetching sales history: ' + error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSalesHistory();
  }, [message, searchText, dateRange, statusFilter, staffFilter, filterCategory, filterBrand, filterPaymentMethod]);

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
          shopLogo: profile?.shop_logo || null, // <--- NAYA IZAFA: Reprint par Logo ka URL shamil kiya
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
          // --- NAYA IZAFA: FBR Receipt Data ---
          fbrInvoiceNumber: sale.fbr_invoice_number,
          fbrFeeApplied: sale.fbr_fee_applied,
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

  // --- NAYA IZAFA: Sales Export Columns (Based on active View Mode) ---
  const getDynamicExportColumns = () => {
    if (historyViewMode === 'items') {
        return [
            { title: 'Date & Time', dataIndex: 'date_formatted' },
            { title: 'Invoice #', dataIndex: 'invoice_id' },
            { title: 'Product Name', dataIndex: 'product_name' },
            { title: 'Brand', dataIndex: 'brand' },
            { title: 'Quantity', dataIndex: 'quantity' },
            { title: 'Sale Price', dataIndex: 'price_formatted' },
            { title: 'Customer', dataIndex: 'customer_name' },
            { title: 'Salesperson', dataIndex: 'salesperson_name' }
        ];
    }
    if (historyViewMode === 'returns') {
        return [
            { title: 'Date & Time', dataIndex: 'date_formatted' },
            { title: 'Original Inv #', dataIndex: 'invoice_id' },
            { title: 'Product Name', dataIndex: 'product_name' },
            { title: 'Brand', dataIndex: 'brand' },
            { title: 'Quantity', dataIndex: 'quantity' },
            { title: 'Refund Amount', dataIndex: 'refund_formatted' },
            { title: 'Condition', dataIndex: 'condition' },
            { title: 'Customer', dataIndex: 'customer_name' },
            { title: 'Staff', dataIndex: 'salesperson_name' },
            { title: 'Reason', dataIndex: 'reason' }
        ];
    }
    return [
        { title: 'Date & Time', dataIndex: 'formattedDate' },
        { title: 'Invoice #', dataIndex: 'invoice_id' },
        { title: 'Customer', dataIndex: 'customer_name' },
        { title: 'Total Items', dataIndex: 'total_items' },
        { title: 'Method', dataIndex: 'payment_method' },
        { title: 'Total Amount', dataIndex: 'total_formatted' },
        { title: 'Payment Status', dataIndex: 'payment_status' },
        { title: 'Salesperson', dataIndex: 'salesperson_name' },
        { title: 'Audit Remarks', dataIndex: 'notes' }
    ];
  };

  const getDynamicExportData = () => {
    const curr = profile?.currency || 'USD';
    if (historyViewMode === 'items') {
        return itemsSoldList.map(item => ({
            ...item,
            date_formatted: new Date(item.date).toLocaleString(),
            price_formatted: formatCurrency(item.price, curr)
        }));
    }
    if (historyViewMode === 'returns') {
        return returnsList.map(item => ({
            ...item,
            date_formatted: new Date(item.date).toLocaleString(),
            refund_formatted: formatCurrency(item.refund_amount, curr)
        }));
    }
    return sales.map(s => ({
        ...s,
        formattedDate: new Date(s.created_at).toLocaleString(),
        payment_status: s.payment_status.toUpperCase(),
        total_formatted: formatCurrency(s.total_amount, curr)
    }));
  };

  // 1. Columns for Invoices View (Regular History)
  const invoicesColumns = [
    {
      title: 'Inv: #',
      dataIndex: 'invoice_id',
      key: 'invoice_id',
      width: 110,
      render: (text, record) => <Text code strong>{text || record.sale_id.slice(0, 8)}</Text>
    },
    {
      title: 'Date & Time',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 140,
      render: (text) => dayjs(text).format('DD MMM YY, hh:mm A'),
    },
    { title: 'Customer', dataIndex: 'customer_name', key: 'customer_name', width: 200 },
    { title: 'Total Items', dataIndex: 'total_items', key: 'total_items', width: 100 },
    {
      title: 'Method',
      dataIndex: 'payment_method',
      key: 'payment_method',
      render: (method) => <Tag color={method === 'Cash' ? 'default' : 'cyan'}>{method || 'Cash'}</Tag>,
      width: 100,
    },
    {
      title: 'Total Amount',
      dataIndex: 'total_amount',
      key: 'total_amount',
      render: (amount) => formatCurrency(amount, profile?.currency),
      width: 110,
    },
    {
      title: 'Payment Status',
      dataIndex: 'payment_status',
      key: 'payment_status',
      render: (status) => (
        <Tag color={status === 'Paid' ? 'success' : 'error'}>
          {status.toUpperCase()}
        </Tag>
      ),
      width: 120,
    },
    { title: <div>Handled<br/>by</div>, dataIndex: 'salesperson_name', key: 'salesperson_name', width: 120 },
    {
      title: 'Note',
      dataIndex: 'notes',
      key: 'notes',
      width: 120,
      render: (notes) => notes ? (
        <Tooltip title={notes}>
          <Tag color="purple" style={{ cursor: 'pointer', margin: 0 }}>View Audit</Tag>
        </Tooltip>
      ) : <Text type="secondary">-</Text>
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 80,
      render: (_, record) => (
        <Space>
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

  // 2. Columns for Items Sold View
  const itemsColumns = [
    { title: 'Invoice #', dataIndex: 'invoice_id', key: 'inv_id', width: 110, render: (text) => <Text code strong>{text}</Text> },
    { title: 'Date & Time', dataIndex: 'date', key: 'date', width: 140, render: (text) => dayjs(text).format('DD MMM YY, hh:mm A') },
    { title: 'Product Name', dataIndex: 'product_name', key: 'p_name', width: 220, render: (text) => <Text strong>{text}</Text> },
    { title: 'Brand', dataIndex: 'brand', key: 'brand', width: 100 },
    { title: 'Qty Sold', dataIndex: 'quantity', key: 'qty', width: 90, render: (val) => <Tag color="blue">{val}</Tag> },
    { title: 'Sale Price', dataIndex: 'price', key: 'price', width: 110, render: (val) => formatCurrency(val, profile?.currency) },
    { title: 'Customer', dataIndex: 'customer_name', key: 'cust_name', width: 180 },
    { title: <div>Handled<br/>by</div>, dataIndex: 'salesperson_name', key: 'sp_name', width: 120 }
  ];

  // 3. Columns for Returns View
  const returnsColumns = [
    { title: 'Date & Time', dataIndex: 'date', key: 'date', width: 140, render: (text) => dayjs(text).format('DD MMM YY, hh:mm A') },
    { title: 'Original Inv #', dataIndex: 'invoice_id', key: 'inv_id', width: 110, render: (text) => <Text code strong>{text}</Text> },
    { title: 'Product Name', dataIndex: 'product_name', key: 'p_name', width: 220, render: (text) => <Text strong>{text}</Text> },
    { title: 'Brand', dataIndex: 'brand', key: 'brand', width: 100 },
    { title: 'Qty', dataIndex: 'quantity', key: 'qty', width: 110, render: (val) => <Tag color="orange">{val}</Tag> },
    { title: 'Refunded', dataIndex: 'refund_amount', key: 'refund', width: 110, render: (val) => <Text strong style={{ color: token.colorAmountNegative }}>{formatCurrency(val, profile?.currency)}</Text> },
    { title: 'Condition', dataIndex: 'condition', key: 'cond', width: 120, render: (text) => <Tag color={text === 'Resellable' ? 'green' : 'volcano'}>{text}</Tag> },
    { title: 'Customer', dataIndex: 'customer_name', key: 'cust_name', width: 180 },
    { title: <div>Handled<br/>by</div>, dataIndex: 'salesperson_name', key: 'sp_name', width: 120 },
    { title: 'Reason', dataIndex: 'reason', key: 'reason', ellipsis: true }
  ];

  return (
    <ConfigProvider theme={{ components: { Table: { colorBgContainer: token.colorTableBg, headerBg: token.colorTableHeaderBg, headerColor: token.colorCardColumnsTitleText, colorText: token.colorCardDetailsText } } }}>
    <div style={{ padding: isMobile ? '12px 0' : '4px 0' }}>
      {isMobile && (
        <Title level={2} style={{ marginBottom: '16px', marginLeft: '8px', fontSize: '23px' }}>
          <HistoryOutlined /> Sales History
        </Title>
      )}
      <Card style={{ background: token.colorCardBg, border: `1px solid ${token.colorCardBorder}`, boxShadow: `0 4px 12px ${token.colorCardShadow}` }} styles={{ body: { paddingTop: '16px' } }}> {/* <--- NAYA IZAFA: Extra header aur spacing khatam karke space save ki */}
        <Space wrap style={{ marginBottom: '18px', width: '100%', justifyContent: 'space-between' }}>
          <Space wrap>
            {/* NAYA IZAFA: Radio buttons ki jagah compact Dropdown switcher lagaya, space bachaane ke liye */}
            <Select
              value={historyViewMode}
              onChange={(v) => {
                  setHistoryViewMode(v);
                  setStatusFilter('all');
              }}
              style={{ width: 160 }}
              styles={{ popup: { root: { zIndex: 2000 } } }}
            >
              <Select.Option value="invoices">Invoices View</Select.Option>
              <Select.Option value="items">Items Sold View</Select.Option>
              <Select.Option value="returns">Returns View</Select.Option>
            </Select>

            <Input.Search
              ref={searchInputRef}
              placeholder={historyViewMode === 'items' ? "Search Product or Customer..." : "Invoice #, Customer or IMEI..."}
              allowClear
              value={searchText}
              onSearch={value => setSearchText(value)}
              onChange={e => setSearchText(e.target.value)}
              style={{ width: 220 }}
            />
            
            {/* NAYA IZAFA: Compact Quick Period Selector (Default: This Month) */}
            <Select
              value={historyDateRangeType}
              onChange={(val) => {
                  setHistoryDateRangeType(val);
                  const now = dayjs();
                  if (val === 'today') {
                      setDateRange([now.startOf('day'), now.endOf('day')]);
                  } else if (val === 'week') {
                      setDateRange([now.startOf('week'), now.endOf('day')]);
                  } else if (val === 'this_month') {
                      setDateRange([now.startOf('month'), now.endOf('month')]);
                  } else if (val === 'all') {
                      setDateRange(null); // All Time (capped to 500)
                  }
              }}
              style={{ width: 130 }}
              styles={{ popup: { root: { zIndex: 2000 } } }}
            >
              <Select.Option value="this_month">This Month</Select.Option>
              <Select.Option value="today">Today</Select.Option>
              <Select.Option value="week">This Week</Select.Option>
              <Select.Option value="all">All Time</Select.Option>
              <Select.Option value="custom">Custom Range</Select.Option>
            </Select>

            {historyDateRangeType === 'custom' && (
              <DatePicker.RangePicker 
                value={dateRange}
                onChange={(values) => setDateRange(values)}
                style={{ width: 250 }}
              />
            )}

            {historyViewMode === 'invoices' && (
              <Select 
                value={statusFilter}
                style={{ width: 120 }} 
                onChange={value => setStatusFilter(value)}
                options={[
                  { value: 'all', label: 'All Status' },
                  { value: 'Paid', label: 'Paid' },
                  { value: 'Unpaid', label: 'Unpaid' },
                ]}
              />
            )}
            <Select 
              value={staffFilter}
              style={{ width: 130 }} 
              onChange={value => setStaffFilter(value)}
              placeholder="Staff"
              options={[
                { value: 'all', label: 'All Staff' },
                ...staffList.map(staff => ({ value: staff.id, label: staff.name }))
              ]}
            />
          </Space>
          
          <Space>
            {/* Reset Button */}
            <Tooltip title="Reset Filters">
                <Button 
                  icon={<UndoOutlined />} 
                  onClick={() => {
                    setSearchText('');
                    setHistoryDateRangeType('this_month'); // <--- NAYA IZAFA: Reset to default month
                    setDateRange([dayjs().startOf('month'), dayjs().endOf('month')]); // <--- NAYA IZAFA: Reset to default dates
                    setStatusFilter('all');
                    setStaffFilter('all');
                    setFilterCategory(null);
                    setFilterBrand(null);
                    setFilterPaymentMethod('all');
                  }}
                />
            </Tooltip>

            {/* Advanced Filters Toggle */}
            <Tooltip title="Advanced Filters (Brand, Category, Method)">
                <Button 
                  icon={<FilterOutlined />} 
                  type={showAdvancedFilters ? 'primary' : 'default'}
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                />
            </Tooltip>

            {/* Excel / Print DataExport */}
            <DataExport 
              data={getDynamicExportData()} 
              exportColumns={getDynamicExportColumns()} 
              fileName={historyViewMode === 'invoices' ? "Invoices_History" : (historyViewMode === 'items' ? "Items_Sold_History" : "Returns_History")} 
              reportTitle={historyViewMode === 'invoices' ? "Sales Invoices Ledger Report" : (historyViewMode === 'items' ? "Sales Items Ledger Report" : "Sales Returns Ledger Report")} 
            />
          </Space>
        </Space>

        {/* --- NAYA IZAFA: Collapsible Advanced Filters UI (Brand, Category, Payment Method) --- */}
        {showAdvancedFilters && (
            <Card size="small" style={{ marginBottom: '20px', background: token.colorFillAlter, border: `1px dashed ${token.colorCardBorder}` }}>
                <Row gutter={[16, 8]}>
                    <Col xs={12} sm={8} md={6}>
                        <Text type="secondary" style={{ fontSize: '11px', display: 'block', marginBottom: '4px' }}>Product Category</Text>
                        <Select
                            showSearch
                            allowClear
                            style={{ width: '100%' }}
                            placeholder="Any Category"
                            value={filterCategory}
                            onChange={setFilterCategory}
                            filterOption={(input, option) =>
                              (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                            }
                        >
                            {categories.map(c => <Select.Option value={c.id} key={c.id}>{c.name}</Select.Option>)}
                        </Select>
                    </Col>
                    <Col xs={12} sm={8} md={6}>
                        <Text type="secondary" style={{ fontSize: '11px', display: 'block', marginBottom: '4px' }}>Product Brand</Text>
                        <Select
                            showSearch
                            allowClear
                            style={{ width: '100%' }}
                            placeholder="Any Brand"
                            value={filterBrand}
                            onChange={setFilterBrand}
                            filterOption={(input, option) =>
                              (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                            }
                        >
                            {brands.map(b => <Select.Option value={b} key={b}>{b}</Select.Option>)}
                        </Select>
                    </Col>
                    {historyViewMode === 'invoices' && (
                        <Col xs={12} sm={8} md={6}>
                            {/* NAYA IZAFA: Hardcoded 'Methods' ki jagah settings se actual Accounts load karwaye */}
                            <Text type="secondary" style={{ fontSize: '11px', display: 'block', marginBottom: '4px' }}>Payment Account</Text>
                            <Select
                                style={{ width: '100%' }}
                                value={filterPaymentMethod}
                                onChange={setFilterPaymentMethod}
                                styles={{ popup: { root: { zIndex: 2000 } } }}
                            >
                                <Select.Option value="all">All Accounts</Select.Option>
                                <Select.Option value="Cash">Cash</Select.Option> {/* <--- NAYA IZAFA: Sahi static 'Cash' option taake filter mukammal ho */}
                                {accountsList.map(acc => (
                                    <Select.Option value={acc.name} key={acc.id}>{acc.name}</Select.Option>
                                ))}
                            </Select>
                        </Col>
                    )}
                </Row>
            </Card>
        )}

        <Table
          columns={historyViewMode === 'items' ? itemsColumns : (historyViewMode === 'returns' ? returnsColumns : invoicesColumns)}
          dataSource={historyViewMode === 'items' ? itemsSoldList : (historyViewMode === 'returns' ? returnsList : sales)}
          loading={loading}
          rowKey={(record) => record.id || record.sale_id}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 'max-content' }}
        />
      </Card>
    </div>
    </ConfigProvider>
  );
};

export default SalesHistory;