import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Typography, Table, Button, Modal, Form, Input, App as AntApp, Space, Spin, InputNumber, Card, Descriptions, Checkbox, List, Row, Col, Divider, Radio, Tag, Dropdown, Menu, Tooltip, Select
} from 'antd';
import { UserSwitchOutlined, UserAddOutlined, EyeOutlined, DollarCircleOutlined, SwapOutlined, MoreOutlined, EditOutlined, ReloadOutlined, InboxOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { formatCurrency } from '../utils/currencyFormatter';
import { db } from '../db';
import { useSync } from '../context/SyncContext';
import DataService from '../DataService';

const { Title, Text } = Typography;
// Global Countries List
const countries = [
  { label: 'Pakistan', value: 'Pakistan' },
  { label: 'India', value: 'India' },
  { label: 'United Arab Emirates', value: 'UAE' },
  { label: 'Saudi Arabia', value: 'Saudi Arabia' },
  { label: 'United Kingdom', value: 'UK' },
  { label: 'United States', value: 'USA' },
  { label: 'Australia', value: 'Australia' },
  { label: 'Canada', value: 'Canada' },
  // Aap baad mein mazeed countries yahan add kar sakte hain
];

const Customers = () => {
  const { message, modal } = AntApp.useApp();
  const [searchParams] = useSearchParams();
  const searchInputRef = useRef(null);
  const invoiceSearchInputRef = useRef(null);
  const customerNameInputRef = useRef(null);

  const isMobile = useMediaQuery('(max-width: 768px)');
  const { user, profile } = useAuth();
  const { processSyncQueue } = useSync();
  
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isLedgerModalOpen, setIsLedgerModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [ledgerData, setLedgerData] = useState([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedSale, setSelectedSale] = useState(null);
  const [returnableItems, setReturnableItems] = useState([]);
  const [selectedReturnItems, setSelectedReturnItems] = useState([]);
  const [isReturnSubmitting, setIsReturnSubmitting] = useState(false);
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [isInvoiceSearchModalOpen, setIsInvoiceSearchModalOpen] = useState(false);
  const [invoiceSearchForm] = Form.useForm();
  const [searchedSale, setSearchedSale] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [payoutForm] = Form.useForm();
  
  const [addForm] = Form.useForm();
  const [cashOrBank, setCashOrBank] = useState('Cash');
  const [paymentForm] = Form.useForm();
  const [returnForm] = Form.useForm();
  const [returnHistory, setReturnHistory] = useState([]);
  const [refundCashNow, setRefundCashNow] = useState(false);
  const [returnFee, setReturnFee] = useState(0);
  const maxAllowedFee = useMemo(() => {
    const gross = selectedReturnItems.reduce((sum, i) => sum + (i.return_qty * i.price_at_sale), 0);
    const ratio = (selectedSale?.discount || 0) / (selectedSale?.subtotal || 1);
    return Number((gross - (gross * ratio)).toFixed(2));
  }, [selectedReturnItems, selectedSale]);

  // --- FOCUS LOGIC (Corrected Position) ---
  useEffect(() => {
    const timer = setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isInvoiceSearchModalOpen) {
      const timer = setTimeout(() => {
        invoiceSearchInputRef.current?.focus();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isInvoiceSearchModalOpen]);
  useEffect(() => {
    if (isAddModalOpen) {
      const timer = setTimeout(() => {
        customerNameInputRef.current?.focus();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isAddModalOpen]);

  const getCustomers = async () => {
    try {
      setLoading(true);
      let data = await db.customers.toArray();
      
      // 1. Archive Filter
      data = data.filter(c => showArchived ? c.is_active === false : c.is_active !== false);

      // 2. Search Filter (Name ya Phone se dhoondna)
      if (searchTerm) {
        const lowerSearch = searchTerm.toLowerCase();
        data = data.filter(c => 
          (c.name && c.name.toLowerCase().includes(lowerSearch)) || 
          (c.phone_number && c.phone_number.includes(lowerSearch))
        );
      }
      
      setCustomers(data.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (error) { 
      message.error('Error fetching customers: ' + error.message); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { if (user) getCustomers(); }, [user, showArchived, refreshTrigger, searchTerm]);
  // Dashboard shortcut ke liye logic
  useEffect(() => {
    if (searchParams.get('openReturn') === 'true') {
      setIsInvoiceSearchModalOpen(true);
    }
  }, [searchParams]);

  const showEditModal = (customer) => {
    setEditingCustomer(customer);
    addForm.setFieldsValue(customer);
    setIsAddModalOpen(true);
  };

  const handleAddCustomer = async (values) => {
    // 1. Phone number ki safai (Normalize) taake database saaf rahe
    if (values.phone_number) {
      values.phone_number = values.phone_number.replace(/[^\d+]/g, '');
    }

    try {
      // 2. SMART DUPLICATE CHECK (Aakhri 10 digits wala)
      const existingCustomerName = await DataService.checkDuplicateCustomer(values.phone_number, editingCustomer?.id);
      if (existingCustomerName) {
        addForm.setFields([
          {
            name: 'phone_number',
            errors: [`Registered to: ${existingCustomerName}`],
          },
        ]);
        return;
      }
      if (editingCustomer) {
        // EDIT MODE
        await DataService.updateCustomer(editingCustomer.id, values);
        message.success('Customer updated successfully!');
      } else {
        // ADD MODE
        const newCustomer = { 
            ...values, 
            id: crypto.randomUUID(), 
            local_id: crypto.randomUUID(),
            user_id: user.id, 
            balance: 0 
        };
        await db.customers.add(newCustomer);
        await db.sync_queue.add({
            table_name: 'customers',
            action: 'create',
            data: newCustomer
        });
        message.success('Customer added successfully!');
      }

      setIsAddModalOpen(false);
      setEditingCustomer(null);
      addForm.resetFields();
      await getCustomers();
      processSyncQueue();

    } catch (error) { 
      message.error('Error saving customer: ' + error.message); 
    }
  };

  const showPaymentModal = (customer) => {
    setSelectedCustomer(customer);
    paymentForm.setFieldsValue({ amount: customer.balance > 0 ? customer.balance : 1 });
    setIsPaymentModalOpen(true);
  };
  const handlePaymentCancel = () => { setIsPaymentModalOpen(false); paymentForm.resetFields(); };
  
  const handleReceivePayment = async (values) => {
    try {
      const paymentData = { 
          id: crypto.randomUUID(),
          local_id: crypto.randomUUID(),
          customer_id: selectedCustomer.id, 
          amount_paid: values.amount, 
          payment_method: cashOrBank,
          user_id: user.id,
          created_at: new Date().toISOString()
      };

      // 1. Local DB mein save karein (TAAKE LEDGER MEIN FORAN AAYE)
      await db.customer_payments.add(paymentData);
      
      // 2. Sync Queue mein daalein
      await db.sync_queue.add({
          table_name: 'customer_payments',
          action: 'create',
          data: paymentData
      });

      // 3. Balance Update (UI)
      const currentCustomer = await db.customers.get(selectedCustomer.id);
      if (currentCustomer) {
          const newBalance = (currentCustomer.balance || 0) - values.amount;
          await db.customers.update(selectedCustomer.id, { balance: newBalance });
          
          setCustomers(prev => prev.map(c => 
              c.id === selectedCustomer.id ? { ...c, balance: newBalance } : c
          ));
      }

      message.success('Payment received successfully!');
      handlePaymentCancel();
      processSyncQueue();

    } catch (error) { 
        message.error('Failed to receive payment: ' + error.message); 
    }
  };

  // >> YEH TEEN NAYE FUNCTIONS PASTE KAREIN <<

  // Yeh function "Settle Credit" ka popup kholega
  const showPayoutModal = (customer) => {
    setSelectedCustomer(customer);
    // Math.abs() negative number ko positive bana deta hai
    payoutForm.setFieldsValue({ amount: Math.abs(customer.balance) });
    setIsPayoutModalOpen(true);
  };

  // Yeh function popup ko cancel karega
  const handlePayoutCancel = () => {
    setIsPayoutModalOpen(false);
    payoutForm.resetFields();
  };

  const handleConfirmPayout = async (values) => {
    try {
      const payoutData = { 
          id: crypto.randomUUID(),
          local_id: crypto.randomUUID(),
          customer_id: selectedCustomer.id, 
          amount_paid: values.amount, 
          payment_method: cashOrBank,
          remarks: values.remarks,
          user_id: user.id,
          created_at: new Date().toISOString()
      };

      // 1. Local DB mein save karein
      await db.credit_payouts.add(payoutData);
      
      // 2. Sync Queue mein daalein
      await db.sync_queue.add({
          table_name: 'credit_payouts',
          action: 'create',
          data: payoutData
      });

      // 3. Balance Update (UI & Local DB)
      // Payout ka matlab hai hum ne customer ko paise diye, to uska balance barh jayega (ya negative balance kam ho jayega)
      const currentCustomer = await db.customers.get(selectedCustomer.id);
      if (currentCustomer) {
          const newBalance = (currentCustomer.balance || 0) + values.amount;
          await db.customers.update(selectedCustomer.id, { balance: newBalance });
          
          setCustomers(prev => prev.map(c => 
              c.id === selectedCustomer.id ? { ...c, balance: newBalance } : c
          ));
      }

      message.success('Credit settled successfully!');
      handlePayoutCancel();
      processSyncQueue();

    } catch (error) {
      message.error('Failed to settle credit: ' + error.message);
    }
  };

  const handleDeleteCustomer = (customer) => {
    modal.confirm({
      title: 'Delete Customer?',
      icon: <DeleteOutlined />,
      content: `Are you sure you want to delete ${customer.name}? This cannot be undone.`,
      okText: 'Yes, Delete',
      okType: 'danger',
      onOk: async () => {
        try {
          await DataService.deleteCustomer(customer.id);
          message.success('Customer deleted');
          setRefreshTrigger(prev => prev + 1);
        } catch (error) {
          message.error(error.message);
        }
      }
    });
  };

  const handleToggleArchive = async (customer) => {
    try {
      await DataService.toggleArchiveCustomer(customer.id, !showArchived);
      message.success(showArchived ? 'Customer restored' : 'Customer archived');
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      message.error(error.message);
    }
  };

  const handleSearchInvoice = async (values) => {
    try {
      setIsSearching(true);
      setSearchedSale(null); 

      let searchInput = values.invoiceId; 
      
      // Smart Scan Cleanup
      if (typeof searchInput === 'string' && searchInput.toUpperCase().startsWith('INV:')) {
          searchInput = searchInput.split(':')[1];
      }

      // Pehle 'invoice_id' (A-1234) se dhoondein
      let saleData = await db.sales.where('invoice_id').equals(searchInput).first();
      
      // Agar nahi mila, to shayad user ne lamba UUID dala ho, us se check karein
      if (!saleData) {
          saleData = await db.sales.get(searchInput);
      }

      if (!saleData) {
        message.error(`Invoice ID #${searchInput} not found locally.`);
        setIsSearching(false);
        return;
      }

      // Details Jama Karein
      const customer = await db.customers.get(saleData.customer_id);
      const saleItems = await db.sale_items.where('sale_id').equals(saleData.id).toArray();

      const itemsWithDetails = await Promise.all(saleItems.map(async (item) => {
          const product = await db.products.get(item.product_id);
          const inventory = await db.inventory.get(item.inventory_id);
          
          return {
              ...item,
              product: product || { name: 'Unknown Product' },
              inventory: inventory || {}
          };
      }));

      const fullSaleObject = {
          ...saleData,
          customer: customer || { id: saleData.customer_id, name: 'Walk-in Customer' },
          sale_items: itemsWithDetails
      };

      setSearchedSale(fullSaleObject);

    } catch (error) {
      console.error("Invoice search failed:", error);
      message.error("Search failed: " + error.message);
    } finally {
      setIsSearching(false);
    }
  };

const handleCloseInvoiceSearchModal = () => {
  setIsInvoiceSearchModalOpen(false);
  invoiceSearchForm.resetFields();
  setSearchedSale(null);
};
  
  const openReturnModal = async (sale) => {
    try {
      setIsReturnModalOpen(true);
      setSelectedSale(sale);

      // 1. Sale Items layein (Jo asli bill mein thay)
      const soldItems = await db.sale_items.where('sale_id').equals(sale.id).toArray();

      // 2. Pehle se kitne units return ho chuke hain, unka hisaab lagayein
      const previousReturns = await db.sale_returns.where('sale_id').equals(sale.id).toArray();
      const returnTotals = {}; // { inventory_id: total_returned_qty }

      if (previousReturns.length > 0) {
          const retIds = previousReturns.map(r => r.id);
          const retItems = await db.sale_return_items.filter(ri => retIds.includes(ri.return_id)).toArray();
          retItems.forEach(ri => {
              returnTotals[ri.inventory_id] = (returnTotals[ri.inventory_id] || 0) + (ri.quantity || 1);
          });
      }

      // 3. Sirf wo items dikhayein jin ki bachi hui quantity 0 se zyada ho
      const itemsWithDetails = [];
      for (const item of soldItems) {
          const alreadyReturned = returnTotals[item.inventory_id] || 0;
          const originalSoldQty = item.quantity || 1;
          const remainingToReturn = originalSoldQty - alreadyReturned;

          if (remainingToReturn > 0) {
              const product = await db.products.get(item.product_id);
              const inventory = await db.inventory.get(item.inventory_id);
              
              itemsWithDetails.push({
                sale_item_id: item.id,
                inventory_id: item.inventory_id,
                product_id: item.product_id,
                product_name: product ? product.name : 'Unknown Product',
                imei: inventory ? inventory.imei : '',
                item_attributes: inventory ? inventory.item_attributes : {},
                price_at_sale: item.price_at_sale,
                quantity: remainingToReturn // YEH HAI FIX: Ab modal mein sirf bachi hui qty nazar aayegi
              });
          }
      }

      setReturnableItems(itemsWithDetails);
      if (selectedCustomer && selectedCustomer.name === 'Walk-in Customer') {
          setRefundCashNow(true);
      } else {
          setRefundCashNow(false);
      }
      
    } catch (error) {
      console.error(error);
      message.error("Error preparing return: " + error.message);
      setIsReturnModalOpen(false);
    }
  };

  const handleReturnCancel = () => { 
    setIsReturnModalOpen(false); 
    setSelectedSale(null); 
    setReturnableItems([]); 
    setSelectedReturnItems([]); 
    returnForm.resetFields();
    setRefundCashNow(false);
  };

  const handleConfirmReturn = async (values) => {

    if (selectedReturnItems.length === 0) {
      message.warning("Please select at least one item.");
      return;
    }

    if (!user || !user.id) {
      message.error("User session is invalid. Please log in again.");
      return;
    }

    try {
      setIsReturnSubmitting(true);
      
      // 1. Return Record Banayein
      const returnId = crypto.randomUUID();
      const returnRecord = {
          id: returnId,
          local_id: returnId,
          sale_id: selectedSale.id,
          customer_id: selectedSale.customer_id,
          total_refund_amount: refundCashNow ? maxCashRefundable : totalRefundAmount,
          return_fee: returnFee,
          reason: values.reason,
          user_id: user.id,
          created_at: new Date().toISOString()
      };

      // 2. Return Items Banayein
      const itemsToInsert = selectedReturnItems.map(i => ({
          id: crypto.randomUUID(),
          return_id: returnId,
          inventory_id: i.inventory_id,
          product_id: i.product_id,
          price_at_return: i.price_at_sale,
          quantity: i.return_qty 
      }));

      // 3. Payment (Credit) Record Banayein (Yeh hamesha banega taake Ledger maintain rahe)
      const paymentId = crypto.randomUUID();
      const paymentRecord = {
        id: paymentId,
        local_id: paymentId,
        customer_id: selectedSale.customer_id,
        amount_paid: -totalRefundAmount, // Negative amount for credit
        user_id: user.id,
        remarks: `Refund for Invoice #${selectedSale.id}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // 4. Local DB mein Save karein
      await db.sale_returns.add(returnRecord);
      if (db.sale_return_items) await db.sale_return_items.bulkAdd(itemsToInsert);
      await db.customer_payments.add(paymentRecord);

      // 5. Inventory Update
      const inventoryIdsToUpdate = itemsToInsert.map(i => i.inventory_id); 
      for (const item of itemsToInsert) {
          const invItem = await db.inventory.get(item.inventory_id);
          if (invItem) {
              if (invItem.imei) {
                  await db.inventory.update(item.inventory_id, { status: 'Available', available_qty: 1, sold_qty: 0 });
              } else {
                  const qtyReturned = item.quantity || 1;
                  await db.inventory.update(item.inventory_id, { 
                      available_qty: (invItem.available_qty || 0) + qtyReturned, 
                      sold_qty: Math.max(0, (invItem.sold_qty || 0) - qtyReturned),
                      status: 'Available' 
                  });
              }
          }
      }

      // 6. Balance Update (Step 1: Credit dena)
      let currentCustomer = await db.customers.get(selectedSale.customer_id);
      let newBalance = (currentCustomer.balance || 0) - totalRefundAmount; // Credit diya
      
      // --- NAYA LOGIC: Checkbox Check ---
      let payoutRecord = null;
      if (refundCashNow) {
          // Agar user ne kaha "Abhi Cash Wapis Karo"
          const payoutId = crypto.randomUUID();
          payoutRecord = {
              id: payoutId,
              local_id: payoutId,
              customer_id: selectedSale.customer_id,
              amount_paid: maxCashRefundable, // <--- AB YEH SIRF JAYEZ CASH WAPAS KAREGA
              payment_method: 'Cash',
              remarks: `Auto-Refund for Return #${returnId}`,
              user_id: user.id,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };

          // Payout Save Karein
          await db.credit_payouts.add(payoutRecord);
          
          /// Balance wapis barha dein (Jitna cash asliyat mein diya sirf utna balance mein wapis jurega)
          newBalance = newBalance + maxCashRefundable; 
      }

      // Final Balance Save Karein
      await db.customers.update(selectedSale.customer_id, { balance: newBalance });
      setCustomers(prev => prev.map(c => 
          c.id === selectedSale.customer_id ? { ...c, balance: newBalance } : c
      ));

      // 7. Sync Queue Update
      await db.sync_queue.add({
          table_name: 'sale_returns',
          action: 'create_full_return',
          data: {
              return_record: returnRecord,
              items: itemsToInsert,
              payment_record: paymentRecord,
              inventory_ids: inventoryIdsToUpdate,
              // Agar payout hua hai to wo bhi bhejein (Server ko handle karna hoga ya alag queue item banana hoga)
              // Behtar hai hum Payout ko alag queue item banayein taake server logic simple rahe
          }
      });

      // Agar Payout hua hai to usay bhi Queue mein daalein
      if (payoutRecord) {
          await db.sync_queue.add({
              table_name: 'credit_payouts',
              action: 'create',
              data: payoutRecord
          });
      }

      message.success(`Return successful! ${refundCashNow ? 'Cash refunded.' : 'Credit added.'}`);
      handleReturnCancel();
      
      if (selectedCustomer) {
          handleViewLedger(selectedCustomer);
      }
      
      processSyncQueue();

    } catch (error) {
      message.error("Failed to process return: " + error.message);
    } finally {
      setIsReturnSubmitting(false);
    }
  };
  
  const { totalRefundAmount, debtOnInvoice, maxCashRefundable } = useMemo(() => {
    const grossRefund = selectedReturnItems.reduce((sum, i) => sum + (i.return_qty * i.price_at_sale), 0);
    const subtotal = selectedSale?.subtotal || grossRefund || 1;
    const discountRatio = (selectedSale?.discount || 0) / subtotal;
    const refundDiscount = grossRefund * discountRatio;
    const netRefundable = grossRefund - refundDiscount;
    const finalRefund = Math.max(0, netRefundable - returnFee);

    // Naya Hisaab: Is invoice par kitna udhaar baki tha?
    const invoiceTotal = selectedSale?.total_amount || 0;
    const invoicePaid = selectedSale?.amount_paid_at_sale || 0;
    const unpaidOnInvoice = Math.max(0, invoiceTotal - invoicePaid);

    // Dukandar sirf utna cash wapas kar sakta hai jitna udhaar se zyada ho
    const maxCash = Math.max(0, finalRefund - unpaidOnInvoice);

    return { 
      totalRefundAmount: finalRefund, 
      debtOnInvoice: unpaidOnInvoice, 
      maxCashRefundable: maxCash 
    };
  }, [selectedReturnItems, selectedSale, returnFee]);
  

  const handleViewLedger = async (customer) => {
    setSelectedCustomer(customer);
    setIsLedgerModalOpen(true);
    try {
        setLedgerLoading(true);

        // 1. Data Fetching
        const sales = await db.sales.where('customer_id').equals(customer.id).toArray();
        const payments = await db.customer_payments.where('customer_id').equals(customer.id).toArray();
        const payouts = await db.credit_payouts.where('customer_id').equals(customer.id).toArray();
        const returns = await db.sale_returns.where('customer_id').equals(customer.id).toArray();
        const allReturnItems = await db.sale_return_items.toArray();
        
        // --- OPTIMIZED CODE (BATCH FETCHING) ---
        // 1. Saare Items, Products aur Inventory ko pehle hi ek saath mangwa lein
        const saleIds = sales.map(s => s.id);
        const allSaleItems = await db.sale_items.where('sale_id').anyOf(saleIds).toArray();
        
        const productIds = allSaleItems.map(i => i.product_id);
        const inventoryIds = allSaleItems.map(i => i.inventory_id);

        const [allProducts, allInventory] = await Promise.all([
            db.products.where('id').anyOf(productIds).toArray(),
            db.inventory.where('id').anyOf(inventoryIds).toArray()
        ]);

        // 2. Maps banayein taake loop mein dhoondne mein waqt na lage
        const productMap = {};
        allProducts.forEach(p => productMap[p.id] = p);
        
        const inventoryMap = {};
        allInventory.forEach(i => inventoryMap[i.id] = i);

        // 3. Memory mein data jorein (Ab yahan koi 'await' nahi hai, yeh foran hoga)
        const salesWithDetails = sales.map(sale => {
            const items = allSaleItems.filter(i => i.sale_id === sale.id);
            const itemsWithFullDetails = items.map(item => ({
                ...item,
                products: productMap[item.product_id] || { name: 'Unknown Product' },
                inventory: inventoryMap[item.inventory_id] || {}
            }));
            return { ...sale, sale_items: itemsWithFullDetails };
        });
        // --- OPTIMIZATION END ---

        // Return history logic
        const history = [];
        for (const ret of returns) {
            const items = allReturnItems.filter(ri =>
                String(ri.return_id) === String(ret.id) ||
                (ret.local_id && String(ri.return_id) === String(ret.local_id))
            );
            const itemsWithFullDetails = await Promise.all(items.map(async (ri) => {
                const product = await db.products.get(ri.product_id);
                const inventory = await db.inventory.get(ri.inventory_id);
                return {
                    ...ri,
                    products: product || { name: 'Unknown Product' },
                    inventory: inventory || {},
                    sale_id: ret.sale_id
                };
            }));
            history.push(...itemsWithFullDetails);
        }
        setReturnHistory(history);

        // 2. Transactions Banana
        
        // Note: Yahan hum 'sales' ki bajaye 'salesWithDetails' use kar rahe hain
        const salesTx = salesWithDetails.map(s => ({ 
            type: 'sale', date: s.created_at || s.sale_date, 
            description: `Sale (Invoice #${s.invoice_id || s.id})`, 
            debit: (s.total_amount || 0) - (s.amount_paid_at_sale || 0), 
            credit: 0, details: s 
        }));

        const paymentsTx = payments.map(p => {
            const isReturn = p.amount_paid < 0;
            let description = 'Payment Received';
            let returnDetails = null;

            if (isReturn) {
                const relatedReturn = returns.find(r => 
                    r.id === p.local_id || r.id === p.id || 
                    (Math.abs(new Date(r.created_at) - new Date(p.created_at)) < 5000)
                );
                
                if (relatedReturn) {
                    // Asal Sale dhoond kar uska chota ID (P-2020) nikalein
                    const originalSale = sales.find(s => s.id === relatedReturn.sale_id);
                    const displayId = originalSale ? (originalSale.invoice_id || originalSale.id) : relatedReturn.sale_id;

                    const feeText = relatedReturn.return_fee > 0 ? ` (Fee: ${formatCurrency(relatedReturn.return_fee, profile?.currency)} deducted)` : '';
                    description = `Return Credit (Inv #${displayId})${feeText}`;
                    const itemsFromHistory = history.filter(h => 
                        String(h.return_id) === String(relatedReturn.id)
                    );
                    returnDetails = {
                        ...relatedReturn,
                        sale_return_items: itemsFromHistory
                    };
                } else {
                    description = `Return Credit`;
                }
            }

            return {
                type: isReturn ? 'return' : 'payment',
                date: p.created_at,
                description: description,
                debit: 0,
                credit: Math.abs(p.amount_paid),
                details: { ...p, return_details: returnDetails }
            };
        });

        const payoutsTx = payouts.map(p => ({
            type: 'payout',
            date: p.created_at,
            description: `Cash Refund / Payout`,
            debit: Number(p.amount_paid),
            credit: 0,
            details: p
        }));

        // 3. Merge & Sort
        const allTx = [...salesTx, ...paymentsTx, ...payoutsTx].sort((a, b) => new Date(a.date) - new Date(b.date));
        
        let runningBalance = 0;
        const finalLedger = allTx.map(tx => {
            runningBalance += tx.debit - tx.credit;
            return { ...tx, balance: runningBalance, key: `${tx.type}-${tx.details.id}` };
        });

        setLedgerData(finalLedger.reverse());
    } catch (error) {
        message.error('Error fetching ledger: ' + error.message);
    } finally {
        setLedgerLoading(false);
    }
};

  const customerColumns = [
    { title: 'Customer Name', dataIndex: 'name' },
    { title: 'Phone', dataIndex: 'phone_number' },
    { title: 'Address', dataIndex: 'address', render: (address) => address || <Text type="secondary">N/A</Text> },
    { title: 'Balance', dataIndex: 'balance', align: 'right', render: (b) => <Text type={b > 0 ? 'danger' : 'success'}>{formatCurrency(b, profile?.currency)}</Text> },
    // Is hisse ko dhoond kar replace karein
    { 
      title: 'Actions', 
      key: 'actions', 
      render: (_, record) => (
        <Space>
          <Button icon={<EyeOutlined />} onClick={() => handleViewLedger(record)}>Ledger</Button>
          
          {/* --- NAYA CONDITIONAL LOGIC --- */}
          {record.balance > 0 ? (
            <Button icon={<DollarCircleOutlined />} onClick={() => showPaymentModal(record)}>
              Payment receive
            </Button>
          ) : record.balance < 0 ? (
            <Button type="primary" ghost icon={<DollarCircleOutlined />} onClick={() => showPayoutModal(record)}>
              Settle Credit
            </Button>
          ) : null}

          <Dropdown 
            trigger={['click']}
            menu={{
              items: [
                {
                  key: 'edit',
                  label: 'Edit Details',
                  icon: <EditOutlined />,
                  // Agar naam "Walk-in Customer" hai to Edit band kar dein
                  disabled: record.name === 'Walk-in Customer', 
                  onClick: () => showEditModal(record)
                },
                {
                  key: 'archive',
                  label: showArchived ? 'Restore Customer' : 'Archive Customer',
                  icon: showArchived ? <ReloadOutlined /> : <InboxOutlined />,
                  // Walk-in ko archive bhi nahi karne dena chahiye
                  disabled: record.name === 'Walk-in Customer', 
                  onClick: () => handleToggleArchive(record)
                },
                {
                  key: 'delete',
                  label: 'Delete Customer',
                  icon: <DeleteOutlined />,
                  danger: true,
                  // Walk-in ko delete karna sakht mana hai
                  disabled: record.name === 'Walk-in Customer', 
                  onClick: () => handleDeleteCustomer(record)
                }
              ]
            }}
          >
            <Button type="text" icon={<MoreOutlined style={{ fontSize: '20px' }} />} />
          </Dropdown>
        </Space>
      ) 
    }
];
  
  const expandedRowRender = (record) => {
    const renderItemDetails = (_, item) => {
      if (!item.inventory) return <Text type="secondary">N/A</Text>;
      
      const attributes = Object.entries(item.inventory.item_attributes || {})
        .filter(([key]) => !key.toLowerCase().includes('imei') && !key.toLowerCase().includes('serial'))
        .map(([, value]) => value)
        .join(' ');

      const details = [item.inventory.imei, attributes].filter(Boolean).join(' / ');
      
      return <Text type="secondary">{details || 'N/A'}</Text>;
    };

    if (record.type === 'sale') {
      // --- NAYA GROUPING LOGIC START ---
      const groupedItemsMap = new Map();

      record.details.sale_items.forEach(item => {
          // Grouping Key: Product ID + Price + Attributes (IMEI nikaal kar)
          const attrs = { ...(item.inventory?.item_attributes || {}) };
          delete attrs['Serial / IMEI']; 
          delete attrs['IMEI'];
          delete attrs['Serial Number'];
          
          const key = `${item.product_id}-${item.price_at_sale}-${JSON.stringify(attrs)}`;

          if (groupedItemsMap.has(key)) {
              const existing = groupedItemsMap.get(key);
              existing.quantity += (item.quantity || 1);
              if (item.inventory?.imei) existing.all_imeis.push(item.inventory.imei);
              // Tamam inventory IDs jama karein taake Return ka hisaab sahi ho
              existing.all_inventory_ids.push(item.inventory_id);
          } else {
              groupedItemsMap.set(key, {
                  ...item,
                  quantity: (item.quantity || 1),
                  all_imeis: item.inventory?.imei ? [item.inventory.imei] : [],
                  all_inventory_ids: [item.inventory_id],
                  clean_attributes: attrs
              });
          }
      });
      const groupedDataSource = Array.from(groupedItemsMap.values());
      // --- NAYA GROUPING LOGIC END ---

      const saleItemCols = [
        { title: 'Product', dataIndex: ['products', 'name'] },
        { 
          title: 'Details', 
          render: (_, item) => {
              const attrValues = Object.values(item.clean_attributes || {}).filter(Boolean).join(' / ');
              return (
                  <Space direction="vertical" size={0}>
                      {/* Font size 13px kiya gaya hai */}
                      {attrValues && <Text type="secondary" style={{ fontSize: '13px' }}>{attrValues}</Text>}
                      
                      {item.all_imeis.length > 0 && (
                          <div style={{ marginTop: '6px' }}>
                              <Text strong style={{ fontSize: '12px', color: '#1890ff' }}>IMEIs: </Text>
                              {item.all_imeis.map(imei => (
                                  <Text code key={imei} style={{ fontSize: '12px', marginRight: '6px', display: 'inline-block', marginBottom: '4px' }}>
                                      {imei}
                                  </Text>
                              ))}
                          </div>
                      )}
                  </Space>
              );
          }
        },
        { 
          title: 'Sold', 
          dataIndex: 'quantity', 
          align: 'center', 
          render: q => <Text strong>{q}</Text> 
        },
        { 
          title: 'Returned', 
          key: 'returned_qty', 
          align: 'center', 
          render: (_, item) => {
            // Is group ke tamam inventory IDs ke returns ginte hain
            const retQty = returnHistory
                .filter(rh => 
                    item.all_inventory_ids.includes(rh.inventory_id) && 
                    String(rh.sale_id) === String(record.details.id)
                )
                .reduce((sum, r) => sum + (r.quantity || 0), 0);
            return retQty > 0 ? <Text type="danger">{retQty}</Text> : '0';
          }
        },
        { title: 'Price', dataIndex: 'price_at_sale', align: 'right', render: p => formatCurrency(p, profile?.currency) },
        { 
          title: 'Net Total', 
          key: 'total', 
          align: 'right', 
          render: (_, item) => {
            const retQty = returnHistory
                .filter(rh => 
                    item.all_inventory_ids.includes(rh.inventory_id) && 
                    String(rh.sale_id) === String(record.details.id)
                )
                .reduce((sum, r) => sum + (r.quantity || 0), 0);
            const netQty = (item.quantity || 0) - retQty;
            return formatCurrency(netQty * item.price_at_sale, profile?.currency);
          }
        }
      ];
      return (
        <Card size="small" style={{ margin: '8px 0' }}>
          <Descriptions title={`Invoice #${record.details.invoice_id || record.details.id} Summary`} bordered size="small" column={1}>
            {/* --- IN 5 JAGAHON PAR TABDEELI HUI HAI --- */}
            <Descriptions.Item label="Subtotal">{formatCurrency(record.details.subtotal || 0, profile?.currency)}</Descriptions.Item>
            <Descriptions.Item label="Discount">- {formatCurrency(record.details.discount || 0, profile?.currency)}</Descriptions.Item>
            <Descriptions.Item label="Grand Total"><strong>{formatCurrency(record.details.total_amount || 0, profile?.currency)}</strong></Descriptions.Item>
            <Descriptions.Item label="Amount Paid at Sale">{formatCurrency(record.details.amount_paid_at_sale || 0, profile?.currency)}</Descriptions.Item>
            <Descriptions.Item label="New Udhaar from this Sale"><strong>{formatCurrency(record.debit, profile?.currency)}</strong></Descriptions.Item>
          </Descriptions>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px'}}>
            <Title level={5} style={{ margin: 0 }}>Items in this Invoice</Title>
            <Button icon={<SwapOutlined />} type="primary" ghost onClick={() => openReturnModal(record.details)}>Return Items</Button>
          </div>
          <>
            <Table columns={saleItemCols} dataSource={groupedDataSource} pagination={false} rowKey={(item) => `${item.product_id}-${item.price_at_sale}`} style={{marginTop: '8px'}} />
            {record.details.discount > 0 && (
              <div style={{ textAlign: 'right', marginTop: '12px', paddingRight: '24px' }}>
                <Text type="secondary" style={{ fontSize: '14px' }}>Invoice Discount: </Text>
                <Text type="danger" strong style={{ fontSize: '14px' }}>- {formatCurrency(record.details.discount, profile?.currency)}</Text>
              </div>
            )}
          </>
        </Card>
      );
    }
    if (record.type === 'return') {
      const returnDetails = record.details.return_details;
      if (!returnDetails) return <Text type="secondary">Details not available.</Text>;

      // Wazahat ke liye calculation
      const totalReturnValue = record.credit; // Item ki net qeemat
      const cashRefunded = returnDetails.total_refund_amount; // Jo cash wapas diya (hamari aakhri tabdeeli ke mutabiq)
      const adjustedDebt = Math.max(0, totalReturnValue - cashRefunded);

      const returnItemCols = [
        { title: 'Product', dataIndex: ['products', 'name'] },
        { title: 'Details', render: renderItemDetails },
        { title: 'Qty', dataIndex: 'quantity', align: 'center', render: q => q || 1 },
        { title: 'Returned Price', dataIndex: 'price_at_return', align: 'right', render: p => formatCurrency(p, profile?.currency) }
      ];
      return (
        <Card size="small" style={{ margin: '8px 0' }}>
          <Descriptions title={`Return Details & Explanation`} bordered size="small" column={1}>
            <Descriptions.Item label="Reason for Return">{returnDetails.reason || <Text type="secondary">No reason provided.</Text>}</Descriptions.Item>
            
            <Descriptions.Item label="Total Return Value">
              {formatCurrency(totalReturnValue, profile?.currency)}
            </Descriptions.Item>

            {adjustedDebt > 0 && (
              <Descriptions.Item label="Adjusted against Debt">
                <Text type="danger">-{formatCurrency(adjustedDebt, profile?.currency)}</Text>
              </Descriptions.Item>
            )}

            <Descriptions.Item label="Cash Refunded to Customer">
              <Text strong style={{ color: '#52c41a' }}>
                {formatCurrency(cashRefunded, profile?.currency)}
              </Text>
            </Descriptions.Item>

            {returnDetails.return_fee > 0 && (
              <Descriptions.Item label="Restocking Fee Charged">
                <Text type="danger">{formatCurrency(returnDetails.return_fee, profile?.currency)}</Text>
              </Descriptions.Item>
            )}
          </Descriptions>
          <Title level={5} style={{ marginTop: '16px' }}>Items Returned in this Transaction</Title>
          <Table columns={returnItemCols} dataSource={returnDetails.sale_return_items} pagination={false} rowKey="id" style={{marginTop: '8px'}}/>
        </Card>
      );
    }
    return null;
  };
  
  return (
  <div style={{ padding: isMobile ? '12px 0' : '4px 0' }}> 
  <div style={{
    display: 'flex',
    flexDirection: isMobile ? 'column' : 'row',
    justifyContent: 'space-between',
    alignItems: isMobile ? 'flex-start' : 'center',
    marginBottom: '24px'
}}>
    {isMobile && (
        <Title level={2} style={{ margin: 0, marginBottom: '16px', marginLeft: '8px', fontSize: '23px' }}>
            <UserSwitchOutlined /> Customer Management
        </Title>
    )}

    {/* Computer (Desktop) ke liye Search Bar */}
    {!isMobile && (
      <Input
        ref={searchInputRef}
        placeholder="Search by Name or Phone..."
        prefix={<SearchOutlined />}
        style={{ width: 300, marginLeft: 20 }}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        allowClear
      />
    )}

    {/* Mobile ke liye Search Bar (Sirf mobile par nazar aayega) */}
    {isMobile && (
      <Input
        ref={searchInputRef}
        placeholder="Search by Name or Phone..."
        prefix={<SearchOutlined />}
        style={{ marginBottom: '16px', width: '100%' }}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        allowClear
      />
    )}
    <div style={{ 
        display: 'flex', 
        flexDirection: isMobile ? 'column' : 'row', 
        alignItems: 'center', 
        gap: '12px',
        width: isMobile ? '100%' : 'auto' 
    }}>
        {/* Return aur Archive Buttons - Ye hamesha ek hi row mein rahenge */}
        <Space size="middle">
            <Button 
                icon={<SwapOutlined />} 
                onClick={() => setIsInvoiceSearchModalOpen(true)} 
                title="Return by Invoice"
            />
            <Button 
                icon={showArchived ? <ReloadOutlined /> : <InboxOutlined />} 
                onClick={() => setShowArchived(!showArchived)} 
                type={showArchived ? 'primary' : 'default'}
                danger={showArchived}
                title={showArchived ? 'Back to Active' : 'View Archived'}
            />
        </Space>

        {/* Add Customer Button */}
        <Button
            type="primary"
            icon={<UserAddOutlined />}
            size="large"
            onClick={() => setIsAddModalOpen(true)}
            style={{ width: isMobile ? '100%' : 'auto' }}
        >
            Add Customer
        </Button>
    </div>
</div> {isMobile ? (
    <List
        loading={loading}
        dataSource={customers}
        renderItem={(customer) => (
        <List.Item style={{ padding: '0 0 16px 0' }}>
            <Card style={{ width: '100%' }} styles={{ body: { padding: '16px' } }}>
            <Row justify="space-between" align="top">
                <Col>
    <Text strong style={{ fontSize: '16px' }}>{customer.name}</Text><br/>
    <Text type="secondary">{customer.phone_number}</Text><br/>
    {/* --- Nayi Line Shamil Ki Gayi Hai --- */}
    {customer.address && <Text type="secondary">{customer.address}</Text>}
</Col>
                <Col style={{ textAlign: 'right' }}>
                <Text type="secondary">Balance</Text><br/>
                <Text type={customer.balance > 0 ? 'danger' : 'success'} strong style={{ fontSize: '16px' }}>
                    {formatCurrency(customer.balance, profile?.currency)}
                </Text>
                </Col>
            </Row>
            <div style={{ borderTop: '1px solid #f0f0f0', marginTop: '12px', paddingTop: '12px' }}>
                <Space style={{ width: '100%' }}>
                  <Button icon={<EyeOutlined />} onClick={() => handleViewLedger(customer)} style={{ flex: 1 }}>Ledger</Button>
                  
                  {customer.balance > 0 ? (
                    <Button icon={<DollarCircleOutlined />} onClick={() => showPaymentModal(customer)} style={{ flex: 1 }}>
                      Payment receive
                    </Button>
                  ) : customer.balance < 0 ? (
                    <Button type="primary" ghost icon={<DollarCircleOutlined />} onClick={() => showPayoutModal(customer)} style={{ flex: 1 }}>
                      Settle Credit
                    </Button>
                  ) : null}

                  <Dropdown 
                    trigger={['click']}
                    menu={{
                      items: [
                        {
                          key: 'edit',
                          label: 'Edit Details',
                          icon: <EditOutlined />,
                          disabled: customer.name === 'Walk-in Customer',
                          onClick: () => showEditModal(customer)
                        },
                        {
                          key: 'archive',
                          label: showArchived ? 'Restore Customer' : 'Archive Customer',
                          icon: showArchived ? <ReloadOutlined /> : <InboxOutlined />,
                          disabled: customer.name === 'Walk-in Customer',
                          onClick: () => handleToggleArchive(customer)
                        },
                        {
                          key: 'delete',
                          label: 'Delete Customer',
                          icon: <DeleteOutlined />,
                          danger: true,
                          disabled: customer.name === 'Walk-in Customer',
                          onClick: () => handleDeleteCustomer(customer)
                        }
                      ]
                    }}
                  >
                    <Button icon={<MoreOutlined />} style={{ flex: 0.3 }} />
                  </Dropdown>
                </Space>
            </div>
            </Card>
        </List.Item>
        )}
    />
    ) : (
    <Table columns={customerColumns} dataSource={customers} loading={loading} rowKey="id" />
)} <Modal title={editingCustomer ? "Edit Customer" : "Add New Customer"} open={isAddModalOpen} onCancel={() => setIsAddModalOpen(false)} onOk={() => addForm.submit()} okText="Save"> 
  <Form form={addForm} layout="vertical" onFinish={handleAddCustomer}>
  <Row gutter={16}>
    <Col span={12}>
      <Form.Item name="name" label="Full Name" rules={[{ required: true, message: 'Please enter name' }]}>
        <Input ref={customerNameInputRef} placeholder="e.g. John Doe" />
      </Form.Item>
    </Col>
    <Col span={12}>
      <Form.Item name="phone_number" label="Phone / Mobile" rules={[{ required: true, message: 'Please enter phone' }]}>
        <Input placeholder="e.g. +923001234567" />
      </Form.Item>
    </Col>
  </Row>

  <Row gutter={16}>
    <Col span={12}>
      <Form.Item name="email" label="Email Address" rules={[{ type: 'email', message: 'Invalid email format' }]}>
        <Input placeholder="e.g. customer@example.com" />
      </Form.Item>
    </Col>
    <Col span={12}>
      <Form.Item name="tax_id" label="Tax ID / VAT #" tooltip="Required for Business (B2B) invoices">
        <Input placeholder="e.g. TRN-123456" />
      </Form.Item>
    </Col>
  </Row>

  <Form.Item name="address" label="Street Address">
    <Input placeholder="Building, Street, Area..." />
  </Form.Item>

  <Row gutter={16}>
    <Col span={12}>
      <Form.Item name="city" label="City">
        <Input placeholder="e.g. Karachi / London" />
      </Form.Item>
    </Col>
    <Col span={12}>
      <Form.Item name="country" label="Country">
        <Select 
          showSearch 
          placeholder="Select Country" 
          options={countries}
          filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
        />
      </Form.Item>
    </Col>
  </Row>
</Form> 
</Modal> 
<Modal
    title={`Ledger: ${selectedCustomer?.name}`}
    open={isLedgerModalOpen}
    onCancel={() => setIsLedgerModalOpen(false)}
    footer={null}
    width={isMobile ? '95vw' : 1000}
>
    {ledgerLoading ? <div style={{ textAlign: 'center', padding: '50px' }}><Spin /></div> : (
        isMobile ? (
            <List
                dataSource={ledgerData}
                rowKey="key"
                renderItem={(record) => (
                    <List.Item style={{ padding: '8px 0' }}>
                        <Card style={{ width: '100%' }} styles={{ body: { padding: '12px' } }}>
                            <Row justify="space-between">
                                <Col span={16}>
                                    <Text strong>{record.description}</Text><br/>
                                    <Text type="secondary">{new Date(record.date).toLocaleString()}</Text>
                                </Col>
                                <Col span={8} style={{ textAlign: 'right' }}>
                                    {record.debit > 0 && <Text type="danger">- {formatCurrency(record.debit, profile?.currency)}</Text>}
                                    {record.credit > 0 && <Text type="success">+ {formatCurrency(record.credit, profile?.currency)}</Text>}
                                </Col>
                            </Row>
                            <div style={{ textAlign: 'right', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #f0f0f0' }}>
                                <Text type="secondary">Balance: </Text>
                                <Text strong>{formatCurrency(record.balance, profile?.currency)}</Text>
                            </div>
                            {(record.type === 'sale' || record.type === 'return') && (
                                <div style={{ marginTop: '10px' }}>
                                    {expandedRowRender(record)}
                                </div>
                            )}
                        </Card>
                    </List.Item>
                )}
            />
        ) : (
            <Table
                dataSource={ledgerData}
                rowKey="key"
                expandable={{ expandedRowRender, rowExpandable: (record) => record.type === 'sale' || record.type === 'return' }}
                columns={[
    { title: 'Date', dataIndex: 'date', render: d => new Date(d).toLocaleString() },
    { title: 'Description', dataIndex: 'description' },
    { title: 'Debit', dataIndex: 'debit', align: 'right', render: a => a > 0 ? <Text>{formatCurrency(a, profile?.currency)}</Text> : '-' },
    { title: 'Credit', dataIndex: 'credit', align: 'right', render: a => a > 0 ? <Text type="success">{formatCurrency(a, profile?.currency)}</Text> : '-' },
    { title: 'Balance', dataIndex: 'balance', align: 'right', render: a => <Text strong>{formatCurrency(a, profile?.currency)}</Text> }
]}
            />
        )
    )}
</Modal> <Modal title={`Payment from: ${selectedCustomer?.name}`} open={isPaymentModalOpen} onCancel={handlePaymentCancel} onOk={() => paymentForm.submit()} okText="Confirm Payment"> <Title level={5}>Balance: <Text type="danger">{formatCurrency(selectedCustomer?.balance, profile?.currency)}</Text></Title> <Form form={paymentForm} layout="vertical" onFinish={handleReceivePayment}><Form.Item name="amount" label="Amount Received" rules={[{ required: true }]}>
    <InputNumber style={{ width: '100%' }} prefix={profile?.currency ? `${profile.currency} ` : ''} min={1} max={selectedCustomer?.balance} />
</Form.Item>
<Form.Item label="Receive In">
  <Radio.Group onChange={(e) => setCashOrBank(e.target.value)} value={cashOrBank} buttonStyle="solid">
    <Radio.Button value="Cash">Cash</Radio.Button>
    <Radio.Button value="Bank">Bank / Online</Radio.Button>
  </Radio.Group>
</Form.Item>
</Form> </Modal> <Modal title={`Return for Invoice #${selectedSale?.invoice_id || selectedSale?.id}`} open={isReturnModalOpen} onCancel={handleReturnCancel} onOk={() => returnForm.submit()} okText="Confirm Return" confirmLoading={isReturnSubmitting} okButtonProps={{ disabled: selectedReturnItems.length === 0 || returnFee > maxAllowedFee }}> 
  <Table 
    dataSource={returnableItems} 
    rowKey="sale_item_id" 
    pagination={false} 
    size="small"
    columns={[
        { 
            title: 'Product', 
            key: 'product_name',
            render: (_, record) => (
                <Space direction="vertical" size={0}>
                    <Text strong>{record.product_name}</Text>
                    {/* NAYA: IMEI dikhane ke liye */}
                    {record.imei && <Text type="secondary" style={{ fontSize: '11px' }}>IMEI: {record.imei}</Text>}
                </Space>
            )
        },
        { 
            title: 'Sold Qty', 
            dataIndex: 'quantity', 
            render: (q, record) => <Tag color="orange">{record.imei ? '1 Unit' : `${q} Sold`}</Tag> 
        },
        {
            title: 'Return Qty',
            key: 'return_qty',
            render: (_, record) => {
                // NAYA LOGIC: Agar IMEI hai to Checkbox dikhao, warna InputNumber
                if (record.imei) {
                    return (
                        <Checkbox 
                            checked={selectedReturnItems.some(i => i.sale_item_id === record.sale_item_id)}
                            onChange={(e) => {
                                const checked = e.target.checked;
                                const current = selectedReturnItems.filter(i => i.sale_item_id !== record.sale_item_id);
                                if (checked) {
                                    setSelectedReturnItems([...current, { ...record, return_qty: 1 }]);
                                } else {
                                    setSelectedReturnItems(current);
                                }
                            }}
                        >
                            Return this unit
                        </Checkbox>
                    );
                }
                // Bulk items ke liye purana InputNumber
                return (
                    <InputNumber 
                        min={0} 
                        max={record.quantity || 1} 
                        defaultValue={0}
                        onChange={(val) => {
                            const current = selectedReturnItems.filter(i => i.sale_item_id !== record.sale_item_id);
                            if (val > 0) {
                                setSelectedReturnItems([...current, { ...record, return_qty: val }]);
                            } else {
                                setSelectedReturnItems(current);
                            }
                        }}
                    />
                );
            }
        },
        { 
            title: 'Refund', 
            key: 'refund', 
            align: 'right',
            render: (_, record) => {
                const selected = selectedReturnItems.find(i => i.sale_item_id === record.sale_item_id);
                const grossItemRefund = (selected?.return_qty || 0) * record.price_at_sale;
                if (!selectedSale || !selectedSale.discount) return formatCurrency(grossItemRefund, profile?.currency);
                const discountRatio = selectedSale.discount / (selectedSale.subtotal || 1);
                const netItemRefund = grossItemRefund - (grossItemRefund * discountRatio);
                return formatCurrency(netItemRefund, profile?.currency);
            }
        }
    ]}
/>
   <Form form={returnForm} layout="vertical" onFinish={handleConfirmReturn} style={{ marginTop: '24px' }}>
     <Row gutter={16}>
       <Col span={12}>
         <Form.Item 
           label="Restocking Fee (Optional)"
           validateStatus={returnFee > maxAllowedFee ? 'error' : ''}
           help={returnFee > maxAllowedFee ? `Fee cannot be more than the net price (${formatCurrency(maxAllowedFee, profile?.currency)})` : ''}
         >
           <InputNumber 
             style={{ width: '100%' }} 
             prefix={profile?.currency} 
             value={returnFee} 
             onChange={(val) => setReturnFee(val || 0)} 
             min={0}
           />
         </Form.Item>
       </Col>
       <Col span={12}>
         <Form.Item name="reason" label="Reason for Return">
           <Input placeholder="e.g. Change of mind" />
         </Form.Item>
       </Col>
     </Row>
   </Form> <Descriptions bordered column={1} size="small">
     <Descriptions.Item label="Item Return Value">
       {formatCurrency(totalRefundAmount, profile?.currency)}
     </Descriptions.Item>
     <Descriptions.Item label="Adjusted against Invoice Debt">
       <Text type="danger">-{formatCurrency(Math.min(totalRefundAmount, debtOnInvoice), profile?.currency)}</Text>
     </Descriptions.Item>
     <Descriptions.Item label="Available for Cash Refund">
       <Title level={4} style={{margin:0, color: '#52c41a'}}>
         {formatCurrency(maxCashRefundable, profile?.currency)}
       </Title>
     </Descriptions.Item>
   </Descriptions> 
    <div style={{ marginTop: '16px', padding: '12px', border: '1px solid #d9d9d9', borderRadius: '6px' }}>
      <Checkbox 
        checked={refundCashNow} 
        onChange={(e) => setRefundCashNow(e.target.checked)}
      >
        <Text strong>Refund Cash Immediately (Settle Credit Now)</Text>
      </Checkbox>
      <div style={{ marginLeft: '24px', marginTop: '4px' }}>
        <Text type="secondary" style={{ fontSize: '12px' }}>
          {refundCashNow 
            ? "Cash will be deducted from your drawer immediately." 
            : "Amount will be added to customer's credit balance."}
        </Text>
      </div>
   </div>
   </Modal> <Modal
  title={`Settle Credit for: ${selectedCustomer?.name}`}
  open={isPayoutModalOpen}
  onCancel={handlePayoutCancel}
  onOk={() => payoutForm.submit()}
  okText="Confirm Payout"
>
  <Title level={5}>Credit Balance: <Text type="success">{formatCurrency(Math.abs(selectedCustomer?.balance || 0), profile?.currency)}</Text></Title>
  <Form form={payoutForm} layout="vertical" onFinish={handleConfirmPayout}>
    <Form.Item label="Pay From">
  <Radio.Group onChange={(e) => setCashOrBank(e.target.value)} value={cashOrBank} buttonStyle="solid">
    <Radio.Button value="Cash">Cash</Radio.Button>
    <Radio.Button value="Bank">Bank / Online</Radio.Button>
  </Radio.Group>
</Form.Item>
    <Form.Item
      name="amount"
      label="Amount Paid to Customer"
      rules={[{ required: true }]}
    >
      <InputNumber 
    style={{ width: '100%' }} 
    prefix={profile?.currency ? `${profile.currency} ` : ''}
    min={1} 
    max={Math.abs(selectedCustomer?.balance)} 
/>
    </Form.Item>
    <Form.Item name="remarks" label="Remarks (Optional)">
      <Input.TextArea placeholder="e.g., Paid in cash" />
    </Form.Item>
  </Form>
</Modal>
<Modal
    title="Find Sale to Return Items"
    open={isInvoiceSearchModalOpen}
    onCancel={handleCloseInvoiceSearchModal}
    footer={null} // Hum apne custom buttons istemal karenge
    destroyOnHidden // Jab modal band ho to andar ki states ko destroy kar de
  >
    {!searchedSale ? (
      // STAGE 1: JAB SALE TALASH KI JA RAHI HO
      <Form form={invoiceSearchForm} onFinish={handleSearchInvoice} layout="vertical">
        <Form.Item
          name="invoiceId"
          label="Scan QR Code or Enter Invoice ID"
          rules={[{ required: true, message: 'Please scan or enter the invoice number!' }]}
        >
          <Input 
            ref={invoiceSearchInputRef}
            style={{ width: '100%' }} 
            placeholder="Click here and scan receipt..." 
            autoComplete="off"
          />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={isSearching} block>
            {isSearching ? 'Searching...' : 'Find Sale'}
          </Button>
        </Form.Item>
      </Form>
    ) : (
      // STAGE 2: JAB SALE MIL GAYI HO
      <div>
        <Descriptions title={`Invoice #${searchedSale.invoice_id || searchedSale.id}`} bordered column={1} size="small">
          <Descriptions.Item label="Customer">
            {searchedSale.customer ? searchedSale.customer.name : 'Walk-in Customer'}
          </Descriptions.Item>
          <Descriptions.Item label="Date">
            {new Date(searchedSale.created_at).toLocaleString()}
          </Descriptions.Item>
          <Descriptions.Item label="Total Amount">
            <strong>{formatCurrency(searchedSale.total_amount, profile?.currency)}</strong>
          </Descriptions.Item>
        </Descriptions>

        <Title level={5} style={{ marginTop: '24px' }}>Items in this Sale</Title>
        <List
          dataSource={searchedSale.sale_items}
          renderItem={item => {
              const attributes = Object.entries(item.inventory?.item_attributes || {})
                .map(([, value]) => value)
                .join(' ');
              const details = [item.inventory?.imei, attributes].filter(Boolean).join(' / ');

            return (
              <List.Item>
                <List.Item.Meta
                  title={item.product.name}
                  description={details || 'Standard Item'}
                />
                <div>{formatCurrency(item.price_at_sale, profile?.currency)}</div>
              </List.Item>
            );
          }}
          style={{ maxHeight: '20vh', overflowY: 'auto' }}
        />
        
        <Divider />

        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <Button onClick={() => setSearchedSale(null)}>
                Search Again
            </Button>
            <Button 
    type="primary" 
    icon={<SwapOutlined />}
    // Button ko sirf tab enable karein jab sale mein items hon
    disabled={!searchedSale.sale_items || searchedSale.sale_items.length === 0}
    onClick={() => {
        // Step 1: Search ke popup ko band karein
        handleCloseInvoiceSearchModal();

        // Step 2: Customer ki maloomat set karein (return modal ke liye zaroori hai)
        // Hum searchedSale se customer ka data istemal kar rahe hain
        setSelectedCustomer(searchedSale.customer);

        // Step 3: Aapke mojooda return function ko sale ki details ke sath call karein
        openReturnModal(searchedSale);
    }}
>
    Proceed to Return
</Button>
        </Space>
      </div>
    )}
</Modal>
 </div> 
 );
};

export default Customers;