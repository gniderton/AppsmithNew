export default {
	startEditing: async () => {
		await storeValue('profileEditing', true);
	},

	stopEditing: async () => {
		await storeValue('profileEditing', false);
	}
}
