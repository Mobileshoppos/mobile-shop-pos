// src/theme/themeConfig.js

export const themeConfig = {
  token: {
    fontFamily: "'Jost', -apple-system, sans-serif",
    borderRadiusLG: 8,
    fontSize: 17,
  },
  components: {

    Button: {
      colorPrimary: '#5F6368',
      colorPrimaryHover: '#088395',
      colorPrimaryActive: '#5F6368',
    },
  },
};

export const darkThemeTokens = {
  // --- Brand & Main Colors ---
  colorPrimary: '#1AB6C9',
  colorBgLayout: '#121212',
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
  colorPrimary: '#5F6368',
  colorBgLayout: '#EBF4F6',
  colorBgContainer: '#EBF4F6',
  colorFillAlter: '#EBF4F6',
  colorTextHeading: '#141414',
  colorBorder: '#BFBFBF',
  
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
  colorHeaderText: '#141414',
  colorHeaderIcon: '#5F6368',
  colorHeaderBorder: '#BFBFBF',
  colorHeaderBulbGreen: '#52c41a',
  colorHeaderBulbYellow: '#faad14',
  colorHeaderBulbRed: '#ff4d4f',
  colorHeaderBulbInactive: '#D9D9D9',
  
  // --- Side Menu Controls ---
  colorSiderBg: '#EBF4F6',
  colorMenuText: '#555555ff',
  colorMenuSelectedBg: '#EBF4F6',
  colorMenuSelectedText: '#09637E',
  colorMenuHoverBg: '#f5f5f5',

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