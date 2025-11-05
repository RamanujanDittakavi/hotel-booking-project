import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
// We don't need to import index.css because we are using the Tailwind CDN in index.html

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
