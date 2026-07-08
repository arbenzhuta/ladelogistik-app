import { useMemo, useState } from 'react'
import { EditCell, StatusCell, CheckCell, formatDatum } from './TableCells.jsx'

const SPALTEN = [
  'Prod.Termin', 'Auft.Nr.', 'Kunde', 'Objekt', 'auf Abruf', 'Reserv.',
  'Kanäle', 'Status-KA', 'Formstücke', 'Status-FST', 'Rund', 'Status-R',
  'Armaturen', 'Status-Arm.', 'Bemerkung Prod.',
]

const num = (v) => {
  const n = parseInt(v)
  return isNaN(n) ? 0 : n
}

export default function Produktionsplanung({ auftraege, updateAuftrag }) {
  const [filterTermin, setFilterTermin] = useState('')

  const terminOptionen = useMemo(
    () => [...new Set(auftraege.map((e) => e.prodTermin).filter(Boolean))].sort(),
    [auftraege]
  )

  const gefiltert = useMemo(
    () => auftraege.filter((e) => !filterTermin || e.prodTermin === filterTermin),
    [auftraege, filterTermin]
  )

  // Summen + offene Mengen (offen = Menge, wenn Status noch nicht erledigt).
  const summe = (feld) => gefiltert.reduce((s, e) => s + num(e[feld]), 0)
  const offen = (feld, statusFeld) => gefiltert.reduce((s, e) => s + (e[statusFeld] ? 0 : num(e[feld])), 0)

  const kats = [
    { label: 'Kanäle', total: summe('kanaele'), off: offen('kanaele', 'statusKA') },
    { label: 'Formstücke', total: summe('formstuecke'), off: offen('formstuecke', 'statusFST') },
    { label: 'Armaturen', total: summe('armaturen'), off: offen('armaturen', 'statusArmaturen') },
    { label: 'Rund', total: summe('rund'), off: offen('rund', 'statusR') },
  ]

  const gruppen = useMemo(() => {
    const map = new Map()
    for (const e of gefiltert) {
      const key = e.prodTermin || '—'
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(e)
    }
    for (const arr of map.values()) arr.sort((a, b) => (a.kunde || '').localeCompare(b.kunde || ''))
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [gefiltert])

  const u = (id) => (feld, wert) => updateAuftrag(id, { [feld]: wert })

  return (
    <div className="at-view">
      <h1 className="at-title">Produktionsplanung Werkstatt</h1>
      <div className="at-filterbar">
        <div className="at-filter-pill">
          <span>Prod.Termin is</span>
          <select value={filterTermin} onChange={(e) => setFilterTermin(e.target.value)}>
            <option value="">Alle</option>
            {terminOptionen.map((d) => <option key={d} value={d}>{formatDatum(d)}</option>)}
          </select>
        </div>
        {filterTermin && <button className="at-link" onClick={() => setFilterTermin('')}>Zurücksetzen</button>}
      </div>

      <div className="pp-karten">
        {kats.map((k) => (
          <div key={k.label} className="pp-karte">
            <div className="pp-karte-label">{k.label} Total</div>
            <div className="pp-karte-total">{k.total}</div>
          </div>
        ))}
        {kats.map((k) => (
          <div key={k.label + '-o'} className="pp-karte">
            <div className="pp-karte-label">{k.label} offen</div>
            <div className="pp-karte-total" style={{ color: k.off > 0 ? '#dc2626' : '#16a34a' }}>{k.off}</div>
          </div>
        ))}
      </div>

      <div className="at-tablecard">
        {gefiltert.length === 0 ? (
          <p style={{ color: '#888' }}>Keine Aufträge. Aufträge im Auftragsjournal anlegen.</p>
        ) : (
          <div className="tl-table-wrap">
            <table className="tl-table">
              <thead><tr>{SPALTEN.map((s, i) => <th key={i}>{s}</th>)}</tr></thead>
              <tbody>
                {gruppen.flatMap(([, rows]) => rows).map((e) => {
                  const set = u(e.id)
                  return (
                    <tr key={e.id} className="tl-row">
                      <td className="tl-nowrap">{e.prodTermin ? formatDatum(e.prodTermin) : <span className="tl-empty">–</span>}</td>
                      <td className="tl-nowrap">{e.auftrnr || <span className="tl-empty">–</span>}</td>
                      <EditCell value={e.kunde} badge onCommit={(v) => set('kunde', v)} />
                      <EditCell value={e.objekt} onCommit={(v) => set('objekt', v)} />
                      <CheckCell checked={e.aufAbruf} onToggle={() => set('aufAbruf', !e.aufAbruf)} />
                      <CheckCell checked={e.reserv} onToggle={() => set('reserv', !e.reserv)} />
                      <EditCell value={e.kanaele} type="number" align="center" nowrap onCommit={(v) => set('kanaele', v)} />
                      <StatusCell on={e.statusKA} onToggle={() => set('statusKA', !e.statusKA)} />
                      <EditCell value={e.formstuecke} type="number" align="center" nowrap onCommit={(v) => set('formstuecke', v)} />
                      <StatusCell on={e.statusFST} onToggle={() => set('statusFST', !e.statusFST)} />
                      <EditCell value={e.rund} type="number" align="center" nowrap onCommit={(v) => set('rund', v)} />
                      <StatusCell on={e.statusR} onToggle={() => set('statusR', !e.statusR)} />
                      <EditCell value={e.armaturen} type="number" align="center" nowrap onCommit={(v) => set('armaturen', v)} />
                      <StatusCell on={e.statusArmaturen} onToggle={() => set('statusArmaturen', !e.statusArmaturen)} />
                      <EditCell value={e.bemerkungProd} onCommit={(v) => set('bemerkungProd', v)} />
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
