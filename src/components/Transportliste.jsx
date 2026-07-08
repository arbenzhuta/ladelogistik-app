import { useState, useMemo } from 'react'
import { EditCell, badgeStyle, formatDatum } from './TableCells.jsx'
import { majNummer, cleanAdresse } from '../utils/auftraege.js'

const GRUPPIER_FELDER = [
  { id: 'chauffeur', label: 'Chauffeur' },
  { id: 'abladestelle', label: 'Abladestelle' },
  { id: 'kunde', label: 'Kunde' },
  { id: 'liefertermin', label: 'Liefertermin' },
  { id: '', label: 'Keine' },
]

const SPALTEN = ['Aufträge', 'Liefertermin', 'Auftr.Nr.', 'Auftr.Nr. Kunde', 'Kunde', 'Objekt', 'Abladestelle', 'Chauffeur', 'Fahrzeug', 'Bemerkung Transp.', 'Gewicht', '']

export default function Transportliste({ auftraege = [], updateAuftrag, addAuftrag, removeAuftrag, frachtstuecke = [], onPlanRoute }) {
  const [gruppierung, setGruppierung] = useState('chauffeur')
  const [filterDatum, setFilterDatum] = useState('')

  const majNummern = useMemo(
    () => [...new Set(frachtstuecke.map((f) => majNummer(f.majFile)).filter(Boolean))].sort(),
    [frachtstuecke]
  )

  const datumOptionen = useMemo(
    () => [...new Set(auftraege.map((e) => e.liefertermin).filter(Boolean))].sort(),
    [auftraege]
  )

  const gefiltert = useMemo(
    () => auftraege.filter((e) => !filterDatum || e.liefertermin === filterDatum),
    [auftraege, filterDatum]
  )

  const gruppen = useMemo(() => {
    const map = new Map()
    for (const e of gefiltert) {
      const key = gruppierung ? (e[gruppierung] || '—') : 'Alle'
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(e)
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => ((a.liefertermin || '') + (a.zeit || '')).localeCompare((b.liefertermin || '') + (b.zeit || '')))
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [gefiltert, gruppierung])

  const updateFeld = (id, feld, wert) => updateAuftrag(id, { [feld]: wert })
  const toggleErledigt = (id) => {
    const e = auftraege.find((x) => x.id === id)
    updateAuftrag(id, { erledigt: !e?.erledigt })
  }

  const addEintrag = () => addAuftrag({ liefertermin: filterDatum || '', datum: filterDatum || '' })

  const ausMaj = () => {
    const vorhanden = new Set(auftraege.map((e) => e.auftrnr))
    majNummern.filter((nr) => !vorhanden.has(nr)).forEach((nr) => {
      addAuftrag({ auftrnr: nr, liefertermin: filterDatum || '', datum: filterDatum || '' })
    })
  }

  const rowsZuStops = (rows) => {
    const sortiert = [...rows].sort((a, b) =>
      ((a.liefertermin || '') + (a.zeit || '')).localeCompare((b.liefertermin || '') + (b.zeit || ''))
    )
    return sortiert.map((r) => ({ address: cleanAdresse(r.objekt), unload_time_min: 30 })).filter((s) => s.address)
  }

  const planeRoute = (rows, name = '') => {
    if (!onPlanRoute) return
    const stops = rowsZuStops(rows)
    if (stops.length) onPlanRoute([{ name, stops }])
  }

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

  return (
    <div>
      <div className="card">
        <div className="tl-toolbar">
          <div className="tl-toolbar-left">
            <label className="tl-filter-label">Liefertermin</label>
            <select value={filterDatum} onChange={(e) => setFilterDatum(e.target.value)} className="tl-select">
              <option value="">Alle</option>
              {datumOptionen.map((d) => <option key={d} value={d}>{formatDatum(d)}</option>)}
            </select>
            {filterDatum && <button className="btn btn-secondary btn-small" onClick={() => setFilterDatum('')}>Zurücksetzen</button>}
          </div>
          <div className="tl-toolbar-right">
            <label className="tl-filter-label">Gruppieren</label>
            <select value={gruppierung} onChange={(e) => setGruppierung(e.target.value)} className="tl-select">
              {GRUPPIER_FELDER.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
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
        <p className="tl-hint">Tipp: Jedes Feld einzeln anklicken zum Bearbeiten. Änderungen erscheinen auch im Auftragsjournal.</p>
      </div>

      <div className="card">
        {gefiltert.length === 0 ? (
          <p style={{ color: '#888' }}>Keine Transportaufträge. Mit „+ Auftrag" einen Eintrag anlegen.</p>
        ) : (
          <div className="tl-table-wrap">
            <table className="tl-table">
              <thead><tr>{SPALTEN.map((s, i) => <th key={i}>{s}</th>)}</tr></thead>
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
                    onRemove={removeAuftrag}
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
            <button className={`tl-status ${e.erledigt ? 'done' : ''}`} onClick={() => onToggle(e.id)} title={e.erledigt ? 'Erledigt' : 'Offen'}>
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
          <EditCell value={e.bemerkungTransp} onCommit={(v) => onUpdate(e.id, 'bemerkungTransp', v)} />
          <EditCell value={e.gewicht} nowrap onCommit={(v) => onUpdate(e.id, 'gewicht', v)} />
          <td><button className="btn btn-danger btn-small" onClick={() => onRemove(e.id)} title="Löschen">✕</button></td>
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
          <input type="date" value={e.liefertermin || ''} onChange={(ev) => onUpdate(e.id, 'liefertermin', ev.target.value)} />
          <input type="time" value={e.zeit || ''} onChange={(ev) => onUpdate(e.id, 'zeit', ev.target.value)} onBlur={() => setEditing(false)} />
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
          <input className="tl-edit-input" type="text" value={e.fahrzeug || ''} placeholder="Fahrzeug" onChange={(ev) => onUpdate(e.id, 'fahrzeug', ev.target.value)} autoFocus />
          <label className="tl-check"><input type="checkbox" checked={!!e.anhaenger} onChange={(ev) => onUpdate(e.id, 'anhaenger', ev.target.checked)} /> Anhänger</label>
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
