import { FIREBASE_CONFIG } from './firebase-config'

const DOC_URL = `https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/(default)/documents/notes/data`

// Takes a `storage` object (getItem/setItem) explicitly rather than
// reaching for a bare `settings` global, because the two callers of this
// module run in different Zepp OS contexts with different conventions:
// app-side (Side Service) exposes a bare `settings` global, but the
// Settings Page only gets storage via its `build(props)` parameter
// (`props.settingsStorage`) — there's no bare `settings` there.

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
  if (data.refreshToken) storage.setItem('_fbRefreshToken', data.refreshToken)
  return data.idToken
}

// The whole notesData object is stored as one JSON string field rather than
// decomposed into native Firestore field types — this is purely a backup
// blob, never queried/browsed in the Firestore console, so the simpler
// encoding isn't worth trading away for a recursive value converter.
export async function pushToFirebase(storage, notesData) {
  const idToken = await getIdToken(storage)
  await fetch(DOC_URL, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ fields: { json: { stringValue: JSON.stringify(notesData) } } }),
  })
}

export async function pullFromFirebase(storage) {
  const idToken = await getIdToken(storage)
  const res = await fetch(DOC_URL, { headers: { Authorization: `Bearer ${idToken}` } })
  if (res.status !== 200) return null
  const doc = await res.json()
  const raw = doc.fields && doc.fields.json && doc.fields.json.stringValue
  return raw ? JSON.parse(raw) : null
}
