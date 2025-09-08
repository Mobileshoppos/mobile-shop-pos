// src/components/Header.jsx (Poora naya code)

import React from 'react';
import { Layout, Typography, Switch, Space } from 'antd';
import { SunOutlined, MoonOutlined } from '@ant-design/icons';

const { Header } = Layout;
const { Title } = Typography;

const AppHeader = ({ isDarkMode, toggleTheme }) => {
  return (
    <Header
      style={{
        // Hum ne header ko content area se alag kar diya hai
        padding: '0 24px',
        background: 'none', // Header ka apna background nahi hoga
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          height: '100%',
          // Header ab content area ke card ke andar hoga
        }}
      >
        <Title
          level={3}
          style={{
            color: isDarkMode ? 'white' : 'black',
            margin: 0,
          }}
        >
          Product Inventory
        </Title>

        <Space>
          <Switch
            checkedChildren={<MoonOutlined />}
            unCheckedChildren={<SunOutlined />}
            checked={isDarkMode}
            onChange={toggleTheme}
          />
        </Space>
      </div>
    </Header>
  );
};

export default AppHeader;