export default {
	bulkDownloadInvoices: async () => {
		// Ensure the table name matches your actual widget name
		const selectedRows = tblUsageInvoices.selectedRows || [];
		const selectedIds = selectedRows.map(r => r.id);

		if (selectedIds.length === 0) {
			showAlert("Please select at least one invoice using the checkboxes.", "warning");
			return;
		}

		// Store selection and move to the Invoice page
		await storeValue('bulkInvoiceIds', selectedIds);
		navigateTo('Invoice'); 
	}
}
