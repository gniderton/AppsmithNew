export default {
	// ==========================================
	// 1. INITIALIZATION & VIEW/EDIT MODES
	// ==========================================
	
	// Call this from the Table Row Button
	initView: async () => {
		const row = tblSchemes.triggeredRow; 
		if (!row) return showAlert("Please select a scheme", "warning");

		storeValue('varIsReadOnly', true); // Lock the fields
		storeValue('varIsEditMode', false);
		
		this.hydrateUI(row);
		showModal("modalSchemeForm");
	},

	// Call this from the "Edit" button inside the Modal
	enableEdit: () => {
		storeValue('varIsReadOnly', false);
		storeValue('varIsEditMode', true);
		showAlert("Editing enabled", "info");
	},

	// Call this from the "Cancel" button inside the Modal
	cancelEdit: () => {
		storeValue('varIsReadOnly', true);
		storeValue('varIsEditMode', false);
		// Re-load the original data to undo any typed changes
		this.hydrateUI(tblSchemes.triggeredRow); 
		showAlert("Changes cancelled", "info");
	},

	initCreate: async () => {
		storeValue('varIsReadOnly', false); // Unlock fields
		storeValue('varIsEditMode', false);
		this.resetModal();
		showModal("modalSchemeForm");
	},

	// Helper to load data into the store (DRY)
	hydrateUI: (data) => {
		storeValue('editName', data.scheme_name);
		storeValue('editDesc', data.description);
		storeValue('editStart', data.start_date);
		storeValue('editEnd', data.end_date);

		const formattedRules = (data.rules || []).map(r => ({
			id: Date.now() + Math.random(), 
			scheme_type: r.scheme_type,
			trigger_type: r.trigger_type,
			trigger_id: r.trigger_id,
			trigger_name: r.trigger_name,
			min_qty: Number(r.min_qty),
			reward_product_id: r.reward_product_id,
			reward_product_name: r.reward_product_name,
			reward_qty: Number(r.reward_qty),
			special_price: r.special_price ? Number(r.special_price) : null,
			tier_level: r.tier_level || 1,
			channel_tier: r.channel_tier,
			is_recursive: r.is_recursive !== false,
			combo_products: r.combo_products || []
		}));

		storeValue('varSlabsData', formattedRules);

		// Populate Combo Picker if it's a Combo
		if (formattedRules.length > 0 && formattedRules[0].scheme_type === 'COMBO') {
			storeValue('varComboProducts', formattedRules[0].combo_products);
		} else {
			storeValue('varComboProducts', []);
		}

		// Reset widgets to show the new data
		const widgets = ["inputSchemeName", "inputDescription", "dateStart", "dateEnd", "checkboxNoExpiry", "radioSchemeType"];
		widgets.forEach(w => resetWidget(w, true));

		if (formattedRules.length > 0) {
			const typeMap = { 'BUY_GET_FREE': 'BUY_GET_FREE', 'COMBO': 'COMBO', 'PRICE_SLAB': 'PRICE_SLAB' };
			storeValue('editType', typeMap[formattedRules[0].scheme_type]);
			resetWidget("radioSchemeType", true);
		}
	},

	// ==========================================
	// 2. SAVING (CREATE & UPDATE)
	// ==========================================
	
	saveScheme: async () => {
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
				special_price: r.special_price ? Number(r.special_price) : null,
				tier_level: r.tier_level || 1,
				channel_tier: r.channel_tier,
				is_recursive: r.is_recursive !== false,
				combo_products: r.combo_products || []
			}))
		};

		if (appsmith.store.varIsEditMode) {
			return updateScheme.run(
				() => {
					showAlert("Scheme updated successfully!", "success");
					this.onSaveSuccess();
				},
				(err) => showAlert("Update Failed: " + err.message, "error"),
				{ id: tblSchemes.triggeredRow.id, payload: payload }
			);
		} else {
			return createScheme.run(
				() => {
					showAlert("Scheme created successfully!", "success");
					this.onSaveSuccess();
				},
				(err) => showAlert("Create Failed: " + err.message, "error"),
				{ payload: payload }
			);
		}
	},

    // (Helpers onSaveSuccess, resetModal, and Slab Adders remain same as previous version...)
	onSaveSuccess: () => {
		getSchemes.run();
		closeModal("modalSchemeForm");
		this.resetModal();
	},

	resetModal: () => {
		storeValue('editName', "");
		storeValue('editDesc', "");
		storeValue('editStart', "");
		storeValue('editEnd', "");
		storeValue('editType', 'Buy-Get-Free');
		storeValue('varSlabsData', []);
		storeValue('varComboProducts', []);
		
		const widgets = [
			"inputSchemeName", "inputDescription", "dateStart", "dateEnd", "checkboxNoExpiry",
			"radioSchemeType", "radioGroup", "selectTriggerItem", "selectFreeProduct"
		];
		widgets.forEach(w => resetWidget(w, true));
	},

    // ... (addNewSlab, addComboProduct, addComboSlab, addPriceSlab, toggleStatus methods)
	toggleStatus: async (schemeId, currentName) => {
		return toggleSchemeStatus.run(
			(res) => {
				const statusText = res.is_active ? "Activated" : "Deactivated";
				showAlert(`${currentName} is now ${statusText}`, "info");
				getSchemes.run();
			},
			(err) => showAlert("Failed: " + err.message, "error"),
			{ id: schemeId }
		);
	},
    
	addNewSlab: () => {
		const typeMap = { 'Buy-Get-Free': 'BUY_GET_FREE', 'Combo': 'COMBO', 'Price Slab': 'PRICE_SLAB' };
		const triggerMap = { 'Products': 'Product', 'Brand': 'Brand', 'Category': 'Category' };
		const newSlab = {
			id: Date.now(),
			scheme_type: typeMap[radioSchemeType.selectedOptionValue] || 'BUY_GET_FREE',
			trigger_type: triggerMap[radioGroup.selectedOptionValue] || 'Product',
			trigger_id: selectTriggerItem.selectedOptionValue,
			trigger_name: selectTriggerItem.selectedOptionLabel,
			reward_product_id: radioFreeItemType.selectedOptionValue === 'Different Product' ? selectFreeProduct.selectedOptionValue : null,
			reward_product_name: radioFreeItemType.selectedOptionValue === 'Different Product' ? selectFreeProduct.selectedOptionLabel : 'Same Product',
			channel_tier: selectChannel.selectedOptionValue || 'Dealer',
			min_qty: Number(numberMinQty.text || 0),
			reward_qty: Number(numberFreeQty.text || 0),
			tier_level: 1,
			is_recursive: true
		};
		storeValue('varSlabsData', [...(appsmith.store.varSlabsData || []), newSlab]);
		["selectChannel", "numberMinQty", "numberFreeQty", "selectFreeProduct"].forEach(w => resetWidget(w, true));
	},

	addComboProduct: () => {
		const currentCombo = appsmith.store.varComboProducts || [];
        const productId = selectComboProduct.selectedOptionValue;
		if (!productId) return showAlert("Select a product", "error");
		storeValue('varComboProducts', [...currentCombo, { id: Date.now(), product_id: productId, product_name: selectComboProduct.selectedOptionLabel }]);
		resetWidget("selectComboProduct", true);
	},

	addComboSlab: () => {
		const comboProducts = appsmith.store.varComboProducts || [];
		const isDiff = radioFreeItemTypeCombo.selectedOptionValue === 'Different Product';
		const newSlab = {
			id: Date.now(),
			scheme_type: 'COMBO',
			trigger_type: 'Product',
			trigger_id: null,
			trigger_name: `Combo Group (${comboProducts.length})`,
			combo_products: comboProducts.map(p => ({ product_id: p.product_id, product_name: p.product_name })),
			reward_product_id: isDiff ? selectFreeProductCombo.selectedOptionValue : null,
			reward_product_name: isDiff ? selectFreeProductCombo.selectedOptionLabel : 'From Group',
			channel_tier: selectChannelCombo.selectedOptionValue || 'Dealer',
			min_qty: Number(numberMinQtyCombo.text || 0),
			reward_qty: Number(numberFreeQtyCombo.text || 0),
			tier_level: 1,
			is_recursive: true
		};
		storeValue('varSlabsData', [...(appsmith.store.varSlabsData || []), newSlab]);
		["selectChannelCombo", "numberMinQtyCombo", "numberFreeQtyCombo", "selectFreeProductCombo"].forEach(w => resetWidget(w, true));
	},

	addPriceSlab: () => {
		const productId = selectProductPriceSlab.selectedOptionValue;
		if (!productId) return showAlert("Select Product", "error");
		const newSlab = {
			id: Date.now(),
			scheme_type: 'PRICE_SLAB',
			trigger_type: 'Product',
			trigger_id: productId,
			trigger_name: selectProductPriceSlab.selectedOptionLabel,
			channel_tier: selectChannelPriceSlab.selectedOptionValue || 'Dealer',
			min_qty: Number(numberMinQtyPriceSlab.text || 0),
			special_price: Number(numberNetRatePriceSlab.text || 0),
			reward_qty: 0,
			reward_product_id: null,
			tier_level: 1,
			is_recursive: true
		};
		storeValue('varSlabsData', [...(appsmith.store.varSlabsData || []), newSlab]);
		["selectProductPriceSlab", "selectChannelPriceSlab", "numberMinQtyPriceSlab", "numberNetRatePriceSlab"].forEach(w => resetWidget(w, true));
	}
}
