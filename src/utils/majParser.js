import pako from 'pako'

const FARBEN = [
  '#4a90d9', '#e67e22', '#2ecc71', '#e74c3c', '#9b59b6',
  '#1abc9c', '#f39c12', '#3498db', '#e91e63', '#795548',
  '#607d8b', '#ff5722', '#8bc34a', '#00bcd4', '#ffc107',
]

function readUtf16StringsRange(data, start, end) {
  const strings = []
  let current = []
  let startPos = null
  for (let i = start; i < end - 1; i += 2) {
    const lo = data[i]
    const hi = data[i + 1]
    const isAscii = hi === 0 && lo >= 0x20 && lo <= 0x7e
    const isUmlaut =
      hi === 0 &&
      [0xf8, 0xf6, 0xfc, 0xe4, 0xc4, 0xd6, 0xdc, 0xdf].includes(lo)
    if (isAscii || isUmlaut) {
      if (current.length === 0) startPos = i
      current.push(String.fromCharCode(lo))
    } else {
      if (current.length >= 3) {
        strings.push({ pos: startPos, text: current.join('') })
      }
      current = []
      startPos = null
    }
  }
  if (current.length >= 3) {
    strings.push({ pos: startPos, text: current.join('') })
  }
  return strings
}

function readUtf16Strings(data) {
  return readUtf16StringsRange(data, 0, data.length)
}

function readDouble(data, offset) {
  const buf = new ArrayBuffer(8)
  const view = new Uint8Array(buf)
  for (let i = 0; i < 8; i++) view[i] = data[offset + i]
  return new Float64Array(buf)[0]
}

function readUint32(data, offset) {
  return (
    data[offset] |
    (data[offset + 1] << 8) |
    (data[offset + 2] << 16) |
    ((data[offset + 3] << 24) >>> 0)
  )
}

function findUtf16Marker(data, searchStr) {
  const searchBytes = new Uint8Array(searchStr.length * 2)
  for (let i = 0; i < searchStr.length; i++) {
    searchBytes[i * 2] = searchStr.charCodeAt(i)
    searchBytes[i * 2 + 1] = 0
  }
  const results = []
  for (let i = 0; i < data.length - searchBytes.length; i += 2) {
    let match = true
    for (let j = 0; j < searchBytes.length; j++) {
      if (data[i + j] !== searchBytes[j]) {
        match = false
        break
      }
    }
    if (match) results.push(i)
  }
  return results
}

function findConsecutiveDimensions(data, start, end) {
  const groups = []
  let i = start
  while (i < end - 7) {
    const val = readDouble(data, i)
    if (val > 0 && val <= 10000 && val === Math.floor(val)) {
      const group = [{ pos: i, val }]
      let j = i + 8
      while (j < end - 7) {
        const next = readDouble(data, j)
        if (next >= 0 && next <= 10000 && next === Math.floor(next)) {
          group.push({ pos: j, val: next })
          j += 8
          if (group.length >= 4) break
        } else {
          break
        }
      }
      if (group.length >= 2) {
        groups.push(group)
        i = j
      } else {
        // Einzelwert war vermutlich ein fehl-ausgerichteter Zufallstreffer.
        // Nicht bis j springen, sonst werden echte (8-Byte-ausgerichtete)
        // Masszahlen direkt dahinter übersprungen.
        i += 2
      }
    } else {
      i += 2
    }
  }
  return groups
}

function findMenge(data, sectionStart, sectionEnd, articleType) {
  // 876 marker: authoritative for Spiro (any byte alignment, full section)
  function find876() {
    for (let i = sectionStart; i < sectionEnd - 16; i++) {
      const v = data[i] | (data[i+1] << 8) | (data[i+2] << 16) | ((data[i+3] << 24) >>> 0)
      if (v === 876) {
        const v3 = readUint32(data, i + 8)
        if (v3 === 9) {
          const menge = readUint32(data, i + 12)
          if (menge > 0 && menge < 10000) return menge
        }
      }
    }
    return null
  }

  // 1036/1038 marker: authoritative for Kanal/Schalldämpfer/Kanal-cut
  // (any byte alignment). The field id varies between MAJ variants (1036 or
  // 1038); both store the quantity 12 bytes after the marker. The flag at +4
  // is 0 in some variants and 1 in others.
  function find1036() {
    for (let i = sectionStart; i < sectionEnd - 30; i++) {
      const v = data[i] | (data[i+1] << 8) | (data[i+2] << 16) | ((data[i+3] << 24) >>> 0)
      if (v === 1036 || v === 1038) {
        const v2 = readUint32(data, i + 4)
        if (v2 === 0 || v2 === 1) {
          const menge = readUint32(data, i + 12)
          if (menge > 0 && menge < 10000) return menge
        }
      }
    }
    return null
  }

  // Priority depends on article type
  if (articleType === 'spiro') {
    const m876 = find876()
    if (m876 !== null) return m876
    const m1036 = find1036()
    if (m1036 !== null) return m1036
  } else {
    const m1036 = find1036()
    if (m1036 !== null) return m1036
    const m876 = find876()
    if (m876 !== null) return m876
  }

  // Fallback: 866 pattern (4-byte aligned)
  for (let i = sectionStart; i < sectionEnd - 16; i += 4) {
    const v1 = readUint32(data, i)
    const v2 = readUint32(data, i + 4)
    const v3 = readUint32(data, i + 8)
    const v4 = readUint32(data, i + 12)
    if (v2 === 0 && v3 === 1 && v4 === 866 && v1 > 0 && v1 < 10000) {
      return v1
    }
  }

  return 1
}

function detectArticleType(strings) {
  for (const s of strings) {
    if (s.text.startsWith('Schalld')) {
      return { type: 'schalldaempfer', name: 'Schalldämpfer' }
    }
  }
  for (const s of strings) {
    const match = s.text.match(/^Spiro.*ø(\d+)/)
    if (match) {
      return { type: 'spiro', diameter: parseInt(match[1]), name: s.text }
    }
  }
  for (const s of strings) {
    if (s.text.startsWith('Spiro')) {
      return { type: 'spiro', diameter: null, name: s.text }
    }
  }
  for (const s of strings) {
    if (s.text.startsWith('Kanal-cut')) {
      return { type: 'kanal_cut', name: 'Kanal-cut' }
    }
  }
  for (const s of strings) {
    if (s.text.startsWith('Kanal')) return { type: 'kanal', name: 'Kanal' }
  }
  return null
}

function findPos(strings) {
  for (const s of strings) {
    const t = s.text.trim()
    if (/^Fo\d+[A-Za-z*]?$/.test(t)) return t
  }
  // Positionscode anderer MAJ-Varianten, z.B. 1.08_Z_AB4 oder 1.07_Z_ZU61
  for (const s of strings) {
    const t = s.text.trim()
    if (/^\d+\.\d+_[A-Za-z0-9]+(_[A-Za-z0-9]+)*\*?$/.test(t)) return t
  }
  return ''
}

function findArticleName(strings, articleType) {
  if (articleType.type === 'spiro') {
    for (const s of strings) {
      if (s.text.match(/Spirorohr.*ø\d+/)) return s.text
    }
    for (const s of strings) {
      if (s.text.includes('Spiro') && s.text.includes('ø')) return s.text
    }
  }
  if (articleType.type === 'schalldaempfer') {
    return 'Schalldämpfer'
  }
  if (articleType.type === 'kanal_cut') {
    return 'Kanal-cut'
  }
  if (articleType.type === 'kanal') {
    return 'Kanal'
  }
  return articleType.name
}

function decompressMAJ(rawData) {
  const header = String.fromCharCode(...rawData.slice(0, 20))
  if (!header.startsWith('MAP Compressed File')) {
    throw new Error('Ungültiges MAJ-Dateiformat. Erwartet: MAP Compressed File Header.')
  }

  let zlibOffset = -1
  for (let i = 0; i < Math.min(rawData.length, 100); i++) {
    if (rawData[i] === 0x78 && rawData[i + 1] === 0x9c) {
      zlibOffset = i
      break
    }
  }
  if (zlibOffset === -1) {
    throw new Error('Keine komprimierten Daten in der MAJ-Datei gefunden.')
  }

  const compressed = rawData.slice(zlibOffset + 2)
  try {
    return pako.inflateRaw(compressed)
  } catch {
    throw new Error('Fehler beim Dekomprimieren der MAJ-Datei.')
  }
}

function parseSimpleMAJ(data, sectionStarts) {
  const articles = []

  for (let s = 0; s < sectionStarts.length; s++) {
    const start = sectionStarts[s]
    const end =
      s + 1 < sectionStarts.length ? sectionStarts[s + 1] : data.length

    const stringsArea = Math.min(end, start + 3000)
    const strings = readUtf16Strings(data.slice(start, stringsArea))

    const articleType = detectArticleType(strings)
    if (!articleType) continue
    const name = findArticleName(strings, articleType)
    const pos = findPos(strings)

    // Positionen mit Stern (z.B. 1.08_Z_ZU15*) sind Sonder-/Doppel-Einträge
    // ohne gültigen Mass-Block -> nicht importieren.
    if (pos && pos.endsWith('*')) continue

    const menge = findMenge(data, start, end, articleType.type)
    const dimGroups = findConsecutiveDimensions(data, start, end)

    let article

    if (articleType.type === 'spiro') {
      const diameter = articleType.diameter
      let length = 3000
      let foundLength = false
      if (diameter) {
        for (const group of dimGroups) {
          for (let i = 0; i < group.length - 1; i++) {
            if (group[i].val === diameter && group[i + 1].val > diameter) {
              length = group[i + 1].val
              foundLength = true
              break
            }
          }
          if (foundLength) break
        }
      }
      article = {
        typ: 'spiro',
        name: name,
        durchmesser: diameter || 160,
        L: length,
        anzahl: menge,
      }
    } else if (articleType.type === 'schalldaempfer' || articleType.type === 'kanal') {
      let a = 600,
        b = 500,
        L = 1850
      let found = false
      for (const group of dimGroups) {
        if (
          group.length >= 3 &&
          group[0].val >= 100 &&
          group[1].val >= 100 &&
          group[2].val >= group[0].val &&
          group[2].val >= group[1].val
        ) {
          a = group[0].val
          b = group[1].val
          L = group[2].val
          found = true
          break
        }
      }
      if (!found) {
        for (const group of dimGroups) {
          if (
            group.length >= 3 &&
            group[0].val >= 100 &&
            group[1].val >= 100 &&
            group[2].val >= 100
          ) {
            a = group[0].val
            b = group[1].val
            L = group[2].val
            break
          }
        }
      }
      article = { typ: articleType.type === 'schalldaempfer' ? 'kanal' : 'kanal', name: name, a, b, L, anzahl: menge }
    } else if (articleType.type === 'kanal_cut') {
      // Kanal-cut: the three consecutive dimensions are stored in order as
      // A, B, L (a=A x B, b=A1 x B1, L=L/Grad). Unlike a regular Kanal, L is
      // NOT the largest value, so take the values in order without sorting.
      let a = 0,
        b = 0,
        L = 0
      for (const group of dimGroups) {
        if (
          group.length >= 3 &&
          group[0].val >= 50 &&
          group[1].val >= 50 &&
          group[2].val >= 50
        ) {
          a = group[0].val
          b = group[1].val
          L = group[2].val
          break
        }
      }
      if (a === 0) {
        a = 600
        b = 300
        L = 200
      }
      article = { typ: 'kanal', name: name, a, b, L, anzahl: menge }
    }

    if (article) {
      if (pos) article.pos = pos
      article.farbe = FARBEN[articles.length % FARBEN.length]
      articles.push(article)
    }
  }

  return articles
}

function scanDoubles2ByteAligned(data, start, end) {
  const results = []
  for (let j = start; j < end - 7; j += 2) {
    const val = readDouble(data, j)
    if (val >= 10 && val <= 10000 && Math.abs(val - Math.round(val)) < 0.5) {
      results.push({ offset: j - start, absOffset: j, val: Math.round(val) })
    }
  }
  return results
}

function extractKanalDimsFromPosition(data, entryPos) {
  const scanStart = entryPos + 780
  const scanEnd = Math.min(entryPos + 2000, data.length - 7)
  const allDoubles = scanDoubles2ByteAligned(data, scanStart, scanEnd)

  let L_first = null
  let L_secondary = null
  for (const d of allDoubles) {
    const relOff = d.absOffset - entryPos
    if (relOff >= 790 && relOff <= 800 && d.val >= 100) {
      L_first = d.val
    }
    if (relOff >= 804 && relOff <= 812 && L_first && d.val >= 100 && d.val < L_first) {
      L_secondary = d.val
    }
  }

  let L
  if (L_first && L_first <= 3060 && L_first >= 3040) {
    if (L_secondary) {
      L = L_secondary
    } else {
      L = findTripletL(allDoubles, entryPos)
    }
  } else if (L_first) {
    L = L_first
  } else {
    L = findTripletL(allDoubles, entryPos) || 1500
  }

  const counts = {}
  for (const d of allDoubles) counts[d.val] = (counts[d.val] || 0) + 1

  const frequent = Object.entries(counts)
    .filter(([, c]) => c >= 3)
    .map(([k]) => parseInt(k))
    .filter(
      (v) =>
        v !== 3050 &&
        v !== 3054 &&
        v !== 30 &&
        Math.abs(v - L) > 10 &&
        Math.abs(v - (L + 4)) > 2
    )
    .sort((x, y) => x - y)

  let b = frequent[0] || 150
  let a = frequent[1] || b
  if (a < b) {
    const tmp = a
    a = b
    b = tmp
  }

  return { a, b, L }
}

function findTripletL(allDoubles, entryPos) {
  for (let i = 0; i < allDoubles.length - 2; i++) {
    const d1 = allDoubles[i]
    const d2 = allDoubles[i + 1]
    const d3 = allDoubles[i + 2]
    if (
      d2.absOffset - d1.absOffset === 8 &&
      d3.absOffset - d2.absOffset === 8 &&
      d1.val !== 30 &&
      d2.val !== 30
    ) {
      const v1 = d1.val,
        v2 = d2.val,
        v3 = d3.val
      for (let j = i + 3; j < allDoubles.length - 2; j++) {
        if (
          allDoubles[j].val === v1 &&
          j + 1 < allDoubles.length &&
          allDoubles[j + 1].val === v2 &&
          j + 2 < allDoubles.length &&
          allDoubles[j + 2].val === v3 &&
          allDoubles[j + 1].absOffset - allDoubles[j].absOffset === 8 &&
          allDoubles[j + 2].absOffset - allDoubles[j + 1].absOffset === 8
        ) {
          return v3
        }
      }
    }
  }
  return null
}

function extractKonusDimsFromPosition(data, entryPos) {
  const scanStart = entryPos + 1020
  const scanEnd = Math.min(entryPos + 1100, data.length - 7)
  const doubles = scanDoubles2ByteAligned(data, scanStart, scanEnd)

  if (doubles.length >= 5) {
    const b1 = doubles[0].val
    const a1 = doubles[1].val
    const b2 = doubles[2].val
    const a2 = doubles[3].val
    const L = doubles[4].val
    return {
      a: Math.max(a1, a2),
      b: Math.max(b1, b2),
      L: L || 300,
    }
  }
  return { a: 450, b: 150, L: 300 }
}

function extractBogenDimsFromPosition(data, entryPos) {
  const scanStart = entryPos + 880
  const scanEnd = Math.min(entryPos + 940, data.length - 7)
  const doubles = scanDoubles2ByteAligned(data, scanStart, scanEnd)

  if (doubles.length >= 2) {
    const a = doubles[0].val
    const b = doubles[1].val
    const angle = doubles.length >= 3 ? doubles[2].val : 90
    const radius = angle === 90 ? Math.max(a, 200) : Math.max(a * 0.7, 200)
    return { a, b, L: Math.round(radius) }
  }
  return { a: 450, b: 120, L: 450 }
}

function extractTStueckDimsFromPosition(data, entryPos) {
  const scanStart = entryPos + 860
  const scanEnd = Math.min(entryPos + 960, data.length - 7)
  const doubles = scanDoubles2ByteAligned(data, scanStart, scanEnd)

  if (doubles.length >= 4) {
    const vals = doubles.map((d) => d.val).sort((x, y) => y - x)
    return {
      a: vals[0] || 600,
      b: vals[vals.length - 1] || 150,
      L: vals[1] || vals[0] || 500,
    }
  }
  return { a: 600, b: 150, L: 500 }
}

function parseComplexMAJ(data) {
  const allStrings = readUtf16StringsRange(data, 0, data.length)

  const positionEntries = []
  for (const s of allStrings) {
    if (s.text.match(/^\d+\.\w+\.\d+(\.\d+)?$/)) {
      const numMatch = s.text.match(/\.(\d+)$/)
      if (numMatch) {
        positionEntries.push({
          pos: s.pos,
          text: s.text,
          num: parseInt(numMatch[1]),
        })
      }
    }
  }

  if (positionEntries.length === 0) return []

  const items = []
  for (const entry of positionEntries) {
    const searchStart = Math.max(0, entry.pos - 200)
    const searchEnd = Math.min(data.length, entry.pos + 10000)
    const nearbyStrings = readUtf16StringsRange(data, searchStart, searchEnd)

    const hasKanal = nearbyStrings.some((s) => s.text === 'Kanal')

    if (!hasKanal) continue

    const dims = extractKanalDimsFromPosition(data, entry.pos)
    items.push({
      typ: 'kanal',
      name: 'Kanal',
      a: dims.a,
      b: dims.b,
      L: dims.L,
      anzahl: 1,
    })
  }

  const grouped = new Map()
  for (const item of items) {
    const key =
      item.typ === 'spiro'
        ? `spiro_${item.durchmesser}_${item.L}`
        : `${item.typ}_${item.name}_${item.a}_${item.b}_${item.L}`
    if (grouped.has(key)) {
      grouped.get(key).anzahl += item.anzahl
    } else {
      grouped.set(key, { ...item })
    }
  }

  const articles = []
  for (const item of grouped.values()) {
    item.farbe = FARBEN[articles.length % FARBEN.length]
    articles.push(item)
  }

  return articles
}

export function parseMAJFile(arrayBuffer) {
  const rawData = new Uint8Array(arrayBuffer)
  const data = decompressMAJ(rawData)

  const marker = './Ablagestruktur'
  const sectionStarts = findUtf16Marker(data, marker)

  const posMarkers = findUtf16Marker(data, 'Kanal')
  const earlyKanalCount = posMarkers.filter(
    (p) => sectionStarts.length === 0 || p < sectionStarts[0]
  ).length

  const isComplex = earlyKanalCount > 10

  if (isComplex) {
    const complexArticles = parseComplexMAJ(data)
    const sectionArticles =
      sectionStarts.length > 0 ? parseSimpleMAJ(data, sectionStarts) : []
    const combined = [...complexArticles, ...sectionArticles]
    for (let i = 0; i < combined.length; i++) {
      combined[i].farbe = FARBEN[i % FARBEN.length]
    }
    if (combined.length > 0) return combined
  }

  if (sectionStarts.length === 0) {
    throw new Error('Keine Artikel in der MAJ-Datei gefunden.')
  }

  return parseSimpleMAJ(data, sectionStarts)
}
