export default {
  addNewSlab: () => {
    // 1. Get current slabs from the Appsmith Store
    const currentSlabs = appsmith.store.varSlabsData || [];

    // 2. Mappings for database constraints
    const schemeTypeMap = {
      'Buy-Get-Free': 'BUY_GET_FREE',
      'Combo': 'COMBO',
      'Price Slab': 'PRICE_SLAB'
    };

    const triggerTypeMap = {
      'Products': 'Product',
      'Brand': 'Brand',
      'Category': 'Category'
    };

    // 3. Build the new slab object using Widget properties
    const newSlab = {
      id: Date.now(), // Unique ID for table row tracking
      scheme_type: schemeTypeMap[radioSchemeType.selectedOptionValue] || 'BUY_GET_FREE',
      trigger_type: triggerTypeMap[radioGroup.selectedOptionValue] || 'Product',
      trigger_id: selectTriggerItem.selectedOptionValue,
      trigger_name: selectTriggerItem.selectedOptionLabel,
      
      reward_product_id: radioFreeItemType.selectedOptionValue === 'Different Product' 
        ? selectFreeProduct.selectedOptionValue 
        : null,
      reward_product_name: radioFreeItemType.selectedOptionValue === 'Different Product'
        ? selectFreeProduct.selectedOptionLabel
        : 'Same Product',
      
      channel_tier: selectChannel.selectedOptionValue || 'Dealer',
      min_qty: Number(numberMinQty.text || 0),
      reward_qty: Number(numberFreeQty.text || 0),
      tier_level: 1,
      is_recursive: true
    };

    // 4. Update the Appsmith Store variable
    storeValue('varSlabsData', [...currentSlabs, newSlab]);

    // 5. Reset Widgets to defaults
    resetWidget("selectChannel", true);
    resetWidget("numberMinQty", true);
    resetWidget("numberFreeQty", true);
    
    // Optional: Reset the selective product if it was used
    if (radioFreeItemType.selectedOptionValue === 'Different Product') {
       resetWidget("selectFreeProduct", true);
    }

    showAlert("Slab added to local list", "success");
  }
}