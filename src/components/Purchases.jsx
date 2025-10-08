// src/components/Purchases.jsx (Updated Code)

import React, { useState, useEffect, useCallback } from 'react';
import { Table, Tag, Typography, Button, App as AntApp, Flex } from 'antd';
import { EyeOutlined, PlusOutlined } from '@ant-design/icons'; // <-- PlusOutlined ko import kiya gaya
import { Link } from 'react-router-dom';
import DataService from '../DataService';
import AddPurchaseForm from './AddPurchaseForm'; // <-- Hamara naya form import kiya gaya

const { Title, Text } = Typography;

const getStatusColor = (status) => {
    switch (status) {
        case 'paid': return 'success';
        case 'partially_paid': return 'warning';
        case 'unpaid': return 'error';
        default: return 'default';
    }
};

const Purchases = () => {
    const [purchases, setPurchases] = useState([]);
    const [loading, setLoading] = useState(true);
    const { notification } = AntApp.useApp();
    
    // --- NAYI TABDEELIYAN (Step 1) ---
    const [isAddModalVisible, setIsAddModalVisible] = useState(false);

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
    
    // --- NAYI TABDEELIYAN (Step 2) ---
    const handlePurchaseCreated = () => {
        setIsAddModalVisible(false); // Modal ko band karein
        fetchPurchases(); // List ko refresh karein
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
            render: (amount) => `Rs. ${amount.toLocaleString()}`,
            sorter: (a, b) => a.total_amount - b.total_amount,
        },
        {
            title: 'Amount Paid', dataIndex: 'amount_paid', key: 'amount_paid', align: 'right',
            render: (amount) => `Rs. ${amount.toLocaleString()}`,
            sorter: (a, b) => a.amount_paid - b.amount_paid,
        },
        {
            title: 'Balance Due', dataIndex: 'balance_due', key: 'balance_due', align: 'right',
            render: (amount) => (
                <Text type={amount > 0 ? 'danger' : 'secondary'} strong>
                    Rs. {amount.toLocaleString()}
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
        <> {/* <-- Yahan Fragment istemal kiya gaya */}
            {/* --- NAYI TABDEELIYAN (Step 3) --- */}
            <Flex justify="space-between" align="center" style={{ marginBottom: '24px' }}>
                <Title level={2} style={{ margin: 0 }}>
                    Purchase History
                </Title>
                <Button 
                    type="primary" 
                    icon={<PlusOutlined />} 
                    size="large"
                    onClick={() => setIsAddModalVisible(true)}
                >
                    Create New Purchase
                </Button>
            </Flex>

            <Table
                columns={columns}
                dataSource={purchases}
                rowKey="id"
                loading={loading}
                scroll={{ x: true }}
            />

            {/* --- NAYI TABDEELIYAN (Step 4) --- */}
            <AddPurchaseForm
                visible={isAddModalVisible}
                onCancel={() => setIsAddModalVisible(false)}
                onPurchaseCreated={handlePurchaseCreated}
            />
        </>
    );
};

export default Purchases;