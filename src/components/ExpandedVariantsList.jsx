// src/components/ExpandedVariantsList.jsx (Updated with Frontend Grouping Logic)

import React, { useState, useEffect } from 'react';
import { List, Spin, Tag, Space, Row, Col, Typography, App, Empty } from 'antd';
import { supabase } from '../supabaseClient';

const { Text } = Typography;

const ExpandedVariantsList = ({ productId }) => {
  const [variants, setVariants] = useState([]);
  const [loading, setLoading] = useState(true);
  const { message } = App.useApp();

  useEffect(() => {
    const fetchAndGroupVariants = async () => {
      try {
        setLoading(true);
        
        // Step 1: Fetch all 'Available' inventory items for the product
        const { data: inventoryItems, error } = await supabase
          .from('inventory')
          .select('*')
          .eq('product_id', productId)
          .eq('status', 'Available') // Hum sirf available stock dikhayenge
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        if (!inventoryItems) {
            setVariants([]);
            return;
        }

        // Step 2: Group items using JavaScript
        const imeiBasedItems = [];
        const quantityBasedItems = {}; // Use an object for efficient grouping

        for (const item of inventoryItems) {
          if (item.imei) {
            // IMEI/Serial wale items hamesha alag hote hain, unhein group na karein
            imeiBasedItems.push({
                ...item,
                // Har IMEI item ki quantity display ke liye 1 hoti hai
                display_quantity: 1 
            });
          } else {
            // Quantity wale items ko unke attributes ki bunyad par group karein
            // Attributes object ko stringify karke ek unique key banayein
            const key = JSON.stringify(item.item_attributes);

            if (!quantityBasedItems[key]) {
              // Agar is variant ka group pehle nahi bana, to naya banayein
              quantityBasedItems[key] = {
                ...item,
                // display_quantity naam ki ek nayi property banayein
                display_quantity: item.quantity || 1, 
              };
            } else {
              // Agar group pehle se hai, to sirf quantity jama karein
              quantityBasedItems[key].display_quantity += item.quantity || 1;
            }
          }
        }

        // Group kiye gaye object ko wapas array mein convert karein
        const groupedQuantityItems = Object.values(quantityBasedItems);
        
        // Dono lists (IMEI wali aur group ki hui) ko milakar final list banayein
        const finalVariants = [...imeiBasedItems, ...groupedQuantityItems];

        setVariants(finalVariants);

      } catch (error) {
        message.error("Error fetching product variants: " + error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAndGroupVariants();
  }, [productId, message]);

  if (loading) {
    return <div style={{ padding: '24px', textAlign: 'center' }}><Spin /></div>;
  }
  
  if (!variants || variants.length === 0) {
      return <div style={{ padding: '24px' }}><Empty description="No available stock found for this product." /></div>;
  }

  return (
    <List
      itemLayout="vertical"
      dataSource={variants}
      // React ke liye ek unique key zaroori hai. Hum 'id' aur 'imei' ko mila kar banayenge.
      rowKey={(variant) => variant.imei || variant.id} 
      renderItem={(variant) => (
        <List.Item key={variant.id} style={{ borderBottom: '1px solid #f0f0f0', padding: '16px 8px' }}>
          <Row align="top" gutter={[16, 8]}>
            <Col xs={24} sm={10} md={9}>
              <Space align="start">
                {/* Hum apni nayi 'display_quantity' property istemal karenge */}
                <Tag color="blue" style={{ fontSize: '14px', padding: '6px 10px', marginTop: '5px' }}>
                  {variant.display_quantity} Units
                </Tag>
                <div>
                  <Text strong>Sale Price:</Text> <Text>Rs. {variant.sale_price?.toLocaleString()}</Text><br/>
                  <Text type="secondary">Purchase:</Text> <Text type="secondary">Rs. {variant.purchase_price?.toLocaleString()}</Text>
                </div>
              </Space>
            </Col>
            <Col xs={24} sm={14} md={15}>
              <Space wrap>
                {variant.item_attributes && Object.entries(variant.item_attributes).map(([key, value]) => {
                  if (!value) return null;
                  return <Tag key={key}>{`${key}: ${value}`}</Tag>;
                })}
                {variant.imei && <Tag color="purple" key="imei">{`IMEI: ${variant.imei}`}</Tag>}
              </Space>
            </Col>
          </Row>
        </List.Item>
      )}
    />
  );
};

export default ExpandedVariantsList;