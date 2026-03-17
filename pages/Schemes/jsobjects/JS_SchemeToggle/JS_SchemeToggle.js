export default {
	onStatusChange: async (row) => {
		// 1. Get the data from the parameter instead of triggeredRow
		const schemeId = row?.id;
		const name = row?.scheme_name;

		// 2. [DEBUG] Check if ID exists
		if (!schemeId) {
			console.log("Passed Row Data:", row);
			return showAlert(`Error: ID is missing for ${name}. Check JS console.`, "error");
		}

		// 3. Call the API
		return toggleSchemeStatus.run(
			(res) => {
				const status = res.is_active ? "Activated" : "Deactivated";
				showAlert(`${name} is now ${status}`, "success");
				getSchemes.run(); // Refresh list
			},
			(err) => showAlert("API Error: " + err.message, "error"),
			{ id: schemeId }
		);
	}
}
