import { createWidget, widget, align, text_style } from '@zos/ui'
import { getDeviceInfo } from '@zos/device'
import { push } from '@zos/router'
import { log as Logger } from '@zos/utils'
import { localStorage } from '@zos/storage'
import { CATEGORIES } from '../../utils/categories'
import { BG_COLOR, SURFACE_COLOR, SURFACE_PRESS_COLOR, MUTED_COLOR } from '../../utils/theme'

const logger = Logger.getLogger('home-page')
const { width: DEVICE_WIDTH, height: DEVICE_HEIGHT } = getDeviceInfo()

// The system status bar overlays the top ~64px of every page and eats touch
// events there too — keep all interactive content below it. It also already
// shows the app name next to the clock, so this page doesn't repeat it —
// just the one line telling you what to do here.
const TOP = 64
const SUBTITLE_H = 30

const ACCENT_W = 6
const ACCENT_GAP = 10
const SIDE_PAD = 22
const BTN_H = 74
const BTN_GAP = 16

Page({
  onInit() {
    logger.debug('home onInit')
    const { messageBuilder } = getApp()._options.globalData

    // Refresh the cached copy in the background; the menu itself doesn't
    // need the data, but priming it here means notes-list won't show a
    // blank screen while its own request is still in flight.
    messageBuilder
      .request({ method: 'GET_NOTES' })
      .then(({ result }) => {
        getApp()._options.globalData.notesData = result
        localStorage.setItem('notesData', JSON.stringify(result))
      })
      .catch(() => {
        // Phone not connected — fall back to whatever was cached last time.
        const cached = localStorage.getItem('notesData', null)
        if (cached) getApp()._options.globalData.notesData = JSON.parse(cached)
      })
  },
  build() {
    logger.debug('home build')

    createWidget(widget.FILL_RECT, {
      x: 0, y: 0, w: DEVICE_WIDTH, h: DEVICE_HEIGHT, color: BG_COLOR,
    })

    createWidget(widget.TEXT, {
      x: 0,
      y: TOP,
      w: DEVICE_WIDTH,
      h: SUBTITLE_H,
      text: 'Elige una categoria',
      text_size: 20,
      color: MUTED_COLOR,
      align_h: align.CENTER_H,
      text_style: text_style.NONE,
    })

    CATEGORIES.forEach((cat, i) => {
      const y = TOP + SUBTITLE_H + BTN_GAP + i * (BTN_H + BTN_GAP)

      createWidget(widget.FILL_RECT, {
        x: SIDE_PAD,
        y,
        w: ACCENT_W,
        h: BTN_H,
        color: cat.color,
        radius: ACCENT_W / 2,
      })

      createWidget(widget.BUTTON, {
        x: SIDE_PAD + ACCENT_W + ACCENT_GAP,
        y,
        w: DEVICE_WIDTH - (SIDE_PAD + ACCENT_W + ACCENT_GAP) - SIDE_PAD,
        h: BTN_H,
        radius: 18,
        text: cat.label,
        text_size: 26,
        normal_color: SURFACE_COLOR,
        press_color: SURFACE_PRESS_COLOR,
        click_func: () => {
          push({ url: 'page/notes-list/index', params: { category: cat.id } })
        },
      })
    })
  },
})
