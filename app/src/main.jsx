/**
 * Tennis League PWA - Main Entry Point
 * 
 * Vite-based React app with Firebase and client-side routing
 */

import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter as Router } from 'react-router-dom'
import App from './app.jsx'
import '../css/app.css'

// Initialize Firebase persistence
import './infrastructure/firebase.js'

// Register service worker for PWA offline support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err => {
      console.warn('[SW] Registration failed:', err)
    })
  })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Router>
      <App />
    </Router>
  </React.StrictMode>,
)
