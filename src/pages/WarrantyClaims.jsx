import React, { useState, useEffect, useRef } from 'react';
import { Typography, Input, Card, Row, Col, Button, Table, Tag, Space, App, Empty, Descriptions, Divider, Modal, Form, Select, Alert, List } from 'antd';
import { SearchOutlined, SafetyCertificateOutlined, ToolOutlined, HistoryOutlined, DeleteOutlined } from '@ant-design/icons';
import DataService from '../DataService';
import { useAuth } from '../context/AuthContext';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const WarrantyClaims = () => {
    const { message, modal } = App.useApp();
    const { user, profile } = useAuth();
    const [imeiSearch, setImeiSearch] = useState('');
    const [lookupResult, setLookupResult] = useState(null);
    const [claims, setClaims] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
    const [claimForm] = Form.useForm();
    const searchInputRef = useRef(null);

    const fetchClaims = async () => {
        const data = await DataService.getWarrantyClaims();
        setClaims(data || []);
    };

    useEffect(() => { 
        fetchClaims(); 
        const timer = setTimeout(() => {
            searchInputRef.current?.focus();
        }, 300);
        return () => clearTimeout(timer);
    }, []);

    const handleSearch = async () => {
        if (!imeiSearch) return;
        setLoading(true);
        setLookupResult(null); 
        try {
            let searchInput = imeiSearch.trim();
            if (searchInput.toUpperCase().startsWith('INV:')) {
                searchInput = searchInput.split(':')[1];
            }

            const imeiResult = await DataService.lookupItemByIMEI(searchInput);
            if (imeiResult) {
                setLookupResult({ type: 'IMEI', ...imeiResult });
                return;
            }

            const invResult = await DataService.lookupByInvoice(searchInput);
            if (invResult) {
                setLookupResult({ type: 'INVOICE', ...invResult });
                return;
            }

            message.error("No record found for this IMEI or Invoice ID.");
        } catch (error) {
            message.error("Search failed: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateClaim = async (values) => {
        try {
            const claimData = {
                inventory_id: lookupResult?.item?.id || lookupResult?.inventory?.id,
                customer_id: lookupResult?.saleDetails?.customer_id || lookupResult?.sale?.customer_id || null,
                imei: lookupResult?.type === 'IMEI' ? imeiSearch : (lookupResult?.item?.imei || `Batch-${lookupResult?.item?.id}`),
                product_name_snapshot: lookupResult?.product?.name || "Unknown Product",
                issue_description: values.issue_description,
                status: 'Received from Customer',
                user_id: user?.id
            };
            await DataService.addWarrantyClaim(claimData);
            message.success("Claim registered successfully!");
            setIsClaimModalOpen(false);
            claimForm.resetFields();
            fetchClaims();
        } catch (error) {
            message.error("Failed to create claim: " + error.message);
        }
    };

    const handleStatusUpdate = async (id, newStatus) => {
        await DataService.updateWarrantyClaimStatus(id, newStatus);
        message.success("Status updated!");
        fetchClaims();
    };

    const calculateRemainingDays = (expiryDate) => {
        if (!expiryDate) return null;
        const diff = dayjs(expiryDate).diff(dayjs(), 'day');
        return diff;
    };

    return (
        <div style={{ padding: '24px' }}>
            <Title level={2} style={{marginLeft: '48px'}}><SafetyCertificateOutlined /> Warranty & Claims Management</Title>
            
            <Row gutter={[24, 24]}>
                <Col xs={24} lg={10}>
                    <Card title="IMEI / Invoice Lookup" extra={<SearchOutlined />}>
                        <Space.Compact style={{ width: '100%', marginBottom: '20px' }}>
                            <Input 
                                ref={searchInputRef}
                                placeholder="Scan Invoice QR or IMEI..." 
                                value={imeiSearch} 
                                onChange={(e) => setImeiSearch(e.target.value)}
                                onPressEnter={handleSearch}
                            />
                            <Button type="primary" onClick={handleSearch} loading={loading}>Search</Button>
                        </Space.Compact>

                        {lookupResult ? (
                            <div style={{ marginTop: '10px' }}>
                                {lookupResult.type === 'IMEI' ? (
                                    <>
                                        <Descriptions title="Item Information" bordered column={1} size="small">
                                            <Descriptions.Item label="Product">{lookupResult.product?.name}</Descriptions.Item>
                                            <Descriptions.Item label="Customer">
                                                {lookupResult.customer ? lookupResult.customer.name : (lookupResult.saleDetails ? 'Walk-in Customer' : 'N/A')}
                                            </Descriptions.Item>
                                            <Descriptions.Item label="Supplier">
                                                <Text strong>{lookupResult.supplier?.name || 'N/A'}</Text>
                                            </Descriptions.Item>
                                            <Descriptions.Item label="Pur. Invoice #">
                                                <Tag color="cyan">{lookupResult.item?.purchase_id || lookupResult.inventory?.purchase_id || 'N/A'}</Tag>
                                            </Descriptions.Item>
                                            <Descriptions.Item label="Sold On">{lookupResult.saleDetails ? dayjs(lookupResult.saleDetails.created_at).format('DD-MMM-YYYY') : <Tag color="blue">In Stock</Tag>}</Descriptions.Item>
                                        </Descriptions>
                                        
                                        <Divider style={{margin: '12px 0'}} />
                                        
                                        <Row gutter={8}>
                                            <Col span={12}>
                                                <Card size="small" title="Supplier Warranty">
                                                    <Text strong>{lookupResult.item?.warranty_days || 0} Days</Text><br/>
                                                    {lookupResult.item?.created_at && (
                                                        <Text type="secondary" style={{fontSize: '10px'}}>
                                                            Till: {dayjs(lookupResult.item.created_at).add(lookupResult.item.warranty_days || 0, 'day').format('DD-MMM-YYYY')}
                                                        </Text>
                                                    )}
                                                </Card>
                                            </Col>
                                            <Col span={12}>
                                                <Card size="small" title="Customer Warranty">
                                                    {lookupResult.saleItem?.warranty_expiry ? (
                                                        <>
                                                            <Text strong style={{color: '#52c41a'}}>{calculateRemainingDays(lookupResult.saleItem.warranty_expiry)} Days Left</Text><br/>
                                                            <Text type="secondary" style={{fontSize: '10px'}}>Till: {dayjs(lookupResult.saleItem.warranty_expiry).format('DD-MMM-YYYY')}</Text>
                                                        </>
                                                    ) : <Text type="secondary">No Warranty</Text>}
                                                </Card>
                                            </Col>
                                        </Row>

                                        {(() => {
                                            const isSold = !!lookupResult.saleDetails;
                                            const activeClaim = claims.find(c => c.imei === imeiSearch && !['Returned to Customer', 'Rejected'].includes(c.status));

                                            if (!isSold) return <Alert style={{marginTop: '15px'}} message="Item not sold yet. Cannot register claim." type="info" showIcon />;
                                            if (activeClaim) return <Alert style={{marginTop: '15px'}} message={`Active claim exists: ${activeClaim.status}`} type="warning" showIcon />;

                                            return (
                                                <Button type="primary" block icon={<ToolOutlined />} style={{ marginTop: '20px' }} onClick={() => setIsClaimModalOpen(true)}>
                                                    Register Repair Claim
                                                </Button>
                                            );
                                        })()}
                                    </>
                                ) : (
                                    <>
                                        <Descriptions title="Invoice Details" bordered column={1} size="small">
                                            <Descriptions.Item label="Customer">{lookupResult.customer?.name || 'Walk-in'}</Descriptions.Item>
                                            <Descriptions.Item label="Date">{dayjs(lookupResult.sale?.created_at).format('DD-MMM-YYYY')}</Descriptions.Item>
                                        </Descriptions>
                                        <Title level={5} style={{marginTop: '15px'}}>Items in this Invoice:</Title>
                                        <List
                                            size="small"
                                            dataSource={lookupResult.items || []}
                                            renderItem={entry => (
                                                <List.Item extra={
                                                    <Button size="small" type="link" onClick={() => {
                                                        setLookupResult({
                                                            type: 'IMEI', // Switch to detail view
                                                            product: entry.product,
                                                            item: entry.inventory,
                                                            saleItem: entry.saleItem,
                                                            saleDetails: lookupResult.sale,
                                                            supplier: entry.supplier, // Supplier transfer karein
                                                            customer: lookupResult.customer // Customer transfer karein
                                                        });
                                                        setIsClaimModalOpen(true);
                                                    }}>Claim</Button>
                                                }>
                                                    <List.Item.Meta 
                                                        title={entry.product?.name} 
                                                        description={`Warranty Till: ${entry.saleItem?.warranty_expiry ? dayjs(entry.saleItem.warranty_expiry).format('DD-MM-YYYY') : 'None'}`} 
                                                    />
                                                </List.Item>
                                            )}
                                        />
                                    </>
                                )}
                            </div>
                        ) : (
                            <Empty description="Scan Invoice QR or IMEI" />
                        )}
                    </Card>
                </Col>

                <Col xs={24} lg={14}>
                    <Card title="Recent Claims & Repair History">
                        <Table 
                            dataSource={claims} 
                            rowKey="id" 
                            size="small"
                            scroll={{ x: true }}
                            columns={[
                                { 
                                    title: 'Claim Info', 
                                    key: 'info',
                                    render: (_, record) => (
                                        <Space direction="vertical" size={0}>
                                            <Text strong style={{fontSize: '12px'}}>{dayjs(record.created_at).format('DD-MMM')}</Text>
                                            <Text type="secondary" style={{fontSize: '11px'}}>{record.imei}</Text>
                                        </Space>
                                    )
                                },
                                { 
                                    title: 'Product & Issue', 
                                    key: 'issue',
                                    render: (_, record) => (
                                        <Space direction="vertical" size={0}>
                                            <Text strong>{record.product_name_snapshot}</Text>
                                            <Text type="danger" style={{fontSize: '11px'}}>Fault: {record.issue_description}</Text>
                                        </Space>
                                    )
                                },
                                { 
                                    title: 'Status', 
                                    dataIndex: 'status',
                                    render: (status, record) => (
                                        <Space direction="vertical" size={4}>
                                            <Tag color={status.includes('Supplier') ? 'orange' : 'blue'} style={{ margin: 0, fontSize: '10px' }}>
                                                {status}
                                            </Tag>
                                            <Select 
                                                size="small"
                                                style={{ width: 130, fontSize: '11px' }}
                                                value={status}
                                                onChange={(value) => handleStatusUpdate(record.id, value)}
                                                options={[
                                                    { value: 'Received from Customer', label: 'Received' },
                                                    { value: 'Sent to Supplier', label: 'Sent to Supplier' },
                                                    { value: 'Received from Supplier', label: 'Back from Supplier' },
                                                    { value: 'Returned to Customer', label: 'Returned' },
                                                    { value: 'Rejected', label: 'Rejected' },
                                                ]}
                                            />
                                        </Space>
                                    )
                                },
                                {
                                    title: '',
                                    key: 'action',
                                    render: (_, record) => (
                                        <Button 
                                            type="text" 
                                            danger 
                                            icon={<DeleteOutlined />} 
                                            onClick={() => {
                                                modal.confirm({
                                                    title: 'Delete Claim?',
                                                    content: 'Are you sure you want to remove this claim record?',
                                                    onOk: async () => {
                                                        await DataService.deleteWarrantyClaim(record.id);
                                                        message.success("Claim deleted");
                                                        fetchClaims();
                                                    }
                                                });
                                            }}
                                        />
                                    )
                                }
                            ]}
                        />
                    </Card>
                </Col>
            </Row>

            <Modal 
                title="Create Repair Claim" 
                open={isClaimModalOpen} 
                onCancel={() => setIsClaimModalOpen(false)}
                onOk={() => claimForm.submit()}
                destroyOnHidden
            >
                <Form form={claimForm} layout="vertical" onFinish={handleCreateClaim}>
                    <Text type="secondary">
                        Registering claim for: <b>{lookupResult?.product?.name || "Selected Item"}</b> 
                        {lookupResult?.type === 'IMEI' ? ` (IMEI: ${imeiSearch})` : ' (Bulk Item)'}
                    </Text>
                    <Form.Item name="issue_description" label="Describe the issue/fault" rules={[{required: true}]} style={{marginTop: '15px'}}>
                        <Input.TextArea placeholder="e.g. Screen flickering, Not charging..." rows={4} />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default WarrantyClaims;