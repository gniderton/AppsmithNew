export default {
  updatePO: async () => {
    console.log("=== STARTING UPDATE ===");

    // 1. GET SOURCE (Appsmith Table data or Store)
    const sourceData = poTable.tableData || appsmith.store.poLines || [];

    // 2. FILTER & MAP (Bulletproof Keys for Parity)
    const validLines = sourceData
      .filter(r => Number(r['Qty'] || r['qty'] || r['ordered_qty'] || 0) > 0)
      .map(r => ({
          product_id:         r._product_id || r.product_id,
          ordered_qty:        Number(r['Qty'] || r['qty'] || r['ordered_qty']),
          mrp:                Number(r['MRP'] || r['mrp']),
          price:              Number(r['Price'] || r['price'] || r['purchase_rate']),
          scheme_amount:      Number(r['Sch'] || r['scheme_amount'] || 0),
          discount_percent:   Number(r['Disc %'] || r['Disc'] || r['discount_percent'] || 0),
          tax_percent:        Number(r['GST %'] || r['tax_percent'] || 5)
      }));

    if (validLines.length === 0) {
      showAlert("No items to save!", "error");
      return;
    }

    // Get vendor details from store as requested
    const vID = Number(appsmith.store.selectedVendorId) || 0;
    if (vID === 0) {
       showAlert("Invalid Vendor ID in Store", "error");
       return;
    }

    // 3. PREPARE PAYLOAD
    const dbPayload = {
        vendor_id:      vID,
        remarks:        "Updated via Appsmith Manager", 
        lines:          validLines
    };

    // 4. SEND TO SERVER
    // Store the payload so the query can access it via {{appsmith.store.poUpdatePayload}}
    await storeValue('poUpdatePayload', dbPayload);
    
    showAlert("Updating...", "info");
    
    try {
      // Trigger the REST Query
      const result = await updatePOQuery.run();

      // 5. SUCCESS & CLEANUP
      if (result) {
        showAlert("PO Updated Successfully!", "success");
        
        // Refresh the PO list
        await getPOs.run(); 
        
        // UI Cleanup
        closeModal('drawerCreatePO');
        await storeValue('poLines', []);
      }
    } catch (e) {
      showAlert("Update failed: " + e.message, "error");
    }
  }
}
