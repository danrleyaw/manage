import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './components/Dashboard';
import { InstallBanner } from './components/InstallBanner';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Registra o Service Worker para PWA offline
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // SW não crítico — app funciona sem ele
    });
  });
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
    <InstallBanner />
  </React.StrictMode>
);
