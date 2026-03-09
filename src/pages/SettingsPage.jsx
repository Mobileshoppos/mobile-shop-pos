import React from 'react';
import { useSearchParams } from 'react-router-dom'; 
import { useState, useEffect } from 'react';
// Sirf 'Alert' ka izafa kiya hai
import { Card, Typography, Slider, Row, Col, InputNumber, ColorPicker, Divider, Button, Popconfirm, Tabs, Select, App, Radio, Switch, Input, Tooltip, theme, Alert, Space } from 'antd';
import { ToolOutlined, LockOutlined, CopyOutlined } from '@ant-design/icons';
import bcrypt from 'bcryptjs';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { getPlanLimits } from '../config/subscriptionPlans';
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
  const limits = getPlanLimits(profile?.subscription_tier);
  const isAdvancedLocked = !limits.allow_advanced_settings;
  const isWarrantyLocked = !limits.allow_warranty_system;
  const isThresholdLocked = !limits.allow_custom_threshold;
  const isPriceChangeLocked = !limits.allow_price_change_control; // <-- NAYA LINK

  // Naya: Active Tab ki state
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || '1');
  
  // Master PIN States
  const [newMasterPin, setNewMasterPin] = useState('');
  const [confirmMasterPin, setConfirmMasterPin] = useState('');
  const [terminalToken, setTerminalToken] = useState(''); // Naya Token Store karne ke liye

  // Naya: Jab URL badle to tab bhi badal jaye
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl) setActiveTab(tabFromUrl);
  }, [searchParams]);
  
  const [selectedCurrency, setSelectedCurrency] = useState('PKR');
  const [themeMode, setThemeMode] = useState('light');
  const [isSaving, setIsSaving] = useState(false);
  const [receiptFormat, setReceiptFormat] = useState('pdf');
  // --- NAYA IZAFA: Tax States ---
  const[taxEnabled, setTaxEnabled] = useState(false);
  const [taxName, setTaxName] = useState('GST');
  const [taxRate, setTaxRate] = useState(0);
  // ------------------------------
  const [lowStockAlerts, setLowStockAlerts] = useState(true);
  const [lowStockThreshold, setLowStockThreshold] = useState(5);
  
  // Nayi State for Warranty Policy
  const [warrantyPolicy, setWarrantyPolicy] = useState(DEFAULT_POLICY);
  const [qrCodeEnabled, setQrCodeEnabled] = useState(true);
  const [warrantySystemEnabled, setWarrantySystemEnabled] = useState(true);
  const[posDiscountEnabled, setPosDiscountEnabled] = useState(true);
  const [allowCartPriceChange, setAllowCartPriceChange] = useState(true);
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
      // --- NAYA IZAFA: Load Tax Settings ---
      if (profile.tax_enabled !== undefined) setTaxEnabled(profile.tax_enabled);
      if (profile.tax_name !== undefined) setTaxName(profile.tax_name);
      if (profile.tax_rate !== undefined) setTaxRate(profile.tax_rate);
      // -------------------------------------
      if (profile.low_stock_alerts_enabled !== null && profile.low_stock_alerts_enabled !== undefined) {
        setLowStockAlerts(profile.low_stock_alerts_enabled);
      }
      if (profile.qr_code_enabled !== undefined) {
          setQrCodeEnabled(profile.qr_code_enabled);
      }
      if (profile.warranty_system_enabled !== undefined) {
          setWarrantySystemEnabled(profile.warranty_system_enabled);
      if (profile.pos_discount_enabled !== undefined) setPosDiscountEnabled(profile.pos_discount_enabled);
      if (profile.allow_cart_price_change !== undefined) setAllowCartPriceChange(profile.allow_cart_price_change);
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
      // --- NAYA IZAFA: Save Tax Settings ---
      tax_enabled: taxEnabled,
      tax_name: taxName,
      tax_rate: taxRate,
      // -------------------------------------
      low_stock_alerts_enabled: lowStockAlerts,
      low_stock_threshold: lowStockThreshold,
      warranty_policy: warrantyPolicy,
      qr_code_enabled: qrCodeEnabled,
      warranty_system_enabled: warrantySystemEnabled,
      pos_discount_enabled: posDiscountEnabled,
      allow_cart_price_change: allowCartPriceChange,
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

  // --- NAYA FUNCTION: Master PIN Change (Cloud Sync) ---
  const handleMasterPinChange = async () => {
    if (!newMasterPin || newMasterPin.length !== 6) {
      message.error('Master PIN must be exactly 6 digits');
      return;
    }
    if (newMasterPin !== confirmMasterPin) {
      message.error('PINs do not match');
      return;
    }

    setIsSaving(true); // Loading shuru

    try {
      // 1. PIN ko Hash karein (Security)
      const hashedPin = bcrypt.hashSync(newMasterPin, 10);

      // 2. Cloud (Supabase) par save karein
      const result = await updateProfile({ master_pin: hashedPin });

      if (result.success) {
        // 3. Agar Cloud par save ho gaya, to Local bhi update karein
        localStorage.setItem('device_master_pin', hashedPin);
        
        message.success('Master PIN synced to Cloud & updated locally!');
        setNewMasterPin('');
        setConfirmMasterPin('');
      } else {
        // Agar internet ka masla ho
        message.error('Failed to save Master PIN to cloud. Please check internet connection.');
      }
    } catch (error) {
      console.error("PIN Update Error:", error);
      message.error("An unexpected error occurred.");
    } finally {
      setIsSaving(false); // Loading khatam
    }
  };

  // --- NAYA FUNCTION: Terminal Token Generate karne ke liye ---
  const handleGenerateToken = async () => {
    try {
      setIsSaving(true);
      // 1. Owner ka data nikalain (Supabase SDK se - Project ID independent)
      const { data: { user } } = await supabase.auth.getUser();
      const email = user?.email;
      
      if (!email) {
        message.error("Session error. Please logout and login again.");
        return;
      }

      // 2. Token ka format: "email|generated_at" (Password hum login se nahi nikal sakte, is liye hum sirf Email aur aik Secret Key use karenge)
      // Note: Supabase security ki wajah se hum password nahi nikal sakte, is liye hum "Magic Link" ya "One-Time Access" ka logic use karenge.
      // Lekin asaan hal ke liye hum Email ko encrypt karenge taake Manager ko Email na likhna pare.
      
      const rawData = `TERMINAL_ACCESS|${email}|${new Date().getTime()}`;
      const encryptedToken = await btoa(rawData); // Hum ise Base64 kar rahe hain taake copy-paste asaan ho
      
      setTerminalToken(encryptedToken);
      message.success("Terminal Token generated successfully!");
    } catch (error) {
      message.error("Failed to generate token.");
    } finally {
      setIsSaving(false);
    }
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
                    <Col xs={24} sm={18}><Switch checked={qrCodeEnabled} onChange={setQrCodeEnabled} disabled={isAdvancedLocked} /></Col>
                  </Row>
                  <Divider />
                  <Row align="middle" gutter={[16, 16]}>
                    <Col xs={24} sm={6}>
                      <Text strong>Enable Warranty System</Text>
                      <Text type="secondary" style={{ display: 'block' }}>Turn off to hide all warranty related features.</Text>
                    </Col>
                    <Col xs={24} sm={18}><Switch checked={warrantySystemEnabled} onChange={setWarrantySystemEnabled} disabled={isWarrantyLocked} /></Col>
                  </Row>
                  <Divider />
                  <Row align="middle" gutter={[16, 16]}>
                    <Col xs={24} sm={6}>
                      <Text strong>Enable POS Discount</Text>
                      <Text type="secondary" style={{ display: 'block' }}>Show or hide the discount field on the POS screen.</Text>
                     </Col>
                  <Col xs={24} sm={18}><Switch checked={posDiscountEnabled} onChange={setPosDiscountEnabled} disabled={isAdvancedLocked} /></Col>
                  </Row>
                  <Divider />
                  {/* --- NAYA IZAFA: Tax Configuration UI --- */}
                  <Row align="middle" gutter={[16, 16]}>
                    <Col xs={24} sm={6}>
                      <Text strong>Enable Tax (GST/VAT)</Text>
                      <Text type="secondary" style={{ display: 'block' }}>Apply tax on your sales automatically.</Text>
                    </Col>
                    <Col xs={24} sm={18}>
                      <Space>
                        <Switch checked={taxEnabled} onChange={setTaxEnabled} />
                        {taxEnabled && (
                          <>
                            <Input 
                              placeholder="Tax Name (e.g. GST)" 
                              value={taxName} 
                              onChange={(e) => setTaxName(e.target.value)} 
                              style={{ width: 120 }} 
                            />
                            <InputNumber 
                              placeholder="Rate %" 
                              value={taxRate} 
                              onChange={setTaxRate} 
                              min={0} 
                              max={100} 
                              formatter={value => `${value}%`}
                              parser={value => value.replace('%', '')}
                            />
                          </>
                        )}
                      </Space>
                    </Col>
                  </Row>
                  <Divider />
                  <Row align="middle" gutter={[16, 16]}>
                    <Col xs={24} sm={6}>
                      <Text strong>Allow Price Change in Cart</Text>
                      <Text type="secondary" style={{ display: 'block' }}>Allow staff to manually change item prices in the POS cart.</Text>
                    </Col>
                  <Col xs={24} sm={18}>
                   <Switch 
                     checked={allowCartPriceChange} 
                     onChange={setAllowCartPriceChange} 
                     disabled={isPriceChangeLocked} // <-- Hamesha False rahega (yani Active)
                  />
                    </Col>
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
                    <Col xs={24} sm={18}>
                      {(() => {
                         return (
                           <Tooltip title={isThresholdLocked ? "Custom threshold is available in Growth Plan." : ""}>
                             <InputNumber 
                               min={1} 
                               max={50} 
                               style={{ width: '100%' }} 
                               value={lowStockThreshold} 
                               onChange={setLowStockThreshold} 
                               disabled={!lowStockAlerts || isThresholdLocked} 
                             />
                           </Tooltip>
                         );
                      })()}
                      {isThresholdLocked && <Text type="warning" style={{fontSize: '11px'}}>Default: 5 (Upgrade to change)</Text>}
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
                    <Col xs={24} sm={18}><InputNumber min={12} max={20} style={{ width: '100%' }} value={themeConfig.token.fontSize} onChange={handleFontSizeChange} /></Col>
                  </Row>
                  <Divider />
                  <Row align="middle" gutter={[16, 16]}>
                    <Col xs={24} sm={6}>
                      <Text strong style={{ color: token.colorText }}>Container Border Radius</Text>
                      <Text type="secondary" style={{ display: 'block' }}>Affects cards, inputs, etc.</Text>
                    </Col>
                    <Col xs={24} sm={18}><InputNumber min={0} max={24} style={{ width: '100%' }} value={themeConfig.token.borderRadiusLG} onChange={handleBorderRadiusChange} /></Col>
                  </Row>
                  </div>
              ),
            },
            {
              key: '5',
              label: 'Security',
              icon: <LockOutlined />,
              children: (
                <div style={{ padding: '16px 0' }}>
                  <Title level={4} style={{ fontSize: '16px' }}>Master PIN Configuration</Title>
                  <Text type="secondary" style={{ display: 'block', marginBottom: '16px' }}>
                    This PIN is used to unlock the terminal and override staff restrictions.
                  </Text>
                  
                  <Row gutter={[16, 16]} align="bottom">
                    <Col xs={24} sm={8}>
                      <Text strong>New Master PIN</Text>
                      <Input.Password 
                        placeholder="Enter 6-digit PIN" 
                        maxLength={6}
                        value={newMasterPin}
                        onChange={(e) => setNewMasterPin(e.target.value.replace(/[^0-9]/g, ''))}
                        style={{ marginTop: '8px' }}
                      />
                    </Col>
                    <Col xs={24} sm={8}>
                      <Text strong>Confirm New PIN</Text>
                      <Input.Password 
                        placeholder="Repeat PIN" 
                        maxLength={6}
                        value={confirmMasterPin}
                        onChange={(e) => setConfirmMasterPin(e.target.value.replace(/[^0-9]/g, ''))}
                        style={{ marginTop: '8px' }}
                      />
                    </Col>
                    <Col xs={24} sm={8}>
                      <Button type="primary" onClick={handleMasterPinChange} block>
                        Update Master PIN
                      </Button>
                    </Col>
                  </Row>
                  
                  <Divider />
                  
                  <Alert 
                    message="Security Note" 
                    description="This Master PIN is synced to the cloud and protects all your terminals (including remote branches). If forgotten, you must re-authenticate using your Owner Email and Password to reset it."
                    type="info" 
                    showIcon 
                  />

                  <Divider />

                  <Title level={4} style={{ fontSize: '16px', color: token.colorWarning }}>Remote Terminal Access</Title>
                  <Text type="secondary" style={{ display: 'block', marginBottom: '16px' }}>
                    Generate a secure activation token to authorize remote devices or additional branches. 
  This allows your staff to securely log in to this shop without requiring your master email or password.
                  </Text>
                  
                  <Row gutter={[16, 16]} align="middle">
                    <Col xs={24} sm={16}>
                      <Text strong>Generated Token</Text>
                      <Input 
                        readOnly 
                        value={terminalToken}
                        placeholder="Click generate to create a token"
                        style={{ marginTop: '8px' }}
                        suffix={
                          <Tooltip title="Copy Token">
                            <Button 
                              type="text" 
                              size="small" 
                              icon={<CopyOutlined />} 
                              disabled={!terminalToken}
                              onClick={() => {
                                navigator.clipboard.writeText(terminalToken);
                                message.success("Token copied to clipboard!");
                              }}
                            />
                          </Tooltip>
                        }
                      />
                    </Col>
                    <Col xs={24} sm={8}>
                      <Button 
                        type="primary" 
                        onClick={handleGenerateToken} 
                        block
                        style={{ marginTop: '24px' }}
                      >
                        Generate New Token
                      </Button>
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
                taxEnabled === (profile.tax_enabled ?? false) &&
                taxName === (profile.tax_name ?? 'GST') &&
                taxRate === (profile.tax_rate ?? 0) &&
                allowCartPriceChange === (profile.allow_cart_price_change ?? true) &&
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