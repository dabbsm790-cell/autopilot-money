import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'

const C={accent:'#00e5a0',warn:'#ff6b35',blue:'#4d9fff',purple:'#9b6dff',muted:'#6b6b8a',border:'#2a2a3d',surface:'#12121a',card:'#1a1a26',subtle:'#2e2e42',green2:'#a3e635',teal:'#06b6d4',amber:'#f59e0b',orange:'#f97316',bg:'#0a0a0f'}

function App() {
  return (
    <div style={{minHeight:'100vh',background:C.bg,color:'#f0f0f8',fontFamily:'DM Sans,Segoe UI,sans-serif',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:'16px'}}>
      <div style={{fontSize:'48px'}}>⚡</div>
      <h1 style={{fontSize:'48px',fontWeight:800,color:C.accent,margin:0}}>AutoPilot Money</h1>
      <p style={{color:C.muted,fontSize:'18px',margin:0}}>Your money, on autopilot.</p>
      <p style={{color:C.muted,fontSize:'14px',margin:0}}>Full app loading — App.jsx coming soon.</p>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />)
