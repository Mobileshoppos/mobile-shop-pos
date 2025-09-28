// src/components/SupplierDetails.jsx (Final and Corrected Code)

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Typography, Breadcrumb, Card, Row, Col, Table, Tag, Spin, Alert, App as AntApp, Statistic, Button, Modal, Form, InputNumber, DatePicker, Select, Input } from 'antd';
import DataService from '../DataService';
import { DollarCircleOutlined, MinusCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const SupplierDetails = () => {
    const { id } = useParams();
    const { notification } = AntApp.useApp();
    const [supplier, setSupplier] = useState(null);
    const [ledgerData, setLedgerData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isPaymentModalVisible, setIsPaymentModalVisible] = useState(false);
    const [paymentForm] = Form.useForm();
    const [isRefundModalVisible, setIsRefundModalVisible] = useState(false);
    const [refundForm] = Form.useForm();

    const totals = useMemo(() => {
        if (!ledgerData || ledgerData.length === 0) return { purchases: 0, payments: 0, balance: 0 };
        const totalPurchases = ledgerData.filter(item => item.type === 'Purchase').reduce((sum, item) => sum + (item.debit || 0), 0);
        const totalPayments = ledgerData.filter(item => item.type === 'Payment').reduce((sum, item) => sum + (item.credit || 0), 0);
        // THE FIX IS HERE: Balance cannot be negative.
        return {
            purchases: totalPurchases,
            payments: totalPayments,
            balance: Math.max(0, totalPurchases - totalPayments)
        };
    }, [ledgerData]);

    const fetchLedger = React.useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { supplier, purchases, payments } = await DataService.getSupplierLedgerDetails(id);
            setSupplier(supplier);
            const combinedData = [
                ...(purchases || []).map(p => ({
                    key: `pur-${p.id}`, date: p.purchase_date, type: 'Purchase',
                    details: `Purchase #${p.id}`, debit: p.total_amount, credit: 0,
                    link: `/purchases/${p.id}`
                })),
                ...(payments || []).map(p => ({
                    key: `pay-${p.id}`, date: p.payment_date, type: 'Payment',
                    details: `Payment via ${p.payment_method}` + (p.notes ? ` (${p.notes})` : ''),
                    debit: 0, credit: p.amount,
                }))
            ];
            combinedData.sort((a, b) => new Date(b.date) - new Date(a.date));
            setLedgerData(combinedData);
        } catch (err) {
            setError('Failed to load supplier ledger.');
            notification.error({ message: 'Error', description: err.message });
        } finally {
            setLoading(false);
        }
    }, [id, notification]);

    useEffect(() => {
        fetchLedger();
    }, [fetchLedger]);
    const showPaymentModal = () => {
        paymentForm.setFieldsValue({
            amount: totals.balance > 0 ? totals.balance : undefined,
            payment_date: dayjs(),
            payment_method: 'Cash',
            notes: null
        });
        setIsPaymentModalVisible(true);
    };

    const handlePaymentSubmit = async (values) => {
        try {
            const paymentData = {
                supplier_id: supplier.id,
                amount: values.amount,
                payment_date: values.payment_date.format('YYYY-MM-DD'),
                payment_method: values.payment_method,
                notes: values.notes || null,
            };
            await DataService.recordBulkSupplierPayment(paymentData);
            notification.success({ message: 'Success', description: 'Payment recorded successfully!' });
            setIsPaymentModalVisible(false);
            // Ledger ko refresh karne ke liye function ko dobara call karein
            // Iske liye humein fetchLedger ko useEffect se bahar nikalna hoga.
            // Hum isay agle qadam mein theek karenge. Abhi ke liye, page refresh karna parega.
            fetchLedger();
        } catch (error) {
            console.error("Detailed Payment Error:", error); // Yeh line console mein poori ghalti dikhayegi
            notification.error({
                message: 'Error',
                // Yeh line notification mein database ki asal ghalti dikhayegi
                description: error.message || 'Failed to record payment. Check console for details.'
            });
        }
    };

    const showRefundModal = () => {
        refundForm.setFieldsValue({
            amount: supplier?.credit_balance > 0 ? supplier.credit_balance : undefined,
            refund_date: dayjs(),
            refund_method: 'Cash',
            notes: 'Credit settlement'
        });
        setIsRefundModalVisible(true);
    };

    const handleRefundSubmit = async (values) => {
        try {
            const refundData = {
                supplier_id: supplier.id,
                amount: values.amount,
                refund_date: values.refund_date.format('YYYY-MM-DD'),
                refund_method: values.refund_method,
                notes: values.notes || null,
            };
            await DataService.recordSupplierRefund(refundData);
            notification.success({ message: 'Success', description: 'Refund recorded successfully!' });
            setIsRefundModalVisible(false);
            fetchLedger(); // Details ko refresh karein
        } catch (error) {
            notification.error({ message: 'Error', description: error.message || 'Failed to record refund.' });
        }
    };

    const ledgerColumns = [
        { title: 'Date', dataIndex: 'date', key: 'date', render: (d) => new Date(d).toLocaleDateString() },
        { title: 'Transaction Type', dataIndex: 'type', key: 'type', render: (t) => <Tag color={t === 'Purchase' ? 'volcano' : 'green'}>{t}</Tag> },
        { title: 'Details', dataIndex: 'details', key: 'details', render: (text, record) => record.link ? <Link to={record.link}>{text}</Link> : text },
        { title: 'Debit (Purchase)', dataIndex: 'debit', key: 'debit', align: 'right', render: (val) => val ? `Rs. ${val.toLocaleString()}` : '-' },
        { title: 'Credit (Payment)', dataIndex: 'credit', key: 'credit', align: 'right', render: (val) => val ? `Rs. ${val.toLocaleString()}` : '-' },
    ];

    if (loading) return <div style={{ textAlign: 'center', padding: '50px' }}><Spin size="large" /></div>;
    if (error) return <Alert message="Error" description={error} type="error" showIcon />;
    if (!supplier) return <Alert message="Not Found" description="No supplier found with this ID." type="warning" showIcon />;

    return (
        <div>
            <Breadcrumb items={[ { title: <Link to="/suppliers">Suppliers</Link> }, { title: supplier.name } ]} style={{ marginBottom: '16px' }} />
            <Card>
                <Row justify="space-between" align="middle">
                    <Col>
                        <Title level={2} style={{ margin: 0 }}>{supplier.name}</Title>
                        <Text type="secondary">{supplier.contact_person} - {supplier.phone}</Text>
                    </Col>
                    <Col style={{ display: 'flex', gap: '8px' }}>
                        <Button type="primary" icon={<DollarCircleOutlined />} onClick={showPaymentModal} disabled={totals.balance <= 0}>
                            Record Payment
                        </Button>
                        <Button danger icon={<MinusCircleOutlined />} onClick={showRefundModal} disabled={!supplier || supplier.credit_balance <= 0}>
                            Record Refund
                        </Button>
                    </Col>
                </Row>
                <Row gutter={16} style={{ marginTop: '24px' }}>
                    <Col span={6}><Statistic title="Total Business (Purchases)" value={totals.purchases} prefix="Rs. " /></Col>
                    <Col span={6}><Statistic title="Total Paid" value={totals.payments} prefix="Rs. " /></Col>
                    <Col span={6}><Statistic title="Current Balance Due" value={totals.balance} prefix="Rs. " valueStyle={{ color: '#cf1322' }} /></Col>
                    {/* YEH NAYA STATISTIC HAI */}
                    <Col span={6}><Statistic title="Your Credit / Advance" value={supplier?.credit_balance || 0} prefix="Rs. " valueStyle={{ color: '#52c41a' }} /></Col>
                </Row>
            </Card>
            <Title level={3} style={{ marginTop: '32px' }}>Transaction Ledger</Title>
            <Table columns={ledgerColumns} dataSource={ledgerData} rowKey="key" pagination={{ pageSize: 15 }} />
            <Modal title={`Record Payment for ${supplier.name}`} open={isPaymentModalVisible} onCancel={() => setIsPaymentModalVisible(false)} onOk={paymentForm.submit} okText="Save Payment">
                <Form form={paymentForm} layout="vertical" onFinish={handlePaymentSubmit} style={{marginTop: '24px'}}>
                    <Form.Item name="amount" label="Payment Amount" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} prefix="Rs. " min={0} /></Form.Item>
                    <Form.Item name="payment_date" label="Payment Date" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item>
                    <Form.Item name="payment_method" label="Payment Method" rules={[{ required: true }]}>
                        <Select>
<Select.Option value="Cash">Cash</Select.Option>
<Select.Option value="Bank Transfer">Bank Transfer</Select.Option>
<Select.Option value="Cheque">Cheque</Select.Option>
<Select.Option value="Other">Other</Select.Option>
</Select>
                    </Form.Item>
                    <Form.Item name="notes" label="Notes (Optional)"><Input.TextArea rows={2} /></Form.Item>
                </Form>
            </Modal>
            <Modal title={`Record Refund from ${supplier?.name}`} open={isRefundModalVisible} onCancel={() => setIsRefundModalVisible(false)} onOk={refundForm.submit} okText="Save Refund" okButtonProps={{ danger: true }}>
                <Form form={refundForm} layout="vertical" onFinish={handleRefundSubmit} style={{marginTop: '24px'}}>
                    <Form.Item name="amount" label="Refund Amount" rules={[{ required: true }]}>
                        <InputNumber style={{ width: '100%' }} prefix="Rs. " min={0} max={supplier?.credit_balance} />
                    </Form.Item>
                    <Form.Item name="refund_date" label="Refund Date" rules={[{ required: true }]}>
                        <DatePicker style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item name="refund_method" label="Refund Method" rules={[{ required: true }]}>
                        <Select>
                            <Select.Option value="Cash">Cash</Select.Option>
                            <Select.Option value="Bank Transfer">Bank Transfer</Select.Option>
                            <Select.Option value="Other">Other</Select.Option>
                        </Select>
                    </Form.Item>
                    <Form.Item name="notes" label="Notes (Optional)"><Input.TextArea rows={2} /></Form.Item>
                </Form>
            </Modal>
        </div>
    );
};
export default SupplierDetails;