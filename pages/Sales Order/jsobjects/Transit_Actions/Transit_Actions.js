export default {
    openTransitEntry: () => {
        // 1. Get selected rows
        // Appsmith gives us the full row objects directly from selectedRows
        const rows = tblAllocation.selectedRows || [];
        
        if (rows.length === 0) {
            showAlert("Please select at least one item to allocate transit stock.", "warning");
            return;
        }

        // 2. Map to Table Rows (incorporate existing session data if any)
        const currentStock = appsmith.store.varTransitStock || {};
        
        const tableRows = rows.map(r => {
            const pid = String(r.item_id || r.id);
            const saved = currentStock[pid] || {};
            
            return {
                item_id: pid,
                product_name: r.product_name,
                ordered_qty: Number(r.ordered_qty || 0),
                shortfall_qty: Number(r.shortfall_qty || 0),
                qty: saved.qty !== undefined ? saved.qty : Number(r.shortfall_qty || 0),
                batch_code: saved.batch_code || 'TRANSIT-PENDING',
                rate: saved.rate !== undefined ? saved.rate : Number(r.rate || 0)
            };
        });

        // 3. Set the table variable
        storeValue('varTransitTableData', tableRows); 

    }
}
