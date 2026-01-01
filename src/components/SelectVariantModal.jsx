import React, { useState, useEffect } from 'react';
import { Modal, Table, Button, App, Tag, Space, InputNumber } from 'antd';
import { PlusOutlined, CheckOutlined } from '@ant-design/icons';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/currencyFormatter';
import { db } from '../db';

const SelectVariantModal = ({ visible, onCancel, onOk, product, cart }) => {
    const { profile } = useAuth();
    const { message } = App.useApp();
    const [variants, setVariants] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedVariants, setSelectedVariants] = useState([]);

    useEffect(() => {
        if (product) {
            const fetchVariants = async () => {
                setLoading(true);
                try {
                    // *** NAYA CODE (Local DB) ***
                    const data = await db.inventory
                        .where('product_id').equals(product.id)
                        .filter(item => item.status === 'Available' || item.status === 'available') // Case safety
                        .toArray();
                    
                    // Error check ki zaroorat nahi kyunke Dexie empty array dega agar kuch na mila

                    const grouped = {};
                    data.forEach(item => {
                        const attributesKey = JSON.stringify(item.item_attributes || {});
                        const key = `${item.product_id}-${attributesKey}-${item.sale_price}`;

                        if (!grouped[key]) {
                            grouped[key] = { ...item, inventory_ids: [], stock: 0, key: key };
                        }
                        // Ab hum 1 jama karne ke bajaye available_qty jama karenge
                        grouped[key].stock += (item.available_qty || 0);
                        grouped[key].inventory_ids.push(item.id);
                    });
                    setVariants(Object.values(grouped));

                } catch (error) {
                    message.error("Failed to fetch stock variants: " + error.message);
                } finally {
                    setLoading(false);
                }
            };
            fetchVariants();
        }
    }, [product, message]);

    const handleOk = () => {
        const itemsToAdd = [];
        selectedVariants.forEach(selection => {
            const variant = variants.find(v => v.key === selection.key);
            const inventoryIdsToSell = variant.inventory_ids.slice(0, selection.quantity);
            
            inventoryIdsToSell.forEach(invId => {
                itemsToAdd.push({
                    ...variant,
                    product_name: product.name, // <--- YEH LINE ADD KI HAI (Naam fix karne ke liye)
                    inventory_id: invId,
                    quantity: 1,
                });
            });
        });
        
        onOk(itemsToAdd);
    };

    const handleQuantityChange = (key, quantity) => {
        const variant = variants.find(v => v.key === key);
        if (quantity > variant.stock) {
            quantity = variant.stock;
            message.warning(`Only ${variant.stock} units available.`);
        }

        const existing = selectedVariants.find(v => v.key === key);
        if (existing) {
            if (quantity > 0) {
                setSelectedVariants(selectedVariants.map(v => v.key === key ? { ...v, quantity } : v));
            } else {
                setSelectedVariants(selectedVariants.filter(v => v.key !== key));
            }
        } else if (quantity > 0) {
            setSelectedVariants([...selectedVariants, { key, quantity }]);
        }
    };

    const columns = [
        {
            title: 'Details',
            key: 'details',
            render: (_, record) => (
                <Space wrap>
                    {record.item_attributes && Object.entries(record.item_attributes).map(([key, value]) => {
                        // 1. IMEI aur Serial wale tags ko yahan se filter karein taake double na ho
                        const upperKey = key.toUpperCase();
                        if (upperKey.includes('IMEI') || upperKey.includes('SERIAL')) return null;
                        
                        // 2. Sirf 'value' dikhayein (e.g., "8" ya "White"), label nahi
                        return <Tag key={key}>{value}</Tag>;
                    })}
                    
                    {/* 3. IMEI ko alag se Purple tag mein dikhayein (Bina "IMEI:" label ke) */}
                    {record.imei && <Tag color="purple">{record.imei}</Tag>}
                </Space>
            )
        },
        { title: 'In Stock', dataIndex: 'stock', key: 'stock', align: 'center' },
        { title: 'Sale Price', dataIndex: 'sale_price', key: 'sale_price', align: 'right', render: (price) => formatCurrency(price, profile?.currency) },
        {
            title: 'Select Item',
            key: 'action',
            align: 'center',
            render: (_, record) => {
                // 1. Check karein ke kya yeh item abhi Modal mein select hua hai?
                const isSelectedNow = selectedVariants.some(v => v.key === record.key);
                
                // 2. Check karein ke kya yeh item pehle se POS Cart mein mojood hai?
                // IMEI items ke liye hum inventory_id match karte hain
                const isAlreadyInCart = cart?.some(cartItem => 
                    record.imei 
                        ? record.inventory_ids.includes(cartItem.inventory_id) 
                        : cartItem.variant_id === record.variant_id
                );

                if (record.imei) {
                    // CASE 1: IMEI Based Product
                    if (isAlreadyInCart) {
                        return <Tag color="purple" icon={<CheckOutlined />}>In Cart</Tag>;
                    }
                    return (
                        <Button 
                            type={isSelectedNow ? "primary" : "default"}
                            icon={isSelectedNow ? <CheckOutlined /> : <PlusOutlined />}
                            onClick={() => handleQuantityChange(record.key, isSelectedNow ? 0 : 1)}
                        >
                            {isSelectedNow ? "Selected" : "Add"}
                        </Button>
                    );
                } else {
                    // CASE 2: Bulk Product (Charger/Cable) -> Purana InputNumber dikhayein
                    return (
                        <InputNumber
                            min={0}
                            max={record.stock}
                            value={selectedVariants.find(v => v.key === record.key)?.quantity || 0}
                            onChange={(value) => handleQuantityChange(record.key, value || 0)}
                        />
                    );
                }
            }
        }
    ];

    return (
        <Modal
            title={`Select Variants for: ${product?.name}`}
            open={visible}
            onCancel={onCancel}
            onOk={handleOk}
            okText="Add Selected to Cart"
            okButtonProps={{ disabled: selectedVariants.length === 0 }}
            width={800}
            destroyOnHidden={true}
        >
            <Table
                columns={columns}
                dataSource={variants}
                rowKey="key"
                loading={loading}
                pagination={false}
            />
        </Modal>
    );
};

export default SelectVariantModal;