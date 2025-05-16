
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { UserProvider } from './context/UserContext';

const rootElement = document.getElementById("root");

// Make sure the root element exists before rendering
if (!rootElement) {
  console.error("Root element not found!");
} else {
  const root = createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <UserProvider>
        <App />
      </UserProvider>
    </React.StrictMode>
  );
}
