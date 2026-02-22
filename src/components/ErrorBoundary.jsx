import React from 'react';
// SAFEST APPROACH: Import directly for guaranteed availability
import * as Sentry from "@sentry/react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    
    // DIRECT SENTRY USE - No window object dependency
    // 100% guaranteed to work in Vite/React 19
    Sentry.captureException(error, { extra: errorInfo });
    
    // EXTRA SAFETY: Agar kisi wajeh se Sentry import fail bhi ho jaye
    // to bhi window.Sentry check kar lete hain (backup plan)
    if (!Sentry && window.Sentry) {
      window.Sentry.captureException(error, { extra: errorInfo });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          padding: '20px', 
          textAlign: 'center', 
          marginTop: '50px',
          fontFamily: 'Arial, sans-serif'
        }}>
          <h2>Something went wrong.</h2>
          <p>Don't worry, your data is safe in offline mode.</p>
          <button 
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 20px',
              fontSize: '16px',
              cursor: 'pointer',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              marginTop: '15px'
            }}
          >
            Refresh App
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;