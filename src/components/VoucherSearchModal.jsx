import React, { useState, useEffect, useRef } from 'react';
import { Modal, Input, Button, Table, Tag, Alert, Spin, Typography, Space } from 'antd';
import { FileTextOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom'; // <--- NAYA IZAFA
import { db } from '../db';
import { formatCurrency } from '../utils/currencyFormatter';
import dayjs from 'dayjs';
import DataExport from './DataExport';
import { generatePaymentReceipt, generateSaleReceipt } from '../utils/receiptGenerator'; // <--- NAYA IZAFA
import { printThermalPaymentReceipt, printThermalReceipt } from '../utils/thermalPrinter'; // <--- NAYA IZAFA
import { PrinterOutlined, RollbackOutlined } from '@ant-design/icons'; // <--- NAYA IZAFA
import DataService from '../DataService'; // <--- DataService bhi chahiye

const { Text } = Typography;

const VoucherSearchModal = ({ open, onClose, autoSearchQuery = '' }) => {
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchedData, setSearchedData] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [receiptData, setReceiptData] = useState(null); 
  const searchInputRef = useRef(null); 
  const navigate = useNavigate(); // <--- NAYA IZAFA 

  // --- NAYA IZAFA: Print Button ka Function ---
  const handlePrintReceipt = () => {
    if (!receiptData) return;
    if (receiptData.isSale) { // Agar Sale Invoice hai
        if (receiptData.receipt_format === 'thermal') printThermalReceipt(receiptData, receiptData.currency);
        else generateSaleReceipt(receiptData, receiptData.currency);
    } else { // Agar normal payment voucher hai
        if (receiptData.receipt_format === 'thermal') printThermalPaymentReceipt(receiptData, receiptData.currency);
        else generatePaymentReceipt(receiptData, receiptData.currency);
    }
  };

  // NAYA IZAFA: Modal khulte hi cursor input field mein blink kare
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100); // 100ms ka delay taake modal poora khul jaye
    }
  }, [open]);

  // NAYA IZAFA: Agar bahar se koi voucher number aaye to khud search kar lo
  useEffect(() => {
    if (open && autoSearchQuery) {
      setSearchText(autoSearchQuery);
      handleSearch(autoSearchQuery);
    }
  }, [open, autoSearchQuery]);

  const handleSearch = async (queryToSearch) => {
    const query = typeof queryToSearch === 'string' ? queryToSearch : searchText;
    if (!query || !query.trim()) return;
    
    setLoading(true);
    setErrorMessage('');
    setSearchedData(null);

    const cleanQuery = query.trim().toUpperCase();

    try {
      setReceiptData(null); 

      // 1. Expense (EXP-)
      if (cleanQuery.startsWith('EXP-')) {
        const expense = await db.expenses.where('voucher_no').equals(cleanQuery).first();
        if (expense) {
          const category = expense.category_id ? await db.expense_categories.get(expense.category_id) : null;
          const staff = expense.staff_id ? await db.staff_members.get(expense.staff_id) : null;
          setSearchedData({
            type: 'Expense', voucherNo: expense.voucher_no, title: expense.title,
            amount: expense.amount, date: expense.expense_date, paymentMethod: expense.payment_method || 'Cash',
            categoryName: category ? category.name : 'Uncategorized', staffName: staff ? staff.name : 'Owner / Admin',
            status: expense.amount === 0 ? 'VOIDED' : 'VALID'
          });
        } else {
          setErrorMessage(`No expense voucher found matching "${cleanQuery}".`);
        }
      } 
      // 2. Customer Receipt OR Sale Return Credit (RCPT- / RET-)
      else if (cleanQuery.startsWith('RCPT-') || cleanQuery.startsWith('RET-')) {
        const payment = await db.customer_payments.where('voucher_no').equals(cleanQuery).first();
        if (payment) {
          const customer = payment.customer_id ? await db.customers.get(payment.customer_id) : null;
          const staff = payment.staff_id ? await db.staff_members.get(payment.staff_id) : null;
          const profile = await db.user_settings.toCollection().first();
          const isReturn = payment.amount_paid < 0 || cleanQuery.startsWith('RET-');

          let historicalBalance = 0;
          if (customer) {
              const targetTime = new Date(payment.created_at).getTime();
              const sales = await db.sales.where('customer_id').equals(customer.id).toArray();
              const payments = await db.customer_payments.where('customer_id').equals(customer.id).toArray();
              const payouts = await db.credit_payouts.where('customer_id').equals(customer.id).toArray();

              const totalUdhaar = sales.filter(s => new Date(s.created_at).getTime() <= targetTime).reduce((sum, s) => sum + ((s.total_amount || 0) - (s.amount_paid_at_sale || 0)), 0);
              const totalWusooli = payments.filter(p => new Date(p.created_at).getTime() <= targetTime).reduce((sum, p) => sum + Math.abs(p.amount_paid || 0), 0);
              const totalPayouts = payouts.filter(p => new Date(p.created_at).getTime() <= targetTime).reduce((sum, p) => sum + (p.amount_paid || 0), 0);

              historicalBalance = totalUdhaar + totalPayouts - totalWusooli;
          }

          setSearchedData({
            type: isReturn ? 'Sale Return Credit' : 'Customer Payment',
            voucherNo: payment.voucher_no,
            title: payment.remarks || (isReturn ? 'Credit for Returned Items' : 'Payment Received'),
            amount: Math.abs(payment.amount_paid),
            date: payment.created_at, paymentMethod: payment.payment_method || 'Cash',
            categoryName: customer ? customer.name : 'Unknown Customer', staffName: staff ? staff.name : 'Owner / Admin',
            status: payment.amount_paid === 0 ? 'VOIDED' : 'VALID'
          });

          setReceiptData({
            shopName: profile?.shop_name || 'My Shop', shopAddress: profile?.address || '', shopPhone: profile?.phone_number || '',
            paymentDate: payment.created_at, customerName: customer ? customer.name : 'Customer', voucher_no: payment.voucher_no,
            amountPaid: Math.abs(payment.amount_paid), paymentMethod: payment.payment_method || 'Cash', remainingBalance: historicalBalance,
            footerMessage: profile?.warranty_policy, currency: profile?.currency || 'PKR', receipt_format: profile?.receipt_format || 'pdf'
          });
        } else {
          // Fallback for Supplier Refund
          const refund = await db.supplier_refunds.where('voucher_no').equals(cleanQuery).first();
          if (refund) {
            const supplier = refund.supplier_id ? await db.suppliers.get(refund.supplier_id) : null;
            const staff = refund.staff_id ? await db.staff_members.get(refund.staff_id) : null;
            setSearchedData({
              type: 'Supplier Refund', voucherNo: refund.voucher_no, title: refund.notes || 'Refund Received',
              amount: refund.amount, date: refund.refund_date || refund.created_at, paymentMethod: refund.refund_method || refund.payment_method || 'Cash',
              categoryName: supplier ? supplier.name : 'Unknown Supplier', staffName: staff ? staff.name : 'Owner / Admin',
              status: refund.amount === 0 ? 'VOIDED' : 'VALID'
            });
          } else {
            setErrorMessage(`No receipt/return voucher found matching "${cleanQuery}".`);
          }
        }
      } 
      // 3. Payment (PAY-)
      else if (cleanQuery.startsWith('PAY-')) {
        const supPayment = await db.supplier_payments.where('voucher_no').equals(cleanQuery).first();
        if (supPayment) {
          const supplier = supPayment.supplier_id ? await db.suppliers.get(supPayment.supplier_id) : null;
          const staff = supPayment.staff_id ? await db.staff_members.get(supPayment.staff_id) : null;
          const profile = await db.user_settings.toCollection().first();

          let historicalBalance = 0;
          if (supplier) {
              const targetTime = new Date(supPayment.created_at).getTime();
              const purchases = await db.purchases.where('supplier_id').equals(supplier.id).toArray();
              const payments = await db.supplier_payments.where('supplier_id').equals(supplier.id).toArray();
              const refunds = await db.supplier_refunds.where('supplier_id').equals(supplier.id).toArray();

              const totalBusiness = purchases.filter(p => new Date(p.created_at || p.purchase_date).getTime() <= targetTime).reduce((sum, p) => sum + (p.total_amount || 0), 0);
              const totalPaid = payments.filter(p => new Date(p.created_at).getTime() <= targetTime).reduce((sum, p) => sum + (p.amount || 0), 0);
              const totalRefunds = refunds.filter(r => new Date(r.created_at).getTime() <= targetTime).reduce((sum, r) => sum + (r.amount || 0), 0);

              const diff = totalBusiness - (totalPaid - totalRefunds);
              historicalBalance = diff > 0 ? diff : 0; 
          }

          setSearchedData({
            type: 'Supplier Payment', voucherNo: supPayment.voucher_no, title: supPayment.notes || 'Payment to Supplier',
            amount: supPayment.amount, date: supPayment.payment_date || supPayment.created_at, paymentMethod: supPayment.payment_method || 'Cash',
            categoryName: supplier ? supplier.name : 'Unknown Supplier', staffName: staff ? staff.name : 'Owner / Admin',
            status: supPayment.amount === 0 ? 'VOIDED' : 'VALID'
          });

          setReceiptData({
            shopName: profile?.shop_name || 'My Shop', shopAddress: profile?.address || '', shopPhone: profile?.phone_number || '',
            paymentDate: supPayment.payment_date || supPayment.created_at, customerName: supplier ? supplier.name : 'Supplier',
            voucher_no: supPayment.voucher_no, amountPaid: supPayment.amount, paymentMethod: supPayment.payment_method || 'Cash',
            remainingBalance: historicalBalance, footerMessage: profile?.warranty_policy, currency: profile?.currency || 'PKR',
            receipt_format: profile?.receipt_format || 'pdf', isPayout: true
          });
        } else {
          const custPayout = await db.credit_payouts.where('voucher_no').equals(cleanQuery).first();
          if (custPayout) {
            const customer = custPayout.customer_id ? await db.customers.get(custPayout.customer_id) : null;
            const staff = custPayout.staff_id ? await db.staff_members.get(custPayout.staff_id) : null;
            const profile = await db.user_settings.toCollection().first();

            let historicalBalance = 0;
            if (customer) {
                const targetTime = new Date(custPayout.created_at).getTime();
                const sales = await db.sales.where('customer_id').equals(customer.id).toArray();
                const payments = await db.customer_payments.where('customer_id').equals(customer.id).toArray();
                const payouts = await db.credit_payouts.where('customer_id').equals(customer.id).toArray();

                const totalUdhaar = sales.filter(s => new Date(s.created_at).getTime() <= targetTime).reduce((sum, s) => sum + ((s.total_amount || 0) - (s.amount_paid_at_sale || 0)), 0);
                const totalWusooli = payments.filter(p => new Date(p.created_at).getTime() <= targetTime).reduce((sum, p) => sum + Math.abs(p.amount_paid || 0), 0);
                const totalPayouts = payouts.filter(p => new Date(p.created_at).getTime() <= targetTime).reduce((sum, p) => sum + (p.amount_paid || 0), 0);
                historicalBalance = totalUdhaar + totalPayouts - totalWusooli;
            }

            setSearchedData({
              type: 'Customer Payout', voucherNo: custPayout.voucher_no, title: custPayout.remarks || 'Cash Refund to Customer',
              amount: custPayout.amount_paid, date: custPayout.created_at, paymentMethod: custPayout.payment_method || 'Cash',
              categoryName: customer ? customer.name : 'Unknown Customer', staffName: staff ? staff.name : 'Owner / Admin',
              status: custPayout.amount_paid === 0 ? 'VOIDED' : 'VALID'
            });

            setReceiptData({
              shopName: profile?.shop_name || 'My Shop', shopAddress: profile?.address || '', shopPhone: profile?.phone_number || '',
              paymentDate: custPayout.created_at, customerName: customer ? customer.name : 'Customer', voucher_no: custPayout.voucher_no,
              amountPaid: custPayout.amount_paid, paymentMethod: custPayout.payment_method || 'Cash', remainingBalance: historicalBalance,
              footerMessage: profile?.warranty_policy, currency: profile?.currency || 'PKR', receipt_format: profile?.receipt_format || 'pdf', isPayout: true
            });
          } else {
            setErrorMessage(`No payment voucher found matching "${cleanQuery}".`);
          }
        }
      }
      // 4. Cash Adjustment (ADJ-)
      else if (cleanQuery.startsWith('ADJ-')) {
        const adjustment = await db.cash_adjustments.where('voucher_no').equals(cleanQuery).first();
        if (adjustment) {
          const staff = adjustment.staff_id ? await db.staff_members.get(adjustment.staff_id) : null;
          setSearchedData({
            type: 'Cash Adjustment', voucherNo: adjustment.voucher_no, title: adjustment.notes || `Cash ${adjustment.type}`,
            amount: adjustment.amount, date: adjustment.created_at, paymentMethod: adjustment.payment_method || 'Cash',
            categoryName: adjustment.type === 'Transfer' ? `Transfer to ${adjustment.transfer_to}` : `Cash ${adjustment.type}`,
            staffName: staff ? staff.name : 'Owner / Admin', status: adjustment.amount === 0 ? 'VOIDED' : 'VALID'
          });
        } else {
          setErrorMessage(`No adjustment voucher found matching "${cleanQuery}".`);
        }
      }
      // 5. Purchase Invoice (PUR-)
      else if (cleanQuery.startsWith('PUR-')) {
        const purchase = await db.purchases.where('invoice_id').equals(cleanQuery).first();
        if (purchase) {
          const supplier = purchase.supplier_id ? await db.suppliers.get(purchase.supplier_id) : null;
          const staff = purchase.staff_id ? await db.staff_members.get(purchase.staff_id) : null;
          
          setSearchedData({
            id: purchase.id, // <--- NAYA IZAFA: Redirect karne ke liye ID zaroori hai
            type: 'Purchase Invoice', 
            voucherNo: purchase.invoice_id, 
            title: purchase.notes || 'Purchase Bill',
            amount: purchase.total_amount, 
            date: purchase.purchase_date || purchase.created_at, 
            paymentMethod: purchase.amount_paid > 0 ? 'Cash/Bank' : 'Unpaid',
            categoryName: supplier ? supplier.name : 'Unknown Supplier', 
            staffName: staff ? staff.name : 'Owner / Admin', 
            status: purchase.status.replace('_', ' ').toUpperCase() // PAID, UNPAID, PARTIALLY PAID
          });
        } else {
          setErrorMessage(`No purchase invoice found matching "${cleanQuery}".`);
        }
      }
      // 6. Sale Invoice (Agar INV- ho ya direct invoice number ho jaise F3935)
      else {
        let saleQuery = cleanQuery;
        if (cleanQuery.startsWith('INV-')) saleQuery = cleanQuery.replace('INV-', '');
        
        const result = await DataService.lookupByInvoice(saleQuery);
        if (result && result.sale) {
          const { sale, customer, items } = result;
          const staff = sale.staff_id ? await db.staff_members.get(sale.staff_id) : null;
          const profile = await db.user_settings.toCollection().first();

          setSearchedData({
            id: sale.id,
            type: 'Sale Invoice',
            voucherNo: sale.invoice_id || sale.id.split('-')[0].toUpperCase(),
            title: 'Customer Sale',
            amount: sale.total_amount - (sale.tax_amount || 0),
            date: sale.sale_date || sale.created_at,
            paymentMethod: sale.payment_method || 'Cash',
            categoryName: customer ? customer.name : 'Walk-in Customer',
            staffName: staff ? staff.name : 'Owner / Admin',
            status: sale.payment_status?.toUpperCase() || 'PAID'
          });

          // Receipt Items tayyar karein
          const receiptItems = items.map(i => {
              const attrValues = i.inventory?.item_attributes ? Object.entries(i.inventory.item_attributes).filter(([k,v]) => !k.toLowerCase().includes('imei')).map(([k,v]) => v).join(', ') : '';
              return {
                  name: i.product?.name || 'Unknown',
                  quantity: i.saleItem?.quantity || 1,
                  price_at_sale: i.saleItem?.price_at_sale || 0,
                  imeis: i.inventory?.imei ? [i.inventory.imei] : [],
                  attributes: attrValues,
                  warranty_expiry: i.saleItem?.warranty_expiry
              };
          });

          setReceiptData({
            isSale: true, // <--- Pehchanne ke liye ke yeh Sale Bill hai
            shopName: profile?.shop_name || 'My Shop',
            shopAddress: profile?.address || '',
            shopPhone: profile?.phone_number || '',
            saleId: sale.id,
            invoice_id: sale.invoice_id,
            saleDate: sale.sale_date || sale.created_at,
            customerName: customer ? customer.name : 'Walk-in Customer',
            items: receiptItems,
            subtotal: sale.subtotal,
            discount: sale.discount,
            taxAmount: sale.tax_amount || 0,
            taxName: profile?.tax_name || 'Tax',
            taxRate: sale.tax_rate_applied || 0,
            fbrInvoiceNumber: sale.fbr_invoice_number,
            fbrFeeApplied: sale.fbr_fee_applied || 0,
            grandTotal: sale.total_amount,
            amountPaid: sale.amount_paid_at_sale,
            paymentStatus: sale.payment_status,
            payment_method: sale.payment_method || 'Cash',
            footerMessage: profile?.warranty_policy,
            showQrCode: profile?.qr_code_enabled ?? true,
            currency: profile?.currency || 'PKR',
            receipt_format: profile?.receipt_format || 'pdf'
          });

        } else {
          setErrorMessage('System currently supports searching for EXP-, RCPT-, PAY-, RET-, ADJ-, PUR-, and Sale Invoices (e.g., F3935 or INV-F3935).');
        }
      }
    } catch (error) {
      setErrorMessage('Error during search: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleModalClose = () => {
    setSearchText('');
    setSearchedData(null);
    setErrorMessage('');
    onClose();
  };

  // --- NAYA IZAFA: Dynamic Column Heading (Professional Logic) ---
  let dynamicPartyTitle = 'Party / Category';
  if (searchedData?.type === 'Expense') dynamicPartyTitle = 'Category';
  else if (searchedData?.type === 'Customer Payment' || searchedData?.type === 'Customer Payout' || searchedData?.type === 'Sale Return Credit' || searchedData?.type === 'Sale Invoice') dynamicPartyTitle = 'Customer';
  else if (searchedData?.type === 'Supplier Refund' || searchedData?.type === 'Supplier Payment' || searchedData?.type === 'Purchase Invoice') dynamicPartyTitle = 'Supplier';
  else if (searchedData?.type === 'Cash Adjustment') dynamicPartyTitle = 'Details';

  // --- NAYA IZAFA: Table aur Export ke liye Columns ---
  const columns = [
    { title: 'Date', dataIndex: 'date', key: 'date', render: (date) => dayjs(date).format('DD MMM, YYYY') },
    { title: 'Voucher No.', dataIndex: 'voucherNo', key: 'voucherNo', render: (text) => <Text code strong>{text}</Text> },
    { title: dynamicPartyTitle, dataIndex: 'categoryName', key: 'category' }, // <--- Yahan Dynamic Title lag gaya
    { title: 'Title', dataIndex: 'title', key: 'title', render: (text) => <Text strong>{text}</Text> },
    { title: 'Type', dataIndex: 'type', key: 'type', render: (text) => <Tag color="magenta">{text}</Tag> },
    { title: 'Paid Via', dataIndex: 'paymentMethod', key: 'paymentMethod', render: (text) => <Tag color="blue">{text}</Tag> },
    { title: 'Staff', dataIndex: 'staffName', key: 'staffName' },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (text) => <Tag color={text === 'VALID' ? 'green' : 'default'}>{text}</Tag> },
    { title: 'Amount', dataIndex: 'amount', key: 'amount', render: (val) => <Text strong style={{ color: '#cf1322', fontSize: 15 }}>{formatCurrency(val)}</Text> },
  ];

  const exportColumns = [
    { title: 'Date', dataIndex: 'formattedDate' },
    { title: 'Voucher No', dataIndex: 'voucherNo' },
    { title: dynamicPartyTitle, dataIndex: 'categoryName' }, // <--- Yahan bhi Dynamic Title lag gaya
    { title: 'Title', dataIndex: 'title' },
    { title: 'Type', dataIndex: 'type' },
    { title: 'Paid Via', dataIndex: 'paymentMethod' },
    { title: 'Staff', dataIndex: 'staffName' },
    { title: 'Status', dataIndex: 'status' },
    { title: 'Amount', dataIndex: 'amount' },
  ];

  return (
    <Modal
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingRight: '24px' }}>
          <Space>
            <FileTextOutlined style={{ color: '#1890ff' }} />
            <span>Universal Voucher Search</span>
          </Space>
          <Space>
            {/* NAYA IZAFA: Agar Purchase Invoice hai to View Full Bill ka button dikhayein */}
            {searchedData?.type === 'Purchase Invoice' && (
              <Button 
                type="primary" 
                onClick={() => {
                  handleModalClose(); // Pehle modal band karein
                  navigate(`/purchases/${searchedData.id}`); // Phir naye page par bhej dein
                }}
                size="small"
              >
                View Full Bill
              </Button>
            )}

            {/* NAYA IZAFA: Agar Sale Invoice hai to Process Return ka button dikhayein */}
            {searchedData?.type === 'Sale Invoice' && (
              <Button 
                type="primary" 
                danger
                icon={<RollbackOutlined />}
                onClick={() => {
                  handleModalClose(); // Pehle modal band karein
                  // NAYA IZAFA: URL mein invoiceId sath bhej rahe hain
                  navigate(`/customers?openReturn=true&invoiceId=${searchedData.voucherNo}`); 
                }}
                size="small"
              >
                Process Return
              </Button>
            )}

            {/* NAYA IZAFA: Agar receiptData mojood ho to Print Button dikhayein */}
            {receiptData && (
              <Button 
                type="primary" 
                icon={<PrinterOutlined />} 
                onClick={handlePrintReceipt}
                size="small"
              >
                Print Receipt
              </Button>
            )}
            
            {searchedData && (
              <DataExport 
                data={[{
                  ...searchedData,
                  formattedDate: dayjs(searchedData.date).format('DD MMM, YYYY')
                }]} 
                exportColumns={exportColumns} 
                fileName={`Voucher_${searchedData.voucherNo}`} 
                reportTitle={`Voucher Details: ${searchedData.voucherNo}`} 
              />
            )}
          </Space>
        </div>
      }
      open={open}
      onCancel={handleModalClose}
      footer={null}
      destroyOnHidden
      width="80%"
    >
      <div style={{ marginBottom: 20, marginTop: 10 }}>
        <Input.Search
          ref={searchInputRef} // <--- NAYA IZAFA
          placeholder="Enter Voucher No. (e.g. EXP-A1234)"
          allowClear
          enterButton="Search"
          size="large"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          onSearch={handleSearch}
          loading={loading}
        />
        <Text type="secondary" style={{ fontSize: 11, marginTop: 4, display: 'block' }}>
          Tip: Ensure the prefix (e.g., EXP-, RCPT-, PAY-, RET-, ADJ-) is included.
        </Text>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: 30 }}>
          <Spin />
        </div>
      )}

      {errorMessage && (
        <Alert message={errorMessage} type="warning" showIcon style={{ marginBottom: 16 }} />
      )}

      {searchedData && (
        <Table 
          columns={columns} 
          dataSource={[searchedData]} 
          rowKey="voucherNo" 
          pagination={false} 
          size="small" 
          scroll={{ x: true }}
        />
      )}
    </Modal>
  );
};

export default VoucherSearchModal;