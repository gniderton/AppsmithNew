export default {
  addComboProduct: () => {
    // 1. Get current products from the Appsmith Store
    const currentCombo = appsmith.store.varComboProducts || [];
    
    // 2. Get values from Select Widget
    const productId = selectComboProduct.selectedOptionValue;
    const productName = selectComboProduct.selectedOptionLabel;

    // 3. Validation: Check if product is selected
    if (!productId) {
      showAlert("Please select a product", "error");
      return;
    }

    // 4. Check for duplicates
    const exists = currentCombo.some(p => p.product_id === productId);
    if (exists) {
      showAlert("Product already in combo group", "warning");
      return;
    }

    // 5. Build New Item
    const newComboProduct = {
      id: Date.now(), // Unique ID for table row tracking
      product_id: productId,
      product_name: productName
    };

    // 6. Update Appsmith Store
    const updatedCombo = [...currentCombo, newComboProduct];
    storeValue('varComboProducts', updatedCombo);

    // 7. Reset the Dropdown
    resetWidget("selectComboProduct", true);

    showAlert(`${productName} added to combo`, "success");
  }
}
