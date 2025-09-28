// src/components/ExpandedVariantsList.jsx

import React, { useState, useEffect } from 'react';
import { List, Spin, Tag, Space, Row, Col, Typography, App } from 'antd';
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
        const { data, error } = await supabase.rpc('get_product_variants', { p_product_id: productId });
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

  const tagOrder = ['condition', 'color', 'ram_rom', 'guaranty', 'pta_status'];

  return (
    <List
      itemLayout="vertical"
      dataSource={variants}
      renderItem={(variant) => (
        <List.Item key={JSON.stringify(variant.details)} style={{ borderBottom: '1px solid #f0f0f0', padding: '16px 8px' }}>
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
              <Space wrap>
                {tagOrder.map(key => {
                  const value = variant.details[key];
                  if (!value) return null;
                  let label = value;
                  if (key === 'pta_status') {
                    label = value === 'Not Approved' ? 'Non-PTA' : `PTA-${value}`;
                  }
                  return <Tag key={key}>{label}</Tag>;
                })}
              </Space>
            </Col>
          </Row>
        </List.Item>
      )}
    />
  );
};

export default ExpandedVariantsList;