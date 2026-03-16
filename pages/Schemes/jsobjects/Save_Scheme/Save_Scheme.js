export default {
	// 1. The main function to call from your Button's onClick
	createScheme: async () => {

		// Build the payload (you can also just put this inside createScheme.run)
		const payload = {
			scheme_name: inputSchemeName.text,
			description: inputDescription.text || "",
			start_date: dateStart.selectedDate,
			end_date: checkboxNoExpiry.isChecked ? null : dateEnd.selectedDate,
			is_active: true,
			rules: (appsmith.store.varSlabsData || []).map(r => ({
				scheme_type: r.scheme_type,
				trigger_type: r.trigger_type,
				trigger_id: r.trigger_id,
				min_qty: Number(r.min_qty),
				reward_product_id: r.reward_product_id,
				reward_qty: Number(r.reward_qty),
				tier_level: r.tier_level || 1,
				channel_tier: r.channel_tier,
				is_recursive: r.is_recursive !== false
			}))
		};

		// 2. RUN the API and pass the payload as a parameter
		return createScheme.run(
			// First Argument: Success Callback
			() => {
				showAlert("Scheme created successfully!", "success");

				// Reset UI
				const toReset = [
					"inputSchemeName", "inputDescription", "dateStart", "dateEnd",
					"checkboxNoExpiry", "radioSchemeType", "radioGroup", "selectTriggerItem"
				];
				toReset.forEach(name => resetWidget(name, true));

				// Clear Store and Refresh
				storeValue('varSlabsData', []);
				storeValue('varComboProducts',[]);
				getSchemes.run();
				closeModal("modalSchemeForm");
			},
			// Second Argument: Error Callback
			(error) => {
				showAlert("Error: " + (error?.message || "Failed to save"), "error");
			},
			// Third Argument: Parameters to pass to the API
			{ payload: payload }
		);
	}
}
