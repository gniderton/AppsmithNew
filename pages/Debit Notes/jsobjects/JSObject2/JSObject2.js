export default {
    populateDebitLines: async () => {
        const vID = SelectVendor.selectedOptionValue; 
        
        // Validation
        if (!vID) {
            showAlert("Please select a Vendor", "warning");
            return;
        }

        // 1. Get raw data from the Products query
        // Based on your JSON: Products.data is the object, Products.data.data is the array
        const rawData = Products.data.data || Products.data; 
        const allProducts = Array.isArray(rawData) ? rawData : [];

        // 2. Filter products by Vendor ID
        const filteredProducts = allProducts.filter(p => String(p.vendor_id) === String(vID));

        // 3. Map to your specific format
        const tableData = filteredProducts.map((p, index) => {
            const qty = 0; // Defaulting to 0 as it's a new entry
            const price = Number(p.purchase_rate) || 0;
            const gstPct = Number(p.tax_percentage) || 0;
            
            // Calculations
            const gross = qty * price;
            const taxable = gross; 
            const gstAmt = taxable * (gstPct / 100);
            const net = taxable + gstAmt;

            return {
                "_row_id": p.id + "_" + Math.random().toString(36).substr(2, 9),
                "S.No": index + 1,
                "EAN Code": p.ean_code || "",
                "Item Name": p.product_name,
                "MRP": Number(p.mrp) || 0,
                "Price": price,
                "Qty": qty, 
                "Sch": 0,
                "Disc %": 0,
                "GST %": gstPct, 
                "Gross $": Number(gross.toFixed(2)),
                "Disc. $": 0,
                "Taxable $": Number(taxable.toFixed(2)),
                "GST $": Number(gstAmt.toFixed(2)),
                "Net $": Number(net.toFixed(2)), 
                "Reason": "Good", // Defaulting since no batch status exists yet
                "Batch No": "NA", 
                "Expiry": p.last_sold_date || "", // stashing a date from your JSON
                "_product_id": p.id,
                "Stock": Number(p.current_stock) || 0
            };
        });

        // 4. Update the store
        await storeValue('GlobalDebitLinesData', tableData);
        
        if(tableData.length === 0) {
            showAlert("No products found for this vendor", "info");
        } else {
            showAlert(`Populated ${tableData.length} items`, "success");
        }
        
        return tableData;
    }
}