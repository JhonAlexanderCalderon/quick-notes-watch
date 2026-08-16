import './shared/device-polyfill'
import { MessageBuilder } from './shared/message'
import { getPackageInfo } from '@zos/app'
import { log as Logger } from '@zos/utils'
import * as ble from '@zos/ble'

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
  },

  onDestroy() {
    logger.log('app onDestroy invoked')
    this.globalData.messageBuilder && this.globalData.messageBuilder.disConnect()
  },
})
