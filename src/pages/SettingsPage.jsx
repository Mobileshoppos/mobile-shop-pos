import React from 'react';
import { useSearchParams } from 'react-router-dom'; 
import { useState, useEffect } from 'react';
import { Card, Typography, Slider, Row, Col, InputNumber, ColorPicker, Divider, Button, Popconfirm, Tabs, Select, App, Radio, Switch, Input, theme } from 'antd';
import { ToolOutlined } from '@ant-design/icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { 
    themeConfig as initialThemeConfig, 
    lightThemeTokens as initialLightTheme, 
    darkThemeTokens as initialDarkTheme 
} from '../theme/themeConfig';

const { Title, Text } = Typography;
const { TextArea } = Input;

// Default Policy agar user ne kuch set na kiya ho
const DEFAULT_POLICY = "No return or exchange after 7 days.\nWarranty claim directly from service center.\nNo warranty for burnt/damaged items.";

const SettingsPage = () => {
  const { token } = theme.useToken(); // Control Center Connection
  const [searchParams, setSearchParams] = useSearchParams(); 
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { message } = App.useApp();
  const { profile, updateProfile } = useAuth();

  // Naya: Active Tab ki state
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || '1');

  // Naya: Jab URL badle to tab bhi badal jaye
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl) setActiveTab(tabFromUrl);
  }, [searchParams]);
  
  const [selectedCurrency, setSelectedCurrency] = useState('PKR');
  const [themeMode, setThemeMode] = useState('light');
  const [isSaving, setIsSaving] = useState(false);
  const [receiptFormat, setReceiptFormat] = useState('pdf');
  const [lowStockAlerts, setLowStockAlerts] = useState(true);
  const [lowStockThreshold, setLowStockThreshold] = useState(5);
  
  // Nayi State for Warranty Policy
  const [warrantyPolicy, setWarrantyPolicy] = useState(DEFAULT_POLICY);
  const [qrCodeEnabled, setQrCodeEnabled] = useState(true);
  const [warrantySystemEnabled, setWarrantySystemEnabled] = useState(true);
  const [posDiscountEnabled, setPosDiscountEnabled] = useState(true);
  const [mobileNavEnabled, setMobileNavEnabled] = useState(true);
  const [desktopNavEnabled, setDesktopNavEnabled] = useState(true);
  const [mobileNavItems, setMobileNavItems] = useState(["/", "/pos", "/inventory", "/sales-history"]);
  const [desktopNavItems, setDesktopNavItems] = useState(['/pos', '/inventory', '/warranty', '/customers', '/expenses']);
  const [desktopNavPosition, setDesktopNavPosition] = useState('bottom');

  const navOptions = [
    { label: 'Home', value: '/' },
    { label: 'POS', value: '/pos' },
    { label: 'Stock (Inventory)', value: '/inventory' },
    { label: 'Sales History', value: '/sales-history' },
    { label: 'Reports', value: '/reports' },
    { label: 'Customers', value: '/customers' },
    { label: 'Warranty', value: '/warranty' },
    { label: 'Settings', value: '/settings' },
  ];

  const currencyOptions = [
    { value: 'PKR', label: 'PKR - Pakistani Rupee' },
    { value: 'USD', label: 'USD - US Dollar' },
    { value: 'AED', label: 'AED - UAE Dirham' },
    { value: 'SAR', label: 'SAR - Saudi Riyal' },
    { value: 'EUR', label: 'EUR - Euro' },
    { value: 'GBP', label: 'GBP - British Pound' },
  ];

  useEffect(() => {
    if (profile) {
      if (profile.currency) setSelectedCurrency(profile.currency);
      if (profile.theme_mode) setThemeMode(profile.theme_mode);
      if (profile.receipt_format) setReceiptFormat(profile.receipt_format);
      if (profile.low_stock_alerts_enabled !== null && profile.low_stock_alerts_enabled !== undefined) {
        setLowStockAlerts(profile.low_stock_alerts_enabled);
      }
      if (profile.qr_code_enabled !== undefined) {
          setQrCodeEnabled(profile.qr_code_enabled);
      }
      if (profile.warranty_system_enabled !== undefined) {
          setWarrantySystemEnabled(profile.warranty_system_enabled);
      if (profile.pos_discount_enabled !== undefined) setPosDiscountEnabled(profile.pos_discount_enabled);
      if (profile.mobile_nav_enabled !== undefined) setMobileNavEnabled(profile.mobile_nav_enabled);
      if (profile.desktop_nav_enabled !== undefined) setDesktopNavEnabled(profile.desktop_nav_enabled);
      if (profile.mobile_nav_items) setMobileNavItems(profile.mobile_nav_items);
      if (profile.desktop_nav_items) setDesktopNavItems(profile.desktop_nav_items);
      if (profile.desktop_nav_position) setDesktopNavPosition(profile.desktop_nav_position);
      }
      if (profile.low_stock_threshold) setLowStockThreshold(profile.low_stock_threshold);
      
      // Agar profile mein policy hai to wo set karein, warna default
      if (profile.warranty_policy) {
          setWarrantyPolicy(profile.warranty_policy);
      } else {
          setWarrantyPolicy(DEFAULT_POLICY);
      }
    }
  }, [profile]);

  const handleGeneralSettingsSave = async (event) => {
    event.preventDefault();
    if (!profile) return;

    setIsSaving(true);

    // Prepare the data to update
    const updates = {
      currency: selectedCurrency,
      receipt_format: receiptFormat,
      low_stock_alerts_enabled: lowStockAlerts,
      low_stock_threshold: lowStockThreshold,
      warranty_policy: warrantyPolicy,
      qr_code_enabled: qrCodeEnabled,
      warranty_system_enabled: warrantySystemEnabled,
      pos_discount_enabled: posDiscountEnabled,
      mobile_nav_enabled: mobileNavEnabled,
      desktop_nav_enabled: desktopNavEnabled,
      mobile_nav_items: mobileNavItems,
      desktop_nav_items: desktopNavItems,
      desktop_nav_position: desktopNavPosition,
      theme_mode: themeMode, 
    };

    const result = await updateProfile(updates);

    if (result && result.success) {
      message.success('Settings updated successfully!');
    } else {
      message.error(result?.error?.message || 'Failed to update settings.');
    }

    setIsSaving(false);
  };

  const { themeConfig, lightTheme, darkTheme, isDarkMode, updateTheme } = useTheme();

  const handleFontSizeChange = (newValue) => {
    updateTheme({ token: { fontSize: newValue } });
  };

  const handleColorChange = (newColor) => {
    const colorValue = newColor.toHexString();
    if (isDarkMode) {
      updateTheme({ darkTheme: { colorPrimary: colorValue } });
    } else {
      updateTheme({ lightTheme: { colorPrimary: colorValue } });
    }
  };

  const handleBgContainerColorChange = (newColor) => {
    const colorValue = newColor.toHexString();
    if (isDarkMode) {
      updateTheme({ darkTheme: { colorBgContainer: colorValue } });
    } else {
      updateTheme({ lightTheme: { colorBgContainer: colorValue } });
    }
  };
  
  const handleBorderRadiusChange = (newValue) => {
    updateTheme({ token: { borderRadiusLG: newValue } });
  };

  const handleResetToDefault = () => {
    updateTheme({
      token: initialThemeConfig.token,
      lightTheme: initialLightTheme,
      darkTheme: initialDarkTheme,
    });
  };

  const currentPrimaryColor = isDarkMode ? darkTheme.colorPrimary : lightTheme.colorPrimary;
  const currentBgContainerColor = isDarkMode ? darkTheme.colorBgContainer : lightTheme.colorBgContainer;

  return (
    <div style={{ padding: isMobile ? '12px 4px' : '4px' }}>
      {isMobile && (
        <Title level={2} style={{ margin: 0, marginBottom: '16px', marginLeft: '8px', fontSize: '23px' }}>
          <ToolOutlined style={{ color: token.colorPrimary }} /> App Settings
        </Title>
      )}
      <Text type="secondary">Change the look and feel of your application here.</Text>

      <Card title="Application Configuration" style={{ marginTop: 24 }}>
        <Tabs 
          activeKey={activeTab} 
          onChange={(key) => { setActiveTab(key); setSearchParams({ tab: key }); }}
          type="card"
          items={[
            {
              key: '1',
              label: 'Store Settings',
              children: (
                <div style={{ padding: '16px 0' }}>
                  <Row align="middle" gutter={[16, 16]}>
                    <Col xs={24} sm={6}>
                      <Text strong>Default Currency</Text>
                      <Text type="secondary" style={{ display: 'block' }}>Used for all transactions and reports.</Text>
                    </Col>
                    <Col xs={24} sm={18}>
                      <Select style={{ width: '100%' }} value={selectedCurrency} onChange={(value) => setSelectedCurrency(value)} options={currencyOptions} />
                    </Col>
                  </Row>
                  <Divider />
                  <Row align="middle" gutter={[16, 16]}>
                    <Col xs={24} sm={6}>
                      <Text strong>Default Receipt Format</Text>
                      <Text type="secondary" style={{ display: 'block' }}>Choose between standard PDF or thermal printer receipts.</Text>
                    </Col>
                    <Col xs={24} sm={18}>
                      <Radio.Group onChange={(e) => setReceiptFormat(e.target.value)} value={receiptFormat}>
                        <Radio value={'pdf'}>PDF Document</Radio>
                        <Radio value={'thermal'}>Thermal Receipt</Radio>
                        <Radio value={'none'}>None (Disable Receipt)</Radio>
                      </Radio.Group>
                    </Col>
                  </Row>
                  <Divider />
                  <Row align="middle" gutter={[16, 16]}>
                    <Col xs={24} sm={6}>
                      <Text strong>Show QR Code</Text>
                      <Text type="secondary" style={{ display: 'block' }}>Print invoice QR code on receipts.</Text>
                    </Col>
                    <Col xs={24} sm={18}><Switch checked={qrCodeEnabled} onChange={setQrCodeEnabled} /></Col>
                  </Row>
                  <Divider />
                  <Row align="middle" gutter={[16, 16]}>
                    <Col xs={24} sm={6}>
                      <Text strong>Enable Warranty System</Text>
                      <Text type="secondary" style={{ display: 'block' }}>Turn off to hide all warranty related features.</Text>
                    </Col>
                    <Col xs={24} sm={18}><Switch checked={warrantySystemEnabled} onChange={setWarrantySystemEnabled} /></Col>
                  </Row>
                  <Divider />
                  <Row align="middle" gutter={[16, 16]}>
  <Col xs={24} sm={6}>
    <Text strong>Enable POS Discount</Text>
    <Text type="secondary" style={{ display: 'block' }}>Show or hide the discount field on the POS screen.</Text>
  </Col>
  <Col xs={24} sm={18}><Switch checked={posDiscountEnabled} onChange={setPosDiscountEnabled} /></Col>
</Row>
<Divider />
                  <Row align="top" gutter={[16, 16]}>
                    <Col xs={24} sm={6}>
                      <Text strong>Receipt Footer / Warranty Policy</Text>
                      <Text type="secondary" style={{ display: 'block' }}>This text will appear at the bottom of your receipts.</Text>
                    </Col>
                    <Col xs={24} sm={18}>
                      <TextArea rows={4} value={warrantyPolicy} onChange={(e) => setWarrantyPolicy(e.target.value)} placeholder="Enter your warranty terms here..." />
                    </Col>
                  </Row>
                </div>
              ),
            },
            {
              key: '2',
              label: 'Inventory',
              children: (
                <div style={{ padding: '16px 0' }}>
                  <Row align="middle" gutter={[16, 16]}>
                    <Col xs={24} sm={6}>
                      <Text strong>Low Stock Alerts</Text>
                      <Text type="secondary" style={{ display: 'block' }}>Get notified for low quantity items.</Text>
                    </Col>
                    <Col xs={24} sm={18}><Switch checked={lowStockAlerts} onChange={setLowStockAlerts} /></Col>
                  </Row>
                  <Row align="middle" gutter={[16, 16]} style={{ marginTop: '16px' }}>
                    <Col xs={24} sm={6}>
                      <Text strong>Alert Threshold</Text>
                      <Text type="secondary" style={{ display: 'block' }}>Quantity at which to trigger alert.</Text>
                    </Col>
                    <Col xs={16} sm={12}>
                      <Slider min={1} max={50} step={1} onChange={setLowStockThreshold} value={lowStockThreshold} disabled={!lowStockAlerts} />
                    </Col>
                    <Col xs={8} sm={6}>
                      <InputNumber min={1} max={50} style={{ width: '100%' }} value={lowStockThreshold} onChange={setLowStockThreshold} disabled={!lowStockAlerts} />
                    </Col>
                  </Row>
                </div>
              ),
            },
            {
              key: '3',
              label: 'Appearance',
              children: (
                <div style={{ padding: '16px 0' }}>
                  <Row align="middle" gutter={[16, 16]}>
                    <Col xs={24} sm={6}>
                      <Text strong>App Theme</Text>
                      <Text type="secondary" style={{ display: 'block' }}>Choose your preferred look.</Text>
                    </Col>
                    <Col xs={24} sm={18}>
                      <Radio.Group 
                        value={themeMode} 
                        onChange={(e) => setThemeMode(e.target.value)} 
                        buttonStyle="solid"
                      >
                        <Radio.Button value="light">Light</Radio.Button>
                        <Radio.Button value="dark">Dark</Radio.Button>
                        <Radio.Button value="system">System Default</Radio.Button>
                      </Radio.Group>
                    </Col>
                  </Row>
                  <Divider />
                  <Row align="middle" gutter={[16, 16]}>
                    <Col xs={24} sm={6}><Text strong>Global Font Size</Text></Col>
                    <Col xs={16} sm={12}><Slider min={12} max={20} step={1} onChange={handleFontSizeChange} value={themeConfig.token.fontSize} /></Col>
                    <Col xs={8} sm={6}><InputNumber min={12} max={20} style={{ width: '100%' }} value={themeConfig.token.fontSize} onChange={handleFontSizeChange} /></Col>
                  </Row>
                  <Divider />
                  <Row align="middle" gutter={[16, 16]}>
                    <Col xs={24} sm={6}>
                      <Text strong style={{ color: token.colorPrimary }}>Primary Color</Text>
                      <Text type="secondary" style={{ display: 'block' }}>Mode: {isDarkMode ? 'Dark' : 'Light'}</Text>
                    </Col>
                    <Col xs={24} sm={18}><ColorPicker showText value={currentPrimaryColor} onChangeComplete={handleColorChange} /></Col>
                  </Row>
                  <Divider />
                  <Row align="middle" gutter={[16, 16]}>
                    <Col xs={24} sm={6}>
                      <Text strong style={{ color: token.colorText }}>Container Background</Text>
                      <Text type="secondary" style={{ display: 'block' }}>Affects cards, tables, etc.</Text>
                    </Col>
                    <Col xs={24} sm={18}><ColorPicker showText value={currentBgContainerColor} onChangeComplete={handleBgContainerColorChange} /></Col>
                  </Row>
                  <Divider />
                  <Row align="middle" gutter={[16, 16]}>
                    <Col xs={24} sm={6}>
                      <Text strong style={{ color: token.colorText }}>Container Border Radius</Text>
                      <Text type="secondary" style={{ display: 'block' }}>Affects cards, inputs, etc.</Text>
                    </Col>
                    <Col xs={16} sm={12}><Slider min={0} max={24} step={1} onChange={handleBorderRadiusChange} value={themeConfig.token.borderRadiusLG} /></Col>
                    <Col xs={8} sm={6}><InputNumber min={0} max={24} style={{ width: '100%' }} value={themeConfig.token.borderRadiusLG} onChange={handleBorderRadiusChange} /></Col>
                  </Row>
                  <Divider />
                  <Row justify="end">
                    <Col>
                      <Popconfirm 
                        title="Reset Appearance" 
                        description="Reset all colors and fonts to default?" 
                        onConfirm={handleResetToDefault} 
                        okText="Yes, Reset" 
                        cancelText="No"
                      >
                        <Button danger type="dashed">Reset Appearance to Default</Button>
                      </Popconfirm>
                    </Col>
                  </Row>
                </div>
              ),
            },
            {
              key: '4',
              label: 'Navigation',
              children: (
                <div style={{ padding: '16px 0' }}>
                  <Title level={4} style={{ fontSize: '16px' }}>Mobile Navigation (Bottom Bar)</Title>
                  <Row align="middle" gutter={[16, 16]}>
                    <Col xs={24} sm={6}><Text strong>Enable or Disable Bottom Bar</Text></Col>
                    <Col xs={24} sm={18}><Switch checked={mobileNavEnabled} onChange={setMobileNavEnabled} /></Col>
                  </Row>
                  {mobileNavEnabled && (
                    <Row align="middle" gutter={[16, 16]} style={{ marginTop: '16px' }}>
                      <Col xs={24} sm={6}><Text strong>Mobile Shortcuts (Max 4)</Text></Col>
                      <Col xs={24} sm={18}>
                        <Select mode="multiple" style={{ width: '100%' }} value={mobileNavItems} 
                          onChange={(vals) => vals.length <= 4 ? setMobileNavItems(vals) : message.warning('Max 4 for Mobile')}
                          options={navOptions} 
                        />
                      </Col>
                    </Row>
                  )}

                  <Divider />

                  <Title level={4} style={{ fontSize: '16px' }}>Desktop Navigation (Floating Bar)</Title>
                  <Row align="middle" gutter={[16, 16]} style={{ marginTop: '16px' }}>
                    <Col xs={24} sm={6}><Text strong>Enable or Disable Floating Bar</Text></Col>
                    <Col xs={24} sm={18}><Switch checked={desktopNavEnabled} onChange={setDesktopNavEnabled} /></Col>
                  </Row>
                  {desktopNavEnabled && (
                    <>
                      <Row align="middle" gutter={[16, 16]} style={{ marginTop: '16px' }}>
                        <Col xs={24} sm={6}>
                          <Text strong>Desktop Shortcuts (Max 10)</Text>
                          <Text type="secondary" style={{ display: 'block' }}>Choose icons for your floating bar.</Text>
                        </Col>
                        <Col xs={24} sm={18}>
                          <Select 
                            mode="multiple" 
                            style={{ width: '100%' }} 
                            placeholder="Select up to 10 shortcuts" 
                            value={desktopNavItems} 
                            onChange={(values) => values.length <= 10 ? setDesktopNavItems(values) : message.warning('You can only select up to 10 shortcuts for desktop')}
                            options={navOptions} 
                          />
                        </Col>
                      </Row>
                      <Row align="middle" gutter={[16, 16]} style={{ marginTop: '16px' }}>
                        <Col xs={24} sm={6}>
                          <Text strong>Bar Position</Text>
                          <Text type="secondary" style={{ display: 'block' }}>Where should the floating bar appear?</Text>
                        </Col>
                        <Col xs={24} sm={18}>
                          <Radio.Group 
                            value={desktopNavPosition} 
                            onChange={(e) => setDesktopNavPosition(e.target.value)}
                            buttonStyle="solid"
                          >
                            <Radio.Button value="bottom">Bottom Center</Radio.Button>
                            <Radio.Button value="right">Right Side</Radio.Button>
                          </Radio.Group>
                        </Col>
                      </Row>
                    </>
                  )}
                </div>
              ),
            },
          ]} 
        />
        
        <Divider />
        
        <Row>
          <Col span={24}>
            <Button 
              type="primary" 
              size="large"
              block={isMobile}
              onClick={(e) => handleGeneralSettingsSave(e)} 
              loading={isSaving}
              disabled={!profile || (
                selectedCurrency === profile.currency && 
                receiptFormat === profile.receipt_format &&
                lowStockAlerts === profile.low_stock_alerts_enabled &&
                lowStockThreshold === profile.low_stock_threshold &&
                warrantyPolicy === profile.warranty_policy && 
                qrCodeEnabled === profile.qr_code_enabled &&
                warrantySystemEnabled === profile.warranty_system_enabled &&
                posDiscountEnabled === profile.pos_discount_enabled &&
                mobileNavEnabled === profile.mobile_nav_enabled &&
                desktopNavEnabled === profile.desktop_nav_enabled && 
                JSON.stringify(mobileNavItems) === JSON.stringify(profile.mobile_nav_items) &&
                JSON.stringify(desktopNavItems) === JSON.stringify(profile.desktop_nav_items) &&
                desktopNavPosition === (profile.desktop_nav_position || 'bottom') &&
                themeMode === (profile.theme_mode || 'light')
              )}
            >
              Save All Settings
            </Button>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default SettingsPage;