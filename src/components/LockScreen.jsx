import React, { useState } from 'react';
import { Input, Button, Typography, Card, App, theme } from 'antd';
import { LockOutlined, SafetyOutlined } from '@ant-design/icons';
import { useStaff } from '../context/StaffContext';
import bcrypt from 'bcryptjs';
import { db } from '../db';
import { useAuth } from '../context/AuthContext'; // Naya Import

const { Title, Text } = Typography;

const LockScreen = () => {
  const [pin, setPin] = useState('');
  const[localError, setLocalError] = useState(''); // NAYA: Screen par error dikhane ke liye
  const { loginStaff, unlockAsOwner } = useStaff();
  const { message } = App.useApp();
  const { user } = useAuth(); // User ki maloomat nikaali
  const { token } = theme.useToken(); // Theme colors nikaalne ke liye

  // Check karein ke kya Owner ne pehli baar lock kiya hai aur Master PIN set karna baqi hai?
  const isSetupNeeded = !localStorage.getItem('device_master_pin');

  const handleAction = async () => {
    setLocalError(''); // Pehle purana error saaf karein
    
    if (!pin) {
      setLocalError("Please enter a PIN");
      return;
    }

    if (isSetupNeeded) {
      if (pin.length !== 6) {
        message.error("Master PIN must be exactly 6 digits");
        return;
      }
      const hashedPin = bcrypt.hashSync(pin, 10);
      localStorage.setItem('device_master_pin', hashedPin);
      message.success("Master PIN set successfully!");
      setPin('');
      return;
    }

    // 1. Pehle check karein ke kya App Locked hai? (Unified Lock)
    const lockUntil = localStorage.getItem('app_lock_until');
    if (lockUntil && Date.now() < parseInt(lockUntil)) {
      const remainingMinutes = Math.ceil((parseInt(lockUntil) - Date.now()) / 60000);
      setLocalError(`Terminal is temporarily locked. Try again in ${remainingMinutes} minutes.`);
      setPin('');
      return;
    }

    // 2. Koshish karein (Pehle Staff, Phir Owner) - Khamoshi se
    let isSuccess = false;

    // Pehle Staff Login Try karein
    const staffResult = await loginStaff(pin);
    if (staffResult.success) {
      isSuccess = true;
    } 
    // Agar Staff fail hua, to Owner Try karein
    else {
      const ownerSuccess = unlockAsOwner(pin);
      if (ownerSuccess) {
        isSuccess = true;
      }
    }

    // 3. Nateeja (Result)
    if (isSuccess) {
      // Agar kamyab ho gaye to purani ghalat koshishein bhool jayen
      localStorage.removeItem('failed_attempts');
      localStorage.removeItem('app_lock_until');
      setLocalError('');
    } else {
      // Agar nakaam hue to ginti barhayen (Chahe Staff ho ya Owner)
      let attempts = parseInt(localStorage.getItem('failed_attempts') || '0') + 1;
      localStorage.setItem('failed_attempts', attempts.toString());

      // Agar 5 bar ghalat hua to 5 minute ke liye lock
      if (attempts >= 5) {
        const unlockTime = Date.now() + 5 * 60 * 1000; // 5 Minutes Lock
        localStorage.setItem('app_lock_until', unlockTime.toString());
        
        // --- SILENT ALARM (SYSTEM LOGS) ---
        const logData = {
            id: crypto.randomUUID(),
            user_id: user?.id, 
            level: 'warning',
            category: 'security',
            message: `Security Alert: 5 failed PIN attempts detected at ${new Date().toLocaleTimeString()}.`,
            device_info: {
              browser: navigator.userAgent.split(') ')[1] || 'Unknown Browser',
              platform: navigator.platform,
              url: window.location.href
            },
            created_at: new Date().toISOString()
        };

        if (db.system_logs) {
          try {
            await db.system_logs.add(logData);
            await db.sync_queue.add({ table_name: 'system_logs', action: 'create', data: logData });
          } catch (err) {
            console.error("Logging failed:", err);
          }
        }
        setLocalError("Too many failed attempts. Terminal locked for 5 minutes.");
      } else {
        // Generic Error Message (Taake length ka pata na chale)
        setLocalError("Invalid PIN");
      }
    }
    setPin('');
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      zIndex: 99999,
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      flexDirection: 'column',
      // Theme-based Background with Texture
      backgroundColor: token.colorBgLayout,
      backgroundImage: `radial-gradient(${token.colorTextQuaternary} 1px, transparent 1px)`,
      backgroundSize: '20px 20px', // Halka sa texture
    }}>
      <Card style={{ 
        width: 350, 
        textAlign: 'center', 
        borderRadius: token.borderRadiusLG, 
        boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
        background: token.colorBgContainer, // Card ka rang theme ke mutabiq
        border: `1px solid ${token.colorBorderSecondary}`
      }}>
        
        {isSetupNeeded ? 
          <SafetyOutlined style={{ fontSize: 48, color: token.colorSuccess, marginBottom: 16 }} /> : 
          <LockOutlined style={{ fontSize: 48, color: token.colorPrimary, marginBottom: 16 }} />
        }

        <Title level={3} style={{ color: token.colorTextHeading }}>
          {isSetupNeeded ? "Setup Master PIN" : "Terminal Locked"}
        </Title>

        <Text style={{ display: 'block', marginBottom: localError ? 12 : 24, color: token.colorTextSecondary }}>
          {isSetupNeeded ? "Set your Master PIN to secure this device." : "Enter your PIN to unlock"}
        </Text>

        {/* Theme-based Error Box */}
        {localError && (
          <div style={{ 
            color: token.colorError, 
            backgroundColor: token.colorErrorBg, 
            padding: '8px 12px', 
            borderRadius: '6px', 
            marginBottom: '16px', 
            fontSize: '13px', 
            border: `1px solid ${token.colorErrorBorder}`,
            textAlign: 'left'
          }}>
            {localError}
          </div>
        )}

        <Input.Password
          size="large"
          placeholder="Enter PIN"
          maxLength={10}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))}
          onPressEnter={handleAction}
          style={{ 
            textAlign: 'center', 
            fontSize: 24, 
            letterSpacing: 8, 
            marginBottom: 16,
            backgroundColor: token.colorBgContainer,
            color: token.colorText
          }}
          autoFocus
        />

        <Button type="primary" size="large" block onClick={handleAction}>
          {isSetupNeeded ? "Save Master PIN" : "Unlock"}
        </Button>
      </Card>
    </div>
  );
};

export default LockScreen;