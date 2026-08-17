import { createWidget, widget } from '@zos/ui'
import { push, back } from '@zos/router'
import { log as Logger } from '@zos/utils'
import { localStorage } from '@zos/storage'
import { onGesture, GESTURE_RIGHT } from '@zos/interaction'
import { CATEGORIES } from '../../utils/categories'
import { BG_COLOR } from '../../utils/theme'
import { titleTextStyle, EMPTY_TEXT_STYLE, scrollListStyle, DEVICE_WIDTH, DEVICE_HEIGHT } from './index.style'
import { enableStayAwake } from '../../utils/stay-awake'

const logger = Logger.getLogger('notes-list-page')

Page({
  state: {
    category: null,
    notes: [],
    titleWidget: null,
    listWidget: null,
    emptyWidget: null,
  },
  onInit(params) {
    logger.debug('notes-list onInit params=%s', params)
    enableStayAwake()
    const { category } = params ? JSON.parse(params) : {}
    this.state.category = category

    const cached = getApp()._options.globalData.notesData
    if (cached) {
      this.state.notes = cached[category] || []
    } else {
      const stored = localStorage.getItem('notesData', null)
      this.state.notes = stored ? JSON.parse(stored)[category] || [] : []
    }

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
    logger.debug('notes-list build, %d notes', this.state.notes.length)
    const cat = CATEGORIES.find((c) => c.id === this.state.category)
    const accentColor = cat ? cat.color : 0xffffff

    createWidget(widget.FILL_RECT, {
      x: 0, y: 0, w: DEVICE_WIDTH, h: DEVICE_HEIGHT, color: BG_COLOR,
    })

    this.state.titleWidget = createWidget(widget.TEXT, {
      ...titleTextStyle(accentColor),
      text: cat ? cat.label : '',
    })

    if (this.state.notes.length === 0) {
      this.state.emptyWidget = createWidget(widget.TEXT, EMPTY_TEXT_STYLE)
      return
    }

    this.state.listWidget = createWidget(widget.SCROLL_LIST, {
      ...scrollListStyle(accentColor),
      data_array: this.state.notes,
      data_count: this.state.notes.length,
      data_type_config: [{ start: 0, end: this.state.notes.length, type_id: 1 }],
      data_type_config_count: 1,
      on_page: 1,
      item_click_func: (list, index) => {
        const note = this.state.notes[index]
        push({
          url: 'page/note-detail/index',
          params: { category: this.state.category, noteId: note.id },
        })
      },
    })
  },
})
