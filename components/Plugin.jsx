'use strict'

const { shell: { openExternal } } = require('electron')

const { React, i18n: { Messages } }  = require('powercord/webpack')
const { Tooltip, Switch, Button, Card, Divider } = require('powercord/components')
const { open: openModal } = require('powercord/modal')

const SettingsModal = require('./PluginSettings.jsx')

let Details = () => <div>Failed to load powercord module manager's details component!</div>
try {
  Details = require('../../../coremods/moduleManager/components/parts/Details')
} catch (e) {
  console.error('Failed to load powercord module manager\'s details component! Settings won\'t render correctly.', e)
}

module.exports = class Plugin extends React.Component {
  render () {
    this.props.enabled = this.props.meta.__started

    // We're reusing Powercord's plugin manager classes
    return (
      <Card className='powercord-plugin powercord-product bdc-plugin'>
        <div className='powercord-plugin-header powercord-product-header'>
          <h4>{this.props.plugin.getName()}</h4>
          <Tooltip>
            <div>
              <Switch value={this.props.enabled} onChange={() => this.togglePlugin()}/>
            </div>
          </Tooltip>
        </div>
        <Divider />

        <Details
          svgSize={24} license=''
          author={this.props.plugin.getAuthor()}
          version={this.props.plugin.getVersion()}
          description={this.props.plugin.getDescription()}
        />

        <div class='bdc-spacer'></div>
        <Divider />

        <div className='powercord-plugin-footer powercord-product-footer bdc-justifystart'>
          {this.props.meta.source &&
            <Button
              onClick={() => openExternal(this.props.meta.source)}
              look={Button.Looks.LINK}
              size={Button.Sizes.SMALL}
              color={Button.Colors.TRANSPARENT}
            >
              Source code
            </Button>
          }

          {this.props.meta.website &&
            <Button
              onClick={() => openExternal(this.props.meta.website)}
              look={Button.Looks.LINK}
              size={Button.Sizes.SMALL}
              color={Button.Colors.TRANSPARENT}
            >
              Website
            </Button>
          }

          <div class='bdc-spacer'></div>

          {typeof this.props.plugin.getSettingsPanel === 'function' &&
            <Button
              disabled={!this.props.enabled}
              onClick={() => openModal(() => <SettingsModal plugin={this.props.plugin}/>)}
              size={Button.Sizes.SMALL}
              color={Button.Colors.BRAND}
            >
              Settings
            </Button>
          }
          {typeof this.props.plugin.getSettingsPanel === 'function' &&
            <div class='bdc-margin'></div>
          }
          
          <Button
            onClick={() => window.BdApi.showConfirmationModal(
              'Delete Plugin',
              `Are you sure you want to delete **${this.props.plugin.getName()}**? This can't be undone!`,
              { confirmText: 'Delete', danger: true, onConfirm: this.props.onDelete }
            )}
            color={Button.Colors.RED}
            look={Button.Looks.FILLED}
            size={Button.Sizes.SMALL}
          >
            {Messages.APPLICATION_CONTEXT_MENU_UNINSTALL}
          </Button>
        </div>
      </Card>
    )
  }

  togglePlugin () {
    if (this.props.enabled) {
      this.props.onDisable()
    } else {
      this.props.onEnable()
    }

    this.forceUpdate()
  }
}
