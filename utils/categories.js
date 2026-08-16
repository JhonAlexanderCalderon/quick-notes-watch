// color: 0xRRGGBB (Zepp device-side widgets take raw hex ints, not CSS
// strings) — one pastel accent per category, used consistently across
// every watch screen so the color itself becomes a navigation cue.
export const CATEGORIES = [
  { id: 'personal', label: 'Datos Personales', color: 0xff9e9e },
  { id: 'ti', label: 'Datos TI', color: 0x6ee7da },
  { id: 'reuniones', label: 'Reuniones', color: 0xc4b5fd },
]

export function emptyNotesData() {
  const data = {}
  for (const c of CATEGORIES) data[c.id] = []
  return data
}
