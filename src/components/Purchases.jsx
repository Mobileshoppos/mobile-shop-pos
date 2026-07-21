import React, { useState, useEffect, useCallback } from 'react';
import { Table, Tag, Typography, Button, App as AntApp, Flex, List, Card, Row, Col, theme, Input, Space, Select } from 'antd';
import { FileTextOutlined, EyeOutlined, PlusOutlined } from '@ant-design/icons';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import DataService from '../DataService';
import DataExport from '../components/DataExport';
import AddPurchaseForm from './AddPurchaseForm';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/currencyFormatter';
import { db } from '../db';
import dayjs from 'dayjs';

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
    const [searchParams, setSearchParams] = useSearchParams(); // <--- NAYA IZAFA
    const navigate = useNavigate(); // <--- NAYA IZAFA
    const [loading, setLoading] = useState(true);
    const { notification } = AntApp.useApp();
    
    const [isAddModalVisible, setIsAddModalVisible] = useState(false);
    const isMobile = useMediaQuery('(max-width: 768px)');
    const[searchText, setSearchText] = useState('');

    // --- NAYA IZAFA: Local Table Filters & Lists (Expandable Audit Version) ---
    const [purchasedItemsList, setPurchasedItemsList] = useState([]);

    // Smart filter logic: searches supplier, invoice id, product name, brand, or IMEI
    const getFilteredPurchases = () => {
        if (!searchText) return purchases;
        const query = searchText.trim().toLowerCase();
        
        // 1. Find all purchase IDs containing matching items
        const matchedPurchaseIds = new Set();
        purchasedItemsList.forEach(item => {
            if (
                (item.product_name && item.product_name.toLowerCase().includes(query)) ||
                (item.brand && item.brand.toLowerCase().includes(query)) ||
                (item.imei && item.imei.toLowerCase().includes(query))
            ) {
                matchedPurchaseIds.add(item.purchase_id);
            }
        });

        // 2. Filter purchases that match metadata or contain matched items
        return purchases.filter(p => 
            (p.supplier_name && p.supplier_name.toLowerCase().includes(query)) ||
            (p.invoice_id && p.invoice_id.toLowerCase().includes(query)) ||
            matchedPurchaseIds.has(p.id)
        );
    };

    // NAYA IZAFA: Joint Query function to load all purchased items offline-first
    const loadItemizedPurchases = async () => {
        try {
            const allInventory = await db.inventory.toArray();
            const allProducts = await db.products.toArray();
            const allPurchases = await db.purchases.toArray();
            const allSuppliers = await db.suppliers.toArray();

            const productMap = {}; allProducts.forEach(p => productMap[p.id] = p);
            const purchaseMap = {}; allPurchases.forEach(pur => purchaseMap[pur.id] = pur);
            const supplierMap = {}; allSuppliers.forEach(s => supplierMap[s.id] = s.name);

            const formattedItems = allInventory.map(item => {
                const purchase = purchaseMap[item.purchase_id];
                const product = productMap[item.product_id];
                const sName = purchase ? (supplierMap[purchase.supplier_id] || 'Unknown Supplier') : 'Unknown Supplier';

                return {
                    id: item.id,
                    date: purchase ? purchase.purchase_date : item.created_at,
                    created_at: item.created_at || (purchase ? purchase.created_at : null),
                    invoice_id: purchase ? (purchase.invoice_id || purchase.id.slice(0, 8)) : 'N/A',
                    purchase_id: item.purchase_id,
                    product_name: product ? product.name : 'Unknown Product',
                    brand: product ? product.brand : '-',
                    quantity: item.quantity || 1,
                    purchase_price: item.purchase_price || 0,
                    supplier_name: sName,
                    imei: item.imei || null,
                    batch_number: item.batch_number || null,
                    expiry_date: item.expiry_date || null
                };
            });

            // Sort descending (Newest first)
            formattedItems.sort((a, b) => new Date(b.date) - new Date(a.date));
            setPurchasedItemsList(formattedItems);
        } catch (err) {
            console.error("Error loading items:", err);
        }
    };

    const fetchPurchases = useCallback(async () => {
        setLoading(true);
        try {
            const data = await DataService.getPurchases();
            setPurchases(data || []);
            await loadItemizedPurchases(); // <--- Parallel load in offline DB
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

    // --- NAYA IZAFA: Auto-Redirect for Return ---
    useEffect(() => {
        const action = searchParams.get('action');
        const inventoryId = searchParams.get('inventory_id');
        
        // Agar URL mein return ki request aayi hai
        if (action === 'return' && inventoryId) {
            const findPurchaseAndRedirect = async () => {
                try {
                    // Database se check karein ke yeh item kis bill (purchase) ka hai
                    const item = await db.inventory.get(inventoryId);
                    if (item && item.purchase_id) {
                        // Us bill ki details page par bhej dein
                        navigate(`/purchases/${item.purchase_id}?action=return&inventory_id=${inventoryId}`);
                    } else {
                        notification.error({ message: 'Item not found in any purchase.' });
                        setSearchParams({}); // URL saaf kar dein
                    }
                } catch (err) {
                    console.error("Error finding item:", err);
                }
            };
            findPurchaseAndRedirect();
        }
    }, [searchParams, navigate, notification, setSearchParams]);
    // --------------------------------------------
    
    const handlePurchaseCreated = () => {
        setIsAddModalVisible(false);
        fetchPurchases();
    };

    const handleOpenAddModal = () => {
        setIsAddModalVisible(true);
    };

    // --- NAYA IZAFA: Export ke liye columns ---
    const exportColumns = [
        { title: 'Date', dataIndex: 'formattedDate' },
        { title: 'Invoice No.', dataIndex: 'invoice_id' },
        { title: 'Supplier', dataIndex: 'supplier_name' },
        { title: 'Total Amount', dataIndex: 'total_amount' },
        { title: 'Amount Paid', dataIndex: 'amount_paid' },
        { title: 'Balance Due', dataIndex: 'balance_due' },
        { title: 'Status', dataIndex: 'status' }
    ];

    const itemsColumns = [
        {
            title: 'Date & Time',
            dataIndex: 'date',
            key: 'date',
            render: (text, record) => (
                <>
                    <div>{dayjs(text).format('DD MMM YY')}</div>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                        {dayjs(record.created_at || text).format('hh:mm A')}
                    </Text>
                </>
            ),
            sorter: (a, b) => new Date(a.date) - new Date(b.date),
            width: 140
        },
        {
            title: 'Invoice #',
            dataIndex: 'invoice_id',
            key: 'invoice_id',
            render: (text, record) => (
                <Link to={`/purchases/${record.purchase_id}`}>
                    <Text code strong style={{ cursor: 'pointer' }}>{text}</Text>
                </Link>
            ),
            width: 120,
            align: 'center'
        },
        {
            title: 'Product Name',
            dataIndex: 'product_name',
            key: 'product_name',
            render: (text) => <Text strong>{text}</Text>,
            width: 180
        },
        {
            title: 'Brand',
            dataIndex: 'brand',
            key: 'brand',
            width: 100
        },
        {
            title: 'Qty',
            dataIndex: 'quantity',
            key: 'quantity',
            align: 'center',
            render: (val) => <Tag color="blue">{val}</Tag>,
            width: 80
        },
        {
            title: 'Cost Price',
            dataIndex: 'purchase_price',
            key: 'purchase_price',
            align: 'right',
            render: (val) => formatCurrency(val, profile?.currency),
            width: 130
        },
        {
            title: 'Subtotal',
            key: 'subtotal',
            align: 'right',
            render: (_, record) => formatCurrency((record.quantity || 1) * (record.purchase_price || 0), profile?.currency),
            width: 130
        },
        {
            title: 'Supplier',
            dataIndex: 'supplier_name',
            key: 'supplier_name',
            width: 160
        },
        {
            title: 'IMEI / Batch / Expiry',
            key: 'details',
            width: 200,
            render: (_, record) => (
                <Space wrap>
                    {record.imei && <Tag color="cyan">IMEI: {record.imei}</Tag>}
                    {record.batch_number && <Tag color="blue">Batch: {record.batch_number}</Tag>}
                    {record.expiry_date && <Tag color="orange">Exp: {dayjs(record.expiry_date).format('DD/MM/YY')}</Tag>}
                    {!record.imei && !record.batch_number && !record.expiry_date && <Text type="secondary">-</Text>}
                </Space>
            )
        }
    ];

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
                    {formatCurrency(amount, profile?.currency)}
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
                style={{ marginBottom: '16px', gap: '16px', flexWrap: 'wrap' }}
                vertical={isMobile} 
            >
                {isMobile ? (
                    <Title level={2} style={{ margin: 0, marginBottom: '0px', marginLeft: '8px', fontSize: '23px' }}>
                        <FileTextOutlined /> Purchase History
                    </Title>
                ) : (
                    <Input.Search 
                        id="pur-search-input-desktop"
                        placeholder="Search product, brand, supplier, invoice, IMEI..." 
                        allowClear 
                        onChange={(e) => setSearchText(e.target.value)} 
                        style={{ width: '380px' }} 
                    />
                )}
                
                {isMobile && (
                    <Input.Search 
                        id="pur-search-input-mobile"
                        placeholder="Search product, supplier, IMEI..." 
                        allowClear 
                        onChange={(e) => setSearchText(e.target.value)} 
                        style={{ width: '100%' }} 
                    />
                )}

                {/* --- NAYA IZAFA: Export Buttons aur Add Button ko ikatha kiya --- */}
                <div style={{ display: 'flex', gap: '12px', width: isMobile ? '100%' : 'auto', justifyContent: isMobile ? 'space-between' : 'flex-end', alignItems: 'center' }}>
                    <DataExport 
                        data={getFilteredPurchases().map(p => ({
                            ...p,
                            formattedDate: new Date(p.purchase_date).toLocaleDateString(),
                            status: p.status.replace('_', ' ').toUpperCase()
                        }))} 
                        exportColumns={exportColumns} 
                        fileName="Purchase_History" 
                        reportTitle="Purchase Invoices Summary Report" 
                    />
                    <Button 
                        id="pur-add-btn"
                        type="primary" 
                        icon={<PlusOutlined />} 
                        onClick={handleOpenAddModal}
                        style={{ flex: isMobile ? 1 : 'none' }} 
                    >
                        Create New Purchase
                    </Button>
                </div>
            </Flex>

            {isMobile ? (
                // === MOBILE VIEW (LIST WITH EXPANDED ITEMS SHOWN DIRECTLY) ===
                <List
                    loading={loading}
                    dataSource={getFilteredPurchases()}
                    renderItem={(purchase) => {
                        const invoiceItems = purchasedItemsList.filter(item => item.purchase_id === purchase.id);
                        return (
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

                                    {/* Nested Items for Mobile Card (Zero Duplication & Fully Clean) */}
                                    {invoiceItems.length > 0 && (
                                        <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f0f0f0', background: token.colorFillAlter, padding: '8px', borderRadius: '6px' }}>
                                            <Text strong style={{ fontSize: '11px', display: 'block', marginBottom: '6px', color: token.colorPrimary }}>PURCHASED ITEMS:</Text>
                                            {invoiceItems.map(item => (
                                                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                                                    <Text style={{ maxWidth: '65%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        • {item.product_name} {item.brand !== '-' ? `(${item.brand})` : ''}
                                                    </Text>
                                                    <Text type="secondary">{item.quantity} x {formatCurrency(item.purchase_price, profile?.currency)}</Text>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <Row justify="space-between" style={{ marginTop: '16px' }}>
                                        <Col>
                                            <Text type="secondary">Total Amount</Text><br />
                                            <Text>{formatCurrency(purchase.total_amount, profile?.currency)}</Text>
                                        </Col>
                                        <Col style={{ textAlign: 'right' }}>
                                            <Text style={{ color: token.colorTextSecondary }}>Balance Due</Text><br />
                                            <Text style={{ color: purchase.balance_due > 0 ? token.colorError : (purchase.balance_due < 0 ? token.colorSuccess : token.colorTextSecondary) }} strong>
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
                        );
                    }}
                />
            ) : (
                // === DESKTOP VIEW (TABLE WITH AUTO-GROUPED EXPANDABLE ROWS) ===
                <Table
                    columns={columns}
                    dataSource={getFilteredPurchases()}
                    rowKey="id"
                    loading={loading}
                    scroll={{ x: true }}
                    expandable={{
                        expandedRowRender: (record) => {
                            const invoiceItems = purchasedItemsList.filter(item => item.purchase_id === record.id);
                            if (invoiceItems.length === 0) return <div style={{ padding: '8px 24px' }}><Text type="secondary">No items found</Text></div>;
                            
                            return (
                                <div style={{ padding: '8px 24px', background: token.colorFillAlter, borderRadius: '8px' }}>
                                    <Table
                                        dataSource={invoiceItems}
                                        rowKey="id"
                                        pagination={false}
                                        size="small"
                                        columns={[
                                            { title: 'Product Name', dataIndex: 'product_name', key: 'p_name', render: (text) => <Text strong>{text}</Text> },
                                            { title: 'Brand', dataIndex: 'brand', key: 'brand' },
                                            { title: 'Qty Purchased', dataIndex: 'quantity', key: 'qty', align: 'center', render: (val) => <Tag color="blue">{val}</Tag> },
                                            { title: 'Cost Price (Unit)', dataIndex: 'purchase_price', key: 'price', align: 'right', render: (val) => formatCurrency(val, profile?.currency) },
                                            { title: 'Subtotal', key: 'sub', align: 'right', render: (_, r) => formatCurrency((r.quantity || 1) * (r.purchase_price || 0), profile?.currency) },
                                            { 
                                              title: 'IMEI / Batch / Expiry', 
                                              key: 'det', 
                                              render: (_, r) => (
                                                <Space wrap>
                                                    {r.imei && <Tag color="cyan">IMEI: {r.imei}</Tag>}
                                                    {r.batch_number && <Tag color="blue">Batch: {r.batch_number}</Tag>}
                                                    {r.expiry_date && <Tag color="orange">Exp: {dayjs(r.expiry_date).format('DD/MM/YY')}</Tag>}
                                                </Space>
                                              ) 
                                            }
                                        ]}
                                    />
                                </div>
                            );
                        },
                        rowExpandable: (record) => true,
                    }}
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