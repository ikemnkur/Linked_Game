// import { StrictMode } from 'react'
// import { createRoot } from 'react-dom/client'
// import './index.css'
// import App from './App.jsx'

// createRoot(document.getElementById('root')).render(
//   <StrictMode>
//     <App />
//   </StrictMode>,
// )

import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { registerSW } from 'virtual:pwa-register'

createRoot(document.getElementById('root')).render(<App />);
// Show a toast/snackbar in your UI if you want:
const updateSW = registerSW({
  onNeedRefresh() {
    // e.g. show “New version available” with a “Reload” button:
    // updateSW(true) triggers the SW to skip waiting and reload.
  },
  onOfflineReady() {
    // e.g. show “App ready to work offline”
  }
})