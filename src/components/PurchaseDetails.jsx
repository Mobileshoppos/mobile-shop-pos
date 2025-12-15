import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Typography, Breadcrumb, Button, Card, Row, Col, Table, Tag, Spin, Alert, App as AntApp, Statistic, Modal, Form, InputNumber, DatePicker, Select, Input, Space } from 'antd';
import { ArrowLeftOutlined, DollarCircleOutlined, EditOutlined, RollbackOutlined } from '@ant-design/icons';
import DataService from '../DataService';
import dayjs from 'dayjs';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/currencyFormatter';
import { db } from '../db';
import { useSync } from '../context/SyncContext';
import AddPurchaseForm from '../components/AddPurchaseForm';

const { Title, Text } = Typography;
const { Option } = Select;

const getStatusColor = (status) => {
    switch (status) {
        case 'paid': return 'success';
        case 'partially_paid': return 'warning';
        case 'unpaid': return 'error';
        default: return 'default';
    }
};

const PurchaseDetails = () => {
    const { profile } = useAuth();
    const { processSyncQueue, isSyncing } = useSync();
    const { id } = useParams();
    const isMobile = useMediaQuery('(max-width: 768px)');
    const { notification } = AntApp.useApp();
    const [purchase, setPurchase] = useState(null);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isPaymentModalVisible, setIsPaymentModalVisible] = useState(false);
    const [paymentForm] = Form.useForm();
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [editingItems, setEditingItems] = useState([]);
    const [editForm] = Form.useForm();
    const [isReturnModalVisible, setIsReturnModalVisible] = useState(false);
    const [selectedReturnItems, setSelectedReturnItems] = useState([]);
    const [returnForm] = Form.useForm();
    const [returnHistory, setReturnHistory] = useState([]);

    const fetchDetails = async () => {
        setLoading(true);
        try {
            const { purchase: purchaseData, items: itemsData } = await DataService.getPurchaseDetails(id);
            setPurchase(purchaseData);
            setItems(itemsData || []);
        } catch (err) {
            notification.error({ message: 'Error', description: 'Failed to load purchase details.' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { 
        // Agar sync chal raha hai to ruk jayein, jab khatam ho to fetch karein
        if (!isSyncing) {
            fetchDetails(); 
        }
    }, [id, notification, isSyncing]); // <--- isSyncing dependency mein add kiya

    const displayItems = useMemo(() => {
        const grouped = {};
        items.forEach(item => {
            const tempAttributes = { ...(item.item_attributes || {}) };
            
            delete tempAttributes['IMEI'];
            delete tempAttributes['Serial / IMEI'];
            delete tempAttributes['Serial Number'];

            const attributesKey = JSON.stringify(tempAttributes);
            const key = `${item.product_id}-${attributesKey}-${item.purchase_price}`;

            if (!grouped[key]) {
                grouped[key] = { ...item, quantity: 0, imeis: [], key: key };
            }

            grouped[key].quantity += 1;
            if (item.imei) {
                grouped[key].imeis.push(item.imei);
            }
        });

        return Object.values(grouped);
    }, [items]);
    
    const itemColumns = [
        { 
            title: 'Product', 
            dataIndex: 'product_name', 
            key: 'product_name',
            // --- Yahan tabdeeli hai: Hum ne render function add kiya hai ---
            render: (text, record) => (
                <Space direction="vertical" size={0}>
                    <Text>{text}</Text>
                    {/* Agar item Available nahi hai (yani Sold hai), to laal tag dikhao */}
                    {record.status && record.status.toLowerCase() !== 'available' && (
                        <Tag color="red" style={{ fontSize: '10px', marginTop: '4px' }}>
                            Sold - Cannot Return
                        </Tag>
                    )}
                </Space>
            )
        },
        { title: 'Quantity', dataIndex: 'quantity', key: 'quantity', align: 'center' },
        { 
            title: 'Details', 
            key: 'details',
            render: (_, record) => (
                <Space wrap>
                    {record.item_attributes && Object.entries(record.item_attributes).map(([key, value]) => {
                        if (!value || ['IMEI', 'Serial / IMEI', 'Serial Number'].includes(key)) return null;
                        return <Tag key={key}>{`${key}: ${value}`}</Tag>;
                    })}
                </Space>
            )
        },
        { title: 'Purchase Price (Unit)', dataIndex: 'purchase_price', key: 'purchase_price', align: 'right', render: (val) => formatCurrency(val, profile?.currency) },
        { title: 'Subtotal', key: 'subtotal', align: 'right', render: (_, record) => formatCurrency(record.quantity * record.purchase_price, profile?.currency) },
    ];
    
    const showPaymentModal = () => { paymentForm.setFieldsValue({ amount: purchase.balance_due, payment_date: dayjs(), payment_method: 'Cash' }); setIsPaymentModalVisible(true); };
    const handlePaymentSubmit = async (values) => { try { if (values.amount > purchase.balance_due) { notification.warning({ message: 'Warning', description: 'Payment amount cannot be greater than the balance due.' }); return; } const paymentData = { amount: values.amount, payment_date: values.payment_date.format('YYYY-MM-DD'), payment_method: values.payment_method, notes: values.notes || null, supplier_id: purchase.supplier_id, purchase_id: purchase.id, }; await DataService.recordPurchasePayment(paymentData); notification.success({ message: 'Success', description: 'Payment recorded successfully!' }); setIsPaymentModalVisible(false); fetchDetails(); } catch (error) { notification.error({ message: 'Error', description: 'Failed to record payment.' }); } };
const showEditModal = () => {
        // --- NAYA CODE: Internet Check ---
        if (!navigator.onLine) {
            // Agar internet nahi hai, to yahi rok dein aur user ko bata dein
            notification.warning({
                message: 'Internet Required',
                description: 'Internet connection required to edit.',
            });
            return;
        }
        // ---------------------------------

        // Agar internet hai, to modal khol dein
        setIsEditModalVisible(true);
    };
    const handleUpdateSubmit = async (values) => { try { const updatedData = { notes: values.notes, items: editingItems, }; await DataService.updatePurchase(id, updatedData); notification.success({ message: 'Success', description: 'Purchase updated successfully!' }); setIsEditModalVisible(false); fetchDetails(); } catch (error) { notification.error({ message: 'Error', description: 'Failed to update purchase.' }); } };
    const handleItemChange = (itemId, field, value) => { setEditingItems(currentItems => currentItems.map(item => item.id === itemId ? { ...item, [field]: value } : item )); };
    const editItemColumns = [ { title: 'Product', dataIndex: 'product_name', key: 'product_name' }, { title: 'Purchase Price', dataIndex: 'purchase_price', key: 'purchase_price', render: (text, record) => (<InputNumber defaultValue={text} style={{ width: '100%' }} prefix={profile?.currency ? `${profile.currency} ` : ''} onChange={(value) => handleItemChange(record.id, 'purchase_price', value)} />) }, { title: 'Sale Price', dataIndex: 'sale_price', key: 'sale_price', render: (text, record) => (<InputNumber defaultValue={text} style={{ width: '100%' }} prefix={profile?.currency ? `${profile.currency} ` : ''} onChange={(value) => handleItemChange(record.id, 'sale_price', value)} />) }, { title: 'IMEI/Serial', dataIndex: 'imei', key: 'imei', render: (text, record) => (<Input defaultValue={text} onChange={(e) => handleItemChange(record.id, 'imei', e.target.value)} />) }, ];
    const showReturnModal = () => {
    returnForm.setFieldsValue({ return_date: dayjs(), notes: '' });
    setSelectedReturnItems([]);
    
    // --- FIX: Sirf Available Items dikhayen ---
    // Hum items list ko filter nahi kar rahe, balke Table ko batayenge ke kin ko dikhana hai.
    // Behtar ye hai ke hum Table ke dataSource ko filter karein.
    setIsReturnModalVisible(true);
};
    const handleReturnSubmit = async (values) => { if (selectedReturnItems.length === 0) { notification.warning({ message: 'No Items Selected', description: 'Please select at least one item to return.' }); return; } try { const returnData = { purchase_id: id, item_ids: selectedReturnItems, return_date: values.return_date.format('YYYY-MM-DD'), notes: values.notes || null, }; await DataService.createPurchaseReturn(returnData); notification.success({ message: 'Success', description: 'Items returned successfully!' }); setIsReturnModalVisible(false); fetchDetails(); } catch (error) { notification.error({ message: 'Error', description: 'Failed to process return.' }); } };
// --- UPDATED: Row Selection with Disable Logic ---
    const returnItemSelection = {
        onChange: (selectedRowKeys) => {
            setSelectedReturnItems(selectedRowKeys);
        },
        // Yeh function har row ke liye chalta hai
        getCheckboxProps: (record) => ({
            // Agar status 'Available' nahi hai, to checkbox disable kar do
            disabled: record.status && record.status.toLowerCase() !== 'available', 
            name: record.name,
        }),
    };

    if (loading) return <div style={{ textAlign: 'center', padding: '50px' }}><Spin size="large" /></div>;
    if (!purchase) return <Alert message="Not Found" description="No purchase found with this ID." type="warning" showIcon />;

    return (
        <div>
            <Breadcrumb items={[ { title: <Link to="/purchases">Purchases</Link> }, { title: `Purchase #${id}` } ]} style={{ marginBottom: '16px' }}/>
            <Card>
                <Row justify="space-between" align="middle" style={{ flexDirection: isMobile ? 'column' : 'row', textAlign: isMobile ? 'center' : 'left' }}>
    <Col style={{ marginBottom: isMobile ? '16px' : '0' }}>
        <Title level={2} style={{ margin: 0 }}>Purchase #{purchase.id}</Title>
        <Text type="secondary">Date: {new Date(purchase.purchase_date).toLocaleString()}</Text>
    </Col>
    <Col>
        <Tag color={getStatusColor(purchase.status)} style={{ fontSize: '14px', padding: '6px 12px' }}>
            {purchase.status.replace('_', ' ').toUpperCase()}
        </Tag>
    </Col>
</Row>
                <Row gutter={16} style={{ marginTop: '24px' }}>
    <Col span={isMobile ? 24 : 8} style={{ marginBottom: isMobile ? '16px' : '0' }}>
        <Statistic title="Supplier" value={purchase.suppliers?.name || 'N/A'} />
    </Col>
    <Col span={isMobile ? 24 : 5} style={{ marginBottom: isMobile ? '16px' : '0' }}>
        <Statistic title="Total Amount" value={purchase.total_amount} formatter={() => formatCurrency(purchase.total_amount, profile?.currency)} />
    </Col>
    <Col span={isMobile ? 24 : 5} style={{ marginBottom: isMobile ? '16px' : '0' }}>
        <Statistic title="Amount Paid" value={purchase.amount_paid} valueStyle={{ color: '#52c41a' }} formatter={() => formatCurrency(purchase.amount_paid, profile?.currency)} />
    </Col>
    <Col span={isMobile ? 24 : 6}>
        <Statistic title="Balance Due" value={purchase.balance_due} valueStyle={{ color: '#cf1322' }} formatter={() => formatCurrency(purchase.balance_due, profile?.currency)} />
    </Col>
</Row>
                {purchase.notes && ( <div style={{ marginTop: '24px', padding: '12px', background: '#2c2c2c', borderRadius: '6px' }}><Text strong>Notes:</Text><br /><Text type="secondary">{purchase.notes}</Text></div> )}
                <div style={{ marginTop: '24px', display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '8px' }}>
    <Button type="primary" block={isMobile} icon={<DollarCircleOutlined />} onClick={showPaymentModal} disabled={purchase.balance_due <= 0}>
        Record a Payment
    </Button>
    <Button block={isMobile} icon={<EditOutlined />} onClick={showEditModal} disabled={purchase.status === 'paid'}>
        Edit Purchase
    </Button>
    <Button danger block={isMobile} icon={<RollbackOutlined />} onClick={showReturnModal}>
        Return Items
    </Button>
</div>
            </Card>
            
            <Title level={3} style={{ marginTop: '32px' }}>Items in this Purchase ({items.length})</Title>
            <Table 
                columns={itemColumns} 
                dataSource={displayItems}
                rowKey="key"
                pagination={false}
                scroll={{ x: true }}
                expandable={{
                    expandedRowRender: (record) => {
                        if (!record.imeis || record.imeis.length === 0) return null;
                        return (<ul style={{ margin: 0, paddingLeft: '20px' }}>{record.imeis.map(imei => <li key={imei}><Text code>{imei}</Text></li>)}</ul>);
                    },
                    rowExpandable: (record) => record.imeis && record.imeis.length > 0,
                }}
            />

            <Link to="/purchases"><Button style={{ marginTop: '24px' }} icon={<ArrowLeftOutlined />}>Back to Purchases List</Button></Link>
            
            {/* Tamam Modals waise hi rahenge */}
            <Modal title="Record Payment" open={isPaymentModalVisible} onCancel={() => setIsPaymentModalVisible(false)} onOk={paymentForm.submit} okText="Save Payment"><Form form={paymentForm} layout="vertical" onFinish={handlePaymentSubmit} style={{marginTop: '24px'}}><Form.Item name="amount" label="Payment Amount" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} prefix={profile?.currency ? `${profile.currency} ` : ''} min={0} /></Form.Item><Form.Item name="payment_date" label="Payment Date" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item><Form.Item name="payment_method" label="Payment Method" rules={[{ required: true }]}><Select><Option value="Cash">Cash</Option><Option value="Bank Transfer">Bank Transfer</Option><Option value="Cheque">Cheque</Option><Option value="Other">Other</Option></Select></Form.Item><Form.Item name="notes" label="Notes (Optional)"><Input.TextArea rows={2} /></Form.Item></Form></Modal>
{/* --- NAYA EDIT FORM (AddPurchaseForm ko hi use karega) --- */}
        {isEditModalVisible && (
            <AddPurchaseForm
                visible={isEditModalVisible}
                onCancel={() => setIsEditModalVisible(false)}
                onPurchaseCreated={() => {
                    setIsEditModalVisible(false);
                    fetchDetails(); // Data refresh karein
                }}
                initialData={null}
                editingPurchase={purchase} // Purana data bhejein
                editingItems={items}       // Purane items bhejein
            />
        )}
            <Modal title="Return Items to Supplier" open={isReturnModalVisible} onCancel={() => setIsReturnModalVisible(false)} onOk={returnForm.submit} okText="Process Return" width={800} okButtonProps={{ danger: true }}><Form form={returnForm} layout="vertical" onFinish={handleReturnSubmit} style={{ marginTop: '24px' }}><Form.Item name="return_date" label="Return Date" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item><Form.Item name="notes" label="Reason for Return (Optional)"><Input.TextArea rows={2} placeholder="e.g., Damaged items, wrong model, etc." /></Form.Item><Title level={5} style={{ marginTop: '16px' }}>Select Items to Return</Title><Table rowSelection={{ type: 'checkbox', ...returnItemSelection }} columns={itemColumns} dataSource={items} rowKey="id" pagination={false} size="small" /></Form></Modal>
        </div>
    );
};

export default PurchaseDetails;