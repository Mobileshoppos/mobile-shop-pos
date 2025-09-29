// src/components/PurchaseDetails.jsx (Final version with the crucial 'notes' fix)

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Typography, Breadcrumb, Button, Card, Row, Col, Table, Tag, Spin, Alert, App as AntApp, Statistic, Modal, Form, InputNumber, DatePicker, Select, Input, Popconfirm } from 'antd';
import { ArrowLeftOutlined, DollarCircleOutlined, EditOutlined, DeleteOutlined, RollbackOutlined } from '@ant-design/icons';
import DataService from '../DataService';
import dayjs from 'dayjs';

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
    const { id } = useParams();
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

    useEffect(() => { fetchDetails(); }, [id, notification]);

    const showPaymentModal = () => {
        paymentForm.setFieldsValue({
            amount: purchase.balance_due,
            payment_date: dayjs(),
            payment_method: 'Cash',
        });
        setIsPaymentModalVisible(true);
    };

    const handlePaymentSubmit = async (values) => {
        try {
            if (values.amount > purchase.balance_due) {
                notification.warning({ message: 'Warning', description: 'Payment amount cannot be greater than the balance due.' });
                return;
            }
            const paymentData = {
                amount: values.amount,
                payment_date: values.payment_date.format('YYYY-MM-DD'),
                payment_method: values.payment_method,
                notes: values.notes || null, // <-- THE FIX IS HERE
                supplier_id: purchase.supplier_id,
                purchase_id: purchase.id,
            };
            await DataService.recordPurchasePayment(paymentData);
            notification.success({ message: 'Success', description: 'Payment recorded successfully!' });
            setIsPaymentModalVisible(false);
            fetchDetails();
        } catch (error) {
            notification.error({ message: 'Error', description: 'Failed to record payment.' });
        }
    };

    // handlePaymentSubmit function ke baad yeh code paste karein

    const showEditModal = () => {
        // Form mein purchase ke mojooda notes set karein
        editForm.setFieldsValue({ notes: purchase.notes });
        // Editable items ki state ko asal items se set karein
        setEditingItems(items.map(item => ({ ...item }))); // Create a mutable copy
        setIsEditModalVisible(true);
    };

    const handleUpdateSubmit = async (values) => {
        try {
            // Form se notes aur state se items haasil karein
            const updatedData = {
                notes: values.notes,
                items: editingItems,
            };
            await DataService.updatePurchase(id, updatedData);
            notification.success({ message: 'Success', description: 'Purchase updated successfully!' });
            setIsEditModalVisible(false);
            fetchDetails(); // Details ko refresh karein
        } catch (error) {
            notification.error({ message: 'Error', description: 'Failed to update purchase.' });
        }
    };

    const handleItemChange = (itemId, field, value) => {
        setEditingItems(currentItems =>
            currentItems.map(item =>
                item.id === itemId ? { ...item, [field]: value } : item
            )
        );
    };

    // Edit modal ke liye item columns
    const editItemColumns = [
        { title: 'Product', dataIndex: ['products', 'name'], key: 'product_name' },
        { 
            title: 'Purchase Price', 
            dataIndex: 'purchase_price', 
            key: 'purchase_price',
            render: (text, record) => (
                <InputNumber
                    defaultValue={text}
                    style={{ width: '100%' }}
                    prefix="Rs. "
                    onChange={(value) => handleItemChange(record.id, 'purchase_price', value)}
                />
            )
        },
        { 
            title: 'Sale Price', 
            dataIndex: 'sale_price', 
            key: 'sale_price',
            render: (text, record) => (
                <InputNumber
                    defaultValue={text}
                    style={{ width: '100%' }}
                    prefix="Rs. "
                    onChange={(value) => handleItemChange(record.id, 'sale_price', value)}
                />
            )
        },
        { 
            title: 'IMEI/Serial', 
            dataIndex: 'imei', 
            key: 'imei',
            render: (text, record) => (
                <Input
                    defaultValue={text}
                    onChange={(e) => handleItemChange(record.id, 'imei', e.target.value)}
                />
            )
        },
    ];
    const showReturnModal = () => {
        returnForm.setFieldsValue({ return_date: dayjs(), notes: '' });
        setSelectedReturnItems([]);
        setIsReturnModalVisible(true);
    };

    const handleReturnSubmit = async (values) => {
        if (selectedReturnItems.length === 0) {
            notification.warning({ message: 'No Items Selected', description: 'Please select at least one item to return.' });
            return;
        }
        try {
            const returnData = {
                purchase_id: id,
                item_ids: selectedReturnItems,
                return_date: values.return_date.format('YYYY-MM-DD'),
                notes: values.notes || null,
            };
            await DataService.createPurchaseReturn(returnData);
            notification.success({ message: 'Success', description: 'Items returned successfully!' });
            setIsReturnModalVisible(false);
            fetchDetails(); // Details ko refresh karein
        } catch (error) {
            notification.error({ message: 'Error', description: 'Failed to process return.' });
        }
    };

    const returnItemSelection = {
        onChange: (selectedRowKeys) => {
            setSelectedReturnItems(selectedRowKeys);
        },
    };

    const itemColumns = [
        { title: 'Product', dataIndex: ['products', 'name'], key: 'product_name' },
        { title: 'IMEI/Serial', dataIndex: 'imei', key: 'imei', render: (text) => text || 'N/A' },
        { title: 'Condition', dataIndex: 'condition', key: 'condition' },
        { title: 'Purchase Price', dataIndex: 'purchase_price', key: 'purchase_price', align: 'right', render: (val) => `Rs. ${val ? val.toLocaleString() : 0}` },
    ];

    if (loading) return <div style={{ textAlign: 'center', padding: '50px' }}><Spin size="large" /></div>;
    if (!purchase) return <Alert message="Not Found" description="No purchase found with this ID." type="warning" showIcon />;

    return (
        <div>
            <Breadcrumb items={[ { title: <Link to="/purchases">Purchases</Link> }, { title: `Purchase #${id}` } ]} style={{ marginBottom: '16px' }}/>
            <Card>
                <Row justify="space-between" align="middle">
                    <Col><Title level={2} style={{ margin: 0 }}>Purchase #{purchase.id}</Title><Text type="secondary">Date: {new Date(purchase.purchase_date).toLocaleDateString()}</Text></Col>
                    <Col><Tag color={getStatusColor(purchase.status)} style={{ fontSize: '14px', padding: '6px 12px' }}>{purchase.status.replace('_', ' ').toUpperCase()}</Tag></Col>
                </Row>
                <Row gutter={16} style={{ marginTop: '24px' }}>
                    <Col span={8}><Statistic title="Supplier" value={purchase.suppliers?.name || 'N/A'} /></Col>
                    <Col span={5}><Statistic title="Total Amount" value={purchase.total_amount} prefix="Rs. " /></Col>
                    <Col span={5}><Statistic title="Amount Paid" value={purchase.amount_paid} prefix="Rs. " valueStyle={{ color: '#52c41a' }} /></Col>
                    <Col span={6}><Statistic title="Balance Due" value={purchase.balance_due} prefix="Rs. " valueStyle={{ color: '#cf1322' }} /></Col>
                </Row>
                {purchase.notes && (
                    <div style={{ marginTop: '24px', padding: '12px', background: '#2c2c2c', borderRadius: '6px' }}>
                        <Text strong>Notes:</Text>
                        <br />
                        <Text type="secondary">{purchase.notes}</Text>
                    </div>
                )}
                <div style={{ marginTop: '24px', display: 'flex', gap: '8px' }}>
                    <Button type="primary" icon={<DollarCircleOutlined />} onClick={showPaymentModal} disabled={purchase.balance_due <= 0}>Record a Payment</Button>
                    <Button icon={<EditOutlined />} onClick={showEditModal} disabled={purchase.status === 'paid'}>Edit Purchase</Button>
                    <Button danger icon={<RollbackOutlined />} onClick={showReturnModal}>Return Items</Button>
                </div>
            </Card>
            <Title level={3} style={{ marginTop: '32px' }}>Items in this Purchase ({items.length})</Title>
            <Table columns={itemColumns} dataSource={items} rowKey="id" pagination={false} />
            <Link to="/purchases"><Button style={{ marginTop: '24px' }} icon={<ArrowLeftOutlined />}>Back to Purchases List</Button></Link>
            <Modal title="Record Payment" open={isPaymentModalVisible} onCancel={() => setIsPaymentModalVisible(false)} onOk={paymentForm.submit} okText="Save Payment">
                <Form form={paymentForm} layout="vertical" onFinish={handlePaymentSubmit} style={{marginTop: '24px'}}>
                    <Form.Item name="amount" label="Payment Amount" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} prefix="Rs. " min={0} /></Form.Item>
                    <Form.Item name="payment_date" label="Payment Date" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item>
                    <Form.Item name="payment_method" label="Payment Method" rules={[{ required: true }]}>
                        <Select>
                            <Option value="Cash">Cash</Option><Option value="Bank Transfer">Bank Transfer</Option>
                            <Option value="Cheque">Cheque</Option><Option value="Other">Other</Option>
                        </Select>
                    </Form.Item>
                    <Form.Item name="notes" label="Notes (Optional)"><Input.TextArea rows={2} /></Form.Item>
                </Form>
            </Modal>
            <Modal
                title={`Editing Purchase #${purchase.id}`}
                open={isEditModalVisible}
                onCancel={() => setIsEditModalVisible(false)}
                onOk={editForm.submit}
                okText="Save Changes"
                width={1000}
            >
                <Form form={editForm} layout="vertical" onFinish={handleUpdateSubmit} style={{ marginTop: '24px' }}>
                    <Form.Item name="notes" label="Notes (Optional)">
                        <Input.TextArea rows={2} />
                    </Form.Item>
                    <Title level={5} style={{ marginTop: '16px' }}>Items in this Purchase</Title>
                    <Table
                        columns={editItemColumns}
                        dataSource={editingItems}
                        rowKey="id"
                        pagination={false}
                        size="small"
                    />
                </Form>
            </Modal>
            <Modal
                title="Return Items to Supplier"
                open={isReturnModalVisible}
                onCancel={() => setIsReturnModalVisible(false)}
                onOk={returnForm.submit}
                okText="Process Return"
                width={800}
                okButtonProps={{ danger: true }}
            >
                <Form form={returnForm} layout="vertical" onFinish={handleReturnSubmit} style={{ marginTop: '24px' }}>
                    <Form.Item name="return_date" label="Return Date" rules={[{ required: true }]}>
                        <DatePicker style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item name="notes" label="Reason for Return (Optional)">
                        <Input.TextArea rows={2} placeholder="e.g., Damaged items, wrong model, etc." />
                    </Form.Item>
                    <Title level={5} style={{ marginTop: '16px' }}>Select Items to Return</Title>
                    <Table
                        rowSelection={{ type: 'checkbox', ...returnItemSelection }}
                        columns={itemColumns}
                        dataSource={items}
                        rowKey="id"
                        pagination={false}
                        size="small"
                    />
                </Form>
            </Modal>
        </div>
    );
};

export default PurchaseDetails;