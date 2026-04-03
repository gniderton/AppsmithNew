export default {
	// --- A. DATA FORMATTER (Current code) ---
	getCombinedInvoices: () => {
		// Note: No 'await' here because this is for the Table's 'Table Data' property
		const currentTripInvoices = (getDeliveryList.data || {}).items || []; // items property from /manifest-web
		const pendingInvoices = getPendingInvoices.data || [];

		const assignedIds = currentTripInvoices.map(i => String(i.invoice_id));
		const availablePending = pendingInvoices.filter(i => !assignedIds.includes(String(i.id)));

		return [
			...currentTripInvoices.map(i => ({
				id: i.invoice_id,
				invoice_number: i.invoice_number,
				customer_name: i.customer_name,
				grand_total: i.grand_total,
				current_status: "Assigned to Trip"
			})),
			...availablePending.map(i => ({
				id: i.id,
				invoice_number: i.invoice_number,
				customer_name: i.customer_name,
				grand_total: i.grand_total,
				current_status: "Available (Pending)"
			}))
		];
	},

	// --- B. THE BUTTON TRIGGER (New code) ---
	prepareEditMode: async () => {
		try {
			// 1. Refresh both lists first
			await getDeliveryList.run();
			await getPendingInvoices.run();

			// 2. ONLY once the data is loaded, turn on the Edit mode
			await storeValue('isTripEditActive', true);

			showAlert('Edit Mode Active', 'info');
		} catch (error) {
			showAlert("Failed to load edit mode: " + error.message, "error");
		}
	}
}
