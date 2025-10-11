// src/components/SupplierDashboard.jsx - MUKAMMAL THEEK SHUDA CODE

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Layout, Menu, Typography, Card, Row, Col, Table, Tag, Spin, Alert, App as AntApp, Statistic, Empty, Button, Flex, Modal, Form, Input, Space, Popconfirm, InputNumber, DatePicker, Select, theme } from 'antd'; // theme ko yahan import karein
import { PlusOutlined, EditOutlined, DeleteOutlined, DollarCircleOutlined, MinusCircleOutlined, SearchOutlined } from '@ant-design/icons';
import DataService from '../DataService';
import dayjs from 'dayjs';

const { Sider, Content } = Layout;
const { Title, Text } = Typography;

// -- SupplierLedger Component (koi tabdeeli nahi) --
const SupplierLedger = ({ supplier, onRefresh }) => {
    // ... (yeh poora component jaisa tha waisa hi rahega)
    const [ledgerData, setLedgerData] = useState([]);
    const [loading, setLoading] = useState(true);
    const { notification } = AntApp.useApp();
    const [isPaymentModalVisible, setIsPaymentModalVisible] = useState(false);
    const [paymentForm] = Form.useForm();
    const [isRefundModalVisible, setIsRefundModalVisible] = useState(false);
    const [refundForm] = Form.useForm();

    const fetchLedger = useCallback(async () => {
        if (!supplier?.id) return; setLoading(true);
        try {
            const { purchases, payments } = await DataService.getSupplierLedgerDetails(supplier.id);
            const combinedData = [
                ...(purchases || []).map(p => ({
                    key: `pur-${p.id}`, date: p.purchase_date, type: 'Purchase', details: `Purchase #${p.id}`, debit: p.total_amount, credit: 0, link: `/purchases/${p.id}`
                })),
                ...(payments || []).map(p => ({
                    key: `pay-${p.id}`, date: p.payment_date, type: 'Payment', details: `Payment via ${p.payment_method}` + (p.notes ? ` (${p.notes})` : ''), debit: 0, credit: p.amount,
                }))
            ];
            combinedData.sort((a, b) => new Date(b.date) - new Date(a.date)); setLedgerData(combinedData);
        } catch (err) { notification.error({ message: 'Error', description: 'Failed to load supplier ledger.' });
        } finally { setLoading(false); }
    }, [supplier, notification]);

    useEffect(() => { fetchLedger(); }, [fetchLedger]);

    const showPaymentModal = () => { paymentForm.setFieldsValue({ amount: supplier.balance_due > 0 ? supplier.balance_due : undefined, payment_date: dayjs(), payment_method: 'Cash', notes: null }); setIsPaymentModalVisible(true); };
    const handlePaymentSubmit = async (values) => {
        try {
            const paymentData = { supplier_id: supplier.id, ...values };
            await DataService.recordBulkSupplierPayment(paymentData);
            notification.success({ message: 'Success', description: 'Payment recorded!' });
            setIsPaymentModalVisible(false); onRefresh();
        } catch (error) { notification.error({ message: 'Error', description: error.message || 'Failed to record payment.' }); }
    };
    const showRefundModal = () => { refundForm.setFieldsValue({ amount: supplier.credit_balance > 0 ? supplier.credit_balance : undefined, refund_date: dayjs(), refund_method: 'Cash', notes: 'Credit settlement' }); setIsRefundModalVisible(true); };
    const handleRefundSubmit = async (values) => {
        try {
            const refundData = { supplier_id: supplier.id, ...values };
            await DataService.recordSupplierRefund(refundData);
            notification.success({ message: 'Success', description: 'Refund recorded!' });
            setIsRefundModalVisible(false); onRefresh();
        } catch (error) { notification.error({ message: 'Error', description: error.message || 'Failed to record refund.' }); }
    };

    const ledgerColumns = [
        { title: 'Date', dataIndex: 'date', key: 'date', render: (d) => new Date(d).toLocaleString() },
        { title: 'Type', dataIndex: 'type', key: 'type', render: (t) => <Tag color={t === 'Purchase' ? 'volcano' : 'green'}>{t}</Tag> },
        { title: 'Details', dataIndex: 'details', key: 'details', render: (text, record) => record.link ? <Link to={record.link}>{text}</Link> : text },
        { title: 'Debit', dataIndex: 'debit', key: 'debit', align: 'right', render: (val) => val ? `Rs. ${val.toLocaleString()}` : '-' },
        { title: 'Credit', dataIndex: 'credit', key: 'credit', align: 'right', render: (val) => val ? `Rs. ${val.toLocaleString()}` : '-' },
    ];
    if (loading) return <div style={{ textAlign: 'center', padding: '50px' }}><Spin /></div>;
    return (
        <div>
            <Space style={{ marginBottom: 24 }}>
                <Button type="primary" icon={<DollarCircleOutlined />} onClick={showPaymentModal} disabled={!supplier || supplier.balance_due <= 0}> Record Payment </Button>
                <Button danger icon={<MinusCircleOutlined />} onClick={showRefundModal} disabled={!supplier || supplier.credit_balance <= 0}> Record Refund </Button>
            </Space>
            <Row gutter={16} style={{ marginBottom: '24px' }}>
                <Col span={6}><Statistic title="Total Business" value={supplier?.total_purchases || 0} prefix="Rs. " /></Col>
                <Col span={6}><Statistic title="Total Paid" value={supplier?.total_payments || 0} prefix="Rs. " /></Col>
                <Col span={6}><Statistic title="Balance Due" value={supplier?.balance_due || 0} prefix="Rs. " valueStyle={{ color: '#cf1322' }} /></Col>
                <Col span={6}><Statistic title="Your Credit" value={supplier?.credit_balance || 0} prefix="Rs. " valueStyle={{ color: '#52c41a' }} /></Col>
            </Row>
            <Title level={4}>Transaction Ledger</Title>
            <Table columns={ledgerColumns} dataSource={ledgerData} rowKey="key" pagination={{ pageSize: 10 }} size="small"/>
            <Modal title={`Record Payment for ${supplier?.name}`} open={isPaymentModalVisible} onCancel={() => setIsPaymentModalVisible(false)} onOk={paymentForm.submit} okText="Save Payment">
                <Form form={paymentForm} layout="vertical" onFinish={handlePaymentSubmit} style={{marginTop: 24}}>
                    <Form.Item name="amount" label="Payment Amount" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} prefix="Rs. " min={0} /></Form.Item>
                    <Form.Item name="payment_date" label="Payment Date" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item>
                    <Form.Item name="payment_method" label="Payment Method" rules={[{ required: true }]}>
                        <Select><Select.Option value="Cash">Cash</Select.Option><Select.Option value="Bank Transfer">Bank Transfer</Select.Option></Select>
                    </Form.Item>
                    <Form.Item name="notes" label="Notes (Optional)"><Input.TextArea rows={2} /></Form.Item>
                </Form>
            </Modal>
             <Modal title={`Record Refund from ${supplier?.name}`} open={isRefundModalVisible} onCancel={() => setIsRefundModalVisible(false)} onOk={refundForm.submit} okText="Save Refund">
                <Form form={refundForm} layout="vertical" onFinish={handleRefundSubmit} style={{marginTop: 24}}>
                    <Form.Item name="amount" label="Refund Amount" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} prefix="Rs. " min={0} max={supplier?.credit_balance} /></Form.Item>
                    <Form.Item name="refund_date" label="Refund Date" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item>
                    <Form.Item name="refund_method" label="Refund Method" rules={[{ required: true }]}>
                        <Select><Select.Option value="Cash">Cash</Select.Option><Select.Option value="Bank Transfer">Bank Transfer</Select.Option></Select>
                    </Form.Item>
                    <Form.Item name="notes" label="Notes (Optional)"><Input.TextArea rows={2} /></Form.Item>
                </Form>
            </Modal>
        </div>
    );
};


// -- Main Dashboard Component --
const SupplierDashboard = () => {
    // 1. THEME TOKEN HASIL KAREIN
    const { token } = theme.useToken();

    const [suppliers, setSuppliers] = useState([]);
    const [selectedSupplierId, setSelectedSupplierId] = useState(null);
    const [loading, setLoading] = useState(true);
    const { notification } = AntApp.useApp();
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState(null);
    const [form] = Form.useForm();
    const [searchTerm, setSearchTerm] = useState('');

    const fetchSuppliers = useCallback(async (selectIdAfterFetch = null) => {
        setLoading(true);
        try {
            const data = await DataService.getSuppliers();
            setSuppliers(data || []);
            
            if (selectIdAfterFetch) {
                setSelectedSupplierId(selectIdAfterFetch);
            } else if (data && data.length > 0 && !selectedSupplierId) {
                setSelectedSupplierId(data[0].id);
            }
        } catch (error) { notification.error({ message: 'Error', description: 'Failed to fetch suppliers list.' });
        } finally { setLoading(false); }
    }, [notification, selectedSupplierId]);

    useEffect(() => { fetchSuppliers(); }, []);

    const handleAddNew = () => { setEditingSupplier(null); form.resetFields(); setIsModalVisible(true); };
    const handleEdit = (supplier) => { setEditingSupplier(supplier); form.setFieldsValue(supplier); setIsModalVisible(true); };
    const handleDelete = async (supplierId) => {
        try {
            await DataService.deleteSupplier(supplierId);
            notification.success({ message: 'Success', description: 'Supplier deleted successfully.' });
            if(selectedSupplierId === supplierId) setSelectedSupplierId(null); fetchSuppliers();
        } catch (error) { notification.error({ message: 'Error', description: 'Failed to delete supplier.' }); }
    };
    const handleModalOk = async () => {
        try {
            const values = await form.validateFields();
            if (editingSupplier) {
                await DataService.updateSupplier(editingSupplier.id, values);
                notification.success({ message: 'Success', description: 'Supplier updated.' });
                fetchSuppliers(editingSupplier.id);
            } else {
                const newSupplier = await DataService.addSupplier(values);
                notification.success({ message: 'Success', description: 'Supplier added.' });
                fetchSuppliers(newSupplier.id);
            }
            setIsModalVisible(false);
        } catch (error) {}
    };

    const selectedSupplier = suppliers.find(s => s.id === selectedSupplierId);

    const filteredSuppliers = useMemo(() => {
        if (!searchTerm) return suppliers;
        return suppliers.filter(s => 
            s.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [suppliers, searchTerm]);

    const totalBalanceDue = useMemo(() => 
        suppliers.reduce((sum, s) => sum + (s.balance_due || 0), 0)
    , [suppliers]);

    const renderSupplierDetails = () => {
        if (!selectedSupplierId || !selectedSupplier) return (
            <Content style={{ padding: '0 24px', minHeight: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Empty description={suppliers.length > 0 ? "Select a supplier to see details." : "No suppliers found. Please add one."} />
            </Content>
        );
        return (
            <Content style={{ padding: '0 24px' }}>
                <Card> {/* variant="borderless" ko hata diya taake card nazar aaye */}
                    <Flex justify="space-between" align="start">
                        <div>
                            <Title level={2} style={{ margin: 0 }}>{selectedSupplier.name}</Title>
                            <Text type="secondary">{selectedSupplier.contact_person} | {selectedSupplier.phone}</Text><br/>
                            <Text type="secondary">{selectedSupplier.address}</Text>
                        </div>
                         <Space>
                             <Button icon={<EditOutlined />} onClick={() => handleEdit(selectedSupplier)}>Edit Info</Button>
                            <Popconfirm title={`Delete "${selectedSupplier.name}"?`} description="This cannot be undone." onConfirm={() => handleDelete(selectedSupplier.id)} okText="Yes, Delete" cancelText="No">
                                 <Button icon={<DeleteOutlined />} danger>Delete</Button>
                            </Popconfirm>
                        </Space>
                    </Flex>
                    <div style={{ marginTop: '32px' }}>
                        <SupplierLedger supplier={selectedSupplier} onRefresh={() => fetchSuppliers(selectedSupplier.id)} />
                    </div>
                </Card>
            </Content>
        );
    };

    return (
        <Layout style={{ background: 'transparent' }}>
            <Title level={2} style={{ margin: '0 0 16px 0' }}>Suppliers Dashboard</Title>
            
            <Row gutter={16} style={{ marginBottom: '24px' }}>
                <Col span={8}>
                    <Card><Statistic title="Total Suppliers" value={suppliers.length} /></Card>
                </Col>
                <Col span={8}>
                     <Card><Statistic title="Total Outstanding Balance" value={totalBalanceDue} prefix="Rs. " valueStyle={{ color: totalBalanceDue > 0 ? '#cf1322' : '#52c41a' }} /></Card>
                </Col>
            </Row>
             
            {/* 2. HARDCODED BACKGROUND KO TOKEN SE BADAL DIYA */}
            <Layout style={{ background: token.colorBgContainer, borderRadius: token.borderRadiusLG, overflow: 'hidden' }}>
                {/* 3. HARDCODED BACKGROUND KO TOKEN SE BADAL DIYA */}
                <Sider width={300} style={{ background: token.colorBgLayout }}>
                    <div style={{ padding: '8px', borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
                        <Flex gap="small">
                             <Input 
                                placeholder="Search supplier..." 
                                prefix={<SearchOutlined />} 
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                style={{ flexGrow: 1 }}
                            />
                            <Button type="primary" icon={<PlusOutlined />} onClick={handleAddNew} />
                        </Flex>
                    </div>
                    {loading ? <div style={{textAlign: 'center', padding: '20px'}}><Spin/></div> :
                         <Menu
                            // 4. theme="dark" KO HATA DIYA
                            mode="inline" 
                            selectedKeys={[String(selectedSupplierId)]}
                            onClick={({ key }) => setSelectedSupplierId(Number(key))}
                            style={{ height: 'calc(100vh - 310px)', overflowY: 'auto', borderRight: 0, background: 'transparent' }}
                            items={filteredSuppliers.map(s => ({
                                key: s.id,
                                label: (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span>{s.name}</span>
                                        {s.balance_due > 0 && <Tag color="red">Rs. {s.balance_due.toLocaleString()}</Tag>}
                                    </div>
                                )
                            }))}
                        />
                    }
                </Sider>
                <Layout>{renderSupplierDetails()}</Layout>
            </Layout>
            <Modal title={editingSupplier ? "Edit Supplier" : "Add New Supplier"} open={isModalVisible} onOk={handleModalOk} onCancel={() => setIsModalVisible(false)} okText="Save" destroyOnHidden>
                <Form form={form} layout="vertical" name="supplier_form" style={{ marginTop: 24 }}>
                    <Form.Item name="name" label="Supplier Name" rules={[{ required: true }]}><Input /></Form.Item>
                    <Form.Item name="contact_person" label="Contact Person"><Input /></Form.Item>
                    <Form.Item name="phone" label="Phone Number"><Input /></Form.Item>
                    <Form.Item name="address" label="Address"><Input.TextArea rows={2} /></Form.Item>
                </Form>
            </Modal>
        </Layout>
    );
};

export default SupplierDashboard;