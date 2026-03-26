// src/theme/themeConfig.js

export const themeConfig = {
  token: {
    // Inter dashboard ke liye behtareen hai, Roboto Google Ads wala touch dega
    fontFamily: "'Inter', 'Roboto', -apple-system, sans-serif",
    borderRadiusLG: 8, // Google Ads mein corners thore kam rounded hote hain (12 se 8 behtar hai)
    fontSize: 14, // Google Ads thora chota aur compact text istemal karta hai
  },
  components: {
    // Note: Layout aur Menu ki settings yahan se hata di gayi hain
    // kyunke ab woh neeche 'lightThemeTokens' se control ho rahi hain.

    Button: {
      colorPrimary: '#09637E', // Deep Teal for primary buttons
      colorPrimaryHover: '#088395', // Medium Teal for hover effects
      colorPrimaryActive: '#09637E',
    },
    // Card aur Table ki hard-coded settings yahan se hata di gayi hain
    // Taake Dark Mode mein yeh khud ko adjust kar sakein
  },
};

export const darkThemeTokens = {
  // --- Brand & Main Colors ---
  colorPrimary: '#1AB6C9', // Bright Cyan-Teal (Dark mode mein behtareen chamakta hai aur wazeh nazar aata hai)
  colorBgLayout: '#121212', // Google Material Background (Very Dark Grey)
  colorBgContainer: '#1E1E1E', // Google Material Surface (Cards ke liye thora halka)
  colorBgElevated: '#282828', // Dropdowns aur Modals ke liye mazeed halka
  colorFillAlter: '#282828', // Table Headers aur Card Headers ke liye thora ubhra hua Dark Grey
  
  // --- Text & Borders (Google Standard) ---
  colorText: 'rgba(255, 255, 255, 0.87)', // High-Emphasis Text (Aam likhai)
  colorTextSecondary: 'rgba(255, 255, 255, 0.60)', // Medium-Emphasis Text (Halki likhai)
  colorTextHeading: 'rgba(255, 255, 255, 0.87)', // Headings
  colorBorder: '#333333', // Dark mode ke hisaab se borders
  colorBorderSecondary: '#2A2A2A',
  
  // --- Semantic Colors (Dark Mode Optimized) ---
  colorSuccess: '#66bb6a', // Google Material Dark Green (PAID)
  colorError: '#ef5350',   // Google Material Dark Red (UNPAID)
  colorWarning: '#ffa726', // Google Material Dark Orange (PARTIAL)
  colorInfo: '#29b6f6',    // Google Material Dark Blue
  
  // --- Links ---
  colorLink: '#7AB2B2',          // Muted Teal (Dark background par acha lagta hai)
  colorLinkHover: '#EBF4F6',     // Hover par Ice Blue
  
  // --- Header Controls ---
  colorHeaderBg: '#1E1E1E',      // Header ka background (Cards jaisa)
  colorHeaderText: 'rgba(255, 255, 255, 0.87)',
  
  // --- Side Menu Controls ---
  colorSiderBg: '#1E1E1E',           // Side Menu ka background (App Container jaisa)
  colorMenuText: 'rgba(255, 255, 255, 0.60)',
  colorMenuSelectedBg: 'rgba(8, 131, 149, 0.15)', // Medium Teal ka halka sa saya (transparent)
  colorMenuSelectedText: '#7AB2B2',  // Selected text ka color
  colorMenuHoverBg: 'rgba(255, 255, 255, 0.08)', // Hover par halka grey
};

export const lightThemeTokens = {
  colorPrimary: '#09637E', // SadaPOS Deep Teal (Main brand color)
  colorBgLayout: '#EBF4F6', // SadaPOS Ice Blue (Puri website ka main background)
  colorBgContainer: '#ffffff', // Cards aur boxes ka background safaid hi acha lagta hai
  colorFillAlter: '#EBF4F6', // Table Headers aur Card Headers ke liye Ice Blue
  colorTextHeading: '#09637E', // Headings ka color Deep Teal
  colorBorder: '#7AB2B2', // Borders ka color Muted Teal
  
  // --- Semantic Colors (Status Tags waghera ke liye) ---
  colorSuccess: '#52c41a', // PAID ya Success ke liye (Green)
  colorError: '#ff4d4f',   // UNPAID, Low Stock ya Error ke liye (Red)
  colorWarning: '#faad14', // PARTIAL, Top Selling ya Warning ke liye (Orange)
  colorInfo: '#088395',    // General info ke liye (Medium Teal)
  
  // --- Text & Links ---
  colorText: '#333333',          // Aam likhai (General text)
  colorTextSecondary: '#7AB2B2', // Halki likhai (Muted Teal)
  colorLink: '#088395',          // Links (jaise View All)
  colorLinkHover: '#09637E',     // Jab link par mouse aaye
  
  // --- Header Controls ---
  colorHeaderBg: '#EBF4F6',      // Header ka Background (Ice Blue)
  colorHeaderText: '#09637E',    // Header ke Text aur Icons (Deep Teal)
  
  // --- Side Menu Controls ---
  colorSiderBg: '#EBF4F6',           // Side Menu ka Background
  colorMenuText: '#555555',          // Aam Menu ki likhai (Grey)
  colorMenuSelectedBg: '#EBF4F6',    // Selected Menu ka background (Ice Blue)
  colorMenuSelectedText: '#09637E',  // Selected Menu ki likhai (Deep Teal)
  colorMenuHoverBg: '#f5f5f5',       // Jab mouse upar aaye (Halka Grey)
};