import React, { useState } from 'react';
import { Input, Button, Typography, Card, App, theme, Select, InputNumber, Tag } from 'antd';
import { LockOutlined, SafetyOutlined, ShopOutlined } from '@ant-design/icons';
import DataService from '../DataService';
import { useStaff } from '../context/StaffContext';
import { formatCurrency } from '../utils/currencyFormatter';
import bcrypt from 'bcryptjs';
import { db } from '../db';
import { useAuth } from '../context/AuthContext'; // Naya Import

const { Title, Text } = Typography;

const LockScreen = () => {
  const [pin, setPin] = useState('');
  const [localError, setLocalError] = useState('');
  // --- REGISTER OPENING STATES ---
  const [showRegisterSelect, setShowRegisterSelect] = useState(false);
  const [registers, setRegisters] = useState([]);
  const[selectedRegId, setSelectedRegId] = useState(null);
  // NAYA IZAFA: Paired Device States
  const[pairedRegId, setPairedRegId] = useState(localStorage.getItem('paired_register_id'));
  const[pairedRegName, setPairedRegName] = useState('');
  const [openingBalance, setOpeningBalance] = useState(0);
  const [expectedOpening, setExpectedOpening] = useState(0); // NAYA IZAFA
  const [openingNotes, setOpeningNotes] = useState(''); // NAYA IZAFA
  const [tempStaff, setTempStaff] = useState(null);
  const { activeSession, setActiveSession, setIsAppLocked } = useStaff();
  const { loginStaff, unlockAsOwner } = useStaff();
  const { message } = App.useApp();
  const { user, profile } = useAuth(); // User aur Profile dono ki maloomat nikaali
  const { token } = theme.useToken(); // Theme colors nikaalne ke liye

  const handleAction = async () => {
    setLocalError('');
    
    if (!pin) {
      setLocalError("Please enter a PIN");
      return;
    }

    const lockUntil = localStorage.getItem('app_lock_until');
    if (lockUntil && Date.now() < parseInt(lockUntil)) {
      const remainingMinutes = Math.ceil((parseInt(lockUntil) - Date.now()) / 60000);
      setLocalError(`Terminal is temporarily locked. Try again in ${remainingMinutes} minutes.`);
      setPin('');
      return;
    }

    let isSuccess = false;

    // Pehle Staff Login Try karein
    const staffResult = await loginStaff(pin);
    
    if (staffResult.success) {
      if (activeSession) {
        setIsAppLocked(false);
        localStorage.setItem('is_app_locked', 'false');
        isSuccess = true;
      } else {
        const regs = await DataService.getRegisters();
        const countersOnly = regs.filter(r => r.type === 'counter');
        setRegisters(countersOnly);
        setTempStaff(staffResult.success);
        
        // NAYA IZAFA: Device Pairing Logic (Staff ke liye)
        const pairedId = localStorage.getItem('paired_register_id');
        if (pairedId) {
            const pairedCounter = countersOnly.find(c => c.id === pairedId);
            if (pairedCounter) {
                setSelectedRegId(pairedId);
                setPairedRegName(pairedCounter.name);
                
                const lastSession = await db.register_sessions
                  .where('register_id').equals(pairedId)
                  .filter(s => s.closed_at != null)
                  .reverse()
                  .sortBy('closed_at');
                
                if (lastSession && lastSession.length > 0) {
                  setOpeningBalance(lastSession[0].actual_closing || 0);
                  setExpectedOpening(lastSession[0].actual_closing || 0);
                } else {
                  setOpeningBalance(0);
                  setExpectedOpening(0);
                }
                setOpeningNotes('');
            }
        }
        
        setShowRegisterSelect(true);
        return; 
      }
    } 
    else {
      // Agar Staff fail hua, to Owner Try karein
      const ownerSuccess = unlockAsOwner(pin);
      if (ownerSuccess) {
        if (activeSession) {
          // Agar Owner ki shift pehle se open hai, to direct unlock karein
          setIsAppLocked(false);
          localStorage.setItem('is_app_locked', 'false');
          isSuccess = true;
        } else {
          // Agar shift open nahi hai, to Counter Select karwayein
          const regs = await DataService.getRegisters();
          const countersOnly = regs.filter(r => r.type === 'counter');
          setRegisters(countersOnly);
          setTempStaff(null); // Owner ke liye staff null hoga
          
          // NAYA IZAFA: Device Pairing Logic (Owner ke liye)
          const pairedId = localStorage.getItem('paired_register_id');
          if (pairedId) {
              const pairedCounter = countersOnly.find(c => c.id === pairedId);
              if (pairedCounter) {
                  setSelectedRegId(pairedId);
                  setPairedRegName(pairedCounter.name);
                  
                  const lastSession = await db.register_sessions
                    .where('register_id').equals(pairedId)
                    .filter(s => s.closed_at != null)
                    .reverse()
                    .sortBy('closed_at');
                  
                  if (lastSession && lastSession.length > 0) {
                    setOpeningBalance(lastSession[0].actual_closing || 0);
                    setExpectedOpening(lastSession[0].actual_closing || 0);
                  } else {
                    setOpeningBalance(0);
                    setExpectedOpening(0);
                  }
                  setOpeningNotes('');
              }
          }

          setShowRegisterSelect(true);
          return; 
        }
      }
    }

    if (isSuccess) {
      localStorage.removeItem('failed_attempts');
      localStorage.removeItem('app_lock_until');
      setLocalError('');
    } else {
      let attempts = parseInt(localStorage.getItem('failed_attempts') || '0') + 1;
      localStorage.setItem('failed_attempts', attempts.toString());

      if (attempts >= 5) {
        const unlockTime = Date.now() + 5 * 60 * 1000;
        localStorage.setItem('app_lock_until', unlockTime.toString());
        
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
        setLocalError("Invalid PIN");
      }
    }
    setPin('');
  };

  const handleOpenRegister = async () => {
    if (!selectedRegId) { message.error("Please select a counter"); return; }
    
    // NAYA IZAFA: Agar farq hai to note likhna laazmi hai
    if (openingBalance !== expectedOpening && !openingNotes.trim()) {
      message.error("Please provide a reason for the cash difference.");
      return;
    }
    
    try {
      const sessionData = {
        register_id: selectedRegId,
        staff_id: tempStaff?.id,
        user_id: user?.id,
        opening_balance: openingBalance,
        // NAYA IZAFA: Notes save karna
        notes: openingBalance !== expectedOpening ? `[Opening Anomaly] Expected: ${expectedOpening}, Actual: ${openingBalance}. Reason: ${openingNotes}` : ''
      };
      
      const newSession = await DataService.openRegisterSession(sessionData);
      setActiveSession(newSession);
      localStorage.setItem('active_register_session', JSON.stringify(newSession));
      
      message.success("Register opened successfully!");
      setShowRegisterSelect(false);
      
      // REGISTER OPEN HONE PAR APP UNLOCK KAREIN
      setIsAppLocked(false);
      localStorage.setItem('is_app_locked', 'false');
    } catch (err) {
      message.error("Failed to open register");
    }
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
        
        {!showRegisterSelect ? (
          <>
            <LockOutlined style={{ fontSize: 48, color: token.colorPrimary, marginBottom: 16 }} />
            <Title level={3} style={{ color: token.colorTextHeading }}>Terminal Locked</Title>
            <Text style={{ display: 'block', marginBottom: localError ? 12 : 24, color: token.colorTextSecondary }}>
              Enter your PIN to unlock
            </Text>

            {localError && (
              <div style={{ 
                color: token.colorError, backgroundColor: token.colorErrorBg, padding: '8px 12px', 
                borderRadius: '6px', marginBottom: '16px', fontSize: '13px', 
                border: `1px solid ${token.colorErrorBorder}`, textAlign: 'left'
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
              style={{ textAlign: 'center', fontSize: 24, letterSpacing: 8, marginBottom: 16, backgroundColor: token.colorBgContainer, color: token.colorText }}
              autoFocus
            />
            <Button type="primary" size="large" block onClick={handleAction}>Unlock</Button>
          </>
        ) : (
          <>
            <ShopOutlined style={{ fontSize: 48, color: token.colorPrimary, marginBottom: 16 }} />
            <Title level={3} style={{ color: token.colorTextHeading }}>Open Register</Title>
            <Text style={{ display: 'block', marginBottom: 24, color: token.colorTextSecondary }}>
              Welcome {tempStaff ? tempStaff.name : 'Owner'}! {pairedRegId ? 'Confirm opening cash to start shift.' : 'Select counter to start shift.'}
            </Text>

            <div style={{ textAlign: 'left', marginBottom: '16px' }}>
              {/* NAYA FIX: Sirf tab paired dikhayein jab waqayi ID maujood ho */}
              {pairedRegId && pairedRegName ? (
                <div style={{ padding: '12px', background: token.colorFillAlter, borderRadius: '8px', border: `1px solid ${token.colorPrimary}55` }}>
                  <Text type="secondary" style={{ fontSize: '12px', display: 'block' }}>Paired Device (This PC):</Text>
                  <Text strong style={{ fontSize: '18px', color: token.colorPrimary }}>{pairedRegName}</Text>
                  <Text type="secondary" style={{ fontSize: '11px', display: 'block', marginTop: '4px' }}>
                    *This PC is permanently paired to this counter.
                  </Text>
                </div>
              ) : (
                <>
                  <Text strong>Select Counter</Text>
                  <Select
                    showSearch
                    placeholder="Choose Counter"
                    style={{ width: '100%', marginTop: '8px' }}
                    onChange={async (val) => {
                  setSelectedRegId(val);
                  
                  // 1. Counter ka status check karein
                  const counter = registers.find(r => r.id === val);
                  let expectedAmount = 0;

                  // NAYA FIX: Counter chahe 'open' ho ya 'closed', humesha Asli Live Balance nikalain
                  // Taake transfer ki hui raqam (maslan 100 Rs) foran nazar aa jaye
                  if (counter) {
                    expectedAmount = await DataService.getRegisterCurrentCash(val);
                  }
                  
                  setExpectedOpening(expectedAmount);
                  setOpeningBalance(expectedAmount); // Input mein auto-fill kar dein
                  setOpeningNotes('');
                }}
                    getPopupContainer={triggerNode => triggerNode.parentNode}
                    optionFilterProp="label"
                options={registers.map(r => ({ 
                  // Agar counter open hai to sath mein (In Use) likh dein
                  label: r.status === 'open' ? `${r.name} (In Use / Resume)` : r.name, 
                  value: r.id, 
                  // NAYA FIX: Staff ko bhi allow kar rahe hain, koi counter disabled nahi hoga
                  disabled: false 
                }))}
              />
              {registers.some(r => r.status === 'open') && (
                <div style={{ marginTop: '8px', padding: '8px', background: token.colorWarningBg, borderRadius: '4px', border: `1px solid ${token.colorWarningBorder}` }}>
                  <Text type="warning" style={{ fontSize: '11px', display: 'block', lineHeight: '1.4' }}>
                    <strong>Notice:</strong> If a counter shows "In Use", you can still select it to <strong>Resume</strong> your shift if the browser was closed or refreshed.
                  </Text>
                </div>
              )}
                  <Text type="warning" style={{ fontSize: '11px', display: 'block', marginTop: '8px' }}>
                    Tip: Go to Settings to "Pair" this PC to a counter permanently.
                  </Text>
                </>
              )}
            </div>

            <div style={{ textAlign: 'left', marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <Text strong>Opening Float (Starting Cash)</Text>
                {selectedRegId && (
                  <Tag color="blue" style={{ margin: 0 }}>
                    Expected: {formatCurrency(expectedOpening, profile?.currency)}
                  </Tag>
                )}
              </div>
              <InputNumber
                min={0}
                style={{ width: '100%', marginTop: '8px' }}
                value={openingBalance}
                onChange={val => setOpeningBalance(val)}
                placeholder="Enter amount in drawer"
              />
              
              {/* NAYA IZAFA: Agar expected aur actual mein farq ho to Notes poochein */}
              {openingBalance !== expectedOpening && (
                <div style={{ marginTop: '12px', padding: '10px', background: token.colorErrorBg, borderRadius: '6px', border: `1px solid ${token.colorErrorBorder}` }}>
                  <Text type="danger" style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>
                    Expected Cash was {expectedOpening}. Please explain the difference:
                  </Text>
                  <Input.TextArea
                    placeholder="Why is the cash different from last closing?"
                    value={openingNotes}
                    onChange={e => setOpeningNotes(e.target.value)}
                    rows={2}
                  />
                </div>
              )}
            </div>

            <Button type="primary" size="large" block onClick={handleOpenRegister}>
              {registers.find(r => r.id === selectedRegId)?.status === 'open' ? 'Resume Shift' : 'Start Shift'}
            </Button>
            <Button type="link" onClick={() => setShowRegisterSelect(false)} style={{ marginTop: '8px' }}>
              Cancel / Back
            </Button>
          </>
        )}
      </Card>
    </div>
  );
};

export default LockScreen;