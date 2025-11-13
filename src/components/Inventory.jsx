import React, { useState, useEffect } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { Button, Table, Typography, Modal, Form, Input, InputNumber, App, Select, Tag, Row, Col, Card, List, Spin, Space, Collapse, Empty } from 'antd';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { formatCurrency } from '../utils/currencyFormatter';

const { Title, Text } = Typography;
const { Option } = Select;

const formatPriceRange = (min, max, currency) => {
  if (min === null || max === null) return 'N/A';
  if (min === max) return formatCurrency(min, currency);
  return `${formatCurrency(min, currency)} - ${formatCurrency(max, currency)}`;
};

const ProductVariantsSubTable = ({ productId }) => {
  const [variants, setVariants] = useState([]);
  const [loading, setLoading] = useState(true);
  const { message } = App.useApp();
  const { profile } = useAuth();

  useEffect(() => {
    const fetchAndGroupVariants = async () => {
      try {
        setLoading(true);
        
        const { data: inventoryItems, error } = await supabase
          .from('inventory')
          .select('*')
          .eq('product_id', productId)
          .eq('status', 'Available')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        if (!inventoryItems) {
            setVariants([]);
            return;
        }

        const imeiBasedItems = [];
        const quantityBasedItems = {};

        for (const item of inventoryItems) {
          if (item.imei) {
            imeiBasedItems.push({
                ...item,
                display_quantity: 1 
            });
          } else {
            const key = JSON.stringify(item.item_attributes);

            if (!quantityBasedItems[key]) {
              quantityBasedItems[key] = {
                ...item,
                display_quantity: item.quantity || 1, 
              };
            } else {
              quantityBasedItems[key].display_quantity += item.quantity || 1;
            }
          }
        }

        const groupedQuantityItems = Object.values(quantityBasedItems);
        
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
      rowKey={(variant) => variant.imei || variant.id} 
      renderItem={(variant) => (
        <List.Item key={variant.id} style={{ borderBottom: '1px solid #f0f0f0', padding: '16px 8px' }}>
          <Row align="top" gutter={[16, 8]}>
            <Col xs={24} sm={10} md={9}>
              <Space align="start">
                <Tag color="blue" style={{ fontSize: '14px', padding: '6px 10px', marginTop: '5px' }}>
                  {variant.display_quantity} Units
                </Tag>
                <div>
                  <Text strong>Sale Price:</Text> <Text>{formatCurrency(variant.sale_price, profile?.currency)}</Text><br/>
<Text type="secondary">Purchase:</Text> <Text type="secondary">{formatCurrency(variant.purchase_price, profile?.currency)}</Text>
                </div>
              </Space>
            </Col>
            <Col xs={24} sm={14} md={15}>
              <Space wrap>
                {/* === CODE CHANGE START === */}
                
                {/* General attributes (sirf value dikhayein) */}
                {variant.item_attributes && Object.entries(variant.item_attributes).map(([key, value]) => {
                  // Agar key 'imei' ya 'serial' hai to usko yahan na dikhayein taake duplicate na ho
                  if (!value || key.toLowerCase().includes('imei') || key.toLowerCase().includes('serial')) {
                    return null;
                  }
                  // Sirf value ko Tag mein dikhayein
                  return <Tag key={key}>{value}</Tag>;
                })}

                {/* IMEI/Serial ke liye alag se Tag (sirf value dikhayein) */}
                {variant.imei && <Tag color="purple" key="imei">{variant.imei}</Tag>}

                {/* === CODE CHANGE END === */}
              </Space>
            </Col>
          </Row>
        </List.Item>
      )}
    />
  );
};

const MobileProductList = ({ products, loading }) => {
  const { profile } = useAuth();
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
      </div>
    );
  }

  const getCollapseItems = (productId) => [
    {
      key: productId,
      label: <Text strong>View Available Stock Details</Text>,
      children: <ProductVariantsSubTable productId={productId} />,
      style: { border: 'none' },
    },
  ];

  return (
    <List
      grid={{ gutter: 16, xs: 1, sm: 2 }}
      dataSource={products}
      renderItem={(product) => (
        <List.Item>
          <Card 
            variant="outlined" 
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text strong>{product.name}</Text>
                <Tag color={product.quantity > 0 ? 'blue' : 'red'}>{product.quantity ?? 0} Stock</Tag>
              </div>
            }
            style={{ width: '100%', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)' }}
          >
            <Row gutter={[16, 16]}>
              <Col span={24}>
                {product.brand && <Tag>{product.brand}</Tag>}
                <Tag color="geekblue">{product.category_name}</Tag>
              </Col>
              <Col span={24}>
                <Text type="secondary">Sale Price:</Text><br />
                <Text strong>{formatPriceRange(product.min_sale_price, product.max_sale_price, profile?.currency)}</Text>
              </Col>
            </Row>

            {product.quantity > 0 && (
              <Collapse 
                items={getCollapseItems(product.id)}
                bordered={false} 
                expandIconPosition="end" 
                style={{ marginTop: '16px', background: 'transparent' }}
              />
            )}
          </Card>
        </List.Item>
      )}
    />
  );
};

const Inventory = () => {
  const [searchParams] = useSearchParams(); // YEH LINE ADD KAREIN
  const showLowStockOnly = searchParams.get('low_stock') === 'true';
  const location = useLocation();
  const { message } = App.useApp();
  const { user, profile } = useAuth();
  const isMobile = useMediaQuery('(max-width: 768px)');
  
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
        let finalProducts = [];

        if (showLowStockOnly) {
          // *** NAYI LOGIC: Sirf low stock products fetch karein ***
          const { data, error } = await supabase.rpc('get_low_stock_products');
          if (error) throw error;
          finalProducts = data;

        } else {
          // *** PURANI LOGIC: Search aur filter ke hisab se products fetch karein ***
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
          
          const { data, error: selectError } = await query.order('name', { ascending: true });
          if (selectError) throw selectError;
          finalProducts = data;
        }

        setProducts(finalProducts);

      } catch (error) {
        message.error("Error fetching products: " + error.message);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(searchHandler);

  }, [user, searchText, filterCategory, activeFilters, message, showLowStockOnly, location]);

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
    { title: 'Sale Price Range', key: 'price_range', render: (_, record) => formatPriceRange(record.min_sale_price, record.max_sale_price, profile?.currency) },
  ];

  return (
    <>
      <div style={{ 
        display: 'flex', 
        flexDirection: isMobile ? 'column' : 'row', 
        justifyContent: 'space-between', 
        alignItems: isMobile ? 'flex-start' : 'center', 
        marginBottom: '16px' 
      }}>
        <Title level={2} style={{ marginBottom: isMobile ? '16px' : '0' }}>
          {showLowStockOnly ? 'Low Stock Products' : 'Product Inventory'}
        </Title>
        <Button 
          type="primary" 
          size="large" 
          onClick={() => setIsProductModalOpen(true)} 
          style={{ width: isMobile ? '100%' : 'auto' }}
        >
          Add New Product Model
        </Button>
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

      {isMobile ? (
        <MobileProductList products={products} loading={loading} />
      ) : (
        <Table 
          columns={mainColumns} 
          dataSource={products} 
          rowKey="id" 
          loading={loading}
          expandable={{ expandedRowRender: (record) => <ProductVariantsSubTable productId={record.id} />, rowExpandable: (record) => record.quantity > 0 }}
        />
      )}

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
          
          <Form.Item name="purchase_price" label="Default Purchase Price">
    <InputNumber
        style={{ width: '100%' }}
        // Is naye code se cursor ka masla hal ho jayega
        prefix={profile?.currency ? `${profile.currency} ` : ''}
        formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
        parser={(value) => value.replace(/,/g, '')}
    />
</Form.Item>
<Form.Item name="sale_price" label="Default Sale Price">
    <InputNumber
        style={{ width: '100%' }}
        // Is naye code se cursor ka masla hal ho jayega
        prefix={profile?.currency ? `${profile.currency} ` : ''}
        formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
        parser={(value) => value.replace(/,/g, '')}
    />
</Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default Inventory;