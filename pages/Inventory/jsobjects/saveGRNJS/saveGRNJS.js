export default {
	saveGRN: async () => {
		// 1. Validation
		const rawLines = appsmith.store.piLines || [];
		const validLines = rawLines.filter(row => row.Qty && Number(row.Qty) > 0);

		if (validLines.length === 0) {
			showAlert('No items to save!', 'error'); 
			return;
		}

		const vID = vendorDropdownGRN.selectedOptionValue;
		if (!vID) { 
			showAlert('Select a Vendor', 'error'); 
			return; 
		}
		// 2. Prepare Detailed Line Items
		const dbLines = validLines.map(row => ({
			product_id:       Number(row._product_id),
			ordered_qty:      0, // Master data fallback usually handles this
			accepted_qty:     Number(row.Qty),
			rate:             Number(row.Price),
			discount_percent: Number(row['Disc %'] || 0),
			scheme_amount:    Number(row.Sch || 0),
			tax_amount:       Number(row['GST $'] || 0),
			amount:           Number(row['Gross $'] || 0),
			batch_number:     row["Batch No"] ? row["Batch No"].toString() : "",
			expiry_date:      row.Expiry ? new Date(row.Expiry).toISOString().split('T')[0] : null,
			mrp:              Number(row.MRP || 0)
		}));
		// 3. Calculate "Headers" (The missing magic)
		const totalNet = dbLines.reduce((acc, x) => acc + x.amount, 0);
		const totalTax = dbLines.reduce((acc, x) => acc + x.tax_amount, 0);
		const finalPayload = {
			vendor_id:         Number(vID),
			purchase_order_id: Number(ChoosePo.selectedOptionValue || 0),
			invoice_number:    vendorInvoiceNo.text,
			invoice_date:      dateVendorInvoice.selectedDate,
			received_date:     dateReceived.selectedDate,

			// Header Fields (Corrected Mapping)
			total_net:         totalNet,
			tax_amount:        totalTax,
			grand_total:       Math.round(totalNet + totalTax),

			// Correction Support
			parent_invoice_id: appsmith.store.CorrectionID || null,

			lines:             dbLines
		};
		// 4. Send & Cleanup
		await storeValue('grnPayload', finalPayload);
		await saveGRN.run(); // Ensure query name matches

		showAlert("GRN Saved Successfully", "success");
		closeModal(modalFrameGRN.name);
		await getGRNList.run();
		await getPOs.run();
	}
}