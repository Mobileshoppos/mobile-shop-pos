import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Typography, Breadcrumb, Button, Card, Row, Col, Table, Tag, Spin, Alert, App as AntApp, Statistic, Modal, Form, InputNumber, DatePicker, Select, Input, Space, Popconfirm, Radio, Checkbox } from 'antd';
import { FileTextOutlined, ArrowLeftOutlined, DollarCircleOutlined, EditOutlined, RollbackOutlined, DeleteOutlined } from '@ant-design/icons';
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

    // --- CHANGE 1 START: Items ko Active aur Returned mein taqseem karna ---
    const { activeDisplayItems, returnedDisplayItems, totalReturnedAmount } = useMemo(() => {
        const activeGrouped = {};
        const returnedGrouped = {};
        let retAmount = 0;

        items.forEach(item => {
            // Attributes key banayein grouping ke liye
            const tempAttributes = { ...(item.item_attributes || {}) };
            delete tempAttributes['IMEI'];
            delete tempAttributes['Serial / IMEI'];
            delete tempAttributes['Serial Number'];
            const attributesKey = JSON.stringify(tempAttributes);
            const key = `${item.product_id}-${attributesKey}-${item.purchase_price}`;

            // Bulk System Display Logic
            // 1. Agar item bacha hua hai ya bik gaya hai (Active)
            const currentAvail = (item.available_qty || 0) + (item.sold_qty || 0);
            if (currentAvail > 0) {
                if (!activeGrouped[key]) activeGrouped[key] = { ...item, quantity: 0, imeis: [], key: key };
                activeGrouped[key].quantity += currentAvail;
                if (item.imei && item.status !== 'Returned') activeGrouped[key].imeis.push(item.imei);
            }

            // 2. Agar item wapis ho chuka hai (Returned)
            if ((item.returned_qty || 0) > 0) {
                retAmount += (item.purchase_price || 0) * item.returned_qty;
                if (!returnedGrouped[key]) returnedGrouped[key] = { ...item, quantity: 0, imeis: [], key: key };
                returnedGrouped[key].quantity += item.returned_qty;
                if (item.imei && item.status === 'Returned') returnedGrouped[key].imeis.push(item.imei);
            }
        });

        return {
            activeDisplayItems: Object.values(activeGrouped),
            returnedDisplayItems: Object.values(returnedGrouped),
            totalReturnedAmount: retAmount
        };
    }, [items]);

    
    
    const itemColumns = [
        { 
            title: 'Product', 
            dataIndex: 'product_name', 
            key: 'product_name',
            render: (text, record) => (
                <Space direction="vertical" size={0}>
                    <Text>{text}</Text>
                    {/* Agar item Sold hai */}
                    {record.status && record.status.toLowerCase() === 'sold' && (
                        <Tag color="red" style={{ fontSize: '10px', marginTop: '4px' }}>
                            Sold - Cannot Return
                        </Tag>
                    )}
                    {/* Agar item Returned hai */}
                    {record.status && record.status.toLowerCase() === 'returned' && (
                        <Tag color="orange" style={{ fontSize: '10px', marginTop: '4px' }}>
                            Returned
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
    const handlePaymentSubmit = async (values) => { try { if (values.amount > purchase.balance_due) { notification.warning({ message: 'Warning', description: 'Payment amount cannot be greater than the balance due.' }); return; } const paymentData = { local_id: crypto.randomUUID(), amount: values.amount, payment_date: values.payment_date.format('YYYY-MM-DD'), payment_method: values.payment_method, notes: values.notes || null, supplier_id: purchase.supplier_id, purchase_id: purchase.id, }; await DataService.recordPurchasePayment(paymentData); notification.success({ message: 'Success', description: 'Payment recorded successfully!' }); setIsPaymentModalVisible(false); fetchDetails(); } catch (error) { notification.error({ message: 'Error', description: 'Failed to record payment.' }); } };
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
    
    // Behtar ye hai ke hum Table ke dataSource ko filter karein.
    setIsReturnModalVisible(true);
};
    const handleReturnSubmit = async (values) => { if (selectedReturnItems.length === 0) { notification.warning({ message: 'No Items Selected', description: 'Please select at least one item to return.' }); return; } try {
        const returnData = {
            purchase_id: id,
            items_with_qty: selectedReturnItems, 
            return_date: values.return_date.format('YYYY-MM-DD'),
            notes: values.notes || null,
        };
        await DataService.createPurchaseReturn(returnData); notification.success({ message: 'Success', description: 'Items returned successfully!' }); setIsReturnModalVisible(false); fetchDetails(); } catch (error) { notification.error({ message: 'Error', description: error.message || 'Failed to process return.' }); } };
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
        <div style={{ padding: '24px' }}>
            <Breadcrumb items={[ { title: <Link to="/purchases">Purchases</Link> }, { title: `Purchase #${id}` } ]} style={{ marginBottom: '16px' }}/>
            <Card>
                <Row justify="space-between" align="middle" style={{ flexDirection: isMobile ? 'column' : 'row', textAlign: isMobile ? 'center' : 'left' }}>
    <Col style={{ marginBottom: isMobile ? '16px' : '0' }}>
        <Title level={2} style={{ margin: 0 }}>
            <FileTextOutlined /> Purchase #{purchase.id}
        </Title>
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
    <Button block={isMobile} icon={<EditOutlined />} onClick={showEditModal}>
    Edit Purchase
</Button>
    <Button danger block={isMobile} icon={<RollbackOutlined />} onClick={showReturnModal}>
        Return Items
    </Button>
</div>
            </Card>
            
            <Title level={3} style={{ marginTop: '32px' }}>Items in this Purchase ({items.length})</Title>
            {/* --- CHANGE 2 START: Active Items Table --- */}
            <Table 
                columns={itemColumns} 
                dataSource={activeDisplayItems} // Yahan 'displayItems' ki jagah 'activeDisplayItems' likha hai
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

            {/* Agar Returned Items hain to unhein alag Table mein dikhayein */}
            {returnedDisplayItems.length > 0 && (
                <>
                    <Title level={4} type="danger" style={{ marginTop: '32px' }}>Returned Items (History)</Title>
                    <Alert message={`Total Returned Value: ${formatCurrency(totalReturnedAmount, profile?.currency)}`} type="error" showIcon style={{ marginBottom: '16px' }} />
                    <Table 
                        columns={itemColumns} 
                        dataSource={returnedDisplayItems}
                        rowKey="key"
                        pagination={false}
                        scroll={{ x: true }}
                        expandable={{
                            expandedRowRender: (record) => {
                                if (!record.imeis || record.imeis.length === 0) return null;
                                return (<ul style={{ margin: 0, paddingLeft: '20px' }}>{record.imeis.map(imei => <li key={imei}><Text code type="danger">{imei}</Text></li>)}</ul>);
                            },
                            rowExpandable: (record) => record.imeis && record.imeis.length > 0,
                        }}
                        rowClassName={() => 'returned-row-bg'} // Optional styling
                    />
                </>
            )}
            {/* --- CHANGE 2 END --- */}

            <Link to="/purchases"><Button style={{ marginTop: '24px' }} icon={<ArrowLeftOutlined />}>Back to Purchases List</Button></Link>
            
            {/* Tamam Modals waise hi rahenge */}
            <Modal title="Record Payment" open={isPaymentModalVisible} onCancel={() => setIsPaymentModalVisible(false)} onOk={paymentForm.submit} okText="Save Payment"><Form form={paymentForm} layout="vertical" onFinish={handlePaymentSubmit} style={{marginTop: '24px'}}><Form.Item name="amount" label="Payment Amount" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} prefix={profile?.currency ? `${profile.currency} ` : ''} min={0} /></Form.Item><Form.Item name="payment_date" label="Payment Date" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item><Form.Item name="payment_method" label="Paid From" rules={[{ required: true }]}>
    <Radio.Group buttonStyle="solid">
        <Radio.Button value="Cash">Cash</Radio.Button>
        <Radio.Button value="Bank">Bank / Online</Radio.Button>
    </Radio.Group>
</Form.Item><Form.Item name="notes" label="Notes (Optional)"><Input.TextArea rows={2} /></Form.Item></Form></Modal>
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
            <Modal title="Return Items to Supplier" open={isReturnModalVisible} onCancel={() => setIsReturnModalVisible(false)} onOk={returnForm.submit} okText="Process Return" width={1000} okButtonProps={{ danger: true }}><Form form={returnForm} layout="vertical" onFinish={handleReturnSubmit} style={{ marginTop: '24px' }}><Form.Item name="return_date" label="Return Date" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item><Form.Item name="notes" label="Reason for Return (Optional)"><Input.TextArea rows={2} placeholder="e.g., Damaged items, wrong model, etc." /></Form.Item><Title level={5} style={{ marginTop: '16px' }}>Select Items to Return</Title><Table 
    dataSource={items.filter(i => i.status !== 'Returned' && i.available_qty > 0)} 
    rowKey="id" 
    pagination={false} 
    size="small"
    columns={[
        { title: 'Product', dataIndex: 'product_name' },
        { 
            title: 'IMEI/Serial', 
            dataIndex: 'imei', 
            render: (imei) => imei ? <Text code>{imei}</Text> : <Text type="secondary">-</Text>
        },
        { 
            title: 'Available', 
            dataIndex: 'available_qty', 
            render: (qty) => <Tag color="blue">{qty} in stock</Tag> 
        },
        {
            title: 'Select / Qty',
            key: 'return_qty',
            render: (_, record) => {
                const isImeiItem = !!record.imei;
                const isSelected = selectedReturnItems.some(i => i.inventory_id === record.id);

                if (isImeiItem) {
                    return (
                        <Checkbox 
                            checked={isSelected}
                            onChange={(e) => {
                                const checked = e.target.checked;
                                const current = selectedReturnItems.filter(i => i.inventory_id !== record.id);
                                if (checked) {
                                    // Jab select ho to qty 1 set karein
                                    setSelectedReturnItems([...current, { inventory_id: record.id, qty: 1, price: record.purchase_price, product_id: record.product_id }]);
                                } else {
                                    setSelectedReturnItems(current);
                                }
                            }}
                        />
                    );
                }

                return (
                    <InputNumber 
                        min={0} 
                        max={record.available_qty} 
                        value={selectedReturnItems.find(i => i.inventory_id === record.id)?.qty || 0}
                        onChange={(val) => {
                            const current = selectedReturnItems.filter(i => i.inventory_id !== record.id);
                            if (val > 0) {
                                setSelectedReturnItems([...current, { inventory_id: record.id, qty: val, price: record.purchase_price, product_id: record.product_id }]);
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
                // selectedReturnItems state se is item ki qty dhoondein
                const selected = selectedReturnItems.find(i => i.inventory_id === record.id);
                const qty = selected ? selected.qty : 0;
                return <Text strong style={{ color: qty > 0 ? '#52c41a' : 'inherit' }}>
                    {formatCurrency(qty * record.purchase_price, profile?.currency)}
                </Text>;
            }
        }
    ]}
/>
</Form></Modal>
        </div>
    );
};

export default PurchaseDetails;