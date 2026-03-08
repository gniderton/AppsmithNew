export default {
  updateDebitRow: () => {
    // 1. Get the current modified row from the table
    const change = tblDebitLines.updatedRow; 
    if (!change) return;

    // 2. Get the current full array from Appsmith store
    const currentData = appsmith.store.GlobalDebitLinesData || [];
    
    // 3. Find the row by ID
    const targetIndex = currentData.findIndex(row => row._product_id === change._product_id);
    if (targetIndex === -1) {
      console.error("Row not found in store for update");
      return;
    }

    // 4. Create a copy and merge changes
    let newData = [...currentData];
    let row = { ...newData[targetIndex], ...change };

    // 5. Calculation Logic (Safety first with Number parsing)
    const Qty = Number(row['Qty'] || 0);
    const Price = Number(row['Price'] || 0);    
    const Sch = Number(row['Sch'] || 0);
    const DiscPct = Number(row['Disc %'] || 0);
    const GstPct = Number(row['GST %'] || 0);

    // Math (Standard ERP Logic)
    const Gross = Qty * Price;
    const DiscAmt = (Gross - Sch) * (DiscPct / 100);
    const Taxable = Math.max(0, Gross - Sch - DiscAmt);
    const GstAmt = Taxable * (GstPct / 100);
    const Net = Taxable + GstAmt;

    // Update Row Columns (Fixed 2 decimals)
    row['Qty'] = Qty;
    row['Price'] = Price;
    row['Sch'] = Sch;
    row['Disc %'] = DiscPct;
    row['GST %'] = GstPct;
    row['Gross $'] = Number(Gross.toFixed(2));
    row['Disc. $'] = Number(DiscAmt.toFixed(2));
    row['Taxable $'] = Number(Taxable.toFixed(2));
    row['GST $'] = Number(GstAmt.toFixed(2));
    row['Net $'] = Number(Net.toFixed(2));
    
    // Replace in array
    newData[targetIndex] = row;

    // 6. Save back to store
    storeValue('GlobalDebitLinesData', newData);
    
    return newData;
  }
}