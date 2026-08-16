import { FIREBASE_CONFIG } from './firebase-config'

const DOC_URL = `https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/(default)/documents/notes/data`

// Takes a `storage` object (getItem/setItem) explicitly rather than
// reaching for a bare `settings` global, because the two callers of this
// module run in different Zepp OS contexts with different conventions:
// app-side (Side Service) exposes a bare `settings` global, but the
// Settings Page only gets storage via its `build(props)` parameter
// (`props.settingsStorage`) — there's no bare `settings` there.

function recordSuccess(storage, direction) {
  storage.setItem('_fbLastSyncAt', new Date().toISOString())
  storage.setItem('_fbLastSyncDirection', direction)
  storage.setItem('_fbLastError', '')
}

function recordError(storage, err) {
  storage.setItem('_fbLastError', (err && err.message) || String(err))
}

// Read by the Settings page's diagnostics panel — never throws, always
// returns a plain object even if nothing's synced yet.
export function getSyncStatus(storage) {
  return {
    lastSyncAt: storage.getItem('_fbLastSyncAt') || '',
    lastSyncDirection: storage.getItem('_fbLastSyncDirection') || '',
    lastError: storage.getItem('_fbLastError') || '',
  }
}

// Anonymous auth is enough here (single personal-use app, see
// firestore.rules) — the refresh token is cached so we don't mint a brand
// new anonymous user on every sync.
async function getIdToken(storage) {
  const cachedRefreshToken = storage.getItem('_fbRefreshToken')

  if (cachedRefreshToken) {
    try {
      const res = await fetch(
        `https://securetoken.googleapis.com/v1/token?key=${FIREBASE_CONFIG.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `grant_type=refresh_token&refresh_token=${cachedRefreshToken}`,
        }
      )
      const data = await res.json()
      if (data.id_token) return data.id_token
    } catch (e) {
      // fall through to a fresh anonymous sign-up below
    }
  }

  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_CONFIG.apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ returnSecureToken: true }),
    }
  )
  const data = await res.json()
  if (!data.idToken) {
    throw new Error(data.error?.message || 'No se pudo autenticar con Firebase')
  }
  if (data.refreshToken) storage.setItem('_fbRefreshToken', data.refreshToken)
  return data.idToken
}

// The whole notesData object is stored as one JSON string field rather than
// decomposed into native Firestore field types — this is purely a backup
// blob, never queried/browsed in the Firestore console, so the simpler
// encoding isn't worth trading away for a recursive value converter.
export async function pushToFirebase(storage, notesData) {
  try {
    const idToken = await getIdToken(storage)
    const res = await fetch(DOC_URL, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ fields: { json: { stringValue: JSON.stringify(notesData) } } }),
    })
    if (!res.ok) throw new Error(`Firestore respondio ${res.status} al guardar`)
    recordSuccess(storage, 'push')
  } catch (err) {
    recordError(storage, err)
    throw err
  }
}

export async function pullFromFirebase(storage) {
  try {
    const idToken = await getIdToken(storage)
    const res = await fetch(DOC_URL, { headers: { Authorization: `Bearer ${idToken}` } })
    if (res.status === 404) {
      recordSuccess(storage, 'pull') // no backup yet — reachable, just empty, not an error
      return null
    }
    if (!res.ok) throw new Error(`Firestore respondio ${res.status} al leer`)
    const doc = await res.json()
    recordSuccess(storage, 'pull')
    const raw = doc.fields && doc.fields.json && doc.fields.json.stringValue
    return raw ? JSON.parse(raw) : null
  } catch (err) {
    recordError(storage, err)
    throw err
  }
}
