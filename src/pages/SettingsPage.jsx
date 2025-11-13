
import React from 'react';
import { useState, useEffect } from 'react';
import { Card, Typography, Slider, Row, Col, InputNumber, ColorPicker, Divider, Button, Popconfirm, Tabs, Select, App, Radio, Switch } from 'antd';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { 
    themeConfig as initialThemeConfig, 
    lightThemeTokens as initialLightTheme, 
    darkThemeTokens as initialDarkTheme 
} from '../theme/themeConfig';

const { Title, Text } = Typography;

const SettingsPage = () => {
  const { message } = App.useApp();
  const { profile, updateProfile } = useAuth();
  const [selectedCurrency, setSelectedCurrency] = useState('PKR');
  const [isSaving, setIsSaving] = useState(false);
  const [receiptFormat, setReceiptFormat] = useState('pdf');
  const [lowStockAlerts, setLowStockAlerts] = useState(true);
  const [lowStockThreshold, setLowStockThreshold] = useState(5);

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
      if (profile.currency) {
        setSelectedCurrency(profile.currency);
      }
      if (profile.receipt_format) {
        setReceiptFormat(profile.receipt_format);
      }
      if (profile.low_stock_alerts_enabled !== null && profile.low_stock_alerts_enabled !== undefined) {
        setLowStockAlerts(profile.low_stock_alerts_enabled);
      }
      if (profile.low_stock_threshold) {
        setLowStockThreshold(profile.low_stock_threshold);
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
  };

  const result = await updateProfile(updates);

  if (result && result.success) {
    message.success('Settings updated successfully!');
  } else {
    message.error('Failed to update settings. Please try again.');
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

  const tabItems = [
    {
      key: '1',
      label: 'General',
    },
    {
      key: '2',
      label: 'Colors',
    },
    {
      key: '3',
      label: 'Layout',
      children: ( 
        <>
          <Row align="middle" gutter={[16, 16]}>
            <Col xs={24} sm={6}>
              <Text strong>Container Border Radius</Text>
              <Text type="secondary" style={{ display: 'block' }}>
                Affects cards, inputs, etc.
              </Text>
            </Col>
            <Col xs={16} sm={12}>
              <Slider
                min={0}
                max={24}
                step={1}
                onChange={handleBorderRadiusChange}
                value={themeConfig.token.borderRadiusLG}
              />
            </Col>
            <Col xs={8} sm={6}>
              <InputNumber
                min={0}
                max={24}
                style={{ width: '100%' }}
                value={themeConfig.token.borderRadiusLG}
                onChange={handleBorderRadiusChange}
              />
            </Col>
          </Row>
        </>
      ),
    },
  ];

  return (
    <div>
      <Title level={2}>App Settings</Title>
      <Text type="secondary">Change the look and feel of your application here.</Text>

      <Card title="Theme Customization" style={{ marginTop: 24 }}>
        <Tabs defaultActiveKey="1" items={[
          {
            key: '1',
            label: 'General',
            children: (
              <>
                <Row align="middle" gutter={[16, 16]}>
                  <Col xs={24} sm={6}><Text strong>Global Font Size</Text></Col>
                  <Col xs={16} sm={12}><Slider min={12} max={20} step={1} onChange={handleFontSizeChange} value={themeConfig.token.fontSize} /></Col>
                  <Col xs={8} sm={6}><InputNumber min={12} max={20} style={{ width: '100%' }} value={themeConfig.token.fontSize} onChange={handleFontSizeChange} /></Col>
                </Row>
                <Divider />
<Row align="middle" gutter={[16, 16]}>
    <Col xs={24} sm={6}>
        <Text strong>Default Currency</Text>
        <Text type="secondary" style={{ display: 'block' }}>
            Used for all transactions and reports.
        </Text>
    </Col>
    <Col xs={24} sm={18}>
        <Select
            style={{ width: '100%' }}
            value={selectedCurrency}
            onChange={(value) => setSelectedCurrency(value)}
            options={currencyOptions}
        />
    </Col>
</Row>
<Divider />
            <Row align="middle" gutter={[16, 16]}>
                <Col xs={24} sm={6}>
                    <Text strong>Default Receipt Format</Text>
                    <Text type="secondary" style={{ display: 'block' }}>
                        Choose between standard PDF or thermal printer receipts.
                    </Text>
                </Col>
                <Col xs={24} sm={18}>
                    <Radio.Group 
                        onChange={(e) => setReceiptFormat(e.target.value)} 
                        value={receiptFormat}
                    >
                        <Radio value={'pdf'}>PDF Document</Radio>
                        <Radio value={'thermal'}>Thermal Receipt</Radio>
                    </Radio.Group>
                </Col>
            </Row>
                        <Divider />
            <Row align="middle" gutter={[16, 16]}>
                <Col xs={24} sm={6}>
                    <Text strong>Low Stock Alerts</Text>
                    <Text type="secondary" style={{ display: 'block' }}>
                        Get notified for low quantity items.
                    </Text>
                </Col>
                <Col xs={24} sm={18}>
                    <Switch 
                        checked={lowStockAlerts} 
                        onChange={setLowStockAlerts} 
                    />
                </Col>
            </Row>

            <Row align="middle" gutter={[16, 16]} style={{ marginTop: '16px' }}>
                <Col xs={24} sm={6}>
                    <Text strong>Alert Threshold</Text>
                    <Text type="secondary" style={{ display: 'block' }}>
                        Quantity at which to trigger alert.
                    </Text>
                </Col>
                <Col xs={16} sm={12}>
                    <Slider 
                        min={1} 
                        max={50} 
                        step={1} 
                        onChange={setLowStockThreshold} 
                        value={lowStockThreshold}
                        disabled={!lowStockAlerts}
                    />
                </Col>
                <Col xs={8} sm={6}>
                    <InputNumber 
                        min={1} 
                        max={50} 
                        style={{ width: '100%' }} 
                        value={lowStockThreshold} 
                        onChange={setLowStockThreshold}
                        disabled={!lowStockAlerts}
                    />
                </Col>
            </Row>
            <Divider />
<Row>
    <Col>
        <Button 
            htmlType="button"
            type="primary"
            onClick={(e) => handleGeneralSettingsSave(e)}
            loading={isSaving}
            disabled={!profile || (
                selectedCurrency === profile.currency && 
                receiptFormat === profile.receipt_format &&
                lowStockAlerts === profile.low_stock_alerts_enabled &&
                lowStockThreshold === profile.low_stock_threshold
            )}
        >
            Save General Settings
        </Button>
    </Col>
</Row>
                <Divider />
                <Row align="middle" gutter={[16, 16]}>
                  <Col xs={24} sm={6}>
                    <Text strong>Primary Color</Text>
                    <Text type="secondary" style={{ display: 'block' }}>Mode: {isDarkMode ? 'Dark' : 'Light'}</Text>
                  </Col>
                  <Col xs={24} sm={18}><ColorPicker showText value={currentPrimaryColor} onChangeComplete={handleColorChange} /></Col>
                </Row>
              </>
            ),
          },
          {
            key: '2',
            label: 'Colors',
            children: (
              <>
                <Row align="middle" gutter={[16, 16]}>
                  <Col xs={24} sm={6}>
                    <Text strong>Container Background</Text>
                    <Text type="secondary" style={{ display: 'block' }}>Affects cards, tables, etc.</Text>
                  </Col>
                  <Col xs={24} sm={18}><ColorPicker showText value={currentBgContainerColor} onChangeComplete={handleBgContainerColorChange} /></Col>
                </Row>
              </>
            ),
          },
          {
            key: '3',
            label: 'Layout',
            children: (
              <>
                <Row align="middle" gutter={[16, 16]}>
                  <Col xs={24} sm={6}>
                    <Text strong>Container Border Radius</Text>
                    <Text type="secondary" style={{ display: 'block' }}>Affects cards, inputs, etc.</Text>
                  </Col>
                  <Col xs={16} sm={12}><Slider min={0} max={24} step={1} onChange={handleBorderRadiusChange} value={themeConfig.token.borderRadiusLG} /></Col>
                  <Col xs={8} sm={6}><InputNumber min={0} max={24} style={{ width: '100%' }} value={themeConfig.token.borderRadiusLG} onChange={handleBorderRadiusChange} /></Col>
                </Row>
              </>
            ),
          },
        ]} />
        <Divider />
        <Row>
            <Col>
                <Popconfirm
                    title="Reset Theme"
                    description="Are you sure you want to reset all theme settings to default?"
                    onConfirm={handleResetToDefault}
                    okText="Yes, Reset"
                    cancelText="No"
                >
                    <Button danger>Reset to Default</Button>
                </Popconfirm>
            </Col>
        </Row>
      </Card>
    </div>
  );
};

export default SettingsPage;