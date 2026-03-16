export default {
	// ==========================================
	// 1. INITIALIZATION & UI MODE STATE
	// ==========================================
	
	initEdit: async () => {
		const row = tblSchemes.triggeredRow; 
		if (!row) return showAlert("Please select a scheme to edit", "warning");

		storeValue('varIsEditMode', true);

		// Save Header Data to Store (Reactive pattern)
		storeValue('editName', row.scheme_name);
		storeValue('editDesc', row.description);
		storeValue('editStart', row.start_date);
		storeValue('editEnd', row.end_date);

		// Format Rules (Mapping DB data back to local varSlabsData)
		const formattedRules = (row.rules || []).map(r => ({
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

		// Force the header widgets to re-read their "Default Value" from the store
		const widgets = [
			"inputSchemeName", "inputDescription", "dateStart", 
			"dateEnd", "checkboxNoExpiry", "radioSchemeType"
		];
		widgets.forEach(w => resetWidget(w, true));

		// Set the Type to trigger the correct container visibility
		if (formattedRules.length > 0) {
			const typeMap = { 'BUY_GET_FREE': 'Buy-Get-Free', 'COMBO': 'Combo', 'PRICE_SLAB': 'Price Slab' };
			storeValue('editType', typeMap[formattedRules[0].scheme_type]);
			resetWidget("radioSchemeType", true);
		}

		showModal("modalSchemeForm");
	},

	initCreate: async () => {
		storeValue('varIsEditMode', false);
		this.resetModal();
		showModal("modalSchemeForm");
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
				{ id: tblSchemes.selectedRow.id, payload: payload }
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

	// ==========================================
	// 3. STATUS TOGGLE (NEW)
	// ==========================================
    
	toggleStatus: async (schemeId, currentName) => {
		return toggleSchemeStatus.run(
			(res) => {
				const statusText = res.is_active ? "Activated" : "Deactivated";
				showAlert(`${currentName} is now ${statusText}`, "info");
				getSchemes.run();
			},
			(err) => showAlert("Failed to toggle status: " + err.message, "error"),
			{ id: schemeId }
		);
	},

	// ==========================================
	// 4. RULE MANAGEMENT (BUY-GET-FREE, COMBO, SLAB)
	// ==========================================
	
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
		showAlert("Slab added", "success");
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
		if (comboProducts.length === 0) return showAlert("Add products to group first", "error");
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
