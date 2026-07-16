import React, { useState, useEffect } from 'react';
import { Modal, Table, Typography, Row, Col, Card, Spin, Tag, Descriptions, theme, ConfigProvider } from 'antd';
import { db } from '../db';
import { formatCurrency } from '../utils/currencyFormatter';
import { useAuth } from '../context/AuthContext';
import dayjs from 'dayjs';
import DataExport from './DataExport'; // <--- NAYA IZAFA

const { Text, Title } = Typography;

const ProductLedgerModal = ({ visible, onClose, product }) => {
    const { token } = theme.useToken();
    const { profile } = useAuth();
    const [loading, setLoading] = useState(false);
    const [historyData, setHistoryData] = useState([]);

    useEffect(() => {
        if (visible && product) {
            fetchLedgerData();
        }
    }, [visible, product]);

    const fetchLedgerData = async () => {
        setLoading(true);
        try {
            const history = [];

            // 1. Fetch Inventory Entries (Purchases & Damaged)
            const invItems = await db.inventory.where('product_id').equals(product.id).toArray();
            
            for (const inv of invItems) {
                // A. Purchase Record
                if (inv.purchase_id) {
                    const purchase = await db.purchases.get(inv.purchase_id);
                    const originalQty = (inv.available_qty || 0) + (inv.sold_qty || 0) + (inv.returned_qty || 0) + (inv.damaged_qty || 0);
                    
                    // Batch & Expiry details
                    let batchInfo = '';
                    if (inv.batch_number) batchInfo += ` | B.No: ${inv.batch_number}`;
                    if (inv.expiry_date) batchInfo += ` | Exp: ${dayjs(inv.expiry_date).format('DD/MM/YY')}`;

                    history.push({
                        id: `pur-${inv.id}`,
                        date: purchase?.purchase_date || inv.created_at,
                        type: 'Purchase',
                        qty: `+${originalQty}`,
                        color: 'blue',
                        details: `Purchased (Inv: ${purchase?.invoice_id || 'N/A'})${batchInfo}`
                    });
                }
                
                // B. Damaged Record
                if (inv.damaged_qty > 0) {
                    history.push({
                        id: `dmg-${inv.id}`,
                        date: inv.updated_at,
                        type: 'Damaged',
                        qty: `-${inv.damaged_qty}`,
                        color: 'volcano',
                        details: `Marked as damaged (${inv.adjustment_notes || 'No reason'})`
                    });
                }

                // C. Supplier Return Record
                if (inv.returned_qty > 0 && inv.status === 'Returned') {
                    history.push({
                        id: `ret-${inv.id}`,
                        date: inv.updated_at,
                        type: 'Returned',
                        qty: `-${inv.returned_qty}`,
                        color: 'orange',
                        details: `Returned to Supplier`
                    });
                }
            }

            // 2. Fetch Sales Entries
            const sItems = await db.sale_items.where('product_id').equals(product.id).toArray();
            for (const si of sItems) {
                const sale = await db.sales.get(si.sale_id);
                history.push({
                    id: `sal-${si.id}`,
                    date: sale?.sale_date || si.created_at,
                    type: 'Sale',
                    qty: `-${si.quantity || 1}`,
                    color: 'green',
                    details: `Sold to Customer (Inv: ${sale?.invoice_id || 'N/A'})`
                });
            }

            // 3. Sort by Date (Newest first)
            history.sort((a, b) => new Date(b.date) - new Date(a.date));
            setHistoryData(history);

        } catch (error) {
            console.error("Ledger Error", error);
        } finally {
            setLoading(false);
        }
    };

    const columns = [
        {
            title: 'Date',
            dataIndex: 'date',
            render: (d) => dayjs(d).format('DD MMM YYYY, hh:mm A')
        },
        {
            title: 'Type',
            dataIndex: 'type',
            render: (t, record) => <Tag color={record.color}>{t}</Tag>
        },
        {
            title: 'Qty',
            dataIndex: 'qty',
            align: 'center',
            render: (q) => <Text strong style={{ color: q.startsWith('+') ? token.colorAmountPositive : token.colorAmountNegative }}>{q}</Text>
        },
        {
            title: 'Details',
            dataIndex: 'details',
        }
    ];

    // --- NAYA IZAFA: Export Columns define kiye ---
    const exportColumns = [
        { title: 'Date', dataIndex: 'date' },
        { title: 'Type', dataIndex: 'type' },
        { title: 'Quantity', dataIndex: 'qty' },
        { title: 'Details', dataIndex: 'details' }
    ];

    return (
        <Modal
            title={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingRight: '24px' }}>
                    <Title level={4} style={{ margin: 0, color: token.colorCardHeadingsText }}>Item Ledger / Overview</Title>
                    <DataExport 
                        data={historyData.map(item => ({
                            ...item,
                            date: dayjs(item.date).format('DD MMM YYYY, hh:mm A')
                        }))} 
                        exportColumns={exportColumns} 
                        fileName={`Ledger_${product?.name}`} 
                        reportTitle={`Item Ledger: ${product?.name}`} 
                    />
                </div>
            }
            open={visible}
            onCancel={onClose}
            footer={null}
            width={800}
            destroyOnHidden
        >
            {loading ? (
                <div style={{ textAlign: 'center', padding: '50px' }}><Spin /></div>
            ) : (
                <ConfigProvider theme={{ components: { Table: { colorBgContainer: token.colorTableBg, headerBg: token.colorTableHeaderBg, headerColor: token.colorCardColumnsTitleText, colorText: token.colorCardDetailsText }, Descriptions: { colorTextLabel: token.colorCardColumnsTitleText, colorTextValue: token.colorCardDetailsText } } }}>
                    <Card size="small" style={{ marginBottom: '16px', background: token.colorCardBg, border: `1px solid ${token.colorCardBorder}`, boxShadow: `0 4px 12px ${token.colorCardShadow}` }}>
                        <Descriptions size="small" column={2}>
                            <Descriptions.Item label="Product Name"><Text strong style={{ color: token.colorCardDetailsText }}>{product?.name}</Text></Descriptions.Item>
                            <Descriptions.Item label="Category">{product?.category_name}</Descriptions.Item>
                            <Descriptions.Item label="Brand">{product?.brand || 'N/A'}</Descriptions.Item>
                            <Descriptions.Item label="Barcode"><Text code style={{ color: token.colorCardDetailsText }}>{product?.barcode || 'N/A'}</Text></Descriptions.Item>
                            <Descriptions.Item label="Current Stock">
                                <Tag style={{ fontSize: '14px', backgroundColor: 'transparent', color: token.colorCardDetailsText, borderColor: token.colorCardBorder, fontWeight: 'bold' }}>
                                    {product?.quantity} Units
                                </Tag>
                            </Descriptions.Item>
                            <Descriptions.Item label="Sale Price Range">
                                <Text strong style={{ color: token.colorAmountPositive }}>
                                    {formatCurrency(product?.min_sale_price, profile?.currency)} - {formatCurrency(product?.max_sale_price, profile?.currency)}
                                </Text>
                            </Descriptions.Item>
                        </Descriptions>
                    </Card>

                    <Title level={5} style={{ color: token.colorCardHeadingsText, marginTop: '16px' }}>Movement History</Title>
                    <Table 
                        columns={columns} 
                        dataSource={historyData} 
                        rowKey="id" 
                        size="small" 
                        pagination={{ pageSize: 10 }}
                    />
                </ConfigProvider>
            )}
        </Modal>
    );
};

export default ProductLedgerModal;