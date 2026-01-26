import React, { useState, useEffect, useMemo } from 'react';
import { Typography, Table, Card, Tag, App, Button, Space, Row, Col, Statistic, Input, DatePicker, Popconfirm } from 'antd';
import { AlertOutlined, ReloadOutlined, SearchOutlined, RollbackOutlined, PrinterOutlined } from '@ant-design/icons';
import DataService from '../DataService';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/currencyFormatter';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const DamagedStock = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchText, setSearchText] = useState('');
    
    // Default Range: Aaj se 30 din pehle tak
    const [dateRange, setDateRange] = useState([dayjs().subtract(1, 'month'), dayjs()]);
    
    const { profile } = useAuth();
    const { message } = App.useApp();

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

    const handleRevert = async (record) => {
        try {
            await DataService.revertDamagedStock(record.id, record.damaged_qty);
            message.success("Stock reverted to Available!");
            fetchReport();
        } catch (error) {
            message.error(error.message);
        }
    };

    const columns = [
        { 
            title: 'Date', 
            dataIndex: 'updated_at', 
            render: d => <Text style={{fontSize: '12px'}}>{dayjs(d).format('DD-MMM-YYYY HH:mm')}</Text> 
        },
        { 
            title: 'Product & Invoice', 
            key: 'product',
            render: (_, rec) => (
                <Space direction="vertical" size={0}>
                    <Text strong>{rec.product_name}</Text>
                    <Text type="secondary" style={{fontSize: '11px'}}>
                        {rec.imei ? `IMEI: ${rec.imei}` : `Invoice #: ${rec.invoice_id || 'N/A'}`}
                    </Text>
                </Space>
            )
        },
        { 
            title: 'Supplier', 
            dataIndex: 'supplier_name', 
            render: name => <Tag color="blue">{name}</Tag>
        },
        { title: 'Qty', dataIndex: 'damaged_qty', align: 'center', render: q => <Text strong type="danger">{q}</Text> },
        { 
            title: 'Loss (Cost)', 
            dataIndex: 'total_loss', 
            align: 'right', 
            render: v => <Text strong>{formatCurrency(v, profile?.currency)}</Text> 
        },
        { 
            title: 'Reason', 
            dataIndex: 'adjustment_notes', 
            render: text => <Text type="secondary" style={{fontSize: '12px'}}>{text || 'No reason'}</Text>
        },
        {
            title: 'Action',
            key: 'action',
            align: 'center',
            render: (_, record) => (
                <Popconfirm title="Undo this adjustment?" onConfirm={() => handleRevert(record)}>
                    <Button size="small" type="text" icon={<RollbackOutlined />} title="Revert to Stock" />
                </Popconfirm>
            )
        }
    ];

    return (
        <div style={{ padding: '24px' }}>
            <Row justify="space-between" align="middle" style={{ marginBottom: '24px' }}>
                <Col>
                    <Title level={2} style={{ margin: 0, marginLeft: '48px' }}>
                        <AlertOutlined style={{color: 'red'}} /> Damaged Stock Report
                    </Title>
                </Col>
                <Col>
                    <Space>
                        <Button icon={<PrinterOutlined />} onClick={() => window.print()}>Print</Button>
                        <Button type="primary" icon={<ReloadOutlined />} onClick={fetchReport}>Refresh</Button>
                    </Space>
                </Col>
            </Row>

            <Row gutter={16} style={{ marginBottom: '24px' }}>
                <Col span={8}>
                    <Card size="small" style={{borderLeft: '4px solid #1890ff'}}>
                        <Statistic title="Total Damaged Units" value={totalQty} />
                    </Card>
                </Col>
                <Col span={8}>
                    <Card size="small" style={{borderLeft: '4px solid #ff4d4f'}}>
                        <Statistic title="Total Loss (Cost Value)" value={totalLoss} precision={2} prefix={profile?.currency} />
                    </Card>
                </Col>
                <Col span={8}>
                    <Card size="small" style={{borderLeft: '4px solid #52c41a'}}>
                        <Statistic title="Records Found" value={filteredData.length} />
                    </Card>
                </Col>
            </Row>

            <Card style={{ marginBottom: '16px' }} bodyStyle={{ padding: '12px' }}>
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

            <Table 
                dataSource={filteredData} 
                columns={columns} 
                loading={loading} 
                rowKey="id" 
                size="middle"
                pagination={{ pageSize: 15 }}
                scroll={{ x: true }}
            />
        </div>
    );
};

export default DamagedStock;