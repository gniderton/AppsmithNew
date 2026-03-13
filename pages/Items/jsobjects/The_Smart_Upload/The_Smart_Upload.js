export default {
    processBulkUpdate: () => {
        const fileData = fileSmartUpload.files[0]?.data;
        const ref = getTemplateData.data;

        if (!fileData) {
            return showAlert("Please upload a file first.", "warning");
        }
        if (!ref) {
            return showAlert("Missing Reference Data. Click Prep first.", "error");
        }

        // Helper to find column even if casing doesn't match
        const get = (row, key) => {
            const found = Object.keys(row).find(k => k.toLowerCase().replace(/[^a-z]/g, '') === key.toLowerCase().replace(/[^a-z]/g, ''));
            return found ? row[found] : "";
        };

        // We map to the exact JSON keys the Backend PUT/POST APIs expect!
        // The backend's [safeId](cci:1://file:///c:/Users/user/Downloads/Backened/routes/products.js:675:8-686:10) will automatically convert "Brand Name" back to an ID for you!
        const cleanRows = fileData.map((r) => ({
            id:               get(r, "Product ID") || get(r, "ID"),
            product_name:     get(r, "Product Name"),
            brand_id:         get(r, "Brand Name") || get(r, "Brand"),
            category_id:      get(r, "Category Name") || get(r, "Category"),
            vendor_id:        get(r, "Vendor Name") || get(r, "Vendor"),
            tax_id:           get(r, "Tax Name") || get(r, "Tax"),
            hsn_id:           get(r, "HSN Code") || get(r, "HSN"),
            ean_code:         get(r, "EAN") || get(r, "EAN Code"),
            mrp:              get(r, "MRP"),
            purchase_rate:    get(r, "Purchase Rate"),
            distributor_rate: get(r, "Distributor Rate") || get(r, "Distributor"),
            wholesale_rate:   get(r, "Wholesale Rate") || get(r, "Wholesale"),
            dealer_rate:      get(r, "Dealer Rate") || get(r, "Dealer"),
            retail_rate:      get(r, "Retail Rate") || get(r, "Retail"),
            case_quantity:    get(r, "Case Qty"),
            uom:              get(r, "UOM"),
            model_number:     get(r, "Model Number") || get(r, "Model No"),
            min_stock_level:  get(r, "Min Stock"),
            box_length_cm:    get(r, "Length(cm)") || get(r, "Length"),
            box_width_cm:     get(r, "Width(cm)") || get(r, "Width"),
            box_height_cm:    get(r, "Height(cm)") || get(r, "Height"),
            weight_kg:        get(r, "Weight(kg)") || get(r, "Weight"),
            description:      get(r, "Description")
        }));

        storeValue("varBulkData", cleanRows);
        showAlert(`Loaded ${cleanRows.length} items for review.`, "success");
        
        // Open the Bulk Edit Review Modal
        showModal("modalBulkEdit");
    }
}
