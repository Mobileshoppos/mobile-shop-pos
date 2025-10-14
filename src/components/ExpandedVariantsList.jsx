// src/components/ExpandedVariantsList.jsx (Final Upgraded Version)

import React, { useState, useEffect } from 'react';
import { List, Spin, Tag, Space, Row, Col, Typography, App, Empty } from 'antd';
import { supabase } from '../supabaseClient';

const { Text } = Typography;

const ExpandedVariantsList = ({ productId }) => {
  const [variants, setVariants] = useState([]);
  const [loading, setLoading] = useState(true);
  const { message } = App.useApp();

  useEffect(() => {
    const fetchVariants = async () => {
      try {
        setLoading(true);
        // --- YAHAN TABDEELI KI GAYI HAI ---
        // Purane RPC function ke bajaye, seedha 'inventory' table se data fetch karein
        const { data, error } = await supabase
          .from('inventory')
          .select('*')
          .eq('product_id', productId)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        setVariants(data);
      } catch (error) {
        message.error("Error fetching product variants: " + error.message);
      } finally {
        setLoading(false);
      }
    };
    fetchVariants();
  }, [productId, message]);

  if (loading) {
    return <div style={{ padding: '24px', textAlign: 'center' }}><Spin /></div>;
  }
  
  if (!variants || variants.length === 0) {
      return <div style={{ padding: '24px' }}><Empty description="No stock variants found for this product." /></div>;
  }

  return (
    <List
      itemLayout="vertical"
      dataSource={variants}
      renderItem={(variant) => (
        <List.Item key={variant.id} style={{ borderBottom: '1px solid #f0f0f0', padding: '16px 8px' }}>
          <Row align="top" gutter={[16, 8]}>
            <Col xs={24} sm={10} md={9}>
              <Space align="start">
                <Tag color="blue" style={{ fontSize: '14px', padding: '6px 10px', marginTop: '5px' }}>{variant.quantity} Units</Tag>
                <div>
                  <Text strong>Sale Price:</Text> <Text>Rs. {variant.sale_price?.toLocaleString()}</Text><br/>
                  <Text type="secondary">Purchase:</Text> <Text type="secondary">Rs. {variant.purchase_price?.toLocaleString()}</Text>
                </div>
              </Space>
            </Col>
            <Col xs={24} sm={14} md={15}>
              {/* --- YAHAN BHI MUKAMMAL TABDEELI KI GAYI HAI --- */}
              <Space wrap>
                {/* Dynamically render tags from item_attributes */}
                {variant.item_attributes && Object.entries(variant.item_attributes).map(([key, value]) => {
                  if (!value) return null;
                  return <Tag key={key}>{`${key}: ${value}`}</Tag>;
                })}
                {/* Render IMEI tag if it exists */}
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