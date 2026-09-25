import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { ClubProvider } from './context/ClubContext.jsx';
// Fuentes servidas desde el propio sitio (sin Google Fonts): sin peticiones a
// terceros y una CSP más estricta (font-src/style-src solo 'self').
import '@fontsource/archivo-black/latin-400.css';
import '@fontsource/ibm-plex-sans/latin-400.css';
import '@fontsource/ibm-plex-sans/latin-500.css';
import '@fontsource/ibm-plex-sans/latin-600.css';
import '@fontsource/ibm-plex-sans/latin-700.css';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <ClubProvider>
        <App />
      </ClubProvider>
    </AuthProvider>
  </React.StrictMode>
);
