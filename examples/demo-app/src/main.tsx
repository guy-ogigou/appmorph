import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { initAppmorph } from './appmorph';

// Initialize Appmorph SDK
initAppmorph();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
