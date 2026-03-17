export default {
	bulkDownloadInvoices: async () => {
		// Get selected rows from your table (ensure name matches 'tblUsageInvoices')
		const selectedRows = tblUsageInvoices.selectedRows || [];
		const selectedIds = selectedRows.map(r => r.id);

		if (selectedIds.length === 0) {
			showAlert("Please select at least one invoice using the checkboxes.", "warning");
			return;
		}

		// 1. Store the IDs in the browser memory
		// Use 'await' to ensure it's saved before we move pages
		await storeValue('bulkInvoiceIds', selectedIds);
		
		// 2. Head to the Invoice Page where the loop logic is waiting
		navigateTo('Invoice'); 
	}
}
