
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { cleanupOldAuthKeys } from './utils/authCleanup'; 

// Clean up any old auth keys in localStorage on application startup
cleanupOldAuthKeys();

const rootElement = document.getElementById("root");

// Make sure the root element exists before rendering
if (!rootElement) {
  console.error("Root element not found!");
} else {
  const root = createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
