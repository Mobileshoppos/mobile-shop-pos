import React, { useState, useEffect } from 'react';
import { Modal, List, Button, Typography, Empty, Tag, Space, theme, App, Input, Dropdown } from 'antd';
import { SearchOutlined, ShoppingCartOutlined, ImportOutlined } from '@ant-design/icons';
import { ClockCircleOutlined, DeleteOutlined, PlayCircleOutlined, PrinterOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useMediaQuery } from '../hooks/useMediaQuery';
import DataService from '../DataService';
import { useStaff } from '../context/StaffContext'; // Naya Import
import { db } from '../db';
import { formatCurrency } from '../utils/currencyFormatter';
import { generateQuotationReceipt } from '../utils/receiptGenerator';

const { Text } = Typography;

const DraftBillsModal = ({ visible, onCancel, onResume, onRefresh, profile, customers, allProducts }) => {
  const { token } = theme.useToken();
  const { can } = useStaff(); // Staff permissions check karne ke liye
  const isMobile = useMediaQuery('(max-width: 576px)');
  const { message, modal } = App.useApp();
  const [heldBills, setHeldBills] = useState([]);
  const [staffList, setStaffList] = useState([]); // Nayi state staff ke liye
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Search filter logic
  const filteredBills = heldBills.filter(bill => 
    bill.quotation_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bill.note?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    if (visible) {
      loadBills();
    }
  }, [visible]);

  const loadBills = async () => {
    setLoading(true);
    try {
      // Dono cheezein aik saath mangwayi
      const [bills, staff] = await Promise.all([
        DataService.getHeldBills(),
        DataService.getStaffMembers()
      ]);
      setHeldBills(bills);
      setStaffList(staff); // Staff list save kar li
    } catch (error) {
      message.error("Failed to load drafts: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await DataService.deleteHeldBill(id);
      message.success("Draft deleted.");
      loadBills();
      if (onRefresh) onRefresh(); 
    } catch (error) {
      message.error("Delete failed: " + error.message);
    }
  };

  const handlePrintQuotation = (bill) => {
    const customer = customers.find(c => c.id === bill.customer_id);
    const subtotal = bill.cart.reduce((sum, item) => sum + (item.sale_price * item.quantity), 0);
    let discountAmount = bill.discount_type === 'Amount' ? (bill.discount || 0) : (subtotal * (bill.discount || 0)) / 100;
    const total = subtotal - discountAmount;

    const receiptData = {
      ...bill,
      shopName: profile?.shop_name || 'My Shop',
      shopAddress: profile?.address || '',
      shopPhone: profile?.phone_number || '',
      items: bill.cart.map(item => ({
        name: item.product_name,
        quantity: item.quantity,
        price_at_sale: item.sale_price,
        total: item.sale_price * item.quantity,
        attributes: item.item_attributes ? Object.values(item.item_attributes).join(', ') : ''
      })),
      customerName: customer ? customer.name : 'Walk-in Customer',
      subtotal: subtotal,
      discount: discountAmount,
      grandTotal: total,
      saleDate: bill.created_at,
      quotation_validity_days: profile?.quotation_validity_days,
      footerMessage: profile?.quotation_policy || "This is a price estimate."
    };

    generateQuotationReceipt(receiptData, profile?.currency);
  };

  const handleSafeResume = async (bill, type) => { // type add kiya
    setLoading(true);
    try {
      // Naya Izafa: Agar purchase hai to stock check skip karein
      if (type === 'purchase') {
        onResume(bill, type);
        setLoading(false);
        return;
      }

      let finalCart = [];
      let logs = []; // Tabdeeliyon ka record rakhne ke liye
      let hasCriticalError = false;

      for (const cartItem of bill.cart) {
        const currentStock = await db.inventory.get(cartItem.inventory_id || cartItem.id);

        // 1. Check: Kya item bilkul khatam ho gaya hai?
        if (!currentStock || currentStock.status.toLowerCase() !== 'available' || currentStock.available_qty <= 0) {
          logs.push({ type: 'removed', name: cartItem.product_name, detail: cartItem.imei ? `IMEI: ${cartItem.imei}` : 'Out of Stock' });
          continue;
        }

        let updatedItem = { ...cartItem };
        let itemChanges = [];

        // 2. Check: Qeemat mein tabdeeli (Price Change)
        if (Number(currentStock.sale_price) !== Number(cartItem.sale_price)) {
          itemChanges.push(`Price: ${formatCurrency(cartItem.sale_price, profile?.currency)} -> ${formatCurrency(currentStock.sale_price, profile?.currency)}`);
          updatedItem.sale_price = currentStock.sale_price;
        }

        // 3. Check: Quantity adjustment (Sirf bulk items ke liye)
        if (!cartItem.imei && cartItem.quantity > currentStock.available_qty) {
          itemChanges.push(`Qty: ${cartItem.quantity} -> ${currentStock.available_qty} (Limited Stock)`);
          updatedItem.quantity = currentStock.available_qty;
        }

        if (itemChanges.length > 0) {
          logs.push({ type: 'updated', name: cartItem.product_name, detail: itemChanges.join(', ') });
        }

        finalCart.push(updatedItem);
      }

      // SCENARIO A: Agar kuch bhi nahi bacha
      if (finalCart.length === 0) {
        modal.error({ title: 'Draft Expired', content: 'All items in this draft are no longer available.' });
        setLoading(false);
        return;
      }

      // SCENARIO B: Agar qeemat ya quantity badli hai, ya koi item nikla hai
      if (logs.length > 0) {
        modal.confirm({
          title: 'Draft Updates Required',
          width: 500,
          content: (
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              <p>Some items in this draft have changed since it was saved:</p>
              {logs.map((log, i) => (
  <div 
    key={i} 
    style={{ 
      marginBottom: '8px', 
      padding: '8px', 
      // Ant Design Tokens ka istemal:
      background: log.type === 'removed' ? token.colorErrorBg : token.colorInfoBg, 
      border: `1px solid ${log.type === 'removed' ? token.colorErrorBorder : token.colorInfoBorder}`,
      borderRadius: token.borderRadiusSM 
    }}
  >
    <Text strong style={{ color: log.type === 'removed' ? token.colorError : token.colorInfo }}>
      {log.type === 'removed' ? '[Removed] ' : '[Updated] '} {log.name}
    </Text>
    <br />
    <Text style={{ fontSize: '12px', color: token.colorTextSecondary }}>{log.detail}</Text>
  </div>
))}
              <p style={{ marginTop: '10px' }}>Do you want to proceed with these adjustments?</p>
            </div>
          ),
          okText: 'Accept & Resume',
          // Yahan 'type' shamil kiya taake system ko pata chale Sale hai ya Purchase
          onOk: () => onResume({ ...bill, cart: finalCart }, type)
        });
      } else {
        // SCENARIO C: Sab kuch perfect hai
        onResume(bill, type); // type pass kiya
      }
    } catch (error) {
      message.error("Validation failed: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClearOldDrafts = () => {
    modal.confirm({
      title: 'Cleanup Old Drafts?',
      content: 'This will delete all held bills older than 30 days. Are you sure?',
      okText: 'Yes, Clean Up',
      okType: 'danger',
      onOk: async () => {
        const thirtyDaysAgo = dayjs().subtract(30, 'days').toISOString();
        const allBills = await db.held_bills.toArray();
        const oldBills = allBills.filter(b => b.created_at < thirtyDaysAgo);
        
        for (const b of oldBills) {
          await DataService.deleteHeldBill(b.id);
        }
        message.success(`${oldBills.length} old drafts removed.`);
        loadBills();
        if (onRefresh) onRefresh();
      }
    });
  };

  // <--- YAHAN 'return (' KA HONA ZAROORI HAI
  return (
    <Modal
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '95%' }}>
          <Space><ClockCircleOutlined /> Held Bills & Quotations</Space>
          {heldBills.length > 0 && (
            <Button size="small" type="link" danger onClick={handleClearOldDrafts}>Clear Old (30d+)</Button>
          )}
        </div>
      }
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={600}
    >
      <Input
        placeholder="Search by Quotation ID or Customer Name..."
        prefix={<SearchOutlined />}
        style={{ marginBottom: '16px' }}
        onChange={e => setSearchTerm(e.target.value)}
        allowClear
      />
      <List
        loading={loading}
        dataSource={filteredBills} // heldBills ki jagah filteredBills use kiya
        renderItem={(bill) => {
          const subtotal = bill.cart.reduce((sum, item) => sum + (item.sale_price * item.quantity), 0);
          return (
            <List.Item style={{ padding: '16px 8px' }}>
              <div style={{ width: '100%' }}>
                {/* Row 1: ID, Note, and Icons (Print/Delete) */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <Space wrap align="center">
                      <Tag color="cyan" style={{ fontWeight: 'bold', margin: 0 }}>{bill.quotation_id || 'N/A'}</Tag>
                      <Text strong style={{ fontSize: '15px' }}>{bill.note}</Text>
                    </Space>
                    <div style={{ marginTop: '4px' }}>
                      <Space wrap>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {dayjs(bill.created_at).format('DD MMM YYYY, hh:mm A')} ({dayjs().diff(dayjs(bill.created_at), 'day')} days old)
                        </Text>
                        {/* Naya Izafa: Staff ka naam dhoond kar dikhana */}
                        <Tag color="orange" bordered={false} style={{ fontSize: '10px' }}>
                          By: {staffList.find(s => s.id === bill.staff_id)?.name || 'Owner'}
                        </Tag>
                      </Space>
                    </div>
                  </div>
                  
                  {/* Action Icons */}
                  <Space>
                    <Button type="text" size="small" icon={<PrinterOutlined />} onClick={() => handlePrintQuotation(bill)} />
                    <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(bill.id)} />
                  </Space>
                </div>

                {/* Row 2: Stats and Action Buttons */}
                <div style={{ 
                  display: 'flex', 
                  flexDirection: isMobile ? 'column' : 'row', 
                  justifyContent: 'space-between', 
                  alignItems: isMobile ? 'stretch' : 'center', 
                  gap: '12px' 
                }}>
                  <Tag color="blue" style={{ margin: 0, width: isMobile ? 'fit-content' : 'auto' }}>
                    {bill.cart.length} Items | {formatCurrency(subtotal, profile?.currency)}
                  </Tag>

                  <Space style={{ width: isMobile ? '100%' : 'auto' }}>
                    <Button 
                      type="primary" 
                      icon={<ShoppingCartOutlined />} 
                      onClick={() => handleSafeResume(bill, 'sale')}
                      style={{ flex: isMobile ? 1 : 'none' }}
                    >Sale</Button>
                    {/* Naya Izafa: Sirf tab dikhao jab ijazat ho */}
                    {can('can_manage_purchases') && (
                      <Button 
                        style={{ background: token.colorSuccess, color: 'white', border: 'none', flex: isMobile ? 1 : 'none' }} 
                        icon={<ImportOutlined />} 
                        onClick={() => handleSafeResume(bill, 'purchase')}
                      >Purchase</Button>
                    )}
                  </Space>
                </div>
              </div>
            </List.Item>
          );
        }}
        locale={{ emptyText: <Empty description="No draft bills found" /> }}
      />
    </Modal>
  );
};

export default DraftBillsModal;