export default {
  editPO: async () => {
    storeValue('poLines', []);
    storeValue('poMode', 'EDIT');
    const masterProducts = Products.data.data || [];
    const savedLines = getPOById.data.lines || [];
    const vendorId = appsmith.store.selectedVendorId;

    const mergedLines = masterProducts
      .filter(p => Number(p.vendor_id) === Number(vendorId))
      .map((p, index) => {
        const saved   = savedLines.find(s => Number(s.product_id) === Number(p.id));
        const qty     = saved ? Number(saved.ordered_qty) : 0;
        const rate    = saved ? Number(saved.rate) : Number(p.purchase_rate);
        const disc    = saved ? Number(saved.discount_percent) : 0;
        const scheme  = saved ? Number(saved.scheme_amount) : 0;
        const gross   = qty * rate;
        const discAmt = (gross - scheme) * (disc / 100);
        const gstPct  = 5;
        const taxAmt  = (gross - scheme - discAmt) * (gstPct / 100);
        const net     = (gross - scheme - discAmt) + taxAmt;
        return {
          "S.No": index+1, "EAN Code": p.ean_code, "Item Name": p.product_name,
          "MRP": Number(p.mrp), "Price": rate, "Qty": qty, "Sch": scheme,
          "Disc %": disc, "GST %": gstPct, "Gross $": gross,
          "Disc. $": discAmt, "Taxable $": net - taxAmt,
          "GST $": taxAmt, "Net $": net, "_product_id": p.id
        };
      });
    storeValue('poLines', mergedLines);
    showModal(drawerCreatePO.name);
  }
}