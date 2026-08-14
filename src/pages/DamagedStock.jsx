import React, { useState, useEffect, useMemo } from 'react';
import { Typography, Table, Card, Tag, App, Button, Space, Row, Col, Statistic, Input, DatePicker, Popconfirm, theme, Modal, InputNumber, Alert } from 'antd';
import { AlertOutlined, ReloadOutlined, SearchOutlined, RollbackOutlined, PrinterOutlined } from '@ant-design/icons';
import DataService from '../DataService';
import { useAuth } from '../context/AuthContext';
import { useStaff } from '../context/StaffContext';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { formatCurrency } from '../utils/currencyFormatter';
import dayjs from 'dayjs';
import { generateDamagedReportPDF } from '../utils/damagedReportGenerator';
import StockAdjustmentModal from '../components/StockAdjustmentModal';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const DamagedStock = () => {
    const { token } = theme.useToken(); // Control Center Connection
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchText, setSearchText] = useState('');
    const isMobile = useMediaQuery('(max-width: 768px)');
    
    // Default Range: Aaj se 30 din pehle tak
    const [dateRange, setDateRange] = useState([dayjs().subtract(1, 'month'), dayjs()]);
    
    const { profile } = useAuth();
    const { activeStaff } = useStaff(); // <--- NAYA IZAFA
    const { message } = App.useApp();
    const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false); // NAYA IZAFA
    
    // NAYA IZAFA: Partial Restore States
    const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
    const [restoreRecord, setRestoreRecord] = useState(null);
    const [restoreQty, setRestoreQty] = useState(1);
    const [isRestoring, setIsRestoring] = useState(false); // <--- NAYA IZAFA: Double click rokne ke liye

    const fetchReport = async () => {
        setLoading(true);
        try {
            const res = await DataService.getDamagedStockReport();
            setData(res);
        } catch (error) {
            message.error("Failed to load report: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchReport(); }, []);

    // --- FILTER LOGIC ---
    const filteredData = useMemo(() => {
        return data.filter(item => {
            const matchesSearch = item.product_name.toLowerCase().includes(searchText.toLowerCase()) || 
                                 item.supplier_name.toLowerCase().includes(searchText.toLowerCase()) ||
                                 (item.imei && item.imei.includes(searchText));
            
            const matchesDate = !dateRange ? true : 
                               (dayjs(item.updated_at).isAfter(dateRange[0].startOf('day')) || dayjs(item.updated_at).isSame(dateRange[0], 'day')) && 
                               (dayjs(item.updated_at).isBefore(dateRange[1].endOf('day')) || dayjs(item.updated_at).isSame(dateRange[1], 'day'));

            return matchesSearch && matchesDate;
        });
    }, [data, searchText, dateRange]);

    const totalLoss = filteredData.reduce((sum, item) => sum + (item.total_loss || 0), 0);
    const totalQty = filteredData.reduce((sum, item) => sum + (item.damaged_qty || 0), 0);

    // NAYA IZAFA: Modal se aane wali quantity ko wapis bhejna
    const handleRevertConfirm = async () => {
        if (!restoreRecord) return;
        setIsRestoring(true); // <--- NAYA IZAFA: Button ko lock kar dein
        try {
            await DataService.revertDamagedStock(restoreRecord.id, restoreQty, activeStaff?.id);
            message.success(`${restoreQty} item(s) successfully reverted to Available stock!`);
            setIsRestoreModalOpen(false);
            setRestoreRecord(null);
            fetchReport();
        } catch (error) {
            message.error(error.message);
        } finally {
            setIsRestoring(false); // <--- NAYA IZAFA: Button ko wapis khol dein
        }
    };

    const columns = [
        { 
            title: 'Date', 
            dataIndex: 'updated_at', 
            render: d => (
                <Space direction="vertical" size={0}>
                    <Text strong style={{fontSize: '13px'}}>{dayjs(d).format('DD-MMM-YYYY')}</Text>
                    <Text type="secondary" style={{fontSize: '12px'}}>{dayjs(d).format('HH:mm')}</Text>
                </Space>
            )
        },
        { 
            title: 'Product & Details', 
            key: 'product',
            render: (_, rec) => (
                <Space direction="vertical" size={0}>
                    <Text strong>{rec.product_name}</Text>
                    <Text type="secondary" style={{fontSize: '11px'}}>
                        {rec.imei ? `IMEI: ${rec.imei}` : `Invoice #: ${rec.invoice_id || 'N/A'}`}
                    </Text>
                    {/* NAYA IZAFA: Batch aur Expiry dikhana */}
                    {(rec.batch_number || rec.expiry_date) && (
                        <Text type="secondary" style={{fontSize: '11px', color: '#8c8c8c'}}>
                            {rec.batch_number ? `Batch: ${rec.batch_number} ` : ''}
                            {rec.expiry_date ? `| Exp: ${dayjs(rec.expiry_date).format('DD-MMM-YYYY')}` : ''}
                        </Text>
                    )}
                </Space>
            )
        },
        { 
            title: 'Supplier', 
            dataIndex: 'supplier_name', 
            render: name => <Tag color="cyan">{name}</Tag>
        },
        { 
            title: 'Handled By', 
            dataIndex: 'staff_name', 
            render: name => <Text strong>{name}</Text>
        },
        { title: 'Qty', dataIndex: 'damaged_qty', align: 'center', render: q => <Text strong style={{ color: token.colorError }}>{q}</Text> },
        { 
            title: 'Loss (Cost)', 
            dataIndex: 'total_loss', 
            align: 'right', 
            render: v => <Text strong>{formatCurrency(v, profile?.currency)}</Text> 
        },
        { 
            title: 'Reason & Notes', 
            key: 'reason', 
            render: (_, rec) => {
                // NAYA IZAFA: Type ke hisaab se rang (color) tay karein
                let tagColor = 'red';
                if (rec.adjustment_type === 'Expired') tagColor = 'orange';
                if (rec.adjustment_type === 'Lost') tagColor = 'volcano';
                if (rec.adjustment_type === 'Internal Use') tagColor = 'purple';

                return (
                    <Space direction="vertical" size={0}>
                        <Tag color={tagColor} style={{ marginBottom: '4px' }}>
                            {rec.adjustment_type || 'Damaged'}
                        </Tag>
                        <Text type="secondary" style={{fontSize: '11px', whiteSpace: 'pre-wrap'}}>
                            {rec.adjustment_notes || 'No details provided'}
                        </Text>
                    </Space>
                );
            }
        },
        {
            title: 'Action',
            key: 'action',
            align: 'center',
            render: (_, record) => (
                <Button 
                    size="small" 
                    type="text" 
                    icon={<RollbackOutlined />} 
                    title="Revert to Stock" 
                    onClick={() => {
                        setRestoreRecord(record);
                        setRestoreQty(record.damaged_qty); // Default max quantity
                        setIsRestoreModalOpen(true);
                    }}
                />
            )
        }
    ];

    return (
        <div style={{ padding: isMobile ? '12px 4px' : '4px' }}>
            <Row justify="space-between" align="middle" style={{ marginBottom: '16px' }}>
                <Col>
                    {isMobile && (
                        <Title level={2} style={{ margin: 0, marginBottom: '16px', marginLeft: '8px', fontSize: '23px' }}>
                            <AlertOutlined style={{color: token.colorError}} /> Damaged Stock Report
                        </Title>
                    )}
                </Col>
                <Col>
                    <Space>
                        {/* NAYA IZAFA: New Adjustment Button */}
                        <Button 
                            type="primary" 
                            danger
                            icon={<AlertOutlined />} 
                            onClick={() => setIsAdjustmentModalOpen(true)}
                        >
                            Record Adjustment
                        </Button>
                        <Button
                            icon={<PrinterOutlined />}
                            onClick={() => generateDamagedReportPDF(filteredData, { totalQty, totalLoss }, profile, dateRange)}
                        >
                            Download PDF
                        </Button>
                        <Button type="primary" icon={<ReloadOutlined />} onClick={fetchReport}>Refresh</Button>
                    </Space>
                </Col>
            </Row>

            <Row gutter={16} style={{ marginBottom: '24px' }}>
                <Col xs={24} sm={8}>
                    <Card size="small" style={{borderLeft: `4px solid ${token.colorPrimary}`}}>
                        <Statistic title="Total Damaged Units" value={totalQty} />
                    </Card>
                </Col>
                <Col span={8}>
                    <Card size="small" style={{borderLeft: `4px solid ${token.colorError}`}}>
                        <Statistic 
    title="Total Loss (Cost Value)" 
    value={totalLoss} 
    formatter={(val) => formatCurrency(val, profile?.currency)} 
/>
                    </Card>
                </Col>
                <Col span={8}>
                    <Card size="small" style={{borderLeft: `4px solid ${token.colorSuccess}`}}>
                        <Statistic title="Records Found" value={filteredData.length} />
                    </Card>
                </Col>
            </Row>

            <Card style={{ marginBottom: '16px' }} styles={{ body: { padding: '12px' } }}>
                <Row gutter={16} align="middle">
                    <Col xs={24} md={12}>
                        <Input 
                            placeholder="Search product, supplier or IMEI..." 
                            prefix={<SearchOutlined />} 
                            value={searchText}
                            onChange={e => setSearchText(e.target.value)}
                        />
                    </Col>
                    <Col xs={24} md={12}>
                        <RangePicker 
                            style={{ width: '100%' }} 
                            value={dateRange}
                            onChange={val => setDateRange(val)} 
                        />
                    </Col>
                </Row>
            </Card>

            <Card styles={{ body: { padding: 0 } }}>
                <Table 
                    dataSource={filteredData} 
                    columns={columns} 
                loading={loading} 
                rowKey="id" 
                size="middle"
                pagination={{ pageSize: 15 }}
                scroll={{ x: true }}
            />
            </Card>

            {/* NAYA IZAFA: Stock Adjustment Modal */}
            {isAdjustmentModalOpen && (
                <StockAdjustmentModal 
                    visible={isAdjustmentModalOpen}
                    onCancel={() => setIsAdjustmentModalOpen(false)}
                    onSuccess={() => {
                        setIsAdjustmentModalOpen(false);
                        fetchReport(); // Report ko refresh karein
                    }}
                />
            )}

            {/* NAYA IZAFA: Partial Restore Modal */}
            <Modal
                title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <RollbackOutlined style={{ color: token.colorPrimary, fontSize: '20px' }} />
                        <span>Restore to Inventory</span>
                    </div>
                }
                open={isRestoreModalOpen}
                onOk={handleRevertConfirm}
                confirmLoading={isRestoring} // <--- NAYA IZAFA: Double click rokne ka lock
                onCancel={() => {
                    setIsRestoreModalOpen(false);
                    setRestoreRecord(null);
                }}
                okText="Confirm Restore"
                destroyOnHidden
            >
                <div style={{ padding: '10px 0' }}>
                    <Text type="secondary" style={{ display: 'block', marginBottom: '16px' }}>
                        Product: <b>{restoreRecord?.product_name}</b><br/>
                        Total Adjusted (Current): <b>{restoreRecord?.damaged_qty} units</b>
                    </Text>
                    
                    <Text strong>How many units do you want to restore?</Text>
                    <div style={{ marginTop: '8px' }}>
                        <InputNumber
                            min={1}
                            max={restoreRecord?.damaged_qty}
                            value={restoreQty}
                            onChange={(val) => setRestoreQty(val)}
                            style={{ width: '100%' }}
                        />
                    </div>
                    <Alert
                        message="The selected quantity will be added back to your 'Available' stock." 
                        type="info" 
                        showIcon
                        style={{ marginTop: '16px' }}
                    />
                </div>
            </Modal>
        </div>
    );
};

export default DamagedStock;