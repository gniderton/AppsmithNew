export default {
  recalculateRow: async () => {
    // 1. Safety Check: Only proceed if there is actually a change
    const change = GRNTable.updatedRow; // Ensure this matches ONLY your actual Table Name!
    
    if (!change || !change._product_id) {
       console.log("No valid updatedRow found. Skipping recalculation.");
       return;
    }
    
    const targetId = change._product_id;
    const currentTable = appsmith.store.piLines || [];
    
    // 2. Map and Merge
    const updatedData = currentTable.map((row) => {
      // Safety: Match on BOTH hidden ID types
      if (row._product_id !== targetId && row.product_id !== targetId) return row;

      const merged = { ...row, ...change };

      // Math
      const qty = Number(merged.Qty) || 0;
      const price = Number(merged.Price) || 0;
      const sch = Number(merged.Sch) || 0;
      const discPct = Number(merged["Disc %"]) || 0;
      const gstPct = Number(merged["GST %"]) || 5;

      const gross = qty * price;
      const discAmt = (gross - sch) * (discPct / 100);
      const taxable = gross - sch - discAmt;
      const gstAmt = taxable * (gstPct / 100);
      const net = taxable + gstAmt;

      return {
        ...merged,
        "Qty": qty,
        "Price": price,
        "Sch": sch,
        "Disc %": discPct,
        "Gross $": Number(gross.toFixed(2)),
        "Disc. $": Number(discAmt.toFixed(2)),
        "Taxable $": Number(taxable.toFixed(2)),
        "GST $": Number(gstAmt.toFixed(2)),
        "Net $": Number(net.toFixed(2))
      };
    });

    // 3. Save
    await storeValue('piLines', updatedData);
  }
}
