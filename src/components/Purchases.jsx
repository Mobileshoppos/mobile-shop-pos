// src/components/Purchases.jsx (Final Corrected Code with Typo Fix)

import React, { useState, useEffect } from 'react'; // <-- FIX: 'auseState' corrected to 'useState'
import { Table, Tag, Typography, Button, App as AntApp } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import DataService from '../DataService';

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

    useEffect(() => {
        const fetchPurchases = async () => {
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
        };

        fetchPurchases();
    }, [notification]);

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
        <div>
            <Title level={2} style={{ marginBottom: '24px' }}>
                Purchase History
            </Title>
            <Table
                columns={columns}
                dataSource={purchases}
                rowKey="id"
                loading={loading}
                scroll={{ x: true }}
            />
        </div>
    );
};

export default Purchases;