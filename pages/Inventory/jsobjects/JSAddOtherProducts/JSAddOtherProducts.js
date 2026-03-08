export default {
  addRemainingProducts: async () => {
    const current = appsmith.store.piLines || [];
    const vID = vendorDropdownGRN.selectedOptionValue;
    
    // Find vendor products NOT in the table
    const missing = Products.data.data.filter(p => 
      Number(p.vendor_id) === Number(vID) && 
      !current.find(row => row._product_id === p.id)
    );
    
    const newRows = missing.map((p, i) => ({
      "S.No": current.length + i + 1,
      "EAN Code": p.ean_code || "",
      "Item Name": p.product_name,
      "MRP": Number(p.mrp),
      "Price": Number(p.purchase_rate),
      "Qty": 0,
      "Sch": 0,
      "Disc %": 0,
      "GST %": Number(p.tax_percentage || 5),
      "Gross $": 0,
      "Disc. $": 0,
      "Taxable $": 0,
      "GST $": 0,
      "Net $": 0,
      "Batch No": "",
      "Expiry": null,
      "_product_id": p.id
    }));
    
    await storeValue('piLines', [...current, ...newRows]);
  }
}