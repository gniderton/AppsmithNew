export default {
	transformPORows: (data) => {
		const lines = data.lines || [];
		return lines.map((row, i) => {
			const qty = Number(row.ordered_qty || 0);
			const price = Number(row.purchase_rate || row.price || 0);
			const mrp = Number(row.product_mrp || row.mrp || 0);
			const sch = Number(row.scheme_amount || 0);
			const discPct = Number(row.discount_percent || 0);
			const taxPct = Number(row.tax_percent || 5);

			const gross = qty * price;
			const discAmt = (gross - sch) * (discPct / 100);
			const taxable = gross - sch - discAmt;
			const taxAmt = taxable * (taxPct / 100);
			const net = taxable + taxAmt;

			return {
				"S.No": i + 1,
				"EAN Code": row.ean_code || "",
				"Item Name": row.product_name,
				"MRP": mrp,
				"Price": price,
				"Qty": qty,
				"Sch": sch,
				"Disc %": discPct,
				"GST %": taxPct,
				"Gross $": Number(gross.toFixed(2)),
				"Disc. $": Number(discAmt.toFixed(2)),
				"Taxable $": Number(taxable.toFixed(2)),
				"GST $": Number(taxAmt.toFixed(2)),
				"Net $": Number(net.toFixed(2)),
				"Batch No": "",
				"Expiry": null,
				"_product_id": row.product_id
			};
		});
	}
}