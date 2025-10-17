// src/components/SelectVariantModal.jsx (A New Component)

import React, { useState, useEffect } from 'react';
import { Modal, Table, Button, App, Tag, Space, InputNumber } from 'antd';
import { supabase } from '../supabaseClient';

const SelectVariantModal = ({ visible, onCancel, onOk, product }) => {
    const { message } = App.useApp();
    const [variants, setVariants] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedVariants, setSelectedVariants] = useState([]);

    useEffect(() => {
        if (product) {
            const fetchVariants = async () => {
                setLoading(true);
                try {
                    // Sirf 'Available' items fetch karein
                    const { data, error } = await supabase
                        .from('inventory')
                        .select('*')
                        .eq('product_id', product.id)
                        .eq('status', 'Available');

                    if (error) throw error;

                    // Variants ko group karein taake ek jaise items ek sath nazar ayein
                    const grouped = {};
                    data.forEach(item => {
                        const attributesKey = JSON.stringify(item.item_attributes || {});
                        const key = `${item.product_id}-${attributesKey}-${item.sale_price}`;

                        if (!grouped[key]) {
                            grouped[key] = { ...item, inventory_ids: [], stock: 0, key: key };
                        }
                        grouped[key].stock += 1;
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
            // Get the required number of inventory IDs from the variant's list
            const inventoryIdsToSell = variant.inventory_ids.slice(0, selection.quantity);
            
            inventoryIdsToSell.forEach(invId => {
                itemsToAdd.push({
                    ...variant,
                    inventory_id: invId, // The specific ID of the item being sold
                    quantity: 1, // Each item in cart is now an individual unit
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
                    {record.item_attributes && Object.entries(record.item_attributes).map(([key, value]) => (
                        <Tag key={key}>{`${key}: ${value}`}</Tag>
                    ))}
                    {record.imei && <Tag color="purple">{`IMEI: ${record.imei}`}</Tag>}
                </Space>
            )
        },
        { title: 'In Stock', dataIndex: 'stock', key: 'stock', align: 'center' },
        { title: 'Sale Price', dataIndex: 'sale_price', key: 'sale_price', align: 'right', render: (price) => `Rs. ${price?.toLocaleString()}` },
        {
            title: 'Quantity to Add',
            key: 'action',
            align: 'center',
            render: (_, record) => (
                <InputNumber
                    min={0}
                    max={record.stock}
                    defaultValue={0}
                    onChange={(value) => handleQuantityChange(record.key, value || 0)}
                />
            )
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
            destroyOnClose
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