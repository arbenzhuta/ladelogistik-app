import { useState, useEffect, useRef } from 'react'

// Deterministische, gut lesbare Badge-Farbe aus einem Text.
export function badgeStyle(text) {
  if (!text) return { background: '#f0f0f5', color: '#888' }
  let h = 0
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) % 360
  return { background: `hsl(${h}, 65%, 88%)`, color: `hsl(${h}, 60%, 30%)` }
}

export function formatDatum(iso) {
  if (!iso) return '–'
  const [y, m, d] = iso.split('-')
  if (!y || !m || !d) return iso
  return `${parseInt(d)}.${parseInt(m)}.${y}`
}

let dlCounter = 0

// Eine einzeln editierbare Zelle: Klick -> Eingabefeld, Enter/Blur speichert,
// Escape bricht ab.
export function EditCell({ value, onCommit, type = 'text', options, badge, placeholder = '–', nowrap, align }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value ?? '')
  const inputRef = useRef(null)
  const listId = useRef('dl_' + (++dlCounter)).current

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
    <td className={`tl-cell ${nowrap ? 'tl-nowrap' : ''}`} style={align ? { textAlign: align } : undefined} onClick={start} title="Klicken zum Bearbeiten">
      {value !== '' && value != null
        ? (badge ? <span className="tl-badge" style={badgeStyle(value)}>{value}</span> : value)
        : <span className="tl-empty">–</span>}
    </td>
  )
}

// Grüner Haken-Status (an/aus), wie in Airtable die Status-Spalten:
// erledigt = grün gefüllt, offen = blasser Kreis mit hellem Haken.
export function StatusCell({ on, onToggle, title }) {
  return (
    <td style={{ textAlign: 'center' }}>
      <button
        className={`at-check ${on ? 'on' : ''}`}
        onClick={onToggle}
        title={title || (on ? 'Erledigt' : 'Offen')}
      >
        ✓
      </button>
    </td>
  )
}

// Checkbox-Zelle (auf Abruf, Keine Produktion, Reserv.) – gleicher Look.
export function CheckCell({ checked, onToggle, title }) {
  return (
    <td style={{ textAlign: 'center' }}>
      <button className={`at-check ${checked ? 'on' : ''}`} onClick={onToggle} title={title}>✓</button>
    </td>
  )
}

// Datum + Uhrzeit in einer Zelle (Klick öffnet date/time-Felder).
export function DatumZeitCell({ datum, zeit, onDatum, onZeit }) {
  const [editing, setEditing] = useState(false)
  if (editing) {
    return (
      <td className="tl-nowrap">
        <div className="tl-dt-edit">
          <input type="date" value={datum || ''} onChange={(e) => onDatum(e.target.value)} />
          {onZeit && <input type="time" value={zeit || ''} onChange={(e) => onZeit(e.target.value)} />}
          <button className="btn btn-secondary btn-small" onClick={() => setEditing(false)}>OK</button>
        </div>
      </td>
    )
  }
  return (
    <td className="tl-cell tl-nowrap" onClick={() => setEditing(true)} title="Klicken zum Bearbeiten">
      {datum ? `${formatDatum(datum)}${zeit ? ` ${zeit}` : ''}` : <span className="tl-empty">–</span>}
    </td>
  )
}
