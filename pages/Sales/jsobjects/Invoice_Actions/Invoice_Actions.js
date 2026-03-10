export default {
    generateBulkInvoices: async () => {
        // Appsmith gives you the full array of selected rows. Map them to extract just the ID.
        // Make sure 'id' matches the primary key column name in your table!
        const selectedRows = tblSalesOrders.selectedRows || [];
        const selectedIDs = selectedRows.map(row => row.id); 
        
        // Get state variable from the Appsmith store
        const transitData = appsmith.store.varTransitStock || {};
        
        if (!selectedIDs || selectedIDs.length === 0) {
             showAlert("No orders selected.", "warning");
             return;
        }

        try {
            // Trigger Backend - Pass variables directly into the run() function
            // Note: Inside the actual API widget body, you MUST reference these 
            // values using {{this.params.order_ids}} and {{this.params.transit_stock}}
            const data = await apiBulkInvoiceGenerate.run({
                order_ids: selectedIDs,
                transit_stock: transitData, 
                allow_negative_stock: true
            });
            
            // --- On Success ---
            closeModal('modalStockAllocation');
            showAlert(`Generated ${data.invoices ? data.invoices.length : 'multiple'} Invoices`, "success");
            
            // Cleanup actions
            await getSalesOrder.run();  
            storeValue('varTransitStock', {}); 
            storeValue('varDemandAnalysis', []); 
            
        } catch (err) {
            // --- On Failure ---
            showAlert("Error: " + (err.message || "Failed to generate invoices"), "error");
        }
    }
}
