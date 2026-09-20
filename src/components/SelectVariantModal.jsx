import React, { useState, useEffect } from 'react';
import { Modal, Table, Button, App, Tag, Space, InputNumber, theme, Input } from 'antd';
import { PlusOutlined, CheckOutlined, SearchOutlined } from '@ant-design/icons';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/currencyFormatter';
import { getPlanLimits } from '../config/subscriptionPlans'; // <--- NAYA IZAFA
import { db } from '../db';
import { useMediaQuery } from '../hooks/useMediaQuery';

const SelectVariantModal = ({ visible, onCancel, onOk, product, cart, variantFilter }) => {
    const { token } = theme.useToken();
    const isMobile = useMediaQuery('(max-width: 768px)');
    const { profile } = useAuth();
    const limits = getPlanLimits(profile?.subscription_tier); // <--- NAYA IZAFA
    const { message, modal } = App.useApp(); // <--- NAYA IZAFA: modal ko add kiya
    const [variants, setVariants] = useState([]);
    const [warehouses, setWarehouses] = useState([]); // <--- NAYA IZAFA
    const [loading, setLoading] = useState(false);
    const [selectedVariants, setSelectedVariants] = useState([]);
    const [searchText, setSearchText] = useState(''); // <--- NAYA IZAFA: Search ke liye

    // NAYA IZAFA: Load warehouses
    useEffect(() => {
        const loadWh = async () => {
            const wh = await db.warehouses.toArray();
            setWarehouses(wh);
        };
        loadWh();
    }, []);

    useEffect(() => {
        if (product) {
            const fetchVariants = async () => {
                setLoading(true);
                try {
                    // *** NAYA CODE (Local DB) ***
                    // NAYA IZAFA: Sirf Main Shop ka data uthana hai
                    const whData = await db.warehouses.toArray();
                    const mainShop = whData.find(w => w.is_default);
                    const mainShopId = mainShop ? mainShop.id : null;

                    let data = await db.inventory
                        .where('product_id').equals(product.id)
                        .filter(item => 
                            (item.status === 'Available' || item.status === 'available') && 
                            (!mainShopId || item.warehouse_id === mainShopId || !item.warehouse_id) // Sirf Main Shop
                        )
                        .toArray();
                    
                    // --- NAYA IZAFA: Agar kisi makhsoos variant par click hua hai, to sirf uske IMEIs dikhayein ---
                    if (variantFilter && variantFilter.ids) {
                        data = data.filter(item => variantFilter.ids.includes(item.id));
                    }
                    // ---------------------------------------------------------------------------------------------

                    // Error check ki zaroorat nahi kyunke Dexie empty array dega agar kuch na mila

                    const grouped = {};
                    data.forEach(item => {
                        const attributesKey = JSON.stringify(item.item_attributes || {});
                        
                        // NAYA IZAFA: Agar IMEI hai to har item ki alag row banegi, warna bulk items group ho jayenge
                        const key = item.imei 
                            ? `${item.product_id}-${item.imei}` 
                            : `${item.product_id}-${attributesKey}-${item.sale_price}-${item.wholesale_price}-${item.batch_number || 'nobatch'}-${item.expiry_date || 'noexp'}-${item.warehouse_id || 'nowarehouse'}`;

                        if (!grouped[key]) {
                            grouped[key] = { ...item, inventory_ids: [], stock: 0, key: key };
                        }
                        // Ab hum 1 jama karne ke bajaye available_qty jama karenge
                        grouped[key].stock += (item.available_qty || 0);
                        grouped[key].inventory_ids.push(item.id);
                    });
                    const finalVariants = Object.values(grouped);
                    // FEFO Sort: Jo pehle expire hoga wo list mein sab se upar aayega
                    finalVariants.sort((a, b) => {
                        if (!a.expiry_date) return 1; 
                        if (!b.expiry_date) return -1;
                        return new Date(a.expiry_date) - new Date(b.expiry_date); 
                    });
                    setVariants(finalVariants);

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
        let hasExpiredItem = false; // <--- NAYA IZAFA: Nishani ke liye

        selectedVariants.forEach(selection => {
            const variant = variants.find(v => v.key === selection.key);
            
            // Check karein ke kya select kiye hue items mein koi expire to nahi?
            if (variant.expiry_date && new Date(variant.expiry_date) < new Date(new Date().setHours(0,0,0,0))) {
                hasExpiredItem = true;
            }

            if (variant.imei) {
                // CASE 1: IMEI Item (Har mobile ki alag entry)
                const inventoryIdsToSell = variant.inventory_ids.slice(0, selection.quantity);
                inventoryIdsToSell.forEach(invId => {
                    itemsToAdd.push({
                        ...variant,
                        product_name: product.name,
                        inventory_id: invId,
                        quantity: 1,
                    });
                });
            } else {
                // CASE 2: Bulk Item (Charger/Cable) - Quantity aik sath jayegi
                itemsToAdd.push({
                    ...variant,
                    product_name: product.name,
                    inventory_id: variant.inventory_ids[0], // POS FIFO logic khud baqi batches sambhal lega
                    quantity: selection.quantity,
                    batch_number: variant.batch_number, // NAYA IZAFA
                    expiry_date: variant.expiry_date    // NAYA IZAFA
                });
            }
        });
        
        // --- NAYA IZAFA: Sakht Pop-up Modal ---
        if (hasExpiredItem && !profile?.block_expired_sales) {
            modal.confirm({
                title: 'Expired Items Selected!',
                content: 'You have selected items that are already expired. Are you sure you want to add them to the bill?',
                okText: 'Yes, Add them',
                okType: 'danger',
                cancelText: 'No, Cancel',
                onOk: () => onOk(itemsToAdd) // Agar user Yes dabaye, to add karo
            });
        } else {
            onOk(itemsToAdd); // Agar expire nahi hain to aam tareeqe se add karo
        }
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

    // --- NAYA IZAFA: Smart Filter Logic ---
    const filteredVariants = variants.filter(v => {
        if (!searchText) return true;
        const lowerSearch = searchText.toLowerCase();
        // Search in IMEI
        if (v.imei && v.imei.toLowerCase().includes(lowerSearch)) return true;
        // Search in Batch
        if (v.batch_number && v.batch_number.toLowerCase().includes(lowerSearch)) return true;
        // Search in Attributes
        if (v.item_attributes) {
            return Object.values(v.item_attributes).some(val => 
                val && val.toString().toLowerCase().includes(lowerSearch)
            );
        }
        return false;
    });

    // --- NAYA IZAFA: Select/Deselect All Logic ---
    // Check karein ke kya filter shuda tamam items pehle se select ho chuke hain?
    const areAllFilteredSelected = filteredVariants.length > 0 && filteredVariants.every(v => 
        selectedVariants.some(sv => sv.key === v.key)
    );

    const handleSelectAllToggle = () => {
        if (areAllFilteredSelected) {
            // Deselect All: Jo items screen par filter huye hain, unko selection se nikaal dein
            const filteredKeys = filteredVariants.map(v => v.key);
            setSelectedVariants(selectedVariants.filter(sv => !filteredKeys.includes(sv.key)));
        } else {
            // Select All: Screen wale tamam items ko select kar lein
            const newSelections = [...selectedVariants];
            filteredVariants.forEach(variant => {
                const exists = newSelections.find(v => v.key === variant.key);
                if (!exists && variant.stock > 0) {
                    newSelections.push({ key: variant.key, quantity: 1 });
                }
            });
            setSelectedVariants(newSelections);
        }
    };

    const columns = [
        {
            title: 'Details',
            key: 'details',
            render: (_, record) => {
                // 1. Attributes ko ikatha karke comma-separated string banayein
                const attrValues =[];
                if (record.item_attributes) {
                    Object.entries(record.item_attributes).forEach(([key, value]) => {
                        const upperKey = key.toUpperCase();
                        if (!upperKey.includes('IMEI') && !upperKey.includes('SERIAL') && value) {
                            attrValues.push(value);
                        }
                    });
                }
                
                return (
                    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                        {/* 2. Text ko comma ke sath aur thore bare font (15px) mein dikhayein */}
                        {attrValues.length > 0 && (
                            <span style={{ fontSize: '15px' }}>{attrValues.join(', ')}</span>
                        )}
                        
                        {/* 3. IMEI ko alag se pehchan ke liye tag mein hi rakhein */}
                        {record.imei && <Tag color="purple" style={{ margin: 0 }}>{record.imei}</Tag>}
                        
                        {/* NAYA IZAFA: Batch aur Expiry dikhayein */}
                        {record.batch_number && <Tag color="blue" style={{ margin: 0 }}>Batch: {record.batch_number}</Tag>}
                        {record.expiry_date && (
                            <Tag color={new Date(record.expiry_date) < new Date() ? "red" : "orange"} style={{ margin: 0 }}>
                                Exp: {new Date(record.expiry_date).toLocaleDateString()}
                            </Tag>
                        )}

                        </div>
                );
            }
        },
        { title: 'In Stock', dataIndex: 'stock', key: 'stock', align: 'center' },
        { title: 'Sale Price', dataIndex: 'sale_price', key: 'sale_price', align: 'right', render: (price) => formatCurrency(price, profile?.currency) },
        {
            title: 'Select Item',
            key: 'action',
            align: 'center',
            width: 120,
            render: (_, record) => {
                // --- NAYA IZAFA: Expiry Check ---
                const isExpired = record.expiry_date && new Date(record.expiry_date) < new Date(new Date().setHours(0,0,0,0));
                const isBlocked = profile?.block_expired_sales && isExpired;

                if (isBlocked) {
                    return <Tag color="red" style={{ margin: 0 }}>Expired - Blocked</Tag>;
                }
                // --------------------------------

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
                            style={{ width: '110px' }}
                        >
                            {isSelectedNow ? "Selected" : "Add"}
                        </Button>
                    );
                } else {
                    // CASE 2: Bulk Product (Charger/Cable) -> Naya UX (Add Button)
                    const currentQty = selectedVariants.find(v => v.key === record.key)?.quantity || 0;
                    
                    if (currentQty === 0) {
                        return (
                            <Button 
                                type="default"
                                icon={<PlusOutlined />}
                                onClick={() => handleQuantityChange(record.key, 1)}
                                style={{ width: '110px' }}
                            >
                                Add
                            </Button>
                        );
                    } else {
                        return (
                            <InputNumber
                                min={0}
                                max={record.stock}
                                value={currentQty}
                                onChange={(value) => handleQuantityChange(record.key, value || 0)}
                                style={{ width: '110px' }}
                            />
                        );
                    }
                }
            }
        }
    ];

    return (
        <Modal
            title={
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span>Select Variants for: {product?.name}</span>
                    {limits.allow_stock_location && product?.rack_location && (
                        <Tag color="blue" style={{ margin: 0, fontSize: '13px' }}>📍 Loc: {product.rack_location}</Tag>
                    )}
                </div>
            }
            open={visible}
            onCancel={() => { setSearchText(''); onCancel(); }}
            onOk={() => { setSearchText(''); handleOk(); }}
            okText="Add Selected to Cart"
            okButtonProps={{ disabled: selectedVariants.length === 0 }}
            width={isMobile ? '95%' : '80%'}
            style={{ top: 20 }}
            destroyOnHidden={true}
        >
            {/* --- NAYA IZAFA: Search & Select All Bar --- */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '12px' }}>
                <Input 
                    placeholder="Search IMEI, Batch, or Details..." 
                    prefix={<SearchOutlined style={{ color: token.colorTextSecondary }} />}
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    allowClear
                    style={{ flex: 1, backgroundColor: token.colorCardBg }}
                />
                <Button onClick={handleSelectAllToggle} disabled={filteredVariants.length === 0}>
                    {areAllFilteredSelected ? 'Deselect All' : 'Select All'}
                </Button>
            </div>

            <style>{`
              .select-variant-table .ant-table-tbody > tr > td {
                background-color: ${token.colorCardBg} !important;
                border-bottom: 1px solid ${token.colorBorderSecondary} !important;
              }
              .select-variant-table .ant-table-tbody > tr:last-child > td {
                border-bottom: none !important;
              }
            `}</style>
            <Table
                className="select-variant-table"
                columns={columns}
                dataSource={filteredVariants}
                rowKey="key"
                loading={loading}
                pagination={false}
            />
        </Modal>
    );
};

export default SelectVariantModal;