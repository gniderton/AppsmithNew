export default {
  viewPO: async () => {
    await getPOById.run();
    const data = getPOById.data;
    if (!data || !data.header) {
      showAlert('No Data Found', 'error'); return;
    }
    storeValue('poMode', 'VIEW');
    storeValue('selectedVendorId', data.header.vendor_id);
    storeValue('selectedPONumber', data.header.po_number);
    storeValue('selectedPODate', data.header.po_date);
    storeValue('selectedDeliveryDate', data.header.delivery_date);
		storeValue('selectedPOId',data.header.id);
		storeValue('selectedPO',data.header.status)
		

    const formattedLines = (data.lines || []).map((row, index) => {
      const qty     = Number(row.ordered_qty);
      const rate    = Number(row.rate);
      const discPct = Number(row.discount_percent || 0);
      const scheme  = Number(row.scheme_amount || 0);
      const gross   = qty * rate;
      const discAmt = (gross - scheme) * (discPct / 100);
      const taxAmt  = Number(row.tax_amount);
      const net     = Number(row.amount);
      return {
        "S.No": index + 1, "EAN Code": row.ean_code,
        "Item Name": row.product_name, "MRP": Number(row.mrp),
        "Price": rate, "Qty": qty, "Sch": scheme,
        "Disc %": discPct, "GST %": 5,
        "Gross $": gross, "Disc. $": discAmt,
        "Taxable $": net - taxAmt, "GST $": taxAmt, "Net $": net,
        "_product_id": row.product_id
      };
    });
    storeValue('poLines', formattedLines);
    showModal(drawerCreatePO.name);
  }
}