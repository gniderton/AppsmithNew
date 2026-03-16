export default {
	createScheme: async () => {
		// Build the payload with all necessary fields for Slaps and Combos
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
				// FIX 1: Send special_price for PRICE_SLAB schemes
				special_price: r.special_price ? Number(r.special_price) : null,
				tier_level: r.tier_level || 1,
				channel_tier: r.channel_tier,
				is_recursive: r.is_recursive !== false,
				// FIX 2: Added combo_products to the payload
				combo_products: r.combo_products || [] 
			}))
		};

		// Run the API and pass the payload
		return createScheme.run(
			// Success Callback
			() => {
				showAlert("Scheme created successfully!", "success");

				// Reset the UI fields
				const toReset = [
					"inputSchemeName", "inputDescription", "dateStart", "dateEnd",
					"checkboxNoExpiry", "radioSchemeType", "radioGroup", "selectTriggerItem"
				];
				toReset.forEach(name => resetWidget(name, true));

				// Clear the temporary store variables
				storeValue('varSlabsData', []);
				storeValue('varComboProducts', []);
				
				// Refresh the main table and close modal
				getSchemes.run();
				closeModal("modalSchemeForm");
			},
			// Error Callback
			(error) => {
				showAlert("Error: " + (error?.message || "Failed to save"), "error");
			},
			// Parameters passed to the API
			{ payload: payload }
		);
	}
}
