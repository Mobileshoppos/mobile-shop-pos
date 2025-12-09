import 'antd/dist/reset.css';
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from "@sentry/react"; // <--- Sentry Import
import './index.css'
import App from './App.jsx'

// --- SENTRY CONFIGURATION (START) ---
Sentry.init({
  dsn: "https://554178099a1edc566ca382bb7564207a@o4510483664207872.ingest.us.sentry.io/4510483705692160",
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  // Performance Monitoring
  tracesSampleRate: 1.0, 
  // Session Replay
  replaysSessionSampleRate: 0.1, 
  replaysOnErrorSampleRate: 1.0, 
});
// --- SENTRY CONFIGURATION (END) ---

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)