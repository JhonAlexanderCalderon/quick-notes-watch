import { align, text_style } from '@zos/ui'
import { getDeviceInfo } from '@zos/device'
import { MUTED_COLOR, SURFACE_COLOR } from '../../utils/theme'

export const { width: DEVICE_WIDTH, height: DEVICE_HEIGHT } = getDeviceInfo()

export const TOP = 64

export function titleTextStyle(accentColor) {
  return {
    x: 0,
    y: TOP,
    w: DEVICE_WIDTH,
    h: 36,
    text_size: 24,
    color: accentColor,
    align_h: align.CENTER_H,
    text_style: text_style.NONE,
  }
}

export const EMPTY_TEXT_STYLE = {
  x: 20,
  y: TOP + 50,
  w: DEVICE_WIDTH - 40,
  h: DEVICE_HEIGHT - TOP - 60,
  text: 'Sin notas todavia.\nAgregalas desde el telefono.',
  text_size: 24,
  color: MUTED_COLOR,
  align_h: align.CENTER_H,
  align_v: align.CENTER_V,
  text_style: text_style.WRAP,
}

export function scrollListStyle(accentColor) {
  return {
    x: 16,
    y: TOP + 46,
    w: DEVICE_WIDTH - 32,
    h: DEVICE_HEIGHT - TOP - 56,
    item_height: 70,
    item_space: 10,
    item_config: [
      {
        type_id: 1,
        item_bg_color: SURFACE_COLOR,
        item_bg_radius: 16,
        text_view: [
          {
            x: 24,
            y: 0,
            w: DEVICE_WIDTH - 32 - 48,
            h: 70,
            key: 'title',
            color: accentColor,
            text_size: 25,
            align_h: align.LEFT,
            align_v: align.CENTER_V,
          },
        ],
        text_view_count: 1,
        item_height: 70,
      },
    ],
    item_config_count: 1,
  }
}
