import React, { useState } from 'react';
import { Input, Button, Typography, Card, App } from 'antd';
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

    if (pin.length === 4) {
      const result = await loginStaff(pin);
      if (!result.success) {
        setLocalError(result.errorMsg); // Error screen par set kar diya
      }
    } else if (pin.length === 6) {
      const lockUntil = localStorage.getItem('owner_lock_until');
      if (lockUntil && Date.now() < parseInt(lockUntil)) {
        setLocalError("Terminal is temporarily locked due to multiple failed attempts.");
        setPin('');
        return;
      }

      const success = unlockAsOwner(pin);
      
      if (success) {
        localStorage.removeItem('owner_failed_attempts');
        localStorage.removeItem('owner_lock_until');
      } else {
        let attempts = parseInt(localStorage.getItem('owner_failed_attempts') || '0') + 1;
        localStorage.setItem('owner_failed_attempts', attempts.toString());
        
        if (attempts >= 3) {
          const unlockTime = Date.now() + 5 * 60 * 1000;
          localStorage.setItem('owner_lock_until', unlockTime.toString());
          
          // --- SILENT ALARM (SYSTEM LOGS) ---
          const logData = {
              id: crypto.randomUUID(),
              user_id: user?.id, 
              level: 'warning',
              category: 'security',
              // Message mein waqt shamil kiya taake foran nazar aaye
              message: `Security Alert: 3 failed Master PIN attempts detected at ${new Date().toLocaleTimeString()}.`,
              // Device ki maloomat shamil ki
              device_info: {
                browser: navigator.userAgent.split(') ')[1] || 'Unknown Browser',
                platform: navigator.platform,
                url: window.location.href
              },
              created_at: new Date().toISOString()
          };

          // [FIX]: Check karein ke table majood hai ya nahi
          if (db.system_logs) {
            try {
              await db.system_logs.add(logData);
              await db.sync_queue.add({ table_name: 'system_logs', action: 'create', data: logData });
              console.log("Security log saved locally and queued for sync.");
            } catch (err) {
              console.error("Logging to DB failed:", err);
            }
          } else {
            console.error("Database Error: system_logs table not found. Please refresh the app.");
          }
        }
        setLocalError("Invalid Master PIN");
      }
    } else {
      setLocalError("PIN must be 4 or 6 digits");
    }
    setPin('');
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: '#f0f2f5', zIndex: 99999, // Sab se upar dikhane ke liye
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      flexDirection: 'column'
    }}>
      <Card style={{ width: 350, textAlign: 'center', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}>
        
        {isSetupNeeded ? 
          <SafetyOutlined style={{ fontSize: 48, color: '#52c41a', marginBottom: 16 }} /> : 
          <LockOutlined style={{ fontSize: 48, color: '#1890ff', marginBottom: 16 }} />
        }

        <Title level={3}>{isSetupNeeded ? "Setup Master PIN" : "Terminal Locked"}</Title>

        <Text type="secondary" style={{ display: 'block', marginBottom: localError ? 12 : 24 }}>
          {isSetupNeeded ? "Set your Master PIN to secure this device." : "Enter your PIN to unlock"}
        </Text>

        {/* NAYA: Error Box */}
        {localError && (
          <div style={{ 
            color: '#ef5350', 
            backgroundColor: 'rgba(239, 83, 80, 0.1)', 
            padding: '8px 12px', 
            borderRadius: '6px', 
            marginBottom: '16px', 
            fontSize: '13px', 
            border: '1px solid rgba(239, 83, 80, 0.3)',
            textAlign: 'left'
          }}>
            {localError}
          </div>
        )}

        <Input.Password
          size="large"
          placeholder="Enter PIN"
          maxLength={10} // Security by obscurity: Limit barha di taake guess karna mushkil ho
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))} // Sirf numbers allow karein
          onPressEnter={handleAction}
          style={{ textAlign: 'center', fontSize: 24, letterSpacing: 8, marginBottom: 16 }}
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