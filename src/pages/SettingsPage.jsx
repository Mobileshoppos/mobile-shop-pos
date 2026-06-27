import React from 'react';
import { useSearchParams } from 'react-router-dom'; 
import { useState, useEffect } from 'react';
// Sirf 'Alert' ka izafa kiya hai
import { Card, Typography, Slider, Row, Col, InputNumber, ColorPicker, Divider, Button, Popconfirm, Tabs, Select, App, Radio, Switch, Input, Tooltip, theme, Alert, Space, Modal, Tag, ConfigProvider } from 'antd';
import { ToolOutlined, LockOutlined, CopyOutlined, ShopOutlined, PlusOutlined, DeleteOutlined, EditOutlined, BankOutlined, SettingOutlined, DatabaseOutlined, FormatPainterOutlined, CompassOutlined, WalletOutlined } from '@ant-design/icons';
import bcrypt from 'bcryptjs';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { getPlanLimits } from '../config/subscriptionPlans';
import DataService from '../DataService';
import { db } from '../db';
import download from 'downloadjs';
import { exportDB, importInto } from 'dexie-export-import';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { 
    themeConfig as initialThemeConfig, 
    lightThemeTokens as initialLightTheme, 
    darkThemeTokens as initialDarkTheme 
} from '../theme/themeConfig';

const { Title, Text } = Typography;
const { TextArea } = Input;

// Default Policy agar user ne kuch set na kiya ho
const DEFAULT_POLICY = "No return or exchange after 7 days.\nWarranty claim directly from service center.\nNo warranty for burnt/damaged items.";

// NAYA IZAFA: Standardized Default Keyboard Shortcuts (Browser Safe)
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
  nav_damaged_stock: 'alt+k',
  nav_reports: 'alt+o',
  nav_staff: 'alt+m',
  nav_settings: 'alt+s',
  global_search: 'alt+x',
  // --- POS SHORTCUTS (Standardized) ---
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
  // --- INVENTORY SHORTCUTS (Standardized) ---
  inv_add: 'alt+n',
  inv_search: 'alt+f',
  inv_reset: 'alt+v',
  // --- CATEGORIES SHORTCUTS (Standardized) ---
  cat_add: 'alt+n',
  cat_attr_add: 'alt+a',
  // --- PURCHASES SHORTCUTS (Standardized) ---
  pur_search: 'alt+f',
  pur_add: 'alt+n',
  // --- CUSTOMERS SHORTCUTS (Standardized) ---
  cust_search: 'alt+f',
  cust_add: 'alt+n',
  // --- SUPPLIERS SHORTCUTS (Standardized) ---
  sup_search: 'alt+f',
  sup_add: 'alt+n'
};

const SettingsPage = () => {
  const { token } = theme.useToken(); // Control Center Connection
  const [searchParams, setSearchParams] = useSearchParams(); 
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { message, modal } = App.useApp();
  const { user, profile, updateProfile } = useAuth();
  const limits = getPlanLimits(profile?.subscription_tier);
  const isAdvancedLocked = !limits.allow_advanced_settings;
  const isWarrantyLocked = !limits.allow_warranty_system;
  const isThresholdLocked = !limits.allow_custom_threshold;
  const isPriceChangeLocked = !limits.allow_price_change_control; // <-- NAYA LINK
  const isWholesaleLocked = !limits.allow_wholesale_pricing;
  const isCreditLimitLocked = !limits.allow_customer_credit_limits; // <--- NAYA IZAFA

  // Naya: Active Tab ki state
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || '1');
  
  // Master PIN States
  const [newMasterPin, setNewMasterPin] = useState('');
  const [confirmMasterPin, setConfirmMasterPin] = useState('');
  // --- MULTI-COUNTER STATES (NAYA IZAFA) ---
  const [registers, setRegisters] = useState([]);
  const [terminalToken, setTerminalToken] = useState(''); // Yeh line wapis add karein
  const [isRegisterModalVisible, setIsRegisterModalVisible] = useState(false);
  const [editingRegister, setEditingRegister] = useState(null);
  const [regForm] = Input.useForm ? [null] : [null]; // Placeholder for safety
  // Form handle karne ke liye simple states
  const [regName, setRegName] = useState('');
  const [regType, setRegType] = useState('counter');
  
  // --- NAYA IZAFA: Payment Accounts States ---
  const [paymentAccounts, setPaymentAccounts] = useState([]);
  const [isAccountModalVisible, setIsAccountModalVisible] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [accountName, setAccountName] = useState('');
  const [accountType, setAccountType] = useState('Bank');
  const [accountBalance, setAccountBalance] = useState(0);

  // NAYA IZAFA: Device Pairing States
  const[pairedRegisterId, setPairedRegisterId] = useState(localStorage.getItem('paired_register_id'));

  const handlePairDevice = (id) => {
    localStorage.setItem('paired_register_id', id);
    setPairedRegisterId(id);
    message.success("This PC is now permanently paired to this counter!");
  };

  const handleUnpairDevice = () => {
    localStorage.removeItem('paired_register_id');
    setPairedRegisterId(null);
    message.success("PC unpaired successfully.");
  };

  const loadRegisters = async () => {
    const data = await DataService.getRegisters();
    
    // NAYA IZAFA: Counters ko unke banne ki tarikh se sort karein
    // Jo sab se pehle bana tha (Default), wo hamesha List mein No. 1 par aayega
    const sortedData = data.sort((a, b) => {
        const dateA = new Date(a.created_at || a.updated_at || 0);
        const dateB = new Date(b.created_at || b.updated_at || 0);
        return dateA - dateB;
    });
    
    setRegisters(sortedData);

    // NAYA IZAFA: Payment Accounts bhi load karein
    if (DataService.getPaymentAccounts) {
        const accountsData = await DataService.getPaymentAccounts();
        setPaymentAccounts(accountsData);
    }
  };

  useEffect(() => {
    loadRegisters();
    // NAYA IZAFA: Agar kisi aur tab/window mein counter open/close ho to yahan live update ho jaye
    window.addEventListener('local-db-updated', loadRegisters);
    return () => window.removeEventListener('local-db-updated', loadRegisters);
  }, []);

  const handleAddRegister = async () => {
    if (!regName) { message.error("Please enter a name"); return; }
    
    const newReg = {
      id: editingRegister ? editingRegister.id : crypto.randomUUID(),
      user_id: user.id,
      name: regName,
      type: regType,
      status: editingRegister ? editingRegister.status : 'closed',
      created_at: editingRegister ? editingRegister.created_at : new Date().toISOString(), // NAYA IZAFA
      updated_at: new Date().toISOString()
    };

    if (editingRegister) {
      await db.registers.update(editingRegister.id, newReg);
      await db.sync_queue.add({ table_name: 'registers', action: 'update', data: newReg });
      message.success("Register updated");
    } else {
      await db.registers.add(newReg);
      await db.sync_queue.add({ table_name: 'registers', action: 'create', data: newReg });
      message.success("New Counter created");
    }

    setRegName('');
    setRegType('counter');
    setEditingRegister(null);
    setIsRegisterModalVisible(false);
    loadRegisters();
  };

  const deleteRegister = async (id) => {
    // 1. Check if it has sessions (For Counters)
    const sessions = await db.register_sessions.where('register_id').equals(id).count();
    if (sessions > 0) {
      message.error("Cannot delete. This counter has history/sessions.");
      return;
    }

    // 2. Check if it has cash adjustments/transfers (For Vaults & Counters)
    const adjustments = await db.cash_adjustments.filter(a => a.register_id === id || a.transfer_to === id).count();
    if (adjustments > 0) {
      message.error("Cannot delete. This node has cash transfer history.");
      return;
    }

    await db.registers.delete(id);
    await db.sync_queue.add({ table_name: 'registers', action: 'delete', data: { id } });
    message.success("Node deleted successfully");
    loadRegisters();
  };

  // --- NAYA IZAFA: Accounts Handle Karne Ke Functions ---
  const handleAddAccount = async () => {
    if (!accountName) { message.error("Please enter an account name"); return; }
    
    const newAcc = {
      id: editingAccount ? editingAccount.id : crypto.randomUUID(),
      user_id: user.id,
      name: accountName,
      type: accountType,
      opening_balance: accountBalance,
      is_active: true,
      is_default: editingAccount ? editingAccount.is_default : false
    };

    if (editingAccount) {
      await DataService.updatePaymentAccount(editingAccount.id, newAcc);
      message.success("Account updated");
    } else {
      await DataService.addPaymentAccount(newAcc);
      message.success("New Account created");
    }

    setAccountName('');
    setAccountType('Bank');
    setAccountBalance(0);
    setEditingAccount(null);
    setIsAccountModalVisible(false);
    loadRegisters();
  };

  const deleteAccount = async (id, isDefault, accountName) => {
    if (isDefault) {
        message.error("Cannot delete default system accounts.");
        return;
    }

    // --- NAYA IZAFA: History Check ---
    const salesCount = await db.sales.where('payment_method').equals(accountName).count();
    const expCount = await db.expenses.where('payment_method').equals(accountName).count();
    const payCount = await db.customer_payments.where('payment_method').equals(accountName).count();
    const supPayCount = await db.supplier_payments.where('payment_method').equals(accountName).count();
    const adjCount = await db.cash_adjustments.filter(a => a.payment_method === accountName || a.transfer_to === accountName).count();

    const totalHistory = salesCount + expCount + payCount + supPayCount + adjCount;

    if (totalHistory > 0) {
        message.error(`Cannot delete! "${accountName}" has ${totalHistory} recorded transactions. Please rename it or keep it for audit purposes.`);
        return;
    }
    // ----------------------------------

    await DataService.deletePaymentAccount(id);
    message.success("Account deleted successfully");
    loadRegisters();
  };

  // Naya: Jab URL badle to tab bhi badal jaye (Loop Fix)
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams, activeTab]);
  
  const [selectedCurrency, setSelectedCurrency] = useState('PKR');
  const [themeMode, setThemeMode] = useState('dark');
  const [isSaving, setIsSaving] = useState(false);
  const [isBackupLoading, setIsBackupLoading] = useState(false);
  const [isRestoreLoading, setIsRestoreLoading] = useState(false);
  const [receiptFormat, setReceiptFormat] = useState('pdf');
  // --- NAYA IZAFA: FBR States ---
  const [fbrIntegrationEnabled, setFbrIntegrationEnabled] = useState(false);
  const [fbrPosId, setFbrPosId] = useState('');
  const [fbrNtn, setFbrNtn] = useState('');
  const [fbrFee, setFbrFee] = useState(1);
  const [province, setProvince] = useState('Sindh'); // NAYA IZAFA: FBR Province
  // --- NAYA IZAFA: Tax States ---
  const [taxEnabled, setTaxEnabled] = useState(false);
  const [taxName, setTaxName] = useState('GST');
  const [taxRate, setTaxRate] = useState(0);
  // ------------------------------
  const [lowStockAlerts, setLowStockAlerts] = useState(true);
  const [lowStockThreshold, setLowStockThreshold] = useState(5);
  
  // Nayi State for Warranty Policy
  const [warrantyPolicy, setWarrantyPolicy] = useState(DEFAULT_POLICY);
  const [quotationPolicy, setQuotationPolicy] = useState('');
  const [quotationValidityDays, setQuotationValidityDays] = useState(3);
  const [staffDiscountLimit, setStaffDiscountLimit] = useState(10);
  const [reprintButtonEnabled, setReprintButtonEnabled] = useState(false);
  const [qrCodeEnabled, setQrCodeEnabled] = useState(true);
  const [warrantySystemEnabled, setWarrantySystemEnabled] = useState(true);
  const [posDiscountEnabled, setPosDiscountEnabled] = useState(true);
  const [allowCartPriceChange, setAllowCartPriceChange] = useState(true);
  const [wholesalePricingEnabled, setWholesalePricingEnabled] = useState(false);
  const [enableBatchExpiry, setEnableBatchExpiry] = useState(false);
  const [blockExpiredSales, setBlockExpiredSales] = useState(false);
  const [expiryAlertDays, setExpiryAlertDays] = useState(30); // <--- NAYA IZAFA
  const [enableCustomerCreditLimits, setEnableCustomerCreditLimits] = useState(false); // <--- NAYA IZAFA
  const [defaultCreditLimit, setDefaultCreditLimit] = useState(0); // <--- NAYA IZAFA
  const [mobileNavEnabled, setMobileNavEnabled] = useState(true);
  const [desktopNavEnabled, setDesktopNavEnabled] = useState(true);
  const [mobileNavItems, setMobileNavItems] = useState(["/", "/pos", "/inventory", "/sales-history"]);
  const [desktopNavItems, setDesktopNavItems] = useState(['/pos', '/inventory', '/warranty', '/customers', '/expenses']);
  const [desktopNavPosition, setDesktopNavPosition] = useState('bottom');

  // NAYA IZAFA: Keyboard Shortcuts States
  const [customShortcuts, setCustomShortcuts] = useState(DEFAULT_SHORTCUTS);
  const [recordingShortcutFor, setRecordingShortcutFor] = useState(null);

  // NAYA IZAFA: Key Catcher Logic (Shortcut record karne ke liye)
  useEffect(() => {
    if (!recordingShortcutFor) {
      window.isRecordingShortcut = false;
      return;
    }
    
    window.isRecordingShortcut = true;

    const handleKeyDown = (e) => {
      e.preventDefault(); // Browser ka default action rokein
      
      // Agar user ne Escape dabaya to cancel kar dein
      if (e.key === 'Escape') {
        setRecordingShortcutFor(null);
        message.info('Shortcut recording cancelled');
        return;
      }

      // Sirf modifier keys ko akele record nahi karna
      if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) return;

      let keys = [];
      if (e.ctrlKey || e.metaKey) keys.push('ctrl');
      if (e.altKey) keys.push('alt');
      if (e.shiftKey) keys.push('shift');
      
      // Agar koi modifier key nahi hai, to warn karein
      if (keys.length === 0 && e.key !== 'Enter') {
        message.warning('Please use a modifier key (Alt, Ctrl, or Shift) for safety.');
        return;
      }

      keys.push(e.key.toLowerCase());
      const newShortcut = keys.join('+');

      // Validation Logic: Global vs Local Conflict Check
      const isSettingGlobal = recordingShortcutFor.startsWith('nav_');
      let hasConflict = false;
      let conflictName = '';

      for (const [key, value] of Object.entries(customShortcuts)) {
        if (value === newShortcut && key !== recordingShortcutFor) {
          const isExistingGlobal = key.startsWith('nav_');
          // Conflict tab hoga jab:
          // 1. Hum Global shortcut set kar rahe hon aur wo kisi bhi (Global ya Local) se takraye.
          // 2. Hum Local shortcut set kar rahe hon aur wo kisi Global se takraye.
          if (isSettingGlobal || isExistingGlobal) {
            hasConflict = true;
            conflictName = key;
            break;
          }
        }
      }

      if (hasConflict) {
        message.error(`Conflict! ${newShortcut.toUpperCase()} is already used for ${conflictName.replace(/_/g, ' ').toUpperCase()}`);
        return;
      }

      setCustomShortcuts(prev => ({ ...prev, [recordingShortcutFor]: newShortcut }));
      setRecordingShortcutFor(null);
      message.success(`Shortcut updated to: ${newShortcut.toUpperCase()}`);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.isRecordingShortcut = false;
    };
  }, [recordingShortcutFor, message]);

  const navOptions = [
    { label: 'Home', value: '/' },
    { label: 'POS', value: '/pos' },
    { label: 'Stock (Inventory)', value: '/inventory' },
    { label: 'Sales History', value: '/sales-history' },
    { label: 'Reports', value: '/reports' },
    { label: 'Customers', value: '/customers' },
    { label: 'Return Items', value: '/customers?openReturn=true' }, // Naya Shortcut
    { label: 'Warranty', value: '/warranty' },
    { label: 'Settings', value: '/settings' },
  ];

  const currencyOptions = [
    { value: 'PKR', label: 'PKR - Pakistani Rupee' },
    { value: 'USD', label: 'USD - US Dollar' },
    { value: 'AED', label: 'AED - UAE Dirham' },
    { value: 'SAR', label: 'SAR - Saudi Riyal' },
    { value: 'EUR', label: 'EUR - Euro' },
    { value: 'GBP', label: 'GBP - British Pound' },
  ];

  useEffect(() => {
    if (profile) {
      if (profile.currency) setSelectedCurrency(profile.currency);
      if (profile.theme_mode) setThemeMode(profile.theme_mode);
      if (profile.receipt_format) setReceiptFormat(profile.receipt_format);
      // --- NAYA IZAFA: Load FBR Settings ---
      if (profile.fbr_integration_enabled !== undefined) setFbrIntegrationEnabled(profile.fbr_integration_enabled);
      if (profile.fbr_pos_id !== undefined) setFbrPosId(profile.fbr_pos_id);
      if (profile.fbr_ntn !== undefined) setFbrNtn(profile.fbr_ntn);
      if (profile.fbr_fee !== undefined) setFbrFee(profile.fbr_fee);
      if (profile.province !== undefined) setProvince(profile.province); // NAYA IZAFA: FBR Province
      // --- NAYA IZAFA: Load Tax Settings ---
      if (profile.tax_enabled !== undefined) setTaxEnabled(profile.tax_enabled);
      if (profile.tax_name !== undefined) setTaxName(profile.tax_name);
      if (profile.tax_rate !== undefined) setTaxRate(profile.tax_rate);
      // -------------------------------------
      if (profile.low_stock_alerts_enabled !== null && profile.low_stock_alerts_enabled !== undefined) {
        setLowStockAlerts(profile.low_stock_alerts_enabled);
      }
      if (profile.qr_code_enabled !== undefined) {
          setQrCodeEnabled(profile.qr_code_enabled);
      }
      if (profile.warranty_system_enabled !== undefined) {
          setWarrantySystemEnabled(profile.warranty_system_enabled);
      if (profile.pos_discount_enabled !== undefined) setPosDiscountEnabled(profile.pos_discount_enabled);
      if (profile.allow_cart_price_change !== undefined) setAllowCartPriceChange(profile.allow_cart_price_change);
      if (profile.wholesale_pricing_enabled !== undefined) setWholesalePricingEnabled(profile.wholesale_pricing_enabled);
      if (profile.enable_batch_expiry !== undefined) setEnableBatchExpiry(profile.enable_batch_expiry);
      if (profile.block_expired_sales !== undefined) setBlockExpiredSales(profile.block_expired_sales);
      if (profile.expiry_alert_days !== undefined) setExpiryAlertDays(profile.expiry_alert_days); // <--- NAYA IZAFA
      if (profile.enable_customer_credit_limits !== undefined) setEnableCustomerCreditLimits(profile.enable_customer_credit_limits); // <--- NAYA IZAFA
      if (profile.default_credit_limit !== undefined) setDefaultCreditLimit(profile.default_credit_limit); // <--- NAYA IZAFA
      if (profile.mobile_nav_enabled !== undefined) setMobileNavEnabled(profile.mobile_nav_enabled);
      if (profile.desktop_nav_enabled !== undefined) setDesktopNavEnabled(profile.desktop_nav_enabled);
      if (profile.mobile_nav_items) setMobileNavItems(profile.mobile_nav_items);
      if (profile.desktop_nav_items) setDesktopNavItems(profile.desktop_nav_items);
      if (profile.desktop_nav_position) setDesktopNavPosition(profile.desktop_nav_position);
      
      // NAYA IZAFA: Load Custom Shortcuts
      if (profile.custom_shortcuts && Object.keys(profile.custom_shortcuts).length > 0) {
          setCustomShortcuts({ ...DEFAULT_SHORTCUTS, ...profile.custom_shortcuts });
      }
      }
      if (profile.low_stock_threshold) setLowStockThreshold(profile.low_stock_threshold);
      
      // Agar profile mein policy hai to wo set karein, warna default
      if (profile.warranty_policy) {
          setWarrantyPolicy(profile.warranty_policy);
      } else {
          setWarrantyPolicy(DEFAULT_POLICY);
      }

      if (profile.quotation_policy) {
          setQuotationPolicy(profile.quotation_policy);
      if (profile.quotation_validity_days) setQuotationValidityDays(profile.quotation_validity_days);
      if (profile.staff_discount_limit !== undefined) setStaffDiscountLimit(profile.staff_discount_limit);
      if (profile.reprint_button_enabled !== undefined) setReprintButtonEnabled(profile.reprint_button_enabled);
      }
    }
  }, [profile]);

  // --- NAYA IZAFA: Backup & Restore Functions ---
  const handleBackup = async () => {
    try {
      setIsBackupLoading(true);
      const blob = await exportDB(db, { prettyJson: true });
      const date = new Date().toISOString().split('T')[0];
      download(blob, `MobileShop_Backup_${date}.json`, 'application/json');
      message.success('Backup downloaded successfully!');
    } catch (error) {
      console.error('Backup failed:', error);
      message.error('Failed to create backup: ' + error.message);
    } finally {
      setIsBackupLoading(false);
    }
  };

  const handleRestore = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    modal.confirm({
      title: 'Are you sure you want to restore?',
      content: 'This will completely replace your current offline data with the backup file. Only do this if you know what you are doing.',
      okText: 'Yes, Restore',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        // NAYA: Global loading message jo screen par ruka rahega
        const hide = message.loading('Restoring database, please wait... Do not close the app.', 0); 
        try {
          setIsRestoreLoading(true);
          // Purane tables saaf karke file wala data daalein
          await importInto(db, file, { clearTablesBeforeImport: true });
          hide(); // Loading message hatayein
          message.success('Database restored successfully! Reloading...');
          setTimeout(() => window.location.reload(), 2000); // Naya data load karne ke liye page refresh
        } catch (error) {
          hide(); // Loading message hatayein
          console.error('Restore failed:', error);
          message.error('Failed to restore database: ' + error.message);
        } finally {
          setIsRestoreLoading(false);
        }
      }
    });
    // Input reset karein taake same file dobara select ho sake
    event.target.value = '';
  };
  // ----------------------------------------------

  const handleGeneralSettingsSave = async (event) => {
    event.preventDefault();
    if (!profile) return;

    setIsSaving(true);

    // Prepare the data to update
    const updates = {
      currency: selectedCurrency,
      receipt_format: receiptFormat,
      // --- NAYA IZAFA: Save FBR Settings ---
      fbr_integration_enabled: isAdvancedLocked ? false : fbrIntegrationEnabled,
      fbr_pos_id: fbrPosId,
      fbr_ntn: fbrNtn,
      fbr_fee: fbrFee,
      province: province, // NAYA IZAFA: FBR Province
      // --- NAYA IZAFA: Save Tax Settings ---
      tax_enabled: taxEnabled,
      tax_name: taxName,
      tax_rate: taxRate,
      // -------------------------------------
      low_stock_alerts_enabled: lowStockAlerts,
      low_stock_threshold: isThresholdLocked ? 5 : lowStockThreshold,
      warranty_policy: warrantyPolicy,
      quotation_policy: quotationPolicy,
      quotation_validity_days: quotationValidityDays,
      staff_discount_limit: staffDiscountLimit,
      reprint_button_enabled: reprintButtonEnabled,
      qr_code_enabled: isAdvancedLocked ? false : qrCodeEnabled,
      warranty_system_enabled: isWarrantyLocked ? false : warrantySystemEnabled,
      pos_discount_enabled: isAdvancedLocked ? false : posDiscountEnabled,
      allow_cart_price_change: allowCartPriceChange,
      wholesale_pricing_enabled: isWholesaleLocked ? false : wholesalePricingEnabled,
      enable_batch_expiry: enableBatchExpiry,
      block_expired_sales: blockExpiredSales,
      expiry_alert_days: expiryAlertDays, // <--- NAYA IZAFA
      enable_customer_credit_limits: isCreditLimitLocked ? false : enableCustomerCreditLimits, // <--- NAYA IZAFA
      default_credit_limit: defaultCreditLimit, // <--- NAYA IZAFA
      mobile_nav_enabled: mobileNavEnabled,
      desktop_nav_enabled: desktopNavEnabled,
      mobile_nav_items: mobileNavItems,
      desktop_nav_items: desktopNavItems,
      desktop_nav_position: desktopNavPosition,
      theme_mode: themeMode, 
      custom_shortcuts: customShortcuts, // NAYA IZAFA: Save Shortcuts
    };

    const result = await updateProfile(updates);

    if (result && result.success) {
      message.success('Settings updated successfully!');
    } else {
      message.error(result?.error?.message || 'Failed to update settings.');
    }

    setIsSaving(false);
  };

  // --- NAYA FUNCTION: Master PIN Change (Cloud Sync) ---
  const handleMasterPinChange = async () => {
    if (!newMasterPin || newMasterPin.length !== 6) {
      message.error('Master PIN must be exactly 6 digits');
      return;
    }
    if (newMasterPin !== confirmMasterPin) {
      message.error('PINs do not match');
      return;
    }

    setIsSaving(true); // Loading shuru

    try {
      // 1. PIN ko Hash karein (Security)
      const hashedPin = bcrypt.hashSync(newMasterPin, 10);

      // 2. Cloud (Supabase) par save karein
      const result = await updateProfile({ master_pin: hashedPin });

      if (result.success) {
        // 3. Agar Cloud par save ho gaya, to Local bhi update karein
        localStorage.setItem('device_master_pin', hashedPin);
        
        message.success('Master PIN synced to Cloud & updated locally!');
        setNewMasterPin('');
        setConfirmMasterPin('');
      } else {
        // Agar internet ka masla ho
        message.error('Failed to save Master PIN to cloud. Please check internet connection.');
      }
    } catch (error) {
      console.error("PIN Update Error:", error);
      message.error("An unexpected error occurred.");
    } finally {
      setIsSaving(false); // Loading khatam
    }
  };

  // --- NAYA FUNCTION: Terminal Token Generate karne ke liye ---
  const handleGenerateToken = () => {
    try {
      setIsSaving(true);
      
      // Context se user email nikalain (Network call ki zaroorat nahi)
      const email = user?.email;
      
      if (!email) {
        message.error("Session error. Please logout and login again.");
        return;
      }

      // Token banana (TERMINAL_ACCESS|email|timestamp)
      const rawData = `TERMINAL_ACCESS|${email}|${new Date().getTime()}`;
      
      // Base64 Encoding (Safe for all browsers)
      const encryptedToken = btoa(rawData);
      
      setTerminalToken(encryptedToken);
      message.success("Terminal Token generated successfully!");
    } catch (error) {
      console.error("Token Generation Error:", error);
      message.error("Failed to generate token.");
    } finally {
      setIsSaving(false);
    }
  };

  const { themeConfig, lightTheme, darkTheme, isDarkMode, updateTheme } = useTheme();

  const handleFontSizeChange = (newValue) => {
    updateTheme({ token: { fontSize: newValue } });
  };

  const handleColorChange = (newColor) => {
    const colorValue = newColor.toHexString();
    if (isDarkMode) {
      updateTheme({ darkTheme: { colorPrimary: colorValue } });
    } else {
      updateTheme({ lightTheme: { colorPrimary: colorValue } });
    }
  };

  const handleBgContainerColorChange = (newColor) => {
    const colorValue = newColor.toHexString();
    if (isDarkMode) {
      updateTheme({ darkTheme: { colorBgContainer: colorValue } });
    } else {
      updateTheme({ lightTheme: { colorBgContainer: colorValue } });
    }
  };
  
  const handleBorderRadiusChange = (newValue) => {
    updateTheme({ token: { borderRadiusLG: newValue } });
  };

  const currentPrimaryColor = isDarkMode ? darkTheme.colorPrimary : lightTheme.colorPrimary;
  const currentBgContainerColor = isDarkMode ? darkTheme.colorBgContainer : lightTheme.colorBgContainer;

  return (
    <ConfigProvider theme={{ 
      components: { 
        Tabs: { itemActiveBg: token.colorCardBg, cardBg: token.colorBgLayout, colorBorderSecondary: token.colorBorder },
        Divider: { colorSplit: token.colorBorder } // NAYA IZAFA: Dividers ko wazeh karne ke liye
      } 
    }}>
    <div style={{ padding: isMobile ? '12px 4px' : '4px' }}>
      {isMobile && (
        <Title level={2} style={{ margin: 0, marginBottom: '16px', marginLeft: '8px', fontSize: '23px' }}>
          <ToolOutlined style={{ color: token.colorPrimary }} /> App Settings
        </Title>
      )}

      <Card title="Application Configuration" style={{ marginTop: 8 }}>
        <Tabs 
          activeKey={activeTab} 
          onChange={(key) => { setActiveTab(key); setSearchParams({ tab: key }); }}
          type="card"
          items={[
            {
              key: '1',
              label: 'Store Settings',
              icon: <SettingOutlined />,
              children: (
                <div style={{ padding: '16px 0' }}>
                  <Row align="middle" gutter={[16, 16]}>
                    <Col xs={24} sm={6}>
                      <Text strong>Default Currency</Text>
                      <Text type="secondary" style={{ display: 'block' }}>Used for all transactions and reports.</Text>
                    </Col>
                    <Col xs={24} sm={18}>
                      <Select style={{ width: '100%' }} value={selectedCurrency} onChange={(value) => setSelectedCurrency(value)} options={currencyOptions} />
                    </Col>
                  </Row>
                  <Divider />
                  <Row align="middle" gutter={[16, 16]}>
                    <Col xs={24} sm={6}>
                      <Text strong>Default Receipt Format</Text>
                      <Text type="secondary" style={{ display: 'block' }}>Choose between standard PDF or thermal printer receipts.</Text>
                    </Col>
                    <Col xs={24} sm={18}>
                      <Radio.Group onChange={(e) => setReceiptFormat(e.target.value)} value={receiptFormat}>
                        <Radio value={'pdf'}>PDF Document</Radio>
                        <Radio value={'thermal'}>Thermal Receipt</Radio>
                        <Radio value={'none'}>None (Disable Receipt)</Radio>
                      </Radio.Group>
                    </Col>
                  </Row>
                  <Divider />
                  {/* --- NAYA IZAFA: FBR Configuration UI --- */}
                  <Row align="middle" gutter={[16, 16]}>
                    <Col xs={24} sm={6}>
                      <Text strong>FBR Integration (POS)</Text>
                      <Text type="secondary" style={{ display: 'block' }}>Connect your sales with FBR for live reporting.</Text>
                    </Col>
                    <Col xs={24} sm={18}>
                      <Space wrap>
                        <Switch checked={fbrIntegrationEnabled && !isAdvancedLocked} onChange={setFbrIntegrationEnabled} disabled={isAdvancedLocked} />
                        {fbrIntegrationEnabled && (
                          <>
                            <Input placeholder="POS ID" value={fbrPosId} onChange={(e) => setFbrPosId(e.target.value)} style={{ width: 120 }} />
                            <Input placeholder="NTN" value={fbrNtn} onChange={(e) => setFbrNtn(e.target.value)} style={{ width: 150 }} />
                            <Select value={province} onChange={setProvince} style={{ width: 150 }} placeholder="Province">
                              <Select.Option value="Sindh">Sindh</Select.Option>
                              <Select.Option value="Punjab">Punjab</Select.Option>
                              <Select.Option value="Balochistan">Balochistan</Select.Option>
                              <Select.Option value="Khyber Pakhtunkhwa">Khyber Pakhtunkhwa</Select.Option>
                              <Select.Option value="Islamabad">Islamabad</Select.Option>
                            </Select>
                            <Tooltip title="FBR POS Service Fee (Rs.)">
                              <InputNumber placeholder="Fee (Rs)" value={fbrFee} onChange={setFbrFee} min={0} addonBefore="Fee Rs." style={{ width: 130 }} />
                            </Tooltip>
                          </>
                        )}
                      </Space>
                      {isAdvancedLocked && <Text type="warning" style={{ display: 'block', fontSize: '12px', marginTop: '4px' }}>FBR Integration is available as an add-on on demand.</Text>}
                    </Col>
                  </Row>
                  <Divider />
                  <Row align="middle" gutter={[16, 16]}>
                    <Col xs={24} sm={6}>
                      <Text strong>Show QR Code</Text>
                      <Text type="secondary" style={{ display: 'block' }}>Print invoice QR code on receipts.</Text>
                    </Col>
                    <Col xs={24} sm={18}>
                      <Switch checked={qrCodeEnabled && !isAdvancedLocked} onChange={setQrCodeEnabled} disabled={isAdvancedLocked} />
                      {isAdvancedLocked && <Text type="warning" style={{ display: 'block', fontSize: '12px', marginTop: '4px' }}>Available in Growth and Pro plans.</Text>}
                    </Col>
                  </Row>
                  <Divider />
                  <Row align="middle" gutter={[16, 16]}>
                    <Col xs={24} sm={6}>
                      <Text strong>Enable Warranty System</Text>
                      <Text type="secondary" style={{ display: 'block' }}>Turn off to hide all warranty related features.</Text>
                    </Col>
                    <Col xs={24} sm={18}>
                      <Switch checked={warrantySystemEnabled && !isWarrantyLocked} onChange={setWarrantySystemEnabled} disabled={isWarrantyLocked} />
                      {isWarrantyLocked && <Text type="warning" style={{ display: 'block', fontSize: '12px', marginTop: '4px' }}>Available in Growth and Pro plans.</Text>}
                    </Col>
                  </Row>
                  <Divider />
                  <Row align="middle" gutter={[16, 16]}>
                    <Col xs={24} sm={6}>
                      <Text strong>Enable Quick Reprint</Text>
                      <Text type="secondary" style={{ display: 'block' }}>Show a button to reprint the last receipt on POS.</Text>
                    </Col>
                    <Col xs={24} sm={18}>
                      <Switch checked={reprintButtonEnabled} onChange={setReprintButtonEnabled} />
                    </Col>
                  </Row>
                  <Divider />
                  <Row align="middle" gutter={[16, 16]}>
                    <Col xs={24} sm={6}>
                      <Text strong>Enable POS Discount</Text>
                      <Text type="secondary" style={{ display: 'block' }}>Show discount field and set staff limit.</Text>
                    </Col>
                    <Col xs={24} sm={18}>
                      <Space wrap>
                        <Switch 
                          checked={posDiscountEnabled && !isAdvancedLocked}
                          onChange={setPosDiscountEnabled}
                          disabled={isAdvancedLocked}
                        />
                        {posDiscountEnabled && (
                          <Tooltip title="Maximum discount a staff can give without Master PIN">
                            <InputNumber 
                              min={0} 
                              max={100} 
                              value={staffDiscountLimit} 
                              onChange={setStaffDiscountLimit} 
                              addonAfter="%" 
                              placeholder="Staff Limit"
                              style={{ width: 140 }}
                            />
                          </Tooltip>
                        )}
                      </Space>
                      {isAdvancedLocked && <Text type="warning" style={{ display: 'block', fontSize: '12px', marginTop: '4px' }}>Available in Growth and Pro plans.</Text>}
                    </Col>
                  </Row>
                  <Divider />
                  {/* --- NAYA IZAFA: Tax Configuration UI --- */}
                  <Row align="middle" gutter={[16, 16]}>
                    <Col xs={24} sm={6}>
                      <Text strong>Enable Tax (GST/VAT)</Text>
                      <Text type="secondary" style={{ display: 'block' }}>Apply tax on your sales automatically.</Text>
                    </Col>
                    <Col xs={24} sm={18}>
                      <Space>
                        <Switch checked={taxEnabled} onChange={setTaxEnabled} />
                        {taxEnabled && (
                          <>
                            <Input 
                              placeholder="Tax Name (e.g. GST)" 
                              value={taxName} 
                              onChange={(e) => setTaxName(e.target.value)} 
                              style={{ width: 120 }} 
                            />
                            <InputNumber 
                              placeholder="Rate %" 
                              value={taxRate} 
                              onChange={setTaxRate} 
                              min={0} 
                              max={100} 
                              formatter={value => `${value}%`}
                              parser={value => value.replace('%', '')}
                            />
                          </>
                        )}
                      </Space>
                    </Col>
                  </Row>
                  <Divider />
                  <Row align="middle" gutter={[16, 16]}>
                    <Col xs={24} sm={6}>
                      <Text strong>Allow Price Change in Cart</Text>
                      <Text type="secondary" style={{ display: 'block' }}>Allow staff to manually change item prices in the POS cart.</Text>
                    </Col>
                  <Col xs={24} sm={18}>
                   <Switch 
                     checked={allowCartPriceChange} 
                     onChange={setAllowCartPriceChange} 
                     disabled={isPriceChangeLocked} 
                  />
                    </Col>
                  </Row>
                  <Divider />
                  <Row align="middle" gutter={[16, 16]}>
                    <Col xs={24} sm={6}>
                      <Text strong>Enable Wholesale Pricing</Text>
                      <Text type="secondary" style={{ display: 'block' }}>Set different prices for wholesale customers.</Text>
                    </Col>
                    <Col xs={24} sm={18}>
                      <Switch 
                        checked={wholesalePricingEnabled && !isWholesaleLocked} 
                        onChange={setWholesalePricingEnabled} 
                        disabled={isWholesaleLocked} 
                      />
                      {isWholesaleLocked && <Text type="warning" style={{ display: 'block', fontSize: '12px', marginTop: '4px' }}>Available in Pro and Scale plans.</Text>}
                    </Col>
                  </Row>
                  <Divider />
                  <Row align="middle" gutter={[16, 16]}>
                    <Col xs={24} sm={6}>
                      <Text strong>Track Batch & Expiry</Text>
                      <Text type="secondary" style={{ display: 'block' }}>Essential for Pharmacy, Grocery, and FMCG businesses to track expiring stock.</Text>
                    </Col>
                    <Col xs={24} sm={18}>
                      <Switch 
                        checked={enableBatchExpiry} 
                        onChange={setEnableBatchExpiry} 
                      />
                    </Col>
                  </Row>
                  <Divider />
                  {enableBatchExpiry && (
                    <>
                      <Row align="middle" gutter={[16, 16]}>
                        <Col xs={24} sm={6}>
                          <Text strong>Block Expired Sales</Text>
                          <Text type="secondary" style={{ display: 'block' }}>Prevent staff from adding expired items to the POS cart.</Text>
                        </Col>
                        <Col xs={24} sm={18}>
                          <Switch 
                            checked={blockExpiredSales} 
                            onChange={setBlockExpiredSales} 
                          />
                        </Col>
                      </Row>
                      <Divider />
                      <Row align="middle" gutter={[16, 16]}>
                        <Col xs={24} sm={6}>
                          <Text strong>Expiry Alert Days</Text>
                          <Text type="secondary" style={{ display: 'block' }}>How many days before expiry should the system alert you?</Text>
                        </Col>
                        <Col xs={24} sm={18}>
                          <InputNumber 
                            min={1} 
                            max={365} 
                            value={expiryAlertDays} 
                            onChange={setExpiryAlertDays} 
                            addonAfter="Days"
                          />
                        </Col>
                      </Row>
                      <Divider />
                    </>
                  )}
                  <Row align="middle" gutter={[16, 16]}>
                    <Col xs={24} sm={6}>
                      <Text strong>Customer Credit Limits</Text>
                      <Text type="secondary" style={{ display: 'block' }}>Block sales if customer exceeds their credit limit.</Text>
                    </Col>
                    <Col xs={24} sm={18}>
                      <Space wrap>
                        <Switch 
                          checked={enableCustomerCreditLimits && !isCreditLimitLocked} 
                          onChange={setEnableCustomerCreditLimits} 
                          disabled={isCreditLimitLocked} 
                        />
                        {enableCustomerCreditLimits && !isCreditLimitLocked && (
                          <Tooltip title="Maximum limit a staff can give to a new customer without Master PIN">
                            <InputNumber 
                              min={0} 
                              value={defaultCreditLimit} 
                              onChange={setDefaultCreditLimit} 
                              addonBefore="Default Limit Rs." 
                              style={{ width: 220 }}
                            />
                          </Tooltip>
                        )}
                      </Space>
                      {isCreditLimitLocked && <Text type="warning" style={{ display: 'block', fontSize: '12px', marginTop: '4px' }}>Available in Pro and Scale plans.</Text>}
                    </Col>
                  </Row>
                  <Divider />
                  <Row align="top" gutter={[16, 16]}>
                    <Col xs={24} sm={6}>
                      <Text strong>Receipt Footer / Warranty Policy</Text>
                      <Text type="secondary" style={{ display: 'block' }}>This text will appear at the bottom of your receipts.</Text>
                    </Col>
                  <Col xs={24} sm={18}>
                    <TextArea rows={4} value={warrantyPolicy} onChange={(e) => setWarrantyPolicy(e.target.value)} placeholder="Enter your warranty terms here..." />
                    </Col>
                  </Row>
                  <Divider />
                  <Row align="middle" gutter={[16, 16]}>
                    <Col xs={24} sm={6}>
                      <Text strong>Quotation Validity (Days)</Text>
                      <Text type="secondary" style={{ display: 'block' }}>How many days the estimate is valid.</Text>
                    </Col>
                    <Col xs={24} sm={18}>
                      <InputNumber 
                        min={1} 
                        max={30} 
                        value={quotationValidityDays} 
                        onChange={setQuotationValidityDays} 
                        addonAfter="Days"
                        style={{ width: isMobile ? '100%' : '150px' }}
                      />
                    </Col>
                  </Row>
                  <Divider />
                  <Row align="top" gutter={[16, 16]}>
                    <Col xs={24} sm={6}>
                      <Text strong>Quotation / Estimate Policy</Text>
                      <Text type="secondary" style={{ display: 'block' }}>This note will appear on your estimated bills.</Text>
                    </Col>
                    <Col xs={24} sm={18}>
                      <TextArea 
                        rows={4} 
                        value={quotationPolicy} 
                        onChange={(e) => setQuotationPolicy(e.target.value)} 
                        placeholder="e.g. 1. Valid for 3 days. 2. Prices subject to market change." 
                      />
                    </Col>
                  </Row>
                </div>
              ),
            },
            {
              key: '2',
              label: 'Inventory',
              icon: <DatabaseOutlined />,
              children: (
                <div style={{ padding: '16px 0' }}>
                  <Row align="middle" gutter={[16, 16]}>
                    <Col xs={24} sm={6}>
                      <Text strong>Low Stock Alerts</Text>
                      <Text type="secondary" style={{ display: 'block' }}>Get notified for low quantity items.</Text>
                    </Col>
                    <Col xs={24} sm={18}><Switch checked={lowStockAlerts} onChange={setLowStockAlerts} /></Col>
                  </Row>
                  <Row align="middle" gutter={[16, 16]} style={{ marginTop: '16px' }}>
                    <Col xs={24} sm={6}>
                      <Text strong>Alert Threshold</Text>
                      <Text type="secondary" style={{ display: 'block' }}>Quantity at which to trigger alert.</Text>
                    </Col>
                    <Col xs={24} sm={18}>
                      {(() => {
                         return (
                           <Tooltip title={isThresholdLocked ? "Custom threshold is available in Growth Plan." : ""}>
                             <InputNumber 
                               min={1} 
                               max={50} 
                               style={{ width: '100%' }} 
                               value={lowStockThreshold} 
                               onChange={setLowStockThreshold} 
                               disabled={!lowStockAlerts || isThresholdLocked} 
                             />
                           </Tooltip>
                         );
                      })()}
                      {isThresholdLocked && <Text type="warning" style={{fontSize: '11px'}}>Default: 5 (Upgrade to change)</Text>}
                    </Col>
                  </Row>
                </div>
              ),
            },
            {
              key: '3',
              label: 'Appearance',
              icon: <FormatPainterOutlined />,
              children: (
                <div style={{ padding: '16px 0' }}>
                  <Row align="middle" gutter={[16, 16]}>
                    <Col xs={24} sm={6}>
                      <Text strong>App Theme</Text>
                      <Text type="secondary" style={{ display: 'block' }}>Choose your preferred look.</Text>
                    </Col>
                    <Col xs={24} sm={18}>
                      <Radio.Group 
                        value={themeMode} 
                        onChange={(e) => setThemeMode(e.target.value)} 
                        buttonStyle="solid"
                      >
                        <Radio.Button value="light">Light</Radio.Button>
                        <Radio.Button value="dark">Dark</Radio.Button>
                        <Radio.Button value="system">System Default</Radio.Button>
                      </Radio.Group>
                    </Col>
                  </Row>
                  <Divider />
                  <Row align="middle" gutter={[16, 16]}>
                    <Col xs={24} sm={6}><Text strong>Global Font Size</Text></Col>
                    <Col xs={24} sm={18}><InputNumber min={12} max={20} style={{ width: '100%' }} value={themeConfig.token.fontSize} onChange={handleFontSizeChange} /></Col>
                  </Row>
                  <Divider />
                  <Row align="middle" gutter={[16, 16]}>
                    <Col xs={24} sm={6}>
                      <Text strong style={{ color: token.colorText }}>Container Border Radius</Text>
                      <Text type="secondary" style={{ display: 'block' }}>Affects cards, inputs, etc.</Text>
                    </Col>
                    <Col xs={24} sm={18}><InputNumber min={0} max={24} style={{ width: '100%' }} value={themeConfig.token.borderRadiusLG} onChange={handleBorderRadiusChange} /></Col>
                  </Row>
                  </div>
              ),
            },
            {
              key: '5',
              label: 'Security',
              icon: <LockOutlined />,
              children: (
                <div style={{ padding: '16px 0' }}>
                  <Title level={4} style={{ fontSize: '16px' }}>Master PIN Configuration</Title>
                  <Text type="secondary" style={{ display: 'block', marginBottom: '16px' }}>
                    This PIN is used to unlock the terminal and override staff restrictions.
                  </Text>
                  
                  <Row gutter={[16, 16]} align="bottom">
                    <Col xs={24} sm={8}>
                      <Text strong>New Master PIN</Text>
                      <Input.Password 
                        placeholder="Enter 6-digit PIN" 
                        maxLength={6}
                        value={newMasterPin}
                        onChange={(e) => setNewMasterPin(e.target.value.replace(/[^0-9]/g, ''))}
                        style={{ marginTop: '8px' }}
                      />
                    </Col>
                    <Col xs={24} sm={8}>
                      <Text strong>Confirm New PIN</Text>
                      <Input.Password 
                        placeholder="Repeat PIN" 
                        maxLength={6}
                        value={confirmMasterPin}
                        onChange={(e) => setConfirmMasterPin(e.target.value.replace(/[^0-9]/g, ''))}
                        style={{ marginTop: '8px' }}
                      />
                    </Col>
                    <Col xs={24} sm={8}>
                      <Button type="primary" onClick={handleMasterPinChange} block>
                        Update Master PIN
                      </Button>
                    </Col>
                  </Row>
                  
                  <Divider />
                  
                  <Alert 
                    message="Security Note" 
                    description="This Master PIN is synced to the cloud and protects all your terminals (including remote branches). If forgotten, you must re-authenticate using your Owner Email and Password to reset it."
                    type="info" 
                    showIcon 
                  />

                  <Divider />

                  <Title level={4} style={{ fontSize: '16px', color: token.colorWarning }}>Remote Terminal Access</Title>
                  <Text type="secondary" style={{ display: 'block', marginBottom: '16px' }}>
                    Generate a secure activation token to authorize remote devices or additional branches. 
  This allows your staff to securely log in to this shop without requiring your master email or password.
                  </Text>
                  
                  <Row gutter={[16, 16]} align="middle">
                    <Col xs={24} sm={16}>
                      <Text strong>Generated Token</Text>
                      <Input 
                        readOnly 
                        value={terminalToken}
                        placeholder="Click generate to create a token"
                        style={{ marginTop: '8px' }}
                        suffix={
                          <Tooltip title="Copy Token">
                            <Button 
                              type="text" 
                              size="small" 
                              icon={<CopyOutlined />} 
                              disabled={!terminalToken}
                              onClick={() => {
                                navigator.clipboard.writeText(terminalToken);
                                message.success("Token copied to clipboard!");
                              }}
                            />
                          </Tooltip>
                        }
                      />
                    </Col>
                    <Col xs={24} sm={8}>
                      <Button 
                        type="primary" 
                        onClick={handleGenerateToken} 
                        block
                        style={{ marginTop: '24px' }}
                      >
                        Generate New Token
                      </Button>
                    </Col>
                  </Row>

                  <Divider />

                  {/* --- NAYA IZAFA: Backup & Restore UI --- */}
                  <Title level={4} style={{ fontSize: '16px' }}>Offline Data Backup (PC Transfer)</Title>
                  <Text type="secondary" style={{ display: 'block', marginBottom: '16px' }}>
                    Save a safe copy of your shop's data. If your internet is down and you need to change your computer, download this backup and restore it on the new PC so you don't lose any records.
                  </Text>
                  
                  <Row gutter={[16, 16]} align="middle">
                    <Col xs={24} sm={8}>
                      <Button 
                        type="primary" 
                        onClick={handleBackup} 
                        loading={isBackupLoading}
                        block
                      >
                        Download Backup
                      </Button>
                    </Col>
                    <Col xs={24} sm={8}>
                      <input 
                        type="file" 
                        id="restore-upload" 
                        accept=".json" 
                        style={{ display: 'none' }} 
                        onChange={handleRestore}
                      />
                      <Button 
                        danger
                        loading={isRestoreLoading}
                        onClick={() => document.getElementById('restore-upload').click()}
                        block
                      >
                        Restore Backup
                      </Button>
                    </Col>
                  </Row>
                </div>
              ),
            },
            {
              key: '4',
              label: 'Navigation',
              icon: <CompassOutlined />,
              children: (
                <div style={{ padding: '16px 0' }}>
                  <Title level={4} style={{ fontSize: '16px' }}>Mobile Navigation (Bottom Bar)</Title>
                  <Row align="middle" gutter={[16, 16]}>
                    <Col xs={24} sm={6}><Text strong>Enable or Disable Bottom Bar</Text></Col>
                    <Col xs={24} sm={18}><Switch checked={mobileNavEnabled} onChange={setMobileNavEnabled} /></Col>
                  </Row>
                  {mobileNavEnabled && (
                    <Row align="middle" gutter={[16, 16]} style={{ marginTop: '16px' }}>
                      <Col xs={24} sm={6}><Text strong>Mobile Shortcuts (Max 4)</Text></Col>
                      <Col xs={24} sm={18}>
                        <Select mode="multiple" style={{ width: '100%' }} value={mobileNavItems} 
                          onChange={(vals) => vals.length <= 4 ? setMobileNavItems(vals) : message.warning('Max 4 for Mobile')}
                          options={navOptions} 
                        />
                      </Col>
                    </Row>
                  )}

                  <Divider />

                  <Title level={4} style={{ fontSize: '16px' }}>Desktop Navigation (Floating Bar)</Title>
                  <Row align="middle" gutter={[16, 16]} style={{ marginTop: '16px' }}>
                    <Col xs={24} sm={6}><Text strong>Enable or Disable Floating Bar</Text></Col>
                    <Col xs={24} sm={18}><Switch checked={desktopNavEnabled} onChange={setDesktopNavEnabled} /></Col>
                  </Row>
                  {desktopNavEnabled && (
                    <>
                      <Row align="middle" gutter={[16, 16]} style={{ marginTop: '16px' }}>
                        <Col xs={24} sm={6}>
                          <Text strong>Desktop Shortcuts (Max 10)</Text>
                          <Text type="secondary" style={{ display: 'block' }}>Choose icons for your floating bar.</Text>
                        </Col>
                        <Col xs={24} sm={18}>
                          <Select 
                            mode="multiple" 
                            style={{ width: '100%' }} 
                            placeholder="Select up to 10 shortcuts" 
                            value={desktopNavItems} 
                            onChange={(values) => values.length <= 10 ? setDesktopNavItems(values) : message.warning('You can only select up to 10 shortcuts for desktop')}
                            options={navOptions} 
                          />
                        </Col>
                      </Row>
                      <Row align="middle" gutter={[16, 16]} style={{ marginTop: '16px' }}>
                        <Col xs={24} sm={6}>
                          <Text strong>Bar Position</Text>
                          <Text type="secondary" style={{ display: 'block' }}>Where should the floating bar appear?</Text>
                        </Col>
                        <Col xs={24} sm={18}>
                          <Radio.Group 
                            value={desktopNavPosition} 
                            onChange={(e) => setDesktopNavPosition(e.target.value)}
                            buttonStyle="solid"
                          >
                            <Radio.Button value="bottom">Bottom Center</Radio.Button>
                            <Radio.Button value="right">Right Side</Radio.Button>
                          </Radio.Group>
                        </Col>
                      </Row>
                    </>
                  )}
                </div>
              ),
            },
            {
              key: '6',
              label: 'Registers & Accounts',
              icon: <ShopOutlined />,
              children: (
                <div style={{ padding: '16px 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div>
                      <Title level={4} style={{ margin: 0, fontSize: '16px' }}>Shop Counters</Title>
                      <Text type="secondary">Define your physical shop counters for sales.</Text>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <Button 
                        type="primary" 
                        icon={registers.length >= (limits.max_counters || 1) ? <LockOutlined /> : <PlusOutlined />} 
                        disabled={registers.length >= (limits.max_counters || 1)}
                        onClick={() => { setEditingRegister(null); setRegName(''); setRegType('counter'); setIsRegisterModalVisible(true); }}
                      >
                        Add Counter
                      </Button>
                      {registers.length >= (limits.max_counters || 1) && (
                        <Text type="warning" style={{ display: 'block', fontSize: '11px', marginTop: '4px' }}>
                          Limit reached ({limits.max_counters || 1})
                        </Text>
                      )}
                    </div>
                  </div>

                  <Row gutter={[16, 16]}>
                    {registers.map((reg, index) => (
                      <Col xs={24} sm={12} md={8} key={reg.id}>
                        <Card size="small" actions={
                          index === 0 
                          ?[
                              <EditOutlined key="edit" onClick={() => { setEditingRegister(reg); setRegName(reg.name); setRegType(reg.type); setIsRegisterModalVisible(true); }} />
                            ]
                          :[
                              <EditOutlined key="edit" onClick={() => { setEditingRegister(reg); setRegName(reg.name); setRegType(reg.type); setIsRegisterModalVisible(true); }} />,
                              <Popconfirm title="Delete this counter?" onConfirm={() => deleteRegister(reg.id)}>
                                <DeleteOutlined key="delete" style={{ color: token.colorError }} />
                              </Popconfirm>
                            ]
                        }>
                          <Card.Meta 
                            avatar={<ShopOutlined style={{ fontSize: '24px', color: token.colorPrimary }} />}
                            title={reg.name}
                            description={"Sales Counter"}
                          />
                          <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <Text type="secondary">Status: </Text>
                              <Text strong style={{ color: reg.status === 'open' ? token.colorSuccess : token.colorTextDescription }}>
                                {reg.status.toUpperCase()}
                              </Text>
                            </div>
                            
                            {pairedRegisterId === reg.id ? (
                              <Button size="small" danger onClick={handleUnpairDevice}>
                                Unpair PC
                              </Button>
                            ) : (
                              <Button size="small" type="primary" ghost onClick={() => handlePairDevice(reg.id)}>
                                Pair this PC
                              </Button>
                            )}
                          </div>
                          {pairedRegisterId === reg.id && (
                            <div style={{ marginTop: '8px', background: token.colorSuccess + '22', padding: '4px 8px', borderRadius: '4px', textAlign: 'center' }}>
                              <Text type="success" style={{ fontSize: '11px', fontWeight: 'bold' }}>✓ THIS PC IS PAIRED HERE</Text>
                            </div>
                          )}
                        </Card>
                      </Col>
                    ))}
                    {registers.length === 0 && (
                      <Col span={24}>
                        <Alert message="No Counters Defined" description="Please add at least one 'Counter' to start making sales." type="warning" showIcon />
                      </Col>
                    )}
                  </Row>

                  <Modal
                    title={editingRegister ? "Edit Counter" : "Add New Counter"}
                    open={isRegisterModalVisible}
                    onCancel={() => setIsRegisterModalVisible(false)}
                    onOk={handleAddRegister}
                  >
                    <div style={{ marginTop: '16px' }}>
                      <Text strong>Node Name</Text>
                      <Input placeholder="e.g. Front Counter" value={regName} onChange={e => setRegName(e.target.value)} style={{ marginTop: '8px', marginBottom: '16px' }} />
                    </div>
                  </Modal>

                  <Divider style={{ margin: '32px 0' }} />

                  {/* --- NAYA IZAFA: Payment Accounts Section --- */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div>
                      <Title level={4} style={{ margin: 0, fontSize: '16px' }}>Payment Accounts & Wallets</Title>
                      <Text type="secondary">Manage your Banks, Mobile Wallets, and Cash accounts.</Text>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <Button 
                        type="primary" 
                        icon={<PlusOutlined />} 
                        onClick={() => { setEditingAccount(null); setAccountName(''); setAccountType('Bank'); setAccountBalance(0); setIsAccountModalVisible(true); }}
                      >
                        Add Account
                      </Button>
                    </div>
                  </div>

                  <Row gutter={[16, 16]}>
                    {paymentAccounts.map((acc) => (
                      <Col xs={24} sm={12} md={8} key={acc.id}>
                        <Card size="small" actions={
                          acc.is_default
                          ?[
                              <EditOutlined key="edit" onClick={() => { setEditingAccount(acc); setAccountName(acc.name); setAccountType(acc.type); setAccountBalance(acc.opening_balance); setIsAccountModalVisible(true); }} />
                            ]
                          :[
                              <EditOutlined key="edit" onClick={() => { setEditingAccount(acc); setAccountName(acc.name); setAccountType(acc.type); setAccountBalance(acc.opening_balance); setIsAccountModalVisible(true); }} />,
                              <Popconfirm title="Delete this account?" onConfirm={() => deleteAccount(acc.id, acc.is_default, acc.name)}>
                                <DeleteOutlined key="delete" style={{ color: token.colorError }} />
                              </Popconfirm>
                            ]
                        }>
                          <Card.Meta 
                            avatar={acc.type === 'Cash' ? <WalletOutlined style={{ fontSize: '24px', color: token.colorSuccess }} /> : <BankOutlined style={{ fontSize: '24px', color: token.colorInfo }} />}
                            title={
                              <Space>
                                {acc.name}
                                {acc.is_default && <Tag color="blue" style={{ fontSize: '10px', margin: 0 }}>Default</Tag>}
                              </Space>
                            }
                            description={acc.type}
                          />
                        </Card>
                      </Col>
                    ))}
                    {paymentAccounts.length === 0 && (
                      <Col span={24}>
                        <Text type="secondary">No custom accounts added yet.</Text>
                      </Col>
                    )}
                  </Row>

                  <Modal
                    title={editingAccount ? "Edit Account" : "Add New Account"}
                    open={isAccountModalVisible}
                    onCancel={() => setIsAccountModalVisible(false)}
                    onOk={handleAddAccount}
                  >
                    <div style={{ marginTop: '16px' }}>
                      <Text strong>Account Name</Text>
                      <Input placeholder="e.g. Meezan Bank, JazzCash" value={accountName} onChange={e => setAccountName(e.target.value)} style={{ marginTop: '8px', marginBottom: '16px' }} />
                      
                      <Text strong>Account Type</Text>
                      <Select value={accountType} onChange={setAccountType} style={{ width: '100%', marginTop: '8px', marginBottom: '16px' }}>
                        <Select.Option value="Bank">Bank Account</Select.Option>
                        <Select.Option value="Wallet">Mobile Wallet (JazzCash/Easypaisa)</Select.Option>
                      </Select>

                      <Text strong>Opening Balance</Text>
                      <InputNumber 
                        style={{ width: '100%', marginTop: '8px' }} 
                        value={accountBalance} 
                        onChange={setAccountBalance} 
                        min={0}
                        disabled={editingAccount && editingAccount.is_default}
                      />
                    </div>
                  </Modal>

                </div>
              ),
            },
            {
              key: '7',
              label: 'Shortcuts',
              icon: <ToolOutlined />,
              children: (
                <div style={{ padding: '16px 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div>
                      <Title level={4} style={{ margin: 0, fontSize: '16px' }}>Keyboard Shortcuts</Title>
                      <Text type="secondary">Customize keyboard shortcuts to speed up your workflow.</Text>
                    </div>
                    <Button 
                      onClick={() => {
                        setCustomShortcuts(DEFAULT_SHORTCUTS);
                        message.success('Shortcuts reset to default.');
                      }}
                    >
                      Reset to Defaults
                    </Button>
                  </div>

                  <Alert 
                    message={recordingShortcutFor ? `Press the keys for: ${recordingShortcutFor.replace(/_/g, ' ').toUpperCase()} (Press ESC to cancel)` : "Click 'Edit' next to a shortcut, then press your desired key combination (e.g., Alt + K)."} 
                    type={recordingShortcutFor ? "warning" : "info"} 
                    showIcon 
                    style={{ marginBottom: '16px' }}
                  />

                  {/* 1. Global Navigation */}
                  <Title level={5} style={{ fontSize: '14px', marginTop: '16px', marginBottom: '12px' }}>Global Navigation (All Pages)</Title>
                  <Row gutter={[12, 12]}>
                    {[
                      { key: 'nav_home', label: 'Dashboard' },
                      { key: 'nav_inventory', label: 'Inventory' },
                      { key: 'nav_pos', label: 'Point of Sale' },
                      { key: 'nav_warranty', label: 'Warranty & Claims' },
                      { key: 'nav_purchases', label: 'Purchase Orders' },
                      { key: 'nav_customers', label: 'Customers' },
                      { key: 'nav_suppliers', label: 'Suppliers' },
                      { key: 'nav_sales_history', label: 'Sales History' },
                      { key: 'nav_expenses', label: 'Expenses' },
                      { key: 'nav_damaged_stock', label: 'Damaged Stock' },
                      { key: 'nav_reports', label: 'Reports' },
                      { key: 'nav_staff', label: 'Staff / Team' },
                      { key: 'nav_settings', label: 'App Settings' },
                      { key: 'global_search', label: 'Universal Search' }
                    ].map(item => (
                      <Col xs={24} sm={12} md={8} lg={12} xl={8} key={item.key}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 12px', background: token.colorFillAlter, borderRadius: '6px', border: `1px solid ${token.colorBorderSecondary}` }}>
                          <Text>{item.label}</Text>
                          <Space>
                            <Tag color={recordingShortcutFor === item.key ? 'orange' : 'blue'} style={{ margin: 0 }}>
                              {customShortcuts[item.key]?.toUpperCase() || 'NONE'}
                            </Tag>
                            <Button size="small" type="link" onClick={() => setRecordingShortcutFor(item.key)}>Edit</Button>
                          </Space>
                        </div>
                      </Col>
                    ))}
                  </Row>

                  <Divider />

                  {/* 2. POS Shortcuts */}
                  <Title level={5} style={{ fontSize: '14px', marginBottom: '12px' }}>Point of Sale (POS) Actions</Title>
                  <Row gutter={[12, 12]}>
                    {[
                      { key: 'pos_search', label: 'Search / Scan Item' },
                      { key: 'pos_customer_search', label: 'Select Customer' },
                      { key: 'pos_add_customer', label: 'Add New Customer' },
                      { key: 'pos_discount', label: 'Focus Discount' },
                      { key: 'pos_pay_cash', label: 'Payment: Cash' },
                      { key: 'pos_pay_bank', label: 'Payment: Bank' },
                      { key: 'pos_pay_later', label: 'Payment: Pay Later' },
                      { key: 'pos_hold_bill', label: 'Hold Bill / Draft' },
                      { key: 'pos_view_drafts', label: 'View Drafts' }, // NAYA IZAFA
                      { key: 'pos_checkout', label: 'Complete Sale' },
                      { key: 'pos_reset', label: 'Reset Bill' }
                    ].map(item => (
                      <Col xs={24} sm={12} md={8} lg={12} xl={8} key={item.key}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 12px', background: token.colorFillAlter, borderRadius: '6px', border: `1px solid ${token.colorBorderSecondary}` }}>
                          <Text>{item.label}</Text>
                          <Space>
                            <Tag color={recordingShortcutFor === item.key ? 'orange' : 'green'} style={{ margin: 0 }}>
                              {customShortcuts[item.key]?.toUpperCase() || 'NONE'}
                            </Tag>
                            <Button size="small" type="link" onClick={() => setRecordingShortcutFor(item.key)}>Edit</Button>
                          </Space>
                        </div>
                      </Col>
                    ))}
                  </Row>

                  <Divider />

                  {/* 3. Inventory Shortcuts */}
                  <Title level={5} style={{ fontSize: '14px' }}>Inventory</Title>
                  <Row align="middle" gutter={[16, 16]} style={{ marginBottom: '8px' }}>
                    <Col xs={12} sm={8}><Text>Add New Product</Text></Col>
                    <Col xs={12} sm={16}>
                      <Space>
                        <Tag color={recordingShortcutFor === 'inv_add' ? 'orange' : 'purple'} style={{ fontSize: '14px', padding: '4px 8px' }}>{customShortcuts.inv_add?.toUpperCase()}</Tag>
                        <Button size="small" type="link" onClick={() => setRecordingShortcutFor('inv_add')}>Edit</Button>
                      </Space>
                    </Col>
                  </Row>
                  <Row align="middle" gutter={[16, 16]} style={{ marginBottom: '8px' }}>
                    <Col xs={12} sm={8}><Text>Focus Search</Text></Col>
                    <Col xs={12} sm={16}>
                      <Space>
                        <Tag color={recordingShortcutFor === 'inv_search' ? 'orange' : 'purple'} style={{ fontSize: '14px', padding: '4px 8px' }}>{customShortcuts.inv_search?.toUpperCase()}</Tag>
                        <Button size="small" type="link" onClick={() => setRecordingShortcutFor('inv_search')}>Edit</Button>
                      </Space>
                    </Col>
                  </Row>
                  <Row align="middle" gutter={[16, 16]} style={{ marginBottom: '8px' }}>
                    <Col xs={12} sm={8}><Text>Reset Filters</Text></Col>
                    <Col xs={12} sm={16}>
                      <Space>
                        <Tag color={recordingShortcutFor === 'inv_reset' ? 'orange' : 'purple'} style={{ fontSize: '14px', padding: '4px 8px' }}>{customShortcuts.inv_reset?.toUpperCase()}</Tag>
                        <Button size="small" type="link" onClick={() => setRecordingShortcutFor('inv_reset')}>Edit</Button>
                      </Space>
                    </Col>
                  </Row>

                  <Divider />

                  {/* 4. Categories Shortcuts */}
                  <Title level={5} style={{ fontSize: '14px' }}>Categories</Title>
                  <Row align="middle" gutter={[16, 16]} style={{ marginBottom: '8px' }}>
                    <Col xs={12} sm={8}><Text>Add New Category</Text></Col>
                    <Col xs={12} sm={16}>
                      <Space>
                        <Tag color={recordingShortcutFor === 'cat_add' ? 'orange' : 'magenta'} style={{ fontSize: '14px', padding: '4px 8px' }}>{customShortcuts.cat_add?.toUpperCase()}</Tag>
                        <Button size="small" type="link" onClick={() => setRecordingShortcutFor('cat_add')}>Edit</Button>
                      </Space>
                    </Col>
                  </Row>
                  <Row align="middle" gutter={[16, 16]} style={{ marginBottom: '8px' }}>
                    <Col xs={12} sm={8}><Text>Add New Attribute</Text></Col>
                    <Col xs={12} sm={16}>
                      <Space>
                        <Tag color={recordingShortcutFor === 'cat_attr_add' ? 'orange' : 'magenta'} style={{ fontSize: '14px', padding: '4px 8px' }}>{customShortcuts.cat_attr_add?.toUpperCase()}</Tag>
                        <Button size="small" type="link" onClick={() => setRecordingShortcutFor('cat_attr_add')}>Edit</Button>
                      </Space>
                    </Col>
                  </Row>

                  <Divider />

                  {/* 5. Purchases Shortcuts */}
                  <Title level={5} style={{ fontSize: '14px' }}>Purchases</Title>
                  <Row align="middle" gutter={[16, 16]} style={{ marginBottom: '8px' }}>
                    <Col xs={12} sm={8}><Text>Focus Search</Text></Col>
                    <Col xs={12} sm={16}>
                      <Space>
                        <Tag color={recordingShortcutFor === 'pur_search' ? 'orange' : 'volcano'} style={{ fontSize: '14px', padding: '4px 8px' }}>{customShortcuts.pur_search?.toUpperCase()}</Tag>
                        <Button size="small" type="link" onClick={() => setRecordingShortcutFor('pur_search')}>Edit</Button>
                      </Space>
                    </Col>
                  </Row>
                  <Row align="middle" gutter={[16, 16]} style={{ marginBottom: '8px' }}>
                    <Col xs={12} sm={8}><Text>Create New Purchase</Text></Col>
                    <Col xs={12} sm={16}>
                      <Space>
                        <Tag color={recordingShortcutFor === 'pur_add' ? 'orange' : 'volcano'} style={{ fontSize: '14px', padding: '4px 8px' }}>{customShortcuts.pur_add?.toUpperCase()}</Tag>
                        <Button size="small" type="link" onClick={() => setRecordingShortcutFor('pur_add')}>Edit</Button>
                      </Space>
                    </Col>
                  </Row>

                  <Divider />

                  {/* 6. Customers Shortcuts */}
                  <Title level={5} style={{ fontSize: '14px' }}>Customers</Title>
                  <Row align="middle" gutter={[16, 16]} style={{ marginBottom: '8px' }}>
                    <Col xs={12} sm={8}><Text>Focus Search</Text></Col>
                    <Col xs={12} sm={16}>
                      <Space>
                        <Tag color={recordingShortcutFor === 'cust_search' ? 'orange' : 'cyan'} style={{ fontSize: '14px', padding: '4px 8px' }}>{customShortcuts.cust_search?.toUpperCase()}</Tag>
                        <Button size="small" type="link" onClick={() => setRecordingShortcutFor('cust_search')}>Edit</Button>
                      </Space>
                    </Col>
                  </Row>
                  <Row align="middle" gutter={[16, 16]} style={{ marginBottom: '8px' }}>
                    <Col xs={12} sm={8}><Text>Add New Customer</Text></Col>
                    <Col xs={12} sm={16}>
                      <Space>
                        <Tag color={recordingShortcutFor === 'cust_add' ? 'orange' : 'cyan'} style={{ fontSize: '14px', padding: '4px 8px' }}>{customShortcuts.cust_add?.toUpperCase()}</Tag>
                        <Button size="small" type="link" onClick={() => setRecordingShortcutFor('cust_add')}>Edit</Button>
                      </Space>
                    </Col>
                  </Row>

                  <Divider />

                  {/* 7. Suppliers Shortcuts */}
                  <Title level={5} style={{ fontSize: '14px' }}>Suppliers</Title>
                  <Row align="middle" gutter={[16, 16]} style={{ marginBottom: '8px' }}>
                    <Col xs={12} sm={8}><Text>Focus Search</Text></Col>
                    <Col xs={12} sm={16}>
                      <Space>
                        <Tag color={recordingShortcutFor === 'sup_search' ? 'orange' : 'geekblue'} style={{ fontSize: '14px', padding: '4px 8px' }}>{customShortcuts.sup_search?.toUpperCase()}</Tag>
                        <Button size="small" type="link" onClick={() => setRecordingShortcutFor('sup_search')}>Edit</Button>
                      </Space>
                    </Col>
                  </Row>
                  <Row align="middle" gutter={[16, 16]} style={{ marginBottom: '8px' }}>
                    <Col xs={12} sm={8}><Text>Add New Supplier</Text></Col>
                    <Col xs={12} sm={16}>
                      <Space>
                        <Tag color={recordingShortcutFor === 'sup_add' ? 'orange' : 'geekblue'} style={{ fontSize: '14px', padding: '4px 8px' }}>{customShortcuts.sup_add?.toUpperCase()}</Tag>
                        <Button size="small" type="link" onClick={() => setRecordingShortcutFor('sup_add')}>Edit</Button>
                      </Space>
                    </Col>
                  </Row>

                </div>
              ),
            },
          ]} 
        />
        
        <Divider />
        
        <Row>
          <Col span={24}>
            <Button 
              type="primary" 
              size="large"
              block={isMobile}
              onClick={(e) => handleGeneralSettingsSave(e)} 
              loading={isSaving}
              disabled={!profile || (
                selectedCurrency === profile.currency && 
                receiptFormat === profile.receipt_format &&
                fbrIntegrationEnabled === (profile.fbr_integration_enabled ?? false) &&
                fbrPosId === (profile.fbr_pos_id ?? '') &&
                fbrNtn === (profile.fbr_ntn ?? '') &&
                fbrFee === (profile.fbr_fee ?? 1) &&
                province === (profile.province ?? 'Sindh') &&
                lowStockAlerts === profile.low_stock_alerts_enabled &&
                lowStockThreshold === profile.low_stock_threshold &&
                warrantyPolicy === profile.warranty_policy && 
                quotationPolicy === profile.quotation_policy &&
                quotationValidityDays === profile.quotation_validity_days &&
                staffDiscountLimit === profile.staff_discount_limit &&
                reprintButtonEnabled === profile.reprint_button_enabled &&
                qrCodeEnabled === profile.qr_code_enabled &&
                warrantySystemEnabled === profile.warranty_system_enabled &&
                posDiscountEnabled === profile.pos_discount_enabled &&
                taxEnabled === (profile.tax_enabled ?? false) &&
                taxName === (profile.tax_name ?? 'GST') &&
                taxRate === (profile.tax_rate ?? 0) &&
                allowCartPriceChange === (profile.allow_cart_price_change ?? true) &&
                wholesalePricingEnabled === (profile.wholesale_pricing_enabled ?? false) &&
                enableCustomerCreditLimits === (profile.enable_customer_credit_limits ?? false) &&
                mobileNavEnabled === profile.mobile_nav_enabled &&
                desktopNavEnabled === profile.desktop_nav_enabled && 
                JSON.stringify(mobileNavItems) === JSON.stringify(profile.mobile_nav_items) &&
                JSON.stringify(desktopNavItems) === JSON.stringify(profile.desktop_nav_items) &&
                desktopNavPosition === (profile.desktop_nav_position || 'bottom') &&
                themeMode === (profile.theme_mode || 'light') &&
                JSON.stringify(customShortcuts) === JSON.stringify(profile.custom_shortcuts || DEFAULT_SHORTCUTS)
              )}
            >
              Save All Settings
            </Button>
          </Col>
        </Row>
      </Card>
    </div>
    </ConfigProvider>
  );
};

export default SettingsPage;