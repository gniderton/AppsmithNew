export default {
  savePO: async () => {
    // 1. FILTER INPUTS
    // In Appsmith, we access the store via appsmith.store
    const rawLines = appsmith.store.poLines || [];
    const validLines = rawLines.filter(row => Number(row.Qty) > 0);

    if (validLines.length === 0) {
      showAlert("No items to save!", "error");
      return;
    }

    // Access the selected value from the Select widget
    if (!vendorDropdown.selectedOptionValue) {
      showAlert("Select a Vendor", "error");
      return;
    }

    // 2. PREPARE PAYLOAD
    const dbPayloadLines = validLines.map(row => ({
      product_id: row._product_id,
      ordered_qty: Number(row.Qty),
      mrp: Number(row.MRP),
      price: Number(row.Price),
      scheme_amount: Number(row.Sch || 0),
      discount_percent: Number(row['Disc %'] || 0),
      tax_percent: Number(row['GST %'] || 0)
    }));

    const dbPayload = {
      vendor_id: vendorDropdown.selectedOptionValue,
      remarks: "",
      lines: dbPayloadLines
    };

    // 3. SEND TO SERVER
    // Store the payload so the query can reference it as {{appsmith.store.poPayload}}
    await storeValue('poPayload', dbPayload);

    showAlert("Saving...", "info");

    try {
      // .run() is the Appsmith equivalent to .trigger()
      const result = await submitPO.run();

      // In Appsmith, if the query succeeds, 'result' contains the response data
      if (result) {
        showAlert("PO Saved Successfully!", "success");

        // 7. CLEANUP
        await storeValue('poLines', []);
        
        // Reset widgets and refresh sequence
        resetWidget('vendorDropdown', true);
        await getNextPO.run();

        // 8. CLOSE MODAL (Drawers are Modals in Appsmith)
        closeModal('drawerCreatePO');
      }
    } catch (error) {
      showAlert("Error saving PO: " + error.message, "error");
    }
  }
}
