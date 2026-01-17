import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Layout, Menu, Typography, Card, Row, Col, Table, Tag, Spin, Alert, App as AntApp, Statistic, Empty, Button, Flex, Modal, Form, Input, Space, Popconfirm, InputNumber, DatePicker, Select, theme, List } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, DollarCircleOutlined, MinusCircleOutlined, SearchOutlined, ArrowLeftOutlined, ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import DataService from '../DataService';
import dayjs from 'dayjs';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/currencyFormatter';
import { db } from '../db';
import { useSync } from '../context/SyncContext';

const { Sider, Content } = Layout;
const { Title, Text } = Typography;


const SupplierLedger = ({ supplier, onRefresh, isMobile }) => {
    const { profile } = useAuth();
    const [ledgerData, setLedgerData] = useState([]);
    // NAYA: Stats save karne ke liye state
    const [calculatedStats, setCalculatedStats] = useState(null); 
    const [loading, setLoading] = useState(true);
    const { notification } = AntApp.useApp();
    const [isPaymentModalVisible, setIsPaymentModalVisible] = useState(false);
    const [paymentForm] = Form.useForm();
    const [isRefundModalVisible, setIsRefundModalVisible] = useState(false);
    const [refundForm] = Form.useForm();

    // --- Edit Payment State (NAYA CODE) ---
    const [isEditPaymentVisible, setIsEditPaymentVisible] = useState(false);
    const [editingPayment, setEditingPayment] = useState(null);
    const [editPaymentForm] = Form.useForm();

    const handleEditPaymentClick = (record) => {
        setEditingPayment(record);
        editPaymentForm.setFieldsValue({
            amount: record.credit, 
            notes: record.original_notes
        });
        setIsEditPaymentVisible(true);
    };

    const handleEditPaymentSubmit = async (values) => {
        try {
            await DataService.editSupplierPayment(editingPayment.id, values.amount, values.notes);
            notification.success({ message: 'Success', description: 'Payment updated successfully!' });
            setIsEditPaymentVisible(false);
            onRefresh(); 
        } catch (error) {
            notification.error({ message: 'Error', description: 'Failed to update payment.' });
        }
    };

    const fetchLedger = useCallback(async () => {
        if (!supplier?.id) return; setLoading(true);
        try {
            // Yahan hum refunds bhi mangwa rahe hain
            const { supplier: calculatedSup, purchases, payments, refunds } = await DataService.getSupplierLedgerDetails(supplier.id);
            
            setCalculatedStats(calculatedSup);

            const combinedData = [
                ...(purchases || []).map(p => ({
                    key: `pur-${p.id}`, date: p.purchase_date, type: 'Purchase', details: `Purchase #${p.id}`, debit: p.total_amount, credit: 0, link: `/purchases/${p.id}`
                })),
                ...(payments || []).map(p => ({
                    key: `pay-${p.id}`, 
                    id: p.id, 
                    original_notes: p.notes, 
                    payment_method: p.payment_method,
                    date: p.payment_date, 
                    type: 'Payment', 
                    details: `Payment via ${p.payment_method}` + (p.notes ? ` (${p.notes})` : ''), 
                    debit: 0, 
                    credit: p.amount,
                })),
                // --- Refunds ko list mein shamil kiya ---
                ...(refunds || []).map(r => ({
                    key: `ref-${r.id}`, 
                    date: r.refund_date, 
                    type: 'Refund', 
                    details: `Refund Received via ${r.refund_method || r.payment_method || 'Cash'}` + (r.notes ? ` (${r.notes})` : ''), 
                    debit: 0, 
                    credit: r.amount, 
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
            // Date ko sahi format (ISO String) mein convert karein
            const formattedValues = {
                ...values,
                payment_date: values.payment_date ? values.payment_date.toISOString() : new Date().toISOString()
            };

            const paymentData = { local_id: crypto.randomUUID(), supplier_id: supplier.id, ...formattedValues };
            await DataService.recordBulkSupplierPayment(paymentData);
            notification.success({ message: 'Success', description: 'Payment recorded!' });
            setIsPaymentModalVisible(false); onRefresh();
        } catch (error) { notification.error({ message: 'Error', description: error.message || 'Failed to record payment.' }); }
    };
    const showRefundModal = () => { refundForm.setFieldsValue({ amount: supplier.credit_balance > 0 ? supplier.credit_balance : undefined, refund_date: dayjs(), refund_method: 'Cash', notes: 'Credit settlement' }); setIsRefundModalVisible(true); };
    const handleRefundSubmit = async (values) => {
        try {
            // Date ko sahi format (ISO String) mein convert karein
            const formattedValues = {
                ...values,
                refund_date: values.refund_date ? values.refund_date.toISOString() : new Date().toISOString()
            };

            const refundData = { local_id: crypto.randomUUID(), supplier_id: supplier.id, ...formattedValues };
            await DataService.recordSupplierRefund(refundData);
            notification.success({ message: 'Success', description: 'Refund recorded!' });
            setIsRefundModalVisible(false); onRefresh();
        } catch (error) { notification.error({ message: 'Error', description: error.message || 'Failed to record refund.' }); }
    };

    const ledgerColumns = [
        { title: 'Date', dataIndex: 'date', key: 'date', render: (d) => new Date(d).toLocaleDateString() },
        { title: 'Type', dataIndex: 'type', key: 'type', render: (t) => <Tag color={t === 'Purchase' ? 'volcano' : 'green'}>{t}</Tag> },
        { title: 'Details', dataIndex: 'details', key: 'details', render: (text, record) => record.link ? <Link to={record.link}>{text}</Link> : text },
        // YEH LINE TABDEEL HUI HAI
        { title: 'Debit', dataIndex: 'debit', key: 'debit', align: 'right', render: (val) => val ? formatCurrency(val, profile?.currency) : '-' },
        // YEH LINE BHI TABDEEL HUI HAI
        { title: 'Credit', dataIndex: 'credit', key: 'credit', align: 'right', render: (val) => val ? formatCurrency(val, profile?.currency) : '-' },
        { 
            title: 'Action', 
            key: 'action', 
            align: 'center', 
            render: (_, record) => {
                if (record.type === 'Payment') {
                    return (
                        <Button 
                            icon={<EditOutlined />} 
                            size="small"
                            onClick={() => handleEditPaymentClick(record)}
                        />
                    );
                }
                return null;
            }
        },
    ];
    
    if (loading) return <div style={{ textAlign: 'center', padding: '50px' }}><Spin /></div>;
    
    return (
        <div>
            <Space style={{ marginBottom: 24 }} wrap>
                <Button type="primary" icon={<DollarCircleOutlined />} onClick={showPaymentModal} disabled={!supplier || supplier.balance_due <= 0}> Record Payment </Button>
                <Button danger icon={<MinusCircleOutlined />} onClick={showRefundModal} disabled={!supplier || supplier.credit_balance <= 0}> Record Refund </Button>
            </Space>

            <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
                <Col xs={12} md={6}><Statistic title="Total Business" value={calculatedStats?.total_purchases || 0} formatter={() => formatCurrency(calculatedStats?.total_purchases || 0, profile?.currency)} /></Col>
<Col xs={12} md={6}><Statistic title="Total Paid" value={calculatedStats?.total_payments || 0} formatter={() => formatCurrency(calculatedStats?.total_payments || 0, profile?.currency)} /></Col>
                <Col xs={12} md={6}><Statistic title="Balance Due" value={supplier?.balance_due || 0} valueStyle={{ color: '#cf1322' }} formatter={() => formatCurrency(supplier?.balance_due || 0, profile?.currency)} /></Col>
                <Col xs={12} md={6}><Statistic title="Your Credit" value={supplier?.credit_balance || 0} valueStyle={{ color: '#52c41a' }} formatter={() => formatCurrency(supplier?.credit_balance || 0, profile?.currency)} /></Col>
            </Row>

            <Title level={4}>Transaction Ledger</Title>
            
            {isMobile ? (
                <List
                    dataSource={ledgerData}
                    rowKey="key"
                    renderItem={(item) => (
                        <List.Item style={{ padding: '8px 0' }}>
                            <Card style={{ width: '100%' }} size="small">
                                <Row justify="space-between" align="middle" gutter={8}>
                                    <Col flex="auto">
                                        <Tag color={item.type === 'Purchase' ? 'volcano' : 'green'}>{item.type}</Tag>
                                        <div style={{ marginTop: '4px' }}>
                                            <Text>{item.link ? <Link to={item.link}>{item.details}</Link> : item.details}</Text>
                                        </div>
                                        <Text type="secondary" style={{ fontSize: '12px' }}>{new Date(item.date).toLocaleDateString()}</Text>
                                    </Col>
                                    <Col style={{ textAlign: 'right' }}>
    {item.debit > 0 && (
        <Text type="danger" strong>
            <ArrowDownOutlined /> {formatCurrency(item.debit, profile?.currency)}
        </Text>
    )}
    {item.credit > 0 && (
        <Text type="success" strong>
            <ArrowUpOutlined /> {formatCurrency(item.credit, profile?.currency)}
        </Text>
    )}
</Col>
                                </Row>
                            </Card>
                        </List.Item>
                    )}
                />
            ) : (
                <Table columns={ledgerColumns} dataSource={ledgerData} rowKey="key" pagination={{ pageSize: 10 }} size="small"/>
            )}

            <Modal title={`Record Payment for ${supplier?.name}`} open={isPaymentModalVisible} onCancel={() => setIsPaymentModalVisible(false)} onOk={paymentForm.submit} okText="Save Payment">
                <Form form={paymentForm} layout="vertical" onFinish={handlePaymentSubmit} style={{marginTop: 24}}>
                    <Form.Item name="amount" label="Payment Amount" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} prefix={profile?.currency ? `${profile.currency} ` : ''} min={0} /></Form.Item>
                    <Form.Item name="payment_date" label="Payment Date" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item>
                    <Form.Item name="payment_method" label="Payment Method" rules={[{ required: true }]}>
                        <Select><Select.Option value="Cash">Cash</Select.Option><Select.Option value="Bank Transfer">Bank Transfer</Select.Option></Select>
                    </Form.Item>
                    <Form.Item name="notes" label="Notes (Optional)"><Input.TextArea rows={2} /></Form.Item>
                </Form>
            </Modal>
             <Modal title={`Record Refund from ${supplier?.name}`} open={isRefundModalVisible} onCancel={() => setIsRefundModalVisible(false)} onOk={refundForm.submit} okText="Save Refund">
                <Form form={refundForm} layout="vertical" onFinish={handleRefundSubmit} style={{marginTop: 24}}>
                    <Form.Item name="amount" label="Refund Amount" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} prefix={profile?.currency ? `${profile.currency} ` : ''} min={0} max={supplier?.credit_balance} /></Form.Item>
                    <Form.Item name="refund_date" label="Refund Date" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item>
                    <Form.Item name="refund_method" label="Refund Method" rules={[{ required: true }]}>
                        <Select><Select.Option value="Cash">Cash</Select.Option><Select.Option value="Bank Transfer">Bank Transfer</Select.Option></Select>
                    </Form.Item>
                    <Form.Item name="notes" label="Notes (Optional)"><Input.TextArea rows={2} /></Form.Item>
                </Form>
            </Modal>
            <Modal 
                title="Edit Payment" 
                open={isEditPaymentVisible} 
                onCancel={() => setIsEditPaymentVisible(false)} 
                onOk={editPaymentForm.submit} 
                okText="Update Payment"
            >
                <Form form={editPaymentForm} layout="vertical" onFinish={handleEditPaymentSubmit} style={{ marginTop: 24 }}>
                    <Alert 
                        message="Warning" 
                        description="Changing the amount will automatically adjust (revert and re-apply) the related bills." 
                        type="warning" 
                        showIcon 
                        style={{ marginBottom: 16 }} 
                    />
                    <Form.Item name="amount" label="Amount" rules={[{ required: true }]}>
                        <InputNumber style={{ width: '100%' }} min={0} />
                    </Form.Item>
                    <Form.Item name="notes" label="Notes / Reason">
                        <Input.TextArea rows={2} placeholder="Reason for change..." />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};


const SupplierDashboard = () => {
    const { token } = theme.useToken();
    const searchInputRef = useRef(null);
    const supplierNameInputRef = useRef(null);

    const { processSyncQueue } = useSync();
    const { profile } = useAuth();
    const isMobile = useMediaQuery('(max-width: 768px)');
    
    const [suppliers, setSuppliers] = useState([]);
    const [selectedSupplierId, setSelectedSupplierId] = useState(null);
    const [loading, setLoading] = useState(true);
    const { notification } = AntApp.useApp();
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState(null);
    const [form] = Form.useForm();
    const [searchTerm, setSearchTerm] = useState('');
    // --- FOCUS LOGIC (Corrected Position) ---
    useEffect(() => {
        const timer = setTimeout(() => {
            searchInputRef.current?.focus();
        }, 100);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (isModalVisible) {
            const timer = setTimeout(() => {
                supplierNameInputRef.current?.focus();
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [isModalVisible]);

    useEffect(() => {
    if (isModalVisible) { // Agar modal khula hua hai
        if (editingSupplier) { // Aur hum kisi supplier ko edit kar rahe hain
            form.setFieldsValue(editingSupplier); // To uska data form mein daal do
        } else { // Warna (yaani naya supplier add kar rahe hain)
            form.resetFields(); // Form ko bilkul saaf kar do
        }
    }
}, [isModalVisible, editingSupplier, form]);

    const fetchSuppliers = useCallback(async (selectIdAfterFetch = null) => {
        setLoading(true);
        try {
            const data = await DataService.getSuppliers();
            setSuppliers(data || []);
            
            if (selectIdAfterFetch) {
                setSelectedSupplierId(selectIdAfterFetch);
            } else if (!isMobile && data && data.length > 0 && !selectedSupplierId) {
                setSelectedSupplierId(data[0].id);
            }
        } catch (error) { notification.error({ message: 'Error', description: 'Failed to fetch suppliers list.' });
        } finally { setLoading(false); }
    }, [notification, selectedSupplierId, isMobile]);

    useEffect(() => { fetchSuppliers(); }, []);

    const handleAddNew = () => { setEditingSupplier(null); setIsModalVisible(true); };
    const handleEdit = (supplier) => { setEditingSupplier(supplier); setIsModalVisible(true); };
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

    const selectedSupplier = suppliers.find(s => String(s.id) === String(selectedSupplierId));

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
            <Content style={{ padding: isMobile ? 0 : '0 24px', minHeight: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Empty description={suppliers.length > 0 ? "Select a supplier to see details." : "No suppliers found. Please add one."} />
            </Content>
        );
        return (
            <Content style={{ padding: isMobile ? 0 : '0 24px' }}>
                <Card>
                    {isMobile && (
                        <Button
                            type="text"
                            icon={<ArrowLeftOutlined />}
                            onClick={() => setSelectedSupplierId(null)}
                            style={{ marginBottom: '16px', padding: 0, height: 'auto' }}
                        >
                            Back to Supplier List
                        </Button>
                    )}
                    <Flex justify="space-between" align="start" wrap="wrap" gap="small">
                        <div style={{ flex: 1, minWidth: '250px' }}>
                            <Title level={isMobile ? 3 : 2} style={{ margin: 0 }}>{selectedSupplier.name}</Title>
                            <Text type="secondary">{selectedSupplier.contact_person} | {selectedSupplier.phone}</Text><br/>
                            <Text type="secondary">{selectedSupplier.address}</Text>
                        </div>
                         <Space style={{ marginTop: isMobile ? '16px' : '0' }}>
                             <Button icon={<EditOutlined />} onClick={() => handleEdit(selectedSupplier)}>Edit</Button>
                            <Popconfirm title={`Delete "${selectedSupplier.name}"?`} description="This cannot be undone." onConfirm={() => handleDelete(selectedSupplier.id)} okText="Yes, Delete" cancelText="No">
                                 <Button icon={<DeleteOutlined />} danger>Delete</Button>
                            </Popconfirm>
                        </Space>
                    </Flex>
                    <div style={{ marginTop: '32px' }}>
                        <SupplierLedger supplier={selectedSupplier} onRefresh={() => fetchSuppliers(selectedSupplier.id)} isMobile={isMobile} />
                    </div>
                </Card>
            </Content>
        );
    };

    return (
        <Layout style={{ background: 'transparent' }}>
            <Title level={2} style={{ margin: '0 0 16px 0' }}>Suppliers Dashboard</Title>
            
            <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
                <Col xs={24} sm={12}>
                    <Card><Statistic title="Total Suppliers" value={suppliers.length} /></Card>
                </Col>
                <Col xs={24} sm={12}>
                     <Card><Statistic title="Total Outstanding Balance" value={totalBalanceDue} valueStyle={{ color: totalBalanceDue > 0 ? '#cf1322' : '#52c41a' }} formatter={() => formatCurrency(totalBalanceDue, profile?.currency)} /></Card>
                </Col>
            </Row>

            {isMobile ? (
                // --- MOBILE LAYOUT ---
                selectedSupplierId ? (
                    renderSupplierDetails()
                ) : (
                    <Card>
                        <div style={{ padding: '8px 0 16px 0' }}>
                            <Flex gap="small">
                                <Input
                                    ref={searchInputRef}
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
                            <List
                                dataSource={filteredSuppliers}
                                renderItem={(s) => (
                                    <List.Item
                                        onClick={() => setSelectedSupplierId(s.id)}
                                        style={{ cursor: 'pointer', padding: '12px 8px' }}
                                    >
                                        <List.Item.Meta title={<Text>{s.name}</Text>} />
                                        {s.balance_due > 0 && <Tag color="red">{formatCurrency(s.balance_due, profile?.currency)}</Tag>}
                                    </List.Item>
                                )}
                            />
                        }
                    </Card>
                )
            ) : (
                // --- DESKTOP LAYOUT ---
                <Layout style={{ background: token.colorBgContainer, borderRadius: token.borderRadiusLG, overflow: 'hidden' }}>
                    <Sider width={300} style={{ background: token.colorBgLayout }}>
                        <div style={{ padding: '8px', borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
                            <Flex gap="small">
                                <Input
                                    ref={searchInputRef}
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
                                mode="inline"
                                selectedKeys={[String(selectedSupplierId)]}
                                onClick={({ key }) => setSelectedSupplierId(key)}
                                style={{ height: 'calc(100vh - 310px)', overflowY: 'auto', borderRight: 0, background: 'transparent' }}
                                items={filteredSuppliers.map(s => ({
                                    key: s.id,
                                    label: (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span>{s.name}</span>
                                            {s.balance_due > 0 && <Tag color="red">{formatCurrency(s.balance_due, profile?.currency)}</Tag>}
                                        </div>
                                    )
                                }))}
                            />
                        }
                    </Sider>
                    <Layout>{renderSupplierDetails()}</Layout>
                </Layout>
            )}

            <Modal title={editingSupplier ? "Edit Supplier" : "Add New Supplier"} open={isModalVisible} onOk={handleModalOk} onCancel={() => setIsModalVisible(false)} okText="Save" destroyOnHidden>
                <Form form={form} layout="vertical" name="supplier_form" style={{ marginTop: 24 }}>
                    <Form.Item name="name" label="Supplier Name" rules={[{ required: true }]}>
                        <Input ref={supplierNameInputRef} />
                    </Form.Item>
                    <Form.Item name="contact_person" label="Contact Person"><Input /></Form.Item>
                    <Form.Item name="phone" label="Phone Number"><Input /></Form.Item>
                    <Form.Item name="address" label="Address"><Input.TextArea rows={2} /></Form.Item>
                </Form>
            </Modal>
        </Layout>
    );
};

export default SupplierDashboard;