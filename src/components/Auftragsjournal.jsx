import { useMemo, useState } from 'react'
import { EditCell, StatusCell, CheckCell, DatumZeitCell, badgeStyle, formatDatum } from './TableCells.jsx'
import { LIEFERARTEN, majNummer } from '../utils/auftraege.js'

const SPALTEN = [
  'Aufträge', 'Datum', 'Visum', 'Auft.Nr.', 'Kunde', 'Objekt', 'Liefertermin', 'Prod.Termin',
  'Keine Prod.', 'auf Abruf', 'Lieferart', 'Bemerkung Transp.',
  'Kanäle', 'Status-KA', 'Formstücke', 'Status-FST', 'Rund', 'Status-R',
  'Armaturen', 'Status-Arm.', 'Bemerkung Prod.', '',
]

export default function Auftragsjournal({ auftraege, updateAuftrag, addAuftrag, removeAuftrag, frachtstuecke = [] }) {
  const [filterDatum, setFilterDatum] = useState('')

  const majNummern = useMemo(
    () => [...new Set(frachtstuecke.map((f) => majNummer(f.majFile)).filter(Boolean))].sort(),
    [frachtstuecke]
  )

  const datumOptionen = useMemo(
    () => [...new Set(auftraege.map((e) => e.datum).filter(Boolean))].sort(),
    [auftraege]
  )

  const gefiltert = useMemo(
    () => auftraege.filter((e) => !filterDatum || e.datum === filterDatum),
    [auftraege, filterDatum]
  )

  const gruppen = useMemo(() => {
    const map = new Map()
    for (const e of gefiltert) {
      const key = e.datum || '—'
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(e)
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => (a.auftrnr || '').localeCompare(b.auftrnr || ''))
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [gefiltert])

  // Mengen einer MAJ-Datei nach Journal-Spalten zusammenfassen.
  // kanal -> Kanäle, bogen/konus -> Formstücke, spiro/rund -> Rund.
  const mengenFuer = (nr) => {
    const teile = frachtstuecke.filter((f) => majNummer(f.majFile) === nr)
    const summe = (typen) =>
      teile.filter((t) => typen.includes(t.typ)).reduce((s, t) => s + (Number(t.anzahl) || Number(t.menge) || 1), 0)
    const kanaele = summe(['kanal'])
    const formstuecke = summe(['bogen', 'konus'])
    const rund = summe(['spiro', 'rund'])
    return {
      kanaele: kanaele ? String(kanaele) : '',
      formstuecke: formstuecke ? String(formstuecke) : '',
      rund: rund ? String(rund) : '',
    }
  }

  // Pro MAJ-Datei einen Auftrag anlegen bzw. vorhandenen aktualisieren –
  // überträgt jeweils alle geparsten Mengen individuell.
  const ausMaj = () => {
    majNummern.forEach((nr) => {
      const mengen = mengenFuer(nr)
      const exist = auftraege.find((e) => e.auftrnr === nr)
      if (exist) updateAuftrag(exist.id, mengen)
      else addAuftrag({ auftrnr: nr, datum: filterDatum || '', ...mengen })
    })
  }

  const u = (id) => (feld, wert) => updateAuftrag(id, { [feld]: wert })

  return (
    <div className="at-view">
      <div className="at-filterbar">
        <div className="at-filter-pill">
          <span>Datum is</span>
          <select value={filterDatum} onChange={(e) => setFilterDatum(e.target.value)}>
            <option value="">Alle</option>
            {datumOptionen.map((d) => <option key={d} value={d}>{formatDatum(d)}</option>)}
          </select>
        </div>
        {filterDatum && <button className="at-link" onClick={() => setFilterDatum('')}>Zurücksetzen</button>}
        <div className="at-filterbar-right">
          {majNummern.length > 0 && (
            <button className="btn btn-secondary btn-small" onClick={ausMaj} title="Pro importierter MAJ-Datei einen Auftrag anlegen">+ aus MAJ</button>
          )}
          <button className="btn btn-primary btn-small" onClick={() => addAuftrag({ datum: filterDatum || '' })}>+ Auftrag</button>
        </div>
      </div>

      <div className="at-tablecard">
        {gefiltert.length === 0 ? (
          <p style={{ color: '#888' }}>Keine Aufträge. Mit „+ Auftrag" oder „+ aus MAJ" anlegen.</p>
        ) : (
          <div className="tl-table-wrap">
            <table className="tl-table">
              <thead><tr>{SPALTEN.map((s, i) => <th key={i}>{s}</th>)}</tr></thead>
              <tbody>
                {gruppen.map(([datum, rows]) => (
                  <Datumsblock
                    key={datum}
                    datum={datum}
                    rows={rows}
                    anzahl={SPALTEN.length}
                    onChangeDatum={(neu) => rows.forEach((r) => updateAuftrag(r.id, { datum: neu }))}
                  >
                    {rows.map((e) => {
                      const set = u(e.id)
                      return (
                        <tr key={e.id} className="tl-row">
                          <StatusCell on={e.erledigt} onToggle={() => set('erledigt', !e.erledigt)} />
                          <DatumZeitCell datum={e.datum} onDatum={(v) => set('datum', v)} />
                          <EditCell value={e.visum} badge nowrap onCommit={(v) => set('visum', v)} />
                          <EditCell value={e.auftrnr} options={majNummern} nowrap onCommit={(v) => set('auftrnr', v)} />
                          <EditCell value={e.kunde} badge onCommit={(v) => set('kunde', v)} />
                          <EditCell value={e.objekt} onCommit={(v) => set('objekt', v)} />
                          <DatumZeitCell datum={e.liefertermin} zeit={e.zeit} onDatum={(v) => set('liefertermin', v)} onZeit={(v) => set('zeit', v)} />
                          <DatumZeitCell datum={e.prodTermin} onDatum={(v) => set('prodTermin', v)} />
                          <CheckCell checked={e.keineProduktion} onToggle={() => set('keineProduktion', !e.keineProduktion)} />
                          <CheckCell checked={e.aufAbruf} onToggle={() => set('aufAbruf', !e.aufAbruf)} />
                          <EditCell value={e.lieferart} badge options={LIEFERARTEN} nowrap onCommit={(v) => set('lieferart', v)} />
                          <EditCell value={e.bemerkungTransp} onCommit={(v) => set('bemerkungTransp', v)} />
                          <EditCell value={e.kanaele} type="number" align="center" nowrap onCommit={(v) => set('kanaele', v)} />
                          <StatusCell on={e.statusKA} onToggle={() => set('statusKA', !e.statusKA)} />
                          <EditCell value={e.formstuecke} type="number" align="center" nowrap onCommit={(v) => set('formstuecke', v)} />
                          <StatusCell on={e.statusFST} onToggle={() => set('statusFST', !e.statusFST)} />
                          <EditCell value={e.rund} type="number" align="center" nowrap onCommit={(v) => set('rund', v)} />
                          <StatusCell on={e.statusR} onToggle={() => set('statusR', !e.statusR)} />
                          <EditCell value={e.armaturen} type="number" align="center" nowrap onCommit={(v) => set('armaturen', v)} />
                          <StatusCell on={e.statusArmaturen} onToggle={() => set('statusArmaturen', !e.statusArmaturen)} />
                          <EditCell value={e.bemerkungProd} onCommit={(v) => set('bemerkungProd', v)} />
                          <td><button className="btn btn-danger btn-small" onClick={() => removeAuftrag(e.id)} title="Löschen">✕</button></td>
                        </tr>
                      )
                    })}
                  </Datumsblock>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function Datumsblock({ datum, rows, anzahl, children, onChangeDatum }) {
  const [editing, setEditing] = useState(false)
  const istDatum = datum && datum !== '—'
  return (
    <>
      <tr className="tl-group-row">
        <td colSpan={anzahl}>
          <div className="tl-group-head">
            <div>
              {editing ? (
                <span className="tl-dt-edit">
                  <input
                    type="date"
                    autoFocus
                    value={istDatum ? datum : ''}
                    onChange={(e) => e.target.value && onChangeDatum(e.target.value)}
                    onBlur={() => setEditing(false)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') setEditing(false) }}
                  />
                  <button className="btn btn-secondary btn-small" onClick={() => setEditing(false)}>OK</button>
                </span>
              ) : (
                <span
                  className="tl-group-badge"
                  style={{ ...badgeStyle(datum), cursor: 'pointer' }}
                  onClick={() => setEditing(true)}
                  title="Klicken zum Ändern des Datums"
                >
                  {istDatum ? formatDatum(datum) : 'Ohne Datum'}
                </span>
              )}
              <span className="tl-group-count">{rows.length}</span>
            </div>
          </div>
        </td>
      </tr>
      {children}
    </>
  )
}
