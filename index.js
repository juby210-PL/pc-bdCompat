'use strict'

const { Plugin } = require('powercord/entities')
const process = require('process')

const { AddonAPI, BDApi, BDV2, ContentManager, PluginManager } = require('./modules')
const Settings = require('./components/Settings')

module.exports = class BDCompat extends Plugin {
  startPlugin () {
    this.loadStylesheet('style.css')
    this.defineGlobals()

    powercord.api.settings.registerSettings('bdCompat', {
      category: 'bdCompat',
      label: 'BetterDiscord Plugins',
      render: Settings
    });
  }

  pluginWillUnload () {
    powercord.api.settings.unregisterSettings('bdCompat') 
    if (window.pluginModule) window.pluginModule.destroy()
    if (window.ContentManager) window.ContentManager.destroy()
    this.destroyGlobals()
  }

  defineGlobals () {
    window.bdConfig = { dataPath: __dirname }
    window.settingsCookie = {}

    window.bdplugins = {}
    window.pluginCookie = {}
    window.bdpluginErrors = []

    window.bdthemes = {}
    window.themeCookie = {}
    window.bdthemeErrors = []

    // window.BdApi = BDApi

    // Orignally BdApi is an object, not a class
    window.BdApi = {}
    Object.getOwnPropertyNames(BDApi).filter(m => typeof BDApi[m] == 'function' || typeof BDApi[m] == 'object').forEach(m => {
      window.BdApi[m] = BDApi[m]
    })
    window.Utils = { monkeyPatch: BDApi.monkeyPatch, suppressErrors: BDApi.suppressErrors, escapeID: BDApi.escapeID }

    window.BDV2 = BDV2
    window.ContentManager = new ContentManager
    window.pluginModule   = new PluginManager(window.ContentManager.pluginsFolder, this.settings)

    // DevilBro's plugins checks whether or not it's running on ED
    // This isn't BetterDiscord, so we'd be better off doing this.
    // eslint-disable-next-line no-process-env
    process.env.injDir = __dirname

    window.BdApi.Plugins = new AddonAPI(window.bdplugins, window.pluginModule)
    window.BdApi.Themes  = new AddonAPI({}, {})

    this.log('Defined BetterDiscord globals')
  }

  destroyGlobals () {
    const globals = ['bdConfig', 'settingsCookie', 'bdplugins', 'pluginCookie', 'bdpluginErrors', 'bdthemes',
      'themeCookie', 'bdthemeErrors', 'BdApi', 'Utils', 'BDV2', 'ContentManager', 'pluginModule']

    globals.forEach(g => {
      delete window[g]
    })

    // eslint-disable-next-line no-process-env
    delete process.env.injDir

    this.log('Destroyed BetterDiscord globals')
  }
}
