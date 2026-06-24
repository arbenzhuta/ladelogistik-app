import { useState, useEffect, useRef } from 'react'

async function geocode(address) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`
  const resp = await fetch(url)
  const data = await resp.json()
  if (!data.length) throw new Error(`Adresse nicht gefunden: ${address}`)
  return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon), address: data[0].display_name }
}

async function getRoute(coords) {
  const coordStr = coords.map((c) => `${c.lon},${c.lat}`).join(';')
  const url = `https://router.project-osrm.org/route/v1/driving/${coordStr}?overview=full&geometries=geojson&steps=false`
  const resp = await fetch(url)
  const data = await resp.json()
  if (data.code !== 'Ok') throw new Error('Route konnte nicht berechnet werden')
  return data.routes[0]
}

function todayStr() {
  const d = new Date()
  return d.toISOString().slice(0, 10)
}

export default function Routenplanung({ fahrzeuge, incomingRoute }) {
  const [start, setStart] = useState('')
  const [stops, setStops] = useState([{ address: '', unload_time_min: 30 }])
  const [startDate, setStartDate] = useState(todayStr())
  const [startTime, setStartTime] = useState('07:00')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [savedRoutes, setSavedRoutes] = useState(() => {
    const stored = localStorage.getItem('savedRoutes')
    if (stored) { try { return JSON.parse(stored) } catch {} }
    return []
  })
  const [routeName, setRouteName] = useState('')
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)

  useEffect(() => {
    localStorage.setItem('savedRoutes', JSON.stringify(savedRoutes))
  }, [savedRoutes])

  // Stopps aus der Transportliste übernehmen (Objekt-Adressen der Aufträge).
  useEffect(() => {
    if (incomingRoute && incomingRoute.stops && incomingRoute.stops.length) {
      if (incomingRoute.start) setStart(incomingRoute.start)
      setStops(
        incomingRoute.stops.map((s) => ({
          address: s.address,
          unload_time_min: s.unload_time_min ?? 30,
        }))
      )
      setResult(null)
      setError('')
    }
  }, [incomingRoute])

  // Show map after result changes (wait for DOM)
  useEffect(() => {
    if (result) {
      const timer = setTimeout(() => showMap(result), 100)
      return () => clearTimeout(timer)
    }
  }, [result])

  const addStop = () => {
    setStops([...stops, { address: '', unload_time_min: 30 }])
  }

  const removeStop = (index) => {
    if (stops.length <= 1) return
    setStops(stops.filter((_, i) => i !== index))
  }

  const updateStop = (index, field, value) => {
    const updated = [...stops]
    updated[index] = { ...updated[index], [field]: value }
    setStops(updated)
  }

  const calculateRoute = async () => {
    if (!start || stops.some((s) => !s.address)) {
      setError('Bitte alle Adressen eingeben')
      return
    }
    setError('')
    setLoading(true)
    setResult(null)
    try {
      const allAddresses = [start, ...stops.map((s) => s.address)]
      const geocoded = []
      for (const addr of allAddresses) {
        geocoded.push(await geocode(addr))
      }

      const route = await getRoute(geocoded)

      // Build departure time
      const [hh, mm] = startTime.split(':').map(Number)
      const departureDate = new Date(startDate)
      departureDate.setHours(hh, mm, 0, 0)

      let currentTime = new Date(departureDate)

      const legs = route.legs.map((leg, i) => {
        const departAt = new Date(currentTime)
        const driveMins = leg.duration / 60
        currentTime = new Date(currentTime.getTime() + driveMins * 60000)
        const arriveAt = new Date(currentTime)
        const unloadMin = i < stops.length ? (stops[i].unload_time_min || 0) : 0
        currentTime = new Date(currentTime.getTime() + unloadMin * 60000)
        const departAfterUnload = new Date(currentTime)

        return {
          from: geocoded[i],
          to: geocoded[i + 1],
          distance_km: Math.round(leg.distance / 100) / 10,
          duration_min: Math.round(driveMins * 10) / 10,
          unload_time_min: unloadMin,
          depart_time: departAt,
          arrive_time: arriveAt,
          depart_after_unload: departAfterUnload,
        }
      })

      const total_distance_km = Math.round(route.distance / 100) / 10
      const total_duration_min = Math.round(route.duration / 60 * 10) / 10
      const total_unload_min = stops.reduce((s, st) => s + (st.unload_time_min || 0), 0)

      const data = {
        geocoded,
        legs,
        total_distance_km,
        total_duration_min,
        total_unload_min,
        total_time_min: Math.round((total_duration_min + total_unload_min) * 10) / 10,
        geometry: route.geometry,
        departure: departureDate,
        arrival: currentTime,
      }
      setResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const showMap = (data) => {
    if (!mapRef.current || !window.L) return
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove()
      mapInstanceRef.current = null
    }

    const map = window.L.map(mapRef.current)
    mapInstanceRef.current = map

    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
    }).addTo(map)

    const markers = []
    data.geocoded.forEach((g, i) => {
      const isStart = i === 0
      const marker = window.L.marker([g.lat, g.lon]).addTo(map)
      const label = isStart ? `Start: ${g.address}` : `Stopp ${i}: ${g.address}`
      marker.bindPopup(label)
      markers.push(marker)
    })

    if (data.geometry && data.geometry.coordinates) {
      const latlngs = data.geometry.coordinates.map((c) => [c[1], c[0]])
      const routeLine = window.L.polyline(latlngs, { color: '#2563eb', weight: 4 })
      routeLine.addTo(map)
      map.fitBounds(routeLine.getBounds(), { padding: [30, 30] })
    } else if (markers.length > 0) {
      const group = window.L.featureGroup(markers)
      map.fitBounds(group.getBounds(), { padding: [30, 30] })
    }
  }

  const saveRoute = () => {
    if (!result || !routeName) return
    const newRoute = {
      id: Date.now(),
      name: routeName,
      total_distance_km: result.total_distance_km,
      total_duration_min: result.total_duration_min,
      total_unload_min: result.total_unload_min,
    }
    setSavedRoutes([...savedRoutes, newRoute])
    setRouteName('')
  }

  const deleteRoute = (id) => {
    setSavedRoutes(savedRoutes.filter((r) => r.id !== id))
  }

  const formatTime = (min) => {
    const h = Math.floor(min / 60)
    const m = Math.round(min % 60)
    return h > 0 ? `${h} Std ${m} Min` : `${m} Min`
  }

  const formatClock = (date) => {
    if (!date) return ''
    const d = new Date(date)
    return d.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })
  }

  const formatDateTime = (date) => {
    if (!date) return ''
    const d = new Date(date)
    return d.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' + formatClock(d)
  }

  return (
    <div>
      <div className="card">
        <h2>Routenplanung</h2>

        <div className="route-form">
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div className="form-group" style={{ flex: 1, minWidth: 200 }}>
              <label>Startort</label>
              <input
                type="text"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                placeholder="z.B. Trimmis"
              />
            </div>
            <div className="form-group" style={{ minWidth: 140 }}>
              <label>Datum</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ minWidth: 100 }}>
              <label>Startzeit</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
          </div>

          <div className="stops-list">
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8, display: 'block' }}>
              Ziele / Stopps
            </label>
            {stops.map((stop, i) => (
              <div key={i} className="stop-row">
                <span className="stop-number">{i + 1}.</span>
                <input
                  type="text"
                  value={stop.address}
                  onChange={(e) => updateStop(i, 'address', e.target.value)}
                  placeholder={`Ziel ${i + 1} (z.B. Chur)`}
                  className="stop-input"
                />
                <div className="stop-unload">
                  <label>Abladezeit</label>
                  <input
                    type="number"
                    value={stop.unload_time_min}
                    onChange={(e) => updateStop(i, 'unload_time_min', parseFloat(e.target.value) || 0)}
                    min="0"
                    step="5"
                    className="unload-input"
                  />
                  <span>Min</span>
                </div>
                {stops.length > 1 && (
                  <button className="btn btn-danger btn-small" onClick={() => removeStop(i)}>x</button>
                )}
              </div>
            ))}
            <button className="btn btn-secondary btn-small" onClick={addStop} style={{ marginTop: 8 }}>
              + Stopp hinzufügen
            </button>
          </div>

          {error && <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 8, backgroundColor: '#f8d7da', color: '#721c24', fontSize: 14 }}>{error}</div>}

          <button
            className="btn btn-primary"
            onClick={calculateRoute}
            disabled={loading}
            style={{ marginTop: 16 }}
          >
            {loading ? 'Berechne Route...' : 'Route berechnen'}
          </button>
        </div>
      </div>

      {result && (
        <>
          <div className="card">
            <h2>Routendetails</h2>
            <div className="route-summary">
              <div className="info-badge">
                <span className="label">Abfahrt</span>
                <span className="value">{formatDateTime(result.departure)}</span>
              </div>
              <div className="info-badge">
                <span className="label">Ankunft</span>
                <span className="value">{formatDateTime(result.arrival)}</span>
              </div>
              <div className="info-badge">
                <span className="label">Gesamtstrecke</span>
                <span className="value">{result.total_distance_km} km</span>
              </div>
              <div className="info-badge">
                <span className="label">Fahrzeit</span>
                <span className="value">{formatTime(result.total_duration_min)}</span>
              </div>
              <div className="info-badge">
                <span className="label">Abladezeit</span>
                <span className="value">{formatTime(result.total_unload_min)}</span>
              </div>
              <div className="info-badge">
                <span className="label">Gesamtzeit</span>
                <span className="value" style={{ color: '#2563eb' }}>{formatTime(result.total_time_min)}</span>
              </div>
            </div>

            <div className="route-legs">
              {result.legs.map((leg, i) => (
                <div key={i} className="route-leg">
                  <div className="leg-header">
                    <span className="leg-from">{leg.from.address}</span>
                    <span className="leg-arrow">{'→'}</span>
                    <span className="leg-to">{leg.to.address}</span>
                  </div>
                  <div className="leg-details">
                    <span>{leg.distance_km} km</span>
                    <span>{formatTime(leg.duration_min)} Fahrzeit</span>
                    <span style={{ color: '#2563eb', fontWeight: 600 }}>
                      Abfahrt {formatClock(leg.depart_time)}
                    </span>
                    <span style={{ color: '#16a34a', fontWeight: 600 }}>
                      Ankunft {formatClock(leg.arrive_time)}
                    </span>
                    {leg.unload_time_min > 0 && (
                      <span className="unload-badge">
                        {formatTime(leg.unload_time_min)} Abladen (bis {formatClock(leg.depart_after_unload)})
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="save-route-row" style={{ marginTop: 16, display: 'flex', gap: 8 }}>
              <input
                type="text"
                value={routeName}
                onChange={(e) => setRouteName(e.target.value)}
                placeholder="Name für Route..."
                style={{ flex: 1, padding: '10px 12px', border: '2px solid #e0e0e0', borderRadius: 8, fontSize: '0.95rem' }}
              />
              <button className="btn btn-primary" onClick={saveRoute} disabled={!routeName}>
                Route speichern
              </button>
            </div>
          </div>

          <div className="card">
            <h2>Karte</h2>
            <div ref={mapRef} style={{ height: 400, borderRadius: 12, overflow: 'hidden' }} />
          </div>
        </>
      )}

      {savedRoutes.length > 0 && (
        <div className="card">
          <h2>Gespeicherte Routen</h2>
          <div className="saved-routes">
            {savedRoutes.map((r) => (
              <div key={r.id} className="saved-route-item">
                <div className="saved-route-info">
                  <strong>{r.name}</strong>
                  <span style={{ fontSize: '0.85rem', color: '#888' }}>
                    {r.total_distance_km ? `${r.total_distance_km} km` : ''} 
                    {r.total_duration_min ? ` · ${formatTime(r.total_duration_min)}` : ''}
                  </span>
                </div>
                <button className="btn btn-danger btn-small" onClick={() => deleteRoute(r.id)}>
                  Löschen
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
