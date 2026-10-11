import React, { useState } from 'react'; // useState add kiya hai
import { Layout, Menu, Switch, ConfigProvider } from 'antd'; // ConfigProvider add kiya
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  HomeOutlined, 
  ShoppingCartOutlined, 
  PieChartOutlined, 
  LogoutOutlined, 
  AppstoreOutlined,
  DollarCircleOutlined,
  SettingOutlined,
  TeamOutlined,
  HistoryOutlined,
  CreditCardOutlined,
  TagsOutlined,       
  FileTextOutlined,   
  ShopOutlined,       
  UserSwitchOutlined, 
  FileProtectOutlined,
  SafetyCertificateOutlined,
  ProfileOutlined,    
  ToolOutlined,
  DatabaseOutlined,
  AlertOutlined,
  InfoCircleOutlined,
  MenuUnfoldOutlined,
  MenuFoldOutlined,
  LockOutlined,
  PlusOutlined
} from '@ant-design/icons';
import { theme } from 'antd'; 
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useStaff } from '../context/StaffContext';
import { db } from '../db'; // Naya Izafa

const { Sider } = Layout;

const menuItems = [
    // 1. Main Dashboard
    { key: '/', icon: <HomeOutlined />, label: <Link to="/">Dashboard</Link> },
    
    // 2. Inventory
    { key: '/inventory', icon: <DatabaseOutlined />, label: <Link to="/inventory">Inventory</Link> },

    // 3. POS
    { key: '/pos', icon: <ShoppingCartOutlined />, label: <Link to="/pos">Point of Sale</Link> },

    // 4. Product Management Group (Warranty yahan shamil ho gayi)
    {
      key: 'products',
      icon: <AppstoreOutlined />,
      label: 'Product Mgmt',
      children: [
        { key: '/categories', icon: <TagsOutlined />, label: <Link to="/categories">Product Categories</Link> },
        { key: '/warranty', icon: <SafetyCertificateOutlined />, label: <Link to="/warranty">Warranty & Claims</Link> },
        { key: '/purchases', icon: <FileTextOutlined />, label: <Link to="/purchases">Purchase Orders</Link> },
        { key: '/purchases/new', icon: <PlusOutlined />, label: <Link to="/purchases/new">Add Purchase</Link> },
      ]
    },

    // 3. People & Team Group
    {
      key: 'people',
      icon: <TeamOutlined />,
      label: 'Partners & Team',
      children: [
        { key: '/customers', icon: <UserSwitchOutlined />, label: <Link to="/customers">Customers</Link> },
        { key: '/suppliers', icon: <ShopOutlined />, label: <Link to="/suppliers">Suppliers</Link> },
        { key: '/staff', icon: <TeamOutlined />, label: <Link to="/staff">Staff / Team</Link> }, // <--- YAHAN MOVED
      ]
    },

    // 4. Finance Group
    {
      key: 'finance',
      icon: <DollarCircleOutlined />,
      label: 'Finance',
      children: [
        { key: '/sales-history', icon: <HistoryOutlined />, label: <Link to="/sales-history">Sales History</Link> },
        { key: '/expenses', icon: <DollarCircleOutlined />, label: <Link to="/expenses">Expenses</Link> },
        { key: '/expense-categories', icon: <FileProtectOutlined />, label: <Link to="/expense-categories">Exp. Categories</Link> },
        { key: '/fixed-assets', icon: <DatabaseOutlined />, label: <Link to="/fixed-assets">Fixed Assets</Link> },
        { key: '/damaged-stock', icon: <AlertOutlined />, label: <Link to="/damaged-stock">Damaged Stock</Link> },
      ]
    },

    // 5. Reports
    { key: '/reports', icon: <PieChartOutlined />, label: <Link to="/reports">Reports</Link> },

    { type: 'divider' },

    // 6. Settings Group
    {
      key: 'settings_group',
      icon: <SettingOutlined />,
      label: 'Settings',
      children: [
        { key: '/settings', icon: <ToolOutlined />, label: <Link to="/settings">App Settings</Link> },
        { key: '/profile', icon: <ProfileOutlined />, label: <Link to="/profile">Profile</Link> },
        { key: '/about', icon: <InfoCircleOutlined />, label: <Link to="/about">About</Link> },
        { key: '/subscription', icon: <CreditCardOutlined />, label: <Link to="/subscription">Subscription</Link> },
      ]
    },
];

// Yeh wo keys hain jo Groups hain (Jinhein humein control karna hai)
const rootSubmenuKeys = ['products', 'people', 'finance', 'settings_group'];

const SideMenu = ({ collapsed, setCollapsed, isMobile }) => {
  const { token } = theme.useToken();
  const [productCount, setProductCount] = useState(1);

  React.useEffect(() => {
    const checkProducts = async () => {
      const count = await db.products.count();
      setProductCount(count);
    };
    checkProducts();
    window.addEventListener('local-db-updated', checkProducts);
    return () => window.removeEventListener('local-db-updated', checkProducts);
  }, []);
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { activeStaff, lockApp, can } = useStaff(); // can function shamil kiya 
  
  // State: Kaunsa menu khula hai, shuru mein khali rakha hai (sab band)
  const [openKeys, setOpenKeys] = useState([]);

  // Logic: Ek waqt mein ek hi menu kholne ke liye
  const onOpenChange = (keys) => {
    const latestOpenKey = keys.find((key) => openKeys.indexOf(key) === -1);
    if (latestOpenKey && rootSubmenuKeys.indexOf(latestOpenKey) === -1) {
      setOpenKeys(keys);
    } else {
      setOpenKeys(latestOpenKey ? [latestOpenKey] : []);
    }
  };

  const handleMenuItemClick = () => {
    if (isMobile) {
      setCollapsed(true);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // 1. Pehle menu items ko filter karein (Smart Permission Filter)
  const filteredMenuItems = menuItems
    .filter(item => {
      // Top-level items check
      if (item.key === '/reports' && !can('can_access_detailed_reports')) return false;
      return true;
    })
    .map(item => {
      if (item.children) {
        return {
          ...item,
          children: item.children.filter(child => {
            // Har child button ki permission check karein
            if (child.key === '/categories' && !can('can_manage_categories')) return false;
            if (child.key === '/purchases' && !can('can_manage_purchases')) return false;
            if (child.key === '/customers' && !can('can_manage_people')) return false;
            if (child.key === '/suppliers' && !can('can_manage_suppliers')) return false;
            if (child.key === '/sales-history' && !can('can_view_sales_history')) return false;
            if (child.key === '/expenses' && !can('can_manage_expenses')) return false;
            if (child.key === '/expense-categories' && !can('can_manage_expense_categories')) return false;
            if (child.key === '/fixed-assets' && !can('can_manage_fixed_assets')) return false; // <--- UPDATED
            if (child.key === '/damaged-stock' && !can('can_edit_inventory')) return false;
            if (child.key === '/profile' && !can('can_manage_profile')) return false;

            // Owner-only pages (Staff ke liye bilkul hide)
            if (activeStaff && ['/staff', '/settings', '/subscription'].includes(child.key)) return false;

            return true;
          })
        };
      }
      return item;
    })
    // Agar kisi Group (e.g. Finance) ke saare buttons hide ho jayein, to Group ko bhi hide kardo
    .filter(item => !item.children || item.children.length > 0);
  // Note: Humne Warranty wala check hata diya hai taake wo hamesha nazar aaye
  // aur user jab click kare to usay "Upgrade Plan" ka message mile.

  // 2. Phir filtered items par map chalayein (Mobile menu band karne ke liye)
  const processedMenuItems = filteredMenuItems.map(item => {
    if (item.type === 'divider') return item;
    if (item.children) {
        return {
            ...item,
            children: item.children.map(child => ({ ...child, onClick: handleMenuItemClick }))
        };
    }
    return { ...item, onClick: handleMenuItemClick };
  });

  const menuItemsWithLogout = [
    ...processedMenuItems,
    { type: 'divider' }, 
    
    // Naya Lock Terminal Button (Sirf Growth/Pro ke liye)
    ...(profile?.subscription_tier !== 'free' ? [{ 
      key: 'lock', 
      icon: <LockOutlined />, 
      label: activeStaff ? 'Exit Shift (Lock)' : 'Lock Terminal', 
      onClick: () => {
        lockApp();
        handleMenuItemClick();
      }
    }] : []),

    // Security: Logout button sirf tab dikhao jab koi Staff login NA HO (yani sirf Owner mode mein)
    ...(!activeStaff ? [
      { 
        key: 'logout', 
        icon: <LogoutOutlined />, 
        danger: true, 
        label: 'Logout Account', 
        onClick: () => {
          handleLogout();
          handleMenuItemClick();
        }
      }
    ] : []),

    { 
      key: 'toggle', 
      icon: collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />, 
      label: collapsed ? 'Expand Menu' : 'Collapse', 
      onClick: () => setCollapsed(!collapsed) 
    },
  ];

  const siderStyle = {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    // ThemeConfig ke border color ke saath fading line
    background: `linear-gradient(to bottom, ${token.colorHeaderBorder} 80%, transparent 100%) no-repeat right / 1px 100%, ${token.colorSiderBg}`,
    borderRight: 'none',
    height: '100vh',
    position: 'sticky',
    top: 0,
    left: 0,
    zIndex: 100,
    overflowY: 'auto',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
    ...(isMobile && {
        position: 'fixed',
        zIndex: 1000,
    }),
  };

  return (
    <>
      {/* Naya: Global Glow Animation */}
      <style>
        {`
          @keyframes navGlow {
            0% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.7; transform: scale(1.1); box-shadow: 0 0 20px ${token.colorPrimary}; }
            100% { opacity: 1; transform: scale(1); }
          }
        `}
      </style>
      <Sider 
        className="google-nav-sider"
        collapsedWidth={isMobile ? "0" : "64"}
        theme="light"
        collapsible
        collapsed={collapsed}
        onCollapse={(value) => setCollapsed(value)}
        trigger={null}
        style={siderStyle}
      >
        <div>
            {/* Logo Area */}
            <div style={{ 
                height: '64px', 
                display: 'flex',
                alignItems: 'center',
                padding: collapsed ? '0' : '0 24px', 
                justifyContent: collapsed ? 'center' : 'flex-start',
                cursor: 'pointer',
                background: 'transparent',
                borderBottom: `1px solid ${token.colorHeaderBorder}`, // ThemeConfig border line
                marginBottom: '8px'
            }}>
                {/* Logo Icon */}
                <img 
                  src="/pwa-192x192.png" 
                  alt="SadaPOS Logo" 
                  style={{ width: '30px', height: '30px', objectFit: 'contain', minWidth: '30px' }} 
                />
                
                {/* Logo Text */}
                {!collapsed && (
                    <span style={{ 
                        marginLeft: '12px',
                        fontSize: '20px', 
                        fontWeight: '800', 
                        color: token.colorTextHeading,
                        letterSpacing: '-0.5px'
                    }}>
                        Sada<span style={{ color: token.colorPrimary }}> POS</span>
                    </span>
                )}
            </div>
            
            <ConfigProvider
              theme={{
                components: {
                  Menu: {
                    iconSize: 14,                       // Icons chote karne ke liye (Naya)
                    itemHeight: 32,                     // Menu items ki height kam karne ke liye (Naya)
                    itemBg: 'transparent',              // Background transparent taake Sider ka rang nazar aaye
                    itemColor: token.colorMenuText,     // Text color
                    itemSelectedBg: token.colorMenuSelectedBg,   // Selected Background
                    itemSelectedColor: token.colorMenuSelectedText, // Selected Text
                    itemHoverBg: token.colorMenuHoverBg,         // Hover Background
                    itemHoverColor: token.colorMenuSelectedText, // Hover Text
                  }
                }
              }}
            >
              <Menu 
                mode="inline" 
                selectedKeys={[location.pathname]} 
                
                // YEH DO LINES NAYI HAIN (Jo magic karengi)
                openKeys={openKeys} 
                onOpenChange={onOpenChange}
                onClick={({ key }) => {
                  if (key && key.startsWith('/')) {
                    navigate(key);
                    handleMenuItemClick();
                  }
                }}
                items={menuItemsWithLogout} 
                style={{ 
                  background: 'transparent',
                  borderRight: 0
                }} 
              />
            </ConfigProvider>
        </div>
      </Sider>
    </>
  );
};

export default SideMenu;