import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

console.log('[main.jsx] start');

const el = document.getElementById('root');
if (!el) {
  console.log('[main.jsx] #root not found');
} else {
  console.log('[main.jsx] mounting React app');
  ReactDOM.createRoot(el).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
