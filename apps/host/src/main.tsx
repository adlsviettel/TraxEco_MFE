import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import '@traxeco/shared/i18n/config';
// Suppress noisy browser extension errors and library ads
const EXT_NOISE = /message channel closed|disconnected port object/i;
window.addEventListener('unhandledrejection', (e) => {
  if (EXT_NOISE.test(String(e.reason))) e.preventDefault();
});
window.addEventListener('error', (e) => {
  if (EXT_NOISE.test(e.message)) e.preventDefault();
});

// Suppress logs in production to prevent leaking system information to clients/hackers
if (import.meta.env.PROD) {
  console.log = () => {};
  console.info = () => {};
  console.warn = () => {};
  console.debug = () => {};
  console.trace = () => {};
} else {
  // Suppress i18next ad and other noisy logs in development
  const origLog = console.log;
  console.log = function(...args) {
    if (typeof args[0] === 'string' && args[0].includes('Locize')) return;
    origLog.apply(console, args);
  };
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// Register Service Worker with error handling (graceful fail on self-signed SSL/unsecured origins)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    if (import.meta.env.DEV) {
      // In development, unregister any existing service workers to ensure HMR works perfectly
      navigator.serviceWorker.getRegistrations().then(registrations => {
        for (let registration of registrations) {
          registration.unregister();
        }
      });
    } else {
      const baseUrl = import.meta.env.BASE_URL || '/';
      navigator.serviceWorker.register(`${baseUrl}sw.js`, { scope: baseUrl })
        .then((registration) => {
          console.log('ServiceWorker registered successfully with scope:', registration.scope);
        })
        .catch((error) => {
          console.warn('ServiceWorker registration failed (expected on invalid/self-signed SSL):', error);
        });
    }
  });
}
