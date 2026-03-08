export default {
	createDebitNote: async () => {
		// 1. Determine Mode (Item Return vs Manual)
		const isItemMode = selDNMode.selectedOptionValue === "Item Return";
		let amount = 0;
		let lines = [];

		if (isItemMode) {
			// Source from the storage variable used by the table
			const rawLines = appsmith.store.GlobalDebitLinesData || [];

			lines = rawLines.map(row => {
				const qty = Number(row['Qty'] || 0);
				const price = Number(row['Price'] || 0);    
				const scheme = Number(row['Sch'] || 0);
				const discPct = Number(row['Disc %'] || 0);
				const taxPct = Number(row['GST %'] || 0);

				// --- Exact Replica Math ---
				// 1. Calculate Gross
				const gross = qty * price;

				// 2. Calculate Discount Amount (After Scheme)
				const valForDisc = Math.max(0, gross - scheme);
				const discAmt = valForDisc * (discPct / 100);

				// 3. Calculate Taxable Amount
				const taxable = Math.max(0, gross - scheme - discAmt);

				// 4. Calculate GST
				const taxAmt = taxable * (taxPct / 100);

				// 5. Net Total
				const total = taxable + taxAmt;

				return {
					product_id: row._product_id,
					qty: qty,
					rate: price,
					batch_number: row['Batch No'] || "",
					return_type: row.Reason || "Damage",

					// Backend forced fields
					amount: Number(total.toFixed(2)),       
					tax_amount: Number(taxAmt.toFixed(2))   
				};
			}).filter(l => l.qty > 0);

			// Calculate Grand Total
			amount = _.sumBy(lines,'amount');
		} else {
			// Manual Amount from the input widget
			amount = Number(inpDNAmount.text || 0);
		}

		// 2. Validation
		if (!amount || amount <= 0) {
			showAlert("Invalid Amount. Please check your items.", "error");
			return;
		}

		// 3. Trigger API with Payload
		const payload = {
			vendor_id: SelectVendor.selectedOptionValue,
			amount: amount,
			debit_note_date: moment(dtPckDN.selectedDate).format("YYYY-MM-DD"),
			reason: inpDNReason.text,
			linked_invoice_id: selLinkedBill.selectedOptionValue || null,
			lines: isItemMode ? lines : [] 
		};

		try {
			// Run API passing the payload
			const response = await apiCreateDebitNote.run({ payload });

			showAlert("Debit Note Created: " + response.dn_number, "success");

			// Post-save actions
			storeValue('lastDNNumber', response.dn_number);
			closeModal(modalDebitNote.name);

		} catch (error) {
			showAlert("Error: " + error.message, "error");
		}
	}
}