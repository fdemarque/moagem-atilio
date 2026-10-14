import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './LocalApp.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      const notifyUpdate = () => window.dispatchEvent(new CustomEvent('moagem-update-ready', { detail: registration.waiting }));
      if (registration.waiting) notifyUpdate();
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        worker?.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) notifyUpdate();
        });
      });
      await navigator.serviceWorker.ready;
      window.dispatchEvent(new Event('moagem-offline-ready'));
      navigator.storage?.persist?.().catch(() => {});
    } catch (error) { console.error('Falha ao preparar o aplicativo offline:', error); }
  });
}
