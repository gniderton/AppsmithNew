export default {
	// Main function to build ALL reports
	generateReports: () => {
		const lines = getBulkInvoiceLines.data || [];
		if (lines.length === 0) {
			showAlert("No data found for this scheme in selection.", "warning");
			return;
		}

		// 1. PRODUCT PERFORMANCE
		storeValue('report_products', this.getProductSummary(lines));
		
		// 2. CUSTOMER PERFORMANCE (Who benefited most?)
		storeValue('report_customers', this.getCustomerSummary(lines));
		
		// 3. DSE/SALESMAN PERFORMANCE (Who pushed the scheme most?)
		storeValue('report_dse', this.getDSESummary(lines));

		// 4. TIERS APPLIED (BOGO vs Combo vs Qty-based)
		storeValue('report_tiers', this.getTierSummary(lines));
		
		// 5. INVOICE-WISE AUDIT (The detailed list)
		storeValue('report_audit', this.getInvoiceSummary(lines));
		
		showAlert(`Generated 5 Scheme-Focused reports!`, "success");
	},

	getProductSummary: (lines) => {
		const groups = _.groupBy(lines, 'product_name');
		return _.map(groups, (items, name) => {
			const totalSchemeAmt = _.sumBy(items, l => Number(l.scheme_amount));
			const rate = Number(items[0].rate || 0);
			const freeQty = rate > 0 ? (totalSchemeAmt / rate).toFixed(0) : 0;

			return {
				"Product": name,
				"Total Qty": _.sumBy(items, l => Number(l.shipped_qty)),
				"Free Qty": freeQty + " pcs",
				"Total Scheme Disc": totalSchemeAmt.toFixed(2),
				"Total Net Amt": _.sumBy(items, l => Number(l.amount)).toFixed(2)
			};
		});
	},

	getInvoiceSummary: (lines) => {
		// Shows every product line item for every invoice
		return lines.map(l => {
			const schemeAmt = Number(l.scheme_amount || 0);
			const rate = Number(l.rate || 0);
			const freeQty = rate > 0 ? (schemeAmt / rate).toFixed(0) : 0;

			return {
				"Invoice No": l.invoice_number,
				"Customer": l.customer_name,
				"Product": l.product_name,
				"DSE": l.dse_name || "-",
				"Scheme Given": schemeAmt.toFixed(2),
				"Free Qty Given": freeQty + " pcs"
			};
		});
	},

	getCustomerSummary: (lines) => {
		const groups = _.groupBy(lines, 'customer_name');
		return _.map(groups, (items, name) => ({
			"Customer": name,
			"Matching Items": items.length,
			"Total Qty": _.sumBy(items, l => Number(l.shipped_qty)),
			"Total Disc Received": _.sumBy(items, l => Number(l.scheme_amount)).toFixed(2),
			"Net Purchase (Scheme items)": _.sumBy(items, l => Number(l.amount)).toFixed(2)
		})).sort((a, b) => b["Total Disc Received"] - a["Total Disc Received"]);
	},

	getDSESummary: (lines) => {
		const groups = _.groupBy(lines, l => l.dse_name || "Unknown");
		return _.map(groups, (items, name) => ({
			"Salesman (DSE)": name,
			"Total Scheme Sale": _.sumBy(items, l => Number(l.amount)).toFixed(2),
			"Total Discount Given": _.sumBy(items, l => Number(l.scheme_amount)).toFixed(2),
			"Invoices Handled": _.uniqBy(items, 'invoice_id').length
		}));
	},

	getTierSummary: (lines) => {
		const groups = _.groupBy(lines, l => l.tier_applied || "Default");
		return _.map(groups, (items, tier) => ({
			"Scheme Tier": tier,
			"No. of invoices this scheme was applied to": _.uniqBy(items, 'invoice_id').length,
			"Total Discount Amount": _.sumBy(items, l => Number(l.scheme_amount)).toFixed(2)
		}));
	}
}
