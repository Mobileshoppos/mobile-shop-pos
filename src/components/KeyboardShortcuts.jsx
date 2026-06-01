import React, { useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { App } from 'antd';
import { useAuth } from '../context/AuthContext';

const DEFAULT_SHORTCUTS = {
  nav_home: 'alt+h',
  nav_inventory: 'alt+i',
  nav_pos: 'alt+p',
  nav_warranty: 'alt+w',
  nav_purchases: 'alt+b',
  nav_customers: 'alt+c',
  nav_suppliers: 'alt+u',
  nav_sales_history: 'alt+y',
  nav_expenses: 'alt+e',
  nav_damaged_stock: 'alt+d',
  nav_reports: 'alt+o',
  nav_staff: 'alt+m',
  nav_settings: 'alt+s',
  pos_search: 'alt+f',
  pos_customer_search: 'alt+c',
  pos_add_customer: 'alt+n',
  pos_discount: 'alt+d',
  pos_pay_cash: 'alt+1',
  pos_pay_bank: 'alt+2',
  pos_pay_later: 'alt+3',
  pos_hold_bill: 'alt+q',
  pos_view_drafts: 'alt+g',
  pos_checkout: 'shift+enter',
  pos_reset: 'alt+v', 
  inv_add: 'alt+n',
  inv_search: 'alt+f',
  inv_reset: 'alt+v',
  cat_add: 'alt+n',
  cat_attr_add: 'alt+a',
  pur_search: 'alt+f',
  pur_add: 'alt+n',
  cust_search: 'alt+f',
  cust_add: 'alt+n',
  sup_search: 'alt+f',
  sup_add: 'alt+n'
};

const KeyboardShortcuts = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { modal, message } = App.useApp();
  const { profile } = useAuth(); 

  const shortcuts = useMemo(() => {
    if (profile?.custom_shortcuts && Object.keys(profile.custom_shortcuts).length > 0) {
      return { ...DEFAULT_SHORTCUTS, ...profile.custom_shortcuts };
    }
    return DEFAULT_SHORTCUTS;
  }, [profile?.custom_shortcuts]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      let keys = [];
      if (event.ctrlKey || event.metaKey) keys.push('ctrl');
      if (event.altKey) keys.push('alt');
      if (event.shiftKey) keys.push('shift');

      if (['Control', 'Alt', 'Shift', 'Meta'].includes(event.key)) return;

      keys.push(event.key.toLowerCase());
      const pressedKey = keys.join('+');

      const triggerElement = (id, action = 'click') => {
        const el = document.getElementById(id);
        if (!el) return;
        
        if (action === 'click') {
          el.click(); 
        } else if (action === 'focus') {
          const input = el.tagName === 'INPUT' ? el : el.querySelector('input') || el.querySelector('textarea') || el;
          if (input) {
            input.focus();
            if (typeof input.select === 'function') {
              setTimeout(() => input.select(), 10);
            }
          }
        }
      };

      // 1. GLOBAL NAVIGATION
      const navMappings = {
        [shortcuts.nav_home]: '/',
        [shortcuts.nav_inventory]: '/inventory',
        [shortcuts.nav_pos]: '/pos',
        [shortcuts.nav_warranty]: '/warranty',
        [shortcuts.nav_purchases]: '/purchases',
        [shortcuts.nav_customers]: '/customers',
        [shortcuts.nav_suppliers]: '/suppliers',
        [shortcuts.nav_sales_history]: '/sales-history',
        [shortcuts.nav_expenses]: '/expenses',
        [shortcuts.nav_damaged_stock]: '/damaged-stock',
        [shortcuts.nav_reports]: '/reports',
        [shortcuts.nav_staff]: '/staff',
        [shortcuts.nav_settings]: '/settings'
      };

      if (navMappings[pressedKey]) {
        event.preventDefault();
        navigate(navMappings[pressedKey]);
        return;
      }

      // 2. POS PAGE SHORTCUTS
      if (location.pathname.startsWith('/pos')) {
        const posActions = {
          [shortcuts.pos_search]: () => triggerElement('pos-search-input', 'focus'),
          [shortcuts.pos_customer_search]: () => triggerElement('pos-customer-select', 'focus'),
          [shortcuts.pos_add_customer]: () => triggerElement('pos-add-customer-btn', 'click'),
          [shortcuts.pos_discount]: () => triggerElement('pos-discount-input', 'focus'),
          [shortcuts.pos_pay_cash]: () => triggerElement('pos-pay-cash-btn', 'click'),
          [shortcuts.pos_pay_bank]: () => triggerElement('pos-pay-bank-btn', 'click'),
          [shortcuts.pos_pay_later]: () => triggerElement('pos-pay-later-btn', 'click'),
          [shortcuts.pos_hold_bill]: () => triggerElement('pos-hold-bill-btn', 'click'),
          [shortcuts.pos_view_drafts]: () => triggerElement('pos-view-drafts-btn', 'click'),
          [shortcuts.pos_checkout]: () => triggerElement('pos-complete-sale-btn', 'click'),
          [shortcuts.pos_reset]: () => triggerElement('pos-reset-bill-btn', 'click')
        };
        if (posActions[pressedKey]) { event.preventDefault(); posActions[pressedKey](); return; }
      }

      // 3. INVENTORY PAGE SHORTCUTS
      if (location.pathname.startsWith('/inventory')) {
        const invActions = {
          [shortcuts.inv_search]: () => triggerElement('inv-search-input', 'focus'),
          [shortcuts.inv_add]: () => {
            const btn = document.getElementById('inv-add-btn-desktop') || document.getElementById('inv-add-btn-mobile');
            if (btn) btn.click();
          },
          [shortcuts.inv_reset]: () => triggerElement('inv-reset-btn', 'click')
        };
        if (invActions[pressedKey]) { event.preventDefault(); invActions[pressedKey](); return; }
      }

      // 4. CATEGORIES PAGE SHORTCUTS
      if (location.pathname.startsWith('/categories')) {
        const catActions = {
          [shortcuts.cat_add]: () => triggerElement('cat-add-btn', 'click'),
          [shortcuts.cat_attr_add]: () => triggerElement('attr-add-btn', 'click')
        };
        if (catActions[pressedKey]) { event.preventDefault(); catActions[pressedKey](); return; }
      }

      // 5. PURCHASES PAGE SHORTCUTS
      if (location.pathname.startsWith('/purchases')) {
        const purActions = {
          [shortcuts.pur_search]: () => {
            const input = document.getElementById('pur-search-input-desktop') || document.getElementById('pur-search-input-mobile');
            if (input) triggerElement(input.id, 'focus');
          },
          [shortcuts.pur_add]: () => triggerElement('pur-add-btn', 'click')
        };
        if (purActions[pressedKey]) { event.preventDefault(); purActions[pressedKey](); return; }
      }

      // 6. CUSTOMERS PAGE SHORTCUTS
      if (location.pathname.startsWith('/customers')) {
        const custActions = {
          [shortcuts.cust_search]: () => {
            const input = document.getElementById('cust-search-input-desktop') || document.getElementById('cust-search-input-mobile');
            if (input) triggerElement(input.id, 'focus');
          },
          [shortcuts.cust_add]: () => triggerElement('cust-add-btn', 'click')
        };
        if (custActions[pressedKey]) { event.preventDefault(); custActions[pressedKey](); return; }
      }

      // 7. SUPPLIERS PAGE SHORTCUTS
      if (location.pathname.startsWith('/suppliers')) {
        const supActions = {
          [shortcuts.sup_search]: () => triggerElement('sup-search-input', 'focus'),
          [shortcuts.sup_add]: () => triggerElement('sup-add-btn', 'click')
        };
        if (supActions[pressedKey]) { event.preventDefault(); supActions[pressedKey](); return; }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, location, shortcuts]);

  return null; 
};

export default KeyboardShortcuts;