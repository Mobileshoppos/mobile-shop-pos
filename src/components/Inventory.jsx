import React, { useState, useEffect } from 'react';
import { Button, Table, Typography, Modal, Form, Input, InputNumber, App, Select, Tag, Row, Col, Card } from 'antd';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import ExpandedVariantsList from './ExpandedVariantsList';

const { Title, Text } = Typography;
const { Option } = Select;

const formatPriceRange = (min, max) => {
  if (min === null || max === null) return 'N/A';
  if (min === max) return `Rs. ${min.toLocaleString()}`;
  return `Rs. ${min.toLocaleString()} - ${max.toLocaleString()}`;
};

const Inventory = () => {
  const { message } = App.useApp();
  const { user } = useAuth();
  
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [advancedFilters, setAdvancedFilters] = useState([]);
  const [activeFilters, setActiveFilters] = useState({});
  
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [productForm] = Form.useForm();
  
  const [searchText, setSearchText] = useState('');
  const [filterCategory, setFilterCategory] = useState(null);
  
  const selectedCategoryId = Form.useWatch('category_id', productForm);

  useEffect(() => {
    if (!user) return;

    const fetchDropdownData = async () => {
      try {
        const { data: categoriesData, error: categoriesError } = await supabase.rpc('get_user_categories_with_settings');
        if (categoriesError) throw categoriesError;
        const visibleCategories = categoriesData.filter(cat => cat.is_visible);
        setCategories(visibleCategories);

        if (filterCategory) {
          const { data: attributes, error: attributesError } = await supabase
            .from('category_attributes')
            .select('attribute_name')
            .eq('category_id', filterCategory);
          if (attributesError) throw attributesError;

          const filtersPromises = attributes.map(async (attr) => {
            const { data: options, error: rpcError } = await supabase.rpc('get_distinct_attribute_values', {
              p_category_id: filterCategory,
              p_attribute_name: attr.attribute_name
            });
            if (rpcError) throw rpcError;
            
            return {
              attribute_name: attr.attribute_name,
              options: options || []
            };
          });

          const resolvedFilters = await Promise.all(filtersPromises);
          setAdvancedFilters(resolvedFilters.filter(f => f.options.length > 0));

        } else {
          setAdvancedFilters([]);
        }

      } catch (error) {
        message.error('Error fetching filter data: ' + error.message);
      }
    };

    fetchDropdownData();

    setLoading(true);
    const searchHandler = setTimeout(async () => {
      try {
        const { data: variants, error: rpcError } = await supabase.rpc('search_product_variants', {
          search_query: searchText,
          filter_attributes: activeFilters
        });
        if (rpcError) throw rpcError;

        const matchingProductIds = [...new Set(variants.map(v => v.product_id))];

        let query = supabase.from('products_display_view').select('*');

        if (searchText || Object.keys(activeFilters).length > 0) {
          if (matchingProductIds.length === 0) {
            setProducts([]);
            setLoading(false);
            return;
          }
          query = query.in('id', matchingProductIds);
        }
        
        if (filterCategory) {
          query = query.eq('category_id', filterCategory);
        }
        
        const { data: finalProducts, error: selectError } = await query.order('name', { ascending: true });
        if (selectError) throw selectError;

        setProducts(finalProducts);

      } catch (error) {
        message.error("Error fetching products: " + error.message);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(searchHandler);

  }, [user, searchText, filterCategory, activeFilters, message]);

  const handleAdvancedFilterChange = (name, value) => {
    setActiveFilters(prev => {
      const newFilters = { ...prev };
      if (value) {
        newFilters[name] = value;
      } else {
        delete newFilters[name];
      }
      return newFilters;
    });
  };

  const handleResetFilters = () => {
    setSearchText('');
    setFilterCategory(null);
    setActiveFilters({});
  };

  const handleProductOk = async (values) => {
    try {
      const productData = {
        ...values,
        barcode: values.barcode || null,
        user_id: user.id
      };
      const { error } = await supabase.from('products').insert([productData]);
      if (error) {
        if (error.code === '23505') {
            throw new Error('This barcode is already assigned to another product.');
        }
        throw error;
      }
      message.success('Product Model added successfully!');
      setIsProductModalOpen(false);
      productForm.resetFields();
      
      setSearchText(prev => prev ? prev + ' ' : ' ');
      setTimeout(() => setSearchText(prev => prev.trim()), 10);

    } catch (error) { 
      message.error('Error adding product model: ' + error.message); 
    }
  };
  
  const isSmartPhoneCategorySelected = categories.find(c => c.id === selectedCategoryId)?.name === 'Smart Phones & Tablets';

  const mainColumns = [
    { 
      title: 'Product Name', dataIndex: 'name', key: 'name',
      render: (name, record) => (
        <div><Text strong>{name}</Text>{record.brand && <div style={{ marginTop: '4px' }}><Tag>{record.brand}</Tag></div>}</div>
      )
    },
    { title: 'Category', dataIndex: 'category_name', key: 'category' },
    { title: 'Total Stock', dataIndex: 'quantity', key: 'quantity', render: (qty) => <Tag color={qty > 0 ? 'blue' : 'red'}>{qty ?? 0}</Tag> },
    { title: 'Sale Price Range', key: 'price_range', render: (_, record) => formatPriceRange(record.min_sale_price, record.max_sale_price) },
  ];

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <Title level={2}>Product Inventory</Title>
        <Button type="primary" size="large" onClick={() => setIsProductModalOpen(true)}>Add New Product Model</Button>
      </div>

      <Card title="Filters & Search" style={{ marginBottom: '24px' }}>
        <Row gutter={[16, 16]} align="bottom">
          <Col xs={24} sm={12} md={10}>
            <Text>Search by Name / Brand / IMEI</Text>
            <Input 
              placeholder="Search or Scan IMEI..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
              style={{ marginTop: '8px' }}
            />
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Text>Filter by Category</Text>
            <Select
              placeholder="All Categories"
              style={{ width: '100%', marginTop: '8px' }}
              value={filterCategory}
              onChange={(value) => setFilterCategory(value)}
              allowClear
            >
              {categories.map(cat => (
                <Option key={cat.id} value={cat.id}>{cat.name}</Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={24} md={6}>
            <Button onClick={handleResetFilters} style={{ width: '100%' }}>
              Reset Filters
            </Button>
          </Col>

          {/* Advanced Filters Section */}
          {advancedFilters.length > 0 && (
             <Col xs={24}><Title level={5} style={{marginTop: 16, marginBottom: 0}}>Advanced Filters</Title></Col>
          )}

          {advancedFilters.length > 0 && advancedFilters.map(filter => (
            <Col xs={12} sm={8} md={6} key={filter.attribute_name}>
              <Text>{filter.attribute_name}</Text>
              <Select
                placeholder={`Select ${filter.attribute_name}...`}
                style={{ width: '100%', marginTop: '8px' }}
                allowClear
                onChange={(value) => handleAdvancedFilterChange(filter.attribute_name, value)}
                value={activeFilters[filter.attribute_name]}
              >
                {(filter.options || []).map(option => (
                  <Option key={option} value={option}>{option}</Option>
                ))}
              </Select>
            </Col>
          ))}
        </Row>
      </Card>

      <Table 
        columns={mainColumns} 
        dataSource={products} 
        rowKey="id" 
        loading={loading}
        expandable={{ expandedRowRender: (record) => <ExpandedVariantsList productId={record.id} />, rowExpandable: (record) => record.quantity > 0 }}
      />

      <Modal title="Add a New Product Model" open={isProductModalOpen} onOk={productForm.submit} onCancel={() => setIsProductModalOpen(false)} okText="Save Model">
        <Form form={productForm} layout="vertical" onFinish={handleProductOk} style={{marginTop: '24px'}}>
          <Form.Item name="name" label="Product Name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="category_id" label="Category" rules={[{ required: true }]}><Select placeholder="Select...">{categories.map(c => (<Option key={c.id} value={c.id}>{c.name}</Option>))}</Select></Form.Item>
          <Form.Item name="brand" label="Brand" rules={[{ required: true }]}><Input /></Form.Item>
          
          {!isSmartPhoneCategorySelected && (
            <Form.Item 
              name="barcode" 
              label="Barcode / QR Code (Optional)"
              help="You can scan a barcode directly into this field."
            >
              <Input placeholder="e.g., 8964000141061" />
            </Form.Item>
          )}
          
          <Form.Item name="purchase_price" label="Default Purchase Price"><InputNumber style={{ width: '100%' }} prefix="Rs." /></Form.Item>
          <Form.Item name="sale_price" label="Default Sale Price"><InputNumber style={{ width: '100%' }} prefix="Rs." /></Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default Inventory;