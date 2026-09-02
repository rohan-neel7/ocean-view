import React from 'react';
import ReactDOM from 'react-dom/client';
import { AppProvider } from './app/AppContext.jsx';
import App from './app/App.jsx';
import './styles/oceanview.css';
import './styles/hud.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </React.StrictMode>
);
