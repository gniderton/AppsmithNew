export default {
	inwardPO_FromTable: async () => {
		const row = poListTable.triggeredRow; // Get the specific PO row

		// 1. Reset Memory (Critical)
		await storeValue('CorrectionID', null);
		await storeValue('CorrectionData', {});
		await storeValue('piLines', []);

		// 2. Clear Form Widgets
		resetWidget("dateVendorInvoice", true);
		resetWidget("vendorInvoiceNo", true);
		resetWidget("dateReceived", true);

		// 3. Pre-Select Vendor & PO
		// Note: Ensure your Select widgets use these IDs as their 'Default Value' 
		// e.g., {{ appsmith.store.preSelectedVendor }}
		await storeValue('preSelectedVendor', row.vendor_id);
		await storeValue('preSelectedPO', row.id);

		// 4. Open Modal
		showModal(modalFrameGRN.name);

		// 5. Trigger the Fetch (Auto-Apply logic)
		// This manually runs the fetch since onOptionChange won't fire via script
	}
}