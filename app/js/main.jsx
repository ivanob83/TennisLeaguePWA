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
import './config/firebase.config.js'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Router>
      <App />
    </Router>
  </React.StrictMode>,
)
