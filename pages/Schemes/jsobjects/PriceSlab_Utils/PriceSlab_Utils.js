export default {
  addPriceSlab: () => {
    // 1. Get current slabs from the Appsmith Store
    const currentSlabs = appsmith.store.varSlabsData || [];

    // 2. Extract values from Select and Input widgets
    const productId = selectProductPriceSlab.selectedOptionValue;
    const productName = selectProductPriceSlab.selectedOptionLabel;
    const netRate = Number(numberNetRatePriceSlab.text || 0);
    const minQty = Number(numberMinQtyPriceSlab.text || 0);

    // 3. Validations
    if (!productId) {
      showAlert("Please select a product", "error");
      return;
    }
    
    if (netRate <= 0) {
      showAlert("Please enter a valid Net Rate", "error");
      return;
    }

    // 4. Create Price Slab Object
    const newSlab = {
      id: Date.now(), // Unique ID for table row deletion/tracking
      scheme_type: 'PRICE_SLAB',
      trigger_type: 'Product',
      trigger_id: productId,
      trigger_name: productName,
      channel_tier: selectChannelPriceSlab.selectedOptionValue || 'Dealer',
      min_qty: minQty,
      special_price: netRate, // Correctly mapped to special_price field in DB
      
      // Defaults for irrelevant fields
      reward_qty: 0,
      reward_product_id: null,
      combo_products: [],
      tier_level: 1,
      is_recursive: true
    };

    // 5. Update Appsmith Store
    storeValue('varSlabsData', [...currentSlabs, newSlab]);

    // 6. Reset UI Inputs
    resetWidget("selectProductPriceSlab", true);
    resetWidget("selectChannelPriceSlab", true);
    resetWidget("numberMinQtyPriceSlab", true);
    resetWidget("numberNetRatePriceSlab", true);

    showAlert(`Price slab added for ${productName}`, "success");
  }
}
