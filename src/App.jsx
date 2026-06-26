import { useState, useEffect } from 'react'
import './App.css'
import Fahrzeugverwaltung from './components/Fahrzeugverwaltung.jsx'
import Frachtstuecke from './components/Frachtstuecke.jsx'
import Beladeplan from './components/Beladeplan.jsx'
import Routenplanung from './components/Routenplanung.jsx'
import Transportliste from './components/Transportliste.jsx'

let nextId = 10

export default function App() {
  const [activeTab, setActiveTab] = useState('fahrzeuge')
  const [fahrzeuge, setFahrzeuge] = useState(() => {
    const stored = localStorage.getItem('fahrzeuge')
    if (stored) {
      try { return JSON.parse(stored) } catch {}
    }
    return [{ id: 1, name: 'LKW 1', laenge: 13.6, breite: 2.45, hoehe: 2.7 }]
  })
  const [selectedFahrzeug, setSelectedFahrzeug] = useState(0)
  const [frachtstuecke, setFrachtstuecke] = useState([])
  const [incomingRoute, setIncomingRoute] = useState(null)
  const [majFahrzeug, setMajFahrzeug] = useState(() => {
    const stored = localStorage.getItem('majFahrzeug')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        // Migration: frueher war pro Datei nur 1 Index gespeichert -> Array.
        const norm = {}
        for (const k of Object.keys(parsed)) {
          const v = parsed[k]
          if (Array.isArray(v)) norm[k] = v
          else if (v !== null && v !== undefined && v !== '') norm[k] = [v]
        }
        return norm
      } catch { /* ignore */ }
    }
    return {}
  })

  // Schaltet ein Fahrzeug fuer eine MAJ-Datei an/aus (Mehrfachauswahl).
  const setMajFahrzeugFor = (majFile, fzIdx) => {
    setMajFahrzeug((prev) => {
      const cur = Array.isArray(prev[majFile]) ? prev[majFile] : []
      const has = cur.includes(fzIdx)
      const nextArr = has ? cur.filter((i) => i !== fzIdx) : [...cur, fzIdx].sort((a, b) => a - b)
      const next = { ...prev }
      if (nextArr.length === 0) delete next[majFile]
      else next[majFile] = nextArr
      return next
    })
  }

  // Nimmt eine Liste von Routen entgegen ({ name, start?, stops }) und laedt sie
  // in die Routenplanung. Eine Route pro Fahrzeug ist so moeglich.
  const planRoute = (plans) => {
    if (!plans || !plans.length) return
    setIncomingRoute({ plans, ts: Date.now() })
    setActiveTab('route')
  }

  // Save vehicles to localStorage
  useEffect(() => {
    localStorage.setItem('fahrzeuge', JSON.stringify(fahrzeuge))
  }, [fahrzeuge])

  useEffect(() => {
    localStorage.setItem('majFahrzeug', JSON.stringify(majFahrzeug))
  }, [majFahrzeug])

  const addFrachtstueck = (stueck) => {
    setFrachtstuecke((prev) => [...prev, { ...stueck, id: nextId++ }])
  }

  const removeFrachtstueck = (id) => {
    setFrachtstuecke((prev) => prev.filter((f) => f.id !== id))
  }

  const updateFrachtstueck = (id, changes) => {
    setFrachtstuecke((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...changes } : f))
    )
  }

  const clearFrachtstuecke = () => {
    setFrachtstuecke([])
  }

  const importFrachtstuecke = (articles, fileName) => {
    const tagged = articles.map((a) => ({ ...a, id: nextId++, majFile: fileName }))
    setFrachtstuecke((prev) => {
      const other = prev.filter((f) => f.majFile !== fileName)
      return [...other, ...tagged]
    })
  }

  const TABS = [
    { id: 'fahrzeuge', label: 'Fahrzeuge' },
    { id: 'fracht', label: 'Frachtstücke' },
    { id: 'beladeplan', label: '3D-Beladeplan' },
    { id: 'route', label: 'Navigation' },
    { id: 'transport', label: 'Transportliste' },
  ]

  const primaryColor = '#2563eb'
  const headerBg = '#1a1a2e'
  const appName = 'Ladelogistik'
  const subtitle = 'Fahrzeuge, Frachtstücke & 3D-Beladepläne'

  return (
    <div className="app">
      <header className="app-header" style={{ background: headerBg, borderRadius: 12, padding: '16px 24px', marginBottom: 24 }}>
        <div className="header-row">
          <h1 style={{ color: '#fff', margin: 0, fontSize: '1.5rem' }}>{appName}</h1>
        </div>
        <p style={{ color: 'rgba(255,255,255,0.7)', margin: '4px 0 0', fontSize: '0.85rem' }}>{subtitle}</p>
      </header>

      <nav className="tab-nav">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            style={activeTab === tab.id ? { color: primaryColor, borderBottomColor: primaryColor } : {}}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <main className="tab-content">
        {activeTab === 'fahrzeuge' && (
          <Fahrzeugverwaltung
            fahrzeuge={fahrzeuge}
            setFahrzeuge={setFahrzeuge}
            selectedFahrzeug={selectedFahrzeug}
            setSelectedFahrzeug={setSelectedFahrzeug}
          />
        )}
        {activeTab === 'fracht' && (
          <Frachtstuecke
            frachtstuecke={frachtstuecke}
            addFrachtstueck={addFrachtstueck}
            removeFrachtstueck={removeFrachtstueck}
            updateFrachtstueck={updateFrachtstueck}
            clearFrachtstuecke={clearFrachtstuecke}
            importFrachtstuecke={importFrachtstuecke}
            fahrzeuge={fahrzeuge}
            majFahrzeug={majFahrzeug}
            setMajFahrzeug={setMajFahrzeugFor}
          />
        )}
        {activeTab === 'beladeplan' && (
          <Beladeplan
            fahrzeuge={fahrzeuge}
            selectedFahrzeug={selectedFahrzeug}
            frachtstuecke={frachtstuecke}
            majFahrzeug={majFahrzeug}
          />
        )}
        {activeTab === 'route' && (
          <Routenplanung fahrzeuge={fahrzeuge} incomingRoute={incomingRoute} />
        )}
        {activeTab === 'transport' && (
          <Transportliste frachtstuecke={frachtstuecke} onPlanRoute={planRoute} />
        )}
      </main>
    </div>
  )
}
