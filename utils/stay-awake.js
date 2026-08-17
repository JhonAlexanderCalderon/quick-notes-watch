import {
  setPageBrightTime,
  pauseDropWristScreenOff,
  pausePalmScreenOff,
  resetDropWristScreenOff,
  resetPalmScreenOff,
} from '@zos/display'

// Finite (not indefinite/0) per the device's own known-issue notes — an
// indefinite suspension that's never reset was implicated in a real
// stuck-vibrator bug on another app on this exact watch. Re-armed from
// every page's onInit, so browsing through several notes keeps extending
// the window instead of hitting a hard ceiling mid-read.
const STAY_AWAKE_MS = 900000

export function enableStayAwake() {
  setPageBrightTime({ brightTime: STAY_AWAKE_MS })
  pauseDropWristScreenOff({ duration: STAY_AWAKE_MS })
  pausePalmScreenOff({ duration: STAY_AWAKE_MS })
}

export function disableStayAwake() {
  resetDropWristScreenOff()
  resetPalmScreenOff()
}
