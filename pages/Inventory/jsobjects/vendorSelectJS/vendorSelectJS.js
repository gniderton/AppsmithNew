export default {
  onVendorSelect: () => {
    const vID = vendorDropdownGRN.selectedOptionValue;
    storeValue('piLines', []);
    if (!Products.data || !vID) { return; }

    const productList = Products.data.data || Products.data;
    const newLines = productList
      .filter(p => Number(p.vendor_id) === Number(vID))
      .map((p, index) => ({
        "S.No": index + 1,
        "EAN Code": p.ean_code || "",
        "Item Name": p.product_name,
        "MRP": Number(p.mrp),
        "Price": Number(p.purchase_rate),
        "Qty": 0, "Sch": 0, "Disc %": 0,
        "GST %": Number(p.tax_percentage || 5),
        "Gross $": 0, "Disc. $": 0, "Taxable $": 0, "GST $": 0, "Net $": 0,
        "Batch No": "", "Expiry": null,
        "_product_id": p.id
      }));
    storeValue('piLines', newLines);
  },

  addMissingProducts: () => {
    const currentRows = appsmith.store.piLines || [];
    const allProducts = Products.data.data || Products.data;
    const vID = vendorDropdownGRN.selectedOptionValue;
    if (!allProducts || !vID) return;

    const missingProds = allProducts.filter(p =>
      Number(p.vendor_id) === Number(vID) &&
      !currentRows.find(row => Number(row._product_id) === Number(p.id))
    );
    const newRows = missingProds.map((p, i) => ({
      "S.No": currentRows.length + i + 1,
      "EAN Code": p.ean_code || "",
      "Item Name": p.product_name,
      "MRP": Number(p.mrp), "Price": Number(p.purchase_rate),
      "Qty": 0, "Sch": 0, "Disc %": 0,
      "GST %": Number(p.tax_percent || 5),
      "Gross $": 0, "Disc. $": 0, "Taxable $": 0, "GST $": 0, "Net $": 0,
      "Batch No": "", "Expiry": null, "_product_id": p.id
    }));
    storeValue('piLines', [...currentRows, ...newRows]);
    showAlert(`Added ${newRows.length} products`, 'success');
  }
}