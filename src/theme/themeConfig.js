// src/theme/themeConfig.js

export const themeConfig = {
  token: {
    fontFamily: "'Poppins', 'Montserrat', sans-serif",
    borderRadiusLG: 12,
    // YAHAN POORI APP KA FONT SIZE CONTROL HOGA
    fontSize: 15,
  },
  components: {
    Layout: {
      siderBg: '#1F1F1F',
      triggerBg: '#282828',
      triggerColor: '#FFFFFF',
    },
    Menu: {
      itemSelectedBg: '#3A3A3A',
      itemSelectedColor: '#FFFFFF',
      colorText: 'rgba(255, 255, 255, 0.65)',
      darkItemBg: '#1F1F1F',
      // YAHAN SIRF MENU KA FONT SIZE CONTROL HOGA
      fontSize: 15,
    },
  },
};

export const darkThemeTokens = {
  colorPrimary: '#1677ff', // AntD standard blue (behtar contrast ke liye)
  colorBgLayout: '#141414',
  colorBgContainer: '#1F1F1F',
};

export const lightThemeTokens = {
  colorPrimary: '#1677ff',
  colorBgLayout: '#f5f5f5',
  colorBgContainer: '#ffffff',
};