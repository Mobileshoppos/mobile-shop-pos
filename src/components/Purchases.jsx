import React, { useState, useEffect, useCallback } from 'react';
import { Table, Tag, Typography, Button, App as AntApp, Flex, List, Card, Row, Col, theme } from 'antd';
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
            case 'paid': return token.colorSuccess;
            case 'partially_paid': return token.colorWarning;
            case 'unpaid': return token.colorError;
            default: return token.colorTextSecondary;
        }
    };
    const { profile } = useAuth();
    const [purchases, setPurchases] = useState([]);
    const [loading, setLoading] = useState(true);
    const { notification } = AntApp.useApp();
    
    const [isAddModalVisible, setIsAddModalVisible] = useState(false);
    const isMobile = useMediaQuery('(max-width: 768px)');

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

    const columns = [
        {
            title: 'Date', dataIndex: 'purchase_date', key: 'purchase_date',
            render: (date) => new Date(date).toLocaleDateString(),
            sorter: (a, b) => new Date(a.purchase_date) - new Date(b.purchase_date),
        },
        {
            title: 'Supplier', dataIndex: 'supplier_name', key: 'supplier_name',
            sorter: (a, b) => a.supplier_name.localeCompare(b.supplier_name),
        },
        {
            title: 'Total Amount', dataIndex: 'total_amount', key: 'total_amount', align: 'right',
            render: (amount) => formatCurrency(amount, profile?.currency),
            sorter: (a, b) => a.total_amount - b.total_amount,
        },
        {
            title: 'Amount Paid', dataIndex: 'amount_paid', key: 'amount_paid', align: 'right',
            render: (amount) => formatCurrency(amount, profile?.currency),
            sorter: (a, b) => a.amount_paid - b.amount_paid,
        },
        {
            title: 'Balance Due', dataIndex: 'balance_due', key: 'balance_due', align: 'right',
            render: (amount) => (
    <Text style={{ color: amount > 0 ? token.colorError : token.colorTextSecondary }} strong>
        {formatCurrency(amount, profile?.currency)}
    </Text>
),
            sorter: (a, b) => a.balance_due - b.balance_due,
        },
        {
            title: 'Status', dataIndex: 'status', key: 'status',
            filters: [
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
    justify={isMobile ? 'space-between' : 'flex-end'}
    align={isMobile ? 'flex-start' : 'center'}
    style={{ marginBottom: '16px' }}
    vertical={isMobile} 
>
    {isMobile && (
        <Title level={2} style={{ margin: 0, marginBottom: '16px', marginLeft: '8px', fontSize: '23px' }}>
            <FileTextOutlined /> Purchase History
        </Title>
    )}
    <Button 
        type="primary" 
        icon={<PlusOutlined />} 
        size="large"
        onClick={handleOpenAddModal}
        style={{ width: isMobile ? '100%' : 'auto' }} // Mobile par poori width
    >
        Create New Purchase
    </Button>
</Flex>

            {isMobile ? (
    // === MOBILE VIEW (LIST) ===
    <List
        loading={loading}
        dataSource={purchases}
        renderItem={(purchase) => (
            <List.Item style={{ padding: '0 0 16px 0' }}>
                <Card style={{ width: '100%' }} styles={{ body: { padding: '16px' } }}>
                    <Row justify="space-between" align="top" gutter={[8, 8]}>
                        <Col flex="auto">
                            <Text strong style={{ fontSize: '16px' }}>{purchase.supplier_name}</Text><br />
                            <Text type="secondary">{new Date(purchase.purchase_date).toLocaleDateString()}</Text>
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
        dataSource={purchases}
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