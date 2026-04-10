export default {
  // --- OPTION A: Populate from Catalog ---
  loadAllProducts: async () => {
    const allBatches = await getBatch.run();
    const products = getProducts.data.data || [];

    const creditLines = products.map(p => {
      const productBatches = allBatches.filter(b => String(b.product_id) === String(p.id));
      
      return {
        _product_id: p.id,
        'Item Name': p.product_name,
        'batch_id': null, 
        'MRP': Number(p.mrp || 0), // [NEW]
        'Qty': 0,
        'Price': Number(p.dealer_rate || 0), 
        'Sch': 0,
        'Disc %': 0,
        'GST %': Number(p.tax_percentage || 0),
        'Invoiced Qty': "Catalog", 
        'Gross $': 0,   // [NEW]
        'Disc. $': 0,   // [NEW]
        'Taxable $': 0,
        'GST $': 0,
        'Net $': 0,
        'is_gst': false,
        '_batches': productBatches 
      };
    });

    storeValue('GlobalCreditLinesData', creditLines);
  },

  // --- OPTION B: Populate from Specific Invoice ---
  loadInvoiceItems: async () => {
    const invoiceId = selInvoice.selectedOptionValue;
    if (!invoiceId) return;
    
    const allBatches = await getBatch.run();
    await get_invoice_details.run({ id: invoiceId });
    const lines = get_invoice_details.data.lines || [];

    const creditLines = lines.map(line => {
      const productBatches = allBatches.filter(b => String(b.product_id) === String(line.product_id));

      return {
        _product_id: line.product_id,
        'Item Name': line.product_name,
        'batch_id': line.batch_code, 
        'MRP': Number(line.mrp || 0), // [NEW]
        'Qty': 0, 
        'Price': line.rate,
        'Sch': 0,
        'Disc %': 0,
        'GST %': line.tax_percent,
        'Invoiced Qty': line.shipped_qty,
        'Gross $': 0,   // [NEW]
        'Disc. $': 0,   // [NEW]
        'Taxable $': 0,
        'GST $': 0,
        'Net $': 0,
        'is_gst': false,
        '_batches': productBatches 
      };
    });

    storeValue('GlobalCreditLinesData', creditLines);
  },

  // Full Calculation Logic
  updateRow: () => {
    const change = tblCreditLines.updatedRow; 
    if (!change) return;

    const currentData = appsmith.store.GlobalCreditLinesData || [];
    const targetIndex = currentData.findIndex(row => row._product_id === change._product_id);
    if (targetIndex === -1) return;

    let newData = [...currentData];
    let row = { ...newData[targetIndex], ...change };

    // Batch Auto-fill
    if (change["batch_id"]) {
      const selectedBatch = (row._batches || []).find(b => b.batch_code === change["batch_id"]);
      if (selectedBatch) {
        row['MRP'] = Number(selectedBatch.mrp || 0);     // [NEW]
        row['Price'] = Number(selectedBatch.purchase_rate || 0);
      }
    }

    // --- RE-CALCULATION BLOCK ---
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

    // Save all calculated fields
    newData[targetIndex] = {
      ...row,
      'Gross $': Number(Gross.toFixed(2)),    // [NEW]
      'Disc. $': Number(DiscAmt.toFixed(2)),  // [NEW]
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
       return (appsmith.store.GlobalCreditLinesData || []).filter(item => Number(item.Qty) > 0);
    }
  }
}
