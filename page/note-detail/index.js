import { createWidget, widget, align, text_style } from '@zos/ui'
import { getDeviceInfo } from '@zos/device'
import { back } from '@zos/router'
import { log as Logger } from '@zos/utils'
import { localStorage } from '@zos/storage'
import { onGesture, GESTURE_RIGHT } from '@zos/interaction'
import { CATEGORIES } from '../../utils/categories'
import { BG_COLOR, TEXT_COLOR, MUTED_COLOR } from '../../utils/theme'
import { enableStayAwake } from '../../utils/stay-awake'

const logger = Logger.getLogger('note-detail-page')
const { width: DEVICE_WIDTH, height: DEVICE_HEIGHT } = getDeviceInfo()
const TOP = 64

Page({
  state: {
    note: null,
    category: null,
  },
  onInit(params) {
    logger.debug('note-detail onInit params=%s', params)
    enableStayAwake()
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

    createWidget(widget.TEXT, {
      x: 20,
      y: TOP,
      w: DEVICE_WIDTH - 40,
      h: 60,
      text: this.state.note.title,
      text_size: 28,
      color: accentColor,
      align_h: align.LEFT,
      text_style: text_style.WRAP,
    })

    createWidget(widget.TEXT, {
      x: 20,
      y: TOP + 64,
      w: DEVICE_WIDTH - 40,
      h: DEVICE_HEIGHT - TOP - 74,
      text: this.state.note.body || '',
      text_size: 24,
      color: TEXT_COLOR,
      align_h: align.LEFT,
      align_v: align.TOP,
      text_style: text_style.WRAP,
    })
  },
})
