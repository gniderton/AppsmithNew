export default {
	// Called when vendorDropdown changes on Create PO drawer
	populateForVendor: async (selected_vendor_id) => {
		let vID = null;
		try { vID = selected_vendor_id; } catch (e) { return; }

		storeValue('poLines', []);
		storeValue('poMode', 'CREATE');

		if (!Products.data || !vID) { return; }

		const newLines = (Products.data.data || Products.data)
		.filter(p => Number(p.vendor_id) === Number(vID))
		.map((p, index) => ({
			"S.No": index + 1,
			"EAN Code": p.ean_code,
			"Item Name": p.product_name,
			"MRP": Number(p.mrp),
			"Price": Number(p.purchase_rate),
			"Qty": 0,
			"Sch": 0,
			"Disc %": 0,
			"GST %": Number(p.tax_percentage),
			"Gross $": 0,
			"Disc. $": 0,
			"Taxable $": 0,
			"Stock": Number(p.current_stock),
			"GST $": 0,
			"Net $": 0,
			"_product_id": p.id
		}));

		storeValue('poLines', newLines);
	}
}