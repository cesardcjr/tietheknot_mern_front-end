import StudioHandoff from "./components/StudioHandoff";
import React from 'react'
import ReactDOM from 'react-dom/client'
import { AppProvider } from './context/AppContext'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppProvider>
      {new URLSearchParams(window.location.search).get("studioHandoff") === "1" ? <StudioHandoff /> : <App />}
    </AppProvider>
  </React.StrictMode>
)
