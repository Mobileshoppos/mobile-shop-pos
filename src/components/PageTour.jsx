import React, { useState, useEffect } from 'react';
import { Tour } from 'antd';
import { useAuth } from '../context/AuthContext';

const PageTour = ({ pageKey, steps }) => {
  const { profile, updateProfile } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Check karein ke kya user ne is page ka tour pehle dekha hai?
    const hasSeenTour = profile?.tours_completed?.[pageKey];
    
    // Tour sirf tab dikhao jab:
    // 1. Profile mojood ho
    // 2. Setup Wizard khatam ho chuka ho (is_setup_completed: true)
    // 3. User ne pehle yeh tour na dekha ho
    if (profile && profile.is_setup_completed && !hasSeenTour) {
      // Thora delay taake page sahi se load ho jaye
      const timer = setTimeout(() => setOpen(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [profile, pageKey]);

  const handleClose = async () => {
    setOpen(false);
    
    // Database mein update karein ke is page ka tour dekh liya gaya hai
    const updatedTours = {
      ...(profile?.tours_completed || {}),
      [pageKey]: true
    };

    await updateProfile({ tours_completed: updatedTours });
  };

  return (
    <Tour
      open={open}
      onClose={handleClose}
      steps={steps}
      indicatorsRender={(current, total) => (
        <span>{current + 1} / {total}</span>
      )}
    />
  );
};

export default PageTour;