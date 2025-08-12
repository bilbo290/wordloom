import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { Toaster } from '@/components/ui/toaster'
import './index.css'

// Initialize theme
const savedTheme = localStorage.getItem('theme')
if (savedTheme === 'light') {
  document.documentElement.classList.remove('dark')
} else {
  document.documentElement.classList.add('dark')
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
    <Toaster />
  </React.StrictMode>,
)