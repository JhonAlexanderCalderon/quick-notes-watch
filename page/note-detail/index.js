import { createWidget, widget, align, text_style, getTextLayout } from '@zos/ui'
import { getDeviceInfo } from '@zos/device'
import { back } from '@zos/router'
import { setScrollMode, SCROLL_MODE_FREE } from '@zos/page'
import { log as Logger } from '@zos/utils'
import { localStorage } from '@zos/storage'
import { onGesture, GESTURE_RIGHT } from '@zos/interaction'
import { CATEGORIES } from '../../utils/categories'
import { BG_COLOR, TEXT_COLOR, MUTED_COLOR } from '../../utils/theme'
import { enableStayAwake } from '../../utils/stay-awake'

const logger = Logger.getLogger('note-detail-page')
const { width: DEVICE_WIDTH, height: DEVICE_HEIGHT } = getDeviceInfo()
const TOP = 64
const SIDE_PAD = 20
const TEXT_W = DEVICE_WIDTH - SIDE_PAD * 2
const TITLE_BODY_GAP = 16
const BOTTOM_PAD = 30

Page({
  state: {
    note: null,
    category: null,
  },
  onInit(params) {
    logger.debug('note-detail onInit params=%s', params)
    enableStayAwake()
    // Explicit even though free-scroll is the system default — this page's
    // content can be taller than the screen (long notes), and the page
    // needs to actually scroll to reach the rest instead of just clipping
    // it at the widget boundary.
    setScrollMode({ mode: SCROLL_MODE_FREE })
    const { category, noteId } = params ? JSON.parse(params) : {}
    this.state.category = category

    const cached = getApp()._options.globalData.notesData
    const source = cached || (() => {
      const stored = localStorage.getItem('notesData', null)
      return stored ? JSON.parse(stored) : null
    })()

    const notes = (source && source[category]) || []
    this.state.note = notes.find((n) => n.id === noteId) || null

    onGesture({
      callback: (gesture) => {
        if (gesture === GESTURE_RIGHT) {
          back()
          return true
        }
        return false
      },
    })
  },
  build() {
    logger.debug('note-detail build')

    createWidget(widget.FILL_RECT, {
      x: 0, y: 0, w: DEVICE_WIDTH, h: DEVICE_HEIGHT, color: BG_COLOR,
    })

    if (!this.state.note) {
      createWidget(widget.TEXT, {
        x: 20,
        y: TOP + 40,
        w: DEVICE_WIDTH - 40,
        h: 60,
        text: 'Nota no encontrada.',
        text_size: 26,
        color: MUTED_COLOR,
        align_h: align.CENTER_H,
        text_style: text_style.WRAP,
      })
      return
    }

    const cat = CATEGORIES.find((c) => c.id === this.state.category)
    const accentColor = cat ? cat.color : TEXT_COLOR

    const title = this.state.note.title || ''
    const body = this.state.note.body || ''
    const TITLE_SIZE = 28
    const BODY_SIZE = 24

    // Size each box to what the text actually needs instead of a fixed
    // box that silently clips anything past it — this is what was cutting
    // off long titles and bodies. The page itself scrolls (see onInit) for
    // whatever ends up taller than one screen.
    const titleLayout = getTextLayout(title, { text_size: TITLE_SIZE, text_width: TEXT_W, wrapped: 1 })
    const titleH = Math.max(titleLayout.height, 36)

    createWidget(widget.TEXT, {
      x: SIDE_PAD,
      y: TOP,
      w: TEXT_W,
      h: titleH,
      text: title,
      text_size: TITLE_SIZE,
      color: accentColor,
      align_h: align.LEFT,
      text_style: text_style.WRAP,
    })

    const bodyY = TOP + titleH + TITLE_BODY_GAP
    const bodyLayout = getTextLayout(body, { text_size: BODY_SIZE, text_width: TEXT_W, wrapped: 1 })
    const bodyH = Math.max(bodyLayout.height, 1)

    createWidget(widget.TEXT, {
      x: SIDE_PAD,
      y: bodyY,
      w: TEXT_W,
      h: bodyH + BOTTOM_PAD,
      text: body,
      text_size: BODY_SIZE,
      color: TEXT_COLOR,
      align_h: align.LEFT,
      align_v: align.TOP,
      text_style: text_style.WRAP,
    })
  },
})
