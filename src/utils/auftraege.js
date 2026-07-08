// Gemeinsames Datenmodell für Auftragsjournal, Transportliste und
// Produktionsplanung. Ein Auftrag (order) wird an einer Stelle bearbeitet und
// erscheint in allen drei Ansichten.

export const LIEFERARTEN = ['Abholung', 'Lieferung', 'LH', 'DPD / Post']
export const ABLADESTELLEN = ['Baustelle', 'Magazin', 'Hemair']

// Ein leerer Auftrag mit allen Feldern.
export const LEER_AUFTRAG = {
  // Journal / allgemein
  datum: '',            // Erfassungsdatum (Journal-Gruppierung)
  visum: '',            // Kürzel (AZ, TK, DS …)
  auftrnr: '',          // = MAJ-Datei-Nr.
  auftrnrKunde: '',
  kunde: '',
  objekt: '',
  liefertermin: '',
  zeit: '',
  prodTermin: '',
  keineProduktion: false,
  aufAbruf: false,
  reserv: false,
  lieferart: '',
  bemerkungTransp: '',
  // Produktion – Mengen + Status
  kanaele: '',
  statusKA: false,
  formstuecke: '',
  statusFST: false,
  rund: '',
  statusR: false,
  armaturen: '',
  statusArmaturen: false,
  bemerkungProd: '',
  // Transport
  erledigt: false,
  abladestelle: '',
  chauffeur: '',
  fahrzeug: '',
  anhaenger: false,
  gewicht: '',
}

// MAJ-Dateiname -> reine Auftrags-/Datei-Nr. ("26204378.MAJ" -> "26204378")
export function majNummer(name) {
  if (!name) return ''
  return name.replace(/\.maj$/i, '').trim()
}

// Objekt-Text -> Adresse fürs Geocoding (angehängte Auftrags-Nr. entfernen).
export function cleanAdresse(objekt) {
  if (!objekt) return ''
  return objekt.replace(/\s*\/\s*\d+\s*$/, '').trim()
}

// Migriert alte Transportlisten-Einträge auf das neue Auftrags-Schema.
export function migrateFromTransportliste(alt) {
  return alt.map((e) => ({
    ...LEER_AUFTRAG,
    ...e,
    datum: e.datum || e.liefertermin || '',
    bemerkungTransp: e.bemerkungTransp ?? e.bemerkung ?? '',
  }))
}

export const SEED_AUFTRAEGE = [
  { id: 1, ...LEER_AUFTRAG, datum: '2026-07-08', visum: 'AZ', auftrnr: '26204803', kunde: 'ASKO Handels AG', objekt: 'ASKO Lager, Widnau / 20\u2019260\u2019419', liefertermin: '2026-07-08', prodTermin: '2026-07-08', lieferart: 'Abholung', rund: '25', statusR: true },
  { id: 2, ...LEER_AUFTRAG, datum: '2026-07-08', visum: 'AZ', auftrnr: '26204804', kunde: 'ASKO Handels AG', objekt: 'Schmid / 20\u2019260\u2019422', liefertermin: '2026-07-08', prodTermin: '2026-07-08', lieferart: 'Abholung', rund: '1', statusR: true },
  { id: 3, ...LEER_AUFTRAG, datum: '2026-07-08', visum: 'TK', auftrnr: '26204596', kunde: 'Equans AG, Chur', objekt: 'Hotel Waldhaus Via Sorts Sura, Flims / ABL+FOL K\u00fcche', liefertermin: '2026-07-08', prodTermin: '2026-07-08', lieferart: 'Lieferung', kanaele: '4', statusKA: true, formstuecke: '4', statusFST: true, armaturen: '1', bemerkungProd: 'RHE CU / LT 09.07' },
  { id: 4, ...LEER_AUFTRAG, datum: '2026-07-08', visum: 'TK', auftrnr: '26204709', kunde: 'Equans AG, Chur', objekt: 'Trainingshalle HCD Davos Eisenbahnstrasse 2, 7270 Davos Platz', liefertermin: '2026-07-08', prodTermin: '2026-07-08', lieferart: 'Lieferung', kanaele: '6', statusKA: true, formstuecke: '13', statusFST: true },
  { id: 5, ...LEER_AUFTRAG, datum: '2026-07-08', visum: 'TK', auftrnr: '26204798', kunde: 'Equans AG, Chur', objekt: 'Trainingshalle HCD Davos Eisenbahnstrasse 2, 7270 Davos Platz', liefertermin: '2026-07-08', prodTermin: '2026-07-08', lieferart: 'Lieferung', formstuecke: '4', statusFST: true },
  { id: 6, ...LEER_AUFTRAG, datum: '2026-07-08', visum: 'AZ', auftrnr: '26204733', kunde: 'Equans AG, St. Moritz', objekt: 'Via Maistra 6, 7500 St.Moritz', liefertermin: '2026-07-08', prodTermin: '2026-07-08', lieferart: 'Abholung', kanaele: '10', statusKA: true, formstuecke: '24', statusFST: true },
]
