// src/pages/SettingsPage.jsx - MUKAMMAL UPDATED CODE

import React from 'react';
import { Card, Typography, Slider, Row, Col, InputNumber, ColorPicker, Divider, Button, Popconfirm, Tabs } from 'antd';
import { useTheme } from '../context/ThemeContext';
import { 
    themeConfig as initialThemeConfig, 
    lightThemeTokens as initialLightTheme, 
    darkThemeTokens as initialDarkTheme 
} from '../theme/themeConfig';

const { Title, Text } = Typography;

const SettingsPage = () => {
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
  
  // NAYA FUNCTION
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
      // ... General tab ka content waisa hi rahega
    },
    {
      key: '2',
      label: 'Colors',
      // ... Colors tab ka content waisa hi rahega
    },
    {
      key: '3',
      label: 'Layout',
      children: ( // LAYOUT TAB KA UPDATED CONTENT
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

  // NOTE: Aasani se parhne ke liye, maine upar tabItems ke andar ka code chota kar diya hai.
  // Neeche poora component dobara de raha hoon.

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