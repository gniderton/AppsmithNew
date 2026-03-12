export default {
    analyzeDemand: () => {
        // 1. Debugging Inputs
        // Make sure your tblSalesOrders widget has "Enable multi-row selection" turned ON
        const selectedOrders = tblSalesOrders.selectedRows || [];
        const allProducts = getProducts.data?.data || getProducts.data || [];
        
        // Appsmith uses the global 'store' for state variables
        const transitMap = appsmith.store.varTransitStock || {};
        
        console.log("Debug: Processing", selectedOrders.length, "orders");
        console.log("Debug: All Products (First Entry):", allProducts[0]);
        
        if (selectedOrders.length === 0) {
            showAlert("Please select at least one order.", "warning");
            return;
        }

        // 2. Aggregate Demand
        let demandMap = {}; 
        selectedOrders.forEach(order => {
            // Sometimes Appsmith stores nested JSON as strings. Parse it if necessary.
            let lines = [];
            try {
                lines = typeof order.lines === 'string' ? JSON.parse(order.lines) : (order.lines || []);
            } catch(e) {
                console.error("Error parsing order lines", e);
            }
            
            lines.forEach(line => {
                // FORCE STRING for comparison safety
                const pid = String(line.product_id); 
                if (!demandMap[pid]) {
                    demandMap[pid] = { 
                        item_id: pid, 
                        product_name: line.product_name, 
                        demand: 0,
                        master_rate: Number(line.rate || 0) 
                    };
                }
                demandMap[pid].demand += Number(line.qty || line.ordered_qty || 0); // Handle 'qty' or 'ordered_qty'
            });
        });

        // 3. Compare (Real DB + Temp Variable)
        const analysis = Object.values(demandMap).map(item => {
            // TYPE SAFE FIND: Compare as Strings
            const product = allProducts.find(p => String(p.id) === String(item.item_id));
            
            if (!product) console.warn("Could not find product details for ID:", item.item_id);
            
            const realStock = Number(product.current_stock || 0);
            const transitEntry = transitMap[item.item_id] || {};
            const transitQty = Number(transitEntry.qty || 0);
            
            const totalAvail = realStock + transitQty;
            const shortage = Math.max(0, item.demand - totalAvail);
            
            return {
                ...item,
                real_stock: realStock,
                transit_qty: transitQty,
                temp_batch: transitEntry.batch_code || '-',
                total_avail: totalAvail,
                shortage: shortage,
                status: shortage > 0 ? "SHORT" : "OK",
                // Prices from Master Table (Null check)
                mrp: Number(product.mrp || 0),
                distributor_rate: Number(product?.distributor_rate || 0),
                wholesale_rate: Number(product?.wholesale_rate || 0),
                dealer_rate: Number(product?.dealer_rate || 0),
                retail_rate: Number(product?.retail_rate || 0),
                rate: item.master_rate 
            };
        });

        // 4. Update and Open Modal
        // Appsmith global store takes a key and a value
        storeValue('varDemandAnalysis', analysis);
        
        // Show the Appsmith Modal widget
        showModal('modalStockAllocation');
    }
}
