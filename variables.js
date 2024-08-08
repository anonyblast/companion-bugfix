module.exports = function (module = {}) {
	let companionVariables = {}

	function defineVariables() {
		function addVariable(variable) {
			if (companionVariables[variable.variableId] == undefined) {
				const initialValue = variable.variableId.includes('level') || variable.variableId.includes('gain') ? -99 : -1
				companionVariables[variable.variableId] = {
					name: variable.name,
					value: initialValue,
				}
			}
		}

		// Generate variables for channels
		for (let i = 1; i <= module.config.channels; i++) {
			const channelVariables = [
				{ variableId: `state_talk_ch${i}`, name: `Talk State (CH${i})` },
				{ variableId: `state_call_ch${i}`, name: `Call State (CH${i})` },
				{ variableId: `state_cue_ch${i}`, name: `Cue State (CH${i})` },
				{ variableId: `state_listen_ch${i}`, name: `Listen State (CH${i})` },
				{ variableId: `state_level_ch${i}`, name: `Level (CH${i})` },
				{ variableId: `state_input_ch${i}`, name: `Input Channel State (CH${i})` },
				{ variableId: `state_input_call_ch${i}`, name: `Input Call State (CH${i})` },
			]
			channelVariables.forEach(addVariable)
		}

		// Define user or device-specific variables
		const deviceVariables = [
			{ variableId: 'state_audio_gain', name: 'Input Gain State' },
			{ variableId: 'state_audio_source', name: 'Input Source' },
			{ variableId: 'state_mode_isolate', name: 'Isolate State' },
			{ variableId: 'state_level_main', name: 'Main Level' },
			{ variableId: 'state_level_pgm', name: 'PGM Level' },
			{ variableId: 'state_level_direct', name: 'Direct Channel Level' },
			{ variableId: 'state_heartbeat', name: 'Device Online State' },
			{ variableId: 'state_input_source', name: 'Input Source State' }, // Added for inputSource action
		]
		deviceVariables.forEach(addVariable)

		// MCX(D) specific variables
		if (module.config.deviceType == 'MCX') {
			const mcxVariables = [
				// Temp. disabled
				// { variableId: 'state_level_headset', name: 'Headset Level (MCX)' },
				// { variableId: 'state_level_lineout', name: 'Line-Out Level (MCX)' },
				// { variableId: 'state_level_speaker', name: 'Speaker Level (MCX)' },
				// { variableId: 'state_mode_screen', name: 'Screen Mode (MCX)' },
			]
			mcxVariables.forEach(addVariable)
		}

		// WPX specific variables
		if (module.config.deviceType == 'WPX') {
			const wpxVariables = [
				// Temp. disabled
				// { variableId: 'state_level_headset', name: 'Headset Level (WPX)' },
				// { variableId: 'state_level_speaker', name: 'Speaker Level (WPX)' },
				// { variableId: 'state_mode_screen', name: 'Screen Mode (WPX)' },
			]
			wpxVariables.forEach(addVariable)
		}

		const variableDefinitions = Object.entries(companionVariables).map(([variableId, { name }]) => ({
			variableId,
			name,
		}))
		module.setVariableDefinitions(variableDefinitions)
	}

	function setInitialValues() {
		const variableValues = Object.fromEntries(
			Object.entries(companionVariables).map(([variableId, { value }]) => [variableId, value])
		)

		// Set initial variable values
		module.setVariableValues(variableValues)
	}

	defineVariables()
	setInitialValues()

	module.log('debug', `Variables: Initialized all variables for ${module.config.channels} channels`)

	return {
		companionVariables,
		setCompanionVariableValue: (variableId, value) => {
			if (companionVariables[variableId]) {
				companionVariables[variableId].value = value
				module.setVariableValues({ [variableId]: value })
				module.log('debug', `Variables: Updated ${variableId} to ${value}`)
			} else {
				module.log('error', `Variables: Attempted to set undefined variable ${variableId}`)
			}
		},
	}
}
