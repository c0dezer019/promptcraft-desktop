import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { initStorage } from './lib/promptcraft-ui/utils/storage.js';

// Debug logging for deployment
console.log('🚀 PromptCraft Starting...');
console.log('Environment:', import.meta.env.MODE);
console.log('Base URL:', import.meta.env.BASE_URL);

// Initialize storage system (Tauri Store for desktop, localStorage for web)
initStorage().then(() => {
  console.log('✅ Storage system initialized');
}).catch(error => {
  console.error('❌ Failed to initialize storage:', error);
});

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
    const errorContainer = document.createElement('div');
    errorContainer.style.padding = '50px';
    errorContainer.style.textAlign = 'center';

    const title = document.createElement('h1');
    title.textContent = 'Error Loading PromptCraft';

    const message = document.createElement('p');
    message.textContent = error.message;

    const details = document.createElement('p');
    details.textContent = 'Check browser console for details';

    errorContainer.appendChild(title);
    errorContainer.appendChild(message);
    errorContainer.appendChild(details);

    document.body.innerHTML = '';
    document.body.appendChild(errorContainer);
  }
}
