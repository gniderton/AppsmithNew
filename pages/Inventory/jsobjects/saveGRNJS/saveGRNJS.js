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
		const dbLines = validLines.map(row => {
			const qty = Number(row.Qty);
			const price = Number(row.Price);
			const scheme = Number(row.Sch || 0);
			const discPercent = Number(row['Disc %'] || 0);
			const tax = Number(row['GST $'] || 0);
			
			// Calculation Formula
			const gross = qty * price;
			const discountAmount = (gross - scheme) * (discPercent / 100);
			const taxableAmount = gross - scheme - discountAmount;
			const netAmount = taxableAmount + tax;

			return {
				product_id:       Number(row._product_id),
				ordered_qty:      0, 
				accepted_qty:     qty,
				rate:             price,
				discount_percent: discPercent,
				discount_amount:  discountAmount, // Now saved in DB
				scheme_amount:    scheme,
				tax_amount:       tax,
				amount:           netAmount,      // Corrected to Net Amount
				batch_number:     row["Batch No"] ? row["Batch No"].toString() : "DEFAULT",
				expiry_date:      row.Expiry ? new Date(row.Expiry).toISOString().split('T')[0] : null,
				mrp:              Number(row.MRP || 0)
			};
		});

		// 3. Calculate Header Totals
		const totalTaxable = dbLines.reduce((acc, x) => acc + (x.amount - x.tax_amount), 0);
		const totalTax = dbLines.reduce((acc, x) => acc + x.tax_amount, 0);
		const grandTotal = totalTaxable + totalTax;

		const finalPayload = {
			vendor_id:         Number(vID),
			purchase_order_id: Number(ChoosePo.selectedOptionValue || 0),
			invoice_number:    vendorInvoiceNo.text,
			invoice_date:      dateVendorInvoice.selectedDate,
			received_date:     dateReceived.selectedDate,

			// Header Totals
			total_net:         totalTaxable, // Sum of taxable amounts
			tax_amount:        totalTax,
			grand_total:       grandTotal,

			parent_invoice_id: appsmith.store.CorrectionID || null,
			lines:             dbLines
		};

		// 4. Send & Cleanup
		await storeValue('grnPayload', finalPayload);
		await saveGRN.run(); // Ensure this matches your API query name

		showAlert("GRN Saved Successfully", "success");
		closeModal(modalFrameGRN.name);
		await getGRNList.run();
		await getPOs.run();
	}
}
