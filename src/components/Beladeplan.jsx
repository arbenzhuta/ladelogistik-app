import { useMemo, useState, useCallback } from 'react'
import * as THREE from 'three'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Text, Line } from '@react-three/drei'

function Ladeflaeche({ laenge, breite, hoehe }) {
  const labelSize = Math.min(laenge, breite, hoehe) * 0.08
  const mToMM = (v) => (v * 1000).toFixed(0)
  return (
    <group>
      <mesh position={[laenge / 2, 0.005, breite / 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[laenge, breite]} />
        <meshStandardMaterial color="#dde1e7" side={2} />
      </mesh>
      <LineBox laenge={laenge} breite={breite} hoehe={hoehe} />
      <mesh position={[laenge / 2, hoehe / 2, 0]}>
        <planeGeometry args={[laenge, hoehe]} />
        <meshStandardMaterial color="#c8d0da" transparent opacity={0.15} side={2} />
      </mesh>
      <mesh position={[0, hoehe / 2, breite / 2]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[breite, hoehe]} />
        <meshStandardMaterial color="#c8d0da" transparent opacity={0.15} side={2} />
      </mesh>
      <mesh position={[laenge, hoehe / 2, breite / 2]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[breite, hoehe]} />
        <meshStandardMaterial color="#c8d0da" transparent opacity={0.15} side={2} />
      </mesh>
      <mesh position={[laenge / 2, hoehe, breite / 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[laenge, breite]} />
        <meshStandardMaterial color="#c8d0da" transparent opacity={0.08} side={2} />
      </mesh>
      {/* Masse-Beschriftung: Länge (X-Achse, am Boden vorne) */}
      <Text position={[laenge / 2, -0.15, -0.2]} fontSize={labelSize} color="#1e40af" anchorX="center" anchorY="middle">
        {`${mToMM(laenge)} mm`}
      </Text>
      {/* Masse-Beschriftung: Breite (Z-Achse, am Boden links) */}
      <Text position={[-0.3, -0.15, breite / 2]} fontSize={labelSize} color="#1e40af" anchorX="center" anchorY="middle" rotation={[0, Math.PI / 2, 0]}>
        {`${mToMM(breite)} mm`}
      </Text>
      {/* Masse-Beschriftung: Höhe (Y-Achse, links vorne) */}
      <Text position={[-0.3, hoehe / 2, -0.2]} fontSize={labelSize} color="#1e40af" anchorX="center" anchorY="middle" rotation={[0, 0, Math.PI / 2]}>
        {`${mToMM(hoehe)} mm`}
      </Text>
    </group>
  )
}

function LineBox({ laenge, breite, hoehe }) {
  const l = laenge, b = breite, h = hoehe
  const edges = [
    [[0,0,0],[l,0,0]], [[l,0,0],[l,0,b]], [[l,0,b],[0,0,b]], [[0,0,b],[0,0,0]],
    [[0,h,0],[l,h,0]], [[l,h,0],[l,h,b]], [[l,h,b],[0,h,b]], [[0,h,b],[0,h,0]],
    [[0,0,0],[0,h,0]], [[l,0,0],[l,h,0]], [[l,0,b],[l,h,b]], [[0,0,b],[0,h,b]],
  ]
  return (
    <group>
      {edges.map((points, i) => (
        <Line key={i} points={points} color="#94a3b8" lineWidth={1.5} />
      ))}
    </group>
  )
}

function FrachtBox({ position, size, farbe, name }) {
  return (
    <group position={position}>
      <mesh>
        <boxGeometry args={size} />
        <meshStandardMaterial color={farbe} transparent opacity={0.85} />
      </mesh>
      <mesh>
        <boxGeometry args={size} />
        <meshStandardMaterial color="#000" wireframe transparent opacity={0.15} />
      </mesh>
      <Text position={[0, size[1] / 2 + 0.05, 0]} fontSize={0.1} color="#333" anchorX="center" anchorY="bottom">
        {name}
      </Text>
    </group>
  )
}

function FrachtKonus({ position, size, eingang, ausgang, versatz1, versatz2, farbe, name }) {
  const geom = useMemo(() => {
    const hL = size[0] / 2
    const za = mmToM(eingang.a) / 2
    const yb = mmToM(eingang.b) / 2
    const za2 = mmToM(ausgang.a) / 2
    const yb2 = mmToM(ausgang.b) / 2
    const vz = mmToM(versatz1) // Versatz 1 = seitlich (Z)
    const vy = mmToM(versatz2) // Versatz 2 = Höhe (Y)
    // Hüllmass-Mitte (inkl. Versatz), damit das Stück mittig im Kollisions-
    // volumen (size) sitzt und sich Konusse nicht durchdringen.
    const cz = (Math.min(-za, vz - za2) + Math.max(za, vz + za2)) / 2
    const cy = (Math.min(-yb, vy - yb2) + Math.max(yb, vy + yb2)) / 2
    // Eingang (x=-hL) und Ausgang (x=+hL), beide um die Hüllmitte verschoben
    const V = [
      [-hL, -yb - cy, -za - cz], [-hL, -yb - cy, za - cz], [-hL, yb - cy, za - cz], [-hL, yb - cy, -za - cz],
      [hL, vy - yb2 - cy, vz - za2 - cz], [hL, vy - yb2 - cy, vz + za2 - cz], [hL, vy + yb2 - cy, vz + za2 - cz], [hL, vy + yb2 - cy, vz - za2 - cz],
    ]
    const idx = [
      0, 1, 2, 0, 2, 3, // Eingang
      4, 6, 5, 4, 7, 6, // Ausgang
      0, 4, 5, 0, 5, 1, // unten
      3, 2, 6, 3, 6, 7, // oben
      0, 3, 7, 0, 7, 4, // Seite z-
      1, 5, 6, 1, 6, 2, // Seite z+
    ]
    const pos = new Float32Array(idx.length * 3)
    idx.forEach((vi, k) => {
      pos[k * 3] = V[vi][0]
      pos[k * 3 + 1] = V[vi][1]
      pos[k * 3 + 2] = V[vi][2]
    })
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.computeVertexNormals()
    return g
  }, [size, eingang, ausgang, versatz1, versatz2])
  return (
    <group position={position}>
      <mesh geometry={geom}>
        <meshStandardMaterial color={farbe} transparent opacity={0.85} side={2} />
      </mesh>
      <mesh geometry={geom}>
        <meshStandardMaterial color="#000" wireframe transparent opacity={0.25} side={2} />
      </mesh>
      <Text position={[0, size[1] / 2 + 0.05, 0]} fontSize={0.1} color="#333" anchorX="center" anchorY="bottom">
        {name}
      </Text>
    </group>
  )
}

function FrachtBogen({ position, size, eingangA, eingangB, ausgangA, grad, radius, farbe, name }) {
  const geom = useMemo(() => {
    // Viertel-Ring: Innenradius Ri konstant, Querschnitt nach aussen.
    // Reduzierter Bogen: Aussenradius weitet sich vom Eingang zum Ausgang.
    const Ri = mmToM(radius)
    const wEin = mmToM(eingangA)
    const wAus = mmToM(ausgangA)
    const b = mmToM(eingangB)
    const theta = (grad * Math.PI) / 180
    const N = 48
    const shape = new THREE.Shape()
    for (let k = 0; k <= N; k++) {
      const t = (theta * k) / N
      const r = Ri + wEin + (wAus - wEin) * (k / N)
      const x = r * Math.cos(t)
      const y = r * Math.sin(t)
      if (k === 0) shape.moveTo(x, y)
      else shape.lineTo(x, y)
    }
    for (let k = N; k >= 0; k--) {
      const t = (theta * k) / N
      shape.lineTo(Ri * Math.cos(t), Ri * Math.sin(t))
    }
    shape.closePath()
    const g = new THREE.ExtrudeGeometry(shape, { depth: b, bevelEnabled: false })
    g.rotateX(-Math.PI / 2) // Querschnitt-Hoehe b nach oben (Y)
    g.computeBoundingBox()
    const c = new THREE.Vector3()
    g.boundingBox.getCenter(c)
    g.translate(-c.x, -c.y, -c.z)
    return g
  }, [eingangA, eingangB, ausgangA, grad, radius])
  return (
    <group position={position}>
      <mesh geometry={geom}>
        <meshStandardMaterial color={farbe} transparent opacity={0.85} side={2} />
      </mesh>
      <mesh geometry={geom}>
        <meshStandardMaterial color="#000" wireframe transparent opacity={0.2} side={2} />
      </mesh>
      <Text position={[0, size[1] / 2 + 0.05, 0]} fontSize={0.1} color="#333" anchorX="center" anchorY="bottom">
        {name}
      </Text>
    </group>
  )
}

function SpiroZylinder({ position, radius, laenge, farbe, name, rotation }) {
  return (
    <group position={position} rotation={rotation || [0, 0, 0]}>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[radius, radius, laenge, 24]} />
        <meshStandardMaterial color={farbe} transparent opacity={0.85} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[radius, radius, laenge, 24]} />
        <meshStandardMaterial color="#000" wireframe transparent opacity={0.15} />
      </mesh>
      <Text position={[0, radius + 0.05, 0]} fontSize={0.08} color="#333" anchorX="center" anchorY="bottom">
        {name}
      </Text>
    </group>
  )
}

function mmToM(mm) {
  return mm / 1000
}

function berechneBeladung(fahrzeugListe, frachtstuecke, variante = 0) {
  const raeume = []
  let raumIndex = 0
  const getFahrzeug = (idx) => fahrzeugListe[Math.min(idx, fahrzeugListe.length - 1)]

  const kanaele = []
  const spipieces = []
  const sonstige = []

  for (const f of frachtstuecke) {
    if (f.anzahl <= 0) continue
    for (let i = 0; i < f.anzahl; i++) {
      if (f.typ === 'kanal') {
        kanaele.push({ ...f, einzelId: `${f.id}-${i}` })
      } else if (f.typ === 'spiro') {
        spipieces.push({ ...f, einzelId: `${f.id}-${i}` })
      } else {
        sonstige.push({ ...f, einzelId: `${f.id}-${i}` })
      }
    }
  }

  const spirosSorted = [...spipieces].sort((a, b) => b.durchmesser - a.durchmesser)

  const nestedSpiros = []
  const usedSpiroIds = new Set()

  for (const spiro of spirosSorted) {
    if (usedSpiroIds.has(spiro.einzelId)) continue

    const nested = [spiro]
    usedSpiroIds.add(spiro.einzelId)
    let currentInnerDm = spiro.durchmesser

    for (const inner of spirosSorted) {
      if (usedSpiroIds.has(inner.einzelId)) continue
      if (inner.durchmesser < currentInnerDm - 20 && inner.L <= spiro.L) {
        nested.push(inner)
        usedSpiroIds.add(inner.einzelId)
        currentInnerDm = inner.durchmesser
      }
    }

    nestedSpiros.push(nested)
  }

  const allItems = [
    ...kanaele.map((k) => ({ ...k, phase: 'kanal' })),
    ...sonstige.map((s) => ({ ...s, phase: 'sonstige' })),
    ...nestedSpiros.map((group) => ({
      phase: 'spiro',
      group,
      outer: group[0],
      einzelId: group[0].einzelId,
    })),
  ]

  function createNewRaum() {
    const idx = raumIndex++
    return {
      index: idx,
      fahrzeugIndex: Math.min(idx, fahrzeugListe.length - 1),
      positionen: [],
      grid: [],
    }
  }

  // Höchste Oberkante aller Boxen, die die Grundfläche (x..x+padX, z..z+padZ)
  // überlappen -> darauf wird gestapelt (Schwerkraft).
  function kanalFootprintTop(raum, x, z, padX, padZ) {
    let maxTop = 0
    for (const p of raum.positionen) {
      if (!p.box) continue
      const a = p.box
      if (a.x < x + padX && a.x + a.dx > x &&
          a.z < z + padZ && a.z + a.dz > z) {
        maxTop = Math.max(maxTop, a.y + a.dy)
      }
    }
    return maxTop
  }

  // Platziert einen Kanal in der gegebenen Ausrichtung mit Schwerkraft:
  // füllt zuerst den Boden (vorne -> hinten), stapelt dann auf vorhandene Stücke.
  function placeKanalOriented(raum, item, orientation) {
    const fz = getFahrzeug(raum.fahrzeugIndex)
    const gap = 0.02
    const air = 0.030 // 15mm Luft rundherum auf der Grundfläche
    const fL = mmToM(item.L)
    const fA = mmToM(item.a)
    const fB = mmToM(item.b)
    let dx, dy, dz
    if (orientation === 'stehend') {
      dx = fA; dz = fB; dy = fL // hochkant: L nach oben
    } else if (orientation === 'liegend') {
      dx = fL; dz = fA; dy = fB
    } else {
      dx = fL; dz = fB; dy = fA // seitlich
    }
    const padX = dx + air
    const padZ = dz + air
    if (padX > fz.laenge - 2 * gap + 0.001) return false
    if (padZ > fz.breite - 2 * gap + 0.001) return false
    if (dy > fz.hoehe + 0.001) return false

    let best = null
    for (let x = gap; x <= fz.laenge - padX - gap + 0.001; x += 0.05) {
      let rowBest = null
      for (let z = gap; z <= fz.breite - padZ - gap + 0.001; z += 0.05) {
        const yBase = kanalFootprintTop(raum, x, z, padX, padZ)
        if (yBase + dy > fz.hoehe + 0.001) continue
        const box = { x, y: yBase, z, dx: padX, dy, dz: padZ }
        if (collides(raum.positionen, box)) continue
        if (!rowBest || yBase < rowBest.yBase - 0.001 ||
            (Math.abs(yBase - rowBest.yBase) <= 0.001 && z < rowBest.z)) {
          rowBest = { x, z, yBase, box }
        }
      }
      if (rowBest) {
        if (!best || rowBest.yBase < best.yBase - 0.001 ||
            (Math.abs(rowBest.yBase - best.yBase) <= 0.001 && x < best.x)) {
          best = rowBest
        }
        // Boden-Platz möglichst weit vorne gefunden -> sofort nehmen
        if (rowBest.yBase <= 0.001) break
      }
    }
    if (!best) return false

    const offsetX = (padX - dx) / 2
    const offsetZ = (padZ - dz) / 2
    raum.positionen.push({
      type: 'box',
      position: [best.x + offsetX + dx / 2, best.yBase + dy / 2, best.z + offsetZ + dz / 2],
      size: [dx, dy, dz],
      farbe: item.farbe,
      name: item.name,
      pos: item.pos,
      orientation,
      box: best.box,
    })
    return true
  }

  function tryPlaceKanalStehend(raum, item) {
    return placeKanalOriented(raum, item, 'stehend')
  }

  function tryPlaceKanalLiegend(raum, item) {
    return (
      placeKanalOriented(raum, item, 'liegend') ||
      placeKanalOriented(raum, item, 'seitlich')
    )
  }

  function tryPlaceBox(raum, item) {
    const fL = mmToM(item.L)
    const fA = mmToM(item.a)
    const fB = mmToM(item.b)

    if (tryFit(raum, item, fL, fA, fB, 'normal')) return true
    return false
  }

  function tryPlaceSpiro(raum, spiroGroup) {
    const outer = spiroGroup[0]
    const fL = mmToM(outer.L)
    const d = mmToM(outer.durchmesser)

    if (tryFitCylinder(raum, spiroGroup, fL, d, d)) return true
    return false
  }

  function tryFit(raum, item, dimX, dimZ, dimY, orientation) {
    const gap = 0.02
    const fz = getFahrzeug(raum.fahrzeugIndex)

    for (let y = 0; y <= fz.hoehe - dimY + 0.001; y += 0.01) {
      for (let x = gap; x <= fz.laenge - dimX - gap + 0.001; x += 0.05) {
        for (let z = gap; z <= fz.breite - dimZ - gap + 0.001; z += 0.05) {
          const box = { x, y, z, dx: dimX, dy: dimY, dz: dimZ }
          if (!collides(raum.positionen, box)) {
            const placed = {
              type: item.typ === 'konus' || item.typ === 'bogen' ? item.typ : 'box',
              position: [x + dimX / 2, y + dimY / 2, z + dimZ / 2],
              size: [dimX, dimY, dimZ],
              farbe: item.farbe,
              name: item.name,
              pos: item.pos,
              orientation,
              box,
            }
            if (item.typ === 'konus') {
              placed.eingang = { a: item.eingangA, b: item.eingangB }
              placed.ausgang = { a: item.ausgangA, b: item.ausgangB }
              placed.versatz1 = item.versatz1
              placed.versatz2 = item.versatz2
            }
            if (item.typ === 'bogen') {
              placed.eingangA = item.eingangA
              placed.eingangB = item.eingangB
              placed.ausgangA = item.ausgangA
              placed.grad = item.grad
              placed.radius = item.radius
              placed.schenkel1 = item.schenkel1
              placed.schenkel2 = item.schenkel2
              placed.orientation = orientation
            }
            raum.positionen.push(placed)
            return true
          }
        }
      }
    }
    return false
  }

  function tryFitCylinder(raum, spiroGroup, dimX, dimY, dimZ) {
    const gap = 0.02
    const fz = getFahrzeug(raum.fahrzeugIndex)
    const outer = spiroGroup[0]
    const r = dimY / 2

    // Gravity: niedrigste Y-Position berechnen
    // Spiro darf auf jedem Material gestapelt werden (übereinander erlaubt)
    function findLowestY(x, zBase) {
      let maxTop = 0
      for (const p of raum.positionen) {
        if (!p.box) continue
        const a = p.box
        if (a.x < x + dimX && a.x + a.dx > x &&
            a.z < zBase + dimZ && a.z + a.dz > zBase) {
          maxTop = Math.max(maxTop, a.y + a.dy)
        }
      }
      return maxTop
    }

    // Hinten zuerst (X hoch), dann unten (Y niedrig), dann links (Z niedrig)
    for (let x = fz.laenge - dimX - gap; x >= gap; x -= 0.05) {
      let bestZ = -1
      let bestY = Infinity

      for (let zBase = gap; zBase <= fz.breite - dimZ - gap + 0.001; zBase += dimZ) {
        const yBase = findLowestY(x, zBase)
        if (yBase + dimY > fz.hoehe + 0.001) continue

        const box = { x, y: yBase, z: zBase, dx: dimX, dy: dimY, dz: dimZ }
        if (!collides(raum.positionen, box)) {
          if (yBase < bestY - 0.001 || (Math.abs(yBase - bestY) <= 0.001 && zBase < bestZ)) {
            bestY = yBase
            bestZ = zBase
          }
        }
      }

      if (bestZ >= 0) {
        const yBase = bestY
        const zBase = bestZ
        const y = yBase + r
        const z = zBase + r
        const box = { x, y: yBase, z: zBase, dx: dimX, dy: dimY, dz: dimZ }

        const items = [{
          type: 'spiro',
          position: [x + dimX / 2, y, z],
          radius: r,
          laenge: dimX,
          farbe: outer.farbe,
          name: outer.name,
          pos: outer.pos,
          box,
        }]

        for (let ni = 1; ni < spiroGroup.length; ni++) {
          const inner = spiroGroup[ni]
          items.push({
            type: 'spiro-nested',
            position: [x + dimX / 2, y, z],
            radius: mmToM(inner.durchmesser) / 2,
            laenge: mmToM(inner.L),
            farbe: inner.farbe,
            name: inner.name,
            pos: inner.pos,
          })
        }

        raum.positionen.push(...items)
        return true
      }
    }
    return false
  }

  function collides(positionen, newBox) {
    for (const p of positionen) {
      if (!p.box) continue
      const a = p.box
      const b = newBox
      if (
        a.x < b.x + b.dx && a.x + a.dx > b.x &&
        a.y < b.y + b.dy && a.y + a.dy > b.y &&
        a.z < b.z + b.dz && a.z + a.dz > b.z
      ) {
        return true
      }
    }
    return false
  }

  const unplaceable = []

  const STRATS = [
    // Standard: Kanäle hochkant, grosse Grundfläche zuerst (Boden füllen, dann stapeln)
    { phaseOrder: ['spiro', 'kanal', 'sonstige'], kanalSort: (a, b) => b.a * b.b - a.a * a.b, kanalLiegendFirst: false },
    // Hochkant, längste zuerst (hohe Stücke unten, kurze oben drauf)
    { phaseOrder: ['spiro', 'kanal', 'sonstige'], kanalSort: (a, b) => b.L - a.L, kanalLiegendFirst: false },
    // Hochkant, grösstes Volumen zuerst
    { phaseOrder: ['spiro', 'kanal', 'sonstige'], kanalSort: (a, b) => b.a * b.b * b.L - a.a * a.b * a.L, kanalLiegendFirst: false },
    // Alternative: liegend zuerst (flach stapeln)
    { phaseOrder: ['kanal', 'spiro', 'sonstige'], kanalSort: (a, b) => a.L - b.L, kanalLiegendFirst: true },
  ]
  const strat = STRATS[((variante % STRATS.length) + STRATS.length) % STRATS.length]

  const spiroItems = allItems.filter((i) => i.phase === 'spiro')
  const kanalItems = allItems.filter((i) => i.phase === 'kanal')
  if (strat.kanalSort) kanalItems.sort(strat.kanalSort)
  const sonstigeItems = allItems.filter((i) => i.phase === 'sonstige')

  // Platziert ein Stück: zuerst in allen bereits offenen Laderäumen (füllt
  // Lücken, vermeidet halbleere LKW), erst danach ein neuer Laderaum.
  function placeInAnyRoom(tryFn) {
    for (const r of raeume) {
      if (tryFn(r)) return true
    }
    const nr = createNewRaum()
    raeume.push(nr)
    return tryFn(nr)
  }

  function placeKanal(raum, item) {
    return strat.kanalLiegendFirst
      ? tryPlaceKanalLiegend(raum, item) || tryPlaceKanalStehend(raum, item)
      : tryPlaceKanalStehend(raum, item) || tryPlaceKanalLiegend(raum, item)
  }

  function runSpiro() {
    for (const item of spiroItems) {
      if (!placeInAnyRoom((r) => tryPlaceSpiro(r, item.group))) unplaceable.push(item.group[0])
    }
  }

  function runKanal() {
    for (const item of kanalItems) {
      if (!placeInAnyRoom((r) => placeKanal(r, item))) unplaceable.push(item)
    }
  }

  function runSonstige() {
    for (const item of sonstigeItems) {
      if (!placeInAnyRoom((r) => tryPlaceBox(r, item))) unplaceable.push(item)
    }
  }

  const runners = { spiro: runSpiro, kanal: runKanal, sonstige: runSonstige }
  for (const ph of strat.phaseOrder) runners[ph]()

  // Leere Laderäume entfernen.
  for (let i = raeume.length - 1; i >= 0; i--) {
    if (raeume[i].positionen.length === 0) raeume.splice(i, 1)
  }

  // Übergrosse Stücke, die in kein Fahrzeug passen, werden trotzdem
  // dargestellt (nebeneinander am Boden), damit nichts unsichtbar verschwindet.
  if (unplaceable.length > 0) {
    const ov = createNewRaum()
    ov.overflow = true
    let cx = 0.1
    for (const item of unplaceable) {
      const dx = mmToM(item.L)
      const dy = mmToM(item.b)
      const dz = mmToM(item.a)
      const placed = {
        type: item.typ === 'konus' || item.typ === 'bogen' ? item.typ : 'box',
        position: [cx + dx / 2, dy / 2, dz / 2 + 0.1],
        size: [dx, dy, dz],
        farbe: item.farbe,
        name: item.name,
        pos: item.pos,
        orientation: 'normal',
      }
      if (item.typ === 'konus') {
        placed.eingang = { a: item.eingangA, b: item.eingangB }
        placed.ausgang = { a: item.ausgangA, b: item.ausgangB }
        placed.versatz1 = item.versatz1
        placed.versatz2 = item.versatz2
      }
      if (item.typ === 'bogen') {
        placed.eingangA = item.eingangA
        placed.eingangB = item.eingangB
        placed.ausgangA = item.ausgangA
        placed.grad = item.grad
        placed.radius = item.radius
        placed.schenkel1 = item.schenkel1
        placed.schenkel2 = item.schenkel2
      }
      ov.positionen.push(placed)
      cx += dx + 0.3
    }
    raeume.push(ov)
  }

  return raeume
}

// Liefert die zugeteilten Fahrzeug-Indizes einer MAJ-Datei als Array (oder null).
function zugeteilteFahrzeuge(majFile, majFahrzeug) {
  if (!majFile) return null
  const v = majFahrzeug[majFile]
  if (Array.isArray(v) && v.length) return v
  if (v !== undefined && v !== null && v !== '') return [v]
  return null
}

// Packt die Frachtstücke getrennt pro MAJ-Datei auf deren zugeteilte Fahrzeuge.
// Sind mehrere Fahrzeuge zugeteilt, verteilt sich die Ladung auf alle (ein
// Laderaum pro Fahrzeug, Überlauf auf das letzte). Stücke ohne Zuteilung
// laufen gesammelt über das Standard-Fahrzeug (selectedFahrzeug).
function berechneBeladungZugeteilt(fahrzeuge, frachtstuecke, majFahrzeug, selectedFahrzeug, variante) {
  const buckets = new Map()
  for (const f of frachtstuecke) {
    const zug = zugeteilteFahrzeuge(f.majFile, majFahrzeug)
    const key = zug ? f.majFile : '__default__'
    if (!buckets.has(key)) {
      buckets.set(key, { vehicles: zug || [selectedFahrzeug], pieces: [], majFile: zug ? f.majFile : null })
    }
    buckets.get(key).pieces.push(f)
  }
  const alle = []
  for (const b of buckets.values()) {
    const liste = b.vehicles.map((vi) => fahrzeuge[vi] || fahrzeuge[0])
    const raeume = berechneBeladung(liste, b.pieces, variante)
    for (const r of raeume) {
      const vi = b.vehicles[Math.min(r.fahrzeugIndex, b.vehicles.length - 1)]
      r.zugewiesenFahrzeug = vi
      r.majFile = b.majFile
      alle.push(r)
    }
  }
  return alle
}

const ANZAHL_VARIANTEN = 4

function Scene({ fahrzeug, raum, hideTruck }) {
  if (!raum) return null

  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight position={[10, 15, 10]} intensity={1} />
      <directionalLight position={[-5, 10, -5]} intensity={0.3} />

      {!hideTruck && (
        <Ladeflaeche laenge={fahrzeug.laenge} breite={fahrzeug.breite} hoehe={fahrzeug.hoehe} />
      )}

      {raum.positionen.map((p, i) => {
        if (p.type === 'box') {
          return <FrachtBox key={i} position={p.position} size={p.size} farbe={p.farbe} name={p.pos || p.name} />
        }
        if (p.type === 'konus') {
          return (
            <FrachtKonus
              key={i}
              position={p.position}
              size={p.size}
              eingang={p.eingang}
              ausgang={p.ausgang}
              versatz1={p.versatz1}
              versatz2={p.versatz2}
              farbe={p.farbe}
              name={p.pos || p.name}
            />
          )
        }
        if (p.type === 'bogen') {
          return (
            <FrachtBogen
              key={i}
              position={p.position}
              size={p.size}
              eingangA={p.eingangA}
              eingangB={p.eingangB}
              ausgangA={p.ausgangA}
              grad={p.grad}
              radius={p.radius}
              schenkel1={p.schenkel1}
              schenkel2={p.schenkel2}
              farbe={p.farbe}
              name={p.pos || p.name}
            />
          )
        }
        if (p.type === 'spiro' || p.type === 'spiro-nested') {
          return (
            <SpiroZylinder
              key={i}
              position={p.position}
              radius={p.radius}
              laenge={p.laenge}
              farbe={p.farbe}
              name={p.pos || p.name}
            />
          )
        }
        return null
      })}

      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        target={[fahrzeug.laenge / 2, fahrzeug.hoehe / 2, fahrzeug.breite / 2]}
        maxDistance={Math.max(fahrzeug.laenge, fahrzeug.breite, fahrzeug.hoehe) * 3}
      />
    </>
  )
}

export default function Beladeplan({ fahrzeuge, selectedFahrzeug, frachtstuecke, majFahrzeug = {} }) {
  const [raumFahrzeuge, setRaumFahrzeuge] = useState({})
  const [variante, setVariante] = useState(0)

  const hatZuteilung = useMemo(
    () => frachtstuecke.some((f) => zugeteilteFahrzeuge(f.majFile, majFahrzeug)),
    [frachtstuecke, majFahrzeug]
  )

  const fahrzeugListe = useMemo(() => {
    const maxRaeume = 10
    const liste = []
    for (let i = 0; i < maxRaeume; i++) {
      const fzIdx = raumFahrzeuge[i] !== undefined ? raumFahrzeuge[i] : selectedFahrzeug
      liste.push(fahrzeuge[fzIdx] || fahrzeuge[0])
    }
    return liste
  }, [fahrzeuge, selectedFahrzeug, raumFahrzeuge])

  const raeume = useMemo(
    () => hatZuteilung
      ? berechneBeladungZugeteilt(fahrzeuge, frachtstuecke, majFahrzeug, selectedFahrzeug, variante)
      : berechneBeladung(fahrzeugListe, frachtstuecke, variante),
    [hatZuteilung, fahrzeuge, fahrzeugListe, frachtstuecke, majFahrzeug, selectedFahrzeug, variante]
  )

  const handleFahrzeugChange = useCallback((raumIdx, fzIdx) => {
    setRaumFahrzeuge((prev) => ({ ...prev, [raumIdx]: fzIdx }))
  }, [])

  const geladeneFracht = frachtstuecke.filter((f) => f.anzahl > 0)
  const gesamtAnzahl = frachtstuecke.reduce((sum, f) => sum + f.anzahl, 0)

  const totalGeladen = raeume.reduce((sum, r) => {
    return sum + r.positionen.length
  }, 0)

  return (
    <div className="beladeplan-container">
      {geladeneFracht.length > 0 && (
        <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <strong>Beladung</strong>
            <span style={{ marginLeft: 8, color: '#888', fontSize: '0.85rem' }}>
              Variante {(((variante % ANZAHL_VARIANTEN) + ANZAHL_VARIANTEN) % ANZAHL_VARIANTEN) + 1} / {ANZAHL_VARIANTEN}
            </span>
          </div>
          <button
            onClick={() => setVariante((v) => v + 1)}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              background: '#1a56db',
              color: '#fff',
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            🔄 Neu laden / andere Zusammensetzung
          </button>
        </div>
      )}
      {raeume.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <p style={{ color: '#888', fontSize: '1.1rem' }}>
            Keine Frachtstücke zum Laden vorhanden.<br />
            Bitte fügen Sie zuerst Frachtstücke hinzu.
          </p>
        </div>
      )}

      {raeume.map((raum, idx) => {
        const fzIdx = hatZuteilung
          ? (raum.zugewiesenFahrzeug ?? selectedFahrzeug)
          : (raumFahrzeuge[idx] !== undefined ? raumFahrzeuge[idx] : selectedFahrzeug)
        let fz = fahrzeuge[fzIdx] || fahrzeuge[0]
        if (raum.overflow) {
          let maxX = 0, maxZ = 0, maxY = 0
          for (const p of raum.positionen) {
            maxX = Math.max(maxX, p.position[0] + p.size[0] / 2)
            maxZ = Math.max(maxZ, p.position[2] + p.size[2] / 2)
            maxY = Math.max(maxY, p.position[1] + p.size[1] / 2)
          }
          fz = { name: 'Übergross', laenge: maxX + 0.2, breite: maxZ + 0.2, hoehe: maxY + 0.2 }
        }
        return (
          <div key={idx}>
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <h2 style={{ margin: 0, color: raum.overflow ? '#c0392b' : undefined }}>
                  {raum.overflow ? '⚠️ Passt in kein Fahrzeug' : `Laderaum ${idx + 1}${raeume.length > 1 ? ` von ${raeume.length}` : ''}`}
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} hidden={raum.overflow}>
                  <label style={{ fontSize: '0.85rem', color: '#888', whiteSpace: 'nowrap' }}>Fahrzeug:</label>
                  {hatZuteilung ? (
                    <span style={{
                      padding: '6px 10px',
                      borderRadius: 6,
                      background: '#e8f0fe',
                      color: '#1a56db',
                      fontSize: '0.9rem',
                      fontWeight: 600,
                    }}>
                      {fz.name} ({fz.laenge}×{fz.breite}×{fz.hoehe}m){raum.majFile ? ` · ${raum.majFile.replace(/\.maj$/i, '')}` : ''} · zugeteilt
                    </span>
                  ) : (
                    <select
                      value={fzIdx}
                      onChange={(e) => handleFahrzeugChange(idx, parseInt(e.target.value))}
                      style={{
                        padding: '6px 10px',
                        borderRadius: 6,
                        border: '1px solid #444',
                        background: '#2a2a2a',
                        color: '#fff',
                        fontSize: '0.9rem',
                        minWidth: 140,
                      }}
                    >
                      {fahrzeuge.map((f, fi) => (
                        <option key={fi} value={fi}>
                          {f.name} ({f.laenge}×{f.breite}×{f.hoehe}m)
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
              {raum.overflow ? (
                <p style={{ color: '#c0392b', fontWeight: 600, marginBottom: 12, marginTop: 8 }}>
                  Diese Stücke sind zu gross für das gewählte Fahrzeug und werden hier separat dargestellt:
                  {' '}{[...new Set(raum.positionen.map((p) => p.pos || p.name))].join(', ')}
                </p>
              ) : (raeume.length > 1 && idx > 0 && (
                <p style={{ color: '#e67e22', fontWeight: 600, marginBottom: 12, marginTop: 8 }}>
                  Zusätzlicher Laderaum benötigt
                </p>
              ))}
              <div className="canvas-wrapper">
                <Canvas
                  camera={{
                    position: [fz.laenge * 0.8, fz.hoehe * 2, fz.breite * 2.5],
                    fov: 50, near: 0.1, far: 200,
                  }}
                  style={{ background: '#ffffff' }}
                >
                  <Scene fahrzeug={fz} raum={raum} hideTruck={raum.overflow} />
                </Canvas>
              </div>
              <div style={{ marginTop: 8, fontSize: '0.85rem', color: '#888' }}>
                {raum.overflow
                  ? `${raum.positionen.length} übergrosse Stück(e)`
                  : `${raum.positionen.length} Stück in diesem Raum — ${fz.name} (${fz.laenge} × ${fz.breite} × ${fz.hoehe} m)`}
              </div>
            </div>
          </div>
        )
      })}

      <div className="lade-info">
        <div className="info-badge">
          <span className="label">Geladen</span>
          <span className="value">{totalGeladen} / {gesamtAnzahl} Stück</span>
        </div>
        {raeume.length > 1 && (
          <div className="info-badge" style={{ borderColor: '#e67e22' }}>
            <span className="label" style={{ color: '#e67e22' }}>Laderäume</span>
            <span className="value" style={{ color: '#e67e22' }}>{raeume.length} benötigt</span>
          </div>
        )}
      </div>

      {geladeneFracht.length > 0 && (
        <div className="card">
          <h2>Legende</h2>
          <div className="legende">
            {geladeneFracht.map((f) => (
              <div key={f.id} className="legende-item">
                <div
                  className="legende-color"
                  style={{
                    backgroundColor: f.farbe,
                    borderRadius: f.typ === 'spiro' ? '50%' : '4px',
                  }}
                />
                <span>
                  {f.name} ({f.anzahl}×)
                  {f.typ === 'spiro' && ' 🔵'}
                  {f.typ === 'kanal' && ' 📦'}
                </span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12, fontSize: '0.8rem', color: '#888' }}>
            📦 Kanäle = stehend geladen (liegend nur bei Platzmangel) &nbsp;|&nbsp;
            🔵 Spiro = am Boden hinten geladen &nbsp;|&nbsp;
            Kleine Spiro werden in grössere verschachtelt
          </div>
        </div>
      )}
    </div>
  )
}
