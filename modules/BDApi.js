'use strict'

const path = require('path')
const fs = require('fs')
const crypto = require('crypto')

const { React, ReactDOM } = require('powercord/webpack')
const { getModule, getAllModules } = require('powercord/webpack')
const { getOwnerInstance, getReactInstance } = require('powercord/util')
const { inject, uninject } = require('powercord/injector')

const PluginData = {}


// __ is not part of BdApi entirely
// _ is part of BD but not exactly in BdApi, but kept here anyway for easier maintain

class BdApi {
  // React
  static get React () {
    return React
  }
  static get ReactDOM () {
    return ReactDOM
  }


  // General
  static getCore () {
    return null
  }
  static escapeID (id) {
    return id.replace(/^[^a-z]+|[^\w-]+/giu, '')
  }

  static suppressErrors (method, message = '') {
    return (...params) => {
      try {
        return method(...params)
      } catch (err) {
        BdApi.__error(err, `Error occured in ${message}`)
      }
    }
  }

  static testJSON (data) {
    try {
      JSON.parse(data)

      return true
    } catch (err) {
      return false
    }
  }


  // Style tag
  static get __styleParent () {
    return BdApi.__elemParent('style')
  }
  // fake settings
  static get settings() {
    return {"Automatic Loading": true}
  }
  static injectCSS (id, css) {
    const style = document.createElement('style')

    style.id = `bd-style-${BdApi.escapeID(id)}`
    style.innerHTML = css

    BdApi.__styleParent.append(style)
  }

  static clearCSS (id) {
    const elem = document.getElementById(`bd-style-${BdApi.escapeID(id)}`)
    if (elem) elem.remove()
  }


  // Script tag
  static get __scriptParent () {
    return BdApi.__elemParent('script')
  }

  static linkJS (id, url) {
    return new Promise((resolve) => {
      const script = document.createElement('script')

      script.id = `bd-script-${BdApi.escapeID(id)}`
      script.src = url
      script.type = 'text/javascript'
      script.onload = resolve

      BdApi.__scriptParent.append(script)
    })
  }

  static unlinkJS (id) {
    const elem = document.getElementById(`bd-script-${BdApi.escapeID(id)}`)
    if (elem) elem.remove()
  }


  // Plugin data
  static get __pluginData () {
    return PluginData
  }

  static __getPluginConfigPath (pluginName) {
    return path.join(__dirname, '..', 'config', pluginName + '.config.json')
  }

  static __getPluginConfig (pluginName) {
    const configPath = BdApi.__getPluginConfigPath(pluginName)

    if (typeof BdApi.__pluginData[pluginName] === 'undefined')
      if (!fs.existsSync(configPath)) {
        BdApi.__pluginData[pluginName] = {}
      } else {
        try {
          BdApi.__pluginData[pluginName] = JSON.parse(fs.readFileSync(configPath))
        } catch (e) {
          BdApi.__pluginData[pluginName] = {}
          BdApi.__warn(`${pluginName} has corrupted or empty config file, loaded as {}`)
        }
      }


    return BdApi.__pluginData[pluginName]
  }

  static __savePluginConfig (pluginName) {
    const configPath = BdApi.__getPluginConfigPath(pluginName)
    const configFolder = path.join(__dirname, '..', 'config/')

    if (!fs.existsSync(configFolder)) fs.mkdirSync(configFolder)
    fs.writeFileSync(configPath, JSON.stringify(BdApi.__pluginData[pluginName], null, 2))
  }


  static loadData (pluginName, key) {
    const config = BdApi.__getPluginConfig(pluginName)

    return config[key]
  }

  static get getData () {
    return BdApi.loadData
  }


  static saveData (pluginName, key, value) {
    if (typeof value === 'undefined') return

    const config = BdApi.__getPluginConfig(pluginName)

    config[key] = value

    BdApi.__savePluginConfig(pluginName)
  }

  static get setData () {
    return BdApi.saveData
  }

  static deleteData (pluginName, key) {
    const config = BdApi.__getPluginConfig(pluginName)

    if (typeof config[key] === 'undefined') return
    delete config[key]

    BdApi.__savePluginConfig(pluginName)
  }


  // Plugin communication
  static getPlugin (name) {
    if (window.bdplugins[name]) return window.bdplugins[name].plugin
  }


  // Alerts and toasts
  static async alert (title, body) {
    const ModalStack = await getModule(['push', 'update', 'pop', 'popWithKey'])
    const AlertModal = await getModule((module) => module.prototype &&
      module.prototype.handleCancel && module.prototype.handleSubmit && module.prototype.handleMinorConfirm)

    ModalStack.push((props) => BdApi.React.createElement(AlertModal, { title, body, ...props }))
  }

  static showToast (content, options = {}) {
    const { type = '', icon = true, timeout = 3000 } = options

    const toastElem = document.createElement('div')
    toastElem.classList.add('bd-toast')
    toastElem.innerText = content

    if (type) toastElem.classList.add(`toast-${type}`)
    if (type && icon) toastElem.classList.add('icon')

    const toastWrapper = BdApi.__createToastWrapper()
    toastWrapper.appendChild(toastElem)

    setTimeout(() => {
      toastElem.classList.add('closing')

      setTimeout(() => {
        toastElem.remove()
        if (!document.querySelectorAll('.bd-toasts .bd-toast').length) toastWrapper.remove()
      }, 300)
    }, timeout)
  }

  static __createToastWrapper () {
    const toastWrapperElem = document.querySelector('.bd-toasts')

    if (!toastWrapperElem) {
      const DiscordElements = {
        settings: '.contentColumn-2hrIYH, .customColumn-Rb6toI',
        chat: '.chat-3bRxxu form',
        friends: '.container-3gCOGc',
        serverDiscovery: '.pageWrapper-1PgVDX',
        applicationStore: '.applicationStore-1pNvnv',
        gameLibrary: '.gameLibrary-TTDw4Y',
        activityFeed: '.activityFeed-28jde9',
      }

      const boundingElement = document.querySelector(Object.keys(DiscordElements).map((component) => DiscordElements[component]).join(', '))

      const toastWrapper = document.createElement('div')
      toastWrapper.classList.add('bd-toasts')
      toastWrapper.style.setProperty('width', boundingElement ? boundingElement.offsetWidth + 'px' : '100%')
      toastWrapper.style.setProperty('left', boundingElement ? boundingElement.getBoundingClientRect().left + 'px' : '0px')
      toastWrapper.style.setProperty(
        'bottom',
        (document.querySelector(DiscordElements.chat) ? document.querySelector(DiscordElements.chat).offsetHeight + 20 : 80) + 'px'
      )

      document.querySelector('#app-mount > div[class^="app-"]').appendChild(toastWrapper)

      return toastWrapper
    }

    return toastWrapperElem
  }


  // Discord's internals manipulation and such
  static onRemoved (node, callback) {
    const observer = new MutationObserver((mutations) => {
      for (const mut in mutations) {
        const mutation = mutations[mut]
        const nodes = Array.from(mutation.removedNodes)

        const directMatch = nodes.indexOf(node) > -1
        const parentMatch = nodes.some((parent) => parent.contains(node))

        if (directMatch || parentMatch) {
          observer.disconnect()

          return callback()
        }
      }
    })

    observer.observe(document.body, { subtree: true, childList: true })
  }

  static getInternalInstance (node) {
    if (!(node instanceof window.jQuery) && !(node instanceof Element)) return undefined // eslint-disable-line no-undefined
    if (node instanceof window.jQuery) node = node[0] // eslint-disable-line no-param-reassign

    return getOwnerInstance(node)
  }

  static findModule (filter) {
    return getModule(filter, false)
  }

  static findAllModules (filter) {
    return getAllModules(filter)
  }

  static findModuleByProps (...props) {
    return BdApi.findModule((module) => props.every((prop) => typeof module[prop] !== 'undefined'))
  }

  static findModuleByDisplayName (displayName) {
    return BdApi.findModule((module) => module.displayName === displayName)
  }

  static monkeyPatch (what, methodName, options = {}) {
    const displayName = options.displayName ||
      what.displayName || what.name || what.constructor.displayName || what.constructor.name ||
      'MissingName'

    // if (options.instead) return BdApi.__warn('Powercord API currently does not support replacing the entire method!')

    if (!what[methodName])
      if (options.force) {
        // eslint-disable-next-line no-empty-function
        what[methodName] = function forcedFunction () {}
      } else {
        return BdApi.__error(null, `${methodName} doesn't exist in ${displayName}!`)
      }


    if (!options.silent)
      BdApi.__log(`Patching ${displayName}'s ${methodName} method`)

    const origMethod = what[methodName]

    if (options.instead) {
      const cancel = () => {
        if (!options.silent) BdApi.__log(`Unpatching instead of ${displayName} ${methodName}`)
        what[methodName] = origMethod
      }
      what[methodName] = function() {
        const data = {
          thisObject: this,
          methodArguments: arguments,
          cancelPatch: cancel,
          originalMethod: origMethod,
          callOriginalMethod: () => data.returnValue = data.originalMethod.apply(data.thisObject, data.methodArguments)
        }
        const tempRet = BdApi.suppressErrors(options.instead, "`instead` callback of " + what[methodName].displayName)(data)
        if (tempRet !== undefined) data.returnValue = tempRet
        return data.returnValue
      }
      return cancel
    }
  

    const patches = []
    if (options.before) patches.push(BdApi.__injectBefore({ what, methodName, options, displayName }, origMethod))
    if (options.after) patches.push(BdApi.__injectAfter({ what, methodName, options, displayName }, origMethod))

    const finalCancelPatch = () => patches.forEach((patch) => patch())

    return finalCancelPatch
  }

  static __injectBefore (data, origMethod) {
    const patchID = `bd-patch-before-${data.displayName.toLowerCase()}-${crypto.randomBytes(4).toString('hex')}`

    const cancelPatch = () => {
      if (!data.options.silent) BdApi.__log(`Unpatching before of ${data.displayName} ${data.methodName}`)
      uninject(patchID)
    }

    inject(patchID, data.what, data.methodName, function beforePatch (args, res) {
      const patchData = {
        // eslint-disable-next-line no-invalid-this
        thisObject: this,
        methodArguments: args,
        returnValue: res,
        cancelPatch: cancelPatch,
        originalMethod: origMethod,
        callOriginalMethod: () => patchData.returnValue = patchData.originalMethod.apply(patchData.thisObject, patchData.methodArguments)
      }

      try {
        data.options.before(patchData)
      } catch (err) {
        BdApi.__error(err, `Error in before callback of ${data.displayName} ${data.methodName}`)
      }

      if (data.options.once) cancelPatch()

      return patchData.methodArguments
    }, true)

    return cancelPatch
  }

  static __injectAfter (data, origMethod) {
    const patchID = `bd-patch-after-${data.displayName.toLowerCase()}-${crypto.randomBytes(4).toString('hex')}`

    const cancelPatch = () => {
      if (!data.options.silent) BdApi.__log(`Unpatching after of ${data.displayName} ${data.methodName}`)
      uninject(patchID)
    }

    inject(patchID, data.what, data.methodName, function afterPatch (args, res) {
      const patchData = {
        // eslint-disable-next-line no-invalid-this
        thisObject: this,
        methodArguments: args,
        returnValue: res,
        cancelPatch: cancelPatch,
        originalMethod: origMethod,
        callOriginalMethod: () => patchData.returnValue = patchData.originalMethod.apply(patchData.thisObject, patchData.methodArguments)
      }

      try {
        data.options.after(patchData)
      } catch (err) {
        BdApi.__error(err, `Error in after callback of ${data.displayName} ${data.methodName}`)
      }

      if (data.options.once) cancelPatch()

      return patchData.returnValue
    }, false)

    return cancelPatch
  }

  static getInternalInstance (node) {
    if (!(node instanceof window.jQuery) && !(node instanceof Element)) return undefined
    if (node instanceof window.jQuery) node = node[0]
    return getReactInstance(node)
  }

  static isSettingEnabled(e) {
    return !!settingsCookie[e]
  }

  static isPluginEnabled (name) {
    const plugin = bdplugins[name]
    return plugin ? plugin.__started : false
  }

  static isThemeEnabled () {
    return false
  }

  // Miscellaneous, things that aren't part of BD
  static __elemParent (id) {
    const elem = document.getElementsByTagName(`bd-${id}`)[0]
    if (elem) return elem

    const newElem = document.createElement(`bd-${id}`)
    document.head.append(newElem)

    return newElem
  }

  static __log (...message) {
    console.log('%c[BDCompat:BdApi]', 'color: #3a71c1;', ...message)
  }

  static __warn (...message) {
    console.log('%c[BDCompat:BdApi]', 'color: #e8a400;', ...message)
  }

  static __error (error, ...message) {
    console.log('%c[BDCompat:BdApi]', 'color: red;', ...message)

    if (error) {
      console.groupCollapsed(`%cError: ${error.message}`, 'color: red;')
      console.error(error.stack)
      console.groupEnd()
    }
  }
}

module.exports = BdApi
