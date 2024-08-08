module.exports = [
	/*
	 * Place your upgrade scripts here
	 * Remember that once it has been added it cannot be removed!
	 */
	// Upgrade logic for installations using v1.0.0
	function (context, props) {
		const result = {
			updatedConfig: null,
			updatedActions: [],
			updatedFeedbacks: [],
		}
		const config = props.config
		
		if (config) {
			// Convert unsupported device types to a sane default
			if (config.deviceType === 'SIWR') {
				console.log(
					'Green-GO Module Upgrade: Found and updated unsupported device type in the configuration (SIWR -> SI4WR)'
				)
				config.deviceType = 'SI4WR'
				result.updatedConfig = config
			} else if (config.deviceType === 'INTX') {
				console.log(
					'Green-GO Module Upgrade: Found and updated unsupported device type in the configuration (INTX -> SI4WR)'
				)
				config.deviceType = 'SI4WR'
				result.updatedConfig = config
			} else if (config.deviceType === 'OLD_DEVICE_TYPE') {
				console.log(
					'Green-GO Module Upgrade: Found and updated deprecated device type in the configuration (OLD_DEVICE_TYPE -> NEW_DEVICE_TYPE)'
				)
				config.deviceType = 'NEW_DEVICE_TYPE'
				result.updatedConfig = config
			}

			// Example: Adding a new configuration property if it doesn't exist
			if (config.newProperty === undefined) {
				console.log(
					'Green-GO Module Upgrade: Adding newProperty to configuration with default value'
				)
				config.newProperty = 'defaultValue'
				result.updatedConfig = config
			}
		}

		// Example: Upgrade action to use new variable or format
		props.actions.forEach((action) => {
			if (action.actionId === 'someOldAction') {
				console.log(
					'Green-GO Module Upgrade: Updating action someOldAction to new format'
				)
				action.actionId = 'someNewAction'
				action.options.newOption = 'defaultValue'
				result.updatedActions.push(action)
			}
		})

		// Example: Upgrade feedback to match new structure
		props.feedbacks.forEach((feedback) => {
			if (feedback.feedbackId === 'someOldFeedback') {
				console.log(
					'Green-GO Module Upgrade: Updating feedback someOldFeedback to new format'
				)
				feedback.feedbackId = 'someNewFeedback'
				feedback.options.newOption = 'defaultValue'
				result.updatedFeedbacks.push(feedback)
			}
		})

		return result
	},
]
