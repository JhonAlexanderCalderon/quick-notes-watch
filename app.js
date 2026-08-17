import './shared/device-polyfill'
import { MessageBuilder } from './shared/message'
import { getPackageInfo } from '@zos/app'
import { log as Logger } from '@zos/utils'
import * as ble from '@zos/ble'
import { enableStayAwake, disableStayAwake } from './utils/stay-awake'

const logger = Logger.getLogger('quick-notes-app')

App({
  globalData: {
    messageBuilder: null,
    notesData: null,
  },
  onCreate() {
    logger.log('app onCreate invoked')
    const { appId } = getPackageInfo()
    const messageBuilder = new MessageBuilder({ appId, appDevicePort: 20, appSidePort: 0, ble })
    this.globalData.messageBuilder = messageBuilder
    messageBuilder.connect()
    // Screen stays on for as long as the app is open (re-armed per-page in
    // each page's onInit too) — only reset here, at true app exit, not on
    // every internal page pop/push.
    enableStayAwake()
  },

  onDestroy() {
    logger.log('app onDestroy invoked')
    this.globalData.messageBuilder && this.globalData.messageBuilder.disConnect()
    disableStayAwake()
  },
})
