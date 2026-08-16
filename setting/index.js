import { CATEGORIES, emptyNotesData } from '../utils/categories'
import { pullFromFirebase, pushToFirebase, getSyncStatus } from '../utils/firestore-sync'

function genId() {
  return 'n' + Date.now() + Math.floor(Math.random() * 1000)
}

// Fires once per time this settings screen is opened (module state resets
// with it) — pulls whatever's newest in Firestore, which is how an edit
// made from the PWA actually shows up here instead of only ever flowing
// phone/watch -> Firebase.
let hasPulledFromFirebase = false

AppSettingsPage({
  state: {
    activeCategory: CATEGORIES[0].id,
    data: emptyNotesData(),
    pendingDeleteId: '',
    syncStatus: { lastSyncAt: '', lastSyncDirection: '', lastError: '' },
    syncing: false,
    props: {},
  },

  // The settings page only re-renders when settingsStorage itself changes
  // (per Zepp OS docs — plain `this.state` mutations don't trigger a
  // rebuild on their own), so even UI-only concerns like "which category
  // tab is active" or "which note's delete is armed" have to round-trip
  // through storage to actually redraw.
  setState(props) {
    this.state.props = props
    const rawData = props.settingsStorage.getItem('notesData')
    this.state.data = rawData ? JSON.parse(rawData) : emptyNotesData()
    this.state.activeCategory = props.settingsStorage.getItem('activeCategory') || CATEGORIES[0].id
    this.state.pendingDeleteId = props.settingsStorage.getItem('pendingDeleteId') || ''
    this.state.syncStatus = getSyncStatus(props.settingsStorage)
    this.state.syncing = props.settingsStorage.getItem('_fbSyncing') === '1'
  },

  saveData() {
    this.state.props.settingsStorage.setItem('notesData', JSON.stringify(this.state.data))
  },

  setActiveCategory(id) {
    // Switching tabs cancels any armed delete rather than leaving it
    // dangling for a note the user can no longer see.
    this.state.props.settingsStorage.setItem('pendingDeleteId', '')
    this.state.props.settingsStorage.setItem('activeCategory', id)
  },

  addNote() {
    this.state.data[this.state.activeCategory].push({ id: genId(), title: 'Nueva nota', body: '' })
    this.saveData()
  },

  updateTitle(id, val) {
    const note = this.state.data[this.state.activeCategory].find((n) => n.id === id)
    if (note) note.title = val
    this.saveData()
  },

  updateBody(id, val) {
    const note = this.state.data[this.state.activeCategory].find((n) => n.id === id)
    if (note) note.body = val
    this.saveData()
  },

  // Deleting is a two-tap action: the first tap on "Borrar" arms it and the
  // label switches to a hard-to-mistake "Si, borrar" — the actual delete
  // only happens on that second, deliberate tap. This is personal data
  // (passwords, IDs), so a single accidental tap should never lose it.
  armDelete(id) {
    this.state.props.settingsStorage.setItem('pendingDeleteId', id)
  },

  cancelDelete() {
    this.state.props.settingsStorage.setItem('pendingDeleteId', '')
  },

  confirmDelete(id) {
    this.state.data[this.state.activeCategory] = this.state.data[this.state.activeCategory].filter(
      (n) => n.id !== id
    )
    this.state.props.settingsStorage.setItem('pendingDeleteId', '')
    this.saveData()
  },

  // Manual health check: attempts both directions against Firestore so a
  // failure here means the connection itself is the problem, not just one
  // particular request. Success/failure gets written by firestore-sync
  // into settingsStorage (_fbLastSyncAt / _fbLastError), which setState
  // reads back on the rebuild this triggers — that's what the diagnostics
  // panel below actually displays.
  async syncNow() {
    const storage = this.state.props.settingsStorage
    storage.setItem('_fbSyncing', '1')
    try {
      const cloud = await pullFromFirebase(storage)
      if (cloud) storage.setItem('notesData', JSON.stringify(cloud))
      await pushToFirebase(storage, JSON.parse(storage.getItem('notesData') || '{}'))
    } catch (e) {
      // Already recorded in _fbLastError by firestore-sync.
    } finally {
      storage.setItem('_fbSyncing', '')
    }
  },

  build(props) {
    this.setState(props)

    if (!hasPulledFromFirebase) {
      hasPulledFromFirebase = true
      pullFromFirebase(props.settingsStorage)
        .then((cloud) => {
          if (cloud) props.settingsStorage.setItem('notesData', JSON.stringify(cloud))
        })
        .catch(() => {})
    }

    const activeId = this.state.activeCategory
    const notes = this.state.data[activeId] || []

    const tabs = View(
      { style: { display: 'flex', flexDirection: 'row', marginBottom: '14px' } },
      CATEGORIES.map((cat) =>
        Button({
          label: cat.label,
          style: {
            flex: 1,
            fontSize: '11px',
            lineHeight: '32px',
            borderRadius: '20px',
            margin: '0 3px',
            textAlign: 'center',
            background: activeId === cat.id ? '#722F37' : '#eeeeee',
            color: activeId === cat.id ? 'white' : '#333333',
          },
          onClick: () => this.setActiveCategory(cat.id),
        })
      )
    )

    const addButton = Button({
      label: '+ Agregar nota',
      style: {
        fontSize: '13px',
        lineHeight: '34px',
        borderRadius: '20px',
        background: '#409EFF',
        color: 'white',
        textAlign: 'center',
        marginBottom: '12px',
      },
      onClick: () => this.addNote(),
    })

    const noteItems = notes.map((note) => {
      const isPending = this.state.pendingDeleteId === note.id

      // Cancelar sits where "Borrar" used to be (the position the user's
      // thumb naturally lands on right after arming it) and "Si, borrar"
      // sits on the opposite side — confirming a delete has to be a
      // deliberate reach to a different spot, not a reflexive double-tap
      // in the same place.
      const deleteControls = isPending
        ? View(
            { style: { display: 'flex', flexDirection: 'row', marginTop: '6px' } },
            [
              Button({
                label: 'Cancelar',
                style: {
                  flex: 1,
                  fontSize: '12px',
                  lineHeight: '28px',
                  borderRadius: '20px',
                  background: '#eeeeee',
                  color: '#333333',
                  textAlign: 'center',
                  margin: '0 3px',
                },
                onClick: () => this.cancelDelete(),
              }),
              Button({
                label: 'Si, borrar',
                style: {
                  flex: 1,
                  fontSize: '12px',
                  lineHeight: '28px',
                  borderRadius: '20px',
                  background: '#B91C1C',
                  color: 'white',
                  textAlign: 'center',
                  margin: '0 3px',
                },
                onClick: () => this.confirmDelete(note.id),
              }),
            ]
          )
        : Button({
            label: 'Borrar',
            style: {
              fontSize: '12px',
              lineHeight: '28px',
              borderRadius: '20px',
              background: '#D85E33',
              color: 'white',
              textAlign: 'center',
              marginTop: '6px',
            },
            onClick: () => this.armDelete(note.id),
          })

      return View(
        {
          style: {
            border: isPending ? '1px solid #B91C1C' : '1px solid #eaeaea',
            borderRadius: '8px',
            padding: '8px',
            marginBottom: '10px',
            backgroundColor: 'white',
          },
        },
        [
          TextInput({
            label: 'Titulo',
            value: note.title,
            bold: true,
            maxLength: 60,
            onChange: (val) => this.updateTitle(note.id, val),
          }),
          TextInput({
            label: 'Detalle',
            value: note.body,
            maxLength: 500,
            onChange: (val) => this.updateBody(note.id, val),
          }),
          deleteControls,
        ]
      )
    })

    const status = this.state.syncStatus
    const lastSyncText = status.lastSyncAt
      ? `Ultima conexion ok: ${new Date(status.lastSyncAt).toLocaleString()}`
      : 'Todavia no se conecto con la nube'

    const diagnostics = View(
      {
        style: {
          border: '1px solid ' + (status.lastError ? '#FCA5A5' : '#DCFCE7'),
          borderRadius: '8px',
          padding: '10px',
          marginTop: '18px',
          backgroundColor: status.lastError ? '#FEF2F2' : '#F0FDF4',
        },
      },
      [
        Text({ bold: true, style: { fontSize: '12px', color: '#333333' } }, 'Conexion con la nube (respaldo)'),
        Text({ style: { fontSize: '11px', color: '#555555', marginTop: '4px' } }, lastSyncText),
        status.lastError &&
          Text(
            { style: { fontSize: '11px', color: '#B91C1C', marginTop: '4px' } },
            `Ultimo error: ${status.lastError}`
          ),
        Button({
          label: this.state.syncing ? 'Sincronizando...' : 'Sincronizar ahora',
          style: {
            fontSize: '12px',
            lineHeight: '28px',
            borderRadius: '20px',
            background: '#409EFF',
            color: 'white',
            textAlign: 'center',
            marginTop: '8px',
          },
          onClick: () => this.syncNow(),
        }),
        Text(
          {
            style: { fontSize: '10px', color: '#888888', marginTop: '8px' },
          },
          'Esta app se conecta a la nube de forma automatica, sin pedirte iniciar sesion con Google en el reloj ni el telefono. Si el error persiste: revisa que el telefono tenga internet, cerra esta pantalla de Ajustes y volvela a abrir, y proba "Sincronizar ahora" de nuevo. Tus notas siguen disponibles localmente aunque la nube no responda.'
        ),
      ]
    )

    return View({ style: { padding: '14px 16px' } }, [tabs, addButton, ...noteItems, diagnostics])
  },
})
