// src/theme/themeConfig.js

export const themeConfig = {
  token: {
    fontFamily: "'Poppins', 'Montserrat', sans-serif",
    borderRadiusLG: 12,
    // YAHAN POORI APP KA FONT SIZE CONTROL HOGA
    fontSize: 15,
  },
  components: {
    // Note: Layout aur Menu ki settings yahan se hata di gayi hain
    // kyunke ab woh neeche 'lightThemeTokens' se control ho rahi hain.

    Button: {
      colorPrimary: '#09637E', // Deep Teal for primary buttons
      colorPrimaryHover: '#088395', // Medium Teal for hover effects
      colorPrimaryActive: '#09637E',
    },
    Tag: {
      defaultBg: '#EBF4F6', // Ice Blue for normal tags
      defaultColor: '#09637E', // Deep Teal text inside normal tags
    },
    Card: {
      headerBg: '#EBF4F6', // Ice Blue header for cards
    },
    Table: {
      headerBg: '#EBF4F6', // Table ke header ka background (Ice Blue)
      headerColor: '#09637E', // Table ke header ki likhai (Deep Teal)
    }
  },
};

export const darkThemeTokens = {
  colorPrimary: '#1677ff', // AntD standard blue (behtar contrast ke liye)
  colorBgLayout: '#141414',
  colorBgContainer: '#1F1F1F',
};

export const lightThemeTokens = {
  colorPrimary: '#09637E', // SadaPOS Deep Teal (Main brand color)
  colorBgLayout: '#EBF4F6', // SadaPOS Ice Blue (Puri website ka main background)
  colorBgContainer: '#ffffff', // Cards aur boxes ka background safaid hi acha lagta hai
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
  colorSiderBg: '#ffffff',           // Side Menu ka Background
  colorMenuText: '#555555',          // Aam Menu ki likhai (Grey)
  colorMenuSelectedBg: '#EBF4F6',    // Selected Menu ka background (Ice Blue)
  colorMenuSelectedText: '#09637E',  // Selected Menu ki likhai (Deep Teal)
  colorMenuHoverBg: '#f5f5f5',       // Jab mouse upar aaye (Halka Grey)
};