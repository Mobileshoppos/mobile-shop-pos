import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { App } from 'antd';

const KeyboardShortcuts = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { modal } = App.useApp();

  useEffect(() => {
    const handleKeyDown = (event) => {
      // 1. GLOBAL NAVIGATION (Alt + Key)
      if (event.altKey) {
        switch (event.key.toLowerCase()) {
          case 'h': event.preventDefault(); navigate('/'); break;
          case 'p': event.preventDefault(); navigate('/pos'); break;
          case 'i': event.preventDefault(); navigate('/inventory'); break;
          case 'c': event.preventDefault(); navigate('/customers'); break;
          case 's': event.preventDefault(); navigate('/settings'); break;
          default: break;
        }
      }

      // 2. POS PAGE SHORTCUTS (Chromebook Friendly)
      if (location.pathname === '/pos') {
        // Alt + A: Focus Search Bar (Add Item)
        if (event.altKey && event.key.toLowerCase() === 'a') {
          event.preventDefault();
          const searchInput = document.querySelector('.ant-input-affix-wrapper input');
          if (searchInput) searchInput.focus();
        }
        
        // Shift + Enter: Complete Sale (Jaldi bill banane ke liye)
        if (event.shiftKey && event.key === 'Enter') {
          event.preventDefault();
          // Hum us button ko dhoond rahe hain jo "Complete Sale" karta hai
          const completeBtn = document.querySelector('button.ant-btn-primary.ant-btn-lg');
          if (completeBtn && !completeBtn.disabled) completeBtn.click();
        }

        // Alt + R: Reset Cart (Bill saaf karein)
        if (event.altKey && event.key.toLowerCase() === 'r') {
          event.preventDefault();
          // Reset button (Delete icon wala)
          const resetBtn = document.querySelector('button.ant-btn-text.ant-btn-dangerous');
          if (resetBtn) resetBtn.click();
        }
      }

      // 3. INVENTORY PAGE SHORTCUTS
      if (location.pathname === '/inventory') {
        // Alt + N: Add New Product Model (Browser safe)
        if (event.altKey && event.key.toLowerCase() === 'n') {
          event.preventDefault();
          // Hum text ke zariye button dhoond rahe hain taake ghalti se koi aur button na dab jaye
          const buttons = document.querySelectorAll('button');
          for (let btn of buttons) {
            if (btn.textContent === 'Add New Product Model') {
              btn.click();
              break;
            }
          }
        }

        // Alt + A: Focus Search Bar (POS ki tarah consistent rakha hai)
        if (event.altKey && event.key.toLowerCase() === 'a') {
          event.preventDefault();
          // Inventory page par search input ko pakar lein
          const searchInput = document.querySelector('.ant-input-affix-wrapper input');
          if (searchInput) searchInput.focus();
        }

        // Alt + R: Reset Filters (Reload button)
        if (event.altKey && event.key.toLowerCase() === 'r') {
          event.preventDefault();
          // Hum ne Inventory.jsx mein button ko title diya tha "Reset All Filters", us se dhoondenge
          const resetBtn = document.querySelector('button[title="Reset All Filters"]');
          if (resetBtn) resetBtn.click();
        }
      }
    };

    // Listener lagana
    window.addEventListener('keydown', handleKeyDown);
    
    // Component band hone par listener khatam karna
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, location]);

  return null; // Yeh component kuch dikhayega nahi
};

export default KeyboardShortcuts;