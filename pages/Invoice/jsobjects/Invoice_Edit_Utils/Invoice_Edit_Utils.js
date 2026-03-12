export default {
    // 1. Trigger the backend to wipe the ledger and stock
    unlockInvoice: async () => {
        try {
            const currentData = appsmith.store.varInvoiceViewData;
            
            // Trigger the unlock API (which wipes the current invoice)
            await apiUnlockInvoice.run();
            
            // Turn ON Edit Mode in Appsmith Memory
            storeValue('varIsEditMode', true);
            
            // Memorize the exact old invoice number, date, and the SO ID
            storeValue('varEditingSOParams', {
                sales_order_id: currentData.order_id,
                original_invoice_number: currentData.invoice_number,
                original_invoice_date: currentData.invoice_date
            });
            
            showAlert("Invoice Unlocked! You may now edit the Sales Order lines.", "success");
            
            // Extract the Sales Order lines that were already loaded with the invoice
            // This avoids needing a separate API call!
            storeValue('varEditableSOLines', currentData.order_lines);

        } catch (error) {
            showAlert("Unlock failed: " + error.message, "error");
        }
    },

    // 2. Synchronize Table Edits to your Variable
    syncTableEdits: (editedRow, index) => {
        // Fallback to reading from the widget directly if arguments are missing 
        // IMPORTANT: Replace 'tblEditSO' with your ACTUAL table name!
        const activeRow = editedRow || tblEditSO.updatedRow;
        
        // Ensure index is valid (can be 0, so we check specifically for undefined/null)
        const activeIndex = (index !== undefined && index !== null) ? index : tblEditSO.updatedRowIndex;
        
        console.log("Data Appsmith Sees -> Row:", activeRow, "Index:", activeIndex);
        
        if (activeIndex > -1 && activeRow) {
            // Use cloneDeep so Appsmith definitively knows the data changed and refreshes the UI
            let currentData = _.cloneDeep(appsmith.store.varEditableSOLines || []);
            
            // Safety math
            const qty = Number(activeRow.ordered_qty || 0);
            const rate = Number(activeRow.rate || 0);
            const gross = qty * rate;
            
            // Merge the changes
            currentData[activeIndex] = {
                ...currentData[activeIndex],
                ...activeRow,
                ordered_qty: qty,
                rate: rate,
                gross_amount: gross,
                amount: gross 
            };
            
            // Push updated array back to Appsmith memory
            storeValue('varEditableSOLines', currentData);
            
            showAlert("Row updated in memory!", "success");
        } else {
             showAlert(`Failed! Index: ${activeIndex}. Check console logs.`, "error");
        }
    },



    // 3. Delete a row locally before saving
    removeLine: (index) => {
        const currentData = appsmith.store.varEditableSOLines || [];
        currentData.splice(index, 1);
        storeValue('varEditableSOLines', currentData);
    },

    // 4. Regenerate the Invoice using the cached exact number
    regenerateInvoice: async () => {
        try {
            // A. First, you must save the varEditableSOLines to the backend via your SO Update API
            await apiUpdateSalesOrder.run({
                lines: appsmith.store.varEditableSOLines
            });

            // B. Now Regenerate
            const regenResponse = await apiRegenerateInvoice.run();
            
            // Turn off edit mode
            storeValue('varIsEditMode', false);
            storeValue('varEditingSOParams', null);
            
            showAlert("Invoice Successfully Regenerated: " + regenResponse.invoice_number, "success");
            
            // Close modal or refresh main grid
            closeModal('modalFrameInvoiceView');
            await getInvoices.run(); // Refresh your main table

        } catch (error) {
            showAlert("Regeneration failed: " + error.message, "error");
        }
    }
}
