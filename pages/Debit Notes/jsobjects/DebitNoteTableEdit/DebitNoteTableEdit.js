export default {
  updateDebitRow: () => {
    const change = tblDebitLines.updatedRow; 
    if (!change) return;

    console.log("Change detected in row:", change);

    const currentData = appsmith.store.GlobalDebitLinesData || [];
    const targetIndex = currentData.findIndex(row => row._product_id === change._product_id);
    
    if (targetIndex === -1) {
      console.error("Match failed: Could not find product ID in store:", change._product_id);
      return;
    }

    let newData = [...currentData];
    let row = { ...newData[targetIndex], ...change };

    // --- [BATCH AUTO-FILL LOGIC] ---
    if (change["Batch No"]) {
      console.log("User changed Batch No to:", change["Batch No"]);
      console.log("Checking stashed batches within this row:", row._batches?.length);
      
      const selectedBatch = (row._batches || []).find(b => b.batch_code === change["Batch No"]);
      
      if (selectedBatch) {
        console.log("Batch Found! Expiry:", selectedBatch.expiry_date);
        row["Expiry"] = selectedBatch.expiry_date || "No Expiry";
        row["MRP"] = Number(selectedBatch.mrp || 0);
        row["Price"] = Number(selectedBatch.purchase_rate || 0);
      } else {
        console.warn("Batch No selected but not found in stashed _batches!");
      }
    }

    // 5. Calculation Logic
    const Qty = Number(row['Qty'] || 0);
    const Price = Number(row['Price'] || 0);    
    const Sch = Number(row['Sch'] || 0);
    const DiscPct = Number(row['Disc %'] || 0);
    const GstPct = Number(row['GST %'] || 0);

    const Gross = Qty * Price;
    const DiscAmt = (Gross - Sch) * (DiscPct / 100);
    const Taxable = Math.max(0, Gross - Sch - DiscAmt);
    const GstAmt = Taxable * (GstPct / 100);
    const Net = Taxable + GstAmt;

    // Update Result Columns
    row['Gross $'] = Number(Gross.toFixed(2));
    row['Disc. $'] = Number(DiscAmt.toFixed(2));
    row['Taxable $'] = Number(Taxable.toFixed(2));
    row['GST $'] = Number(GstAmt.toFixed(2));
    row['Net $'] = Number(Net.toFixed(2));
    
    newData[targetIndex] = row;
    storeValue('GlobalDebitLinesData', newData);
    
    console.log("Store Updated Successfully.");
    return newData;
  }
}
