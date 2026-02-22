import 'antd/dist/reset.css';
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from "@sentry/react"; 
import { makeBrowserOfflineTransport } from "@sentry/browser";
import ErrorBoundary from './components/ErrorBoundary'
import './index.css'
import App from './App.jsx'

// --- SENTRY CONFIGURATION WITH OFFLINE SUPPORT (START) ---
if (import.meta.env.PROD) {
  Sentry.init({
    dsn: "https://554178099a1edc566ca382bb7564207a@o4510483664207872.ingest.us.sentry.io/4510483705692160",
    
    // OFFLINE SUPPORT FOR V7
    transport: makeBrowserOfflineTransport(Sentry.makeFetchTransport),
    transportOptions: {
      maxQueueSize: 50,
    },

    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
    
    tracesSampleRate: 1.0, 
    replaysSessionSampleRate: 0.1, 
    replaysOnErrorSampleRate: 1.0, 
  });
}
// --- SENTRY CONFIGURATION WITH OFFLINE SUPPORT (END) ---

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)