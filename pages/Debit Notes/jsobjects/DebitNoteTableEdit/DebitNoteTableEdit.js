export default {
  updateDebitRow: () => {
    const change = tblDebitLines.updatedRow; 
    const targetIndex = tblDebitLines.updatedRowIndex; // Standard Appsmith property

    if (targetIndex === undefined || targetIndex === -1) {
      console.error("Could not determine the updated row index.");
      return;
    }

    const currentData = appsmith.store.GlobalDebitLinesData || [];
    let newData = [...currentData];
    
    // Merge the changes into the row at the specific index
    let row = { ...newData[targetIndex], ...change };

    console.log("Updating row at index:", targetIndex, "Changes:", change);

    // --- [BATCH AUTO-FILL LOGIC] --- (Exact same as your original)
    if (change["Batch No"]) {
      const selectedBatch = (row._batches || []).find(b => b.batch_code === change["Batch No"]);
      if (selectedBatch) {
        row["Expiry"] = selectedBatch.expiry_date || "No Expiry";
        row["MRP"] = Number(selectedBatch.mrp || 0);
        row["Price"] = Number(selectedBatch.purchase_rate || 0);
      }
    }

    // --- [CALCULATION LOGIC] --- (Exact same as your original)
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
