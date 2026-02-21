import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { useAuth } from './AuthContext';
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
  const [themeConfig, setThemeConfig] = useState(initialThemeConfig);
  const { profile } = useAuth();
  const [lightTheme, setLightTheme] = useState(initialLightTheme);
  const [darkTheme, setDarkTheme] = useState(initialDarkTheme);
  
  const [isDarkMode, setIsDarkMode] = useState(false); // Default Light

  useEffect(() => {
    const syncTheme = () => {
      const mode = profile?.theme_mode || 'light'; // Default to light if not set
      
      if (mode === 'system') {
        setIsDarkMode(window.matchMedia('(pre-color-scheme: dark)').matches);
      } else {
        setIsDarkMode(mode === 'dark');
      }
    };

    syncTheme();

    // Agar system setting change ho to auto-update kare
    if (profile?.theme_mode === 'system') {
      const mediaQuery = window.matchMedia('(pre-color-scheme: dark)');
      const handler = (e) => setIsDarkMode(e.matches);
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
  }, [profile?.theme_mode]);

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