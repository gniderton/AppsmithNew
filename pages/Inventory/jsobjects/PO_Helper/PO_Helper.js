export default {
	// 1. DOWNLOAD TEMPLATE
	// Call this from a "Download Template" button: {{ PO_Helper.downloadTemplate() }}
	downloadTemplate: async () => {
		const vID = vendorDropdown.selectedOptionValue;
		if (!vID) {
			showAlert("Please select a vendor first", "warning");
			return;
		}

		const allProducts = Products.data.data || Products.data;
		// Filter products for the selected vendor
		const vendorProducts = allProducts.filter(p => Number(p.vendor_id) === Number(vID));

		if (vendorProducts.length === 0) {
			showAlert("No products found for this vendor", "error");
			return;
		}

		// Prepare the data structure for Excel
		const templateData = vendorProducts.map(p => ({
			"product_id": p.id,
			"EAN Code": p.ean_code || "",
			"Item Name": p.product_name,
			"MRP": p.mrp,
			"Price": p.purchase_rate,
			"Qty": 0,
			"Disc %": 0,
			"Sch": 0
		}));

		// Convert to proper CSV string to ensure Excel opens it as a table
		const headers = Object.keys(templateData[0]);
		const csvHeader = headers.join(",");
		const csvRows = templateData.map(row => 
			headers.map(header => {
				const val = row[header] === null || row[header] === undefined ? "" : row[header];
				return `"${String(val).replace(/"/g, '""')}"`;
			}).join(",")
		);
		const csvString = [csvHeader, ...csvRows].join("\n");

		// Download file
		const fileName = `PO_Template_${vendorDropdown.selectedOptionLabel.replace(/\s+/g, '_')}.csv`;
		download(csvString, fileName, "text/csv");
	},

	// 2. UPLOAD & POPULATE
	// Call this from FilePicker's onFilesSelected: {{ PO_Helper.handleCSVUpload(FilePicker1.data) }}
	handleCSVUpload: async (uploadedData) => {
		if (!uploadedData || uploadedData.length === 0) {
			showAlert("File is empty or not parsed correctly", "error");
			return;
		}

		const masterProducts = Products.data.data || Products.data;
		if (!masterProducts || masterProducts.length === 0) {
			showAlert("Product master data is missing. Please refresh products.", "error");
			return;
		}

		// Map by ID for fast and reliable lookup
		const productsById = Object.fromEntries(masterProducts.map(p => [String(p.id), p]));

		const newLines = uploadedData.map((row, index) => {
			// Helper to find column values even if headers have spaces/hidden characters
			const getVal = (possibleNames) => {
				const key = Object.keys(row).find(k => 
					possibleNames.includes(k.trim().replace(/^\ufeff/, ""))
				);
				return row[key];
			};

			// Extract values using flexible matching
			const pId = getVal(["product_id", "id", "_product_id", "ID"]);
			const qty = Number(getVal(["Qty", "Quantity", "qty"]) || 0);
			const price = Number(getVal(["Price", "Rate", "price"]) || 0);
			const discPercent = Number(getVal(["Disc %", "Discount", "disc_percent"]) || 0);
			const scheme = Number(getVal(["Sch", "Scheme", "sch"]) || 0);

			// Logic: Only process rows where user entered a quantity
			if (qty <= 0) return null; 

			const p = productsById[String(pId)];
			if (!p) {
				console.warn(`Row ${index + 1}: Product ID ${pId} not found in master data.`);
				return null;
			}

			// Financial Calculations
			const finalPrice = price || Number(p.purchase_rate);
			const gstPercent = Number(p.tax_percentage || 0);
			const grossAmt = qty * finalPrice;
			const discAmt = (grossAmt * discPercent) / 100;
			const taxableAmt = grossAmt - discAmt;
			const gstAmt = (taxableAmt * gstPercent) / 100;
			const netAmt = taxableAmt + gstAmt;

			return {
				"S.No": 0, // Will re-index below
				"EAN Code": p.ean_code,
				"Item Name": p.product_name,
				"MRP": Number(p.mrp),
				"Price": finalPrice,
				"Qty": qty,
				"Sch": scheme,
				"Disc %": discPercent,
				"GST %": gstPercent,
				"Gross $": grossAmt.toFixed(2),
				"Disc. $": discAmt.toFixed(2),
				"Taxable $": taxableAmt.toFixed(2),
				"Stock": Number(p.current_stock),
				"GST $": gstAmt.toFixed(2),
				"Net $": netAmt.toFixed(2),
				"_product_id": p.id
			};
		})
		.filter(Boolean) // Remove empty/unmatched rows
		.map((line, i) => ({ ...line, "S.No": i + 1 })); // Correct the serial numbers

		if (newLines.length === 0) {
			showAlert("Zero items imported. Make sure you entered a 'Qty' for the products in the file.", "warning");
		} else {
			// Update the global store and set mode
			storeValue('poLines', newLines);
			storeValue('poMode', 'CREATE');
			showAlert(`Successfully imported ${newLines.length} items to the Purchase Order`, "success");
		}
	}
}
