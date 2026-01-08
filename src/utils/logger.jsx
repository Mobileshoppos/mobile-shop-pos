import React from 'react'; // Ye line shamil karein
import { supabase } from '../supabaseClient';
import { notification, Button } from 'antd';

const Logger = {
  async log(level, category, message, errorDetails = null, userGuide = null) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const logEntry = {
        user_id: user?.id || null,
        level: level,
        category: category,
        message: message,
        details: errorDetails ? { 
          raw_error: errorDetails.message || errorDetails,
          stack: errorDetails.stack,
          suggested_fix: userGuide 
        } : null,
        device_info: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          onlineStatus: navigator.onLine
        }
      };

      supabase.from('system_logs').insert([logEntry]).then(({ error }) => {
        if (error) console.error("Failed to save log to server:", error);
      });

      if (userGuide) {
        notification[level === 'error' ? 'error' : 'info']({
          message: level === 'error' ? 'Zaroori Ittala' : 'App Guide',
          description: userGuide,
          duration: 10,
          // Naya: Refresh button
          btn: level === 'error' ? (
            <Button type="primary" size="small" onClick={() => window.location.reload()}>
              Refresh App
            </Button>
          ) : null,
        });
      }

    } catch (err) {
      console.error("Logger itself failed:", err);
    }
  },

  error(category, message, err, guide) {
    this.log('error', category, message, err, guide);
  },

  info(category, message, guide) {
    this.log('info', category, message, null, guide);
  }
};

export default Logger;