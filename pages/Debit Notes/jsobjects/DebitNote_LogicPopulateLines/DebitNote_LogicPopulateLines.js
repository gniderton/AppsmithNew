export default {
  populateDebitLines: async () => {
    const vID = SelectVendor.selectedOptionValue; 
    // Assuming your Multi-Select widget is named MultiSelectStatus
    const selectedStatuses = MultiSelectStatus.selectedOptionValues; 

    if (!vID || !selectedStatuses || selectedStatuses.length === 0) {
      showAlert("Please select a Vendor and at least one Return Reason (Good/Expiry/Damage)", "warning");
      return;
    }

    // 1. Fetch Global Batches & Products
    // I assume getBatch.run() returns the full list you showed me
    const allBatches = await getBatch.run(); 
    const rawData = Products.data.data; 
    const allProducts = Array.isArray(rawData) ? rawData : (rawData?.data || []);

    // 2. Filter Batches
    // Rule: Must have stock (>0) AND status must match the user's checkbox selection
    const eligibleBatches = allBatches.filter(b => 
      Number(b.quantity_remaining) > 0 && 
      selectedStatuses.includes(b.status)
    );

    // 3. Map Batches to Table Rows (One row per Batch)
    const tableData = eligibleBatches.map((batch, index) => {
      // Find the parent product to get the Name, EAN, and Tax info
      const p = allProducts.find(prod => String(prod.id) === String(batch.product_id));
      
      // If the product doesn't belong to this vendor (if your Products query is vendor-filtered), skip it
      if (!p) return null;

      const qty = Number(batch.quantity_remaining);
      const price = Number(batch.purchase_rate || 0);
      const gstPct = Number(p.tax_percentage || 0);
      
      // Calculate initial totals for the pre-filled quantity
      const gross = qty * price;
      const taxable = gross; // Starting with 0 discount/scheme
      const gstAmt = taxable * (gstPct / 100);
      const net = taxable + gstAmt;

      return {
        "_row_id": batch.id + "_" + Math.random().toString(36).substr(2, 9),
        "S.No": index + 1,
        "EAN Code": p.ean_code || "",
        "Item Name": p.product_name,
        "MRP": Number(batch.mrp || 0),
        "Price": price,
        "Qty": qty, // PRE-FILLED with available stock
        "Sch": 0,
        "Disc %": 0,
        "GST %": gstPct, 
        "Gross $": Number(gross.toFixed(2)),
        "Disc. $": 0,
        "Taxable $": Number(taxable.toFixed(2)),
        "GST $": Number(gstAmt.toFixed(2)),
        "Net $": Number(net.toFixed(2)), 
        "Reason": batch.status, // Uses "Good", "Expiry", or "Damage"
        "Batch No": batch.batch_code, 
        "Expiry": batch.expiry_date,
        "_product_id": p.id,
        // Stashing all batches for this product in case they want to switch manually later
        "_batches": allBatches.filter(b => String(b.product_id) === String(p.id)) 
      };
    }).filter(row => row !== null); // Remove any nulls if product wasn't found

    // 4. Update the store
    storeValue('GlobalDebitLinesData', tableData); 
    return tableData;
  }
}
