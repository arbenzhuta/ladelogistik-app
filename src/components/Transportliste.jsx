import { useState, useEffect, useMemo, useRef } from 'react'

const STORAGE_KEY = 'transportliste'

const SEED = [
  { id: 1, erledigt: false, liefertermin: '2026-06-25', zeit: '13:35', auftrnr: '26204270', auftrnrKunde: '', kunde: 'LKE AG, Zizers', objekt: 'Umbau Hof Grand Resort, Bad Ragaz/ UG Teil 1 / ZUL 1 1. Teil', abladestelle: 'Baustelle', chauffeur: 'Kuoni', fahrzeug: '0 extern', anhaenger: false, bemerkung: 'Lieferwagen ohne Anhänger', gewicht: '' },
  { id: 2, erledigt: false, liefertermin: '2026-06-25', zeit: '14:12', auftrnr: '26204353', auftrnrKunde: '', kunde: 'Hemair', objekt: 'Glattwiesenstrasse 24, Zürich / 26103508', abladestelle: 'Hemair', chauffeur: 'Flavio', fahrzeug: '1 GR29403', anhaenger: true, bemerkung: '', gewicht: '' },
  { id: 3, erledigt: true, liefertermin: '2026-06-25', zeit: '08:27', auftrnr: '26204469', auftrnrKunde: '', kunde: 'Spaeter AG, Nänikon', objekt: 'Lager, Nänikon (41832167)', abladestelle: 'Magazin', chauffeur: 'Flavio', fahrzeug: '1 GR29403', anhaenger: true, bemerkung: '', gewicht: '' },
  { id: 4, erledigt: false, liefertermin: '2026-06-25', zeit: '05:56', auftrnr: '26204364', auftrnrKunde: '', kunde: 'Kunz AG, Klosters', objekt: 'MFH Soldanella, Talstrasse 73, Klosters', abladestelle: 'Baustelle', chauffeur: 'Tiago', fahrzeug: '3 GR100703', anhaenger: true, bemerkung: '', gewicht: '' },
  { id: 5, erledigt: false, liefertermin: '2026-06-25', zeit: '08:32', auftrnr: '26204370', auftrnrKunde: '', kunde: 'Kunz AG, Klosters', objekt: 'MFH Soldanella, Talstrasse 73, Klosters', abladestelle: 'Baustelle', chauffeur: 'Tiago', fahrzeug: '3 GR100703', anhaenger: true, bemerkung: '', gewicht: '' },
  { id: 6, erledigt: false, liefertermin: '2026-06-25', zeit: '08:42', auftrnr: '26204373', auftrnrKunde: '', kunde: 'LKE AG, Zizers', objekt: 'Umbau Hof Grand Resort, Bad Ragaz/ EG Teil 4 Technikraum', abladestelle: 'Baustelle', chauffeur: 'Tiago', fahrzeug: '3 GR100703', anhaenger: false, bemerkung: '', gewicht: '' },
]

const GRUPPIER_FELDER = [
  { id: 'chauffeur', label: 'Chauffeur' },
  { id: 'abladestelle', label: 'Abladestelle' },
  { id: 'kunde', label: 'Kunde' },
  { id: 'liefertermin', label: 'Liefertermin' },
  { id: '', label: 'Keine' },
]

// Deterministische, gut lesbare Badge-Farbe aus einem Text.
function badgeStyle(text) {
  if (!text) return { background: '#f0f0f5', color: '#888' }
  let h = 0
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) % 360
  return { background: `hsl(${h}, 65%, 88%)`, color: `hsl(${h}, 60%, 30%)` }
}

function formatDatum(iso) {
  if (!iso) return '–'
  const [y, m, d] = iso.split('-')
  if (!y || !m || !d) return iso
  return `${parseInt(d)}.${parseInt(m)}.${y}`
}

// MAJ-Dateiname -> reine Auftrags-/Datei-Nr. (z.B. "26204378.MAJ" -> "26204378")
function majNummer(name) {
  if (!name) return ''
  return name.replace(/\.maj$/i, '').trim()
}

// Objekt-Text -> brauchbare Adresse fuer die Routenplanung. Entfernt die
// angehaengte Auftrags-Nr. ("... / 26103508") fuer besseres Geocoding.
function cleanAdresse(objekt) {
  if (!objekt) return ''
  return objekt.replace(/\s*\/\s*\d+\s*$/, '').trim()
}

const LEER = {
  liefertermin: '', zeit: '', auftrnr: '', auftrnrKunde: '', kunde: '',
  objekt: '', abladestelle: '', chauffeur: '', fahrzeug: '', anhaenger: false,
  bemerkung: '', gewicht: '',
}

// Eine einzeln editierbare Zelle: Klick -> Eingabefeld, Enter/Blur speichert,
// Escape bricht ab. So lässt sich jedes Feld einzeln bearbeiten.
function EditCell({ value, onCommit, type = 'text', options, badge, placeholder = '–', nowrap }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value ?? '')
  const inputRef = useRef(null)
  const listId = useRef('dl_' + Math.random().toString(36).slice(2)).current

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      if (inputRef.current.select) inputRef.current.select()
    }
  }, [editing])

  const start = () => { setDraft(value ?? ''); setEditing(true) }
  const commit = () => { setEditing(false); if (draft !== value) onCommit(draft) }
  const cancel = () => { setEditing(false); setDraft(value ?? '') }

  if (editing) {
    return (
      <td className={nowrap ? 'tl-nowrap' : ''}>
        <input
          ref={inputRef}
          className="tl-edit-input"
          type={type}
          value={draft}
          list={options ? listId : undefined}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === 'Enter') commit(); else if (e.key === 'Escape') cancel() }}
        />
        {options && (
          <datalist id={listId}>
            {options.map((o) => <option key={o} value={o} />)}
          </datalist>
        )}
      </td>
    )
  }

  return (
    <td className={`tl-cell ${nowrap ? 'tl-nowrap' : ''}`} onClick={start} title="Klicken zum Bearbeiten">
      {value
        ? (badge ? <span className="tl-badge" style={badgeStyle(value)}>{value}</span> : value)
        : <span className="tl-empty">–</span>}
    </td>
  )
}

export default function Transportliste({ frachtstuecke = [], onPlanRoute }) {
  const [eintraege, setEintraege] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try { return JSON.parse(stored) } catch { /* ignore */ }
    }
    return SEED
  })
  const [gruppierung, setGruppierung] = useState('chauffeur')
  const [filterDatum, setFilterDatum] = useState('')

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(eintraege))
  }, [eintraege])

  // Verfügbare MAJ-Datei-Nummern aus den importierten Frachtstücken.
  const majNummern = useMemo(
    () => [...new Set(frachtstuecke.map((f) => majNummer(f.majFile)).filter(Boolean))].sort(),
    [frachtstuecke]
  )

  const datumOptionen = useMemo(
    () => [...new Set(eintraege.map((e) => e.liefertermin).filter(Boolean))].sort(),
    [eintraege]
  )

  const gefiltert = useMemo(
    () => eintraege.filter((e) => !filterDatum || e.liefertermin === filterDatum),
    [eintraege, filterDatum]
  )

  const gruppen = useMemo(() => {
    const map = new Map()
    for (const e of gefiltert) {
      const key = gruppierung ? (e[gruppierung] || '—') : 'Alle'
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(e)
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => (a.liefertermin + a.zeit).localeCompare(b.liefertermin + b.zeit))
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [gefiltert, gruppierung])

  const updateFeld = (id, feld, wert) => {
    setEintraege((prev) => prev.map((e) => (e.id === id ? { ...e, [feld]: wert } : e)))
  }

  const toggleErledigt = (id) => {
    setEintraege((prev) => prev.map((e) => (e.id === id ? { ...e, erledigt: !e.erledigt } : e)))
  }

  const removeEintrag = (id) => {
    setEintraege((prev) => prev.filter((e) => e.id !== id))
  }

  const neuerId = () => (eintraege.reduce((m, e) => Math.max(m, e.id), 0) || 0) + 1

  const addEintrag = () => {
    setEintraege((prev) => [...prev, { ...LEER, id: neuerId(), erledigt: false, liefertermin: filterDatum || '' }])
  }

  // Aus Auftraegen die Stopps bauen: Objekt-Adressen in Liefer-Reihenfolge.
  const rowsZuStops = (rows) => {
    const sortiert = [...rows].sort((a, b) =>
      (a.liefertermin + a.zeit).localeCompare(b.liefertermin + b.zeit)
    )
    return sortiert
      .map((r) => ({ address: cleanAdresse(r.objekt), unload_time_min: 30 }))
      .filter((s) => s.address)
  }

  // Eine gemeinsame Route aus den Auftraegen.
  const planeRoute = (rows, name = '') => {
    if (!onPlanRoute) return
    const stops = rowsZuStops(rows)
    if (stops.length) onPlanRoute([{ name, stops }])
  }

  // Pro Fahrzeug eine eigene Route: Auftraege nach Fahrzeug gruppieren.
  const planeRoutenProFahrzeug = (rows) => {
    if (!onPlanRoute) return
    const map = new Map()
    for (const r of rows) {
      const key = r.fahrzeug || '— ohne Fahrzeug —'
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(r)
    }
    const plans = [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([name, gruppe]) => ({
        name: name + (gruppe.some((g) => g.anhaenger) ? ' + Anhänger' : ''),
        stops: rowsZuStops(gruppe),
      }))
      .filter((p) => p.stops.length)
    if (plans.length) onPlanRoute(plans)
  }

  // Pro importierter MAJ-Datei einen Auftrag erzeugen (Auftr.Nr = Datei-Nr).
  const ausMaj = () => {
    const vorhanden = new Set(eintraege.map((e) => e.auftrnr))
    let id = neuerId()
    const neu = majNummern
      .filter((nr) => !vorhanden.has(nr))
      .map((nr) => ({ ...LEER, id: id++, erledigt: false, auftrnr: nr, liefertermin: filterDatum || '' }))
    if (neu.length) setEintraege((prev) => [...prev, ...neu])
  }

  const SPALTEN = ['Aufträge', 'Liefertermin', 'Auftr.Nr.', 'Auftr.Nr. Kunde', 'Kunde', 'Objekt', 'Abladestelle', 'Chauffeur', 'Fahrzeug', 'Bemerkung Transp.', 'Gewicht', '']

  return (
    <div>
      <div className="card">
        <div className="tl-toolbar">
          <div className="tl-toolbar-left">
            <label className="tl-filter-label">Liefertermin</label>
            <select value={filterDatum} onChange={(e) => setFilterDatum(e.target.value)} className="tl-select">
              <option value="">Alle</option>
              {datumOptionen.map((d) => (
                <option key={d} value={d}>{formatDatum(d)}</option>
              ))}
            </select>
            {filterDatum && (
              <button className="btn btn-secondary btn-small" onClick={() => setFilterDatum('')}>Zurücksetzen</button>
            )}
          </div>
          <div className="tl-toolbar-right">
            <label className="tl-filter-label">Gruppieren</label>
            <select value={gruppierung} onChange={(e) => setGruppierung(e.target.value)} className="tl-select">
              {GRUPPIER_FELDER.map((g) => (
                <option key={g.id} value={g.id}>{g.label}</option>
              ))}
            </select>
            {majNummern.length > 0 && (
              <button className="btn btn-secondary btn-small" onClick={ausMaj} title="Pro importierter MAJ-Datei einen Auftrag anlegen">+ aus MAJ</button>
            )}
            <button className="btn btn-primary btn-small" onClick={addEintrag}>+ Auftrag</button>
          </div>
        </div>
        <div className="tl-toolbar-route">
          <button className="btn btn-success btn-small" onClick={() => planeRoute(gefiltert)} disabled={!gefiltert.length} title="Alle sichtbaren Aufträge als gemeinsame Route in die Navigation laden">
            🗺️ Route aus ganzer Liste planen
          </button>
          <button className="btn btn-primary btn-small" onClick={() => planeRoutenProFahrzeug(gefiltert)} disabled={!gefiltert.length} title="Pro Fahrzeug eine eigene Route in die Navigation laden">
            🚚 Route pro Fahrzeug planen
          </button>
        </div>
        <p className="tl-hint">Tipp: Jedes Feld einzeln anklicken zum Bearbeiten. „Auftr.Nr." = MAJ-Datei-Nr.</p>
      </div>

      <div className="card">
        {gefiltert.length === 0 ? (
          <p style={{ color: '#888' }}>Keine Transportaufträge. Mit „+ Auftrag" einen Eintrag anlegen.</p>
        ) : (
          <div className="tl-table-wrap">
            <table className="tl-table">
              <thead>
                <tr>{SPALTEN.map((s, i) => <th key={i}>{s}</th>)}</tr>
              </thead>
              <tbody>
                {gruppen.map(([gruppe, rows]) => (
                  <GruppeBlock
                    key={gruppe}
                    gruppe={gruppe}
                    rows={rows}
                    gruppierung={gruppierung}
                    spaltenAnzahl={SPALTEN.length}
                    majNummern={majNummern}
                    onToggle={toggleErledigt}
                    onUpdate={updateFeld}
                    onRemove={removeEintrag}
                    onPlanRoute={onPlanRoute ? () => planeRoute(rows) : null}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function GruppeBlock({ gruppe, rows, gruppierung, spaltenAnzahl, majNummern, onToggle, onUpdate, onRemove, onPlanRoute }) {
  const titel = gruppierung === 'liefertermin' ? formatDatum(gruppe) : gruppe
  return (
    <>
      {gruppierung && (
        <tr className="tl-group-row">
          <td colSpan={spaltenAnzahl}>
            <div className="tl-group-head">
              <div>
                <span className="tl-group-badge" style={badgeStyle(gruppe)}>{titel}</span>
                <span className="tl-group-count">{rows.length}</span>
              </div>
              {onPlanRoute && (
                <button className="btn btn-success btn-small" onClick={onPlanRoute} title="Aufträge dieser Gruppe als Route in die Navigation laden">
                  🗺️ Route planen
                </button>
              )}
            </div>
          </td>
        </tr>
      )}
      {rows.map((e) => (
        <tr key={e.id} className="tl-row">
          <td>
            <button
              className={`tl-status ${e.erledigt ? 'done' : ''}`}
              onClick={() => onToggle(e.id)}
              title={e.erledigt ? 'Erledigt' : 'Offen'}
            >
              {e.erledigt ? '✓' : ''}
            </button>
          </td>
          <LieferterminCell e={e} onUpdate={onUpdate} />
          <EditCell value={e.auftrnr} options={majNummern} nowrap onCommit={(v) => onUpdate(e.id, 'auftrnr', v)} />
          <EditCell value={e.auftrnrKunde} onCommit={(v) => onUpdate(e.id, 'auftrnrKunde', v)} />
          <EditCell value={e.kunde} badge onCommit={(v) => onUpdate(e.id, 'kunde', v)} />
          <EditCell value={e.objekt} onCommit={(v) => onUpdate(e.id, 'objekt', v)} />
          <EditCell value={e.abladestelle} badge onCommit={(v) => onUpdate(e.id, 'abladestelle', v)} />
          <EditCell value={e.chauffeur} badge onCommit={(v) => onUpdate(e.id, 'chauffeur', v)} />
          <FahrzeugCell e={e} onUpdate={onUpdate} />
          <EditCell value={e.bemerkung} onCommit={(v) => onUpdate(e.id, 'bemerkung', v)} />
          <EditCell value={e.gewicht} nowrap onCommit={(v) => onUpdate(e.id, 'gewicht', v)} />
          <td>
            <button className="btn btn-danger btn-small" onClick={() => onRemove(e.id)} title="Löschen">✕</button>
          </td>
        </tr>
      ))}
    </>
  )
}

function LieferterminCell({ e, onUpdate }) {
  const [editing, setEditing] = useState(false)
  if (editing) {
    return (
      <td className="tl-nowrap">
        <div className="tl-dt-edit">
          <input type="date" value={e.liefertermin} onChange={(ev) => onUpdate(e.id, 'liefertermin', ev.target.value)} />
          <input type="time" value={e.zeit} onChange={(ev) => onUpdate(e.id, 'zeit', ev.target.value)} onBlur={() => setEditing(false)} />
          <button className="btn btn-secondary btn-small" onClick={() => setEditing(false)}>OK</button>
        </div>
      </td>
    )
  }
  return (
    <td className="tl-cell tl-nowrap" onClick={() => setEditing(true)} title="Klicken zum Bearbeiten">
      {e.liefertermin ? `${formatDatum(e.liefertermin)}${e.zeit ? ` ${e.zeit}` : ''}` : <span className="tl-empty">–</span>}
    </td>
  )
}

function FahrzeugCell({ e, onUpdate }) {
  const [editing, setEditing] = useState(false)
  if (editing) {
    return (
      <td className="tl-nowrap">
        <div className="tl-dt-edit">
          <input className="tl-edit-input" type="text" value={e.fahrzeug} placeholder="Fahrzeug" onChange={(ev) => onUpdate(e.id, 'fahrzeug', ev.target.value)} autoFocus />
          <label className="tl-check"><input type="checkbox" checked={e.anhaenger} onChange={(ev) => onUpdate(e.id, 'anhaenger', ev.target.checked)} /> Anhänger</label>
          <button className="btn btn-secondary btn-small" onClick={() => setEditing(false)}>OK</button>
        </div>
      </td>
    )
  }
  return (
    <td className="tl-cell tl-nowrap" onClick={() => setEditing(true)} title="Klicken zum Bearbeiten">
      {e.fahrzeug ? <span className="tl-badge" style={badgeStyle(e.fahrzeug)}>{e.fahrzeug}</span> : <span className="tl-empty">–</span>}
      {e.anhaenger && <span className="tl-badge" style={badgeStyle('Anhänger')}>Anhänger</span>}
    </td>
  )
}
