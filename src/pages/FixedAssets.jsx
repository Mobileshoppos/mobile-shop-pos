import React, { useState, useEffect, useCallback } from 'react';
import {
  Typography,
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  DatePicker,
  Select,
  App as AntApp,
  Space,
  Popconfirm,
  Tooltip,
  theme,
  Card,
  Row,
  Col,
  Statistic,
  ConfigProvider,
  Tag,
  Radio
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  DatabaseOutlined,
  BankOutlined,
  FallOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import DataService from '../DataService';
import { useAuth } from '../context/AuthContext';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { formatCurrency } from '../utils/currencyFormatter';

const { Title, Text } = Typography;

const FixedAssets = () => {
  const { token } = theme.useToken();
  const { message } = AntApp.useApp();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { user, profile } = useAuth(); // <--- NAYA IZAFA: user ko shamil kiya
  
  const [assets, setAssets] = useState([]);
  const [paymentAccounts, setPaymentAccounts] = useState([]);
  const [allCounters, setAllCounters] = useState([]); // NAYA IZAFA: Counter Name ke liye
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [depreciationMode, setDepreciationMode] = useState('manual'); // Default to 'manual'
  const [form] = Form.useForm();

  // Smart Professional Categories
  const assetCategories = [
    'Furniture & Fixtures',
    'IT & Computers',
    'Electronics & Appliances',
    'Vehicles',
    'Machinery & Equipment',
    'Shop Interior & Board',
    'Other'
  ];

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      // Assets mangwana
      const assetsData = await DataService.getFixedAssets();
      setAssets(assetsData);
      
      // Payment Methods (Cash, Bank) mangwana
      if (DataService.getPaymentAccounts) {
        const accountsData = await DataService.getPaymentAccounts();
        setPaymentAccounts(accountsData);
      }

      // NAYA IZAFA: Counters List mangwana taake Active Counter Name mil sake
      if (DataService.getRegisters) {
        const regsData = await DataService.getRegisters();
        setAllCounters(regsData.filter(r => r.type === 'counter'));
      }
    } catch (error) {
      message.error('Error fetching data: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const showModal = (asset = null) => {
    setEditingAsset(asset);
    if (asset) {
      const mode = asset.depreciation_mode || 'manual';
      setDepreciationMode(mode);

      form.setFieldsValue({
        asset_name: asset.asset_name,
        category: asset.category,
        purchase_date: dayjs(asset.purchase_date),
        cost_amount: asset.cost_amount,
        payment_method: asset.payment_method,
        notes: asset.notes,
        status: asset.status || 'Active',
        current_value: asset.current_value !== undefined && asset.current_value !== null ? asset.current_value : asset.cost_amount,
        serial_number: asset.serial_number || '',
        location: asset.location || '',
        funding_source: asset.funding_source || 'Cash',
        useful_life_years: asset.useful_life_years || 5,
        salvage_value: asset.salvage_value || 0
      });
    } else {
      setDepreciationMode('manual'); // Naya asset DEFAULT to 'manual'
      form.resetFields();
      form.setFieldsValue({ 
        purchase_date: dayjs(),
        payment_method: 'Cash',
        funding_source: 'Cash',
        useful_life_years: 5,
        salvage_value: 0,
        status: 'Active'
      });
    }
    setIsModalOpen(true);
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    setEditingAsset(null);
    form.resetFields();
  };

  const handleOk = async (values) => {
    try {
      const payload = {
        user_id: user?.id,
        asset_name: values.asset_name,
        category: values.category,
        purchase_date: values.purchase_date.format('YYYY-MM-DD'),
        cost_amount: values.cost_amount,
        payment_method: values.payment_method,
        notes: values.notes || '',
        status: values.status,
        depreciation_mode: depreciationMode,
        current_value: depreciationMode === 'manual' 
          ? (values.current_value !== undefined && values.current_value !== null ? values.current_value : values.cost_amount)
          : values.current_value,
        serial_number: values.serial_number || '',
        location: values.location || '',
        funding_source: values.funding_source || 'Cash',
        useful_life_years: Number(values.useful_life_years) || 5,
        salvage_value: Number(values.salvage_value) || 0
      };

      if (editingAsset) {
        await DataService.updateFixedAsset(editingAsset.id, payload);
        message.success('Asset updated successfully!');
      } else {
        await DataService.addFixedAsset(payload);
        message.success('Asset added successfully!');
      }
      handleCancel();
      fetchData();
    } catch (error) {
      message.error('Error saving asset: ' + error.message);
    }
  };

  // NAYA: Delete ki jagah Dispose karein taake Cash Audit kharab na ho
  const handleDispose = async (id) => {
    try {
      await DataService.updateFixedAsset(id, { status: 'Disposed', current_value: 0 });
      message.success('Asset marked as Disposed!');
      fetchData();
    } catch (error) {
      message.error('Error disposing asset: ' + error.message);
    }
  };

  // NAYA IZAFA: Ghalti theek karne ke liye Delete ka option wapis laya gaya
  const handleDelete = async (id) => {
    try {
      await DataService.deleteFixedAsset(id);
      message.success('Asset deleted & Cash refunded successfully!');
      fetchData();
    } catch (error) {
      message.error('Error deleting asset: ' + error.message);
    }
  };

  // NAYA IZAFA: Active/Paired Counter Name nikalna
  const activeSession = localStorage.getItem('active_register_session') 
    ? JSON.parse(localStorage.getItem('active_register_session')) 
    : null;
  const activeCounterId = activeSession?.register_id || localStorage.getItem('paired_register_id');
  const activeCounterObj = allCounters.find(c => c.id === activeCounterId);
  const activeCounterName = activeCounterObj ? activeCounterObj.name : 'Active Counter';

  // Total Assets ki qeemat nikalna (Sirf Active aur Current Value ke hisaab se)
  const totalAssetsValue = assets
    .filter(a => a.status !== 'Disposed')
    .reduce((sum, item) => {
      const val = item.current_value !== undefined && item.current_value !== null ? Number(item.current_value) : Number(item.cost_amount);
      return sum + (val || 0);
    }, 0);

  const columns = [
    {
      title: 'Date',
      dataIndex: 'purchase_date',
      key: 'purchase_date',
      render: (date) => dayjs(date).format('DD MMM YYYY'),
    },
    {
      title: 'Asset Name & Details',
      dataIndex: 'asset_name',
      key: 'asset_name',
      render: (text, record) => (
        <div>
          <Text strong style={{ color: token.colorCardDetailsText }}>{text}</Text>
          {(record.serial_number || record.location) && (
            <div style={{ fontSize: '11px', color: token.colorCardColumnsTitleText }}>
              {record.serial_number && <span>SN/Tag: {record.serial_number}</span>}
              {record.serial_number && record.location && <span> | </span>}
              {record.location && <span>Loc: {record.location}</span>}
            </div>
          )}
        </div>
      )
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      render: (text) => <Text style={{ color: token.colorCardCategoryTag }}>{text}</Text>
    },
    {
      title: 'Cost Amount',
      dataIndex: 'cost_amount',
      key: 'cost_amount',
      align: 'right',
      render: (amount) => <Text delete style={{ color: token.colorCardColumnsTitleText }}>{formatCurrency(amount, profile?.currency)}</Text>
    },
    {
      title: 'Current Value',
      dataIndex: 'current_value',
      key: 'current_value',
      align: 'right',
      render: (amount, record) => {
        const val = amount !== undefined && amount !== null ? amount : record.cost_amount;
        return <Text strong style={{ color: token.colorAmountPositive }}>{formatCurrency(val, profile?.currency)}</Text>;
      }
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      align: 'center',
      render: (status) => {
        let color = 'green';
        if (status === 'Disposed') color = 'red';
        return <Tag color={color}>{status || 'Active'}</Tag>;
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'center',
      render: (_, record) => (
        <Space>
          <Tooltip title="Edit / Fix Typo">
            <Button size="small" icon={<EditOutlined />} onClick={() => showModal(record)} />
          </Tooltip>
          {record.status !== 'Disposed' && (
            <Tooltip title="Dispose (Scrap Asset)">
              <Popconfirm title="Mark as Disposed? (Value becomes 0, Cash is NOT refunded)" onConfirm={() => handleDispose(record.id)} okText="Yes" cancelText="No">
                <Button size="small" style={{ color: token.colorWarning, borderColor: token.colorWarning }} icon={<FallOutlined />} />
              </Popconfirm>
            </Tooltip>
          )}
          <Tooltip title="Delete (Error Correction)">
            <Popconfirm title="Delete completely and refund cash? Use only for mistaken entries." onConfirm={() => handleDelete(record.id)} okText="Yes, Delete" cancelText="No">
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <ConfigProvider theme={{ 
      components: { 
        Table: { 
          colorBgContainer: token.colorTableBg, 
          headerBg: token.colorTableHeaderBg, 
          headerColor: token.colorCardColumnsTitleText, 
          colorText: token.colorCardDetailsText 
        }
      } 
    }}>
      <div style={{ padding: isMobile ? '12px 0' : '4px 0' }}>
        
        {/* Header Section (Title moved to AppHeader, Button size reduced) */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => showModal()} style={{ width: isMobile ? '100%' : 'auto' }}>
            Add New Asset
          </Button>
        </div>

        {/* Summary Card */}
        <Row gutter={[16, 16]} style={{ marginBottom: '16px' }}>
          <Col xs={24} md={8}>
            <Card size="small" style={{ borderRadius: 8, borderLeft: `4px solid ${token.colorPrimary}`, backgroundColor: token.colorCardBg, borderColor: token.colorCardBorder, boxShadow: `0 4px 12px ${token.colorCardShadow}` }}>
              <Statistic 
                title={<Text style={{ color: token.colorCardColumnsTitleText }}>Total Assets Value</Text>} 
                value={totalAssetsValue} 
                formatter={(val) => formatCurrency(val, profile?.currency)} 
                valueStyle={{ color: token.colorPrimary, fontWeight: 'bold' }} 
                prefix={<BankOutlined />}
              />
            </Card>
          </Col>
        </Row>

        {/* Data Table */}
        <Table 
          columns={columns} 
          dataSource={assets} 
          loading={loading} 
          rowKey="id" 
          scroll={{ x: 'max-content' }} 
        />

        {/* Add/Edit Modal */}
        <Modal 
          title={editingAsset ? 'Edit Asset' : 'Add New Asset'} 
          open={isModalOpen} 
          onCancel={handleCancel} 
          onOk={() => form.submit()} 
          okText="Save"
          width="80%"
          centered
        >
          <Form form={form} layout="vertical" onFinish={handleOk}>
            {/* NAYA IZAFA: Enter dabane se form save karne ke liye hidden button */}
            <button type="submit" style={{ display: 'none' }} />
            
            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item name="asset_name" label="Asset Name" rules={[{ required: true, message: 'Please enter asset name' }]}>
                  <Input placeholder="e.g. Haier 1.5 Ton AC, Display Counter" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="category" label="Category" rules={[{ required: true, message: 'Please select category' }]}>
                  <Select placeholder="Select Category" showSearch>
                    {assetCategories.map(cat => <Select.Option key={cat} value={cat}>{cat}</Select.Option>)}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item name="serial_number" label="Serial / Tag No. (Optional)">
                  <Input placeholder="e.g. SN-987654321" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="location" label="Location in Shop (Optional)">
                  <Input placeholder="e.g. Counter 1, Backroom, Reception" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item name="purchase_date" label="Purchase Date" rules={[{ required: true, message: 'Select date' }]}>
                  <DatePicker style={{ width: '100%' }} format="DD MMM YYYY" allowClear={false} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="cost_amount" label="Purchase Cost" rules={[{ required: true, message: 'Enter cost' }]}>
                  <InputNumber style={{ width: '100%' }} min={0} placeholder="e.g. 120000" />
                </Form.Item>
              </Col>
            </Row>

            {/* NAYA: Depreciation Mode Selection (Auto vs Manual Toggle) */}
            <div style={{ marginBottom: '16px', background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '6px', border: `1px solid ${token.colorCardBorder}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text strong>Depreciation Calculation Mode:</Text>
                <Radio.Group 
                  value={depreciationMode} 
                  onChange={(e) => setDepreciationMode(e.target.value)}
                  optionType="button"
                  buttonStyle="solid"
                  size="small"
                >
                  <Radio.Button value="auto">Auto (Formula)</Radio.Button>
                  <Radio.Button value="manual">Manual Entry</Radio.Button>
                </Radio.Group>
              </div>
            </div>

            {/* Mode 1: Auto Formula Fields */}
            {depreciationMode === 'auto' ? (
              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item name="useful_life_years" label="Useful Life (Years)" rules={[{ required: true, message: 'Enter useful life' }]} tooltip="Auto-calculates current value over time">
                    <InputNumber style={{ width: '100%' }} min={1} max={50} placeholder="e.g. 5" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="salvage_value" label="Scrap / Salvage Value" tooltip="Estimated worth at end of life">
                    <InputNumber style={{ width: '100%' }} min={0} placeholder="e.g. 5000" />
                  </Form.Item>
                </Col>
              </Row>
            ) : (
              /* Mode 2: Manual Input Field */
              <Row gutter={16}>
                <Col xs={24} sm={24}>
                  <Form.Item name="current_value" label="Current Value (Enter Manually)" rules={[{ required: true, message: 'Enter current value' }]} tooltip="Type the exact current market value of this asset today">
                    <InputNumber style={{ width: '100%' }} min={0} placeholder="e.g. 70000" />
                  </Form.Item>
                </Col>
              </Row>
            )}

            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item name="funding_source" label="Funding / Payment Type" rules={[{ required: true, message: 'Select funding source' }]}>
                  <Select 
                    placeholder="Select Funding Source"
                    onChange={(val) => {
                      if (val === 'Bank') {
                        // NAYA FIX: Bank chunne par pehla Bank/Wallet Account select karein, Cash nahi!
                        const firstBank = paymentAccounts.find(acc => acc.type !== 'Cash')?.name;
                        form.setFieldsValue({ payment_method: firstBank || undefined });
                      } else {
                        form.setFieldsValue({ payment_method: 'Cash' });
                      }
                    }}
                  >
                    <Select.Option value="Cash">Paid by Cash ({activeCounterName})</Select.Option>
                    <Select.Option value="Bank">Paid by Bank / Wallet (Bank Outflow)</Select.Option>
                    <Select.Option value="OwnersCapital">Owner's Capital (Brought from Home - No Cash Entry)</Select.Option>
                    <Select.Option value="ExistingAsset">Existing Asset (Migration - No Cash Entry)</Select.Option>
                  </Select>
                </Form.Item>
              </Col>

              {/* Show Bank selection dropdown only if Funding Source is Bank */}
              <Form.Item shouldUpdate={(prev, curr) => prev.funding_source !== curr.funding_source} noStyle>
                {({ getFieldValue }) => 
                  getFieldValue('funding_source') === 'Bank' ? (
                    <Col xs={24} sm={12}>
                      <Form.Item name="payment_method" label="Select Bank Account" rules={[{ required: true, message: 'Please select bank account' }]}>
                        <Select placeholder="Select Bank/Wallet">
                          {paymentAccounts.filter(acc => acc.type !== 'Cash').map(acc => (
                            <Select.Option key={acc.name} value={acc.name}>{acc.name}</Select.Option>
                          ))}
                        </Select>
                      </Form.Item>
                    </Col>
                  ) : (
                    <Col xs={24} sm={12}>
                      <Form.Item name="status" label="Status" rules={[{ required: true, message: 'Select status' }]}>
                        <Select>
                          <Select.Option value="Active">Active (In Use)</Select.Option>
                          <Select.Option value="Disposed">Disposed / Scrapped</Select.Option>
                        </Select>
                      </Form.Item>
                    </Col>
                  )
                }
              </Form.Item>
            </Row>

            <Form.Item shouldUpdate={(prev, curr) => prev.funding_source !== curr.funding_source} noStyle>
              {({ getFieldValue }) => 
                getFieldValue('funding_source') === 'Bank' ? (
                  <Row gutter={16}>
                    <Col xs={24} sm={12}>
                      <Form.Item name="status" label="Status" rules={[{ required: true, message: 'Select status' }]}>
                        <Select>
                          <Select.Option value="Active">Active (In Use)</Select.Option>
                          <Select.Option value="Disposed">Disposed / Scrapped</Select.Option>
                        </Select>
                      </Form.Item>
                    </Col>
                  </Row>
                ) : null
              }
            </Form.Item>

            <Form.Item name="notes" label="Description / Notes (Optional)">
              <Input.TextArea rows={2} placeholder="e.g. Installed at front door" />
            </Form.Item>

          </Form>
        </Modal>

      </div>
    </ConfigProvider>
  );
};

export default FixedAssets;