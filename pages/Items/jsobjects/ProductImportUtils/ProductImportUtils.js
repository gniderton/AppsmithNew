export default {
    // 1. Download the Blank Template
    downloadTemplate: () => {
        const headersData = {
            "Brand Name": "Thadi",
            "Category Name": "Beverages",
            "Vendor Name": "Default Vendor", 
            "Product Name": "TH_Syrup_Sample_750ml",
            "Tax Name": "GST 5%",
            "HSN Code": "21069011",
            "EAN": "0",
            "MRP": 270.00,
            "Purchase Rate": 166.67,
            "Distributor Rate": 185.71,
            "Wholesale Rate": 185.71,
            "Dealer Rate": 205.71,
            "Retail Rate": 257.14,
            "Case Qty": 1,
            "UOM": "Pcs",
            "Model Number": "",
            "Min Stock": 0,
            "Length(cm)": 0,
            "Width(cm)": 0,
            "Height(cm)": 0,
            "Weight(kg)": 0,
            "Description": ""
        };
        const csvContent = Object.keys(headersData).join(",") + "\n" + Object.values(headersData).map(val => {
            const strVal = String(val);
            return (strVal.includes(',') || strVal.includes('"')) ? `"${strVal.replace(/"/g, '""')}"` : strVal;
        }).join(",");
        download(csvContent, "product_import_template.csv", "text/csv");
    },

    // 2. Process Uploaded File (The "Next" or "Upload" button action)
    processUpload: async () => {
        const fileData = FilePicker1.files[0]?.data; 
        const ref = getTemplateData.data;

        if (!fileData) return showAlert("Please select a CSV array file first.", "warning");
        if (!ref) return showAlert("Missing Reference Data. Run 'getTemplateData' first.", "error");

        let cleanData = [];
        let errors = [];

        const cleanKey = (k) => String(k).toLowerCase().replace(/[^a-z0-9]/g, '');
        const getVal = (row, key) => {
            const foundKey = Object.keys(row).find(k => cleanKey(k).includes(cleanKey(key)));
            return foundKey ? row[foundKey] : undefined;
        };
        const findId = (list, name, key) => {
            if (!list || !Array.isArray(list) || !name) return null;
            const cleanName = String(name).toLowerCase().trim();
            const item = list.find(x => String(x[key]).toLowerCase().trim() === cleanName);
            return item ? item.id : null;
        };
        const safeFloat = (val) => {
            const num = parseFloat(val);
            return isNaN(num) ? 0 : Number(num.toFixed(2));
        };

        fileData.forEach((row, index) => {
            const rowErr = [];
            const brandName = getVal(row, "Brand Name") || getVal(row, "brand");
            const catName   = getVal(row, "Category Name") || getVal(row, "category");
            const vendName  = getVal(row, "Vendor Name") || getVal(row, "vendor");
            const taxName   = getVal(row, "Tax Name") || getVal(row, "tax");
            const hsnCode   = getVal(row, "HSN Code") || getVal(row, "hsn");
            const pName     = getVal(row, "Product Name"); 
            const rowEan    = getVal(row, "EAN") || getVal(row, "EAN Code"); 
            
            const bId = findId(ref.brands, brandName, 'brand_name');
            const cId = findId(ref.categories, catName, 'category_name');
            const tId = findId(ref.taxes, taxName, 'tax_name');
            const hId = findId(ref.hsn, hsnCode, 'hsn_code');

            let finalVId = 4; // Default to Vendor ID 4
            const explicitVId = getVal(row, "Vendor ID"); 
            if (explicitVId) finalVId = explicitVId;
            else if (vendName) {
                 const foundV = findId(ref.vendors, vendName, 'vendor_name');
                 if (!foundV) rowErr.push(`Vendor '${vendName}' not found`);
                 else finalVId = foundV;
            }

            if (!bId) rowErr.push(`Brand '${brandName}' not found`);
            if (!cId) rowErr.push(`Category '${catName}' not found`);
            if (!tId) rowErr.push(`Tax '${taxName}' not found`);
            if (hsnCode && !hId) rowErr.push(`HSN '${hsnCode}' not found`);
            if (!pName) rowErr.push("Product Name is required");

            if (rowErr.length > 0) {
                errors.push({ ...row, "Error_Details": rowErr.join(" | "), "Row_Number": index + 2 });
            } else {
                cleanData.push({
                    product_name: pName,
                    brand_id: bId,
                    category_id: cId,
                    vendor_id: finalVId, 
                    hsn_id: hId || null,
                    tax_id: tId || null,
                    ean_code: rowEan || null,
                    mrp: safeFloat(getVal(row, "MRP")),
                    purchase_rate: safeFloat(getVal(row, "Purchase Rate")),
                    distributor_rate: safeFloat(getVal(row, "Distributor Rate")),
                    wholesale_rate: safeFloat(getVal(row, "Wholesale Rate")),
                    dealer_rate: safeFloat(getVal(row, "Dealer Rate")),
                    retail_rate: safeFloat(getVal(row, "Retail Rate")),
                    case_quantity: parseInt(getVal(row, "Case Qty")) || 1,
                    uom: getVal(row, "UOM") || 'Pcs',
                    model_number: getVal(row, "Model Number") || "",
                    min_stock_level: parseInt(getVal(row, "Min Stock")) || 0,
                    box_length_cm: safeFloat(getVal(row, "Length(cm)")),
                    box_width_cm: safeFloat(getVal(row, "Width(cm)")),
                    box_height_cm: safeFloat(getVal(row, "Height(cm)")),
                    weight_kg: safeFloat(getVal(row, "Weight(kg)")),
                    description: getVal(row, "Description") || ""
                });
            }
        });

        storeValue('varImportData', cleanData);
        storeValue('varImportErrors', errors);

        // State Machine: 1 = Errors Tab, 2 = Valid Tab
        if (errors.length > 0) {
            storeValue('currentStep', 1); 
            showAlert(`Found ${errors.length} errors. Please fix them.`, "warning");
        } else {
            storeValue('currentStep', 2);
            showAlert(`All clean! Ready to import ${cleanData.length} items.`, "success");
        }
        storeValue('showFilePicker', false);
        showModal("modalFrameImport");
    },

    // 3. Download Errors Button Action
    downloadErrors: () => {
        download(appsmith.store.varImportErrors, "product_errors", "text/csv")
        .then(() => {
            // Check what to do next
            if (appsmith.store.varImportData.length > 0) {
                // valid data exists: switch to tab 2
                storeValue('currentStep', 2);
            } else {
                // no valid data at all: close modal
                closeModal("modalFrameImport");
                resetWidget("FilePicker1"); 
            }
        });
    },

    // 4. Import Valid Data Button Action (Submitting payload to PostgreSQL)
    submitValidData: () => {
        apiImportProducts.run()
        .then(() => {
            showAlert(`Successfully imported ${appsmith.store.varImportData.length} items!`, "success");
            storeValue('varImportData', []);
            Products.run();
            closeModal("modalFrameImport");
            resetWidget("FilePicker1"); 
        })
        .catch((err) => {
            showAlert("Import failed: " + err.message, "error");
        });
    }
}
