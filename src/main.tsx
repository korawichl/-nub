import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

// Register PWA Service Worker across production, GitHub Pages, and local test environments
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    try {
      const swUrl = new URL('sw.js', window.location.href).href;
      navigator.serviceWorker
        .register(swUrl)
        .then((reg) => {
          reg.update().catch(() => {});
        })
        .catch((err) => {
          console.warn('Service worker registration failed:', err);
        });
    } catch (e) {
      console.warn('Error resolving service worker URL:', e);
    }
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
