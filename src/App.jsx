import { useState, useEffect } from 'react'
import './App.css'
import Fahrzeugverwaltung from './components/Fahrzeugverwaltung.jsx'
import Frachtstuecke from './components/Frachtstuecke.jsx'
import Beladeplan from './components/Beladeplan.jsx'
import Routenplanung from './components/Routenplanung.jsx'
import Transportliste from './components/Transportliste.jsx'
import Auftragsjournal from './components/Auftragsjournal.jsx'
import Produktionsplanung from './components/Produktionsplanung.jsx'
import { SEED_AUFTRAEGE, migrateFromTransportliste, LEER_AUFTRAG } from './utils/auftraege.js'

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
  const [auftraege, setAuftraege] = useState(() => {
    const stored = localStorage.getItem('auftraege')
    if (stored) {
      try { return JSON.parse(stored) } catch { /* ignore */ }
    }
    // Migration: alte Transportliste übernehmen, falls vorhanden.
    const tl = localStorage.getItem('transportliste')
    if (tl) {
      try { return migrateFromTransportliste(JSON.parse(tl)) } catch { /* ignore */ }
    }
    return SEED_AUFTRAEGE
  })
  // Fortlaufendes "Arbeitsdatum": neue Aufträge übernehmen dieses Datum. Wird
  // aktualisiert, sobald ein Datum gesetzt/geändert wird. Bleibt bis zur
  // nächsten Änderung bestehen; Standard = zuletzt genutztes oder heutiges Datum.
  const heuteISO = () => new Date().toISOString().slice(0, 10)
  const [arbeitsDatum, setArbeitsDatum] = useState(() => {
    const stored = localStorage.getItem('arbeitsDatum')
    return stored || heuteISO()
  })
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

  useEffect(() => {
    localStorage.setItem('auftraege', JSON.stringify(auftraege))
  }, [auftraege])

  useEffect(() => {
    localStorage.setItem('arbeitsDatum', arbeitsDatum || '')
  }, [arbeitsDatum])

  // Datum ändern merkt sich das neue Datum als Arbeitsdatum -> folgende neue
  // Aufträge laufen mit diesem Datum weiter, bis es wieder geändert wird.
  const updateAuftrag = (id, changes) => {
    if (changes.datum) setArbeitsDatum(changes.datum)
    setAuftraege((prev) => prev.map((e) => (e.id === id ? { ...e, ...changes } : e)))
  }
  // Neuer Auftrag: Datum + Auftr.Nr. laufen automatisch weiter (fortlaufende
  // Nummer = höchste vorhandene numerische Auftr.Nr. + 1; Datum = Arbeitsdatum).
  const addAuftrag = (felder = {}) => {
    const datum = felder.datum || arbeitsDatum || heuteISO()
    if (datum !== arbeitsDatum) setArbeitsDatum(datum)
    setAuftraege((prev) => {
      const id = (prev.reduce((m, e) => Math.max(m, e.id || 0), 0) || 0) + 1
      const nummern = prev
        .map((e) => parseInt(String(e.auftrnr).replace(/\D/g, ''), 10))
        .filter((n) => Number.isFinite(n))
      const naechsteNr = nummern.length ? Math.max(...nummern) + 1 : 1
      const neu = { ...LEER_AUFTRAG, id, ...felder, datum }
      if (!neu.auftrnr) neu.auftrnr = String(naechsteNr)
      return [...prev, neu]
    })
  }
  const removeAuftrag = (id) => {
    setAuftraege((prev) => prev.filter((e) => e.id !== id))
  }

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

  // Airtable-artige Seitenleiste: Gruppe (Base) -> Ansicht(en).
  const NAV = [
    { group: 'Auftragsjournal AA', icon: '📖', items: [{ id: 'journal', label: 'Auftragsnummer' }] },
    { group: 'Transportliste AA', icon: '🚚', items: [{ id: 'transport', label: 'Transportliste' }] },
    { group: 'Produktionsplanung AA', icon: '🏭', items: [{ id: 'produktion', label: 'Produktionsplanung Werkstatt' }] },
    { group: 'Werkzeuge', icon: '🧰', items: [
      { id: 'fahrzeuge', label: 'Fahrzeuge' },
      { id: 'fracht', label: 'Frachtstücke' },
      { id: 'beladeplan', label: '3D-Beladeplan' },
      { id: 'route', label: 'Navigation' },
    ] },
  ]

  const aktiveGruppe = NAV.find((g) => g.items.some((i) => i.id === activeTab)) || NAV[0]
  const aktivesItem = aktiveGruppe.items.find((i) => i.id === activeTab) || aktiveGruppe.items[0]

  return (
    <div className="at-layout">
      <aside className="at-sidebar">
        <div className="at-workspace">
          <span className="at-workspace-icon">◆</span>
          <span>2026 Albin<br />Allenspach</span>
          <span className="at-caret">▾</span>
        </div>
        <nav className="at-nav">
          {NAV.map((g) => (
            <div className="at-nav-group" key={g.group}>
              <div className="at-nav-top"><span className="at-nav-ico">{g.icon}</span>{g.group}</div>
              {g.items.map((it) => (
                <div
                  key={it.id}
                  className={`at-nav-item ${activeTab === it.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(it.id)}
                >
                  {it.label}
                </div>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      <div className="at-main">
        <div className="at-topbar">
          <div className="at-crumb">
            <span className="at-crumb-base">{aktiveGruppe.group}</span>
            <span className="at-crumb-sep">›</span>
            <span className="at-crumb-cur">{aktivesItem.label}</span>
          </div>
          <div className="at-tools">
            <span>Gruppe</span><span>Filter</span><span>Sortieren</span><span className="at-tools-search">⌕</span>
          </div>
        </div>

        <main className="at-content">
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
        {activeTab === 'journal' && (
          <Auftragsjournal
            auftraege={auftraege}
            updateAuftrag={updateAuftrag}
            addAuftrag={addAuftrag}
            removeAuftrag={removeAuftrag}
            frachtstuecke={frachtstuecke}
          />
        )}
        {activeTab === 'transport' && (
          <Transportliste
            auftraege={auftraege}
            updateAuftrag={updateAuftrag}
            addAuftrag={addAuftrag}
            removeAuftrag={removeAuftrag}
            frachtstuecke={frachtstuecke}
            onPlanRoute={planRoute}
          />
        )}
        {activeTab === 'produktion' && (
          <Produktionsplanung
            auftraege={auftraege}
            updateAuftrag={updateAuftrag}
          />
        )}
        </main>
      </div>
    </div>
  )
}
