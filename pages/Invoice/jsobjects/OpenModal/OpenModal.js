export default {
    viewInvoice: async () => {
        // 1. Get the ID of the clicked row
        // Replace 'tblSales' with the actual name of your table widget
        const selectedId = tblSales.triggeredRow.id; 
        
        if (!selectedId) {
            showAlert("No order selected.", "warning");
            return;
        }

        try {
            // 2. Safely store the ID in the Appsmith global store
            storeValue('varSelectedInvoice', selectedId);

            // 3. Trigger the API to fetch the deep details
            // This waits for the DB to return the data before moving on
            const response = await getUnifiedInvoiceDetail.run();

            // 4. Store the returned JSON data into a variable for your UI to use
            storeValue('varInvoiceViewData', response);

            // 5. Open the modal
            showModal('modalFrameInvoiceView');

        } catch (error) {
            // Handle any network or database errors
            showAlert("Failed to load invoice details: " + error.message, "error");
        }
    }
}
