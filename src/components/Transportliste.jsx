import { useState, useEffect, useMemo } from 'react'

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

const LEER = {
  liefertermin: '', zeit: '', auftrnr: '', auftrnrKunde: '', kunde: '',
  objekt: '', abladestelle: '', chauffeur: '', fahrzeug: '', anhaenger: false,
  bemerkung: '', gewicht: '',
}

export default function Transportliste() {
  const [eintraege, setEintraege] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try { return JSON.parse(stored) } catch { /* ignore */ }
    }
    return SEED
  })
  const [gruppierung, setGruppierung] = useState('chauffeur')
  const [filterDatum, setFilterDatum] = useState('')
  const [form, setForm] = useState(LEER)
  const [editId, setEditId] = useState(null)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(eintraege))
  }, [eintraege])

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

  const toggleErledigt = (id) => {
    setEintraege((prev) => prev.map((e) => (e.id === id ? { ...e, erledigt: !e.erledigt } : e)))
  }

  const removeEintrag = (id) => {
    setEintraege((prev) => prev.filter((e) => e.id !== id))
  }

  const startEdit = (e) => {
    setEditId(e.id)
    setForm({ ...e })
    setShowForm(true)
  }

  const startNeu = () => {
    setEditId(null)
    setForm({ ...LEER, liefertermin: filterDatum || datumOptionen[0] || '' })
    setShowForm(true)
  }

  const speichern = () => {
    if (!form.auftrnr && !form.kunde && !form.chauffeur) return
    if (editId !== null) {
      setEintraege((prev) => prev.map((e) => (e.id === editId ? { ...e, ...form } : e)))
    } else {
      const id = (eintraege.reduce((m, e) => Math.max(m, e.id), 0) || 0) + 1
      setEintraege((prev) => [...prev, { ...form, id, erledigt: false }])
    }
    setShowForm(false)
    setForm(LEER)
    setEditId(null)
  }

  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }))

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
            <button className="btn btn-primary btn-small" onClick={startNeu}>+ Auftrag</button>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="card">
          <h2>{editId !== null ? 'Auftrag bearbeiten' : 'Neuer Transportauftrag'}</h2>
          <div className="tl-form">
            <div className="form-group"><label>Liefertermin</label><input type="date" value={form.liefertermin} onChange={(e) => setF('liefertermin', e.target.value)} /></div>
            <div className="form-group"><label>Zeit</label><input type="time" value={form.zeit} onChange={(e) => setF('zeit', e.target.value)} /></div>
            <div className="form-group"><label>Auftr.Nr.</label><input type="text" value={form.auftrnr} onChange={(e) => setF('auftrnr', e.target.value)} /></div>
            <div className="form-group"><label>Auftr.Nr. Kunde</label><input type="text" value={form.auftrnrKunde} onChange={(e) => setF('auftrnrKunde', e.target.value)} /></div>
            <div className="form-group"><label>Kunde</label><input type="text" value={form.kunde} onChange={(e) => setF('kunde', e.target.value)} /></div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}><label>Objekt</label><input type="text" value={form.objekt} onChange={(e) => setF('objekt', e.target.value)} /></div>
            <div className="form-group"><label>Abladestelle</label><input type="text" value={form.abladestelle} onChange={(e) => setF('abladestelle', e.target.value)} /></div>
            <div className="form-group"><label>Chauffeur</label><input type="text" value={form.chauffeur} onChange={(e) => setF('chauffeur', e.target.value)} /></div>
            <div className="form-group"><label>Fahrzeug</label><input type="text" value={form.fahrzeug} onChange={(e) => setF('fahrzeug', e.target.value)} /></div>
            <div className="form-group"><label>Gewicht</label><input type="text" value={form.gewicht} onChange={(e) => setF('gewicht', e.target.value)} /></div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}><label>Bemerkung Transport</label><input type="text" value={form.bemerkung} onChange={(e) => setF('bemerkung', e.target.value)} /></div>
            <div className="form-group" style={{ justifyContent: 'flex-end' }}>
              <label className="tl-check"><input type="checkbox" checked={form.anhaenger} onChange={(e) => setF('anhaenger', e.target.checked)} /> Anhänger</label>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="btn btn-primary" onClick={speichern}>Speichern</button>
            <button className="btn btn-secondary" onClick={() => { setShowForm(false); setEditId(null); setForm(LEER) }}>Abbrechen</button>
          </div>
        </div>
      )}

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
                    onToggle={toggleErledigt}
                    onEdit={startEdit}
                    onRemove={removeEintrag}
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

function GruppeBlock({ gruppe, rows, gruppierung, spaltenAnzahl, onToggle, onEdit, onRemove }) {
  const titel = gruppierung === 'liefertermin' ? formatDatum(gruppe) : gruppe
  return (
    <>
      {gruppierung && (
        <tr className="tl-group-row">
          <td colSpan={spaltenAnzahl}>
            <span className="tl-group-badge" style={badgeStyle(gruppe)}>{titel}</span>
            <span className="tl-group-count">{rows.length}</span>
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
          <td className="tl-nowrap">{formatDatum(e.liefertermin)}{e.zeit ? ` ${e.zeit}` : ''}</td>
          <td className="tl-nowrap">{e.auftrnr || '–'}</td>
          <td>{e.auftrnrKunde || '–'}</td>
          <td>{e.kunde ? <span className="tl-badge" style={badgeStyle(e.kunde)}>{e.kunde}</span> : '–'}</td>
          <td className="tl-objekt">{e.objekt || '–'}</td>
          <td>{e.abladestelle ? <span className="tl-badge" style={badgeStyle(e.abladestelle)}>{e.abladestelle}</span> : '–'}</td>
          <td>{e.chauffeur ? <span className="tl-badge" style={badgeStyle(e.chauffeur)}>{e.chauffeur}</span> : '–'}</td>
          <td className="tl-nowrap">
            {e.fahrzeug ? <span className="tl-badge" style={badgeStyle(e.fahrzeug)}>{e.fahrzeug}</span> : '–'}
            {e.anhaenger && <span className="tl-badge" style={badgeStyle('Anhänger')}>Anhänger</span>}
          </td>
          <td>{e.bemerkung || '–'}</td>
          <td className="tl-nowrap">{e.gewicht || '–'}</td>
          <td>
            <div className="tl-actions">
              <button className="btn btn-secondary btn-small" onClick={() => onEdit(e)}>✎</button>
              <button className="btn btn-danger btn-small" onClick={() => onRemove(e.id)}>✕</button>
            </div>
          </td>
        </tr>
      ))}
    </>
  )
}
