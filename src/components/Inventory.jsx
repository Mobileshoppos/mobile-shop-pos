import React, { useState, useEffect } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { Button, Table, Typography, Modal, Form, Input, InputNumber, App, Select, Tag, Row, Col, Card, List, Spin, Space, Collapse, Empty, Divider } from 'antd';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { formatCurrency } from '../utils/currencyFormatter';
import DataService from '../DataService';
import { useSync } from '../context/SyncContext';
import { db } from '../db';

const { Title, Text } = Typography;
const { Option } = Select;

const formatPriceRange = (min, max, currency) => {
  if (min === null || max === null) return 'N/A';
  if (min === max) return formatCurrency(min, currency);
  return `${formatCurrency(min, currency)} - ${formatCurrency(max, currency)}`;
};

const ProductList = ({ products, loading }) => {
  const { profile } = useAuth();
  
  const memoizedProducts = React.useMemo(() => {
    if (!products) return [];

    const createStableAttributeKey = (attributes) => {
      if (!attributes || typeof attributes !== 'object') return '{}';
      
      const filteredAttributes = {};
      Object.keys(attributes).forEach(key => {
        const lowerKey = key.toLowerCase();
        if (!lowerKey.includes('imei') && !lowerKey.includes('serial')) {
          filteredAttributes[key] = attributes[key];
        }
      });

      const sortedKeys = Object.keys(filteredAttributes).sort();
      const sortedAttributes = {};
      for (const key of sortedKeys) {
        sortedAttributes[key] = filteredAttributes[key];
      }
      return JSON.stringify(sortedAttributes);
    };

    const getGroupedVariants = (variants) => {
      if (!variants) return [];
      const itemsMap = new Map();

      for (const variant of variants) {
        const attributesKey = createStableAttributeKey(variant.item_attributes);
        const key = `${attributesKey}-${variant.sale_price}-${variant.purchase_price}`;

        if (itemsMap.has(key)) {
          const existing = itemsMap.get(key);
          existing.display_quantity += 1;
          if (variant.imei) {
            existing.imeis.push(variant.imei);
          }
        } else {
          itemsMap.set(key, {
            ...variant,
            display_quantity: 1,
            imeis: variant.imei ? [variant.imei] : [],
          });
        }
      }
      return Array.from(itemsMap.values());
    };

    return products.map(product => ({
      ...product,
      groupedVariants: getGroupedVariants(product.variants),
    }));

  }, [products]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!memoizedProducts || memoizedProducts.length === 0) {
    return (
      <div style={{ marginTop: '40px' }}>
        <Empty description="No products found matching your filters." />
      </div>
    );
  }

  const renderVariantHeader = (variant) => (
  <Row align="middle" justify="space-between" gutter={[16, 8]} style={{ width: '100%' }}>
    {/* Left Side: Price & Quantity */}
    <Col xs={24} sm={12} md={11}>
      <Space align="center" wrap>
        <Tag color="blue" style={{ fontSize: '14px', padding: '6px 10px' }}>
          {variant.display_quantity} Units
        </Tag>
        <div>
          <Text strong>Sale:</Text> <Text>{formatCurrency(variant.sale_price, profile?.currency)}</Text><br/>
          <Text type="secondary">Purchase:</Text> <Text type="secondary">{formatCurrency(variant.purchase_price, profile?.currency)}</Text>
        </div>
      </Space>
    </Col>
    
    {/* Right Side: Attributes (Tags) */}
    <Col xs={24} sm={12} md={13}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'flex-start' }}>
        {variant.item_attributes && Object.entries(variant.item_attributes).map(([key, value]) => {
          if (!value || key.toLowerCase().includes('imei') || key.toLowerCase().includes('serial')) return null;
          return <Tag key={key}>{value}</Tag>;
        })}
      </div>
    </Col>
  </Row>
);

  return (
    <List
      grid={{ gutter: 16, xs: 1, sm: 1, md: 2, lg: 2, xl: 3 }}
      dataSource={memoizedProducts}
      rowKey="id"
      renderItem={(product) => (
        <List.Item style={{ width: '100%' }}>
          <Card 
            variant="outlined" 
            // *** YAHAN TABDEELI KI GAYI HAI: Header ko behtar banaya gaya ***
            title={
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <Title level={5} style={{ margin: 0 }}>{product.name}</Title>
                  <Tag color={product.quantity > 0 ? 'blue' : 'red'} style={{ margin: 0 }}>{product.quantity ?? 0} Stock</Tag>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
  {/* Left Side: Tags - Ab yeh Space component ke baghair hai */}
  <div style={{ flex: '1 1 auto', display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
      {product.brand && <Tag>{product.brand}</Tag>}
      <Tag color="geekblue">{product.category_name}</Tag>
  </div>
  
  {/* Right Side: Price - Yeh waisa hi rahega */}
  <div style={{ flex: '0 0 auto', whiteSpace: 'nowrap' }}>
    <Title level={5} style={{ margin: 0, textAlign: 'right' }}>
      {formatPriceRange(product.min_sale_price, product.max_sale_price, profile?.currency)}
    </Title>
  </div>
</div>
              </>
            }
            styles={{ 
              header: { 
                backgroundColor: 'rgba(255, 255, 255, 0.02)', // Header ka halka sa mukhtalif color
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)' // Neeche halki line
              },
              body: { padding: '0 24px 16px 24px' } 
            }}
            // *** END OF CHANGE ***
            style={{ width: '100%', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)', border: '1px solid rgba(255, 255, 255, 0.1)' }}
          >
            {/* Ab header mein price range show ho rahi hai, to yahan se hata diya hai */}

            {product.groupedVariants.length > 0 && (
              <>
                <Divider style={{ margin: 0 }} />
                <List
                  itemLayout="vertical"
                  dataSource={product.groupedVariants}
                  rowKey={(variant) => `${variant.id}-${variant.imeis.join(',')}`}
                  renderItem={(variant, index) => {
                     const isLastItem = index === product.groupedVariants.length - 1;
                     const itemStyle = { padding: 0, margin: 0, border: 'none' };

                    if (variant.imeis && variant.imeis.length > 0) {
                      const collapseItems = [{
                        key: variant.id,
                        label: renderVariantHeader(variant),
                        children: (
                          <div style={{ padding: '8px 16px' }}>
                            <Text type="secondary" style={{ wordWrap: 'break-word' }}>
                              {variant.imeis.sort().join(', ')}
                            </Text>
                          </div>
                        ),
                        style: { padding: '16px 0', borderBottom: isLastItem ? 'none' : '1px solid #f0f0f0' }
                      }];
                      return (
                        <List.Item style={itemStyle}>
                          <Collapse items={collapseItems} ghost expandIconPosition="end" style={{ padding: 0 }} />
                        </List.Item>
                      );
                    }
                    
                    return (
                       <List.Item style={itemStyle}>
                         <div style={{ padding: '16px 0', borderBottom: isLastItem ? 'none' : '1px solid #f0f0f0' }}>
                            {renderVariantHeader(variant)}
                         </div>
                       </List.Item>
                    );
                  }}
                />
              </>
            )}
          </Card>
        </List.Item>
      )}
    />
  );
};

const Inventory = () => {
  const [searchParams] = useSearchParams();
  const { processSyncQueue } = useSync();
  const showLowStockOnly = searchParams.get('low_stock') === 'true';
  const location = useLocation();
  const { message } = App.useApp();
  const { user, profile } = useAuth();
  const isMobile = useMediaQuery('(max-width: 768px)');
  
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [advancedFilters, setAdvancedFilters] = useState([]);
  // NOTE: Iska naam activeFilters se filterAttributes kar rahe hain behtar wazahat ke liye
  const [filterAttributes, setFilterAttributes] = useState({}); 
  
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [productForm] = Form.useForm();
  
  const [searchText, setSearchText] = useState('');
  const [filterCategory, setFilterCategory] = useState(null);

  // === NAYI STATE VARIABLES START ===
  const [priceRange, setPriceRange] = useState([null, null]); // Default: No price filter
  const [sortBy, setSortBy] = useState('name_asc'); // Default sort
  // === NAYI STATE VARIABLES END ===
  
  const selectedCategoryId = Form.useWatch('category_id', productForm);

  useEffect(() => {
    if (!user) return;

    const fetchDropdownData = async () => {
      try {
        // 1. Categories: Pehle Local DB se koshish karein
        const localCategories = await db.categories.toArray();
        
        if (localCategories.length > 0) {
            // Agar local data hai to wo use karein
            const visibleCategories = localCategories.filter(cat => cat.is_visible !== false); // Handle missing is_visible
            setCategories(visibleCategories);
        } else if (navigator.onLine) {
            // Agar local khali hai aur internet hai, tabhi Supabase par jayein
            const { data: categoriesData, error: categoriesError } = await supabase.rpc('get_user_categories_with_settings');
            if (!categoriesError && categoriesData) {
                const visibleCategories = categoriesData.filter(cat => cat.is_visible);
                setCategories(visibleCategories);
            }
        }

        // 2. Advanced Filters: Sirf tab chalayein jab Internet ho
        if (filterCategory && navigator.onLine) {
          const { data: attributes, error: attributesError } = await supabase
            .from('category_attributes')
            .select('attribute_name')
            .eq('category_id', filterCategory);
            
          if (!attributesError && attributes) {
            const filtersPromises = attributes.map(async (attr) => {
              const { data: options } = await supabase.rpc('get_distinct_attribute_values', {
                p_category_id: filterCategory,
                p_attribute_name: attr.attribute_name
              });
              return { attribute_name: attr.attribute_name, options: options || [] };
            });

            const resolvedFilters = await Promise.all(filtersPromises);
            setAdvancedFilters(resolvedFilters.filter(f => f.options.length > 0));
          }
        } else {
          // Agar offline hain to filters khali rakhein (Error se bachne ke liye)
          setAdvancedFilters([]);
        }

      } catch (error) {
        console.log('Offline: Filters skipped or loaded from cache');
      }
    };

    fetchDropdownData();

    // NAYA Search Handler (Offline-First)
    const searchHandler = setTimeout(async () => {
      setLoading(true);
      try {
        // 1. Sara data Local DB se layein
        const { productsData } = await DataService.getInventoryData();
        
        let filteredProducts = productsData;

        // 2. Search Filter (Javascript mein)
        if (searchText) {
          const lowerSearch = searchText.toLowerCase();
          filteredProducts = filteredProducts.filter(p => 
            (p.name && p.name.toLowerCase().includes(lowerSearch)) ||
            (p.brand && p.brand.toLowerCase().includes(lowerSearch)) ||
            (p.barcode && p.barcode.includes(lowerSearch))
          );
        }

        // 3. Category Filter
        if (filterCategory) {
          filteredProducts = filteredProducts.filter(p => p.category_id === filterCategory);
        }

        // 4. Price Filter
        if (priceRange[0] !== null) {
          filteredProducts = filteredProducts.filter(p => p.sale_price >= priceRange[0]);
        }
        if (priceRange[1] !== null) {
          filteredProducts = filteredProducts.filter(p => p.sale_price <= priceRange[1]);
        }

        // 5. Data Formatting (N/A issue fix karne ke liye)
        const formattedForUI = filteredProducts.map(p => ({
          ...p,
          // Agar min/max price nahi hai to sale_price use karein
          min_sale_price: p.min_sale_price || p.sale_price,
          max_sale_price: p.max_sale_price || p.sale_price,
          quantity: p.quantity || 0,
          variants: p.variants || [] // Variants agar nahi hain to khali array
        }));

        // 6. Sorting
        formattedForUI.sort((a, b) => {
          if (sortBy === 'name_asc') return a.name.localeCompare(b.name);
          if (sortBy === 'price_asc') return (a.min_sale_price || 0) - (b.min_sale_price || 0);
          if (sortBy === 'price_desc') return (b.min_sale_price || 0) - (a.min_sale_price || 0);
          if (sortBy === 'quantity_desc') return (b.quantity || 0) - (a.quantity || 0);
          if (sortBy === 'quantity_asc') return (a.quantity || 0) - (b.quantity || 0);
          return 0;
        });

        setProducts(formattedForUI);

      } catch (error) {
        message.error("Error fetching products: " + error.message);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(searchHandler);

  }, [user, searchText, filterCategory, filterAttributes, priceRange, sortBy, message, showLowStockOnly, location]);

  const handleAdvancedFilterChange = (name, value) => {
    setFilterAttributes(prev => { // setActiveFilters ki jagah setFilterAttributes
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
    setFilterAttributes({}); // setActiveFilters ki jagah setFilterAttributes
    setPriceRange([null, null]); // Price range ko bhi reset karein
    setSortBy('name_asc'); // Sorting ko bhi reset karein
  };

  // NAYA handleProductOk Function
  const handleProductOk = async (values) => {
    try {
      const productData = {
        ...values,
        barcode: values.barcode || null,
        user_id: user.id,
        // UI ke liye zaroori fields set karein taake "N/A" na aaye
        quantity: 0, 
        min_sale_price: values.sale_price,
        max_sale_price: values.sale_price
      };

      // 1. DataService ke zariye Local DB mein save karein
      await DataService.addProduct(productData);
      
      message.success('Product Model added successfully!');
      setIsProductModalOpen(false);
      productForm.resetFields();
      
      // 2. Foran Sync System ko jagayein (Upload shuru karein)
      // Hum await nahi lagayenge taake UI na rukay
      processSyncQueue().then(() => {
        console.log("Upload triggered");
      });

      // 3. List ko refresh karein (Search text ko halka sa hila kar)
      setSearchText(prev => prev ? prev + ' ' : ' ');
      setTimeout(() => setSearchText(prev => prev.trim()), 10);

    } catch (error) { 
      message.error('Error adding product model: ' + error.message); 
    }
  };
  
  const isSmartPhoneCategorySelected = categories.find(c => c.id === selectedCategoryId)?.name === 'Smart Phones & Tablets';

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

      <Card style={{ marginBottom: '24px' }}>
        <Row gutter={[16, 24]} align="bottom">
          {/* Search and Category Filters (wahi rahenge) */}
          <Col xs={24} sm={12} md={10}>
            <Text>Search by Name / Brand / IMEI / Tags</Text>
            <Input 
              placeholder="Search or Scan..."
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
              Reset All Filters
            </Button>
          </Col>

          <Col span={24}><Divider style={{ margin: '0' }} /></Col>

          {/* === NAYE FILTERS AUR SORTING UI START === */}
          <Col xs={24} md={14}>
            <Text>Filter by Sale Price</Text>
            <Row align="middle" gutter={8} style={{ marginTop: '8px' }}>
              <Col xs={12} sm={11}>
                <InputNumber
                  placeholder="Minimum Price"
                  value={priceRange[0]}
                  onChange={(value) => setPriceRange([value, priceRange[1]])}
                  min={0}
                  prefix={profile?.currency ? `${profile.currency} ` : ''}
                  style={{ width: '100%' }}
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(value) => value.replace(/,/g, '')}
                />
              </Col>
              <Col xs={12} sm={11}>
                <InputNumber
                  placeholder="Maximum Price"
                  value={priceRange[1]}
                  onChange={(value) => setPriceRange([priceRange[0], value])}
                  min={0}
                  prefix={profile?.currency ? `${profile.currency} ` : ''}
                  style={{ width: '100%' }}
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(value) => value.replace(/,/g, '')}
                />
              </Col>
            </Row>
          </Col>
          <Col xs={24} md={10}>
              <Text>Sort By</Text>
              <Select
                  value={sortBy}
                  onChange={(value) => setSortBy(value)}
                  style={{ width: '100%', marginTop: '8px' }}
              >
                  <Option value="name_asc">Name (A-Z)</Option>
                  <Option value="price_asc">Price: Low to High</Option>
                  <Option value="price_desc">Price: High to Low</Option>
                  <Option value="quantity_desc">Stock: High to Low</Option>
                  <Option value="quantity_asc">Stock: Low to High</Option>
              </Select>
          </Col>
          {/* === NAYE FILTERS AUR SORTING UI END === */}
          
          {/* Advanced Filters Section (wahi rahega, sirf value update hogi) */}
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
                value={filterAttributes[filter.attribute_name]}
              >
                {(filter.options || []).map(option => (
                  <Option key={option} value={option}>{option}</Option>
                ))}
              </Select>
            </Col>
          ))}
        </Row>
      </Card>

      <ProductList products={products} loading={loading} />

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