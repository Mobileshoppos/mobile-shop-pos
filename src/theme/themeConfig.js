// src/theme/themeConfig.js

export const themeConfig = {
  token: {
    fontFamily: "'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    borderRadiusLG: 8,
    fontSize: 17,
  },
  components: {
    Button: {
      colorPrimary: '#1A73E8',
      colorPrimaryHover: '#1765CC',
      colorPrimaryActive: '#1557B0',
    },
    Select: {
      optionSelectedBg: 'rgba(26, 115, 232, 0.12)',     // Soft Blue highlight
      optionSelectedColor: '#1A73E8',                  // Google Blue text
      optionActiveBg: 'rgba(26, 115, 232, 0.06)',       // Halka hover effect
    },
    TreeSelect: {
      nodeSelectedBg: 'rgba(26, 115, 232, 0.12)',       // Soft Blue highlight
    },
  },
};

export const darkThemeTokens = {
  // --- Brand & Main Colors ---
  colorPrimary: '#1AB6C9',
  colorBgLayout: '#1E1E1E',
  colorBgContainer: '#1E1E1E',
  colorBgElevated: '#282828',
  colorFillAlter: '#282828',
  
  // --- Text & Borders (Google Standard) ---
  colorText: 'rgba(255, 255, 255, 0.87)',
  colorTextSecondary: 'rgba(255, 255, 255, 0.60)',
  colorTextHeading: 'rgba(255, 255, 255, 0.87)',
  colorBorder: '#333333',
  colorBorderSecondary: '#2A2A2A',
  
  // --- Semantic Colors (Dark Mode Optimized) ---
  colorSuccess: '#66bb6a',
  colorError: '#ef5350',
  colorWarning: '#ffa726',
  colorInfo: '#29b6f6',
  
  // --- Links ---
  colorLink: '#7AB2B2',
  colorLinkHover: '#EBF4F6',
  
  // --- Header Controls (Upgraded) ---
  colorHeaderBg: '#1E1E1E',
  colorHeaderText: 'rgba(255, 255, 255, 0.87)',
  colorHeaderIcon: '#1AB6C9',
  colorHeaderBorder: '#333333',
  colorHeaderAvatarBg: '#0288D1',
  colorHeaderBulbGreen: '#66bb6a',
  colorHeaderBulbYellow: '#ffa726',
  colorHeaderBulbRed: '#ef5350',
  colorHeaderBulbInactive: '#333333',
  
  // --- Side Menu Controls ---
  colorSiderBg: '#1E1E1E',
  colorMenuText: 'rgba(255, 255, 255, 0.60)',
  colorMenuSelectedBg: 'rgba(8, 131, 149, 0.15)',
  colorMenuSelectedText: '#7AB2B2',
  colorMenuHoverBg: 'rgba(255, 255, 255, 0.08)',
  
  // --- Naye Custom Controls For Cards ---
  colorCardBg: '#1E1E1E',
  colorTableBg: '#1E1E1E',
  colorTableHeaderBg: '#282828',
  colorCardBorder: '#2A2A2A',
  colorCardShadow: 'rgba(0, 0, 0, 0.5)',
  colorCardHeadingsText: 'rgba(255, 255, 255, 0.87)',
  colorCardColumnsTitleText: 'rgba(255, 255, 255, 0.60)',
  colorCardDetailsText: 'rgba(255, 255, 255, 0.87)',
  colorAmountPositive: '#66bb6a',
  colorAmountNegative: '#ef5350',
  colorCardCategoryTag: '#1AB6C9',        // Category tag (Teal)
  colorCardBrandText: 'rgba(255, 255, 255, 0.60)', // Brand text
  colorCardLocationTag: '#FFA726',       // Location tag (Orange)
};

export const lightThemeTokens = {
  colorPrimary: '#1A73E8',
  colorBgLayout: '#EBF4F6',
  colorBgContainer: '#FFFFFF',
  colorBgElevated: '#EBF4F6',
  colorFillAlter: '#EBF4F6',
  colorTextHeading: '#141414',
  colorBorder: '#BFBFBF',
  colorBorderSecondary: '#E0E0E0',
  colorSplit: '#E0E0E0',
  
  // --- Semantic Colors (Status Tags waghera ke liye) ---
  colorSuccess: '#52c41a',
  colorError: '#ff4d4f',
  colorWarning: '#faad14',
  colorInfo: '#088395',
  
  // --- Text & Links ---
  colorText: '#333333',
  colorTextSecondary: '#8C8C8C',
  colorTextDescription: '#8C8C8C',
  colorLink: '#353535',
  colorLinkHover: '#6B21A8',
  
  // --- Header Controls (Upgraded) ---
  colorHeaderBg: '#EBF4F6',
  colorHeaderText: '#5F6368',
  colorHeaderIcon: '#5F6368',
  colorHeaderBorder: '#BFBFBF',
  colorHeaderAvatarBg: '#0288D1',
  colorHeaderBulbGreen: '#52c41a',
  colorHeaderBulbYellow: '#faad14',
  colorHeaderBulbRed: '#ff4d4f',
  colorHeaderBulbInactive: '#D9D9D9',
  
  // --- Side Menu Controls ---
  colorSiderBg: '#EBF4F6',
  colorMenuText: '#5F6368',
  colorMenuSelectedBg: 'rgba(26, 115, 232, 0.08)',
  colorMenuSelectedText: '#1A73E8',
  colorMenuHoverBg: 'rgba(95, 99, 104, 0.06)',

  // --- Naye Custom Controls For Cards ---
  colorCardBg: '#FFFFFF',
  colorTableBg: '#FFFFFF',
  colorTableHeaderBg: '#FAFAFA',
  colorCardBorder: '#BFBFBF',
  colorCardShadow: 'rgba(0, 0, 0, 0.05)',
  colorCardHeadingsText: '#181818',
  colorCardColumnsTitleText: '#303030',
  colorCardDetailsText: '#333333',
  colorAmountPositive: '#52c41a',
  colorAmountNegative: '#ff4d4f',
  colorCardCategoryTag: '#09637E',
  colorCardBrandText: '#595959',
  colorCardLocationTag: '#D46B08',
};