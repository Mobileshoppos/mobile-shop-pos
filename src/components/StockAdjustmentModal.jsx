import React, { useState, useEffect, useMemo } from 'react';
import { Modal, Table, Select, InputNumber, Input, Button, Space, Typography, Tag, App, Spin, theme } from 'antd';
import { DeleteOutlined, SearchOutlined, InboxOutlined } from '@ant-design/icons';
import DataService from '../DataService';
import { useStaff } from '../context/StaffContext';

const { Text } = Typography;
const { Option } = Select;

const StockAdjustmentModal = ({ visible, onCancel, onSuccess, initialItem }) => {
    const { token } = theme.useToken(); // <--- NAYA IZAFA: Theme tokens access karein
    const { message } = App.useApp();
    const { activeStaff } = useStaff();
    
    const [cart, setCart] = useState([]);
    const [inventoryList, setInventoryList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchValue, setSearchValue] = useState(undefined);

    // 1. Dukan ka saara available stock load karna (Search Dropdown ke liye)
    useEffect(() => {
        if (visible) {
            loadStock();
        } else {
            // Modal band hone par cart saaf kar dein
            setCart([]);
            setSearchValue(undefined);
        }
    }, [visible]);

    const loadStock = async () => {
        setLoading(true);
        try {
            const { productsData } = await DataService.getInventoryData();
            let availableOptions = [];

            productsData.forEach(product => {
                if (product.variants && product.variants.length > 0) {
                    product.variants.forEach(variant => {
                        const qty = variant.available_qty || 0; // <--- Sahi column name use karein
                        if (qty > 0) {
                            availableOptions.push({
                                ...variant,
                                key: variant.id, // NAYA IZAFA: Unique ID
                                ids: [variant.id], // NAYA IZAFA: Database save hone ke liye zaroori hai
                                display_quantity: qty, // NAYA IZAFA: UI quantity limit ke liye
                                product_name: product.name,
                                search_text: `${product.name} ${variant.imei || ''} ${variant.batch_number || ''}`.toLowerCase()
                            });
                        }
                    });
                }
            });
            setInventoryList(availableOptions);

            // Agar Inventory page se koi item direct bheja gaya hai (Alert Icon se)
            if (initialItem) {
                addToCart({
                    ...initialItem,
                    product_name: initialItem.product_name || initialItem.name // Name safety
                });
            }

        } catch (error) {
            message.error("Failed to load stock: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    // 2. Cart mein item add karna
    const addToCart = (item) => {
        // Check karein ke kya yeh item pehle se cart mein hai?
        const exists = cart.find(c => c.key === item.key);
        if (exists) {
            message.warning("Item is already in the adjustment list.");
            return;
        }

        const newCartItem = {
            ...item,
            qtyToMark: 1, // Shuru mein quantity 1 hogi
            adjustmentType: 'Damaged', // Default wajah
            notes: ''
        };
        
        setCart([...cart, newCartItem]);
        setSearchValue(undefined); // Search bar khali kar dein
    };

    // 3. Cart se item hatana
    const removeFromCart = (key) => {
        setCart(cart.filter(item => item.key !== key));
    };

    // 4. Cart ke andar tabdeeli karna (Quantity, Reason, Notes)
    const updateCartItem = (key, field, value) => {
        setCart(cart.map(item => {
            if (item.key === key) {
                return { ...item, [field]: value };
            }
            return item;
        }));
    };

    // 5. Final Save Button
    const handleSubmit = async () => {
        if (cart.length === 0) {
            message.warning("Cart is empty.");
            return;
        }

        setIsSubmitting(true);
        try {
            await DataService.processBulkAdjustments(cart, activeStaff?.id);
            message.success(`Successfully adjusted ${cart.length} items!`);
            onSuccess(); // Parent ko batayein ke kaam ho gaya
        } catch (error) {
            message.error("Failed to save adjustments: " + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- TABLE COLUMNS ---
    const columns = [
        {
            title: 'Product Details',
            key: 'product',
            render: (_, record) => (
                <Space direction="vertical" size={0}>
                    <Text strong>{record.product_name}</Text>
                    <Text type="secondary" style={{ fontSize: '11px' }}>
                        {record.imei ? `IMEI: ${record.imei} ` : (record.imeis && record.imeis.length > 0 ? `IMEI: ${record.imeis[0]} ` : '')}
                        {record.batch_number ? `Batch: ${record.batch_number} ` : ''}
                        {record.expiry_date ? `| Exp: ${new Date(record.expiry_date).toLocaleDateString()}` : ''}
                    </Text>
                </Space>
            )
        },
        {
            title: 'Available',
            dataIndex: 'display_quantity',
            align: 'center',
            width: 100,
            render: (qty) => <Tag color="blue">{qty}</Tag>
        },
        {
            title: 'Qty to Adjust',
            key: 'qtyToMark',
            width: 130,
            render: (_, record) => (
                <InputNumber 
                    min={1} 
                    max={record.display_quantity} 
                    value={record.qtyToMark}
                    onChange={(val) => updateCartItem(record.key, 'qtyToMark', val)}
                    style={{ width: '100%' }}
                />
            )
        },
        {
            title: 'Reason (Type)',
            key: 'adjustmentType',
            width: 150,
            render: (_, record) => (
                <Select 
                    value={record.adjustmentType} 
                    onChange={(val) => updateCartItem(record.key, 'adjustmentType', val)}
                    style={{ width: '100%' }}
                >
                    <Option value="Damaged">Damaged / Broken</Option>
                    <Option value="Expired">Expired</Option>
                    <Option value="Lost">Lost / Stolen</Option>
                    <Option value="Internal Use">Internal Use</Option>
                </Select>
            )
        },
        {
            title: 'Notes',
            key: 'notes',
            width: 200,
            render: (_, record) => (
                <Input 
                    placeholder="Optional details..." 
                    value={record.notes}
                    onChange={(e) => updateCartItem(record.key, 'notes', e.target.value)}
                />
            )
        },
        {
            title: '',
            key: 'action',
            width: 50,
            align: 'center',
            render: (_, record) => (
                <Button 
                    type="text" 
                    danger 
                    icon={<DeleteOutlined />} 
                    onClick={() => removeFromCart(record.key)}
                />
            )
        }
    ];

    return (
        <Modal
            title={
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <InboxOutlined style={{ color: '#faad14', fontSize: '20px' }} />
                    <span style={{ fontSize: '18px' }}>Stock Adjustment & Write-off</span>
                </div>
            }
            open={visible}
            onCancel={onCancel}
            width="85%" // Bara Modal (Professional Style)
            style={{ top: 20 }}
            footer={[
                <Button key="cancel" onClick={onCancel}>Cancel</Button>,
                <Button 
                    key="submit" 
                    type="primary" 
                    danger 
                    loading={isSubmitting} 
                    onClick={handleSubmit}
                    disabled={cart.length === 0}
                >
                    Confirm Adjustments
                </Button>
            ]}
            destroyOnHidden
        >
            <div style={{ padding: '10px 0' }}>
                {/* 1. SEARCH BAR */}
                <div style={{ marginBottom: '20px', background: token.colorFillAlter, padding: '16px', borderRadius: '8px', border: `1px solid ${token.colorBorderSecondary}` }}>
                    <Text strong style={{ display: 'block', marginBottom: '8px' }}>Search and Add Items to List:</Text>
                    <Select
                        showSearch
                        value={searchValue}
                        placeholder="Scan Barcode or Search by Product Name, IMEI, Batch..."
                        style={{ width: '100%' }}
                        size="large"
                        suffixIcon={<SearchOutlined />}
                        loading={loading}
                        filterOption={(input, option) =>
                            option.search_data.includes(input.toLowerCase())
                        }
                        onChange={(value) => {
                            const item = inventoryList.find(i => i.key === value);
                            if (item) addToCart(item);
                        }}
                    >
                        {inventoryList.map(item => (
                            <Option key={item.key} value={item.key} search_data={item.search_text}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>
                                        <b>{item.product_name}</b> 
                                        <Text type="secondary" style={{ fontSize: '12px', marginLeft: '8px' }}>
                                            {item.imei ? `(IMEI: ${item.imei}) ` : (item.imeis && item.imeis.length > 0 ? `(IMEI: ${item.imeis[0]}) ` : '')}
                                            {item.batch_number ? `(Batch: ${item.batch_number})` : ''}
                                        </Text>
                                    </span>
                                    <Tag color="blue">Stock: {item.display_quantity}</Tag>
                                </div>
                            </Option>
                        ))}
                    </Select>
                </div>

                {/* 2. ADJUSTMENT CART (TABLE) */}
                <Table 
                    dataSource={cart} 
                    columns={columns} 
                    rowKey="key"
                    pagination={false}
                    size="middle"
                    locale={{ emptyText: 'No items added yet. Search above to add items.' }}
                />
            </div>
        </Modal>
    );
};

export default StockAdjustmentModal;