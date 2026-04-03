import React, { useState } from 'react';
import { Modal, Form, InputNumber, Input, Typography, Button, App, theme, Divider, Alert } from 'antd';
import { WalletOutlined, CheckCircleOutlined } from '@ant-design/icons';
import DataService from '../DataService';
import { useStaff } from '../context/StaffContext';
import { formatCurrency } from '../utils/currencyFormatter';
import { useAuth } from '../context/AuthContext';

const { Text, Title } = Typography;

const RegisterClosingModal = ({ visible, onCancel }) => {
  const { token } = theme.useToken();
  const { message } = App.useApp();
  const { profile } = useAuth();
  const { activeSession, setActiveSession, lockApp } = useStaff();
  const [actualCash, setActualCash] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [closingStats, setClosingStats] = useState(null);
  const [liveExpectedCash, setLiveExpectedCash] = useState(0); 
  const [closingNotes, setClosingNotes] = useState(''); // NAYA IZAFA

  // Modal khulte hi expected cash nikal kar screen par dikhana
  React.useEffect(() => {
    const fetchExpected = async () => {
      if (visible && activeSession) {
        const expected = await DataService.getSessionExpectedBalance(activeSession.id);
        setLiveExpectedCash(expected);
        setActualCash(expected); // Default mein wahi raqam likh do jo system mein hai
      }
    };
    fetchExpected();
  }, [visible, activeSession]);

  const handleCloseShift = async () => {
    if (!activeSession) return;
    
    const expected = liveExpectedCash;
    const diff = actualCash - expected;

    // NAYA IZAFA: Agar farq hai to note likhna laazmi hai
    if (diff !== 0 && !closingNotes.trim()) {
      message.error("Please provide a reason for the cash difference.");
      return;
    }

    setIsSubmitting(true);
    try {
      const closingData = {
        expected_closing: expected,
        actual_closing: actualCash,
        difference: diff,
        // NAYA IZAFA: Asli wazahat save karna
        notes: diff !== 0 ? `[Closing Anomaly] Difference: ${diff}. Reason: ${closingNotes}` : 'Shift closed successfully. No difference.'
      };

      // 2. Database mein save karein
      await DataService.closeRegisterSession(activeSession.id, closingData);

      // 3. UI par result dikhayen
      setClosingStats({ expected, actual: actualCash, diff });
      setShowResult(true);

      // 4. Local session khatam karein
      setActiveSession(null);
      localStorage.removeItem('active_register_session');

      message.success("Shift closed and recorded!");
    } catch (err) {
      message.error("Failed to close shift");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinalExit = () => {
    lockApp(); // App ko lock kar dein taake agla staff login kare
    onCancel(); // Modal band karein
  };

  return (
    <Modal
      title="End Shift & Close Register"
      open={visible}
      onCancel={onCancel}
      footer={null}
      closable={!showResult}
      maskClosable={false}
    >
      {!showResult ? (
        <div style={{ padding: '10px 0' }}>
          
          {/* NAYA IZAFA: Expected Cash Dikhana */}
          <div style={{ textAlign: 'center', marginBottom: '20px', padding: '15px', background: token.colorFillAlter, borderRadius: '8px' }}>
            <Text type="secondary">System Expected Cash:</Text>
            <Title level={2} style={{ margin: 0, color: token.colorPrimary }}>
              {formatCurrency(liveExpectedCash, profile?.currency)}
            </Title>
            <Text type="secondary" style={{ fontSize: '12px' }}>Make sure your physical cash matches this amount.</Text>
          </div>

          <Text strong>Actual Cash in Drawer:</Text>
          <InputNumber
            style={{ width: '100%', marginTop: '10px', height: '50px', fontSize: '20px' }}
            size="large"
            prefix={profile?.currency}
            value={actualCash}
            onChange={val => setActualCash(val || 0)}
            autoFocus
          />

          {/* NAYA IZAFA: Agar expected aur actual mein farq ho to Notes poochein */}
          {actualCash !== liveExpectedCash && (
            <div style={{ marginTop: '12px', padding: '10px', background: token.colorErrorBg, borderRadius: '6px', border: `1px solid ${token.colorErrorBorder}` }}>
              <Text type="danger" style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>
                Difference detected ({formatCurrency(actualCash - liveExpectedCash, profile?.currency)}). Please explain:
              </Text>
              <Input.TextArea
                placeholder="Why is the cash different from expected?"
                value={closingNotes}
                onChange={e => setClosingNotes(e.target.value)}
                rows={2}
              />
            </div>
          )}

          <Button 
            type="primary" 
            size="large" 
            block 
            icon={<CheckCircleOutlined />}
            style={{ marginTop: '24px', height: '50px' }}
            onClick={handleCloseShift}
            loading={isSubmitting}
          >
            Complete Closing
          </Button>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <CheckCircleOutlined style={{ fontSize: '48px', color: token.colorSuccess }} />
          <Title level={3}>Shift Summary</Title>
          
          <div style={{ background: token.colorFillAlter, padding: '15px', borderRadius: '8px', marginTop: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <Text>Software Expected:</Text>
              <Text strong>{formatCurrency(closingStats.expected, profile?.currency)}</Text>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <Text>You Counted:</Text>
              <Text strong>{formatCurrency(closingStats.actual, profile?.currency)}</Text>
            </div>
            <Divider style={{ margin: '8px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text strong>Difference:</Text>
              <Text strong style={{ color: closingStats.diff >= 0 ? token.colorSuccess : token.colorError }}>
                {formatCurrency(closingStats.diff, profile?.currency)}
              </Text>
            </div>
          </div>

          <Button type="primary" size="large" block onClick={handleFinalExit} style={{ marginTop: '24px' }}>
            Logout & Lock Terminal
          </Button>
        </div>
      )}
    </Modal>
  );
};

export default RegisterClosingModal;