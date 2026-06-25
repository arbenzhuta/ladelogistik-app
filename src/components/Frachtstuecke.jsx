import { useState, useRef } from 'react'
import { parseMAJFile } from '../utils/majParser'
import { parseCSVFile } from '../utils/csvParser'

const FARBEN = [
  '#4a90d9', '#e67e22', '#2ecc71', '#e74c3c', '#9b59b6',
  '#1abc9c', '#f39c12', '#3498db', '#e91e63', '#795548',
  '#607d8b', '#ff5722', '#8bc34a', '#00bcd4', '#ffc107',
]

const DEFAULT_KANAL = { typ: 'kanal', name: '', a: '', b: '', L: '', farbe: '#4a90d9', anzahl: 1 }
const DEFAULT_SPIRO = { typ: 'spiro', name: '', durchmesser: '', L: '', farbe: '#e67e22', anzahl: 1 }
const DEFAULT_KONUS = { typ: 'konus', name: '', a: '', b: '', L: '', farbe: '#2ecc71', anzahl: 1 }

export default function Frachtstuecke({
  frachtstuecke,
  addFrachtstueck,
  removeFrachtstueck,
  updateFrachtstueck,
  clearFrachtstuecke,
  importFrachtstuecke,
  fahrzeuge = [],
  majFahrzeug = {},
  setMajFahrzeug,
}) {
  const [formTyp, setFormTyp] = useState('kanal')
  const [form, setForm] = useState({ ...DEFAULT_KANAL })
  const [importStatus, setImportStatus] = useState(null)
  const fileInputRef = useRef(null)
  const csvInputRef = useRef(null)

  const handleTypChange = (typ) => {
    setFormTyp(typ)
    if (typ === 'kanal') setForm({ ...DEFAULT_KANAL })
    else if (typ === 'spiro') setForm({ ...DEFAULT_SPIRO })
    else setForm({ ...DEFAULT_KONUS })
  }

  const handleAdd = () => {
    if (!form.name) return

    if (form.typ === 'spiro') {
      if (!form.durchmesser || !form.L) return
      addFrachtstueck({
        typ: 'spiro',
        name: form.name,
        durchmesser: parseFloat(form.durchmesser),
        L: parseFloat(form.L),
        farbe: form.farbe,
        anzahl: parseInt(form.anzahl) || 1,
      })
    } else {
      if (!form.a || !form.b || !form.L) return
      addFrachtstueck({
        typ: form.typ,
        name: form.name,
        a: parseFloat(form.a),
        b: parseFloat(form.b),
        L: parseFloat(form.L),
        farbe: form.farbe,
        anzahl: parseInt(form.anzahl) || 1,
      })
    }

    if (formTyp === 'kanal') setForm({ ...DEFAULT_KANAL })
    else if (formTyp === 'spiro') setForm({ ...DEFAULT_SPIRO })
    else setForm({ ...DEFAULT_KONUS })
  }

  const handleMAJImport = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    setImportStatus({ type: 'loading', message: 'MAJ-Datei wird eingelesen...' })

    try {
      const arrayBuffer = await file.arrayBuffer()
      const articles = parseMAJFile(arrayBuffer)

      if (articles.length === 0) {
        setImportStatus({ type: 'error', message: 'Keine Artikel in der MAJ-Datei gefunden.' })
        return
      }

      importFrachtstuecke(articles, file.name)
      const totalStk = articles.reduce((sum, a) => sum + a.anzahl, 0)
      setImportStatus({
        type: 'success',
        message: `${file.name}: ${articles.length} Artikel (${totalStk} Stück) importiert:\n${articles.map((a) => `• ${a.pos ? a.pos + ' ' : ''}${a.name} — Menge: ${a.anzahl}`).join('\n')}`,
      })
    } catch (err) {
      setImportStatus({ type: 'error', message: `Import-Fehler: ${err.message}` })
    }

    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleCSVImport = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    setImportStatus({ type: 'loading', message: 'CSV-Datei wird eingelesen...' })

    try {
      const text = await file.text()
      const articles = parseCSVFile(text)

      if (articles.length === 0) {
        setImportStatus({ type: 'error', message: 'Keine Artikel in der CSV-Datei gefunden.' })
        return
      }

      importFrachtstuecke(articles, file.name)
      const totalStk = articles.reduce((sum, a) => sum + a.anzahl, 0)
      setImportStatus({
        type: 'success',
        message: `${file.name}: ${articles.length} Artikel (${totalStk} Stück) importiert: ${articles.map((a) => `${a.name} ${a.a}×${a.b || a.durchmesser}×${a.L} (${a.anzahl}×)`).join(', ')}`,
      })
    } catch (err) {
      setImportStatus({ type: 'error', message: `CSV-Import-Fehler: ${err.message}` })
    }

    if (csvInputRef.current) csvInputRef.current.value = ''
  }

  const gesamtAnzahl = frachtstuecke.reduce((sum, f) => sum + f.anzahl, 0)

  const beschreibung = (f) => {
    if (f.typ === 'spiro') return `ø${f.durchmesser} mm × L ${f.L} mm`
    if (f.typ === 'konus' && f.eingangA != null)
      return `Eingang ${f.eingangA}×${f.eingangB} → Ausgang ${f.ausgangA}×${f.ausgangB} · L ${f.L} · Versatz 1: ${f.versatz1} / Versatz 2: ${f.versatz2} mm`
    if (f.typ === 'bogen')
      return `${f.eingangA}×${f.eingangB}${f.reduziert ? ` → ${f.ausgangA}×${f.eingangB}` : ''} · ${f.grad}° · R ${f.radius} mm`
    return `${f.a} × ${f.b} × L ${f.L} mm`
  }

  return (
    <div>
      <div className="card">
        <h2>Datei importieren</h2>
        <p style={{ color: '#888', marginBottom: 12, fontSize: 14 }}>
          Laden Sie eine .MAJ- oder .CSV-Datei hoch, um Frachtstücke automatisch zu importieren.
          CSV-Import liefert genauere Ergebnisse.
        </p>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".MAJ,.maj"
            onChange={handleMAJImport}
            style={{ display: 'none' }}
          />
          <input
            ref={csvInputRef}
            type="file"
            accept=".CSV,.csv"
            onChange={handleCSVImport}
            style={{ display: 'none' }}
          />
          <button
            className="btn btn-primary"
            onClick={() => fileInputRef.current?.click()}
            style={{ padding: '10px 24px' }}
          >
            MAJ-Datei
          </button>
          <button
            className="btn btn-primary"
            onClick={() => csvInputRef.current?.click()}
            style={{ padding: '10px 24px', background: '#16a34a' }}
          >
            CSV-Datei
          </button>
        </div>
        {importStatus && (
          <div
            style={{
              marginTop: 12,
              padding: '10px 14px',
              borderRadius: 8,
              backgroundColor:
                importStatus.type === 'success' ? '#d4edda' :
                importStatus.type === 'error' ? '#f8d7da' : '#fff3cd',
              color:
                importStatus.type === 'success' ? '#155724' :
                importStatus.type === 'error' ? '#721c24' : '#856404',
              fontSize: 14,
            }}
          >
            {importStatus.message.split('\n').map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h2>Neues Frachtstück hinzufügen</h2>

        <div className="typ-selector">
          {['kanal', 'spiro', 'konus'].map((t) => (
            <button
              key={t}
              className={`typ-btn ${formTyp === t ? 'active' : ''}`}
              onClick={() => handleTypChange(t)}
            >
              {t === 'kanal' ? 'Kanal' : t === 'spiro' ? 'Spiro' : 'Konus'}
            </button>
          ))}
        </div>

        <div className="fracht-form">
          <div className="form-group">
            <label>Name</label>
            <input
              type="text"
              placeholder={formTyp === 'kanal' ? 'z.B. Kanal 200x100' : formTyp === 'spiro' ? 'z.B. Spiro ø160' : 'z.B. Konus 200/160'}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          {form.typ === 'spiro' ? (
            <>
              <div className="form-group">
                <label>ø Durchmesser (mm)</label>
                <input
                  type="number"
                  placeholder="160"
                  value={form.durchmesser}
                  onChange={(e) => setForm({ ...form, durchmesser: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>L Länge (mm)</label>
                <input
                  type="number"
                  placeholder="1000"
                  value={form.L}
                  onChange={(e) => setForm({ ...form, L: e.target.value })}
                />
              </div>
            </>
          ) : (
            <>
              <div className="form-group">
                <label>a Breite (mm)</label>
                <input
                  type="number"
                  placeholder="200"
                  value={form.a}
                  onChange={(e) => setForm({ ...form, a: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>b Höhe (mm)</label>
                <input
                  type="number"
                  placeholder="100"
                  value={form.b}
                  onChange={(e) => setForm({ ...form, b: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>L Länge (mm)</label>
                <input
                  type="number"
                  placeholder="1000"
                  value={form.L}
                  onChange={(e) => setForm({ ...form, L: e.target.value })}
                />
              </div>
            </>
          )}

          <div className="form-group">
            <label>Anzahl</label>
            <input
              type="number"
              min="1"
              value={form.anzahl}
              onChange={(e) => setForm({ ...form, anzahl: e.target.value })}
            />
          </div>
        </div>

        <div className="farb-auswahl">
          <label>Farbe wählen:</label>
          <div className="farb-grid">
            {FARBEN.map((farbe) => (
              <button
                key={farbe}
                className={`farb-btn ${form.farbe === farbe ? 'selected' : ''}`}
                style={{ backgroundColor: farbe }}
                onClick={() => setForm({ ...form, farbe })}
              />
            ))}
            <input
              type="color"
              value={form.farbe}
              onChange={(e) => setForm({ ...form, farbe: e.target.value })}
              className="farb-custom"
              title="Eigene Farbe"
            />
          </div>
        </div>

        <button className="btn btn-primary" onClick={handleAdd} style={{ marginTop: 16, width: '100%' }}>
          Hinzufügen
        </button>
      </div>

      {frachtstuecke.length > 0 && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0 }}>Frachtstücke ({gesamtAnzahl} Stück gesamt)</h2>
            <button className="btn btn-danger" onClick={clearFrachtstuecke}>
              Alle löschen
            </button>
          </div>
          <div className="fracht-list">
            {(() => {
              const groups = []
              let currentGroup = null
              frachtstuecke.forEach((f) => {
                const groupKey = f.majFile || '__manuell__'
                if (groupKey !== currentGroup) {
                  currentGroup = groupKey
                  groups.push({ type: 'header', key: groupKey, label: f.majFile || 'Manuell hinzugefügt' })
                }
                groups.push({ type: 'item', data: f })
              })
              const majFiles = [...new Set(frachtstuecke.filter((f) => f.majFile).map((f) => f.majFile))]
              const showHeaders = majFiles.length > 0
              return groups.map((entry, idx) => {
                if (entry.type === 'header' && showHeaders) {
                  const groupItems = frachtstuecke.filter((f) => (f.majFile || '__manuell__') === entry.key)
                  const groupCount = groupItems.reduce((s, f) => s + f.anzahl, 0)
                  return (
                    <div key={`hdr-${entry.key}-${idx}`} style={{
                      padding: '8px 14px',
                      marginTop: idx > 0 ? 12 : 0,
                      marginBottom: 4,
                      background: '#e8f0fe',
                      borderRadius: 8,
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      color: '#1a56db',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}>
                      <span>{entry.label}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {entry.key !== '__manuell__' && setMajFahrzeug && fahrzeuge.length > 0 && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, color: '#1a56db' }}>
                            <span role="img" aria-label="Fahrzeug">🚚</span>
                            <select
                              value={majFahrzeug[entry.key] ?? ''}
                              onChange={(e) => setMajFahrzeug(entry.key, e.target.value === '' ? '' : parseInt(e.target.value))}
                              style={{
                                padding: '3px 8px',
                                borderRadius: 6,
                                border: '1px solid #b6c8f0',
                                background: '#fff',
                                color: '#1a56db',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                              }}
                            >
                              <option value="">Fahrzeug wählen…</option>
                              {fahrzeuge.map((f, fi) => (
                                <option key={fi} value={fi}>
                                  {f.name} ({f.laenge}×{f.breite}×{f.hoehe}m)
                                </option>
                              ))}
                            </select>
                          </span>
                        )}
                        <span style={{ fontWeight: 500, color: '#555' }}>{groupCount} Stück</span>
                      </div>
                    </div>
                  )
                }
                if (entry.type !== 'item') return null
                const f = entry.data
                return (
                  <div key={f.id} className="fracht-item">
                    <div className="fracht-info">
                      <div
                        className="fracht-color"
                        style={{
                          backgroundColor: f.farbe,
                          borderRadius: f.typ === 'spiro' ? '50%' : '8px',
                        }}
                      />
                      <div className="fracht-details">
                        <h3>
                          {f.pos && (
                            <span style={{
                              display: 'inline-block',
                              background: '#1a56db',
                              color: '#fff',
                              borderRadius: 6,
                              padding: '1px 7px',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              marginRight: 8,
                            }}>{f.pos}</span>
                          )}
                          {f.name}
                          <span className="fracht-typ-badge">{f.typ === 'kanal' ? 'Kanal' : f.typ === 'spiro' ? 'Spiro' : 'Konus'}</span>
                        </h3>
                        <p>{beschreibung(f)} — <strong>Menge: {f.anzahl}</strong></p>
                      </div>
                    </div>
                    <div className="fracht-controls">
                      <button className="count-btn" onClick={() => updateFrachtstueck(f.id, { anzahl: Math.max(0, f.anzahl - 1) })}>
                        −
                      </button>
                      <span className="count">{f.anzahl}</span>
                      <button className="count-btn" onClick={() => updateFrachtstueck(f.id, { anzahl: f.anzahl + 1 })}>
                        +
                      </button>
                      <button className="btn btn-danger" onClick={() => removeFrachtstueck(f.id)} style={{ marginLeft: 8 }}>
                        x
                      </button>
                    </div>
                  </div>
                )
              })
            })()}
          </div>
        </div>
      )}
    </div>
  )
}
