import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Layout, Menu, Typography, Card, Row, Col, Table, Tag, Spin, Alert, App as AntApp, Statistic, Empty, Button, Flex, Modal, Form, Input, Space, Popconfirm, InputNumber, DatePicker, Select, theme, List, Dropdown, Tabs, Descriptions, Divider } from 'antd';
import { ShopOutlined, PlusOutlined, EditOutlined, DeleteOutlined, DollarCircleOutlined, MinusCircleOutlined, SearchOutlined, ArrowLeftOutlined, ArrowUpOutlined, ArrowDownOutlined, MoreOutlined, ReloadOutlined, InboxOutlined, EyeOutlined } from '@ant-design/icons';
import DataService from '../DataService';
import dayjs from 'dayjs';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/currencyFormatter';
import { db } from '../db';
import { useSync } from '../context/SyncContext';
import { useTheme } from '../context/ThemeContext';

const { Sider, Content } = Layout;
const { Title, Text } = Typography;


const SupplierLedger = ({ supplier, onRefresh, isMobile }) => {
    const { token } = theme.useToken(); // Control Center Connection
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

    const fetchLedger = useCallback(async () => {
        if (!supplier?.id) return; setLoading(true);
        try {
            const { supplier: calculatedSup, purchases, payments, refunds } = await DataService.getSupplierLedgerDetails(supplier.id);
            
            const totalRefundsAmount = (refunds || []).reduce((sum, r) => sum + (r.amount || 0), 0);
            
            setCalculatedStats({ ...calculatedSup, total_refunds: totalRefundsAmount });

            const combinedData = [
                ...(purchases || []).map(p => ({
                    key: `pur-${p.id}`, 
                    date: p.purchase_date, 
                    created_at: p.created_at, 
                    type: 'Purchase', 
                    details: `Purchase #${p.invoice_id || p.id.slice(0, 8)}`, // <--- Added invoice_id
                    debit: p.total_amount, 
                    credit: 0, 
                    link: `/purchases/${p.id}`
                })),
                ...(payments || []).map(p => {
                    // Purchase dhoondein jis se yeh payment jurri hai
                    const linkedPurchase = (purchases || []).find(pur => pur.id === p.purchase_id);
                    const purchaseDisplayId = linkedPurchase ? (linkedPurchase.invoice_id || linkedPurchase.id.slice(0, 8)) : null;

                    return {
                        key: `pay-${p.id}`, 
                        id: p.id, 
                        original_notes: p.notes, 
                        payment_method: p.payment_method,
                        date: p.payment_date, 
                        created_at: p.created_at,
                        type: 'Payment', 
                        // Details mein Purchase ID shamil karein
                        details: `Payment via ${p.payment_method}` + 
                                 (purchaseDisplayId ? ` (For Purchase #${purchaseDisplayId})` : '') +
                                 (p.notes ? ` - ${p.notes}` : ''), 
                        debit: 0, 
                        credit: p.amount,
                    };
                }),
                ...(refunds || []).map(r => ({
                    key: `ref-${r.id}`, 
                    date: r.refund_date, 
                    created_at: r.created_at,
                    type: 'Refund', 
                    details: `Refund Received via ${r.refund_method || r.payment_method || 'Cash'}` + (r.notes ? ` (${r.notes})` : ''), 
                    debit: r.amount, 
                    credit: 0, 
                }))
            ];
           // A. Calculation ke liye pehle purani se nayi tarteeb (Oldest to Newest)
            combinedData.sort((a, b) => {
                const timeDiff = new Date(a.created_at) - new Date(b.created_at);
                if (timeDiff !== 0) return timeDiff;
                // Agar waqt bilkul barabar ho (maslan Save Purchase par), to Purchase pehle rakho
                const priority = { 'Purchase': 1, 'Return': 2, 'Payment': 3, 'Refund': 4 };
                return (priority[a.type] || 0) - (priority[b.type] || 0);
            });

            // B. Running Balance calculate karein
            let currentBal = 0;
            const dataWithRunningBalance = combinedData.map(item => {
                currentBal += (Number(item.debit || 0) - Number(item.credit || 0));
                return { ...item, running_balance: currentBal };
            });

            // C. Display ke liye ULAT (Newest on Top) karein
            dataWithRunningBalance.sort((a, b) => {
                const timeDiff = new Date(b.created_at) - new Date(a.created_at);
                if (timeDiff !== 0) return timeDiff;
                // Tie-breaker: Agar waqt same ho, to Payment/Refund ko upar dikhao
                const priority = { 'Refund': 4, 'Payment': 3, 'Return': 2, 'Purchase': 1 };
                return (priority[b.type] || 0) - (priority[a.type] || 0);
            });
            
            setLedgerData(dataWithRunningBalance);
            
            setLedgerData(dataWithRunningBalance);
        } catch (err) { notification.error({ message: 'Error', description: 'Failed to load supplier ledger.' });
        } finally { setLoading(false); }
    }, [supplier, notification]);

    useEffect(() => { fetchLedger(); }, [fetchLedger]);

    const showPaymentModal = () => { paymentForm.setFieldsValue({ amount: supplier.balance_due > 0 ? supplier.balance_due : undefined, payment_date: dayjs(), payment_method: 'Cash', notes: null }); setIsPaymentModalVisible(true); };
    const handlePaymentSubmit = async (values) => {
        try {
            const paymentId = crypto.randomUUID();
            const formattedValues = {
                ...values,
                payment_date: values.payment_date ? values.payment_date.toISOString() : new Date().toISOString()
            };

            const paymentData = { 
                id: paymentId, 
                local_id: paymentId, 
                supplier_id: supplier.id, 
                ...formattedValues 
            };
            
            await DataService.recordBulkSupplierPayment(paymentData);
            notification.success({ message: 'Success', description: 'Payment recorded!' });
            setIsPaymentModalVisible(false); 
            onRefresh();
        } catch (error) { 
            notification.error({ message: 'Error', description: error.message || 'Failed to record payment.' }); 
        }
    };
    const showRefundModal = () => { 
        const availableCredit = calculatedStats?.credit_balance || 0;

        refundForm.setFieldsValue({ 
            amount: availableCredit > 0 ? availableCredit : undefined, 
            refund_date: dayjs(), 
            refund_method: 'Cash', 
            notes: 'Credit settlement' 
        }); 
        setIsRefundModalVisible(true); 
    };
    const handleRefundSubmit = async (values) => {
        try {
            const refundId = crypto.randomUUID();
            const formattedValues = {
                ...values,
                refund_date: values.refund_date ? values.refund_date.toISOString() : new Date().toISOString()
            };

            const refundData = { 
                id: refundId, 
                local_id: refundId, 
                supplier_id: supplier.id, 
                ...formattedValues 
            };
            
            await DataService.recordSupplierRefund(refundData);
            notification.success({ message: 'Success', description: 'Refund recorded!' });
            setIsRefundModalVisible(false); 
            onRefresh();
        } catch (error) { 
            notification.error({ message: 'Error', description: error.message || 'Failed to record refund.' }); 
        }
    };

    const ledgerColumns = [
        { title: 'Date', dataIndex: 'date', key: 'date', render: (d) => new Date(d).toLocaleDateString() },
        { title: 'Type', dataIndex: 'type', key: 'type', render: (t) => <Tag color={t === 'Purchase' ? token.colorError : token.colorSuccess}>{t}</Tag> },
        { title: 'Details', dataIndex: 'details', key: 'details', render: (text, record) => record.link ? <Link to={record.link}>{text}</Link> : text },
        { title: 'Debit (Bill)', dataIndex: 'debit', key: 'debit', align: 'right', render: (val) => val ? formatCurrency(val, profile?.currency) : '-' },
        { title: 'Credit (Paid)', dataIndex: 'credit', key: 'credit', align: 'right', render: (val) => val ? formatCurrency(val, profile?.currency) : '-' },
        { 
            title: 'Balance', 
            dataIndex: 'running_balance', 
            key: 'running_balance', 
            align: 'right', 
            render: (val) => (
                <div className="nowrap-column" style={{ color: val > 0 ? token.colorError : token.colorSuccess }}>
                    {formatCurrency(val, profile?.currency)}
                </div>
            )
        },
    ];
    
    if (loading) return <div style={{ textAlign: 'center', padding: '50px' }}><Spin /></div>;
    
    return (
        <div>
            <Space style={{ marginBottom: 24 }} wrap>
                <Button type="primary" icon={<DollarCircleOutlined />} onClick={showPaymentModal} disabled={!supplier || supplier.balance_due <= 0}> Record Payment </Button>
                <Button danger icon={<MinusCircleOutlined />} onClick={showRefundModal} disabled={!supplier || supplier.credit_balance <= 0}> Record Refund </Button>
            </Space>

            <Row gutter={[16, 16]} style={{ marginBottom: '24px', textAlign: 'center' }}>
                <Col xs={12} sm={4}><Statistic title="Total Business" value={calculatedStats?.total_purchases || 0} formatter={() => formatCurrency(calculatedStats?.total_purchases || 0, profile?.currency)} /></Col>
                <Col xs={12} sm={5}><Statistic title="Total Paid" value={calculatedStats?.total_payments || 0} valueStyle={{ color: token.colorPrimary }} formatter={() => formatCurrency(calculatedStats?.total_payments || 0, profile?.currency)} /></Col>
                <Col xs={12} sm={5}><Statistic title="Total Refunds" value={calculatedStats?.total_refunds || 0} valueStyle={{ color: token.colorWarning }} formatter={() => formatCurrency(calculatedStats?.total_refunds || 0, profile?.currency)} /></Col>
                <Col xs={12} sm={5}><Statistic title="Balance Due" value={calculatedStats?.balance_due || 0} valueStyle={{ color: token.colorError }} formatter={() => formatCurrency(calculatedStats?.balance_due || 0, profile?.currency)} /></Col>
                <Col xs={12} sm={5}><Statistic title="Your Credit" value={calculatedStats?.credit_balance || 0} valueStyle={{ color: token.colorSuccess }} formatter={() => formatCurrency(calculatedStats?.credit_balance || 0, profile?.currency)} /></Col>
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
                                        <Tag color={item.type === 'Purchase' ? token.colorError : token.colorSuccess}>{item.type}</Tag>
                                        <div style={{ marginTop: '4px' }}>
                                            <Text>{item.link ? <Link to={item.link}>{item.details}</Link> : item.details}</Text>
                                        </div>
                                        <Text type="secondary" style={{ fontSize: '12px' }}>{new Date(item.date).toLocaleDateString()}</Text>
                                    </Col>
                                    <Col style={{ textAlign: 'right' }}>
    {item.debit > 0 && (
        <Text style={{ color: token.colorError }} strong>
            <ArrowDownOutlined /> {formatCurrency(item.debit, profile?.currency)}
        </Text>
    )}
    {item.credit > 0 && (
        <Text style={{ color: token.colorSuccess }} strong>
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
        </div>
    );
};


const SupplierDashboard = () => {
    const { token } = theme.useToken();
    const { isDarkMode } = useTheme();
    const searchInputRef = useRef(null);
    const supplierNameInputRef = useRef(null);

    const { processSyncQueue } = useSync();
    const { profile } = useAuth();
    const isMobile = useMediaQuery('(max-width: 768px)');
    
    const [suppliers, setSuppliers] = useState([]);
    const [selectedSupplierId, setSelectedSupplierId] = useState(null);
    const [loading, setLoading] = useState(true);
    const { notification, modal } = AntApp.useApp();
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState(null);
    const [form] = Form.useForm();
    const [searchTerm, setSearchTerm] = useState('');
    const [showArchived, setShowArchived] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [isViewModalVisible, setIsViewModalVisible] = useState(false);
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
    if (isModalVisible) { 
        if (editingSupplier) { 
            form.setFieldsValue(editingSupplier); 
        } else { 
            form.resetFields(); 
        }
    }
}, [isModalVisible, editingSupplier, form]);

    const fetchSuppliers = useCallback(async (selectIdAfterFetch = null) => {
        setLoading(true);
        try {
            const data = await DataService.getSuppliers(showArchived);
            setSuppliers(data || []);
            
            if (selectIdAfterFetch) {
                setSelectedSupplierId(selectIdAfterFetch);
            } else if (!isMobile && data && data.length > 0 && !selectedSupplierId) {
                setSelectedSupplierId(data[0].id);
            }
        } catch (error) { notification.error({ message: 'Error', description: 'Failed to fetch suppliers list.' });
        } finally { setLoading(false); }
    }, [notification, selectedSupplierId, isMobile, showArchived]);

    useEffect(() => { fetchSuppliers(); }, [showArchived, refreshTrigger]);

    const handleToggleArchive = async (supplier) => {
        try {
            await DataService.toggleArchiveSupplier(supplier.id, !showArchived);
            notification.success({ 
                message: 'Success', 
                description: showArchived ? 'Supplier restored' : 'Supplier archived' 
            });
            setRefreshTrigger(prev => prev + 1);
        } catch (error) {
            notification.error({ message: 'Error', description: error.message });
        }
    };

    const handleAddNew = () => { setEditingSupplier(null); setIsModalVisible(true); };
    const handleEdit = (supplier) => { setEditingSupplier(supplier); setIsModalVisible(true); };
    const handleDelete = async (supplierId) => {
        try {
            await DataService.deleteSupplier(supplierId);
            notification.success({ message: 'Success', description: 'Supplier deleted successfully.' });
            if(selectedSupplierId === supplierId) setSelectedSupplierId(null); fetchSuppliers();
        } catch (error) { notification.error({ message: 'Action Denied', description: error.message }); }
    };
    const handleModalOk = async () => {
        try {
            const values = await form.validateFields();
            
            // 1. Phone number ki safai (Normalization)
            if (values.phone) {
                values.phone = values.phone.replace(/[^\d+]/g, '');
            }

            // 2. SMART DUPLICATE CHECK (Name aur Phone dono ke liye)
            const duplicate = await DataService.checkDuplicateSupplier(values.phone, values.name, editingSupplier?.id);
            
            if (duplicate) {
                if (duplicate.type === 'phone') {
                    form.setFields([{ name: 'phone', errors: [`Registered to: ${duplicate.name}`] }]);
                } else {
                    form.setFields([{ name: 'name', errors: ['Company name already exists!'] }]);
                }
                return;
            }

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
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Title level={isMobile ? 3 : 2} style={{ margin: 0 }}>{selectedSupplier.name}</Title>
                                <Button 
                                    type="text"
                                    icon={<EyeOutlined style={{ fontSize: '22px', color: '#b8b9baff' }} />} 
                                    onClick={() => setIsViewModalVisible(true)}
                                    title="View Full Details"
                                    style={{ padding: 0, height: 'auto' }}
                                />
                            </div>
                            <Text type="secondary">{selectedSupplier.contact_person} | {selectedSupplier.phone}</Text><br/>
                            <Text type="secondary">{selectedSupplier.address}</Text>
                        </div>
                         <Space style={{ marginTop: isMobile ? '16px' : '0' }}>
                            <Dropdown 
                                trigger={['click']}
                                menu={{
                                    items: [
                                        {
                                            key: 'edit',
                                            label: 'Edit Details',
                                            icon: <EditOutlined />,
                                            disabled: selectedSupplier.name === 'Cash Purchase', 
                                            onClick: () => handleEdit(selectedSupplier)
                                        },
                                        {
                                            key: 'archive',
                                            label: showArchived ? 'Restore Supplier' : 'Archive Supplier',
                                            icon: showArchived ? <ReloadOutlined /> : <InboxOutlined />,
                                            disabled: selectedSupplier.name === 'Cash Purchase', 
                                            onClick: () => handleToggleArchive(selectedSupplier)
                                        },
                                        {
                                            key: 'delete',
                                            label: 'Delete Supplier',
                                            icon: <DeleteOutlined />,
                                            danger: true,
                                            disabled: selectedSupplier.name === 'Cash Purchase', 
                                            onClick: () => {
                                                modal.confirm({
                                                    title: 'Delete Supplier?',
                                                    icon: <DeleteOutlined />,
                                                    content: `Are you sure you want to delete ${selectedSupplier.name}? This cannot be undone.`,
                                                    okText: 'Yes, Delete',
                                                    okType: 'danger',
                                                    onOk: () => handleDelete(selectedSupplier.id)
                                                });
                                            }
                                        }
                                    ]
                                }}
                            >
                                <Button type="text" icon={<MoreOutlined style={{ fontSize: '20px' }} />} />
                            </Dropdown>
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
        <>
            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: ${isDarkMode ? '#444' : '#ccc'};
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: ${isDarkMode ? '#666' : '#999'};
                }
                
                /* Sidebar Selected Item Fix */
                .ant-menu-item-selected {
                    background-color: ${isDarkMode ? '#111' : '#e6f7ff'} !important;
                }
                .ant-menu-item-selected .ant-typography {
                    color: ${isDarkMode ? '#fff' : '#1890ff'} !important;
                    font-weight: bold;
                }

                /* Table Balance Wrap Fix */
                .nowrap-column {
                    white-space: nowrap !important;
                    font-weight: bold;
                }
            `}</style>
            <Layout style={{ background: 'transparent', padding: isMobile ? '12px 4px' : '4px' }}>
            
            {/* Sirf Mobile par Title dikhayein, Desktop par Header mein hai */}
            {isMobile && (
                <div style={{ marginBottom: '16px' }}>
                    <Title level={2} style={{ margin: 0, marginLeft: '8px', fontSize: '23px' }}>
                        <ShopOutlined /> Suppliers Dashboard
                    </Title>
                </div>
            )}
            
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
                                    placeholder="Search..."
                                    prefix={<SearchOutlined />}
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    style={{ flexGrow: 1 }}
                                />
                                <Button 
                                    icon={showArchived ? <ReloadOutlined /> : <InboxOutlined />} 
                                    onClick={() => setShowArchived(!showArchived)} 
                                    danger={showArchived}
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
                                        <List.Item.Meta title={<Text style={{ color: 'inherit' }}>{s.name}</Text>} />
                                        {s.balance_due > 0 && <Tag color="red">{formatCurrency(s.balance_due, profile?.currency)}</Tag>}
                                    </List.Item>
                                )}
                            />
                        }
                    </Card>
                )
            ) : (
                // --- DESKTOP LAYOUT ---
                // Background ko 'transparent' kar diya taake colors kharab na hon
                <Layout style={{ background: 'transparent', borderRadius: token.borderRadiusLG, overflow: 'hidden', height: 'calc(100vh - 140px)' }}>
                    <Sider width={320} style={{ background: token.colorBgContainer, borderRight: `1px solid ${token.colorBorderSecondary}` }}>
                        <div style={{ padding: '12px', borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
                            <Flex gap="small">
                                <Input
                                    ref={searchInputRef}
                                    placeholder="Search..."
                                    prefix={<SearchOutlined />}
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    style={{ flexGrow: 1 }}
                                />
                                {/* Archive Button Yahan Aa Gaya */}
                                <Button 
                                    icon={showArchived ? <ReloadOutlined /> : <InboxOutlined />} 
                                    onClick={() => setShowArchived(!showArchived)} 
                                    type={showArchived ? 'primary' : 'default'}
                                    danger={showArchived}
                                    title={showArchived ? 'Back to Active' : 'View Archived'}
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
                                className="custom-scrollbar" // Scrollbar fix
                                items={filteredSuppliers.map(s => ({
                                    key: s.id,
                                    label: (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            {/* Text component khud hi light/dark mode ke mutabiq rang badal lega */}
                                            <Text>{s.name}</Text>
                                            {s.balance_due > 0 && <Tag color="red" style={{ fontSize: '10px' }}>{formatCurrency(s.balance_due, profile?.currency)}</Tag>}
                                        </div>
                                    )
                                }))}
                            />
                        }
                    </Sider>
                    <Layout style={{ background: 'transparent' }}>{renderSupplierDetails()}</Layout>
                </Layout>
            )}

            <Modal title={editingSupplier ? "Edit Supplier" : "Add New Supplier"} open={isModalVisible} onOk={handleModalOk} onCancel={() => setIsModalVisible(false)} okText="Save" destroyOnHidden>
                <Form form={form} layout="vertical" name="supplier_form" style={{ marginTop: 10 }}>
                    <Tabs defaultActiveKey="1" items={[
                        {
                            key: '1',
                            label: 'General',
                            children: (
                                <Row gutter={16}>
                                    <Col span={24}>
                                        <Form.Item name="name" label="Company" rules={[{ required: true }]} tooltip="Supplier or Business legal name">
                                            <Input ref={supplierNameInputRef} placeholder="e.g. Samsung Global" />
                                        </Form.Item>
                                    </Col>
                                    <Col span={12}>
                                        <Form.Item name="contact_person" label="Contact" tooltip="Primary person to contact">
                                            <Input placeholder="John Doe" />
                                        </Form.Item>
                                    </Col>
                                    <Col span={12}>
                                        <Form.Item name="tax_id" label="Tax ID" tooltip="VAT, GST, or NTN Number">
                                            <Input placeholder="Tax Registration #" />
                                        </Form.Item>
                                    </Col>
                                    <Col span={12}>
                                        <Form.Item name="email" label="Email" rules={[{ type: 'email' }]} tooltip="Business email address">
                                            <Input placeholder="supplier@email.com" />
                                        </Form.Item>
                                    </Col>
                                    <Col span={12}>
                                        <Form.Item name="phone" label="Phone" tooltip="Mobile or Landline number">
                                            <Input placeholder="+123456789" />
                                        </Form.Item>
                                    </Col>
                                </Row>
                            )
                        },
                        {
                            key: '2',
                            label: 'Location',
                            children: (
                                <Row gutter={16}>
                                    <Col span={24}>
                                        <Form.Item name="address" label="Address" tooltip="Street and area details">
                                            <Input.TextArea rows={2} placeholder="Building, Street..." />
                                        </Form.Item>
                                    </Col>
                                    <Col span={12}>
                                        <Form.Item name="city" label="City" tooltip="City name">
                                            <Input placeholder="New York" />
                                        </Form.Item>
                                    </Col>
                                    <Col span={12}>
                                        <Form.Item name="country" label="Country" tooltip="Country name">
                                            <Input placeholder="USA" />
                                        </Form.Item>
                                    </Col>
                                </Row>
                            )
                        },
                        {
                            key: '3',
                            label: 'Banking',
                            children: (
                                <Row gutter={16}>
                                    <Col span={24}>
                                        <Form.Item name="bank_name" label="Bank" tooltip="Supplier's bank name">
                                            <Input placeholder="e.g. HBL, Barclays..." />
                                        </Form.Item>
                                    </Col>
                                    <Col span={24}>
                                        <Form.Item name="bank_account_title" label="A/C Title" tooltip="Account holder name">
                                            <Input placeholder="Account Title" />
                                        </Form.Item>
                                    </Col>
                                    <Col span={24}>
                                        <Form.Item name="bank_account_no" label="A/C or IBAN" tooltip="Bank account number or International IBAN">
                                            <Input placeholder="Account Number / IBAN" />
                                        </Form.Item>
                                    </Col>
                                </Row>
                            )
                        }
                    ]} />
                </Form>
            </Modal>
            <Modal
                title={null} 
                open={isViewModalVisible}
                onCancel={() => setIsViewModalVisible(false)}
                footer={[
                    <Button key="close" type="primary" onClick={() => setIsViewModalVisible(false)}>
                        Close Profile
                    </Button>
                ]}
                width={600}
                centered
            >
                <div style={{ padding: '10px 0' }}>
                    <div style={{ borderBottom: '2px solid #1890ff', paddingBottom: 15, marginBottom: 25 }}>
                        <Title level={3} style={{ margin: 0, color: '#1890ff' }}>
                            {selectedSupplier?.name?.toUpperCase()}
                        </Title>
                        {selectedSupplier?.tax_id && (
                            <Text type="secondary">Tax ID: {selectedSupplier.tax_id}</Text>
                        )}
                    </div>

                    <Row gutter={[32, 24]}>
                        <Col span={24}>
                            <Divider orientation="left" plain><Text strong type="secondary">CONTACT INFORMATION</Text></Divider>
                            <Descriptions column={2} bordered={false}>
                                <Descriptions.Item label={<Text type="secondary">Contact Person</Text>} span={2}>
                                    <Text strong>{selectedSupplier?.contact_person || 'N/A'}</Text>
                                </Descriptions.Item>
                                <Descriptions.Item label={<Text type="secondary">Email Address</Text>} span={2}>
                                    <Text strong>{selectedSupplier?.email || 'N/A'}</Text>
                                </Descriptions.Item>
                                <Descriptions.Item label={<Text type="secondary">Phone Number</Text>} span={2}>
                                    <Text strong>{selectedSupplier?.phone || 'N/A'}</Text>
                                </Descriptions.Item>
                            </Descriptions>
                        </Col>

                        <Col span={24}>
                            <Divider orientation="left" plain><Text strong type="secondary">LOCATION DETAILS</Text></Divider>
                            <Descriptions column={1} bordered={false}>
                                <Descriptions.Item label={<Text type="secondary">Full Address</Text>}>
                                    <Text strong>{selectedSupplier?.address || 'N/A'}</Text>
                                </Descriptions.Item>
                                <Descriptions.Item label={<Text type="secondary">City / Country</Text>}>
                                    <Text strong>
                                        {`${selectedSupplier?.city || ''}${selectedSupplier?.city && selectedSupplier?.country ? ', ' : ''}${selectedSupplier?.country || ''}` || 'N/A'}
                                    </Text>
                                </Descriptions.Item>
                            </Descriptions>
                        </Col>

                        <Col span={24}>
                            <div style={{ background: isDarkMode ? 'rgba(255,255,255,0.05)' : '#f5f5f5', padding: '15px', borderRadius: '8px', borderLeft: '4px solid #52c41a' }}>
                                <Text strong style={{ display: 'block', marginBottom: 10, color: '#52c41a' }}>BANKING DETAILS</Text>
                                <Descriptions column={1} size="small" bordered={false}>
                                    <Descriptions.Item label={<Text type="secondary">Bank Name</Text>}>
                                        <Text strong>{selectedSupplier?.bank_name || 'N/A'}</Text>
                                    </Descriptions.Item>
                                    <Descriptions.Item label={<Text type="secondary">Account Title</Text>}>
                                        <Text strong>{selectedSupplier?.bank_account_title || 'N/A'}</Text>
                                    </Descriptions.Item>
                                    <Descriptions.Item label={<Text type="secondary">A/C or IBAN</Text>}>
                                        <Text code style={{ fontSize: '14px' }}>{selectedSupplier?.bank_account_no || 'N/A'}</Text>
                                    </Descriptions.Item>
                                </Descriptions>
                            </div>
                        </Col>
                    </Row>
                </div>
            </Modal>
        </Layout>
        </>
    );
};

export default SupplierDashboard;