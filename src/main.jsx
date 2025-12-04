import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Debug logging for deployment
console.log('🚀 PromptCraft Starting...');
console.log('Environment:', import.meta.env.MODE);
console.log('Base URL:', import.meta.env.BASE_URL);

const rootElement = document.getElementById('root');
console.log('Root element found:', !!rootElement);

if (!rootElement) {
  console.error('❌ Root element not found!');
  document.body.innerHTML = '<div style="padding: 50px; text-align: center;"><h1>Error: Root element not found</h1><p>Check console for details</p></div>';
} else {
  try {
    ReactDOM.createRoot(rootElement).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    );
    console.log('✅ React app mounted successfully');
  } catch (error) {
    console.error('❌ Failed to mount React app:', error);
    document.body.innerHTML = `<div style="padding: 50px; text-align: center;">
      <h1>Error Loading PromptCraft</h1>
      <p>${error.message}</p>
      <p>Check browser console for details</p>
    </div>`;
  }
}
