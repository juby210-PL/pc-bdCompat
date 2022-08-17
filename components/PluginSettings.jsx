const { React, getModuleByDisplayName } = require('powercord/webpack')
const { Modal } = require('powercord/components/modal')
const { close: closeModal } = require('powercord/modal')
const { resolve } = require('path')

const FormTitle = getModuleByDisplayName('FormTitle', false)

let ErrorBoundary = props => props.children
try {
  ErrorBoundary = require('../../../coremods/settings/components/ErrorBoundary')
} catch (e) {
  console.error('Failed to load powercord\'s ErrorBoundary component!', e)
}

module.exports = class PluginSettings extends React.Component {
  renderPluginSettings() {
    let panel
    try {
      panel = this.props.plugin.getSettingsPanel()
    } catch (e) {
      console.error(e)

      const error = (e.stack || e.toString()).split('\n')
        .filter(l => !l.includes('discordapp.com/assets/') && !l.includes('discord.com/assets/'))
        .join('\n')
        .split(resolve(__dirname, '..', '..')).join('')

      return <div className='powercord-text powercord-settings-error'>
        <div>An error occurred while rendering settings panel.</div>
        <code>{error}</code>
      </div>
    }
    if (panel instanceof Node || typeof panel === 'string') {
      return <div ref={el => el ? panel instanceof Node ? el.append(panel) : el.innerHTML = panel : void 0}></div>
    }
    return typeof panel === 'function' ? React.createElement(panel) : panel
  }

  render () {
    const { plugin } = this.props

    return (
      <Modal size={Modal.Sizes.MEDIUM}>
        <Modal.Header>
          <FormTitle tag={FormTitle.Tags.H4}>{plugin.getName()} Settings</FormTitle>
          <Modal.CloseButton onClick={closeModal}/>
        </Modal.Header>
        <Modal.Content>
          <div className='plugin-settings' id={'plugin-settings-' + plugin.getName()}>
            <ErrorBoundary>{this.renderPluginSettings()}</ErrorBoundary>
          </div>
        </Modal.Content>
      </Modal>
    )
  }
}
