export default {
    viewInvoice: async () => {
        // 1. Get the data from the clicked row
        const selectedId = tblSales.triggeredRow.id; 
        const selectedInvoiceId = tblSales.triggeredRow.invoice_id; // Grabbing the invoice_id
        
        if (!selectedId) {
            showAlert("No order selected.", "warning");
            return;
        }

        try {
            // 2. Store both the ID and the Invoice ID in the Appsmith store
            storeValue('varSelectedInvoice', selectedId);
            storeValue('varInvoiceId', selectedInvoiceId); // This is your new variable

            // 3. Trigger the API to fetch the deep details
            const response = await getUnifiedInvoiceDetail.run();

            // 4. Store the returned JSON data
            storeValue('varInvoiceViewData', response);

            // 5. Open the modal
            showModal('modalFrameInvoiceView');

        } catch (error) {
            showAlert("Failed to load invoice details: " + error.message, "error");
        }
    }
}