export default {
  addComboSlab: () => {
    // 1. Get current data from Appsmith Store
    const currentSlabs = appsmith.store.varSlabsData || [];
    const comboProducts = appsmith.store.varComboProducts || [];

    // 2. Validate combo products exist
    if (comboProducts.length === 0) {
      showAlert("Please add at least one product to the combo group first", "error");
      return;
    }

    // 3. Determine reward product
    let rewardProductId = null;
    let rewardProductName = 'From Same Group';
    
    // In Appsmith, use .selectedOptionValue for Radio/Select widgets
    if (radioFreeItemTypeCombo.selectedOptionValue === 'Different Product') {
      rewardProductId = selectFreeProductCombo.selectedOptionValue;
      rewardProductName = selectFreeProductCombo.selectedOptionLabel;
      
      if (!rewardProductId) {
        showAlert("Please select the reward product", "warning");
        return;
      }
    }

    // 4. Create combo slab object
    const newSlab = {
      id: Date.now(), // Unique ID for table row tracking
      scheme_type: 'COMBO',
      trigger_type: 'Product',
      trigger_id: null,
      trigger_name: `Combo (${comboProducts.length} products)`,
      combo_products: comboProducts.map(p => ({
        product_id: p.product_id,
        product_name: p.product_name
      })),
      reward_product_id: rewardProductId,
      reward_product_name: rewardProductName,
      channel_tier: selectChannelCombo.selectedOptionValue || 'Dealer',
      min_qty: Number(numberMinQtyCombo.text || 0),
      reward_qty: Number(numberFreeQtyCombo.text || 0),
      tier_level: 1,
      is_recursive: true
    };

    // 5. Update the main SLABS store
    storeValue('varSlabsData', [...currentSlabs, newSlab]);

    // 6. Reset only the slab-specific inputs
    resetWidget("selectChannelCombo", true);
    resetWidget("numberMinQtyCombo", true);
    resetWidget("numberFreeQtyCombo", true);
    resetWidget("radioFreeItemTypeCombo", true);
    resetWidget("selectFreeProductCombo", true);

    showAlert(`Added combo slab for ${newSlab.channel_tier}`, "success");
  }
}
