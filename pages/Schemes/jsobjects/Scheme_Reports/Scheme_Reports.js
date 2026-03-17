export default {
	// Function to generate ALL reports at once
	generateReports: () => {
		const allLines = getBulkInvoiceLines.data || [];
		if (allLines.length === 0) {
			showAlert("No lines found. Please fetch data first.", "warning");
			return;
		}

		// --- NEW: STRICT SCHEME FILTERING ---
		// We only want products where the scheme matches the one selected in the dropdown
		const schemeId = SelectScheme.selectedOptionValue;
		const schemeName = SelectScheme.selectedOptionLabel;
		
		const lines = allLines.filter(l => {
			const applied = l.tier_applied || "";
			// Match by [ID:XX] or by the name string
			return applied.includes(`[ID:${schemeId}]`) || applied.includes(schemeName);
		});

		if (lines.length === 0) {
			showAlert("None of the selected invoices have this specific scheme successfully applied to any product.", "info");
			return;
		}

		// 1. PRODUCT SUMMARY (Filtered to this scheme only)
		const productSummary = this.getProductSummary(lines);
		
		// 2. TAX SUMMARY (Filtered to this scheme only)
		const taxSummary = this.getTaxSummary(lines);
		
		// 3. SCHEME SUMMARY (Filtered to this scheme only)
		const schemeSummary = this.getSchemeSummary(lines);

		// Store them for use in Tables or Chart widgets
		storeValue('report_products', productSummary);
		storeValue('report_tax', taxSummary);
		storeValue('report_schemes', schemeSummary);
		
		showAlert(`Generated reports for ${lines.length} matching line items.`, "success");
	},

	getProductSummary: (lines) => {
		const groups = _.groupBy(lines, 'product_name');
		return _.map(groups, (items, name) => {
			const totalSchemeAmt = _.sumBy(items, l => Number(l.scheme_amount));
			const rate = Number(items[0].rate || 0);
			// Calculate Free Qty: Scheme Amount / Rate (rounded to nearest whole number or decimals as needed)
			const freeQty = rate > 0 ? (totalSchemeAmt / rate).toFixed(0) : 0;

			return {
				"Product": name,
				"Total Qty": _.sumBy(items, l => Number(l.shipped_qty)),
				"Free Qty": freeQty + " pcs",
				"Gross": _.sumBy(items, l => Number(l.gross_amount)).toFixed(2),
				"Total Scheme Disc": totalSchemeAmt.toFixed(2),
				"Taxable": _.sumBy(items, l => Number(l.taxable_amount)).toFixed(2),
				"Net Amt": _.sumBy(items, l => Number(l.amount)).toFixed(2)
			};
		});
	},

	getTaxSummary: (lines) => {
		const groups = _.groupBy(lines, 'tax_percent');
		return _.map(groups, (items, rate) => ({
			"Tax Rate": rate + "%",
			"Taxable Amt": _.sumBy(items, l => Number(l.taxable_amount)).toFixed(2),
			"Tax Amt": _.sumBy(items, l => Number(l.tax_amount)).toFixed(2),
			"Total Net": _.sumBy(items, l => Number(l.amount)).toFixed(2)
		}));
	},

	getSchemeSummary: (lines) => {
		const groups = _.groupBy(lines, l => l.tier_applied || "No Scheme");
		return _.map(groups, (items, tier) => ({
			"Scheme Tier": tier,
			"Invoices Count": _.uniqBy(items, 'invoice_id').length,
			"Total Discount": _.sumBy(items, l => Number(l.scheme_amount)).toFixed(2)
		}));
	}
}
