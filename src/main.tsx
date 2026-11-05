import React from 'react'
import { lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './style.css'

const Inspecao = import.meta.env.DEV && new URLSearchParams(window.location.search).has('criatura')
  ? lazy(() => import('./experience/creatures/CreatureInspector')) : null

createRoot(document.getElementById('app')!).render(
  <React.StrictMode>
    {Inspecao ? <Suspense fallback={<p>Preparando estudo de criaturas…</p>}><Inspecao /></Suspense> : <App />}
  </React.StrictMode>
)
