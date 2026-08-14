import React, { useState, useEffect } from 'react';
import { Modal, Table, Typography, Row, Col, Card, Spin, Tag, Descriptions, theme, ConfigProvider, Button, Form, Select, DatePicker, Checkbox, Space } from 'antd';
import { FileExcelOutlined } from '@ant-design/icons';
import { db } from '../db';
import { formatCurrency } from '../utils/currencyFormatter';
import { useAuth } from '../context/AuthContext';
import dayjs from 'dayjs';
import DataExport from './DataExport'; // <--- NAYA IZAFA

const { Text, Title } = Typography;

const ProductLedgerModal = ({ visible, onClose, product, warehouses }) => {
    const { token } = theme.useToken();
    const { profile } = useAuth();
    const [loading, setLoading] = useState(false);
    const [historyData, setHistoryData] = useState([]);

    // --- NAYA IZAFA: Wizard States ---
    const [isExportWizardOpen, setIsExportWizardOpen] = useState(false);
    const [exportDateRangeType, setExportDateRangeType] = useState('all');
    const [exportCustomDates, setExportCustomDates] = useState([]);
    const [exportTransactionType, setExportTransactionType] = useState('all');
    const [selectedColumns, setSelectedColumns] = useState(['date', 'type', 'qty', 'amount', 'balance', 'details']);

    // --- NAYA IZAFA: On-screen Live Table Filter States ---
    const [viewTransactionType, setViewTransactionType] = useState('all');
    const [viewDateRange, setViewDateRange] = useState('all');

    // On-screen live filtering logic (calculated runningBalance ko kharab kiye bagair filter karega)
    const getLiveTableData = () => {
        let filtered = [...historyData];

        // 1. Transaction Type Filter
        if (viewTransactionType !== 'all') {
            filtered = filtered.filter(item => item.type === viewTransactionType);
        }

        // 2. Date Range Filter
        if (viewDateRange !== 'all') {
            let start, end;
            const now = dayjs();
            if (viewDateRange === 'today') {
                start = now.startOf('day'); end = now.endOf('day');
            } else if (viewDateRange === 'this_month') {
                start = now.startOf('month'); end = now.endOf('month');
            } else if (viewDateRange === 'last_month') {
                start = now.subtract(1, 'month').startOf('month'); end = now.subtract(1, 'month').endOf('month');
            }
            if (start && end) {
                filtered = filtered.filter(item => {
                    const itemDate = dayjs(item.date);
                    return itemDate.isAfter(start) && itemDate.isBefore(end);
                });
            }
        }

        return filtered;
    };

    // Wizard Filtering Logic
    const getFilteredExportData = () => {
        let filtered = [...historyData];

        if (exportDateRangeType !== 'all') {
            let start, end;
            const now = dayjs();
            if (exportDateRangeType === 'today') {
                start = now.startOf('day'); end = now.endOf('day');
            } else if (exportDateRangeType === 'this_month') {
                start = now.startOf('month'); end = now.endOf('month');
            } else if (exportDateRangeType === 'last_month') {
                start = now.subtract(1, 'month').startOf('month'); end = now.subtract(1, 'month').endOf('month');
            } else if (exportDateRangeType === 'custom' && exportCustomDates.length === 2) {
                start = dayjs(exportCustomDates[0]).startOf('day'); end = dayjs(exportCustomDates[1]).endOf('day');
            }
            if (start && end) {
                filtered = filtered.filter(item => {
                    const itemDate = dayjs(item.date);
                    return itemDate.isAfter(start) && itemDate.isBefore(end);
                });
            }
        }

        if (exportTransactionType !== 'all') {
            filtered = filtered.filter(item => item.type === exportTransactionType);
        }

        return filtered.map(item => ({
            ...item,
            date: dayjs(item.date).format('DD MMM YYYY, hh:mm A')
        }));
    };

    const getDynamicExportColumns = () => {
        const allCols = {
            date: { title: 'Date', dataIndex: 'date' },
            type: { title: 'Type', dataIndex: 'type' },
            qty: { title: 'Quantity', dataIndex: 'qty' },
            amount: { title: 'Amount', dataIndex: 'amount' },
            balance: { title: 'Running Balance', dataIndex: 'runningBalance' },
            details: { title: 'Details', dataIndex: 'details' }
        };
        return selectedColumns.map(key => allCols[key]);
    };
    // ---------------------------------

    useEffect(() => {
        if (visible && product) {
            setViewTransactionType('all'); // <--- NAYA IZAFA: Type filter reset
            setViewDateRange('all');       // <--- NAYA IZAFA: Date filter reset
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

                    // NAYA IZAFA: Warehouse ka naam nikalna
                    const whName = warehouses?.find(w => w.id === inv.warehouse_id)?.name || 'Main Shop';
                    
                    history.push({
                        id: `pur-${inv.id}`,
                        date: purchase?.purchase_date || inv.created_at,
                        type: 'Purchase',
                        qty: `+${originalQty}`,
                        numericQty: originalQty, 
                        amount: (inv.purchase_price || 0) * originalQty, 
                        color: 'blue',
                        details: `Purchased into ${whName} (Inv: ${purchase?.invoice_id || 'N/A'})${batchInfo}`
                    });
                }
                
                // Purana Damaged Logic Hata Diya Gaya (Ab hum Audit Trail se layenge)

                // C. Supplier Return Record
                if (inv.returned_qty > 0 && inv.status === 'Returned') {
                    history.push({
                        id: `ret-${inv.id}`,
                        date: inv.updated_at,
                        type: 'Returned',
                        qty: `-${inv.returned_qty}`,
                        numericQty: -inv.returned_qty, // <--- NAYA IZAFA
                        amount: (inv.purchase_price || 0) * inv.returned_qty, // <--- NAYA IZAFA
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
                    numericQty: -(si.quantity || 1), // <--- NAYA IZAFA
                    amount: (si.price_at_sale || 0) * (si.quantity || 1), // <--- NAYA IZAFA
                    color: 'green',
                    details: `Sold to Customer (Inv: ${sale?.invoice_id || 'N/A'})`
                });
            }

            // 2.5 --- NAYA IZAFA: Fetch Adjustment Logs (Audit Trail) ---
            const adjustments = await db.inventory_adjustments.where('product_id').equals(product.id).toArray();
            for (const adj of adjustments) {
                // Purchase price nikalne ke liye
                const invItem = await db.inventory.get(adj.inventory_id);
                const price = invItem ? (invItem.purchase_price || 0) : 0;
                
                let tagColor = 'red';
                let prefix = '-';
                let numericMultiplier = -1;

                if (adj.adjustment_type === 'Expired') tagColor = 'orange';
                if (adj.adjustment_type === 'Lost') tagColor = 'volcano';
                if (adj.adjustment_type === 'Internal Use') tagColor = 'purple';
                
                if (adj.adjustment_type === 'Restored') {
                    tagColor = 'green';
                    prefix = '+';
                    numericMultiplier = 1;
                }

                history.push({
                    id: `adj-${adj.id}`,
                    date: adj.created_at,
                    type: adj.adjustment_type,
                    qty: `${prefix}${adj.quantity}`,
                    numericQty: adj.quantity * numericMultiplier, 
                    amount: price * adj.quantity, 
                    color: tagColor,
                    details: `${adj.adjustment_type === 'Restored' ? 'Reverted to stock' : 'Marked as ' + adj.adjustment_type} ${adj.notes ? '(' + adj.notes + ')' : ''}`
                });
            }

            // 3. --- NAYA IZAFA: Fetch Stock Transfers ---
            const transfers = await db.stock_transfers.where('product_id').equals(product.id).toArray();
            for (const tr of transfers) {
                const fromWh = warehouses?.find(w => w.id === tr.from_warehouse_id)?.name || 'Main Shop';
                const toWh = warehouses?.find(w => w.id === tr.to_warehouse_id)?.name || 'Main Shop';
                
                // NAYA IZAFA: Staff ka naam nikalna
                let staffName = 'Owner / Admin';
                if (tr.staff_id) {
                    const staff = await db.staff_members.get(tr.staff_id);
                    if (staff) staffName = staff.name;
                }

                // NAYA IZAFA: Voucher No
                const vNo = tr.voucher_no || `TRF-${tr.id.slice(0,6).toUpperCase()}`;
                
                history.push({
                    id: `trf-${tr.id}`,
                    date: tr.created_at,
                    type: 'Transfer',
                    qty: `0`, // Global balance change nahi hota, sirf jagah badalti hai
                    numericQty: 0, 
                    amount: 0, 
                    color: 'geekblue',
                    details: `Transferred ${tr.quantity} units from ${fromWh} to ${toWh} (Ref: ${vNo}). Handled by: ${staffName}. ${tr.notes ? `Notes: ${tr.notes}` : ''}`
                });
            }

            // 4. --- NAYA IZAFA: RUNNING BALANCE CALCULATION ---
            // Pehle purani tareekh se nayi tareekh ki taraf sort karein taake balance sahi jama ho
            history.sort((a, b) => new Date(a.date) - new Date(b.date));
            
            let currentBalance = 0;
            const historyWithBalance = history.map(item => {
                currentBalance += item.numericQty;
                return { ...item, runningBalance: currentBalance };
            });

            // Ab wapis nayi tareekh ko upar le aayen (UI mein dikhane ke liye)
            historyWithBalance.sort((a, b) => new Date(b.date) - new Date(a.date));
            
            setHistoryData(historyWithBalance);

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
            title: 'Amount', // <--- NAYA IZAFA
            dataIndex: 'amount',
            align: 'right',
            render: (amt, record) => (
                <Text style={{ color: record.type === 'Sale' ? token.colorAmountPositive : token.colorCardDetailsText }}>
                    {formatCurrency(amt, profile?.currency)}
                </Text>
            )
        },
        {
            title: 'Balance', // <--- NAYA IZAFA: Running Balance
            dataIndex: 'runningBalance',
            align: 'center',
            render: (bal) => <Tag style={{ fontWeight: 'bold', border: 'none', background: token.colorFillAlter }}>{bal}</Tag>
        },
        {
            title: 'Details',
            dataIndex: 'details',
        }
    ];

    return (
        <>
        <Modal
            title={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingRight: '24px' }}>
                    <Title level={4} style={{ margin: 0, color: token.colorCardHeadingsText }}>Item Ledger / Overview</Title>
                    {/* NAYA IZAFA: Yahan direct DataExport ki jagah Export Options ka button lagaya */}
                    <Button 
                        type="default" 
                        size="small" 
                        icon={<FileExcelOutlined />} 
                        style={{ color: token.colorText, borderColor: token.colorBorder }} 
                        onClick={() => setIsExportWizardOpen(true)}
                    >
                        Export Options
                    </Button>
                </div>
            }
            open={visible}
            onCancel={onClose}
            footer={null}
            width="75%" // <--- NAYA IZAFA: Width 800 se 75% kar di gayi hai
            destroyOnHidden
        >
            {loading ? (
                <div style={{ textAlign: 'center', padding: '50px' }}><Spin /></div>
            ) : (
                <ConfigProvider theme={{ components: { Table: { colorBgContainer: token.colorTableBg, headerBg: token.colorTableHeaderBg, headerColor: token.colorCardColumnsTitleText, colorText: token.colorCardDetailsText }, Descriptions: { colorTextLabel: token.colorCardColumnsTitleText, colorTextValue: token.colorCardDetailsText } } }}>
                    <Card size="small" style={{ marginBottom: '16px', background: token.colorCardBg, border: `1px solid ${token.colorCardBorder}`, boxShadow: `0 4px 12px ${token.colorCardShadow}` }}>
                        {/* NAYA IZAFA: Mobile view ke liye scrollable wrapper aur whiteSpace nowrap */}
                        <div style={{ overflowX: 'auto', whiteSpace: 'nowrap', paddingBottom: '4px' }} className="hide-scrollbar">
                            {/* NAYA IZAFA: Desktop ke liye 3 columns (md, lg, xl, xxl ko 3 kar diya gaya hai) */}
                            <Descriptions size="small" column={{ xs: 1, sm: 2, md: 3, lg: 3, xl: 3, xxl: 3 }}>
                                {/* Row 1 */}
                                <Descriptions.Item label="Product Name"><Text strong style={{ color: token.colorCardDetailsText }}>{product?.name}</Text></Descriptions.Item>
                                <Descriptions.Item label="Category">{product?.category_name}</Descriptions.Item>
                                <Descriptions.Item label="Brand">{product?.brand || 'N/A'}</Descriptions.Item>
                                
                                {/* Row 2 */}
                                <Descriptions.Item label="Barcode"><Text code style={{ color: token.colorCardDetailsText }}>{product?.barcode || 'N/A'}</Text></Descriptions.Item>
                                <Descriptions.Item label="Active Variants">
                                    <Tag color="cyan" style={{ border: 'none' }}>
                                        {product?.groupedVariants?.length || 0} Types
                                    </Tag>
                                </Descriptions.Item>
                                <Descriptions.Item label="Current Stock">
                                    <Space direction="vertical" size={2} style={{ width: '100%' }}>
                                        <Text strong style={{ fontSize: '14px', color: token.colorCardHeadingsText }}>
                                            {product?.quantity} Units <span style={{ fontSize: '11px', fontWeight: 'normal', color: token.colorCardColumnsTitleText }}>(Total)</span>
                                        </Text>
                                        {/* --- NAYA IZAFA: Location Wise Breakdown (Compact & Aligned) --- */}
                                        <Space wrap size={4}>
                                            {(() => {
                                                const stockByLoc = {};
                                                product?.groupedVariants?.forEach(v => {
                                                    if (v.locations) {
                                                        Object.entries(v.locations).forEach(([whId, qty]) => {
                                                            stockByLoc[whId] = (stockByLoc[whId] || 0) + qty;
                                                        });
                                                    }
                                                });
                                                return Object.entries(stockByLoc).map(([whId, qty]) => {
                                                    if (qty <= 0) return null;
                                                    const whName = whId === 'default' ? 'Main Shop' : (warehouses?.find(w => w.id === whId)?.name || 'Main Shop');
                                                    return (
                                                        <Tag key={whId} color="purple" style={{ margin: 0, fontSize: '11px', padding: '0 6px', border: 'none', background: token.colorFillAlter }}>
                                                            🏠 {whName}: <b>{qty}</b>
                                                        </Tag>
                                                    );
                                                });
                                            })()}
                                        </Space>
                                    </Space>
                                </Descriptions.Item>

                                {/* Row 3 */}
                                <Descriptions.Item label="Avg. Buy Price">
                                    <Text style={{ color: token.colorCardDetailsText }}>
                                        {formatCurrency(product?.avg_purchase_price, profile?.currency)}
                                    </Text>
                                </Descriptions.Item>
                                <Descriptions.Item label="Total Stock Value">
                                    <Text strong style={{ color: token.colorWarning }}>
                                        {formatCurrency((product?.quantity || 0) * (product?.avg_purchase_price || 0), profile?.currency)}
                                    </Text>
                                </Descriptions.Item>
                                <Descriptions.Item label="Sale Price Range">
                                    <Text strong style={{ color: token.colorAmountPositive }}>
                                        {formatCurrency(product?.min_sale_price, profile?.currency)} - {formatCurrency(product?.max_sale_price, profile?.currency)}
                                    </Text>
                                </Descriptions.Item>
                            </Descriptions>
                        </div>
                    </Card>

                    {/* NAYA IZAFA: Live Table ke liye inline filters Row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', marginBottom: '12px', flexWrap: 'wrap', gap: '12px' }}>
                        <Title level={5} style={{ color: token.colorCardHeadingsText, margin: 0 }}>Movement History</Title>
                        <Space size="small" style={{ flexWrap: 'wrap' }}>
                            <Text type="secondary" style={{ fontSize: '12px' }}>Filter Table:</Text>
                            
                            {/* Type Filter */}
                            <Select
                                size="small"
                                value={viewTransactionType}
                                onChange={(val) => setViewTransactionType(val)}
                                style={{ width: '140px' }}
                                styles={{ popup: { root: { zIndex: 2000 } } }}
                            >
                                <Select.Option value="all">All Types</Select.Option>
                                <Select.Option value="Sale">Sales</Select.Option>
                                <Select.Option value="Purchase">Purchases</Select.Option>
                                <Select.Option value="Damaged">Damaged</Select.Option>
                                <Select.Option value="Returned">Returns</Select.Option>
                                <Select.Option value="Transfer">Transfers</Select.Option>
                            </Select>
                            
                            {/* Date Filter */}
                            <Select
                                size="small"
                                value={viewDateRange}
                                onChange={(val) => setViewDateRange(val)}
                                style={{ width: '120px' }}
                                styles={{ popup: { root: { zIndex: 2000 } } }}
                            >
                                <Select.Option value="all">All Time</Select.Option>
                                <Select.Option value="today">Today</Select.Option>
                                <Select.Option value="this_month">This Month</Select.Option>
                                <Select.Option value="last_month">Last Month</Select.Option>
                            </Select>
                        </Space>
                    </div>

                    <Table 
                        columns={columns} 
                        dataSource={getLiveTableData()} // <--- NAYA IZAFA: filtered function connect kiya
                        rowKey="id" 
                        size="small" 
                        pagination={{ pageSize: 10 }}
                        scroll={{ x: 'max-content' }} // <--- NAYA IZAFA: Left-Right Scroll ke liye
                    />
                </ConfigProvider>
            )}
        </Modal>

        {/* --- NAYA IZAFA: Export Wizard Modal --- */}
        <Modal
            title="Export & Print Wizard (Item Ledger)"
            open={isExportWizardOpen}
            onCancel={() => setIsExportWizardOpen(false)}
            footer={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                        {getFilteredExportData().length} records found
                    </Text>
                    <Space>
                        {getFilteredExportData().length > 0 && (
                            <DataExport 
                                data={getFilteredExportData()} 
                                exportColumns={getDynamicExportColumns()} 
                                fileName={`Ledger_${product?.name}`} 
                                reportTitle={`Item Ledger: ${product?.name}`} 
                            />
                        )}
                        <Button onClick={() => setIsExportWizardOpen(false)}>Close</Button>
                    </Space>
                </div>
            }
            centered
            width="60%"
        >
            <Form layout="vertical" style={{ marginTop: '16px' }}>
                <Form.Item label={<Text strong>1. Select Date Range</Text>}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <Select
                            value={exportDateRangeType}
                            onChange={(val) => { setExportDateRangeType(val); setExportCustomDates([]); }}
                            style={{ flex: 1, minWidth: '160px' }}
                            styles={{ popup: { root: { zIndex: 2000 } } }}
                        >
                            <Select.Option value="all">All Time History</Select.Option>
                            <Select.Option value="today">Today Only</Select.Option>
                            <Select.Option value="this_month">This Month</Select.Option>
                            <Select.Option value="last_month">Previous Month</Select.Option>
                            <Select.Option value="custom">Custom Range</Select.Option>
                        </Select>
                        
                        {exportDateRangeType === 'custom' && (
                            <DatePicker.RangePicker
                                format="DD/MM/YYYY"
                                value={exportCustomDates.length === 2 ? [dayjs(exportCustomDates[0]), dayjs(exportCustomDates[1])] : null}
                                onChange={(dates) => {
                                    if (dates) setExportCustomDates([dates[0].toISOString(), dates[1].toISOString()]);
                                    else setExportCustomDates([]);
                                }}
                                style={{ flex: 1, minWidth: '220px' }}
                            />
                        )}
                    </div>
                </Form.Item>

                <Form.Item label={<Text strong>2. Select Transaction Type</Text>}>
                    <Select
                        value={exportTransactionType}
                        onChange={(val) => setExportTransactionType(val)}
                        style={{ width: '100%' }}
                        styles={{ popup: { root: { zIndex: 2000 } } }}
                    >
                        <Select.Option value="all">All Transactions</Select.Option>
                        <Select.Option value="Sale">Sales Only</Select.Option>
                        <Select.Option value="Purchase">Purchases Only</Select.Option>
                        <Select.Option value="Damaged">Damaged Stock Only</Select.Option>
                        <Select.Option value="Returned">Supplier Returns Only</Select.Option>
                        <Select.Option value="Transfer">Stock Transfers Only</Select.Option>
                    </Select>
                </Form.Item>

                <Form.Item label={<Text strong>3. Select Columns to Include</Text>}>
                    <Checkbox.Group
                        value={selectedColumns}
                        onChange={(vals) => {
                            if (vals.length > 0) setSelectedColumns(vals);
                        }}
                        style={{ width: '100%' }}
                    >
                        <Row gutter={[16, 8]}>
                            <Col span={8}><Checkbox value="date">Date</Checkbox></Col>
                            <Col span={8}><Checkbox value="type">Type</Checkbox></Col>
                            <Col span={8}><Checkbox value="qty">Quantity</Checkbox></Col>
                            <Col span={8}><Checkbox value="amount">Amount / Value</Checkbox></Col>
                            <Col span={8}><Checkbox value="balance">Running Balance</Checkbox></Col>
                            <Col span={8}><Checkbox value="details">Details</Checkbox></Col>
                        </Row>
                    </Checkbox.Group>
                </Form.Item>
            </Form>
        </Modal>
        </>
    );
};

export default ProductLedgerModal;