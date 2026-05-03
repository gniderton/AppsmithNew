export default {
    // ... your analyzeDemand code ...

    getProductBreakup: () => {
        const selectedProduct = tblAllocation.triggeredRow; 
        const allOrders = tblSalesOrders.selectedRows || [];
        
        if (!selectedProduct || !selectedProduct.item_id) {
            showAlert("Please select a product row first.", "warning");
            return;
        }

        const targetId = String(selectedProduct.item_id);

        const breakup = allOrders.reduce((acc, order) => {
            let lines = [];
            try {
                // Defensive check for the 'lines' structure
                lines = typeof order.lines === 'string' ? JSON.parse(order.lines) : (order.lines || []);
            } catch(e) { 
                return acc; 
            }

            const productLine = lines.find(l => String(l.product_id) === targetId);

            if (productLine) {
                acc.push({
                    so_number: order.so_number,
                    customer_name: order.customer_name,
                    route: order.route_name,
                    dse_name: order.dse_name,
                    qty: Number(productLine.qty || 0),
                    rate: productLine.rate,
                    amount: productLine.amount
                });
            }
            return acc;
        }, []);

        // 1. Save the filtered results to the Appsmith Store
        storeValue('varProductBreakup', breakup);
        
        // 2. Open the modal
        showModal('mdlBreakup');
    }
}