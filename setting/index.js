import { CATEGORIES, emptyNotesData } from '../utils/categories'
import { pullFromFirebase } from '../utils/firestore-sync'

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

      const deleteControls = isPending
        ? View(
            { style: { display: 'flex', flexDirection: 'row', marginTop: '6px' } },
            [
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

    // No confirmed static-text component in this UI library (only View /
    // Button / TextInput are documented) — skip an empty-state message
    // rather than guess at an unverified API; "+ Agregar nota" is visible
    // and self-explanatory either way.
    return View({ style: { padding: '14px 16px' } }, [tabs, addButton, ...noteItems])
  },
})
