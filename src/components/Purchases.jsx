import React, { useState, useEffect, useCallback } from 'react';
import { Table, Tag, Typography, Button, App as AntApp, Flex, List, Card, Row, Col, theme, Input } from 'antd';
import { FileTextOutlined, EyeOutlined, PlusOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import DataService from '../DataService';
import AddPurchaseForm from './AddPurchaseForm';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/currencyFormatter';

const { Title, Text } = Typography;

const Purchases = () => {
    const { token } = theme.useToken(); // Control Center Connection
    const getStatusColor = (status) => {
        switch (status) {
            case 'paid': return 'success';
            case 'partially_paid': return 'warning';
            case 'unpaid': return 'error';
            default: return 'default';
        }
    };
    const { profile } = useAuth();
    const [purchases, setPurchases] = useState([]);
    const [loading, setLoading] = useState(true);
    const { notification } = AntApp.useApp();
    
    const [isAddModalVisible, setIsAddModalVisible] = useState(false);
    const isMobile = useMediaQuery('(max-width: 768px)');
    const[searchText, setSearchText] = useState('');

    // Search bar ke liye filter logic
    const filteredPurchases = purchases.filter(p => 
        (p.supplier_name && p.supplier_name.toLowerCase().includes(searchText.toLowerCase())) ||
        (p.invoice_id && p.invoice_id.toLowerCase().includes(searchText.toLowerCase()))
    );

    const fetchPurchases = useCallback(async () => {
        setLoading(true);
        try {
            const data = await DataService.getPurchases();
            setPurchases(data || []);
        } catch (error) {
            notification.error({
                message: 'Error',
                description: 'Failed to fetch purchase history. Please try again.',
            });
        } finally {
            setLoading(false);
        }
    }, [notification]);

    useEffect(() => {
        fetchPurchases();
    }, [fetchPurchases]);
    
    const handlePurchaseCreated = () => {
        setIsAddModalVisible(false);
        fetchPurchases();
    };

    const handleOpenAddModal = () => {
        if (!navigator.onLine) {
            notification.error({
                message: 'Offline',
                description: 'You need an internet connection to add new stock.',
            });
            return;
        }
        setIsAddModalVisible(true);
    };

    const columns =[
        {
            title: <>Date<br /><span style={{ fontSize: '12px', fontWeight: 'normal' }}>Time</span></>, 
            key: 'purchase_date',
            render: (_, record) => {
                // Tareekh ke liye purchase_date use karein
                const dateObj = new Date(record.purchase_date);
                // Exact Time ke liye updated_at use karein (kyunke Dexie mein yeh exact time rakhta hai)
                const timeObj = new Date(record.updated_at || record.purchase_date);
                
                return (
                    <>
                        <div>{dateObj.toLocaleDateString()}</div>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                            {timeObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                    </>
                );
            },
            sorter: (a, b) => new Date(a.purchase_date) - new Date(b.purchase_date),
        },
        {
            title: <>Inv<br /><span style={{ fontSize: '12px', fontWeight: 'normal' }}>No.</span></>, 
            dataIndex: 'invoice_id', key: 'invoice_id',
            render: (text, record) => text || record.id.slice(0, 8),
        },
        {
            title: 'Supplier', dataIndex: 'supplier_name', key: 'supplier_name',
            sorter: (a, b) => a.supplier_name.localeCompare(b.supplier_name),
        },
        {
            title: <>Total<br /><span style={{ fontSize: '12px', fontWeight: 'normal' }}>& Paid</span></>, 
            key: 'total_and_paid', align: 'right',
            render: (_, record) => (
                <>
                    <div>{formatCurrency(record.total_amount, profile?.currency)}</div>
                    <Text type="success" style={{ fontSize: '12px' }}>
                        Paid: {formatCurrency(record.amount_paid, profile?.currency)}
                    </Text>
                </>
            ),
            sorter: (a, b) => a.total_amount - b.total_amount,
        },
        {
            title: <>Balance<br /><span style={{ fontSize: '12px', fontWeight: 'normal' }}>Due</span></>, 
            dataIndex: 'balance_due', key: 'balance_due', align: 'right',
            render: (amount) => (
                <Text style={{ color: amount > 0 ? token.colorError : (amount < 0 ? token.colorSuccess : token.colorTextSecondary) }} strong>
                    {formatCurrency(Math.max(0, amount), profile?.currency)}
                </Text>
            ),
            sorter: (a, b) => a.balance_due - b.balance_due,
        },
        {
            title: 'Status', dataIndex: 'status', key: 'status',
            filters:[
                { text: 'Paid', value: 'paid' },
                { text: 'Partially Paid', value: 'partially_paid' },
                { text: 'Unpaid', value: 'unpaid' },
            ],
            onFilter: (value, record) => record.status.indexOf(value) === 0,
            render: (status) => (
                <Tag color={getStatusColor(status)}>
                    {status.replace('_', ' ').toUpperCase()}
                </Tag>
            ),
        },
        {
            title: 'Actions', key: 'actions', align: 'center',
            render: (_, record) => (
                <Link to={`/purchases/${record.id}`}>
                    <Button icon={<EyeOutlined />}>
                        View Details
                    </Button>
                </Link>
            ),
        },
    ];

    return (
        <div style={{ padding: isMobile ? '12px 0' : '4px 0' }}>
            {/* --- NAYI TABDEELIYAN (Step 3) --- */}
            <Flex
    justify="space-between"
    align={isMobile ? 'flex-start' : 'center'}
    style={{ marginBottom: '16px', gap: '16px' }}
    vertical={isMobile} 
>
    {isMobile ? (
        <Title level={2} style={{ margin: 0, marginBottom: '0px', marginLeft: '8px', fontSize: '23px' }}>
            <FileTextOutlined /> Purchase History
        </Title>
    ) : (
        <Input.Search 
            placeholder="Search by Supplier or Invoice No..." 
            allowClear 
            onChange={(e) => setSearchText(e.target.value)} 
            style={{ width: '300px' }} 
        />
    )}
    
    {isMobile && (
        <Input.Search 
            placeholder="Search by Supplier or Invoice No..." 
            allowClear 
            onChange={(e) => setSearchText(e.target.value)} 
            style={{ width: '100%' }} 
        />
    )}

    <Button 
        type="primary" 
        icon={<PlusOutlined />} 
        size="large"
        onClick={handleOpenAddModal}
        style={{ width: isMobile ? '100%' : 'auto' }} 
    >
        Create New Purchase
    </Button>
</Flex>

            {isMobile ? (
    // === MOBILE VIEW (LIST) ===
    <List
        loading={loading}
        dataSource={filteredPurchases}
        renderItem={(purchase) => (
            <List.Item style={{ padding: '0 0 16px 0' }}>
                <Card style={{ width: '100%' }} styles={{ body: { padding: '16px' } }}>
                    <Row justify="space-between" align="top" gutter={[8, 8]}>
                        <Col flex="auto">
                            <Text strong style={{ fontSize: '16px' }}>{purchase.supplier_name}</Text><br />
                            <Text type="secondary" style={{ fontSize: '12px' }}>
    {new Date(purchase.purchase_date).toLocaleDateString()} {' '}
    {new Date(purchase.updated_at || purchase.purchase_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
</Text>
                        </Col>
                        <Col style={{ textAlign: 'right' }}>
                            <Tag color={getStatusColor(purchase.status)}>
                                {purchase.status.replace('_', ' ').toUpperCase()}
                            </Tag>
                        </Col>
                    </Row>
                    <Row justify="space-between" style={{ marginTop: '16px' }}>
                        <Col>
                            <Text type="secondary">Total Amount</Text><br />
                            <Text>{formatCurrency(purchase.total_amount, profile?.currency)}</Text>
                        </Col>
                        <Col style={{ textAlign: 'right' }}>
                            <Text style={{ color: token.colorTextSecondary }}>Balance Due</Text><br />
                            <Text style={{ color: purchase.balance_due > 0 ? token.colorError : token.colorTextSecondary }} strong>
    {formatCurrency(purchase.balance_due, profile?.currency)}
</Text>
                        </Col>
                    </Row>
                    <div style={{ borderTop: '1px solid #f0f0f0', marginTop: '12px', paddingTop: '12px', textAlign: 'right' }}>
                        <Link to={`/purchases/${purchase.id}`}>
                            <Button icon={<EyeOutlined />}>
                                View Details
                            </Button>
                        </Link>
                    </div>
                </Card>
            </List.Item>
        )}
    />
) : (
    // === DESKTOP VIEW (TABLE) ===
    <Table
        columns={columns}
        dataSource={filteredPurchases}
        rowKey="id"
        loading={loading}
        scroll={{ x: true }}
    />
)}

            {isAddModalVisible && (
    <AddPurchaseForm
        visible={isAddModalVisible}
        onCancel={() => setIsAddModalVisible(false)}
        onPurchaseCreated={handlePurchaseCreated}
        isMobile={isMobile}
    />
)}
        </div>
    );
};

export default Purchases;