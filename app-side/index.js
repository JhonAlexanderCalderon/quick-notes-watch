import { MessageBuilder } from '../shared/message-side'
import { emptyNotesData } from '../utils/categories'
import { pushToFirebase, pullFromFirebase } from '../utils/firestore-sync'

const messageBuilder = new MessageBuilder()

function getNotesData() {
  const raw = settings.settingsStorage.getItem('notesData')
  return raw ? JSON.parse(raw) : emptyNotesData()
}

AppSideService({
  async onInit() {
    messageBuilder.listen(() => {})

    // Recovery path: if there's no local copy yet (fresh install, or data
    // lost some other way), try restoring from the Firebase backup before
    // anything else reads/writes notesData.
    if (!settings.settingsStorage.getItem('notesData')) {
      try {
        const backup = await pullFromFirebase(settings.settingsStorage)
        if (backup) settings.settingsStorage.setItem('notesData', JSON.stringify(backup))
      } catch (e) {
        // No connectivity or no backup yet — fine, getNotesData() falls
        // back to an empty structure below.
      }
    }

    // Push fresh data to the watch immediately whenever it's edited on the
    // phone (only reaches the watch if it's connected right now — the watch
    // also pulls on its own via GET_NOTES whenever the app is opened, so a
    // missed push here isn't a lost update, just a delayed one). Also back
    // it up to Firebase on the same change, ignoring the unrelated
    // "activeCategory" UI-state key and the internal auth token key.
    settings.settingsStorage.addListener('change', ({ key }) => {
      if (key !== 'notesData') return
      const data = getNotesData()
      messageBuilder.call(data)
      pushToFirebase(settings.settingsStorage, data).catch(() => {})
    })

    // Pull the latest before answering the watch — this is what makes an
    // edit made from the PWA (which writes straight to Firestore, with no
    // way to push to a phone/watch that isn't listening) actually show up
    // once you next open the app on the watch. Push is real-time-ish
    // (fires on local edits); this pull is the other half, checked
    // whenever the watch asks.
    messageBuilder.on('request', async (ctx) => {
      const payload = messageBuilder.buf2Json(ctx.request.payload)
      if (payload.method === 'GET_NOTES') {
        try {
          const cloud = await pullFromFirebase(settings.settingsStorage)
          if (cloud) settings.settingsStorage.setItem('notesData', JSON.stringify(cloud))
        } catch (e) {
          // Offline — fall back to whatever's cached locally.
        }
        ctx.response({ data: { result: getNotesData() } })
      }
    })
  },

  onRun() {},
  onDestroy() {},
})
