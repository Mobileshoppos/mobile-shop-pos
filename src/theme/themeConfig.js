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
  
  // --- Header Controls ---
  colorHeaderBg: '#1E1E1E',
  colorHeaderText: 'rgba(255, 255, 255, 0.87)',
  
  // --- Side Menu Controls ---
  colorSiderBg: '#1E1E1E',
  colorMenuText: 'rgba(255, 255, 255, 0.60)',
  colorMenuSelectedBg: 'rgba(8, 131, 149, 0.15)',
  colorMenuSelectedText: '#7AB2B2',
  colorMenuHoverBg: 'rgba(255, 255, 255, 0.08)',
  
  // --- Naye Custom Controls (Dark Mode) ---
  colorCardBg: '#1E1E1E',
  colorTableBg: '#1E1E1E',
  colorTableHeaderBg: '#282828',
};

export const lightThemeTokens = {
  colorPrimary: '#5F6368',
  colorBgLayout: '#EBF4F6',
  colorBgContainer: '#EBF4F6',
  colorFillAlter: '#EBF4F6',
  colorTextHeading: '#5F6368',
  colorBorder: '#7AB2B2',
  
  // --- Semantic Colors (Status Tags waghera ke liye) ---
  colorSuccess: '#52c41a',
  colorError: '#ff4d4f',
  colorWarning: '#faad14',
  colorInfo: '#088395',
  
  // --- Text & Links ---
  colorText: '#333333',
  colorTextSecondary: '#2A4B54', // MAZEED DARK KIYA: Taake dhundla na lage
  colorTextDescription: '#2A4B54', // MAZEED DARK KIYA: Statistic titles ke liye
  colorLink: '#088395',
  colorLinkHover: '#5F6368',
  
  // --- Header Controls ---
  colorHeaderBg: '#EBF4F6',
  colorHeaderText: '#5F6368',
  
  // --- Side Menu Controls ---
  colorSiderBg: '#EBF4F6',
  colorMenuText: '#555555ff',
  colorMenuSelectedBg: '#EBF4F6',
  colorMenuSelectedText: '#09637E',
  colorMenuHoverBg: '#f5f5f5',

  // --- Naye Custom Controls (Light Mode) ---
  colorCardBg: '#FFFFFF',
  colorTableBg: '#FFFFFF',
  colorTableHeaderBg: '#FAFAFA',
};