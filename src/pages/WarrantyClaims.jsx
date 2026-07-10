import React, { useState, useEffect, useRef } from 'react';
import { Typography, Input, Card, Row, Col, Button, Table, Tag, Space, App, Empty, Descriptions, Divider, Modal, Form, Select, Alert, List, theme, Spin } from 'antd';
import { SearchOutlined, SafetyCertificateOutlined, ToolOutlined, HistoryOutlined, DeleteOutlined, PrinterOutlined, ClockCircleOutlined } from '@ant-design/icons';
import DataService from '../DataService';
import { generateInvoiceId } from '../utils/idGenerator'; // <--- NAYA IZAFA
import { db } from '../db'; // <--- NAYA IZAFA
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getPlanLimits } from '../config/subscriptionPlans';
import { useMediaQuery } from '../hooks/useMediaQuery';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const WarrantyClaims = () => {
    const { token } = theme.useToken(); // Control Center Connection
    const isMobile = useMediaQuery('(max-width: 768px)');
    const { message, modal } = App.useApp();
    const { user, profile } = useAuth();
    const [imeiSearch, setImeiSearch] = useState('');
    const [lookupResult, setLookupResult] = useState(null);
    const [claims, setClaims] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
    const [claimForm] = Form.useForm();
    const searchInputRef = useRef(null);

    // --- NAYA IZAFA: Status Update Modal States ---
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
    const [selectedClaimForStatus, setSelectedClaimForStatus] = useState(null);
    const [pendingStatus, setPendingStatus] = useState('');
    const [resolutionRemarks, setResolutionRemarks] = useState('');

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
            // --- NAYA IZAFA: Voucher ID Generation ---
            const shortId = await generateInvoiceId();
            const claimNo = `CLM-${shortId}`;

            const claimData = {
                claim_no: claimNo, // <--- NAYA IZAFA
                inventory_id: lookupResult?.item?.id || lookupResult?.inventory?.id,
                customer_id: lookupResult?.saleDetails?.customer_id || lookupResult?.sale?.customer_id || null,
                imei: lookupResult?.type === 'IMEI' ? imeiSearch : (lookupResult?.item?.imei || (lookupResult?.item?.batch_number ? `Batch: ${lookupResult.item.batch_number}` : `Bulk-${lookupResult?.item?.id?.slice(0,8)}`)),
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

    // --- NAYA IZAFA: Status Update Logic ---
    const handleStatusUpdateClick = (record, newStatus) => {
        // Agar status final hai (Returned ya Rejected), to modal kholo remarks ke liye
        if (newStatus === 'Returned to Customer' || newStatus === 'Rejected') {
            setSelectedClaimForStatus(record);
            setPendingStatus(newStatus);
            setResolutionRemarks(record.resolution_remarks || '');
            setIsStatusModalOpen(true);
        } else {
            // Warna direct update kar do
            handleStatusUpdate(record.id, newStatus, '');
        }
    };

    const handleStatusUpdate = async (id, newStatus, remarks = '') => {
        const updatedAt = new Date().toISOString();
        
        // 1. Local DB ko dono fields ke sath ek hi dafa update karein
        await db.warranty_claims.update(id, { 
            status: newStatus, 
            resolution_remarks: remarks, 
            updated_at: updatedAt 
        });
        
        // 2. Poore database record ko read karein (taake user_id aur baqi fields shamil hon)
        const updatedClaim = await db.warranty_claims.get(id);
        
        // 3. Poora record Sync Queue mein daalein taake RLS violation na ho!
        await db.sync_queue.add({ 
            table_name: 'warranty_claims', 
            action: 'update', 
            data: updatedClaim 
        });
        
        message.success("Status updated!");
        setIsStatusModalOpen(false);
        fetchClaims();
    };

    const calculateRemainingDays = (expiryDate) => {
        if (!expiryDate) return null;
        const diff = dayjs(expiryDate).diff(dayjs(), 'day');
        return diff;
    };

    // --- SUBSCRIPTION CHECK ---
    const navigate = useNavigate();
    const limits = getPlanLimits(profile?.subscription_tier);
    const isWarrantyLocked = profile ? !limits.allow_warranty_system : false;

    if (!profile) return <div style={{ textAlign: 'center', padding: '100px' }}><Spin size="large" tip="Verifying Subscription..." /></div>;

    return (
        <div style={{ padding: isMobile ? '12px 4px' : '4px', position: 'relative', minHeight: '80vh' }}>
            
            {/* --- LOCK OVERLAY CARD --- */}
            {isWarrantyLocked && (
                <div style={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0, bottom: 0,
                    zIndex: 100,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'flex-start',
                    paddingTop: '100px',
                    background: 'rgba(255, 255, 255, 0.01)', // Halka sa transparent
                }}>
                    <Card 
                        style={{ 
                            maxWidth: 500, 
                            textAlign: 'center', 
                            borderRadius: 12, 
                            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                            border: `1px solid ${token.colorBorder}`
                        }}
                    >
                        <SafetyCertificateOutlined style={{ fontSize: 60, color: '#bfbfbf', marginBottom: 20 }} />
                        <Title level={3}>Warranty System</Title>
                        <Text type="secondary" style={{ fontSize: 16, display: 'block', marginBottom: 24 }}>
                            Track repairs, manage claims, and print warranty cards with the Pro Plan.
                        </Text>
                        <Button type="primary" size="large" onClick={() => navigate('/subscription')}>
                            View Upgrade Plans
                        </Button>
                    </Card>
                </div>
            )}

            {/* --- ACTUAL CONTENT (Blurred if locked) --- */}
            <div style={{ 
                filter: isWarrantyLocked ? 'blur(3px)' : 'none', 
                pointerEvents: isWarrantyLocked ? 'none' : 'auto',
                transition: 'filter 0.3s ease'
            }}>
            {isMobile && (
              <Title level={2} style={{marginLeft: '8px', fontSize: '23px', marginBottom: '16px'}}>
                <SafetyCertificateOutlined /> Warranty & Claims Management
              </Title>
            )}
            
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
                                            <Descriptions.Item label="Sold On">{lookupResult.saleDetails ? dayjs(lookupResult.saleDetails.created_at).format('DD-MMM-YYYY') : <Tag color="processing">In Stock</Tag>}</Descriptions.Item>
                                            {lookupResult.item?.batch_number && <Descriptions.Item label="Batch No."><Tag color="blue">{lookupResult.item.batch_number}</Tag></Descriptions.Item>}
                                            {lookupResult.item?.expiry_date && <Descriptions.Item label="Expiry Date"><Text type={dayjs().isAfter(dayjs(lookupResult.item.expiry_date), 'day') ? "danger" : "success"}>{dayjs(lookupResult.item.expiry_date).format('DD-MMM-YYYY')}</Text></Descriptions.Item>}
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
                                                            <Text strong style={{color: token.colorSuccess}}>{calculateRemainingDays(lookupResult.saleItem.warranty_expiry)} Days Left</Text><br/>
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
                                            renderItem={entry => {
                                                // 1. Check karein warranty hai ya nahi, aur expired hai ya nahi
                                                const expiryDate = entry.saleItem?.warranty_expiry;
                                                const hasWarranty = !!expiryDate;
                                                const isExpired = hasWarranty && dayjs().isAfter(dayjs(expiryDate), 'day');

                                                // 2. Decision lein ke kya dikhana hai
                                                let actionButton;

                                                if (!hasWarranty) {
                                                    actionButton = <Tag color="default">No Warranty</Tag>;
                                                } else if (isExpired) {
                                                    actionButton = <Tag color="error">Expired</Tag>;
                                                } else {
                                                    // Sirf Valid Warranty par Claim button dikhayein
                                                    actionButton = (
                                                        <Button size="small" type="primary" ghost onClick={() => {
                                                            setLookupResult({
                                                                type: 'IMEI', 
                                                                product: entry.product,
                                                                item: entry.inventory,
                                                                saleItem: entry.saleItem,
                                                                saleDetails: lookupResult.sale,
                                                                supplier: entry.supplier,
                                                                customer: lookupResult.customer
                                                            });
                                                            setIsClaimModalOpen(true);
                                                        }}>
                                                            Claim
                                                        </Button>
                                                    );
                                                }

                                                return (
                                                    <List.Item extra={actionButton}>
                                                        <List.Item.Meta 
                                                            title={entry.product?.name} 
                                                            description={
                                                                <Space direction="vertical" size={0}>
                                                                    {hasWarranty 
                                                                        ? <Text type={isExpired ? "danger" : "success"}>Warranty Till: {dayjs(expiryDate).format('DD-MMM-YYYY')}</Text>
                                                                        : <Text type="secondary">Warranty: None</Text>
                                                                    }
                                                                    {(entry.inventory?.batch_number || entry.inventory?.expiry_date) && (
                                                                        <Space size={4} style={{ marginTop: '4px' }}>
                                                                            {entry.inventory?.batch_number && <Tag color="blue" style={{ fontSize: '10px', margin: 0 }}>Batch: {entry.inventory.batch_number}</Tag>}
                                                                            {entry.inventory?.expiry_date && <Tag color={dayjs().isAfter(dayjs(entry.inventory.expiry_date), 'day') ? "error" : "warning"} style={{ fontSize: '10px', margin: 0 }}>Exp: {dayjs(entry.inventory.expiry_date).format('DD-MMM-YYYY')}</Tag>}
                                                                        </Space>
                                                                    )}
                                                                </Space>
                                                            } 
                                                        />
                                                    </List.Item>
                                                );
                                            }}
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
                                            <Text strong style={{color: token.colorPrimary}}>{record.claim_no || 'N/A'}</Text>
                                            <Text style={{fontSize: '12px'}}>{dayjs(record.created_at).format('DD-MMM-YYYY')}</Text>
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
                                    render: (status, record) => {
                                        // --- NAYA IZAFA: Supplier Claim Aging Calculation ---
                                        const daysPending = status === 'Sent to Supplier' ? dayjs().diff(dayjs(record.updated_at), 'day') : 0;
                                        
                                        return (
                                            <Space direction="vertical" size={4}>
                                                <Tag color={status.includes('Supplier') ? 'warning' : 'processing'} style={{ margin: 0, fontSize: '10px' }}>
                                                    {status}
                                                </Tag>
                                                <Select 
                                                    size="small"
                                                    style={{ width: 130, fontSize: '11px' }}
                                                    value={status}
                                                    onChange={(value) => handleStatusUpdateClick(record, value)}
                                                    options={[
                                                        { value: 'Received from Customer', label: 'Received' },
                                                        { value: 'Sent to Supplier', label: 'Sent to Supplier' },
                                                        { value: 'Received from Supplier', label: 'Back from Supplier' },
                                                        { value: 'Returned to Customer', label: 'Returned' },
                                                        { value: 'Rejected', label: 'Rejected' },
                                                    ]}
                                                />
                                                {/* --- NAYA IZAFA: Aging Badge (Ruka Hua Maal) --- */}
                                                {status === 'Sent to Supplier' && (
                                                    <Text type={daysPending >= 7 ? "danger" : "warning"} style={{fontSize: '10px', display: 'block'}}>
                                                        <ClockCircleOutlined /> Sent {daysPending} {daysPending === 1 ? 'day' : 'days'} ago
                                                    </Text>
                                                )}
                                                {record.resolution_remarks && (
                                                    <Text type="secondary" style={{fontSize: '10px', display: 'block', maxWidth: '130px'}} ellipsis={{ tooltip: record.resolution_remarks }}>
                                                        Note: {record.resolution_remarks}
                                                    </Text>
                                                )}
                                            </Space>
                                        );
                                    }
                                },
                                {
                                    title: 'Action',
                                    key: 'action',
                                    render: (_, record) => (
                                        <Space>
                                            <Button 
                                                type="text" 
                                                icon={<PrinterOutlined style={{ color: token.colorInfo }} />} 
                                                onClick={() => {
                                                    const printContent = `
                                                        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 400px; border: 1px solid #ccc;">
                                                            <h2 style="text-align: center; margin-bottom: 5px;">Repair Claim Slip</h2>
                                                            <p style="text-align: center; margin-top: 0; font-size: 12px; color: #666;">${profile?.shop_name || 'My Shop'}</p>
                                                            <hr style="border-top: 1px dashed #ccc;" />
                                                            <p><b>Claim No:</b> ${record.claim_no || 'N/A'}</p>
                                                            <p><b>Date:</b> ${dayjs(record.created_at).format('DD-MMM-YYYY hh:mm A')}</p>
                                                            <p><b>Product:</b> ${record.product_name_snapshot}</p>
                                                            <p><b>IMEI/Batch:</b> ${record.imei}</p>
                                                            <p><b>Issue:</b> ${record.issue_description}</p>
                                                            <hr style="border-top: 1px dashed #ccc;" />
                                                            <p style="font-size: 12px; text-align: center;">Please keep this slip safe. Required at the time of collection.</p>
                                                        </div>
                                                    `;
                                                    const printWindow = window.open('', '_blank');
                                                    printWindow.document.write(printContent);
                                                    printWindow.document.close();
                                                    printWindow.print();
                                                }}
                                            />
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
                                        </Space>
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

            {/* --- NAYA IZAFA: Status Update Remarks Modal --- */}
            <Modal
                title="Update Claim Status"
                open={isStatusModalOpen}
                onCancel={() => setIsStatusModalOpen(false)}
                onOk={() => handleStatusUpdate(selectedClaimForStatus.id, pendingStatus, resolutionRemarks)}
                okText="Save & Update"
            >
                <div style={{ marginTop: '16px' }}>
                    <Text>You are marking this claim as: <Tag color={pendingStatus === 'Rejected' ? 'error' : 'success'}>{pendingStatus}</Tag></Text>
                    <div style={{ marginTop: '16px' }}>
                        <Text strong>Resolution Remarks / Notes (Optional)</Text>
                        <Input.TextArea 
                            rows={3} 
                            placeholder="e.g. Replaced with new unit, or Screen repaired successfully..." 
                            value={resolutionRemarks}
                            onChange={(e) => setResolutionRemarks(e.target.value)}
                            style={{ marginTop: '8px' }}
                        />
                    </div>
                </div>
            </Modal>

        </div> {/* Content Wrapper End */}
        </div> /* Main Container End */
    );
};

export default WarrantyClaims;