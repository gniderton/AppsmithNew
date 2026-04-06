export default {
  // --- OPTION A: Populate from Catalog (All Products) ---
  loadAllProducts: async () => {
    // 1. Fetch the full product catalog from your query
    const products = getProducts.data.data || [];

    // 2. Map catalog products to the Table format
    const creditLines = products.map(p => ({
      _product_id: p.id,
      'Item Name': p.product_name,
      'batch_id': null, // Optional for credit note
      'Qty': 0,
      'Price': Number(p.dealer_rate || 0), // Use your default rate column
      'Sch': 0,
      'Disc %': 0,
      'GST %': Number(p.tax_percentage || 0),
      'Invoiced Qty': "Catalog", 
      'Taxable $': 0,
      'GST $': 0,
      'Net $': 0,
      'is_gst': false
    }));

    storeValue('GlobalCreditLinesData', creditLines);
  },

  // --- OPTION B: Populate from Specific Invoice ---
  loadInvoiceItems: async () => {
    const invoiceId = selInvoice.selectedOptionValue;
    if (!invoiceId) return;
    
    await get_invoice_details.run({ id: invoiceId });
    const lines = get_invoice_details.data.lines || [];

    const creditLines = lines.map(line => ({
      _product_id: line.product_id,
      'Item Name': line.product_name,
      'batch_id': line.batch_id,
      'Qty': 0, 
      'Price': line.rate,
      'Sch': 0,
      'Disc %': 0,
      'GST %': line.tax_percent,
      'Invoiced Qty': line.shipped_qty,
      'Taxable $': 0,
      'GST $': 0,
      'Net $': 0,
      'is_gst': false
    }));

    storeValue('GlobalCreditLinesData', creditLines);
  },

  // Logic for the Item-wise Table Edit
  updateRow: () => {
    // 1. Get the current modified row from the table
    const change = tblCreditLines.updatedRow; 
    if (!change) return;

    // 2. Get the data from store
    const currentData = appsmith.store.GlobalCreditLinesData || [];
    const targetIndex = currentData.findIndex(row => row._product_id === change._product_id);
    if (targetIndex === -1) return;

    // 3. Merge changes
    let newData = [...currentData];
    let row = { ...newData[targetIndex], ...change };

    // 4. Calculation logic
    const Qty = Number(row['Qty'] || 0);
    const Price = Number(row['Price'] || 0);    
    const Sch = Number(row['Sch'] || 0);
    const DiscPct = Number(row['Disc %'] || 0);
    const GstPct = Number(row['GST %'] || 0);

    const Gross = Qty * Price;
    const DiscAmt = (Gross - Sch) * (DiscPct / 100);
    const Taxable = Gross - Sch - DiscAmt;
    const GstAmt = Taxable * (GstPct / 100);
    const Net = Taxable + GstAmt;

    newData[targetIndex] = {
      ...row,
      'Taxable $': Number(Taxable.toFixed(2)),
      'GST $': Number(GstAmt.toFixed(2)),
      'Net $': Number(Net.toFixed(2))
    };

    storeValue('GlobalCreditLinesData', newData);
  },

  getFinalItems: () => {
    if (radReturnType.selectedOptionValue === 'FLAT') {
      const total = Number(iptFlatAmount.text || 0);
      const isGst = swiIsGst.isSwitchedOn;
      const taxable = isGst ? total / 1.18 : total;
      const gst = total - taxable;

      return [{
        'Item Name': selAdjType.selectedOptionValue,
        'Qty': 1,
        'Price': total,
        'Taxable $': taxable.toFixed(2),
        'GST $': gst.toFixed(2),
        'Net $': total.toFixed(2),
        'GST %': isGst ? 18 : 0,
        'is_gst': isGst,
        'return_to_stock': false
      }];
    } else {
       // Only send products where quantity was actually entered
       return (appsmith.store.GlobalCreditLinesData || []).filter(item => Number(item.Qty) > 0);
    }
  }
}
