export default {
  populateDebitLines: async () => {
    const vID = SelectVendor.selectedOptionValue; 
    if (!vID) return;

    // 1. Fetch Global Batches
    const allBatches = await getBatch.run(); 
    console.log("Total Batches Fetched from Server:", allBatches.length);
    
    // 2. Fetch Products
    const rawData = Products.data.data; 
    const allProducts = Array.isArray(rawData) ? rawData : (rawData?.data || []);

    const tableData = allProducts.map((p, index) => {
      // --- IMPORTANT: Strict filtering by ID ---
      const productBatches = allBatches.filter(b => String(b.product_id) === String(p.id));
      
      return {
        "S.No": index + 1,
        "EAN Code": p.ean_code || "",
        "Item Name": p.product_name,
        "MRP": Number(p.mrp || 0),
        "Price": Number(p.purchase_rate || 0),
        "Qty": 0,
        "Sch": 0,
        "Disc %": 0,
        "GST %": Number(p.tax_percentage || 0), 
        "Gross $": 0,
        "Disc. $": 0,
        "Taxable $": 0,
        "GST $": 0,
        "Net $": 0, 
        "Reason": "Damage",
        "Batch No": "", 
        "Expiry": null,
        "_product_id": p.id,
        "_batches": productBatches // Stashed
      };
    });

    storeValue('GlobalDebitLinesData', tableData); 
    return tableData;
  }
}
