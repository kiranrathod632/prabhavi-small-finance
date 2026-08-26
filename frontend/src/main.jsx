import React from 'react';
import ReactDOM from 'react-dom/client';
// import { BrowserRouter } from 'react-router-dom';
import { HashRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext';
import { AdminCountsProvider } from './context/AdminCountsContext';
import './index.css';
import './i18n';

// initFirebaseAnalytics().catch(() => {});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <ThemeProvider>
        <AuthProvider>
          <NotificationProvider>
            <AdminCountsProvider>
              <App />
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: 'rgba(10, 22, 40, 0.92)',
                    color: '#e2e8f0',
                    border: '1px solid rgba(0, 210, 255, 0.2)',
                    backdropFilter: 'blur(12px)',
                    borderRadius: '12px',
                    boxShadow: '0 0 20px rgba(0, 210, 255, 0.15)',
                  },
                }}
              />
            </AdminCountsProvider>
          </NotificationProvider>
        </AuthProvider>
      </ThemeProvider>
    </HashRouter>
  </React.StrictMode>
);
