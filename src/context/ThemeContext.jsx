import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { 
    themeConfig as initialThemeConfig,
    lightThemeTokens as initialLightTheme,
    darkThemeTokens as initialDarkTheme,
} from '../theme/themeConfig';

const getFromStorage = (key, fallback) => {
    try {
        const item = window.localStorage.getItem(key);
        return item ? JSON.parse(item) : fallback;
    } catch (error) {
        console.error("Error reading from localStorage", error);
        return fallback;
    }
};

const ThemeContext = createContext();

export const CustomThemeProvider = ({ children }) => {
  const [themeConfig, setThemeConfig] = useState(() => getFromStorage('theme_config', initialThemeConfig));
  const [lightTheme, setLightTheme] = useState(() => getFromStorage('theme_light', initialLightTheme));
  const [darkTheme, setDarkTheme] = useState(() => getFromStorage('theme_dark', initialDarkTheme));
  
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('theme_mode');
    if (savedTheme) return savedTheme === 'dark';
    return window.matchMedia && window.matchMedia('(pre-color-scheme: dark)').matches;
  });

  useEffect(() => {
    localStorage.setItem('theme_config', JSON.stringify(themeConfig));
  }, [themeConfig]);

  useEffect(() => {
    localStorage.setItem('theme_light', JSON.stringify(lightTheme));
  }, [lightTheme]);

  useEffect(() => {
    localStorage.setItem('theme_dark', JSON.stringify(darkTheme));
  }, [darkTheme]);

  useEffect(() => {
    localStorage.setItem('theme_mode', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(prevMode => !prevMode);

  const updateTheme = (newConfig) => {
    if (newConfig.token) {
        setThemeConfig(prev => ({ ...prev, token: { ...prev.token, ...newConfig.token } }));
    }
    if (newConfig.components) {
        setThemeConfig(prev => ({ ...prev, components: { ...prev.components, ...newConfig.components } }));
    }
    if (newConfig.lightTheme) {
        setLightTheme(prev => ({ ...prev, ...newConfig.lightTheme }));
    }
    if (newConfig.darkTheme) {
        setDarkTheme(prev => ({ ...prev, ...newConfig.darkTheme }));
    }
  };

  const value = useMemo(() => ({
    themeConfig,
    lightTheme,
    darkTheme,
    isDarkMode,
    toggleTheme,
    updateTheme,
  }), [themeConfig, lightTheme, darkTheme, isDarkMode]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a CustomThemeProvider');
  }
  return context;
};