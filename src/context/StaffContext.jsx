import React, { createContext, useState, useContext, useEffect } from 'react';
import DataService from '../DataService';
import { App } from 'antd';
import { db } from '../db'; // Naya Import
import { getPlanLimits } from '../config/subscriptionPlans'; // Naya Import
import { useAuth } from './AuthContext'; // Naya Import
import bcrypt from 'bcryptjs';

const StaffContext = createContext();

export const StaffProvider = ({ children }) => {
  const [activeStaff, setActiveStaff] = useState(null);
  // NAYA: App ko initialize hi locked halat mein karein agar flag set hai (No Flicker Fix)
  const [isAppLocked, setIsAppLocked] = useState(localStorage.getItem('is_app_locked') === 'true');
  const { message } = App.useApp();
  const { profile } = useAuth(); // Plan check karne ke liye profile nikala
  // useApp wali line yahan se hata di gayi hai

  useEffect(() => {
    // Page refresh hone par check karein ke kya app lock thi ya staff login tha?
    const savedStaff = localStorage.getItem('active_staff_session');
    if (savedStaff) setActiveStaff(JSON.parse(savedStaff));

    const locked = localStorage.getItem('is_app_locked');
    if (locked === 'true') setIsAppLocked(true);
  }, []);

  // Staff Login
  const loginStaff = async (pin) => {
    try {
      const staff = await DataService.verifyStaffPin(pin);
      if (staff) {
        
        // --- SMART GATEKEEPER LOGIC START ---
        const limits = getPlanLimits(profile?.subscription_tier);
        const maxStaffAllowed = limits.max_staff;

        // 1. Saare active staff ko ban'ne ki tarteeb (oldest first) se mangwayein
        const allActiveStaff = await db.staff_members
          .filter(s => s.is_active !== false)
          .sortBy('created_at');

        // 2. Check karein ke jo login kar raha hai, uska number list mein kya hai?
        const staffIndex = allActiveStaff.findIndex(s => s.id === staff.id);

        // 3. Agar uska number limit se bahar hai, to rok dein!
        // (Maslan limit 1 hai, aur iska index 1 ya us se zyada hai, yani yeh 2nd ya 3rd banda hai)
        if (staffIndex >= maxStaffAllowed) {
          return { 
            success: false, 
            errorMsg: `Plan Limit Reached: Your plan allows ${maxStaffAllowed} staff. Please ask owner to archive extra staff.` 
          };
        }
        // --- SMART GATEKEEPER LOGIC END ---

        setActiveStaff(staff);
        setIsAppLocked(false);
        localStorage.setItem('active_staff_session', JSON.stringify(staff));
        localStorage.setItem('is_app_locked', 'false');
        message.success(`Welcome, ${staff.name}!`);
        return { success: true };
      } else {
        return { success: false, errorMsg: 'Invalid PIN Code' };
      }
    } catch (error) {
      return { success: false, errorMsg: 'System error during login' };
    }
  };

  // Owner Unlock (Master PIN ke zariye - Offline Safe)
  const unlockAsOwner = (pin) => {
    const masterPin = localStorage.getItem('device_master_pin');
    
    // Check 1: Agar Master PIN set hi nahi hai (First time)
    if (!masterPin) return false;

    let isMatch = false;

    // Check 2: Kya yeh Hashed PIN hai? (Jo $2 se shuru hota hai)
    if (masterPin.startsWith('$2')) {
        isMatch = bcrypt.compareSync(pin, masterPin);
    } 
    // Check 3: Purana Plain Text PIN (Legacy Support)
    else {
        isMatch = (pin === masterPin);
    }

    if (isMatch) {
        setActiveStaff(null);
        setIsAppLocked(false);
        localStorage.removeItem('active_staff_session');
        localStorage.setItem('is_app_locked', 'false');
        message.success('Unlocked as Owner');
        return true;
    } else {
        // Security by obscurity: Generic error
        message.error('Invalid PIN');
        return false;
    }
  };

  // NAYA: Sirf Master PIN verify karne ke liye (Baghair logout kiye)
  const verifyMasterPin = (pin) => {
    const masterPin = localStorage.getItem('device_master_pin');
    if (!masterPin) return false;

    if (masterPin.startsWith('$2')) {
      return bcrypt.compareSync(pin, masterPin);
    }
    return pin === masterPin;
  };

  // App ko Lock karna
  const lockApp = () => {
    // Check: Kya Master PIN set hai?
    const masterPin = localStorage.getItem('device_master_pin');
    if (!masterPin) {
      message.warning('Security Action Required: Please set your Master PIN in Settings before locking the terminal.');
      return; // Lock hone se rok dein
    }

    setActiveStaff(null);
    setIsAppLocked(true);
    localStorage.removeItem('active_staff_session');
    localStorage.setItem('is_app_locked', 'true');
    message.info('Terminal Locked');
  };

  // Permissions Check
  const can = (permissionName) => {
    if (!activeStaff) return true; // Owner sab kuch kar sakta hai
    return activeStaff.permissions && activeStaff.permissions[permissionName] === true;
  };

  return (
    <StaffContext.Provider value={{ activeStaff, isAppLocked, loginStaff, lockApp, unlockAsOwner, verifyMasterPin, can }}>
      {children}
    </StaffContext.Provider>
  );
};

export const useStaff = () => useContext(StaffContext);