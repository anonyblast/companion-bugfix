const { InstanceStatus } = require('@companion-module/base')
const osc = require('osc')
const EventEmitter = require('events')

// The OSC Manager handles all communication and variable updates
class OscModule extends EventEmitter {
	constructor(module) {
		super()
		this.module = module
		this.oscPort = null
		this.stateUpdateTimer = null
		this.heartbeatTimer = null
		this.updatesCollector = new VariableUpdatesCollector(this.updateVariableValues.bind(this))
	}

	init(config, companionVariables) {
		this.companionVariables = companionVariables
		if (!this.companionVariables) {
			this.module.log('warn', `OSC Manager: No variables defined`)
		}
		this.config = config
		if (!this.config) {
			this.module.log('error', `OSC Manager: Config not initialized`)
			return
		}
		if (this.oscPort) {
			this.module.log('debug', 'OSC Manager: Running instance found, restarting the OSC listeners')
			this.closeOSCListeners()
		}
		this.oscPort = new osc.UDPPort({
			localAddress: '0.0.0.0',
			localPort: this.config.port,
			remoteAddress: this.config.host,
			remotePort: this.config.port,
			metadata: true,
		})
		this.oscPort.on('message', (oscMsg) => this.onMessage(oscMsg))
		this.oscPort.on('error', (error) => this.onError(error))
		this.oscPort.open()
		this.module.updateStatus(InstanceStatus.Ok)
	}

	onMessage(oscMsg) {
		if (oscMsg.address === '/ggo/state/heartbeat') {
			if (this.stateUpdateTimer) {
				this.requestStateUpdate()
			}
			if (this.heartbeatTimer) {
				clearTimeout(this.heartbeatTimer)
			}
			this.heartbeatTimer = setTimeout(() => this.handleHeartbeat(), 5000)
		}
		if (oscMsg.address === '/ggo/state/updated') {
			if (this.stateUpdateTimer) {
				clearInterval(this.stateUpdateTimer)
				this.stateUpdateTimer = null
			}
			this.module.log('info', `OSC Manager: Received complete state update from ${this.config.host}`)
			return
		}
		if (oscMsg.address.startsWith('/ggo/state/')) {
			const variableName = this.parsePathToVariable(oscMsg)
			if (variableName in this.companionVariables) {
				let isFlooding = oscMsg.address.includes('level') || oscMsg.address.includes('gain')
				this.updatesCollector.collect(variableName, oscMsg.args[0].value, isFlooding)
			} else {
				this.module.log(
					'warn',
					`OSC Manager: Received message using unsupported path (${oscMsg.address}). Generated variable "${variableName}" not found`
				)
			}
		}
	}

	parsePathToVariable(oscMsg) {
		let segments = oscMsg.address.split('/')
		if (segments[0] === '') {
			segments = segments.slice(2)
		}
		segments = segments.filter((segment) => segment !== 'channel')
		let variableName = segments.join('_')
		if (oscMsg.address.includes('/channel/')) {
			variableName += '_ch' + oscMsg.args[1].value
		}
		return variableName
	}

	updateVariableValues(updates) {
		let updatedVariables = {}
		let count = 0

		for (let [variableName, value] of Object.entries(updates)) {
			if (
				this.companionVariables.hasOwnProperty(variableName) &&
				this.companionVariables[variableName].value !== value
			) {
				updatedVariables[variableName] = value
				this.companionVariables[variableName] = {
					name: this.companionVariables[variableName].name,
					value: value,
				}
				this.emit('variableUpdated', variableName, value)
				count++
			}
		}
		if (Object.keys(updatedVariables).length > 0) {
			this.module.setVariableValues(updatedVariables)
			this.module.checkFeedbacks()
		}
		if (count > 0) {
			this.module.log('debug', `OSC Manager: Updated values of ${count} variables`)
		}
	}

	sendCommand(cmd, values) {
		if (!Array.isArray(values)) {
			values = [values]
		}
		const args = values.map((value) => ({ type: 'i', value }))
		this.oscPort.send({
			address: '/ggo/cmd/' + cmd,
			args: args,
		})
		this.module.log(
			'debug',
			`OSC Manager: Sent command to /ggo/cmd/${cmd} (${this.config.host}:${this.config.port}): ${values.join(', ')}`
		)
	}

	requestStateUpdate(isTimerCall = false) {
		if (this.oscPort) {
			const logMessage = isTimerCall
				? `OSC Manager: No updates received, requesting state update from ${this.config.host}`
				: `OSC Manager: Requesting state update from ${this.config.host}`

			this.module.log('debug', logMessage)
			this.sendCommand('update', 1)

			if (!this.stateUpdateTimer) {
				this.stateUpdateTimer = setInterval(() => this.requestStateUpdate(true), 30000)
			}
		} else {
			this.module.log('debug', `OSC Manager: OSC client not initialized, cannot request update`)
		}
	}

	handleHeartbeat() {
		this.updateVariableValues({ state_heartbeat: 0 })
		this.module.log('warn', `OSC Manager: Lost heartbeat of ${this.config.host}`)
		this.requestStateUpdate()
	}

	closeOSCListeners() {
		if (this.oscPort) {
			this.oscPort.close()
			this.oscPort = null
			this.module.log('debug', 'OSC Manager: Closed OSC server')
		}
	}

	async close() {
		this.closeOSCListeners()
	}

	onError(error) {
		this.module.log('error', `OSC Manager: ${error.message}`)
	}

	destroy() {
		this.closeOSCListeners()
	}
}

// Class to collect variable updates and manage timers
class VariableUpdatesCollector {
	constructor(updateVariableValueCallback) {
		this.updateVariableValueCallback = updateVariableValueCallback
		this.updateQueue = new Map()
		this.levelQueue = new Map()
		this.timer = null
		this.levelTimer = null
	}

	collect(variableName, value, isFlooding = false) {
		if (isFlooding) {
			this.levelQueue.set(variableName, value)
			if (!this.levelTimer) {
				this.levelTimer = setTimeout(this.flushFloodingUpdates.bind(this), 250)
			}
		} else {
			this.updateQueue.set(variableName, value)
			if (this.timer) clearTimeout(this.timer)
			this.timer = setTimeout(this.flushUpdates.bind(this), 5)
		}
	}

	flushUpdates() {
		this.flushQueue(this.updateQueue)
		this.timer = null
	}

	flushFloodingUpdates() {
		this.flushQueue(this.levelQueue)
		this.levelTimer = null
	}

	flushQueue(queue) {
		let updates = {}
		for (let [variableName, value] of queue.entries()) {
			updates[variableName] = value
		}
		this.updateVariableValueCallback(updates)
		queue.clear()
	}
}

module.exports = OscModule
